import React, { useState, useCallback } from 'react';
import { formatCodeStream } from '@/services/index.ts';
import { useGlobalState } from '@/contexts/GlobalStateContext.tsx';
import { useVaultModal } from '@/contexts/VaultModalContext.tsx';
import { useNotification } from '@/contexts/NotificationContext.tsx';
import { CodeBracketSquareIcon } from '@/components/icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '@/components/shared/index.tsx';

const exampleCode = `const MyComponent = (props) => {
  const {name, items}=props
    if(!items || items.length === 0){
  return <p>No items found for {name}</p>;
    }
  return <ul>{items.map(item=> <li key={item.id}>{item.name}</li>)}</ul>
}`;

export const CodeFormatter: React.FC = () => {
    const [inputCode, setInputCode] = useState<string>(exampleCode);
    const [formattedCode, setFormattedCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const { state } = useGlobalState();
    const { vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();
    const { addNotification } = useNotification();

    const handleFormat = useCallback(async () => {
        if (!inputCode.trim()) {
            setError('Please enter some code to format.');
            return;
        }
        setIsLoading(true);
        setError('');
        setFormattedCode('');
        
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

            const stream = formatCodeStream(inputCode);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setFormattedCode(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to format code: ${errorMessage}`);
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [inputCode, vaultState, requestCreation, requestUnlock, addNotification]);
    
    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <CodeBracketSquareIcon />
                    <span className="ml-3">AI Code Formatter</span>
                </h1>
                <p className="text-text-secondary mt-1">Clean up your code with AI-powered formatting, like a smart Prettier.</p>
            </header>
            <div className="flex-grow flex flex-col min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow min-h-0">
                    <div className="flex flex-col h-full">
                        <label htmlFor="code-input" className="text-sm font-medium text-text-secondary mb-2">Input</label>
                        <textarea
                            id="code-input"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            placeholder="Paste your unformatted code here..."
                            className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm"
                        />
                    </div>
                    <div className="flex flex-col h-full">
                        <label className="text-sm font-medium text-text-secondary mb-2">Output</label>
                        <div className="flex-grow p-1 bg-background border border-border rounded-md overflow-y-auto">
                           {isLoading && !formattedCode && (
                                <div className="flex items-center justify-center h-full">
                                    <LoadingSpinner />
                                </div>
                            )}
                            {error && <p className="p-4 text-red-500">{error}</p>}
                            {formattedCode && <MarkdownRenderer content={formattedCode} />}
                            {!isLoading && !formattedCode && !error && (
                                <div className="text-text-secondary h-full flex items-center justify-center">
                                    Formatted code will appear here.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                 <button
                    onClick={handleFormat}
                    disabled={isLoading}
                    className="btn-primary mt-4 w-full max-w-sm mx-auto flex items-center justify-center px-6 py-3"
                >
                    {isLoading ? <LoadingSpinner /> : 'Format Code'}
                </button>
            </div>
        </div>
    );
};
