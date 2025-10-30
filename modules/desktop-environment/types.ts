/**
 * @file Contains type definitions for the Desktop Environment module, including the Windowing Manager service.
 * @module modules/desktop-environment/types
 * @version 1.0.0
 * @license Apache-2.0
 */

import type React from 'react';

/**
 * @description A string literal type for unique feature identifiers.
 * @example
 * const myFeatureId: FeatureId = 'ai-code-explainer';
 */
export type FeatureId = string;

/**
 * @description Defines the categories a feature can belong to.
 * @example
 * const category: FeatureCategory = 'AI Tools';
 */
export type FeatureCategory = 'Core' | 'AI Tools' | 'Frontend' | 'Testing' | 'Database' | 'Data' | 'Productivity' | 'Git' | 'Local Dev' | 'Performance & Auditing' | 'Deployment & CI/CD' | 'Security' | 'Workflow' | 'Cloud';

/**
 * @description Represents a feature that can be opened in a window on the desktop.
 * It contains metadata and the component to be rendered.
 * @example
 * const myFeature: Feature = {
 *   id: 'my-feature',
 *   name: 'My Awesome Feature',
 *   description: 'This is an example feature.',
 *   icon: <MyIcon />,
 *   category: 'AI Tools',
 *   component: React.lazy(() => import('./MyFeatureComponent')),
 * };
 */
export interface Feature {
  /**
   * @description A unique identifier for the feature (e.g., 'ai-code-explainer').
   * @type {FeatureId}
   */
  id: FeatureId;

  /**
   * @description The display name of the feature.
   * @type {string}
   */
  name: string;

  /**
   * @description A short description of what the feature does.
   * @type {string}
   */
  description: string;

  /**
   * @description The React node to use as the feature's icon.
   * @type {React.ReactNode}
   */
  icon: React.ReactNode;

  /**
   * @description The category the feature belongs to.
   * @type {FeatureCategory}
   */
  category: FeatureCategory;

  /**
   * @description The lazy-loaded React component that renders the feature's UI.
   * @type {React.FC<any>}
   */
  component: React.FC<any>;

  /**
   * @description Optional flag to indicate if this is a user-generated custom feature.
   * @type {boolean | undefined}
   */
  isCustom?: boolean;
}

/**
 * @description Defines the possible states of a window's finite state machine.
 * @example
 * let windowState: WindowFSMState = 'active';
 * windowState = 'minimized';
 */
export type WindowFSMState =
  | 'active'
  | 'inactive'
  | 'minimized'
  | 'maximized'
  | 'dragging'
  | 'resizing';

/**
 * @description Represents the position and dimensions of a window.
 * @example
 * const dimensions: WindowDimensions = {
 *   x: 100,
 *   y: 150,
 *   width: 800,
 *   height: 600,
 * };
 */
export interface WindowDimensions {
  /**
   * @description The horizontal position from the left edge of the viewport.
   * @type {number}
   */
  x: number;

  /**
   * @description The vertical position from the top edge of the viewport.
   * @type {number}
   */
  y: number;

  /**
   * @description The width of the window.
   * @type {number}
   */
  width: number;

  /**
   * @description The height of the window.
   * @type {number}
   */
  height: number;
}

/**
 * @description Represents a single window instance managed by the WindowingManager.
 * @example
 * const newWindow: WindowInstance = {
 *   id: 'window-1678886400000',
 *   featureId: 'ai-code-explainer',
 *   title: 'AI Code Explainer',
 *   dimensions: { x: 100, y: 100, width: 800, height: 600 },
 *   zIndex: 11,
 *   state: 'active',
 * };
 */
export interface WindowInstance {
  /**
   * @description A unique identifier for this specific window instance.
   * @type {string}
   */
  id: string;

  /**
   * @description The ID of the feature this window is displaying.
   * @type {FeatureId}
   */
  featureId: FeatureId;

  /**
   * @description The title displayed in the window's header.
   * @type {string}
   */
  title: string;

  /**
   * @description The position and size of the window on the desktop.
   * @type {WindowDimensions}
   */
  dimensions: WindowDimensions;

