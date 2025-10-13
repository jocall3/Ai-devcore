import React, { useState, useCallback, useEffect } from 'react';
import { BugAntIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { analyzeConcurrencyStream } from '../../services/index.ts';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';
import { downloadFile } from '../../services/fileUtils.ts';

const exampleCode = `// main.js
const worker = new Worker('worker.js');

// This object is sent back and forth.
// A race condition can occur because both threads
// read the counter, increment it, and send it back.
// The final value depends on which thread's message
// is processed last.
const data = { counter: 0 };

worker.onmessage = function(e) {
  // Main thread reads and updates
  data.counter = e.data.counter;
  console.log('Main received:', data.counter);
  data.counter++;
  worker.postMessage(data);
};

// Start the process
console.log('Main starting with:', data.counter);
data.counter++;
worker.postMessage(data);


// worker.js
// onmessage = function(e) {
//   // Worker reads and updates
//   let receivedCounter = e.data.counter;
//   console.log('Worker received:', receivedCounter);
//   receivedCounter++;
//   postMessage({ counter: receivedCounter });
// }
`;

export const WorkerThreadDebugger: React.FC<{ codeInput?: string }> = ({ codeInput: initialCode }) => {
    const [codeInput, setCodeInput] = useState(initialCode || exampleCode);
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = useCallback(async (codeToAnalyze: string) => {
        if (!codeToAnalyze.trim()) {
            setError('Please paste some code to analyze.');
            return;
        }
        setIsLoading(true);
        setError('');
        setAnalysis('');
        try {
            const stream = analyzeConcurrencyStream(codeToAnalyze);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setAnalysis(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to analyze code: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (initialCode) {
            setCodeInput(initialCode);
            handleAnalyze(initialCode);
        }
    }, [initialCode, handleAnalyze]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <BugAntIcon />
                    <span className="ml-3">AI Concurrency Analyzer</span>
                </h1>
                <p className="text-text-secondary mt-1">Analyze JavaScript code for potential Web Worker concurrency issues.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="code-input" className="text-sm font-medium text-text-secondary mb-2">JavaScript Code</label>
                    <textarea
                        id="code-input"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        placeholder="Paste your worker-related JS code here..."
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm"
                    />
                </div>
                 <div className="flex-shrink-0">
                    <button
                        onClick={() => handleAnalyze(codeInput)}
                        disabled={isLoading}
                        className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center px-6 py-3"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Analyze Code'}
                    </button>
                </div>
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-text-secondary">AI Analysis</label>
                        {analysis && !isLoading && (
                             <button onClick={() => downloadFile(analysis, 'analysis.md', 'text/markdown')} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200">
                                <ArrowDownTrayIcon className="w-4 h-4"/> Download
                            </button>
                        )}
                    </div>
                    <div className="flex-grow p-4 bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="text-red-500">{error}</p>}
                        {analysis && !isLoading && <MarkdownRenderer content={analysis} />}
                        {!isLoading && !analysis && !error && <div className="text-text-secondary h-full flex items-center justify-center">Analysis will appear here.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};