/**
 * @file Manages the state and availability of different AI providers.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logEvent } from './telemetryService';

/**
 * A function that is called when a provider's status changes.
 * This will eventually be replaced by the central event bus.
 */
type StateChangeListener = (provider: AiProviderType, status: ProviderStatus) => void;

/**
 * @enum {string}
 * @description Represents the types of supported AI providers.
 * @example
 * const provider: AiProviderType = 'gemini';
 */
export type AiProviderType = 'gemini' | 'openai';

/**
 * @enum {string}
 * @description Represents the current operational status of an AI provider.
 * @example
 * let status: ProviderStatus = 'LOCKED';
 */
export type ProviderStatus =
  /** The provider has not been configured with an API key. */
  'NOT_CONFIGURED' |
  /** An API key is stored, but the vault is locked. */
  'LOCKED' |
  /** The provider is configured, unlocked, and ready for use. */
  'READY' |
  /** An error occurred with the provider's configuration or initialization. */
  'ERROR';

/**
 * @class AiProviderStateManager
 * @description Manages the lifecycle and state of AI providers.
 * This class tracks whether a provider is configured, if its credentials are accessible (i.e., vault is unlocked),
 * and broadcasts state changes to the application.
 */
class AiProviderStateManager {
  /**
   * @private
   * @type {Map<AiProviderType, ProviderStatus>}
   * @description Internal state storage for provider statuses.
   */
  private providerStates: Map<AiProviderType, ProviderStatus> = new Map();

  /**
   * @private
   * @type {Set<StateChangeListener>}
   * @description A set of listeners to be notified of state changes.
   */
  private listeners: Set<StateChangeListener> = new Set();

  /**
   * Initializes the state manager with default states for all known providers.
   */
  constructor() {
    this.providerStates.set('gemini', 'NOT_CONFIGURED');
    this.providerStates.set('openai', 'NOT_CONFIGURED');
  }

  /**
   * Retrieves the current status of a specific AI provider.
   * @param {AiProviderType} provider - The provider to check.
   * @returns {ProviderStatus} The current status of the provider.
   * @example
   * const status = aiProviderStateManager.getStatus('gemini');
   * if (status === 'READY') {
   *   // Proceed with API call
   * }
   */
  public getStatus(provider: AiProviderType): ProviderStatus {
    return this.providerStates.get(provider) || 'NOT_CONFIGURED';
  }

  /**
   * Updates the status of a provider and notifies listeners if the status has changed.
   * @param {AiProviderType} provider - The provider whose status is being updated.
   * @param {ProviderStatus} status - The new status.
   * @param {boolean} [silent=false] - If true, listeners will not be notified of this change.
   * @returns {void}
   * @example
   * aiProviderStateManager.setStatus('gemini', 'LOCKED');
   */
  public setStatus(provider: AiProviderType, status: ProviderStatus, silent: boolean = false): void {
    const oldStatus = this.providerStates.get(provider);
    if (oldStatus !== status) {
      this.providerStates.set(provider, status);
      logEvent('ai_provider_status_changed', { provider, oldStatus, newStatus: status });
      if (!silent) {
        this.notifyListeners(provider, status);
      }
    }
  }

  /**
   * Subscribes a listener function to be called on state changes.
   * In a future refactor, this will be replaced by the central event bus.
   * @param {StateChangeListener} listener - The function to call on change.
   * @returns {() => void} A function to call to unsubscribe the listener.
   * @example
   * const unsubscribe = aiProviderStateManager.subscribe((provider, status) => {
   *   console.log(`${provider} status changed to ${status}`);
   * });
   * // ... later
   * unsubscribe();
   */
  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * @private
   * Notifies all subscribed listeners of a state change.
   * @param {AiProviderType} provider - The provider that changed.
   * @param {ProviderStatus} status - The new status.
   * @returns {void}
   */
  private notifyListeners(provider: AiProviderType, status: ProviderStatus): void {
    this.listeners.forEach(listener => listener(provider, status));
  }
}

/**
 * @description Singleton instance of the AiProviderStateManager.
 * This manager is responsible for tracking the configuration and readiness
 * of all AI providers within the application. It serves as a central point of truth
 * for the availability of AI services, particularly in relation to the vault's lock state.
 */
export const aiProviderStateManager = new AiProviderStateManager();