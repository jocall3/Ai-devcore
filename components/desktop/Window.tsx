/**
 * @file Renders a single window in the desktop environment, handling user interactions like dragging, resizing, and window controls.
 * @module components/desktop/Window
 */

import React, { Suspense, useRef, useEffect } from 'react';
import type { Feature } from '@/types.ts';
import { FEATURES_MAP } from '@/components/features/index.tsx';
import { LoadingIndicator } from '@/App.tsx';
import { MinimizeIcon, MaximizeIcon, RestoreIcon, XMarkIcon } from '@/components/icons.tsx';

/**
 * @typedef {'normal' | 'maximized'} WindowDisplayState
 * Represents the display state of a window (e.g., normal size or maximized).
 */

/**
 * @interface WindowState
 * @description Defines the complete state of a window, including its position, size, and display status. This state is managed by the WindowingManager service.
 * @property {string} id - The unique identifier for the window, typically matching a feature ID.
 * @property {{ x: number; y: number }} position - The coordinates of the window's top-left corner.
 * @property {{ width: number; height: number }} size - The dimensions of the window.
 * @property {number} zIndex - The stacking order of the window. Higher numbers are on top.
 * @property {boolean} isActive - Whether the window is currently focused.
 * @property {WindowDisplayState} displayState - The current display state of the window, either 'normal' or 'maximized'.
 */
export interface WindowState {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isActive: boolean;
  displayState: 'normal' | 'maximized';
}

/**
 * @interface WindowProps
 * @description Props for the Window component.
 * @property {Feature} feature - The feature metadata to be rendered inside the window.
 * @property {WindowState} state - The current state of the window.
 * @property {(id: string) => void} onClose - Callback triggered when the close button is clicked.
 * @property {(id: string) => void} onMinimize - Callback triggered when the minimize button is clicked.
 * @property {(id: string) => void} onFocus - Callback triggered when the window is clicked or dragged.
 * @property {(id: string, updates: Partial<Pick<WindowState, 'position' | 'size'>>) => void} onUpdate - Callback to update the window's position or size during drag/resize.
 * @property {(id: string) => void} onMaximize - Callback triggered when the maximize button is clicked.
 * @property {(id: string) => void} onRestore - Callback triggered when the restore button is clicked on a maximized window.
 * @example
 * <Window
 *   feature={myFeature}
 *   state={windowState}
 *   onClose={handleClose}
 *   onMinimize={handleMinimize}
 *   onFocus={handleFocus}
 *   onUpdate={handleUpdate}
 *   onMaximize={handleMaximize}
 *   onRestore={handleRestore}
 * />
 */
export interface WindowProps {
  feature: Feature;
  state: WindowState;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onFocus: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<WindowState, 'position' | 'size'>>) => void;
  onMaximize: (id: string) => void;
  onRestore: (id: string) => void;
}

/**
 * A draggable, resizable, and controllable window component for the desktop environment.
 * It renders a given feature component and communicates user interactions back to a parent controller.
 * This component is fully controlled and relies on its props for all state information.
 * @param {WindowProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered window element.
 */
