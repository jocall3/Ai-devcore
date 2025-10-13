import React from 'react';
import { CommandLineIcon } from '../icons.tsx';

export const CommandPaletteTrigger: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-text-secondary">
            <div className="text-6xl mb-4 text-primary" aria-hidden="true">
                <CommandLineIcon />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
                Command Palette
            </h1>
            <p className="text-lg mb-4 max-w-md">
                The Command Palette provides quick keyboard access to all features and commands.
            </p>
            <div className="bg-surface text-primary border border-border rounded-lg px-6 py-4 animate-pulse shadow-sm">
                <p className="font-semibold text-text-primary">Press <kbd className="mx-1 font-sans px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Ctrl</kbd> + <kbd className="mx-1 font-sans px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">K</kbd> to open.</p>
            </div>
        </div>
    );
};