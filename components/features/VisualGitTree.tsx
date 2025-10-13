import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GitBranchIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { generateChangelogFromLogStream } from '../../services/aiService.ts';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';
import { downloadFile } from '../../services/fileUtils.ts';

const exampleLog = `* commit 3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r (HEAD -> main, origin/main)
|\\  Merge: 1a2b3c4 2d3e4f5
| | Author: Dev One <dev.one@example.com>
| | Date:   Mon Jul 15 11:30:00 2024 -0400
| |
| |     feat: Implement collapsible sidebar navigation
| |
* | commit 2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u (feature/new-sidebar)
| | Author: Dev Two <dev.two@example.com>
| | Date:   Mon Jul 15 10:00:00 2024 -0400
| |
| |     feat: Add icons to sidebar items
| |
* | commit 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r
|/  Author: Dev One <dev.one@example.com>
|   Date:   Fri Jul 12 16:45:00 2024 -0400
|
|       fix: Correct user authentication bug`;

const CommitGraph = ({ logInput }: { logInput: string }) => {
    const commits = useMemo(() => {
        const lines = logInput.split('\n');
        const parsedCommits: any[] = [];
        let currentCommit: any = null;

        lines.forEach(line => {
            const commitMatch = line.match(/^.?[\\|/ ]*\* commit (\w+)(.*)/);
            if (commitMatch) {
                if (currentCommit) parsedCommits.push(currentCommit);
                currentCommit = {
                    hash: commitMatch[1],
                    shortHash: commitMatch[1].substring(0, 7),
                    refs: commitMatch[2].trim(),
                    message: '',
                    author: '',
                };
            } else if (currentCommit) {
                 if (line.includes('Author:')) currentCommit.author = line.split('Author:')[1].trim();
                 else if (line.trim().length > 0 && !line.match(/^[\\|/ ]*[\\|/ ]/)) {
                     currentCommit.message += line.trim() + ' ';
                 }
            }
        });
        if (currentCommit) parsedCommits.push(currentCommit);
        
        return parsedCommits.map((c, i) => ({ ...c, x: 50, y: 50 + i * 60 }));
    }, [logInput]);

    return (
         <svg width="100%" height={50 + commits.length * 60} className="min-h-[200px]">
            {commits.map((commit, i) => {
                const parent = commits[i + 1];
                return (
                    <g key={commit.hash}>
                        {parent && <line x1={commit.x} y1={commit.y} x2={parent.x} y2={parent.y} stroke="var(--color-border)" strokeWidth="2" />}
                        <g className="group cursor-pointer">
                            <circle cx={commit.x} cy={commit.y} r="8" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="3" />
                            <foreignObject x={commit.x + 20} y={commit.y - 25} width="350" height="50">
                                <div className="text-sm p-1">
                                    <p className="font-bold truncate text-text-primary">{commit.message}</p>
                                    <p className="text-xs text-text-secondary font-mono">{commit.shortHash} <span className="text-amber-600">{commit.refs}</span></p>
                                </div>
                            </foreignObject>
                            <title>{`Commit: ${commit.hash}\nAuthor: ${commit.author}\n\n${commit.message}`}</title>
                        </g>
                    </g>
                );
            })}
        </svg>
    );
};

export const VisualGitTree: React.FC<{ logInput?: string }> = ({ logInput: initialLogInput }) => {
    const [logInput, setLogInput] = useState(initialLogInput || exampleLog);
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = useCallback(async (logToAnalyze: string) => {
        if (!logToAnalyze.trim()) {
            setError('Please paste git log output.');
            return;
        }
        setIsLoading(true);
        setError('');
        setAnalysis('');
        try {
            const stream = generateChangelogFromLogStream(logToAnalyze);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setAnalysis(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to analyze log: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (initialLogInput) {
            setLogInput(initialLogInput);
            handleAnalyze(initialLogInput);
        }
    }, [initialLogInput, handleAnalyze]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <GitBranchIcon />
                    <span className="ml-3">Visual Git Tree</span>
                </h1>
                <p className="text-text-secondary mt-1">Paste your `git log --graph` output to visualize the history and get an AI summary.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
                <div className="flex flex-col h-full">
                    <label htmlFor="log-input" className="text-sm font-medium text-text-secondary mb-2">Git Log Output</label>
                    <textarea
                        id="log-input"
                        value={logInput}
                        onChange={(e) => setLogInput(e.target.value)}
                        placeholder="Paste your git log output here..."
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm"
                    />
                    <button
                        onClick={() => handleAnalyze(logInput)}
                        disabled={isLoading}
                        className="btn-primary mt-4 w-full flex items-center justify-center px-6 py-3"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Analyze & Summarize'}
                    </button>
                </div>
                <div className="flex flex-col h-full gap-4">
                    <div className="flex flex-col h-1/2">
                        <label className="text-sm font-medium text-text-secondary mb-2">Commit Graph</label>
                        <div className="flex-grow p-2 bg-surface border border-border rounded-md overflow-auto">
                            <CommitGraph logInput={logInput} />
                        </div>
                    </div>
                     <div className="flex flex-col h-1/2">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-text-secondary">AI Summary</label>
                            {analysis && !isLoading && (
                                <button onClick={() => downloadFile(analysis, 'summary.md', 'text/markdown')} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200">
                                    <ArrowDownTrayIcon className="w-4 h-4"/> Download Summary
                                </button>
                            )}
                        </div>
                        <div className="flex-grow p-4 bg-background border border-border rounded-md overflow-y-auto">
                            {isLoading && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                            {error && <p className="text-red-500">{error}</p>}
                            {analysis && !isLoading && <MarkdownRenderer content={analysis} />}
                            {!isLoading && !analysis && !error && <div className="text-text-secondary h-full flex items-center justify-center">AI summary will appear here.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};