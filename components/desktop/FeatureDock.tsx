import React from 'react';
import { ALL_FEATURES } from '../features/index.ts';
import type { Feature } from '../../types.ts';

interface FeatureButtonProps {
    feature: Feature;
    onOpen: (id: string) => void;
}

const FeatureButton: React.FC<FeatureButtonProps> = ({ feature, onOpen }) => {
    return (
        <button
            onClick={() => onOpen(feature.id)}
            className="w-24 h-24 flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/80 transition-colors group"
            title={feature.name}
        >
            <div className="text-cyan-400 group-hover:scale-110 transition-transform">{feature.icon}</div>
            <span className="text-xs text-slate-300 mt-2 text-center w-full break-words">{feature.name}</span>
        </button>
    );
};

interface FeatureDockProps {
    onOpen: (id: string) => void;
}

export const FeatureDock: React.FC<FeatureDockProps> = ({ onOpen }) => {
    return (
        <div className="h-96 flex-shrink-0 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 p-3 overflow-y-auto">
            <div className="flex flex-wrap gap-3 justify-center">
                {ALL_FEATURES.map(feature => (
                    <FeatureButton key={feature.id} feature={feature} onOpen={onOpen} />
                ))}
            </div>
        </div>
    );
};
