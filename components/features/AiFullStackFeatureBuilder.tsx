import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import type { GeneratedFile } from '../../types.ts';
import { streamContent } from '../../services/index.ts';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { ServerStackIcon, SparklesIcon, DocumentTextIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

const jsonFromStream = async (stream: AsyncGenerator<string, void, unknown>): Promise<GeneratedFile[]> => {
    let fullResponse = '';
    for await (const chunk of stream) { fullResponse += chunk; }
    const jsonMatch = fullResponse.match(/```json\n?([\s\S]*?)\n?```/);
    try {
      return JSON.parse(jsonMatch ? jsonMatch[1] : fullResponse);
    } catch (e) {
      console.error('Failed to parse JSON from stream', e, { fullResponse });
      throw new Error('Invalid JSON response from AI');
    }
};

export const AiFullStackFeatureBuilder: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('A simple guestbook where users can submit messages and see a list of them.');
    const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
    const [activeTab, setActiveTab] = useState<GeneratedFile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const { addNotification } = useNotification();
    const { state } = useGlobalState();
    const { vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();

    const withVault = useCallback(async (callback: () => Promise<void>) => {
        if (!vaultState.isInitialized) {
            const created = await requestCreation();
            if (!created) { 
                addNotification('Vault setup is required to use AI features.', 'error');
                throw new Error('Vault setup cancelled.');
            } 
        }
        if (!vaultState.isUnlocked) {
            const unlocked = await requestUnlock();
            if (!unlocked) { 
                addNotification('Vault must be unlocked to use AI features.', 'error');
                throw new Error('Vault unlock cancelled.');
            }
        }
        await callback();
    }, [vaultState, requestCreation, requestUnlock, addNotification]);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) { setError('Please enter a feature description.'); return; }
        setIsLoading(true);
        setError('');
        setGeneratedFiles([]);
        setActiveTab(null);

        try {
            await withVault(async () => {
                const framework = 'React';
                const styling = 'Tailwind CSS';
                const stream = streamContent(`Generate a new full-stack feature. The frontend is ${framework} with ${styling}. The backend is a single Google Cloud Function with Firestore. The feature is: "${prompt}". Respond with an array of file objects, each with filePath and content.`, 'You are a full-stack software engineer specializing in GCP. You must respond with a JSON array of file objects.');
                const resultFiles = await jsonFromStream(stream);

                setGeneratedFiles(resultFiles);
                if (resultFiles.length > 0) {
                    const componentFile = resultFiles.find((f: GeneratedFile) => f.filePath.endsWith('Component.tsx'));
                    setActiveTab(componentFile || resultFiles[0]);
                }
                addNotification('Full-stack feature generated!', 'success');
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to generate feature.';
            if (!msg.includes('cancelled')) { // Do not show notification if user cancelled vault action
                setError(msg);
                addNotification(msg, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [prompt, addNotification, withVault]);
    
    const handleDownloadZip = () => {
        if (generatedFiles.length === 0) return;
        const zip = new JSZip();
        generatedFiles.forEach(file => {
            zip.file(file.filePath, file.content);
        });
        zip.generateAsync({ type: 'blob' }).then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'full-stack-feature.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const renderContent = () => {
        if (!activeTab) return <div className="p-4 text-text-secondary">Select a file to view its content.</div>;
        const language = activeTab.filePath.split('.').pop() || 'tsx';
        return <MarkdownRenderer content={'```' + language + '\n' + activeTab.content + '\n```'} />;
    }

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><ServerStackIcon /><span className="ml-3">AI Full-Stack Builder</span></h1>
                <p className="text-text-secondary mt-1">Generate a frontend component, backend cloud function, and database rules from a single prompt.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="feature-prompt" className="text-sm font-medium text-text-secondary mb-2">Describe your feature</label>
                    <textarea
                        id="feature-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A user profile card with an avatar, name, and bio."
                        className="p-4 bg-surface border border-border rounded-md resize-y font-mono text-sm h-24"
                    />
                </div>
                <div className="flex-shrink-0 flex gap-4">
                    <button onClick={handleGenerate} disabled={isLoading} className="btn-primary flex-grow flex items-center justify-center px-6 py-3">
                        {isLoading ? <LoadingSpinner /> : <><SparklesIcon />Generate Full Stack Feature</>}
                    </button>
                    {generatedFiles.length > 0 && 
                        <button onClick={handleDownloadZip} className="btn-primary bg-green-600 hover:bg-green-700 flex items-center justify-center px-6 py-3">
                            <ArrowDownTrayIcon /> Download ZIP
                        </button>
                    }
                </div>
                {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
                
                <div className="flex flex-col flex-grow min-h-0 mt-4">
                    <div className="flex-shrink-0 flex border-b border-border bg-surface rounded-t-lg overflow-x-auto">
                        {generatedFiles.map(file => (
                            <button key={file.filePath} onClick={() => setActiveTab(file)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm ${activeTab?.filePath === file.filePath ? 'bg-background border-b-2 border-primary text-text-primary' : 'text-text-secondary hover:bg-gray-50'}`}>
                                <DocumentTextIcon /> {file.filePath}
                            </button>
                        ))}
                    </div>
                    <div className="flex-grow bg-background border border-t-0 border-border rounded-b-lg overflow-auto">
                        {isLoading && generatedFiles.length === 0 && <div className="flex justify-center items-center h-full"><LoadingSpinner/></div>}
                        {!isLoading && generatedFiles.length === 0 && <div className="text-text-secondary h-full flex items-center justify-center p-8 text-center">Generated files will appear here.</div>}
                        {generatedFiles.length > 0 && renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};