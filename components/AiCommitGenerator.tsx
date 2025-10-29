import React, { useState, useCallback, useEffect } from 'react';
import { generateCommitMessageStream } from '../services/index.ts';
import { useVaultModal } from '../contexts/VaultModalContext.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { GitBranchIcon } from './icons.tsx';
import { LoadingSpinner } from './shared/index.tsx';

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

export const AiCommitGenerator: React.FC<{ diff?: string }> = ({ diff: initialDiff }) => {
    const [diff, setDiff] = useState<string>(initialDiff || exampleDiff);
    const [message, setMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const { requestUnlock } = useVaultModal();
    const { addNotification } = useNotification();

    const generate = async (diffToAnalyze: string) => {
        const stream = generateCommitMessageStream(diffToAnalyze);
        let fullResponse = '';
        for await (const chunk of stream) {
            fullResponse += chunk;
            setMessage(fullResponse);
        }
    };

    const handleGenerate = useCallback(async (diffToAnalyze: string) => {
        if (!diffToAnalyze.trim()) {
            setError('Please paste a diff to generate a message.');
            return;
        }
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            await generate(diffToAnalyze);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            
            if (errorMessage.includes('Vault is locked') || errorMessage.includes('unlock')) {
                addNotification('Your vault is locked. Please unlock it to continue.', 'info');
                const unlocked = await requestUnlock();
                if (unlocked) {
                    try {
                        // Retry generation
                        await generate(diffToAnalyze);
                    } catch (retryErr) {
                        const retryErrorMessage = retryErr instanceof Error ? retryErr.message : 'An unknown error occurred on retry.';
                        setError(`Failed to generate message: ${retryErrorMessage}`);
                    }
                } else {
                    setError('Vault unlock was cancelled.');
                }
            } else {
                setError(`Failed to generate message: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [requestUnlock, addNotification]);


    useEffect(() => {
        if (initialDiff) {
            setDiff(initialDiff);
            handleGenerate(initialDiff);
        }
    }, [initialDiff, handleGenerate]);
    
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
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
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
                    <label className="text-sm font-medium text-text-secondary mb-2">Generated Message</label>
                    <div className="relative flex-grow p-4 bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && (
                             <div className="flex items-center justify-center h-full">
                                <LoadingSpinner />
                             </div>
                        )}
                        {error && <p className="text-red-500">{error}</p>}
                        {message && !isLoading && (
                            <>
                               <button onClick={handleCopy} className="absolute top-2 right-2 px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md text-xs">Copy</button>
                               <pre className="whitespace-pre-wrap font-sans text-text-primary">{message}</pre>
                            </>
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