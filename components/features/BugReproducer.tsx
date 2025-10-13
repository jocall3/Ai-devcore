import React, { useState, useCallback } from 'react';
import { generateBugReproductionTestStream } from '../../services/aiService.ts';
import { BugAntIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

const exampleStackTrace = `TypeError: Cannot read properties of undefined (reading 'name')
    at UserProfile (UserProfile.jsx:5:21)
    at renderWithHooks (react-dom.development.js:14985:18)
    at mountIndeterminateComponent (react-dom.development.js:17811:13)
    at beginWork (react-dom.development.js:19049:16)`;

export const BugReproducer: React.FC = () => {
    const [stackTrace, setStackTrace] = useState(exampleStackTrace);
    const [context, setContext] = useState('// The UserProfile component code:\nconst UserProfile = ({ user }) => <div>{user.name}</div>;');
    const [generatedTest, setGeneratedTest] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = useCallback(async () => {
        if (!stackTrace.trim()) {
            setError('Please provide a stack trace.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedTest('');
        try {
            const stream = generateBugReproductionTestStream(stackTrace, context);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setGeneratedTest(fullResponse);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [stackTrace, context]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <BugAntIcon />
                    <span className="ml-3">Automated Bug Reproducer</span>
                </h1>
                <p className="text-text-secondary mt-1">Paste a stack trace to automatically generate a failing unit test.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col flex-1 min-h-0">
                        <label htmlFor="stack-trace" className="text-sm font-medium mb-2">Stack Trace</label>
                        <textarea id="stack-trace" value={stackTrace} onChange={e => setStackTrace(e.target.value)} className="flex-grow p-2 bg-surface border rounded font-mono text-xs"/>
                    </div>
                     <div className="flex flex-col flex-1 min-h-0">
                        <label htmlFor="context" className="text-sm font-medium mb-2">Relevant Code / Context (Optional)</label>
                        <textarea id="context" value={context} onChange={e => setContext(e.target.value)} className="flex-grow p-2 bg-surface border rounded font-mono text-xs"/>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading} className="btn-primary w-full py-3">{isLoading ? <LoadingSpinner/> : 'Generate Test'}</button>
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2">Generated Test File</label>
                    <div className="flex-grow p-1 bg-background border rounded overflow-auto">
                        {isLoading && !generatedTest && <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="text-red-500 p-4">{error}</p>}
                        {generatedTest && <MarkdownRenderer content={generatedTest} />}
                    </div>
                </div>
            </div>
        </div>
    );
};
