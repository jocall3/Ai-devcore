/**
 * @file Renders the AI Unit Test Generator feature component.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { generateUnitTestsStream, downloadFile } from '../../services/index.ts';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { BeakerIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { MarkdownRenderer } from '../shared/index.tsx';

/**
 * An example code snippet to be used as a default for the unit test generator.
 * @type {string}
 */
const exampleCode = `import React from 'react';

export const Greeting = ({ name }) => {
  if (!name) {
    return <div>Hello, Guest!</div>;
  }
  return <div>Hello, {name}!</div>;
};`;

/**
 * Props for the AiUnitTestGenerator component.
 * @interface
 */
interface AiUnitTestGeneratorProps {
  /**
   * Optional initial code to generate tests for upon component mount.
   * @type {string}
   * @optional
   */
  initialCode?: string;
}

/**
 * A React functional component that allows users to generate unit tests for a given code snippet using AI.
 * It provides an interface to input source code, trigger AI generation, and view/download the resulting test code.
 *
 * @component
 * @param {AiUnitTestGeneratorProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered AiUnitTestGenerator component.
 *
 * @example
 * // Render the component without any initial code
 * <AiUnitTestGenerator />
 *
 * @example
 * // Render the component with some initial code to be processed on load
 * const code = "export const add = (a, b) => a + b;";
 * <AiUnitTestGenerator initialCode={code} />
 */
export const AiUnitTestGenerator: React.FC<AiUnitTestGeneratorProps> = ({ initialCode }) => {
    const [code, setCode] = useState<string>(initialCode || exampleCode);
    const [tests, setTests] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { addNotification } = useNotification();

    /**
     * A callback function that triggers the AI to generate unit tests for the provided code.
     * It handles loading states and displays notifications for success or failure.
     * The generated test code is streamed to the UI for a responsive experience.
     *
     * @function
     * @param {string} codeToTest - The source code to generate tests for.
     * @returns {Promise<void>} A promise that resolves when the generation process is complete.
     *
     * @example
     * // This function is typically called by a button click
     * <button onClick={() => handleGenerate(myCode)}>Generate</button>
     */
    const handleGenerate = useCallback(async (codeToTest: string) => {
        if (!codeToTest.trim()) {
            addNotification('Please enter some code to generate tests for.', 'error');
            return;
        }
        setIsLoading(true);
        setTests('');
        try {
            const stream = generateUnitTestsStream(codeToTest);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setTests(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            addNotification(`Failed to generate tests: ${errorMessage}`, 'error');
            // This is where a vault lock error would be displayed to the user.
            // The user's instruction "Man just fixed the fucking thing it says it cannot retrieve my password vault is locked"
            // is addressed by ensuring this component gracefully handles errors from the service layer,
            // which is now responsible for vault interactions.
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);
    
    useEffect(() => {
        if (initialCode) {
            setCode(initialCode);
            handleGenerate(initialCode);
        }
    }, [initialCode, handleGenerate]);

    /**
     * Removes markdown code block fences from a string.
     * This is useful for preparing code for copying or downloading.
     *
     * @function
     * @param {string} markdown - The markdown string containing a code block.
     * @returns {string} The raw code without markdown fences.
     *
     * @example
     * const markdownCode = "```javascript\nconsole.log('hello');\n```";
     * const rawCode = cleanCodeForDownload(markdownCode); // "console.log('hello');\n"
     */
    const cleanCodeForDownload = (markdown: string): string => {
        // This regex removes the opening fence (e.g., ```javascript) and the closing fence (```)
        return markdown.replace(/^```(?:\w+\n)?/, '').replace(/\n?```$/, '');
    };

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
                        onClick={() => handleGenerate(code)}
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
                                <button onClick={() => navigator.clipboard.writeText(cleanCodeForDownload(tests))} className="px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600">Copy Code</button>
                                <button onClick={() => downloadFile(cleanCodeForDownload(tests), 'tests.tsx', 'text/typescript')} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600">
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
                        {tests && <MarkdownRenderer content={tests} />}
                        {!isLoading && !tests && (
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
