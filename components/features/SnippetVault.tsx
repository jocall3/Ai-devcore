import React, { useState, useEffect, useMemo } from 'react';
import { LockClosedIcon, SparklesIcon, TrashIcon, ClipboardDocumentIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { useLocalStorage } from '../../hooks/useLocalStorage.ts';
import { enhanceSnippetStream, generateTagsForCode } from '../../services/aiService.ts';
import { LoadingSpinner } from '../shared/index.tsx';
import { downloadFile } from '../../services/fileUtils.ts';
import { useNotification } from '../../contexts/NotificationContext.tsx';

interface Snippet {
    id: number; name: string; code: string; language: string; tags: string[];
}

const langToExt: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    css: 'css',
    html: 'html',
    json: 'json',
    markdown: 'md',
    plaintext: 'txt',
};

export const SnippetVault: React.FC = () => {
    const [snippets, setSnippets] = useLocalStorage<Snippet[]>('devcore_snippets', [{ id: 1, name: 'React Hook Boilerplate', language: 'javascript', code: `import { useState } from 'react';\n\nconst useCustomHook = () => {\n  const [value, setValue] = useState(null);\n  return { value, setValue };\n};`, tags: ['react', 'hook'] }]);
    const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const { addNotification } = useNotification();

    const filteredSnippets = useMemo(() => {
        if (!searchTerm) return snippets;
        const lowerSearch = searchTerm.toLowerCase();
        return snippets.filter((s: Snippet) => 
            s.name.toLowerCase().includes(lowerSearch) || 
            s.code.toLowerCase().includes(lowerSearch) ||
            (s.tags && s.tags.some(t => t.toLowerCase().includes(lowerSearch)))
        );
    }, [snippets, searchTerm]);

    useEffect(() => {
        if (!activeSnippet && filteredSnippets.length > 0) setActiveSnippet(filteredSnippets[0]);
        if (activeSnippet) setActiveSnippet(snippets.find((s: Snippet) => s.id === activeSnippet.id) || null);
    }, [snippets, activeSnippet, filteredSnippets]);

    const updateSnippet = (snippet: Snippet) => {
        setSnippets(snippets.map((s: Snippet) => s.id === snippet.id ? snippet : s));
        setActiveSnippet(snippet);
    };

    const handleEnhance = async () => {
        if (!activeSnippet) return;
        setIsEnhancing(true);
        try {
            const stream = enhanceSnippetStream(activeSnippet.code);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                updateSnippet({ ...activeSnippet, code: fullResponse.replace(/^```(?:\w+\n)?/, '').replace(/```$/, '') });
            }
        } finally { setIsEnhancing(false); }
    };
    
    const handleAiTagging = async (snippet: Snippet) => {
        if (!snippet.code.trim()) return;
        try {
            const suggestedTags = await generateTagsForCode(snippet.code);
            const newTags = [...new Set([...(snippet.tags || []), ...suggestedTags])];
            updateSnippet({...snippet, tags: newTags});
            addNotification('AI tags added!', 'success');
        } catch(e) {
            console.error("AI tagging failed:", e);
            addNotification('AI tagging failed.', 'error');
        }
    };

    const handleAddNew = () => {
        const newSnippet: Snippet = { id: Date.now(), name: 'New Snippet', language: 'plaintext', code: '', tags: [] };
        setSnippets([...snippets, newSnippet]);
        setActiveSnippet(newSnippet);
    };
    
    const handleDelete = (id: number) => {
        setSnippets(snippets.filter((s: Snippet) => s.id !== id));
        if(activeSnippet?.id === id) setActiveSnippet(filteredSnippets.length > 1 ? filteredSnippets[0] : null);
    };
    
    const handleDownload = () => {
        if(!activeSnippet) return;
        const extension = langToExt[activeSnippet.language] || 'txt';
        const filename = `${activeSnippet.name.replace(/\s/g, '_')}.${extension}`;
        downloadFile(activeSnippet.code, filename);
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (activeSnippet) updateSnippet({...activeSnippet, name: e.target.value});
    };
    
    const handleTagsChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && activeSnippet) {
            const newTag = e.currentTarget.value.trim();
            if (newTag && !activeSnippet.tags.includes(newTag)) {
                updateSnippet({...activeSnippet, tags: [...(activeSnippet.tags ?? []), newTag]});
            }
            e.currentTarget.value = '';
        }
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><LockClosedIcon /><span className="ml-3">Snippet Vault</span></h1><p className="text-text-secondary mt-1">Store, search, tag, and enhance your reusable code snippets with AI.</p></header>
            <div className="flex-grow flex gap-6 min-h-0">
                <aside className="w-1/3 bg-surface border border-border p-4 rounded-lg flex flex-col">
                    <input type="text" placeholder="Search snippets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-1.5 mb-3 rounded-md bg-background border border-border text-sm"/>
                    <ul className="space-y-2 flex-grow overflow-y-auto pr-2">{filteredSnippets.map((s: Snippet) => (<li key={s.id} className="group flex items-center justify-between"><button onClick={() => setActiveSnippet(s)} className={`w-full text-left px-3 py-2 rounded-md ${activeSnippet?.id === s.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{s.name}</button><div className="flex opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => {navigator.clipboard.writeText(s.code); addNotification("Copied snippet!", "success")}} className="ml-2 p-1 text-text-secondary hover:text-primary" title="Copy"><ClipboardDocumentIcon /></button><button onClick={() => handleDelete(s.id)} className="ml-2 p-1 text-text-secondary hover:text-red-500" title="Delete"><TrashIcon/></button></div></li>))}</ul>
                    <div className="mt-4 pt-4 border-t border-border"><button onClick={handleAddNew} className="btn-primary w-full text-sm py-2">Add New Snippet</button></div>
                </aside>
                <main className="w-2/3 flex flex-col">
                    {activeSnippet ? (<>
                        <div className="flex justify-between items-center mb-2">
                            {isEditingName ? <input type="text" value={activeSnippet.name} onChange={handleNameChange} onBlur={() => setIsEditingName(false)} autoFocus className="text-lg font-bold bg-gray-100 dark:bg-slate-700 rounded px-2"/> : <h3 onDoubleClick={() => setIsEditingName(true)} className="text-lg font-bold cursor-pointer">{activeSnippet.name}</h3>}
                            <div className="flex gap-2">
                                <button onClick={() => handleAiTagging(activeSnippet)} className="flex items-center gap-2 px-3 py-1 bg-teal-500/80 text-white font-bold text-xs rounded-md"><SparklesIcon /> AI Tag</button>
                                <button onClick={handleEnhance} disabled={isEnhancing} className="flex items-center gap-2 px-3 py-1 bg-purple-500/80 text-white font-bold text-xs rounded-md disabled:bg-gray-400"><SparklesIcon /> AI Enhance</button>
                                <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-slate-700 text-xs rounded-md"><ArrowDownTrayIcon className="w-4 h-4"/> Download</button>
                            </div>
                        </div>
                        <textarea value={activeSnippet.code} onChange={e => updateSnippet({...activeSnippet, code: e.target.value})} className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"/>
                        <div className="mt-2 text-xs text-text-secondary">
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="font-bold">Tags:</span> {(activeSnippet.tags ?? []).map(t => <span key={t} className="bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{t}</span>)}
                             <input type="text" placeholder="+ Add tag" onKeyDown={handleTagsChange} className="bg-transparent border-b border-border focus:outline-none focus:border-primary w-24 text-xs px-1"/>
                           </div>
                        </div>
                    </>) : (<div className="flex-grow flex items-center justify-center bg-background border border-border rounded-lg text-text-secondary">Select a snippet or create a new one.</div>)}
                </main>
            </div>
        </div>
    );
};