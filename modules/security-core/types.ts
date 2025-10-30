```typescript
/**
 * @file Defines the types, enums, and interfaces for communication with the Security Core Web Worker.
 * This file establishes the strict contract for the message-passing interface between the main thread
 * and the sandboxed security worker, ensuring type safety and clear communication patterns.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enumeration of possible statuses for the credential vault.
 * @enum {string}
 * @example
 * const currentStatus = VaultStatus.LOCKED;
 */
export enum VaultStatus {
  /**
   * The vault has not been set up with a master password.
   */
  UNINITIALIZED = 'UNINITIALIZED',

  /**
   * The vault is initialized but requires the master password to unlock.
   * No cryptographic operations can be performed.
   */
  LOCKED = 'LOCKED',

  /**
   * The vault is unlocked, and a session key is in memory.
   * Cryptographic operations are permitted.
   */
  UNLOCKED = 'UNLOCKED',
}

/**
 * Commands that can be sent from the main thread to the Security Core worker.
 * @enum {string}
 * @example
 * worker.postMessage({
 *   command: SecurityCoreCommand.UNLOCK_VAULT,
 *   payload: { password: 'my-secret-password' }
 * });
 */
export enum SecurityCoreCommand {
  INIT_VAULT = 'INIT_VAULT',
  UNLOCK_VAULT = 'UNLOCK_VAULT',
  LOCK_VAULT = 'LOCK_VAULT',
  GET_VAULT_STATUS = 'GET_VAULT_STATUS',
  SAVE_CREDENTIAL = 'SAVE_CREDENTIAL',
  RETRIEVE_CREDENTIAL = 'RETRIEVE_CREDENTIAL',
}

/**
 * Events that can be sent from the Security Core worker back to the main thread.
 * @enum {string}
 * @example
 * worker.onmessage = (e) => {
 *   if (e.data.event === SecurityCoreEvent.VAULT_STATUS_CHANGED) {
 *     console.log('Vault status is now:', e.data.payload.status);
 *   }
 * };
 */
export enum SecurityCoreEvent {
  VAULT_STATUS_CHANGED = 'VAULT_STATUS_CHANGED',
  INIT_SUCCESS = 'INIT_SUCCESS',
  INIT_FAILURE = 'INIT_FAILURE',
  UNLOCK_SUCCESS = 'UNLOCK_SUCCESS',
  UNLOCK_FAILURE = 'UNLOCK_FAILURE',
  LOCK_SUCCESS = 'LOCK_SUCCESS',
  SAVE_SUCCESS = 'SAVE_SUCCESS',
  SAVE_FAILURE = 'SAVE_FAILURE',
  RETRIEVAL_SUCCESS = 'RETRIEVAL_SUCCESS',
  RETRIEVAL_FAILURE = 'RETRIEVAL_FAILURE',
}

/**
 * Generic structure for a message sent TO the Security Core worker.
 * @template T - The type of the payload.
 */
export interface SecurityCoreMessage<T = any> {
  /**
   * The command to be executed by the worker.
   * @type {SecurityCoreCommand}
   */
  command: SecurityCoreCommand;

  /**
   * The data associated with the command.
   * @type {T}
   * @optional
   */
  payload?: T;
}

/**
 * Generic structure for a message sent FROM the Security Core worker.
 * @template T - The type of the payload.
 */
export interface SecurityCoreEventMessage<T = any> {
  /**
   * The event that occurred in the worker.
   * @type {SecurityCoreEvent}
   */
  event: SecurityCoreEvent;

  /**
   * The data associated with the event.
   * @type {T}
   * @optional
   */
  payload?: T;
}

// --- Command Payloads ---

/**
 * Payload for the `INIT_VAULT` command.
 * @interface
 */
export interface InitVaultPayload {
  /**
   * The master password to initialize the vault.
   * @type {string}
   */
  password: string;
}

/**
 * Payload for the `UNLOCK_VAULT` command.
 * @interface
 */
export interface UnlockVaultPayload {
  /**
   * The master password to unlock the vault.
   * @type {string}
   */
  password: string;
}

/**
 * Payload for the `SAVE_CREDENTIAL` command.
 * @interface
 */
export interface SaveCredentialPayload {
  /**
   * A unique identifier for the credential.
   * @type {string}
   */
  id: string;

  /**
   * The plaintext credential to be encrypted and stored.
   * @type {string}
   */
  plaintext: string;
}

/**
 * Payload for the `RETRIEVE_CREDENTIAL` command.
 * @interface
 */
export interface RetrieveCredentialPayload {
  /**
   * The unique identifier of the credential to retrieve.
   * @type {string}
   */
  id: string;
}

// --- Event Payloads ---

/**
 * Payload for the `VAULT_STATUS_CHANGED` event.
 * @interface
 */
export interface VaultStatusPayload {
  /**
   * The new status of the vault.
   * @type {VaultStatus}
   */
  status: VaultStatus;
}

/**
 * Payload for failure events (e.g., `INIT_FAILURE`, `UNLOCK_FAILURE`).
 * @interface
 */
export interface ErrorPayload {
  /**
   * A descriptive error message.
   * @type {string}
   */
  error: string;
}

/**
 * Payload for the `SAVE_SUCCESS` event.
 * @interface
 */
export interface SaveSuccessPayload {
  /**
   * The ID of the credential that was successfully saved.
   * @type {string}
   */
  id: string;
}

/**
 * Payload for the `SAVE_FAILURE` event.
 * @interface
 */
export interface SaveFailurePayload extends ErrorPayload {
  /**
   * The ID of the credential that failed to save.
   * @type {string}
   */
  id: string;
}

/**
 * Payload for the `RETRIEVAL_SUCCESS` event.
 * @interface
 */
export interface RetrievalSuccessPayload {
  /**
   * The ID of the retrieved credential.
   * @type {string}
   */
  id: string;

  /**
   * The decrypted plaintext of the credential.
   * @type {string}
   */
  plaintext: string;
}

/**
 * Payload for the `RETRIEVAL_FAILURE` event.
 * @interface
 */
export interface RetrievalFailurePayload extends ErrorPayload {
  /**
   * The ID of the credential that failed to be retrieved.
   * @type {string}
   */
  id: string;
}

// --- Data Structures ---

/**
 * Represents the structure of encrypted data as stored in IndexedDB.
 * @interface
 */
export interface EncryptedData {
  /**
   * The unique identifier for the data.
   * @type {string}
   */
  id: string;

  /**
   * The encrypted data.
   * @type {ArrayBuffer}
   */
  ciphertext: ArrayBuffer;

  /**
   * The initialization vector used for encryption.
   * @type {Uint8Array}
   */
  iv: Uint8Array;
}

// Augment the AppEventMap interface from the event-bus.service module
// to include the 'vault:state-changed' event. This resolves the TS2345 error
// in security-core.service.ts by making the string literal a valid event key.
declare module '../../core/bus/event-bus.service' {
  interface AppEventMap {
    'vault:state-changed': VaultStatusPayload;
  }
}
```