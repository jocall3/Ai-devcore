import React, { useState, useCallback, useEffect } from 'react';
import { generateCodingChallengeStream } from '../services/index.ts';
import { BeakerIcon } from './icons.tsx';
import { LoadingSpinner } from './shared/index.tsx';
import { MarkdownRenderer } from './shared/index.tsx';

export const AiCodingChallenge: React.FC = () => {
    const [challenge, setChallenge] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setChallenge('');
        try {
            const stream = generateCodingChallengeStream(null);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setChallenge(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate challenge: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Generate a challenge on initial load for a better user experience
        handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center">
                        <BeakerIcon />
                        <span className="ml-3">AI Coding Challenge Generator</span>
                    </h1>
                    <p className="text-text-secondary mt-1">Generate a unique coding problem to test your skills.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="btn-primary flex items-center justify-center px-6 py-3"
                >
                    {isLoading ? <LoadingSpinner /> : 'Generate New Challenge'}
                </button>
            </header>
            <div className="flex-grow p-4 bg-surface border border-border rounded-md overflow-y-auto">
                {isLoading && (
                     <div className="flex items-center justify-center h-full">
                        <LoadingSpinner />
                     </div>
                )}
                {error && <p className="text-red-500">{error}</p>}
                {challenge && !isLoading && (
                    <MarkdownRenderer content={challenge} />
                )}
                 {!isLoading && !challenge && !error && (
                    <div className="text-text-secondary h-full flex items-center justify-center">
                        Click "Generate New Challenge" to start.
                    </div>
                )}
            </div>
        </div>
    );
};