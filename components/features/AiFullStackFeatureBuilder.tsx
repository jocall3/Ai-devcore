import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import type { GeneratedFile } from '../../types.ts';
import { generateFullStackFeature } from '../../services/aiService.ts';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { ServerStackIcon, SparklesIcon, DocumentTextIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

export const AiFullStackFeatureBuilder: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('A simple guestbook where users can submit messages and see a list of them.');
    const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
    const [activeTab, setActiveTab] = useState<GeneratedFile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const { addNotification } = useNotification();

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) { setError('Please enter a feature description.'); return; }
        setIsLoading(true);
        setError('');
        setGeneratedFiles([]);
        setActiveTab(null);

        try {
            const resultFiles = await generateFullStackFeature(prompt, 'React', 'Tailwind CSS');
            
            setGeneratedFiles(resultFiles);
            if (resultFiles.length > 0) {
                // Find the main component file to show first
                const componentFile = resultFiles.find(f => f.filePath.endsWith('Component.tsx'));
                setActiveTab(componentFile || resultFiles[0]);
            }
            addNotification('Full-stack feature generated!', 'success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate feature.');
            addNotification('Failed to generate feature', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, addNotification]);
    
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
