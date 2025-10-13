import React, { useState, useCallback } from 'react';
import { detectCodeSmells } from '../../services/aiService.ts';
import type { CodeSmell } from '../../types.ts';
import { MagnifyingGlassIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';

const exampleCode = `class DataProcessor {
    process(data) {
        // Long method with multiple responsibilities
        if (data.type === 'A') {
            const results = [];
            for (let i = 0; i < data.items.length; i++) {
                // complex logic
                const item = data.items[i];
                if(item.value > 100) {
                   results.push({ ...item, status: 'processed' });
                }
            }
            return results;
        } else {
            // Duplicated logic
            const results = [];
            for (let i = 0; i < data.items.length; i++) {
                const item = data.items[i];
                 if(item.value > 100) {
                   results.push({ ...item, status: 'processed_special' });
                }
            }
            return results;
        }
    }
}`;

export const TechDebtSonar: React.FC = () => {
    const [code, setCode] = useState(exampleCode);
    const [smells, setSmells] = useState<CodeSmell[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleScan = useCallback(async () => {
        if (!code.trim()) {
            setError('Please provide code to scan.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSmells([]);
        try {
            const result = await detectCodeSmells(code);
            setSmells(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [code]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <MagnifyingGlassIcon />
                    <span className="ml-3">Tech Debt Sonar</span>
                </h1>
                <p className="text-text-secondary mt-1">Scan code to find code smells and areas with high complexity.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2">Code to Analyze</label>
                    <textarea value={code} onChange={e => setCode(e.target.value)} className="flex-grow p-2 bg-surface border rounded font-mono text-xs"/>
                    <button onClick={handleScan} disabled={isLoading} className="btn-primary w-full mt-4 py-3">{isLoading ? <LoadingSpinner/> : 'Scan for Code Smells'}</button>
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2">Detected Smells</label>
                    <div className="flex-grow p-2 bg-background border rounded overflow-auto">
                        {isLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="text-red-500 p-4">{error}</p>}
                        {!isLoading && smells.length === 0 && <p className="text-text-secondary text-center pt-8">No smells detected, or scan not run.</p>}
                        {smells.length > 0 && (
                            <div className="space-y-3">
                                {smells.map((smell, i) => (
                                    <div key={i} className="p-3 bg-surface border border-border rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-primary">{smell.smell}</h4>
                                            <span className="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">Line: {smell.line}</span>
                                        </div>
                                        <p className="text-sm mt-1">{smell.explanation}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
