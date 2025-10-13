import React, { useState, useCallback, useEffect } from 'react';
import type { GeneratedFile } from '../../types.ts';
import { generateFeature, generateFullStackFeature, generateUnitTestsStream, generateCommitMessageStream, generateDockerfile } from '../../services/aiService.ts';
import { saveFile, getAllFiles, clearAllFiles } from '../../services/dbService.ts';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { CpuChipIcon, DocumentTextIcon, BeakerIcon, GitBranchIcon, CloudIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

type SupplementalTab = 'TESTS' | 'COMMIT' | 'DEPLOYMENT' | 'CODE';
type OutputTab = GeneratedFile | SupplementalTab;

export const AiFeatureBuilder: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('A simple "Hello World" React component with a button that shows an alert.');
    const [framework] = useState('React');
    const [styling] = useState('Tailwind CSS');
    const [includeBackend, setIncludeBackend] = useState(false);

    const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
    const [unitTests, setUnitTests] = useState<string>('');
    const [commitMessage, setCommitMessage] = useState<string>('');
    const [dockerfile, setDockerfile] = useState<string>('');

    const [activeTab, setActiveTab] = useState<OutputTab>('CODE');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    
    useEffect(() => {
        const loadFiles = async () => {
            const files = await getAllFiles();
            setGeneratedFiles(files);
            if (files.length > 0) setActiveTab(files[0]);
        };
        loadFiles();
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) { setError('Please enter a feature description.'); return; }
        setIsLoading(true);
        setError('');
        await clearAllFiles();
        setGeneratedFiles([]); setUnitTests(''); setCommitMessage(''); setDockerfile(''); setActiveTab('CODE');

        try {
            const resultFiles = includeBackend
                ? await generateFullStackFeature(prompt, framework, styling)
                : await generateFeature(prompt, framework, styling);
            
            for (const file of resultFiles) { await saveFile(file); }
            setGeneratedFiles(resultFiles);

            if (resultFiles.length > 0) {
                const componentFile = resultFiles.find(f => f.filePath.endsWith('.tsx') || f.filePath.endsWith('.jsx'));
                setActiveTab(componentFile || resultFiles[0]);

                const testStream = generateUnitTestsStream(componentFile?.content || resultFiles[0].content);
                const diffContext = resultFiles.map(f => `File: ${f.filePath}\n\n${f.content}`).join('\n---\n');
                const commitStream = generateCommitMessageStream(diffContext);
                
                let tests = ''; for await (const chunk of testStream) { tests += chunk; setUnitTests(tests); }
                let commit = ''; for await (const chunk of commitStream) { commit += chunk; setCommitMessage(commit); }
                
                if (!includeBackend) {
                    const dockerfileStream = generateDockerfile(framework);
                    let docker = ''; for await (const chunk of dockerfileStream) { docker += chunk; setDockerfile(docker); }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate feature.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, framework, styling, includeBackend]);
    
    const renderContent = () => {
        if (typeof activeTab === 'string') {
            switch (activeTab) {
                case 'TESTS': return <MarkdownRenderer content={unitTests} />;
                case 'COMMIT': return <pre className="w-full h-full p-4 whitespace-pre-wrap font-sans text-sm">{commitMessage}</pre>;
                case 'DEPLOYMENT': return <MarkdownRenderer content={dockerfile} />;
                default: return <div className="p-4">Select a file</div>;
            }
        }
        return <MarkdownRenderer content={'```tsx\n' + activeTab.content + '\n```'} />;
    }

    return (
        <div className="h-full flex flex-col text-text-primary bg-surface">
            <header className="p-4 border-b border-border flex-shrink-0">
                <h1 className="text-xl font-bold flex items-center"><CpuChipIcon /><span className="ml-3">AI Feature Builder</span></h1>
            </header>
            <div className="flex-grow flex min-h-0">
                <main className="flex-1 flex flex-col min-w-0">
                    <div className="flex-grow flex flex-col bg-background">
                         <div className="border-b border-border flex items-center bg-surface overflow-x-auto">
                            {generatedFiles.map(file => (
                                <button key={file.filePath} onClick={() => setActiveTab(file)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm ${activeTab === file ? 'bg-background border-b-2 border-primary text-text-primary' : 'text-text-secondary hover:bg-gray-50'}`}><DocumentTextIcon /> {file.filePath}</button>
                            ))}
                            {unitTests && <button onClick={() => setActiveTab('TESTS')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm ${activeTab === 'TESTS' ? 'bg-background border-b-2 border-primary text-text-primary' : 'text-text-secondary hover:bg-gray-50'}`}><BeakerIcon /> Tests</button>}
                            {commitMessage && <button onClick={() => setActiveTab('COMMIT')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm ${activeTab === 'COMMIT' ? 'bg-background border-b-2 border-primary text-text-primary' : 'text-text-secondary hover:bg-gray-50'}`}><GitBranchIcon /> Commit</button>}
                            {dockerfile && !includeBackend && <button onClick={() => setActiveTab('DEPLOYMENT')} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm ${activeTab === 'DEPLOYMENT' ? 'bg-background border-b-2 border-primary text-text-primary' : 'text-text-secondary hover:bg-gray-50'}`}><CloudIcon /> Dockerfile</button>}
                        </div>
                        <div className="flex-grow p-2 overflow-auto">
                            {isLoading && !generatedFiles.length ? <div className="flex justify-center items-center h-full"><LoadingSpinner/></div> : renderContent()}
                        </div>
                    </div>
                    
                    <div className="flex-shrink-0 p-4 border-t border-border bg-surface">
                         <div className="flex items-center gap-2 mb-2">
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeBackend} onChange={e => setIncludeBackend(e.target.checked)} /> Include Backend (Cloud Function + Firestore)</label>
                        </div>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A user profile card with an avatar, name, and bio." className="w-full p-2 bg-background border border-border rounded-md resize-none text-sm h-20"/>
                         <div className="flex gap-2 mt-2">
                             <button onClick={handleGenerate} disabled={isLoading} className="btn-primary flex-grow flex items-center justify-center gap-2 px-4 py-2">
                                {isLoading ? <><LoadingSpinner /> Generating...</> : 'Generate Feature'}
                            </button>
                         </div>
                         {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
                    </div>
                </main>
            </div>
        </div>
    );
};
