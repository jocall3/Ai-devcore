import React, { useState, useCallback, useEffect } from 'react';
import { FeatureDock } from './FeatureDock.tsx';
import { Window } from './Window.tsx';
import { Taskbar } from './Taskbar.tsx';
import { ALL_FEATURES } from '../features/index.ts';
import type { Feature } from '../../types.ts';

interface WindowState {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
}

const Z_INDEX_BASE = 10;

export const DesktopView: React.FC<{ openFeatureId?: string }> = ({ openFeatureId }) => {
    const [windows, setWindows] = useState<Record<string, WindowState>>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(Z_INDEX_BASE);
    
    const openWindow = useCallback((featureId: string) => {
        const newZIndex = nextZIndex + 1;
        setNextZIndex(newZIndex);
        setActiveId(featureId);

        setWindows(prev => {
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

            const openWindowsCount = Object.values(prev).filter(w => !w.isMinimized).length;
            const newWindow: WindowState = {
                id: featureId,
                position: { x: 50 + openWindowsCount * 30, y: 50 + openWindowsCount * 30 },
                size: { width: 800, height: 600 },
                zIndex: newZIndex,
                isMinimized: false,
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

    const openWindows = Object.values(windows).filter(w => !w.isMinimized);
    const minimizedWindows = Object.values(windows).filter(w => w.isMinimized);
    const featuresMap = new Map(ALL_FEATURES.map(f => [f.id, f]));

    return (
        <div className="h-full flex flex-col bg-transparent">
            <FeatureDock onOpen={openWindow} />
            <div className="flex-grow relative overflow-hidden">
                {openWindows.map(win => {
                    const feature = featuresMap.get(win.id);
                    if (!feature) return null;
                    return (
                        <Window
                            key={win.id}
                            feature={feature}
                            state={win}
                            isActive={win.id === activeId}
                            onClose={() => closeWindow(win.id)}
                            onMinimize={() => minimizeWindow(win.id)}
                            onFocus={() => focusWindow(win.id)}
                            onUpdate={updateWindowState}
                        />
                    );
                })}
            </div>
            <Taskbar
                minimizedWindows={minimizedWindows.map(w => featuresMap.get(w.id)).filter(Boolean) as Feature[]}
                onRestore={openWindow}
            />
        </div>
    );
};
