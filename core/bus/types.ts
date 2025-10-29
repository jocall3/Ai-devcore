/**
 * @file Defines the types and interfaces for the application's central event bus.
 * This file is crucial for the modular monolith architecture, ensuring type-safe,
 * decoupled communication between different feature modules.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AppUser, ViewType } from '../../types';

// #region Generic Event Bus Types
// -----------------------------------------------------------------------------

/**
 * @description A generic type for an event handler (subscriber) function.
 * @template T The type of the payload the handler will receive.
 * @param {T} payload The data associated with the event.
 * @example
 * const handleNotification: EventHandler<NotificationShowPayload> = (payload) => {
 *   console.log(`Notification: ${payload.message}`);
 * };
 */
export type EventHandler<T> = (payload: T) => void;

/**
 * @description Defines a map of all possible event names to their corresponding payload types.
 * This interface is the single source of truth for all events in the application,
 * providing strict type checking for publishing and subscribing to events.
 */
export type EventMap = {
  // Vault & Security Core Events
  'vault:state-changed': VaultStateChangedPayload;
  'vault:locked': VaultLockPayload;

  // UI & App State Events
  'notification:show': NotificationShowPayload;
  'app:user-changed': AppUserChangedPayload;
  'app:view-changed': AppViewChangedPayload;

  // Windowing Manager Events
  'window:opened': WindowLifecyclePayload;
  'window:closed': WindowLifecyclePayload;
  'window:focused': WindowLifecyclePayload;
  'window:minimized': WindowLifecyclePayload;
  'window:restored': WindowLifecyclePayload;
};

/**
 * @description A union type of all valid event names (keys) from the EventMap.
 * @example
 * bus.publish('notification:show', { message: 'Hello!' }); // Valid
 * bus.publish('invalid-event', {}); // TypeScript error
 */
export type EventKey = keyof EventMap;

// #endregion

// #region Payload Type Definitions
// -----------------------------------------------------------------------------

/**
 * @description Payload for the 'notification:show' event.
 */
export interface NotificationShowPayload {
  /**
   * The message to be displayed in the notification.
   * @type {string}
   */
  message: string;
  /**
   * The type of notification, which affects its appearance.
   * @type {'success' | 'error' | 'info'}
   * @default 'info'
   */
  type?: 'success' | 'error' | 'info';
  /**
   * Optional duration in milliseconds for how long the notification should be visible.
   * @type {number}
   */
  duration?: number;
}

/**
 * @description Payload for the 'vault:state-changed' event, broadcast when the vault's
 * status (initialized, locked) changes.
 */
export interface VaultStateChangedPayload {
  /**
   * Indicates if the vault has been initialized with a master password.
   * @type {boolean}
   */
  isInitialized: boolean;
  /**
   * Indicates if the vault is currently unlocked and the session key is in memory.
   * @type {boolean}
   */
  isUnlocked: boolean;
}

/**
 * @description Payload for the 'vault:locked' event.
 */
export interface VaultLockPayload {
    /**
     * The reason the vault was locked.
     * 'timeout' for automatic session expiration.
     * 'manual' for user-initiated lock.
     * @type {'timeout' | 'manual'}
     */
    reason: 'timeout' | 'manual';
}

/**
 * @description Payload for the 'app:user-changed' event.
 */
export interface AppUserChangedPayload {
  /**
   * The current user object, or null if the user has logged out.
   * @type {AppUser | null}
   */
  user: AppUser | null;
}

/**
 * @description Payload for the 'app:view-changed' event.
 */
export interface AppViewChangedPayload {
  /**
   * The ID of the view to navigate to.
   * @type {ViewType}
   */
  view: ViewType;
  /**
   * Optional props to pass to the view component.
   * @type {any}
   */
  props?: any;
}


/**
 * @description Generic payload for window lifecycle events.
 */
export interface WindowLifecyclePayload {
    /**
     * The unique identifier for the window.
     * @type {string}
     */
    id: string;
}

// #endregion
