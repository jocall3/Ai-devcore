/**
 * @file Defines the WindowingManager service responsible for window state management.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { createMachine, createActor, assign, type Actor, type StateMachine } from 'xstate';

// --- Placeholder Interfaces (to be replaced by actual implementations) ---

/**
 * @interface IEventBus
 * @description Represents the central asynchronous event bus for inter-module communication.
 * This is a placeholder and should be replaced with the actual application's event bus implementation.
 * @example
 * const eventBus = new EventBus();
 * eventBus.publish('window:focused', { windowId: 'feat-1' });
 * const unsubscribe = eventBus.subscribe('window:focused', (data) => console.log('Window focused:', data.windowId));
 * unsubscribe();
 */
export interface IEventBus {
  publish<T>(topic: string, data?: T): void;
  subscribe<T>(topic: string, handler: (data: T) => void): () => void;
}

// --- Type Definitions ---

/**
 * @typedef {string} WindowId
 * @description A unique identifier for a window instance.
 */
export type WindowId = string;

/**
 * @typedef {object} Point
 * @property {number} x - The x-coordinate.
 * @property {number} y - The y-coordinate.
 */
export type Point = { x: number; y: number };

/**
 * @typedef {object} Size
 * @property {number} width - The width dimension.
 * @property {number} height - The height dimension.
 */
export type Size = { width: number; height: number };

/**
 * @typedef {object} WindowContext
 * @description The context (extended state) for the window state machine.
 * @property {WindowId} id - The unique ID of the window.
 * @property {string} featureId - The ID of the feature displayed in the window.
 * @property {Point} position - The current top-left position of the window.
 * @property {Size} size - The current size of the window.
 * @property {number} zIndex - The current z-index of the window.
 * @property {Point | null} previousPosition - The position before maximizing.
 * @property {Size | null} previousSize - The size before maximizing.
 */
export type WindowContext = {
  id: WindowId;
  featureId: string;
  position: Point;
  size: Size;
  zIndex: number;
  previousPosition: Point | null;
  previousSize: Size | null;
};

/**
 * @typedef {object} WindowMachineEvent
 * @description The events that can be sent to a window's state machine.
 */
export type WindowMachineEvent = 
  | { type: 'FOCUS' }
  | { type: 'BLUR' }
  | { type: 'MINIMIZE' }
  | { type: 'MAXIMIZE' }
  | { type: 'RESTORE' }
  | { type: 'CLOSE' }
  | { type: 'START_DRAG' }
  | { type: 'DRAG', position: Point }
  | { type: 'END_DRAG' }
  | { type: 'UPDATE_Z_INDEX', zIndex: number };

/**
 * @typedef {object} WindowMachineStateValue
 * @description The possible states of the window state machine.
 */
export type WindowMachineStateValue = 
  | 'inactive'
  | 'active'
  | 'active.idle'
  | 'active.dragging'
  | 'minimized'
  | 'maximized';

/**
 * @typedef {object} WindowInstance
 * @description Represents an active window, including its state machine actor.
 * @property {WindowId} id - The unique ID of the window.
 * @property {string} featureId - The ID of the feature displayed.
 * @property {Actor<StateMachine<WindowContext, WindowMachineEvent>>} actor - The XState actor managing the window's state.
 */
export interface WindowInstance {
  id: WindowId;
  featureId: string;
  actor: Actor<StateMachine<WindowContext, WindowMachineEvent>>;
}

/**
 * @typedef {object} WindowPublicState
 * @description The state of a window that is exposed to the UI for rendering.
 */
export interface WindowPublicState extends WindowContext {
  stateValue: WindowMachineStateValue;
  isActive: boolean;
}

const Z_INDEX_BASE = 10;

/**
 * Creates a new finite state machine for managing a window's lifecycle.
 * @function
 * @param {WindowContext} initialContext - The initial context for the window machine.
 * @returns {StateMachine<WindowContext, WindowMachineEvent>} An XState machine definition.
 * @example
 * const machine = createWindowMachine({ ... });
 */
