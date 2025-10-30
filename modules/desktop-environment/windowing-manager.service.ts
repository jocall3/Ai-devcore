/**
 * @file Defines the WindowingManager service responsible for window state management.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { createActor, type ActorRefFrom } from 'xstate';
import {
  createWindowMachine,
  type WindowContext,
  type WindowPosition
} from './window.state-machine';

// --- Placeholder Interfaces (to be replaced by actual implementations) ---

/**
 * @interface IEventBus
 * @description Represents the central asynchronous event bus for inter-module communication.
 * This is a placeholder and should be replaced with the actual application's event bus implementation.
 */
export interface IEventBus {
  publish<T>(topic: string, data?: T): void;
  subscribe<T>(topic: string, handler: (data: T) => void): () => void;
}

// --- Type Definitions ---

export type WindowId = string;

// The machine definition is imported, so we can derive types from it.
type WindowMachine = ReturnType<typeof createWindowMachine>;
type WindowActor = ActorRefFrom<WindowMachine>;
type WindowSnapshot = ReturnType<WindowActor['getSnapshot']>;

/**
 * @typedef {object} WindowInstance
 * @description Represents an active window, including its state machine actor.
 * @property {WindowId} id - The unique ID of the window.
 * @property {string} featureId - The ID of the feature displayed.
 * @property {WindowActor} actor - The XState actor managing the window's state.
 */
export interface WindowInstance {
  id: WindowId;
  featureId: string;
  actor: WindowActor;
}

/**
 * @typedef {object} WindowPublicState
 * @description The state of a window that is exposed to the UI for rendering.
 */
export interface WindowPublicState extends WindowContext {
  featureId: string;
  stateValue: WindowSnapshot['value'];
  isActive: boolean;
}

const Z_INDEX_BASE = 10;

/**
 * @class WindowingManagerService
 * @description Manages the lifecycle and state of all desktop windows.
 * Extracts window management logic from React components into a dedicated service.
 * This service is intended to be a singleton managed by a DI container.
 */
export class WindowingManagerService {
  private windows = new Map<WindowId, WindowInstance>();
  private zStack: WindowId[] = [];
  private activeWindowId: WindowId | null = null;
  private eventBus: IEventBus;

  /**
   * @constructor
   * @param {IEventBus} eventBus - The central application event bus.
   */
  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Opens a new window for a feature or focuses an existing one.
   * @param {string} featureId - The ID of the feature to open.
   * @returns {WindowId} The ID of the opened or focused window.
   */
  public openWindow(featureId: string): WindowId {
    const existingWindow = Array.from(this.windows.values()).find(w => w.featureId === featureId);

    if (existingWindow) {
      const snapshot = existingWindow.actor.getSnapshot();
      if (snapshot.matches('minimized')) {
        this.restoreWindow(existingWindow.id);
      }
      this.focusWindow(existingWindow.id);
      return existingWindow.id;
    }

    const newWindowId: WindowId = `window-${Date.now()}`;
    const initialZIndex = Z_INDEX_BASE + this.zStack.length;

    const machine = createWindowMachine({
      id: newWindowId,
      position: { x: 50 + this.windows.size * 30, y: 50 + this.windows.size * 30 },
      size: { width: 800, height: 600 },
      zIndex: initialZIndex,
    });

    const actor = createActor(machine).start();

    const windowInstance: WindowInstance = { id: newWindowId, featureId, actor };
    this.windows.set(newWindowId, windowInstance);
    this._subscribeToWindowActor(windowInstance);

    this.focusWindow(newWindowId);
    
    this.eventBus.publish('window:opened', { windowId: newWindowId, featureId });
    this._broadcastWindowState();

    return newWindowId;
  }

  /**
   * Closes a window.
   * @param {WindowId} windowId - The ID of the window to close.
   */
  public closeWindow(windowId: WindowId): void {
    const windowInstance = this.windows.get(windowId);
    if (windowInstance) {
      windowInstance.actor.send({ type: 'CLOSE' });
      windowInstance.actor.stop();
      this.windows.delete(windowId);
      this.zStack = this.zStack.filter(id => id !== windowId);

      if (this.activeWindowId === windowId) {
        this.activeWindowId = this._getTopmostWindow()?.id ?? null;
        if (this.activeWindowId) {
          this.windows.get(this.activeWindowId)?.actor.send({ type: 'FOCUS' });
        }
      }

      this.eventBus.publish('window:closed', { windowId });
      this._broadcastWindowState();
    }
  }

