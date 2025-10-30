/**
 * @file Renders the main desktop environment, including the feature dock, windows, and taskbar.
 * It manages the state of all open, closed, and minimized windows and triggers the vault unlock prompt on startup.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FeatureDock } from './FeatureDock.tsx';
import { Window, type WindowState as WindowComponentState } from './Window.tsx';
import { Taskbar } from './Taskbar.tsx';
import { ALL_FEATURES } from '../features/index.tsx';
import type { Feature } from '../../types.ts';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { isVaultInitialized } from '../../services/vaultService.ts';

/**
 * @interface WindowState
 * @description Represents the state of a single window on the desktop.
 * @property {string} id - The unique identifier for the window, matching the feature ID.
 * @property {{ x: number; y: number }} position - The x and y coordinates of the window.
 * @property {{ width: number; height: number }} size - The width and height of the window.
 * @property {number} zIndex - The z-index for stacking order.
 * @property {boolean} isMinimized - Whether the window is currently minimized to the taskbar.
 * @property {'normal' | 'maximized'} displayState - The display state of the window.
 */
interface WindowState {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  displayState: 'normal' | 'maximized';
}

/**
 * @interface DesktopViewProps
 * @description Props for the DesktopView component.
 * @property {string} [openFeatureId] - If provided, the feature with this ID will be opened automatically.
 */
interface DesktopViewProps {
  openFeatureId?: string;
}

const Z_INDEX_BASE = 10;

/**
 * The main desktop view component that acts as a window manager.
 * On mount, it checks if the credential vault is initialized and prompts the user to unlock it if necessary.
 * @param {DesktopViewProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered desktop view.
 * @example
 * <DesktopView openFeatureId="ai-code-explainer" />
 */
export const DesktopView: React.FC<DesktopViewProps> = ({ openFeatureId }) => {
    const [windows, setWindows] = useState<Record<string, WindowState>>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(Z_INDEX_BASE);
    const { state, dispatch } = useGlobalState();
    const { requestUnlock } = useVaultModal();

    // Check vault initialization status on component mount.
    useEffect(() => {
        const checkInitialization = async () => {
            try {
                const initialized = await isVaultInitialized();
                dispatch({ type: 'SET_VAULT_STATE', payload: { isInitialized: initialized } });
            } catch (error) {
                console.error("Failed to check vault initialization status:", error);
            }
        };
        checkInitialization();
    }, [dispatch]);

    // Prompt to unlock the vault if it's initialized but locked.
    useEffect(() => {
        const promptToUnlock = async () => {
            if (state.vaultState.isInitialized && !state.vaultState.isUnlocked) {
                await requestUnlock();
            }
        };
        promptToUnlock();
    }, [state.vaultState.isInitialized, state.vaultState.isUnlocked, requestUnlock]);
    
    const openWindow = useCallback((featureId: string) => {
        const newZIndex = nextZIndex + 1;
        setNextZIndex(newZIndex);
        setActiveId(featureId);

        setWindows((prev) => {
            const existingWindow = prev[featureId];
            if (existingWindow) {
                return {
                    ...prev,
                    [featureId]: {
                        ...existingWindow,
                        isMinimized: false,
                        zIndex: newZIndex,
                    }
                };
            }

            const openWindowsCount = Object.values(prev).filter((w: WindowState) => !w.isMinimized).length;
            const newWindow: WindowState = {
                id: featureId,
                position: { x: 50 + openWindowsCount * 30, y: 50 + openWindowsCount * 30 },
                size: { width: 800, height: 600 },
                zIndex: newZIndex,
                isMinimized: false,
                displayState: 'normal',
            };
            return { ...prev, [featureId]: newWindow };
        });
    }, [nextZIndex]);
    
    useEffect(() => {
        if(openFeatureId) {
            openWindow(openFeatureId);
        }
    }, [openFeatureId, openWindow])

    const closeWindow = (id: string) => {
        setWindows(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
    };

    const minimizeWindow = (id: string) => {
        setWindows(prev => ({
            ...prev,
            [id]: { ...prev[id], isMinimized: true }
        }));
        setActiveId(null);
    };

    const focusWindow = (id: string) => {
        if (id === activeId) return;
        const newZIndex = nextZIndex + 1;
        setNextZIndex(newZIndex);
        setActiveId(id);
        setWindows(prev => ({
            ...prev,
            [id]: { ...prev[id], zIndex: newZIndex }
        }));
    };
    
    const updateWindowState = (id: string, updates: Partial<WindowState>) => {
        setWindows(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));
    }

    const windowIds = Object.keys(windows);
    const openWindows = windowIds.map(id => windows[id]).filter(w => !w.isMinimized);
    const minimizedWindows = windowIds.map(id => windows[id]).filter(w => w.isMinimized);
    const featuresMap = new Map(ALL_FEATURES.map(f => [f.id, f]));

    return (
        <div className="h-full flex flex-col bg-transparent">
            <FeatureDock onOpen={openWindow} />
            <div className="flex-grow relative overflow-hidden">
                {openWindows.map(win => {
                    const feature = featuresMap.get(win.id);
                    if (!feature) return null;
                    const windowStateForComponent: WindowComponentState = {
                        ...win,
                        isActive: win.id === activeId,
                    };
                    return (
                        <Window
                            key={win.id}
                            feature={feature}
                            state={windowStateForComponent}
                            onClose={() => closeWindow(win.id)}
                            onMinimize={() => minimizeWindow(win.id)}
                            onFocus={() => focusWindow(win.id)}
                            onUpdate={updateWindowState}
                            onMaximize={(id) => updateWindowState(id, { displayState: 'maximized' })}
                            onRestore={(id) => updateWindowState(id, { displayState: 'normal' })}
                        />
                    );
                })}
            </div>
            <Taskbar
                minimizedWindows={minimizedWindows.map(w => featuresMap.get(w.id)).filter((f): f is Feature => !!f)}
                onRestore={openWindow}
            />
        </div>
    );
};