  /**
   * @description The stacking order of the window (higher is on top).
   * @type {number}
   */
  zIndex: number;

  /**
   * @description The current state of the window from its finite state machine.
   * @type {WindowFSMState}
   */
  state: WindowFSMState;
}

/**
 * @description Payload for updating a window's properties.
 * Used for events and service calls. All properties are optional.
 * @example
 * const updatePayload: WindowUpdatePayload = {
 *   dimensions: { x: 120, y: 120, width: 800, height: 600 },
 *   state: 'dragging',
 * };
 */
export type WindowUpdatePayload = Partial<Omit<WindowInstance, 'id' | 'featureId'>> & { dimensions?: Partial<WindowDimensions> };

/**
 * @description A map of all window instances, keyed by their unique instance ID.
 * This represents the entire state of the desktop.
 * @example
 * const desktopState: DesktopState = {
 *   'window-1': { id: 'window-1', ... },
 *   'window-2': { id: 'window-2', ... },
 * };
 */
export type DesktopState = Record<string, WindowInstance>;

/**
 * @description Base interface for all events on the central event bus.
 * @template T - The type of the event name.
 * @template P - The type of the event payload.
 */
export interface AppEvent<T extends string, P> {
  /**
   * @description The unique name of the event.
   * @type {T}
   */
  type: T;

  /**
   * @description The data payload associated with the event.
   * @type {P}
   */
  payload: P;
}

// --- Windowing Manager Event Payloads ---

/**
 * @description Payload for the 'window:opened' event.
 */
export type WindowOpenedPayload = { window: WindowInstance };

/**
 * @description Payload for the 'window:closed' event.
 */
export type WindowClosedPayload = { windowId: string };

/**
 * @description Payload for the 'window:focused' event.
 */
export type WindowFocusedPayload = { windowId: string };

/**
 * @description Payload for the 'window:stateChanged' event.
 */
export type WindowStateChangedPayload = { windowId: string; state: WindowFSMState };

/**
 * @description Payload for the 'window:updated' event.
 */
export type WindowUpdatedPayload = { windowId: string; updates: WindowUpdatePayload };

// --- Windowing Manager Events ---

/**
 * @description Event fired when a new window is opened.
 * @example
 * eventBus.publish({
 *   type: 'window:opened',
 *   payload: { window: newWindowInstance }
 * });
 */
export type WindowOpenedEvent = AppEvent<'window:opened', WindowOpenedPayload>;

/**
 * @description Event fired when a window is closed.
 * @example
 * eventBus.publish({
 *   type: 'window:closed',
 *   payload: { windowId: 'window-123' }
 * });
 */
export type WindowClosedEvent = AppEvent<'window:closed', WindowClosedPayload>;

/**
 * @description Event fired when a window gains focus.
 * @example
 * eventBus.publish({
 *   type: 'window:focused',
 *   payload: { windowId: 'window-123' }
 * });
 */
export type WindowFocusedEvent = AppEvent<'window:focused', WindowFocusedPayload>;

/**
 * @description Event fired when a window's FSM state changes (e.g., minimized, maximized).
 * @example
 * eventBus.publish({
 *   type: 'window:stateChanged',
 *   payload: { windowId: 'window-123', state: 'minimized' }
 * });
 */
export type WindowStateChangedEvent = AppEvent<'window:stateChanged', WindowStateChangedPayload>;

/**
 * @description Event fired when a window's properties (like dimensions) are updated.
 * @example
 * eventBus.publish({
 *   type: 'window:updated',
 *   payload: { windowId: 'window-123', updates: { zIndex: 12 } }
 * });
 */
export type WindowUpdatedEvent = AppEvent<'window:updated', WindowUpdatedPayload>;


/**
 * @description A union of all possible events related to the Windowing Manager.
 */
export type WindowingEvent =
  | WindowOpenedEvent
  | WindowClosedEvent
  | WindowFocusedEvent
  | WindowStateChangedEvent
  | WindowUpdatedEvent;