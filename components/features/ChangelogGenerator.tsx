import React, { useState, useCallback } from 'react';
import { generateChangelogFromLogStream } from '../../services/aiService.ts';
import { GitBranchIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { MarkdownRenderer } from '../shared/index.tsx';

const exampleLog = `commit 3a4b5c...
Author: Dev One <dev.one@example.com>
Date:   Mon Jul 15 11:30:00 2024 -0400

    feat: add user login page

commit 1a2b3c...
Author: Dev Two <dev.two@example.com>
Date:   Mon Jul 15 10:00:00 2024 -0400

    fix: correct typo in header
`;

export const ChangelogGenerator: React.FC = () => {
    const [log, setLog] = useState(exampleLog);
    const [changelog, setChangelog] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = useCallback(async () => {
        if (!log.trim()) {
            setError('Please paste your git log output.');
            return;
        }
        setIsLoading(true);
        setError('');
        setChangelog('');
        try {
            const stream = generateChangelogFromLogStream(log);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setChangelog(fullResponse);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [log]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <GitBranchIcon />
                    <span className="ml-3">AI Changelog Generator</span>
                </h1>
                <p className="text-text-secondary mt-1">Generate a markdown changelog from your raw git log.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="commit-input" className="text-sm font-medium text-text-secondary mb-2">Raw Git Log</label>
                    <textarea
                        id="commit-input"
                        value={log}
                        onChange={(e) => setLog(e.target.value)}
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm"
                    />
                </div>
                <div className="flex-shrink-0">
                    <button onClick={handleGenerate} disabled={isLoading} className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center px-6 py-3">
                        {isLoading ? <LoadingSpinner /> : 'Generate Changelog'}
                    </button>
                </div>
                <div className="flex flex-col flex-1 min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">Generated Changelog.md</label>
                    <div className="relative flex-grow p-4 bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && !changelog && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="text-red-500">{error}</p>}
                        {changelog && <MarkdownRenderer content={changelog} />}
                        {!isLoading && changelog && <button onClick={() => navigator.clipboard.writeText(changelog)} className="absolute top-2 right-2 px-2 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200">Copy</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};