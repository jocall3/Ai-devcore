import React, { useState, useCallback } from 'react';
import { aiService, ICommand, IAiProvider } from '../../services/index.ts';
import { CpuChipIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';

class GenerateTerraformConfigCommand implements ICommand<string> {
    constructor(private cloud: 'aws' | 'gcp', private description: string, private context: string) {}

    execute(provider: IAiProvider): Promise<string> {
        const prompt = `You are an expert in Infrastructure as Code. Generate a Terraform configuration file for ${this.cloud}. The configuration should do the following: ${this.description}. Additional context: ${this.context}. Respond only with the HCL code inside a markdown block.`;
        const systemInstruction = "You are a Terraform expert generating HCL code.";
        return provider.generateContent(prompt, systemInstruction, 0.2);
    }
}

export const TerraformGenerator: React.FC = () => {
    const [description, setDescription] = useState('An S3 bucket for static website hosting');
    const [cloud, setCloud] = useState<'aws' | 'gcp'>('aws');
    const [config, setConfig] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { state } = useGlobalState();
    const { vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();
    const { addNotification } = useNotification();

    const handleGenerate = useCallback(async () => {
        if (!description.trim()) {
            setError('Please provide a description.');
            return;
        }
        setIsLoading(true);
        setError('');
        setConfig('');

        const executeGeneration = async () => {
            const context = 'User might have existing VPCs. Check before creating new ones.';
            const command = new GenerateTerraformConfigCommand(cloud, description, context);
            const result = await aiService.execute(command) as string;
            setConfig(result);
        };

        try {
            if (!vaultState.isInitialized) {
                const created = await requestCreation();
                if (!created) { throw new Error('Vault setup is required to use AI features.'); }
            }
            if (!vaultState.isUnlocked) {
                const unlocked = await requestUnlock();
                if (!unlocked) { throw new Error('Vault must be unlocked to use AI features.'); }
            }
            
            await executeGeneration();
            addNotification('Terraform configuration generated successfully!', 'success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate config.';
            setError(errorMessage);
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [description, cloud, vaultState, requestCreation, requestUnlock, addNotification]);

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
