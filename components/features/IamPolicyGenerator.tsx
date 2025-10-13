import React, { useState, useCallback } from 'react';
import { generateIamPolicyStream } from '../../services/aiService.ts';
import { ShieldCheckIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

export const IamPolicyGenerator: React.FC = () => {
    const [description, setDescription] = useState('A user role that can read from S3 buckets but not write or delete.');
    const [platform, setPlatform] = useState<'aws' | 'gcp'>('aws');
    const [policy, setPolicy] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = useCallback(async () => {
        if (!description.trim()) {
            setError('Please provide a description.');
            return;
        }
        setIsLoading(true);
        setError('');
        setPolicy('');
        try {
            const stream = generateIamPolicyStream(description, platform);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setPolicy(fullResponse);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [description, platform]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <ShieldCheckIcon />
                    <span className="ml-3">IAM Policy Generator</span>
                </h1>
                <p className="text-text-secondary mt-1">Generate AWS or GCP IAM policies from a natural language description.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="flex flex-col gap-4">
                     <div>
                        <label htmlFor="platform" className="text-sm font-medium mb-2 block">Cloud Platform</label>
                        <div className="flex gap-2 p-1 bg-surface rounded-lg border">
                            <button onClick={() => setPlatform('aws')} className={`flex-1 py-2 rounded-md text-sm ${platform === 'aws' ? 'bg-primary text-text-on-primary' : ''}`}>AWS</button>
                            <button onClick={() => setPlatform('gcp')} className={`flex-1 py-2 rounded-md text-sm ${platform === 'gcp' ? 'bg-primary text-text-on-primary' : ''}`}>GCP</button>
                        </div>
                    </div>
                    <div className="flex flex-col flex-1 min-h-0">
                        <label htmlFor="description" className="text-sm font-medium mb-2">Describe the desired permissions</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className="flex-grow p-2 bg-surface border rounded text-sm"/>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading} className="btn-primary w-full py-3">{isLoading ? <LoadingSpinner/> : 'Generate Policy'}</button>
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2">Generated Policy (JSON)</label>
                    <div className="flex-grow p-1 bg-background border rounded overflow-auto">
                        {isLoading && !policy && <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>}
                        {error && <p className="text-red-500 p-4">{error}</p>}
                        {policy && <MarkdownRenderer content={policy} />}
                    </div>
                </div>
            </div>
        </div>
    );
};