  /**
   * Focuses a specific window, bringing it to the front.
   * @param {WindowId} windowId - The ID of the window to focus.
   */
  public focusWindow(windowId: WindowId): void {
    if (this.activeWindowId === windowId) return;

    if (this.activeWindowId) {
      this.windows.get(this.activeWindowId)?.actor.send({ type: 'BLUR' });
    }

    this.windows.get(windowId)?.actor.send({ type: 'FOCUS' });
    this.activeWindowId = windowId;

    // Update z-stack
    this.zStack = this.zStack.filter(id => id !== windowId);
    this.zStack.push(windowId);
    this._updateZIndices();

    this.eventBus.publish('window:focused', { windowId });
  }
  
  /**
   * Minimizes a window.
   * @param {WindowId} windowId - The ID of the window to minimize.
   */
  public minimizeWindow(windowId: WindowId): void {
    this.windows.get(windowId)?.actor.send({ type: 'MINIMIZE' });
    if (this.activeWindowId === windowId) {
        this.activeWindowId = this._getTopmostWindow(true)?.id ?? null;
        if (this.activeWindowId) {
            this.focusWindow(this.activeWindowId);
        }
    }
    this.eventBus.publish('window:minimized', { windowId });
  }

  /**
   * Restores a minimized window to its active state.
   * @param {WindowId} windowId - The ID of the window to restore.
   */
  public restoreWindow(windowId: WindowId): void {
    this.windows.get(windowId)?.actor.send({ type: 'RESTORE' });
    this.focusWindow(windowId);
  }
  
  /**
   * Updates the position of a window, typically during a drag operation.
   * @param {WindowId} windowId - The ID of the window to move.
   * @param {WindowPosition} position - The new position.
   */
  public updateWindowPosition(windowId: WindowId, position: WindowPosition): void {
    this.windows.get(windowId)?.actor.send({ type: 'DRAG_MOVE', position });
  }

  public startDrag(windowId: WindowId, position: WindowPosition): void {
    this.windows.get(windowId)?.actor.send({ type: 'DRAG_START', position });
  }

  public endDrag(windowId: WindowId): void {
    this.windows.get(windowId)?.actor.send({ type: 'DRAG_END' });
  }

  /**
   * Gets the public state of all windows for rendering.
   * @returns {WindowPublicState[]} An array of window states.
   */
  public getWindowsState(): WindowPublicState[] {
    return Array.from(this.windows.values()).map(instance => {
      const snapshot = instance.actor.getSnapshot();
      return {
        ...snapshot.context,
        featureId: instance.featureId,
        stateValue: snapshot.value,
        isActive: this.activeWindowId === instance.id,
      };
    });
  }

  /**
   * Subscribes to state changes in a window's actor and broadcasts them.
   * @private
   */
  private _subscribeToWindowActor(windowInstance: WindowInstance): void {
    windowInstance.actor.subscribe(() => {
      this._broadcastWindowState();
    });
  }

  /**
   * Publishes the current state of all windows to the event bus.
   * @private
   */
  private _broadcastWindowState(): void {
    this.eventBus.publish('window:state_changed', this.getWindowsState());
  }

  /**
   * Recalculates and applies z-index values to all windows based on their order in the z-stack.
   * @private
   */
  private _updateZIndices(): void {
    this.zStack.forEach((id, index) => {
      this.windows.get(id)?.actor.send({ 
        type: 'UPDATE_Z_INDEX', 
        zIndex: Z_INDEX_BASE + index 
      });
    });
  }
  
  /**
   * Gets the topmost window from the z-stack.
   * @private
   */
  private _getTopmostWindow(ignoreMinimized = false): WindowInstance | undefined {
    if (this.zStack.length === 0) return undefined;
    for (let i = this.zStack.length - 1; i >= 0; i--) {
        const id = this.zStack[i];
        const instance = this.windows.get(id);
        if (instance) {
            if (ignoreMinimized && instance.actor.getSnapshot().matches('minimized')) {
                continue;
            }
            return instance;
        }
    }
    return undefined;
  }
}
