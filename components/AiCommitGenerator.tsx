/**
 * @file Renders the AI Commit Message Generator feature.
 * @summary A tool to generate conventional commit messages from git diffs using AI, with integrated vault support for secure API key handling.
 * @version 2.0.0
 * @author Elite AI Implementation Team
 */

import React, { useState, useCallback, useEffect } from 'react';
// FIX: Replaced non-existent 'generateCommitMessageStream' with the generic 'streamContent' function.
import { streamContent } from '../services/index.ts';
import { useGlobalState } from '../contexts/GlobalStateContext.tsx';
import { useVaultModal } from '../contexts/VaultModalContext.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { GitBranchIcon, ClipboardDocumentIcon } from './icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from './shared/index.tsx';

/**
 * An example git diff provided to the user.
 * @const
 * @type {string}
 */
const exampleDiff = `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 1b2c3d4..5e6f7g8 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1,7 +1,7 @@
 import React from 'react';
 
 interface ButtonProps {
-  text: string;
+  label: string;
   onClick: () => void;
 }
`;

/**
 * Props for the AiCommitGenerator component.
 * @interface
 */
interface AiCommitGeneratorProps {
    /**
     * An optional initial git diff to populate the text area.
     * @type {string}
     * @example
     * <AiCommitGenerator diff="diff --git a/file.js b/file.js..." />
     */
    diff?: string;
}

/**
 * A feature component that generates conventional commit messages from git diffs.
 * It securely handles API keys by integrating with the application's vault system,
 * prompting the user to unlock it if necessary.
 *
 * @param {AiCommitGeneratorProps} props The component props.
 * @returns {React.ReactElement} The rendered AI Commit Generator component.
 * @example
 * <AiCommitGenerator diff={someDiffString} />
 */
export const AiCommitGenerator: React.FC<AiCommitGeneratorProps> = ({ diff: initialDiff }) => {
    const [diff, setDiff] = useState<string>(initialDiff || exampleDiff);
    const [message, setMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const { state } = useGlobalState();
    const { vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();
    const { addNotification } = useNotification();

    /**
     * Handles the logic for generating a commit message.
     * It ensures the vault is initialized and unlocked before calling the AI service.
     * @function
     * @param {string} diffToAnalyze The git diff to be analyzed.
     * @returns {Promise<void>}
     */
    const handleGenerate = useCallback(async (diffToAnalyze: string) => {
        if (!diffToAnalyze.trim()) {
            setError('Please paste a diff to generate a message.');
            return;
        }
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            if (!vaultState.isInitialized) {
                const created = await requestCreation();
                if (!created) {
                    addNotification('Vault setup is required to use AI features.', 'error');
                    setIsLoading(false);
                    return;
                }
            }
            if (!vaultState.isUnlocked) {
                const unlocked = await requestUnlock();
                if (!unlocked) {
                    addNotification('Vault must be unlocked to use AI features.', 'info');
                    setIsLoading(false);
                    return;
                }
            }

            // FIX: Use the existing streamContent function with a specific prompt
            const prompt = `Generate a conventional commit message for the following diff:\n\n\`\`\`diff\n${diffToAnalyze}\n\`\`\``;
            const systemInstruction = 'You are a commit message generator. Respond with only the commit message in the conventional commit format. Do not include any extra text, markdown formatting, or explanations.';
            const stream = streamContent(prompt, systemInstruction);

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setMessage(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate message: ${errorMessage}`);
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [vaultState, requestCreation, requestUnlock, addNotification]);

    useEffect(() => {
        if (initialDiff) {
            setDiff(initialDiff);
            handleGenerate(initialDiff);
        }
    }, [initialDiff, handleGenerate]);

    /**
     * Copies the generated commit message to the clipboard.
     * @function
     */
    const handleCopy = () => {
        navigator.clipboard.writeText(message);
        addNotification('Commit message copied to clipboard!', 'success');
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <GitBranchIcon />
                    <span className="ml-3">AI Commit Message Generator</span>
                </h1>
                <p className="text-text-secondary mt-1">Paste your diff and let Gemini craft the perfect commit message.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="flex flex-col h-full">
                    <label htmlFor="diff-input" className="text-sm font-medium text-text-secondary mb-2">Git Diff</label>
                    <textarea
                        id="diff-input"
                        value={diff}
                        onChange={(e) => setDiff(e.target.value)}
                        placeholder="Paste your git diff here..."
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                        onClick={() => handleGenerate(diff)}
                        disabled={isLoading}
                        className="btn-primary mt-4 w-full flex items-center justify-center px-6 py-3"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Generate Commit Message'}
                    </button>
                </div>
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-text-secondary">Generated Message</label>
                        {message && !isLoading && (
                            <button onClick={handleCopy} className="p-2 text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md" title="Copy Message">
                                <ClipboardDocumentIcon />
                            </button>
                        )}
                    </div>
                    <div className="relative flex-grow bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && (
                            <div className="flex items-center justify-center h-full">
                                <LoadingSpinner />
                            </div>
                        )}
                        {error && <p className="p-4 text-red-500">{error}</p>}
                        {message && !isLoading && (
                           <div className="p-4">
                                <MarkdownRenderer content={message} />
                           </div>
                        )}
                        {!isLoading && !message && !error && (
                            <div className="text-text-secondary h-full flex items-center justify-center">
                                The commit message will appear here.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};