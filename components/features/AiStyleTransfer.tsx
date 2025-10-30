import React, { useState, useCallback } from 'react';
import { transferCodeStyleStream } from '../../services/index.ts';
import { SparklesIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { MarkdownRenderer } from '../shared/index.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';

const exampleCode = `function my_func(x,y){return x+y;}`;
const exampleStyleGuide = `- Use camelCase for function names.
- Add a space after commas in argument lists.
- Use semicolons at the end of statements.`;

export const AiStyleTransfer: React.FC = () => {
    const [inputCode, setInputCode] = useState<string>(exampleCode);
    const [styleGuide, setStyleGuide] = useState<string>(exampleStyleGuide);
    const [outputCode, setOutputCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const { requestUnlock } = useVaultModal();
    const { addNotification } = useNotification();

    const handleGenerate = useCallback(async (isRetry: boolean = false) => {
        if (!inputCode.trim() || !styleGuide.trim()) {
            setError('Please provide both code and a style guide.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        if (!isRetry) {
            setOutputCode('');
        }

        try {
            const stream = transferCodeStyleStream({ code: inputCode, styleGuide });
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setOutputCode(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            if (errorMessage.includes('Vault is locked') || errorMessage.includes('API key not found')) {
                addNotification('Vault is locked. Please unlock to proceed.', 'info');
                const unlocked = await requestUnlock();
                if (unlocked) {
                    handleGenerate(true); // Retry the operation
                    return; // Exit to avoid setting loading to false prematurely
                }
            } else {
                 setError(`Failed to transfer style: ${errorMessage}`);
                addNotification(errorMessage, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [inputCode, styleGuide, addNotification, requestUnlock]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <SparklesIcon />
                    <span className="ml-3">AI Code Style Transfer</span>
                </h1>
                <p className="text-text-secondary mt-1">Rewrite code to match a specific style guide using AI.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="input-code" className="text-sm font-medium text-text-secondary mb-2">Original Code</label>
                    <textarea
                        id="input-code"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-y font-mono text-sm"
                    />
                </div>
                 <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="style-guide" className="text-sm font-medium text-text-secondary mb-2">Style Guide</label>
                    <textarea
                        id="style-guide"
                        value={styleGuide}
                        onChange={(e) => setStyleGuide(e.target.value)}
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-y font-mono text-sm"
                    />
                </div>
                 <div className="flex-shrink-0">
                    <button
                        onClick={() => handleGenerate()}
                        disabled={isLoading}
                        className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center px-6 py-3"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Rewrite Code'}
                    </button>
                </div>
                <div className="flex flex-col flex-1 min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">Rewritten Code</label>
                    <div className="flex-grow p-1 bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && !outputCode && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="p-4 text-red-500">{error}</p>}
                        {outputCode && <MarkdownRenderer content={outputCode} />}
                         {!isLoading && !outputCode && !error && <div className="text-text-secondary h-full flex items-center justify-center">Rewritten code will appear here.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};