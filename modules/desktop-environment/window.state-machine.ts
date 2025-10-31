```typescript
/**
 * @fileoverview Defines the state machine for a single window in the desktop environment.
 * This machine manages the window's lifecycle, including states like active, inactive,
 * minimized, maximized, dragging, and resizing, adhering to enterprise-grade state management principles.
 * @module modules/desktop-environment/window.state-machine
 */

import { setup, assign } from 'xstate';

/**
 * Represents a 2D coordinate.
 */
export interface WindowPosition {
  x: number;
  y: number;
}

/**
 * Represents the dimensions of a window.
 */
export interface WindowSize {
  width: number;
  height: number;
}

/**
 * The context (extended state) for the window state machine.
 */
export interface WindowContext {
  id: string;
  position: WindowPosition;
  size: WindowSize;
  prevPosition: WindowPosition | null;
  prevSize: WindowSize | null;
  dragStart: WindowPosition | null;
  zIndex: number;
}

/**
 * The events that can be sent to the window state machine.
 */
export type WindowEvent =
  | { type: 'FOCUS' }
  | { type: 'BLUR' }
  | { type: 'MINIMIZE' }
  | { type: 'MAXIMIZE' }
  | { type: 'RESTORE' }
  | { type: 'CLOSE' }
  | { type: 'DRAG_START'; position: WindowPosition }
  | { type: 'DRAG_MOVE'; position: WindowPosition }
  | { type: 'DRAG_END' }
  | { type: 'RESIZE_START'; position: WindowPosition }
  | { type: 'RESIZE_MOVE'; position: WindowPosition }
  | { type: 'RESIZE_END' }
  | { type: 'UPDATE_Z_INDEX'; zIndex: number };

/**
 * Creates a new XState machine for managing a window's state and behavior.
 * This factory function allows for creating multiple, independent window instances
 * each with its own state, based on the provided initial context.
 * @param {Partial<WindowContext>} initialContext - The initial context for the window machine, such as ID, position, and size.
 * @returns {import('xstate').StateMachine<WindowContext, WindowEvent, any>} A state machine instance configured for a window.
 * @example
 * import { createActor } from 'xstate';
 * import { createWindowMachine } from './window.state-machine';
 *
 * const newWindowMachine = createWindowMachine({
 *   id: 'window-1',
 *   position: { x: 100, y: 100 },
 *   size: { width: 800, height: 600 },
 *   zIndex: 10,
 * });
 *
 * const windowActor = createActor(newWindowMachine).start();
 * windowActor.send({ type: 'FOCUS' });
 */
export const createWindowMachine = (initialContext: Partial<WindowContext>) => {
  return setup({
    types: {
      context: {} as WindowContext,
      events: {} as WindowEvent,
    },
    actions: {
      assignDragStart: assign({
        dragStart: ({ event }) => {
          // XState v5's type inference should ensure `event` is 'DRAG_START' here
          // as this action is configured only for 'DRAG_START' transitions.
          if (event.type !== 'DRAG_START') {
            console.warn('assignDragStart called with incorrect event type:', event.type);
            return null;
          }
          return { x: event.position.x, y: event.position.y };
        },
        prevPosition: ({ context }) => context.position,
      }),
      assignDragPosition: assign({
        position: ({ context, event }) => {
          // XState v5's type inference should ensure `event` is 'DRAG_MOVE' here.
          if (event.type !== 'DRAG_MOVE' || !context.dragStart || !context.prevPosition) {
            console.warn('assignDragPosition called with incorrect event type or missing context:', event?.type, context.dragStart, context.prevPosition);
            return context.position; // Fallback to current position if unexpected state
          }
          const dx = event.position.x - context.dragStart.x;
          const dy = event.position.y - context.dragStart.y;
          return {
            x: context.prevPosition.x + dx,
            y: context.prevPosition.y + dy,
          };
        },
      }),
      clearDragState: assign({
        dragStart: null,
        prevPosition: null,
      }),
      savePrevSizeAndPosition: assign({
        prevPosition: ({ context }) => context.position,
        prevSize: ({ context }) => context.size,
      }),
      restorePrevSizeAndPosition: assign({
        position: ({ context }) => context.prevPosition || context.position,
        size: ({ context }) => context.prevSize || context.size,
        prevPosition: null,
        prevSize: null,
      }),
      assignZIndex: assign({
        zIndex: ({ event }) => {
          // XState v5's type inference should ensure `event` is 'UPDATE_Z_INDEX' here.
          if (event.type !== 'UPDATE_Z_INDEX') {
            console.warn('assignZIndex called with incorrect event type:', event.type);
            return 0; // Or context.zIndex, depending on desired fallback
          }
          return event.zIndex;
        },
      }),
    },
  }).createMachine({
    id: 'window',
    // predictableActionArguments: true is an XState v4 option and is not used with setup() in v5.
    context: {
      id: '',
      position: { x: 50, y: 50 },
      size: { width: 800, height: 600 },
      prevPosition: null,
      prevSize: null,
      dragStart: null,
      zIndex: 0,
      ...initialContext,
    },
    initial: 'inactive',
    states: {
      inactive: {
        on: {
          FOCUS: 'active',
          MINIMIZE: 'minimized',
          MAXIMIZE: {
            target: 'active.maximized',
            actions: ['savePrevSizeAndPosition'],
          },
          DRAG_START: {
            target: 'active.dragging',
            actions: ['assignDragStart'],
          },
        },
      },
      active: {
        initial: 'normal',
        on: {
          BLUR: 'inactive',
          MINIMIZE: 'minimized',
          CLOSE: 'closed',
          UPDATE_Z_INDEX: {
            actions: ['assignZIndex'],
          },
        },
        states: {
          normal: {
            on: {
              MAXIMIZE: {
                target: 'maximized',
                actions: ['savePrevSizeAndPosition'],
              },
              DRAG_START: {
                target: 'dragging',
                actions: ['assignDragStart'],
              },
              RESIZE_START: 'resizing',
            },
          },
          maximized: {
            on: {
              RESTORE: {
                target: 'normal',
                actions: ['restorePrevSizeAndPosition'],
              },
            },
          },
          dragging: {
            on: {
              DRAG_MOVE: {
                actions: ['assignDragPosition'],
              },
              DRAG_END: {
                target: 'normal',
                actions: ['clearDragState'],
              },
            },
          },
          resizing: {
            on: {
              RESIZE_END: 'normal',
            },
          },
        },
      },
      minimized: {
        on: {
          RESTORE: 'active',
        },
      },
      closed: {
        type: 'final',
      },
    },
  });
};
```