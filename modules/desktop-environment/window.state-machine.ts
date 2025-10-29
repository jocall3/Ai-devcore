/**
 * @fileoverview Defines the state machine for a single window in the desktop environment.
 * This machine manages the window's lifecycle, including states like active, inactive,
 * minimized, maximized, dragging, and resizing, adhering to enterprise-grade state management principles.
 * @module modules/desktop-environment/window.state-machine
 */

import { setup, assign } from 'xstate';

/**
 * Represents a 2D coordinate.
 * @typedef {object} WindowPosition
 * @property {number} x - The x-coordinate.
 * @property {number} y - The y-coordinate.
 */
export interface WindowPosition {
  x: number;
  y: number;
}

/**
 * Represents the dimensions of a window.
 * @typedef {object} WindowSize
 * @property {number} width - The width of the window.
 * @property {number} height - The height of the window.
 */
export interface WindowSize {
  width: number;
  height: number;
}

/**
 * The context (extended state) for the window state machine.
 * @typedef {object} WindowContext
 * @property {string} id - The unique identifier for the window.
 * @property {WindowPosition} position - The current top-left position of the window.
 * @property {WindowSize} size - The current size of the window.
 * @property {WindowPosition | null} prevPosition - The position before a drag or maximize action, used for restoration.
 * @property {WindowSize | null} prevSize - The size before a maximize or resize action, used for restoration.
 * @property {WindowPosition | null} dragStart - The initial mouse position when a drag starts, relative to the viewport.
 * @property {number} zIndex - The z-index of the window for stacking.
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
 * @typedef {object} WindowEvent
 * @property {string} type - The type of the event.
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
          if (event.type !== 'DRAG_START') return null;
          return { x: event.position.x, y: event.position.y };
        },
        prevPosition: ({ context }) => context.position,
      }),
      assignDragPosition: assign({
        position: ({ context, event }) => {
          if (event.type !== 'DRAG_MOVE' || !context.dragStart || !context.prevPosition) {
            return context.position;
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
          if (event.type !== 'UPDATE_Z_INDEX') return 0;
          return event.zIndex;
        },
      }),
    },
  }).createMachine({
    id: 'window',
    predictableActionArguments: true,
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
