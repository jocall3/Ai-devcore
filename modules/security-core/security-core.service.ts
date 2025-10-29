/**
 * @file Service for interacting with the sandboxed Security Core Web Worker.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../types/types';
import type { IEventBus } from '../service-bus/service-bus.interface';
import type { EncryptedData } from '../../types';
import { getVaultData } from '../../services/dbService';

/**
 * @typedef {('INIT'|'UNLOCK'|'LOCK'|'ENCRYPT'|'DECRYPT')} SecurityCoreCommandType
 * @description The type of command to send to the Security Core worker.
 */
export type SecurityCoreCommandType = 'INIT' | 'UNLOCK' | 'LOCK' | 'ENCRYPT' | 'DECRYPT';

/**
 * @interface SecurityCoreCommand
 * @description Represents a message sent from the main thread to the Security Core worker.
 * @property {string} id - A unique identifier for the command to correlate with a response.
 * @property {SecurityCoreCommandType} command - The command to be executed.
 * @property {any} [payload] - The data associated with the command.
 */
export interface SecurityCoreCommand {
  id: string;
  command: SecurityCoreCommandType;
  payload?: any;
}

/**
 * @interface SecurityCoreResult
 * @description Represents a message received from the Security Core worker in response to a command.
 * @property {string} id - The unique identifier of the original command.
 * @property {boolean} success - Indicates if the command executed successfully.
 * @property {any} [data] - The result of a successful command (e.g., decrypted text).
 * @property {string} [error] - An error message if the command failed.
 */
export interface SecurityCoreResult {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * @interface PendingRequest
 * @description Internal structure to hold promise resolvers for pending worker requests.
 * @property {(value: any) => void} resolve - The resolve function of the promise.
 * @property {(reason?: any) => void} reject - The reject function of the promise.
 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * @class SecurityCoreService
 * @description Provides a main-thread API for interacting with the isolated Security Core worker.
 * This service proxies all cryptographic operations to the worker, ensuring that the master key
 * and session key never exist in the main thread's memory.
 * It also manages the vault's lock state and session timeout.
 * @injectable
 */
@injectable()
export class SecurityCoreService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private inactivityTimer: number | null = null;
  private _isUnlocked = false;
  private _isInitialized = false;

  /**
   * @constructor
   * @param {IEventBus} eventBus - The central event bus for inter-module communication.
   */
  constructor(@inject(TYPES.EventBus) private eventBus: IEventBus) {
    this.initializeWorker();
    this.checkInitializationState();
  }

