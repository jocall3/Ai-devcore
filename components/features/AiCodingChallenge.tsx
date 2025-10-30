import React, { useState, useCallback } from 'react';
import { generateCodingChallengeStream } from '@/services/index.ts';
import { useGlobalState } from '@/contexts/GlobalStateContext.tsx';
import { useVaultModal } from '@/contexts/VaultModalContext.tsx';
import { useNotification } from '@/contexts/NotificationContext.tsx';
import { BeakerIcon } from '@/components/icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '@/components/shared/index.tsx';

/**
 * @component AiCodingChallenge
 * @description A feature component that generates unique coding challenges using an AI model.
 * It provides a new problem on-demand to help users practice their coding skills.
 * The component handles streaming the AI's response and gracefully manages the vault state,
 * prompting for unlock if necessary to access the AI service.
 *
 * @example
 * return (
 *   <div style={{ height: '600px', width: '800px' }}>
 *     <AiCodingChallenge />
 *   </div>
 * )
 */
export const AiCodingChallenge: React.FC = () => {
    /**
     * @state
     * @description The markdown content of the generated coding challenge.
     * @type {string}
     */
    const [challenge, setChallenge] = useState<string>('');

    /**
     * @state
     * @description A boolean flag to indicate if a challenge is currently being generated.
     * @type {boolean}
     */
    const [isLoading, setIsLoading] = useState<boolean>(false);

    /**
     * @state
     * @description Stores any error message that occurs during challenge generation.
     * @type {string}
     */
    const [error, setError] = useState<string>('');
    
    const { state } = useGlobalState();
    const { vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();
    const { addNotification } = useNotification();

    /**
     * @function handleGenerate
     * @description Requests a new coding challenge from the AI service. It ensures the vault is unlocked
     * before making the request. It handles loading states, streaming the response, and managing errors.
     * @returns {Promise<void>} A promise that resolves when the generation is complete or has failed.
     */
    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setChallenge('');

        try {
            if (!vaultState.isInitialized) {
                const created = await requestCreation();
                if (!created) {
                    const msg = 'Vault setup is required to use AI features.';
                    addNotification(msg, 'error');
                    setError(msg);
                    setIsLoading(false);
                    return;
                }
            }
            if (!vaultState.isUnlocked) {
                const unlocked = await requestUnlock();
                if (!unlocked) {
                    const msg = 'Vault must be unlocked to use AI features.';
                    addNotification(msg, 'error');
                    setError(msg);
                    setIsLoading(false);
                    return;
                }
            }

            const stream = generateCodingChallengeStream(null);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setChallenge(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate challenge: ${errorMessage}`);
            addNotification(`Error: ${errorMessage}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [vaultState, requestCreation, requestUnlock, addNotification]);

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
                    className="btn-primary flex items-center justify-center px-6 py-3 min-w-[220px]"
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
