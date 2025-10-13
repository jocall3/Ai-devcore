import React from 'react';
import type { CustomFeature } from '../../types.ts';
import { MarkdownRenderer } from './index.tsx';

interface CustomFeatureRunnerProps {
    feature: CustomFeature;
}

/**
 * A safe component to display and review AI-generated features.
 * It renders the feature's metadata and shows the generated code in a read-only format.
 * It does NOT execute the code to prevent potential security vulnerabilities.
 */
export const CustomFeatureRunner: React.FC<CustomFeatureRunnerProps> = ({ feature }) => {
    return (
        <div className="p-4 h-full flex flex-col bg-background text-text-primary">
            <h2 className="text-xl font-bold">{feature.name}</h2>
            <p className="text-sm text-text-secondary mb-4">{feature.description}</p>
            <div className="flex-grow bg-surface border border-border rounded-md overflow-auto">
                 <MarkdownRenderer content={'```javascript\n' + feature.code + '\n```'} />
            </div>
             <p className="text-xs text-center text-text-secondary mt-2">
                This is a preview of the generated code. A full component runner is not implemented for security reasons.
            </p>
        </div>
    );
};
