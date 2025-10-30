```typescript
/**
 * @file Service for interacting with the sandboxed Security Core Web Worker.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/di/types';
import type { IEventBus } from '../../core/bus/event-bus.service';
import { 
  getVaultData, 
  saveVaultData, 
  getEncryptedToken, 
  saveEncryptedToken 
} from '../../services/dbService';
import { 
  SecurityCoreCommand,
  SecurityCoreEvent,
  type SecurityCoreMessage, 
  type SecurityCoreEventMessage,
  type EncryptedData,
  VaultStatus,
} from './types';
import { logError } from '../../services/telemetryService';

// Module augmentation for AppEventMap to include 'vault:state-changed'
// This is necessary because 'vault:state-changed' is published but not defined in the base AppEventMap.
declare module '../../core/bus/event-bus.service' {
  interface AppEventMap {
    'vault:state-changed': {
      isInitialized: boolean;
      isUnlocked: boolean;
    };
  }
}

// Augmented interfaces to include a request ID for promise mapping
interface SecurityCoreMessageWithId<T = any> extends SecurityCoreMessage<T> {
  requestId: string;
}
interface SecurityCoreEventMessageWithId<T = any> extends SecurityCoreEventMessage<T> {
  requestId?: string; // Optional for broadcast events
  error?: string;
}

// Internal type for promise resolvers
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

// This is an implementation detail of the init/unlock flow
interface VaultCanary extends Omit<EncryptedData, 'id'> {}

/**
 * @class SecurityCoreService
 * @description Provides a main-thread API for interacting with the isolated Security Core worker.
 * This service proxies all cryptographic operations to the worker, ensuring that the master key
 * and session key never exist in the main thread's memory.
 * @injectable
 */
@injectable()
export class SecurityCoreService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private status: VaultStatus = VaultStatus.UNINITIALIZED;

  constructor(@inject(TYPES.EventBus) private eventBus: IEventBus) {
    this.initializeWorker();
    this.checkInitializationState().then(status => {
      this.status = status;
      this.broadcastStatus();
    });
  }

  private initializeWorker(): void {
    try {
      this.worker = new Worker(new URL('./security-core.worker.ts', import.meta.url), { type: 'module', name: 'SecurityCoreWorker' });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
    } catch (error) {
      logError(error as Error, { context: 'SecurityCoreWorkerInit' });
      console.error("Failed to initialize Security Core Worker:", error);
    }
  }

  private handleWorkerMessage(event: MessageEvent<SecurityCoreEventMessageWithId>): void {
    const { requestId, event: eventType, payload, error } = event.data;
    
    if (eventType === SecurityCoreEvent.VAULT_STATUS_CHANGED) {
      this.status = payload.status;
      this.broadcastStatus();
      return;
    }

    if (requestId) {
      const request = this.pendingRequests.get(requestId);
      if (request) {
        if (error) {
          request.reject(new Error(error));
        } else {
          request.resolve(payload);
        }
        this.pendingRequests.delete(requestId);
      }
    }
  }
  
  private handleWorkerError(error: ErrorEvent): void {
    logError(error as any, { context: 'SecurityCoreWorker' });
    this.pendingRequests.forEach(request => {
      request.reject(new Error('Security Core worker crashed.'));
    });
    this.pendingRequests.clear();
    this.status = VaultStatus.LOCKED;
    this.broadcastStatus();
  }

  private postCommandToWorker<T>(command: SecurityCoreCommand, payload?: any): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error('Security Core worker is not available.'));
    }
    // `crypto` is assumed to be globally available (Web Crypto API in browser environments, including Workers)
    const requestId = crypto.randomUUID(); 
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker!.postMessage({ requestId, command, payload } as SecurityCoreMessageWithId);
    });
  }
  
  private broadcastStatus(): void {
    this.eventBus.publish('vault:state-changed', {
      isInitialized: this.status !== VaultStatus.UNINITIALIZED,
      isUnlocked: this.status === VaultStatus.UNLOCKED,
    });
  }
  
  private async checkInitializationState(): Promise<VaultStatus> {
    const salt = await getVaultData('pbkdf2-salt');
    return salt ? VaultStatus.LOCKED : VaultStatus.UNINITIALIZED;
  }
  
  public getStatus(): VaultStatus {
    return this.status;
  }
  
  public async initializeVault(masterPassword: string): Promise<void> {
    if (this.status !== VaultStatus.UNINITIALIZED) {
      throw new Error("Vault is already initialized.");
    }
    // `crypto` is assumed to be globally available
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await saveVaultData('pbkdf2-salt', salt);

    const { canary } = await this.postCommandToWorker<{ canary: VaultCanary }>(
      SecurityCoreCommand.INIT_VAULT,
      { masterPassword, salt }
    );
    await saveVaultData('vault-canary', canary);
    
    this.status = VaultStatus.UNLOCKED;
    this.broadcastStatus();
  }
  
  public async unlockVault(masterPassword: string): Promise<void> {
    if (this.status !== VaultStatus.LOCKED) {
      if(this.status === VaultStatus.UNLOCKED) return;
      throw new Error("Vault is not in a locked state.");
    }
    const salt = await getVaultData('pbkdf2-salt');
    const canary = await getVaultData('vault-canary');
    if (!salt || !canary) {
      throw new Error("Vault data is missing or corrupt. Cannot unlock.");
    }
    await this.postCommandToWorker(SecurityCoreCommand.UNLOCK_VAULT, { masterPassword, salt, canary });
    this.status = VaultStatus.UNLOCKED;
    this.broadcastStatus();
  }
  
  public async lockVault(): Promise<void> {
    if (this.status !== VaultStatus.UNLOCKED) return;
    await this.postCommandToWorker(SecurityCoreCommand.LOCK_VAULT);
    this.status = VaultStatus.LOCKED;
    this.broadcastStatus();
  }

  public async saveCredential(id: string, plaintext: string): Promise<void> {
    if (this.status !== VaultStatus.UNLOCKED) {
      throw new Error('Vault is locked. Cannot save credential.');
    }
    const { ciphertext, iv } = await this.postCommandToWorker<Omit<EncryptedData, 'id'>>(SecurityCoreCommand.SAVE_CREDENTIAL, { plaintext });
    await saveEncryptedToken({ id, ciphertext, iv });
  }

  public async getDecryptedCredential(id: string): Promise<string | null> {
    if (this.status !== VaultStatus.UNLOCKED) {
      throw new Error('Vault is locked. Cannot retrieve credential.');
    }
    const encryptedData = await getEncryptedToken(id);
    if (!encryptedData) {
      return null;
    }
    return this.postCommandToWorker<string>(SecurityCoreCommand.RETRIEVE_CREDENTIAL, { ciphertext: encryptedData.ciphertext, iv: encryptedData.iv });
  }
}
```