const createWindowMachine = (initialContext: WindowContext) => createMachine({
  id: 'window',
  types: {} as { context: WindowContext; events: WindowMachineEvent },
  context: initialContext,
  initial: 'inactive',
  states: {
    inactive: {
      on: {
        FOCUS: 'active',
        MINIMIZE: 'minimized',
      },
    },
    active: {
      initial: 'idle',
      on: {
        BLUR: 'inactive',
        MINIMIZE: 'minimized',
        MAXIMIZE: 'maximized',
      },
      states: {
        idle: {
          on: {
            START_DRAG: 'dragging',
          },
        },
        dragging: {
          on: {
            DRAG: {
              actions: assign({ 
                position: ({ event }) => event.position 
              }),
            },
            END_DRAG: 'idle',
          },
        },
      },
    },
    minimized: {
      on: {
        RESTORE: 'active',
      },
    },
    maximized: {
      entry: assign({
        previousPosition: ({ context }) => context.position,
        previousSize: ({ context }) => context.size,
        // Position/size would be set by the service to fit the viewport
      }),
      on: {
        RESTORE: {
          target: 'active',
          actions: assign({
            position: ({ context }) => context.previousPosition || context.position,
            size: ({ context }) => context.previousSize || context.size,
          }),
        },
      },
    },
  },
  on: {
    UPDATE_Z_INDEX: {
      actions: assign({ 
        zIndex: ({ event }) => event.zIndex 
      }),
    },
    CLOSE: {
      target: 'inactive', // Or a final state if needed
    },
  },
});

/**
 * @class WindowingManagerService
 * @description Manages the lifecycle and state of all desktop windows.
 * Extracts window management logic from React components into a dedicated service.
 * This service is intended to be a singleton managed by a DI container.
 * @example
 * const windowingManager = new WindowingManagerService(eventBus);
 * windowingManager.openWindow('feature-id');
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
   * @example
   * windowingManager.openWindow('ai-code-explainer');
   */
  public openWindow(featureId: string): WindowId {
    const existingWindow = Array.from(this.windows.values()).find(w => w.featureId === featureId);

    if (existingWindow) {
      if (existingWindow.actor.getSnapshot().value === 'minimized') {
        this.restoreWindow(existingWindow.id);
      }
      this.focusWindow(existingWindow.id);
      return existingWindow.id;
    }

    const newWindowId: WindowId = `window-${Date.now()}`;
    const initialZIndex = Z_INDEX_BASE + this.zStack.length;

    const machine = createWindowMachine({
      id: newWindowId,
      featureId,
      position: { x: 50 + this.windows.size * 30, y: 50 + this.windows.size * 30 },
      size: { width: 800, height: 600 },
      zIndex: initialZIndex,
      previousPosition: null,
      previousSize: null,
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
   * @example
   * windowingManager.closeWindow('window-12345');
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
   * @example
   * windowingManager.focusWindow('window-12345');
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
   * @param {Point} position - The new position.
   */
  public updateWindowPosition(windowId: WindowId, position: Point): void {
    this.windows.get(windowId)?.actor.send({ type: 'DRAG', position });
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
        stateValue: snapshot.value as WindowMachineStateValue,
        isActive: this.activeWindowId === instance.id,
      };
    });
  }

  /**
   * Subscribes to state changes in a window's actor and broadcasts them.
   * @private
   * @param {WindowInstance} windowInstance - The window instance to subscribe to.
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
   * @param {boolean} [ignoreMinimized=false] - If true, ignores minimized windows.
   * @returns {WindowInstance | undefined} The topmost window instance.
   */
  private _getTopmostWindow(ignoreMinimized = false): WindowInstance | undefined {
    if (this.zStack.length === 0) return undefined;
    for (let i = this.zStack.length - 1; i >= 0; i--) {
        const id = this.zStack[i];
        const instance = this.windows.get(id);
        if (instance) {
            if (ignoreMinimized && instance.actor.getSnapshot().value === 'minimized') {
                continue;
            }
            return instance;
        }
    }
    return undefined;
  }
}
