import React, { useState, useCallback } from 'react';
import { generateTerraformConfig } from '../../services/index.ts';
import { CpuChipIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

export const TerraformGenerator: React.FC = () => {
    const [description, setDescription] = useState('An S3 bucket for static website hosting');
    const [cloud, setCloud] = useState<'aws' | 'gcp'>('aws');
    const [config, setConfig] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = useCallback(async () => {
        if (!description.trim()) {
            setError('Please provide a description.');
            return;
        }
        setIsLoading(true);
        setError('');
        setConfig('');
        try {
            // Context is stubbed for now but demonstrates future capability
            const context = 'User might have existing VPCs. Check before creating new ones.';
            const result = await generateTerraformConfig(cloud, description, context);
            setConfig(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate config.');
        } finally {
            setIsLoading(false);
        }
    }, [description, cloud]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><CpuChipIcon /><span className="ml-3">AI Terraform Generator</span></h1>
                <p className="text-text-secondary mt-1">Generate infrastructure-as-code from a description, with context from your cloud provider.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                 <div className="flex flex-col flex-1 min-h-0">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm">Cloud Provider</label>
                            <select value={cloud} onChange={e => setCloud(e.target.value as 'aws' | 'gcp')} className="w-full mt-1 p-2 bg-surface border rounded">
                                <option value="aws">AWS</option>
                                <option value="gcp">GCP</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm">Describe the infrastructure</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 p-2 bg-surface border rounded"/>
                        </div>
                    </div>
                     <button onClick={handleGenerate} disabled={isLoading} className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center py-2"><SparklesIcon /> {isLoading ? 'Generating...' : 'Generate Configuration'}</button>
                </div>
                 <div className="flex flex-col flex-grow min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">Generated Terraform (.tf)</label>
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