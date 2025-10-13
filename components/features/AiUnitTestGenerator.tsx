import React, { useState, useCallback } from 'react';
import { generateUnitTestsStream, downloadFile } from '../../services/index.ts';
import { BeakerIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { MarkdownRenderer } from '../shared/index.tsx';

const exampleCode = `import React from 'react';

export const Greeting = ({ name }) => {
  if (!name) {
    return <div>Hello, Guest!</div>;
  }
  return <div>Hello, {name}!</div>;
};`;

export const AiUnitTestGenerator: React.FC = () => {
    const [code, setCode] = useState<string>(exampleCode);
    const [tests, setTests] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handleGenerate = useCallback(async () => {
        if (!code.trim()) {
            setError('Please enter some code to generate tests for.');
            return;
        }
        setIsLoading(true);
        setError('');
        setTests('');
        try {
            const stream = generateUnitTestsStream(code);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setTests(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate tests: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [code]);
    
    const cleanCodeForDownload = (markdown: string) => {
        return markdown.replace(/^```(?:\w+\n)?/, '').replace(/```$/, '');
    }

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <BeakerIcon />
                    <span className="ml-3">AI Unit Test Generator</span>
                </h1>
                <p className="text-text-secondary mt-1">Provide a function or component and let AI write the tests.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="code-input" className="text-sm font-medium text-text-secondary mb-2">Source Code</label>
                    <textarea
                        id="code-input"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Paste your source code here..."
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                </div>
                <div className="flex-shrink-0">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center px-6 py-3"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Generate Unit Tests'}
                    </button>
                </div>
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-text-secondary">Generated Tests</label>
                        {tests && !isLoading && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => navigator.clipboard.writeText(cleanCodeForDownload(tests))} className="px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200">Copy Code</button>
                                <button onClick={() => downloadFile(cleanCodeForDownload(tests), 'tests.tsx', 'text/typescript')} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Download
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex-grow p-1 bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && !tests && (
                            <div className="flex items-center justify-center h-full">
                                <LoadingSpinner />
                            </div>
                        )}
                        {error && <p className="p-4 text-red-500">{error}</p>}
                        {tests && <MarkdownRenderer content={tests} />}
                        {!isLoading && !tests && !error && (
                            <div className="text-text-secondary h-full flex items-center justify-center">
                                The generated tests will appear here.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};