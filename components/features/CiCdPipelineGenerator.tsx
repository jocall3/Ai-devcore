import React, { useState } from 'react';
import { generateCiCdConfig } from '../../services/index.ts';
import { PaperAirplaneIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

const platforms = ['GitHub Actions', 'GitLab CI', 'CircleCI', 'Jenkins'];
const exampleDescription = "Install Node.js dependencies, run linting and tests, build the production app, and then deploy to Vercel.";

export const CiCdPipelineGenerator: React.FC = () => {
    const [platform, setPlatform] = useState(platforms[0]);
    const [description, setDescription] = useState(exampleDescription);
    const [config, setConfig] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!description.trim()) {
            setError('Please provide a description of the pipeline stages.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const result = await generateCiCdConfig(platform, description);
            setConfig(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate config.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><PaperAirplaneIcon /><span className="ml-3">AI CI/CD Pipeline Architect</span></h1>
                <p className="text-text-secondary mt-1">Describe your deployment process and get a modern configuration file.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                 <div className="flex flex-col flex-1 min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div><label className="block text-sm">Platform</label><select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full mt-1 p-2 bg-surface border rounded"><option>GitHub Actions</option><option>GitLab CI</option><option>CircleCI</option></select></div>
                        <div className="md:col-span-2"><label className="block text-sm">Describe Stages</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 p-2 bg-surface border rounded"/></div>
                    </div>
                     <button onClick={handleGenerate} disabled={isLoading} className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center py-2"><SparklesIcon /> {isLoading ? 'Generating...' : 'Generate Configuration'}</button>
                </div>
                 <div className="flex flex-col flex-grow min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">Generated Configuration File</label>
                    <div className="relative flex-grow p-1 bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && !config && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="p-4 text-red-500">{error}</p>}
                        {config && <MarkdownRenderer content={config} />}
                         {!isLoading && !config && !error && <div className="text-text-secondary h-full flex items-center justify-center">Generated config will appear here.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};