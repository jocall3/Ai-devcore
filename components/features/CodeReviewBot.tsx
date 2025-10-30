import React, { useState, useCallback } from 'react';
import { reviewCodeStream } from '../../services/index.ts';
import { useAiPersonalities } from '../../hooks/useAiPersonalities.ts';
import { formatSystemPromptToString } from '../../utils/promptUtils.ts';
import { CpuChipIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { MarkdownRenderer } from '../shared/index.tsx';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';

const exampleCode = `function UserList(users) {
  if (users.length = 0) {
    return "no users";
  } else {
    return (
      users.map(u => {
        return <li>{u.name}</li>
      })
    )
  }
}`;

export const CodeReviewBot: React.FC = () => {
    const [code, setCode] = useState<string>(exampleCode);
    const [review, setReview] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [personalities] = useAiPersonalities();
    const [selectedPersonalityId, setSelectedPersonalityId] = useState<string>('default');

    const { state } = useGlobalState();
    const { vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();
    const { addNotification } = useNotification();

    const handleGenerate = useCallback(async () => {
        if (!code.trim()) {
            setError('Please enter some code to review.');
            return;
        }
        setIsLoading(true);
        setError('');
        setReview('');

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

            let systemInstruction: string | undefined = "You are a senior software engineer performing a code review. You are meticulous, helpful, and provide constructive feedback.";
            if (selectedPersonalityId !== 'default') {
                const personality = personalities.find(p => p.id === selectedPersonalityId);
                if (personality) {
                    systemInstruction = formatSystemPromptToString(personality);
                }
            }

            const stream = reviewCodeStream(code, systemInstruction);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setReview(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to get review: ${errorMessage}`);
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [code, selectedPersonalityId, personalities, vaultState, requestCreation, requestUnlock, addNotification]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <CpuChipIcon />
                    <span className="ml-3">AI Code Review Bot</span>
                </h1>
                <p className="text-text-secondary mt-1">Get an automated code review from Gemini.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="code-input" className="text-sm font-medium text-text-secondary mb-2">Code to Review</label>
                    <textarea
                        id="code-input"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Paste your code here..."
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm"
                    />
                </div>
                 <div className="flex-shrink-0 flex items-center justify-center gap-4">
                     <div className="w-full max-w-xs">
                        <label htmlFor="personality-select" className="text-sm font-medium text-text-secondary">Reviewer Personality</label>
                        <select
                            id="personality-select"
                            value={selectedPersonalityId}
                            onChange={e => setSelectedPersonalityId(e.target.value)}
                            className="w-full mt-1 p-2 bg-surface border border-border rounded-md text-sm"
                        >
                            <option value="default">Default</option>
                            {personalities.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                     </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="btn-primary self-end h-[42px] w-full max-w-xs flex items-center justify-center px-6 py-3"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Request Review'}
                    </button>
                </div>
                <div className="flex flex-col flex-1 min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">AI Feedback</label>
                    <div className="flex-grow p-4 bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && !review && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="text-red-500">{error}</p>}
                        {review && <MarkdownRenderer content={review} />}
                         {!isLoading && !review && !error && <div className="text-text-secondary h-full flex items-center justify-center">Review will appear here.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
