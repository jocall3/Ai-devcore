import React, { useState, useCallback } from 'react';
import { convertJsonToXbrlStream } from '../../services/aiService.ts';
import { XbrlConverterIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

const exampleJson = `{
  "company": "ExampleCorp",
  "year": 2024,
  "quarter": 2,
  "revenue": {
    "amount": 1500000,
    "currency": "USD"
  },
  "profit": {
    "amount": 250000,
    "currency": "USD"
  }
}`;

export const XbrlConverter: React.FC<{ jsonInput?: string }> = ({ jsonInput: initialJsonInput }) => {
    const [jsonInput, setJsonInput] = useState<string>(initialJsonInput || exampleJson);
    const [xbrlOutput, setXbrlOutput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handleConvert = useCallback(async (jsonToConvert: string) => {
        if (!jsonToConvert.trim()) {
            setError('Please enter valid JSON to convert.');
            return;
        }
        setIsLoading(true);
        setError('');
        setXbrlOutput('');
        try {
            const stream = convertJsonToXbrlStream(jsonToConvert);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setXbrlOutput(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to convert: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <XbrlConverterIcon />
                    <span className="ml-3">JSON to XBRL Converter</span>
                </h1>
                <p className="text-text-secondary mt-1">Convert JSON data into a simplified XBRL-like XML format using AI.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="json-input" className="text-sm font-medium text-text-secondary mb-2">JSON Input</label>
                    <textarea
                        id="json-input"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="Paste your JSON here..."
                        className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm"
                    />
                </div>
                 <div className="flex-shrink-0">
                    <button
                        onClick={() => handleConvert(jsonInput)}
                        disabled={isLoading}
                        className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center px-6 py-3"
                    >
                        {isLoading ? <LoadingSpinner /> : 'Convert to XBRL'}
                    </button>
                </div>
                <div className="flex flex-col flex-1 min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">XBRL-like XML Output</label>
                    <div className="relative flex-grow p-1 bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && !xbrlOutput && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="p-4 text-red-500">{error}</p>}
                        {xbrlOutput && <MarkdownRenderer content={'```xml\n' + xbrlOutput.replace(/```xml\n|```/g, '') + '\n```'} />}
                        {!isLoading && xbrlOutput && <button onClick={() => navigator.clipboard.writeText(xbrlOutput)} className="absolute top-2 right-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-xs">Copy XML</button>}
                        {!isLoading && !xbrlOutput && !error && <div className="text-text-secondary h-full flex items-center justify-center">Output will appear here.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};