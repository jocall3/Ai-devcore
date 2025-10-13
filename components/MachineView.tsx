



import React, { useState, useCallback } from 'react';
import type { Feature } from '../types.ts';
import { SLOTS, type SlotCategory } from '../constants.tsx';
import { FEATURES_MAP } from './features/index.ts';

interface InstalledFeatures {
    [key: string]: Feature | null;
}

const MachineSVG: React.FC = () => (
    <svg viewBox="0 0 300 200" className="w-full h-full">
        <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style={{ stopColor: 'rgba(56, 189, 248, 0.4)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgba(56, 189, 248, 0)', stopOpacity: 1 }} />
            </radialGradient>
        </defs>
        <rect x="50" y="30" width="200" height="140" rx="10" fill="#1e293b" stroke="#334155" strokeWidth="2" />
        <circle cx="150" cy="100" r="40" fill="#0f172a" />
        <circle cx="150" cy="100" r="50" fill="url(#glow)" />
        <path d="M150 70 L150 130 M120 100 L180 100" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
        <line x1="60" y1="50" x2="60" y2="150" stroke="#334155" strokeWidth="4" />
        <line x1="240" y1="50" x2="240" y2="150" stroke="#334155" strokeWidth="4" />
    </svg>
);

const DropZone: React.FC<{
    category: SlotCategory;
    feature: Feature | null;
    onDrop: (category: SlotCategory, feature: Feature) => void;
    onClear: (category: SlotCategory) => void;
}> = ({ category, feature, onDrop, onClear }) => {
    const [isOver, setIsOver] = useState(false);
    const [isInvalidDrop, setIsInvalidDrop] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);
        try {
            const featureId = e.dataTransfer.getData('text/plain');
            const featureData = FEATURES_MAP.get(featureId);
            if (featureData) {
                if (featureData.category === category || category === 'Core') { // Allow any category in Core for flexibility
                    onDrop(category, featureData);
                } else {
                    console.warn(`Feature category "${featureData.category}" does not match slot "${category}"`);
                    setIsInvalidDrop(true);
                    setTimeout(() => setIsInvalidDrop(false), 400);
                }
            }
        } catch (error) {
            console.error("Failed to parse dropped data", error);
        }
    };

    const borderClass = isInvalidDrop
        ? 'border-red-500'
        : isOver
        ? 'border-cyan-400'
        : 'border-slate-700';
    
    const animationClass = isInvalidDrop ? 'animate-shake' : '';


    return (
        <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative p-4 rounded-lg border-2 border-dashed transition-colors duration-200 ${borderClass} ${isOver ? 'bg-slate-700/50' : 'bg-slate-800/50'} ${animationClass}`}
        >
            <h3 className="text-lg font-bold text-slate-300 mb-2">{category} Slot</h3>
            {feature ? (
                <div className="bg-slate-700 p-3 rounded-md text-left relative">
                     <button onClick={() => onClear(category)} className="absolute top-1 right-1 text-slate-500 hover:text-red-400 font-bold text-lg w-6 h-6 flex items-center justify-center">&times;</button>
                    <div className="flex items-center space-x-3">
                        <div className="text-cyan-400">{feature.icon}</div>
                        <div>
                            <p className="font-semibold text-slate-100">{feature.name}</p>
                            <p className="text-xs text-slate-400">{feature.description}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-slate-500 text-center py-6">
                    <p>Drag & Drop a feature here</p>
                </div>
            )}
        </div>
    );
};

export const MachineView: React.FC = () => {
    const [installed, setInstalled] = useState<InstalledFeatures>({});

    const handleDropFeature = useCallback((category: SlotCategory, feature: Feature) => {
        setInstalled(prev => ({ ...prev, [category]: feature }));
    }, []);
    
    const handleClearSlot = useCallback((category: SlotCategory) => {
        setInstalled(prev => ({ ...prev, [category]: null }));
    }, []);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-slate-300">
            <header className="mb-6 text-center">
                 <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">DevCore Machine</h1>
                <p className="mt-2 text-lg text-slate-400">Drag features from the right palette to upgrade your machine.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-y-auto">
                <div className="xl:col-span-1 flex flex-col gap-4">
                    {SLOTS.slice(0, 3).map(slot => (
                        <DropZone key={slot} category={slot} feature={installed[slot] || null} onDrop={handleDropFeature} onClear={handleClearSlot} />
                    ))}
                </div>
                <div className="hidden xl:flex items-center justify-center p-8">
                    <MachineSVG />
                </div>
                <div className="xl:col-span-1 flex flex-col gap-4">
                     {SLOTS.slice(3, 6).map(slot => (
                        <DropZone key={slot} category={slot} feature={installed[slot] || null} onDrop={handleDropFeature} onClear={handleClearSlot} />
                    ))}
                </div>
            </div>
        </div>
    );
};