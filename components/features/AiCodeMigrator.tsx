

import React, { useState, useCallback, useEffect } from 'react';
import { migrateCodeStream } from '../../services/index.ts';
import { ArrowPathIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { MarkdownRenderer } from '../shared/index.tsx';

const languages = ['SASS', 'CSS', 'JavaScript', 'TypeScript', 'Python', 'Go', 'React', 'Vue', 'Angular', 'Tailwind CSS'];

const exampleCode = `// SASS
$primary-color: #333;

body {
  color: $primary-color;
  font-family: sans-serif;
}`;

export const AiCodeMigrator: React.FC<{ inputCode?: string, fromLang?: string, toLang?: string }> = ({ inputCode: initialCode, fromLang: initialFrom, toLang: initialTo }) => {
    const [inputCode, setInputCode] = useState<string>(initialCode || exampleCode);
    const [outputCode, setOutputCode] = useState<string>('');
    const [fromLang, setFromLang] = useState(initialFrom || 'SASS');
    const [toLang, setToLang] = useState(initialTo || 'CSS');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const handleMigrate = useCallback(async (code: string, from: string, to: string) => {
        if (!code.trim()) {
            setError('Please enter some code to migrate.');
            return;
        }
        setIsLoading(true);
        setError('');
        setOutputCode('');
        try {
            const stream = migrateCodeStream(code, from, to);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setOutputCode(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to migrate code: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (initialCode && initialFrom && initialTo) {
            setInputCode(initialCode);
            setFromLang(initialFrom);
            setToLang(initialTo);
            handleMigrate(initialCode, initialFrom, initialTo);
        }
    }, [initialCode, initialFrom, initialTo, handleMigrate]);

    const LanguageSelector: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => (
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface border border-border">
            {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
        </select>
    );

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><ArrowPathIcon /><span className="ml-3">AI Code Migrator</span></h1>
                <p className="text-text-secondary mt-1">Translate code between languages, frameworks, and syntax styles.</p>
            </header>
            <div className="flex-grow flex flex-col min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow min-h-0">
                    <div className="flex flex-col h-full">
                        <div className="mb-2">
                            <label className="text-sm font-medium text-text-secondary">From:</label>
                            <LanguageSelector value={fromLang} onChange={setFromLang} />
                        </div>
                        <textarea
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            placeholder="Paste your source code here..."
                            className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm"
                        />
                    </div>
                    <div className="flex flex-col h-full">
                        <div className="mb-2">
                            <label className="text-sm font-medium text-text-secondary">To:</label>
                            <LanguageSelector value={toLang} onChange={setToLang} />
                        </div>
                        <div className="flex-grow p-1 bg-background border border-border rounded-md overflow-y-auto">
                           {isLoading && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                            {error && <p className="p-4 text-red-500">{error}</p>}
                            {outputCode && !isLoading && <MarkdownRenderer content={outputCode} />}
                            {!isLoading && !outputCode && !error && <div className="text-text-secondary h-full flex items-center justify-center">Migrated code will appear here.</div>}
                        </div>
                    </div>
                </div>
                 <button
                    onClick={() => handleMigrate(inputCode, fromLang, toLang)}
                    disabled={isLoading}
                    className="btn-primary mt-4 w-full max-w-sm mx-auto flex items-center justify-center px-6 py-3"
                >
                    {isLoading ? <LoadingSpinner /> : 'Migrate Code'}
                </button>
            </div>
        </div>
    );
};