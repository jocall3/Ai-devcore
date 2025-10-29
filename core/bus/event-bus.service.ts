/**
 * @file Defines the central event bus service for inter-module communication.
 * @license SPDX-License-Identifier: Apache-2.0
 * @author The Vercel Labs AI Gold Team
 *
 * @description
 * This file implements a singleton EventBusService following the publish/subscribe pattern.
 * It is the sole mechanism for communication between different feature modules of the application,
 * ensuring loose coupling and a scalable architecture as per the Modular Monolith directives.
 * All events and their payloads are strongly typed via the `AppEventMap` interface.
 */

/**
 * Defines the contract for a notification payload.
 */
interface NotificationPayload {
  /** The message to be displayed in the notification. */
  message: string;
  /** The type of notification, affecting its appearance and icon. */
  type: 'success' | 'error' | 'info';
  /** Optional duration in milliseconds for how long the notification should be visible. */
  duration?: number;
}

/**
 * Defines the contract for vault state changes.
 */
interface VaultStatePayload {
  /** The current initialization status of the vault. */
  isInitialized: boolean;
  /** The current lock status of the vault. */
  isUnlocked: boolean;
}

/**
 * A map defining all possible application events and their corresponding payload types.
 * This provides type safety for publishing and subscribing to events.
 * Adding a new event to the system requires adding an entry here.
 *
 * @example
 * // To add a new event for user login:
 * export interface AppEventMap {
 *   // ... existing events
 *   'user:login': { userId: string; username: string };
 * }
 */
export interface AppEventMap {
  'notification:show': NotificationPayload;
  'vault:stateChanged': VaultStatePayload;
  'vault:requestUnlock': undefined;
  'window:focused': { windowId: string };
  'window:closed': { windowId: string };
  'command:run': { commandId: string; params: any };
}

/**
 * A generic type for an event listener callback function.
 * @template T The type of the payload the callback will receive.
 */
type EventListenerCallback<T = any> = (payload: T) => void;

/**
 * A function that, when called, unsubscribes the listener it was returned from.
 */
type UnsubscribeFunction = () => void;

/**
 * Interface for the Event Bus service, defining the public API for subscribing to and publishing events.
 */
export interface IEventBus {
  /**
   * Subscribes a callback function to a specific event.
   * @template K The event name, key of `AppEventMap`.
   * @param {K} event The name of the event to subscribe to.
   * @param {(payload: AppEventMap[K]) => void} callback The function to execute when the event is published.
   * @returns {UnsubscribeFunction} A function to call to unsubscribe the listener.
   */
  subscribe<K extends keyof AppEventMap>(event: K, callback: (payload: AppEventMap[K]) => void): UnsubscribeFunction;

  /**
   * Publishes an event to all subscribed listeners.
   * @template K The event name, key of `AppEventMap`.
   * @param {K} event The name of the event to publish.
   * @param {AppEventMap[K]} payload The data to pass to the listeners.
   */
  publish<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void;
}

/**
 * A singleton class that implements a strongly-typed, asynchronous event bus.
 */
class EventBusService implements IEventBus {
  /**
   * A map to store event listeners. The key is the event name, and the value is an array of callback functions.
   * @private
   */
  private listeners: Map<keyof AppEventMap, Array<EventListenerCallback>> = new Map();

  /**
   * Subscribes a callback function to a specific event.
   *
   * @template K The event name, key of `AppEventMap`.
   * @param {K} event The name of the event to subscribe to.
   * @param {(payload: AppEventMap[K]) => void} callback The function to execute when the event is published.
   * @returns {UnsubscribeFunction} A function to call to unsubscribe this specific listener.
   *
   * @example
   * const unsubscribe = eventBus.subscribe('notification:show', (payload) => {
   *   console.log(`Notification: ${payload.message}`);
   * });
   *
   * // Later, to clean up:
   * unsubscribe();
   */
  public subscribe<K extends keyof AppEventMap>(
    event: K,
    callback: (payload: AppEventMap[K]) => void
  ): UnsubscribeFunction {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const eventListeners = this.listeners.get(event)!;
    eventListeners.push(callback as EventListenerCallback);

    // Return an unsubscribe function for this specific subscription
    return () => {
      const listenersForEvent = this.listeners.get(event);
      if (listenersForEvent) {
        const index = listenersForEvent.indexOf(callback as EventListenerCallback);
        if (index > -1) {
          listenersForEvent.splice(index, 1);
        }
      }
    };
  }

  /**
   * Publishes an event, asynchronously notifying all subscribed listeners.
   * Listeners are called within a `setTimeout` to prevent the publisher from being blocked
   * and to avoid issues with call stack depth.
   *
   * @template K The event name, key of `AppEventMap`.
   * @param {K} event The name of the event to publish.
   * @param {AppEventMap[K]} payload The data to pass to the listeners.
   *
   * @example
   * eventBus.publish('notification:show', {
   *   message: 'File saved successfully!',
   *   type: 'success',
   * });
   */
  public publish<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      return;
    }

    eventListeners.forEach(callback => {
      // Execute callbacks asynchronously to avoid blocking the publisher
      setTimeout(() => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event bus listener for event '${String(event)}':`, error);
        }
      }, 0);
    });
  }
}

/**
 * The singleton instance of the EventBusService.
 * Import this instance throughout the application to ensure a single, centralized message bus.
 *
 * @example
 * import { eventBus } from '@/core/bus/event-bus.service';
 *
 * // Publishing an event
 * eventBus.publish('vault:stateChanged', { isInitialized: true, isUnlocked: false });
 *
 * // Subscribing to an event in a React component
 * useEffect(() => {
 *   const unsubscribe = eventBus.subscribe('vault:stateChanged', (payload) => {
 *     if (payload.isUnlocked) {
 *       // ...
 *     }
 *   });
 *   return () => unsubscribe(); // Cleanup on unmount
 * }, []);
 */
export const eventBus: IEventBus = new EventBusService();
