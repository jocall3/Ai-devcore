/**
 * @file This service acts as the main-thread interface to the Security Core Web Worker.
 * It abstracts away the message-passing mechanism and provides a clean, promise-based API
 * for all cryptographic operations. The session key is managed exclusively within the
 * worker and is never exposed to the main thread.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logError } from './telemetryService.ts';
import type { EncryptedData } from '../types.ts';

interface WorkerRequest<T = any> {
  command: string;
  payload: T;
  requestId: string;
}

interface WorkerResponse<T = any> {
  requestId?: string;
  success?: boolean;
  data?: T;
  error?: string;
}

let worker: Worker | null = null;
const pendingRequests = new Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void }>();

function postCommandToWorker<T>(command: string, payload: any = {}): Promise<T> {
  if (!worker) {
    return Promise.reject(new Error('Security Core Worker is not initialized. Please call initSecurityCore() first.'));
  }

  const requestId = window.crypto.randomUUID();
  const request: WorkerRequest = { command, payload, requestId };

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject });
    worker!.postMessage(request);
  });
}

export function initSecurityCore(): void {
  if (worker) {
    console.warn('Security Core Worker is already initialized.');
    return;
  }

  try {
    worker = new Worker(new URL('../modules/security-core/security-core.worker.ts', import.meta.url), { type: 'module', name: 'SecurityCoreWorker' });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { requestId, success, data, error } = event.data;
      if (requestId) {
        const request = pendingRequests.get(requestId);
        if (request) {
          if (success) {
            request.resolve(data);
          } else {
            request.reject(new Error(error || `An unknown worker error occurred for command.`));
          }
          pendingRequests.delete(requestId);
        }
      } else {
        console.log(`Security Core Event received`, event.data);
      }
    };

    worker.onerror = (error) => {
      logError(error as any, { context: 'SecurityCoreWorker' });
      console.error('An unhandled error occurred in the Security Core Worker:', error.message);
      pendingRequests.forEach((request) => {
        request.reject(new Error('The Security Core Worker crashed.'));
      });
      pendingRequests.clear();
    };
  } catch (error) {
    logError(error as Error, { context: 'initSecurityCore' });
    console.error('Failed to create the Security Core Worker:', error);
    throw new Error('Could not initialize the Security Core. This may be due to browser limitations or a misconfiguration.');
  }
}

export const generateSalt = (): ArrayBuffer => {
  return window.crypto.getRandomValues(new Uint8Array(16)).buffer;
};

export const deriveAndCacheKey = (masterPassword: string, salt: ArrayBuffer): Promise<boolean> => {
  return postCommandToWorker('derive-and-cache-key', { password: masterPassword, salt });
};

export const isUnlocked = (): Promise<boolean> => {
  return postCommandToWorker<boolean>('is-unlocked');
};

export const lock = (): Promise<void> => {
  return postCommandToWorker('lock');
};

export const encrypt = async (id: string, plaintext: string): Promise<EncryptedData> => {
  const { ciphertext, iv } = await postCommandToWorker<{ ciphertext: ArrayBuffer; iv: Uint8Array }>('encrypt', { plaintext });
  return { id, ciphertext, iv };
};

export const decrypt = async (data: EncryptedData): Promise<{ id: string, plaintext: string }> => {
  const plaintext = await postCommandToWorker<string>('decrypt', { ciphertext: data.ciphertext, iv: data.iv });
  return { id: data.id, plaintext };
};
