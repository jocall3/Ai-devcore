import React, { useState, useMemo } from 'react';
import { ALL_FEATURES } from './features/index.ts';
import type { Feature } from '../types.ts';

const FeatureItem: React.FC<{ feature: Feature; onSelect: () => void; }> = ({ feature, onSelect }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', feature.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            onClick={onSelect}
            draggable="true"
            onDragStart={handleDragStart}
            className="p-3 rounded-md bg-slate-800/80 border border-slate-700/50 flex items-start space-x-3 cursor-pointer hover:bg-slate-700/70 transition-colors"
        >
            <div className="text-cyan-400 mt-1 flex-shrink-0">{feature.icon}</div>
            <div>
                <h4 className="font-bold text-sm text-slate-200">{feature.name}</h4>
                <p className="text-xs text-slate-500">{feature.category}</p>
            </div>
        </div>
    );
};

export const FeaturePalette: React.FC<{ onFeatureSelect: (id: string) => void }> = ({ onFeatureSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFeatures = useMemo(() => {
        if (!searchTerm) return ALL_FEATURES;
        return ALL_FEATURES.filter(
            (feature) =>
                feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                feature.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    return (
        <aside className="w-80 h-full bg-slate-900/70 backdrop-blur-sm border-l border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800">
                 <h3 className="font-bold text-lg text-slate-200 mb-3">Feature Palette</h3>
                <input
                    type="text"
                    placeholder="Search features..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-shadow"
                />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredFeatures.map(feature => (
                    <FeatureItem key={feature.id} feature={feature} onSelect={() => onFeatureSelect(feature.id)} />
                ))}
            </div>
        </aside>
    );
};