export const Window: React.FC<WindowProps> = ({ feature, state, onClose, onMinimize, onFocus, onUpdate, onMaximize, onRestore }) => {
  const interactionRef = useRef<{
    type: 'drag' | 'resize';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startPositionX: number;
    startPositionY: number;
    direction?: string;
  } | null>(null);

  const FeatureComponent = FEATURES_MAP.get(feature.id)?.component;

  const handleInteractionStart = (
    e: React.MouseEvent<HTMLElement>,
    type: 'drag' | 'resize',
    direction?: string
  ) => {
    if (e.button !== 0) return; // Only allow left-click interactions
    e.preventDefault();
    e.stopPropagation();
    onFocus(feature.id);

    interactionRef.current = {
      type,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: state.size.width,
      startHeight: state.size.height,
      startPositionX: state.position.x,
      startPositionY: state.position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactionRef.current) return;

      const dx = e.clientX - interactionRef.current.startX;
      const dy = e.clientY - interactionRef.current.startY;

      if (interactionRef.current.type === 'drag') {
        onUpdate(feature.id, {
          position: {
            x: interactionRef.current.startPositionX + dx,
            y: interactionRef.current.startPositionY + dy,
          },
        });
      } else if (interactionRef.current.type === 'resize') {
        let newWidth = interactionRef.current.startWidth;
        let newHeight = interactionRef.current.startHeight;
        let newX = interactionRef.current.startPositionX;
        let newY = interactionRef.current.startPositionY;
        const direction = interactionRef.current.direction || '';

        if (direction.includes('r')) newWidth = Math.max(300, newWidth + dx);
        if (direction.includes('b')) newHeight = Math.max(200, newHeight + dy);
        if (direction.includes('l')) {
          newWidth = Math.max(300, newWidth - dx);
          newX = newX + dx;
        }
        if (direction.includes('t')) {
          newHeight = Math.max(200, newHeight - dy);
          newY = newY + dy;
        }

        onUpdate(feature.id, {
          position: { x: newX, y: newY },
          size: { width: newWidth, height: newHeight },
        });
      }
    };

    const handleMouseUp = () => {
      interactionRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [feature.id, onUpdate]);

  const isMaximized = state.displayState === 'maximized';

  const windowStyles: React.CSSProperties = isMaximized ? {
    left: 0,
    top: 0,
    width: '100vw',
    height: '100%',
    zIndex: state.zIndex,
    borderRadius: 0,
  } : {
    left: state.position.x,
    top: state.position.y,
    width: state.size.width,
    height: state.size.height,
    zIndex: state.zIndex,
  };

  return (
    <div
      className={`absolute bg-surface/70 backdrop-blur-md border rounded-lg shadow-2xl shadow-black/50 flex flex-col transition-all duration-100 ${state.isActive ? 'border-primary/50' : 'border-border/50'}`}
      style={windowStyles}
      onMouseDown={() => onFocus(feature.id)}
    >
      <header
        className={`flex items-center justify-between h-8 px-2 border-b ${state.isActive ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-800/50 border-slate-700'} ${isMaximized ? 'rounded-t-none' : 'rounded-t-lg'} ${isMaximized ? 'cursor-default' : 'cursor-move'}`}
        onMouseDown={(e) => !isMaximized && handleInteractionStart(e, 'drag')}
        onDoubleClick={() => isMaximized ? onRestore(feature.id) : onMaximize(feature.id)}
      >
        <div className="flex items-center gap-2 text-xs truncate">
          <div className="w-4 h-4 flex-shrink-0">{feature.icon}</div>
          <span className="truncate">{feature.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onMinimize(feature.id)} className="p-1 rounded hover:bg-slate-600"><MinimizeIcon /></button>
          {isMaximized ? (
            <button onClick={() => onRestore(feature.id)} className="p-1 rounded hover:bg-slate-600"><RestoreIcon /></button>
          ) : (
            <button onClick={() => onMaximize(feature.id)} className="p-1 rounded hover:bg-slate-600"><MaximizeIcon /></button>
          )}
          <button onClick={() => onClose(feature.id)} className="p-1 rounded hover:bg-red-500/50"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      </header>
      <main className={`flex-1 overflow-auto bg-surface/50 ${isMaximized ? 'rounded-b-none' : 'rounded-b-lg'}`}>
        {FeatureComponent ? (
          <Suspense fallback={<LoadingIndicator />}>
            <FeatureComponent />
          </Suspense>
        ) : (
          <div className="p-4 text-red-400">Error: Component not found for {feature.name}</div>
        )}
      </main>

      {!isMaximized && (
        <>
          {['t', 'r', 'b', 'l', 'tl', 'tr', 'br', 'bl'].map(dir => (
            <div
              key={dir}
              onMouseDown={(e) => handleInteractionStart(e, 'resize', dir)}
              className={`resizer resizer-${dir}`}
            />
          ))}
          <style>{`
            .resizer { position: absolute; z-index: 10; }
            .resizer-t, .resizer-b { left: 5px; right: 5px; height: 5px; cursor: ns-resize; }
            .resizer-t { top: -2px; }
            .resizer-b { bottom: -2px; }
            .resizer-l, .resizer-r { top: 5px; bottom: 5px; width: 5px; cursor: ew-resize; }
            .resizer-l { left: -2px; }
            .resizer-r { right: -2px; }
            .resizer-tl, .resizer-tr, .resizer-br, .resizer-bl { width: 10px; height: 10px; }
            .resizer-tl { top: -5px; left: -5px; cursor: nwse-resize; }
            .resizer-tr { top: -5px; right: -5px; cursor: nesw-resize; }
            .resizer-br { bottom: -5px; right: -5px; cursor: nwse-resize; }
            .resizer-bl { bottom: -5px; left: -5px; cursor: nesw-resize; }
          `}</style>
        </>
      )}
    </div>
  );
};