  /**
   * @private
   * @method initializeWorker
   * @description Creates the Web Worker and sets up the message handler for communication.
   */
  private initializeWorker(): void {
    // Note: The worker script path is relative to the final built public directory.
    this.worker = new Worker(new URL('./security-core.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = this.handleWorkerError.bind(this);
  }

  /**
   * @private
   * @method handleWorkerMessage
   * @param {MessageEvent<SecurityCoreResult>} event - The message event from the worker.
   * @description Handles responses from the worker, resolving or rejecting pending promises.
   */
  private handleWorkerMessage(event: MessageEvent<SecurityCoreResult>): void {
    const { id, success, data, error } = event.data;
    const request = this.pendingRequests.get(id);

    if (request) {
      if (success) {
        request.resolve(data);
      } else {
        request.reject(new Error(error || 'An unknown worker error occurred.'));
      }
      this.pendingRequests.delete(id);
    }
  }

  /**
   * @private
   * @method handleWorkerError
   * @param {ErrorEvent} error - The error event from the worker.
   * @description Handles critical errors from the worker itself.
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('A critical error occurred in the Security Core worker:', error);
    // Reject all pending requests as the worker is in an unrecoverable state.
    this.pendingRequests.forEach(request => {
      request.reject(new Error('Security Core worker crashed.'));
    });
    this.pendingRequests.clear();
    this.lockVault(); // Ensure locked state
  }

  /**
   * @private
   * @method postCommandToWorker
   * @description Sends a command to the worker and returns a promise that resolves with the result.
   * @template T The expected type of the successful response data.
   * @param {SecurityCoreCommandType} command - The command to execute.
   * @param {any} [payload] - The data payload for the command.
   * @returns {Promise<T>} A promise that resolves with the worker's response data.
   * @example
   * // const decrypted = await this.postCommandToWorker<string>('DECRYPT', { id: 'my-key' });
   */
  private postCommandToWorker<T>(command: SecurityCoreCommandType, payload?: any): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error('Security Core worker is not initialized.'));
    }

    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ id, command, payload });
    });
  }

  /**
   * @private
   * @method resetInactivityTimer
   * @description Resets the session timeout timer. Called after any successful vault operation.
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = window.setTimeout(() => {
      this.lockVault();
    }, SESSION_TIMEOUT_MS);
  }

  /**
   * @public
   * @method isInitialized
   * @description Checks if the vault has been initialized with a master password.
   * @returns {boolean} True if the vault is initialized.
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * @public
   * @method isUnlocked
   * @description Checks if the vault is currently unlocked.
   * @returns {boolean} True if the vault is unlocked.
   */
  public isUnlocked(): boolean {
    return this._isUnlocked;
  }

  /**
   * @public
   * @method initializeVault
   * @description Initializes the vault with a new master password. This creates the salt and derives the first session key.
   * @param {string} masterPassword - The user's chosen master password.
   * @returns {Promise<void>}
   * @example
   * // await securityCoreService.initializeVault('my-strong-password');
   */
  public async initializeVault(masterPassword: string): Promise<void> {
    await this.postCommandToWorker('INIT', { masterPassword });
    this._isInitialized = true;
    this._isUnlocked = true;
    this.resetInactivityTimer();
    this.eventBus.publish('vault:initialized', null);
    this.eventBus.publish('vault:unlocked', null);
  }

  /**
   * @public
   * @method unlockVault
   * @description Unlocks the vault using the master password to derive the session key.
   * @param {string} masterPassword - The user's master password.
   * @returns {Promise<void>}
   * @example
   * // await securityCoreService.unlockVault('my-strong-password');
   */
  public async unlockVault(masterPassword: string): Promise<void> {
    await this.postCommandToWorker('UNLOCK', { masterPassword });
    this._isUnlocked = true;
    this.resetInactivityTimer();
    this.eventBus.publish('vault:unlocked', null);
  }

  /**
   * @public
   * @method lockVault
   * @description Locks the vault by commanding the worker to securely wipe the session key from its memory.
   * @returns {Promise<void>}
   * @example
   * // securityCoreService.lockVault();
   */
  public async lockVault(): Promise<void> {
    if (!this._isUnlocked) return;

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    await this.postCommandToWorker('LOCK');
    this._isUnlocked = false;
    this.eventBus.publish('vault:locked', null);
  }

  /**
   * @public
   * @method saveCredential
   * @description Encrypts and saves a credential (e.g., API key) to IndexedDB.
   * @param {string} id - A unique identifier for the credential.
   * @param {string} plaintext - The plaintext value to encrypt and save.
   * @returns {Promise<void>}
   * @example
   * // await securityCoreService.saveCredential('github_pat', 'ghp_...');
   */
  public async saveCredential(id: string, plaintext: string): Promise<void> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked. Cannot save credential.');
    }
    await this.postCommandToWorker('ENCRYPT', { id, plaintext });
    this.resetInactivityTimer();
  }

  /**
   * @public
   * @method getDecryptedCredential
   * @description Retrieves and decrypts a credential from IndexedDB.
   * @param {string} id - The unique identifier of the credential to retrieve.
   * @returns {Promise<string | null>} A promise that resolves to the decrypted plaintext, or null if not found.
   * @example
   * // const token = await securityCoreService.getDecryptedCredential('github_pat');
   */
  public async getDecryptedCredential(id: string): Promise<string | null> {
    if (!this.isUnlocked()) {
      // This addresses the user's issue by providing a clear, manageable error.
      throw new Error('Vault is locked. Cannot retrieve credential.');
    }
    const result = await this.postCommandToWorker<string | null>('DECRYPT', { id });
    this.resetInactivityTimer();
    return result;
  }

  /**
   * @private
   * @method checkInitializationState
   * @description Checks IndexedDB for the salt to determine if the vault has been set up.
   */
  private async checkInitializationState(): Promise<void> {
    const salt = await getVaultData('pbkdf2-salt');
    this._isInitialized = !!salt;
    this.eventBus.publish('vault:statusChecked', { isInitialized: this._isInitialized });
  }
}
