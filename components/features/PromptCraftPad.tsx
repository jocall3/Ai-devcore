import React, { useState, useEffect, useMemo } from 'react';
import { SparklesIcon } from '../icons.tsx';
import { useLocalStorage } from '../../hooks/useLocalStorage.ts';

interface Prompt {
    id: number;
    name: string;
    text: string;
}

export const PromptCraftPad: React.FC = () => {
    const [prompts, setPrompts] = useLocalStorage<Prompt[]>('devcore_prompts', [
        { id: 1, name: 'React Component Generator', text: 'Generate a React component named {name} that {description}. Style it with Tailwind CSS.'}
    ]);
    const [activePrompt, setActivePrompt] = useState<Prompt | null>(prompts[0] || null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [tempName, setTempName] = useState('');
    const [variables, setVariables] = useState<Record<string, string>>({});

    const variableNames = useMemo(() => {
        if (!activePrompt) return [];
        return [...activePrompt.text.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
    }, [activePrompt]);

    const renderedPrompt = useMemo(() => {
        if (!activePrompt) return '';
        return variableNames.reduce((acc, varName) => {
            return acc.replace(new RegExp(`\\{${varName}\\}`, 'g'), variables[varName] || `{${varName}}`);
        }, activePrompt.text);
    }, [activePrompt, variables, variableNames]);
    
    useEffect(() => {
        if(!activePrompt && prompts.length > 0) setActivePrompt(prompts[0]);
        if (activePrompt) setActivePrompt(prompts.find((p: Prompt) => p.id === activePrompt.id) || null);
    }, [prompts, activePrompt]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!activePrompt) return;
        const updatedPrompt = { ...activePrompt, text: e.target.value };
        setPrompts(prompts.map((p: Prompt) => p.id === updatedPrompt.id ? updatedPrompt : p));
    };
    
    const handleNameUpdate = (id: number, newName: string) => {
        setPrompts(prompts.map((p: Prompt) => p.id === id ? {...p, name: newName} : p));
        setEditingId(null);
    };

    const handleAddNew = () => {
        const newPrompt = { id: Date.now(), name: 'New Untitled Prompt', text: '' };
        setPrompts([...prompts, newPrompt]);
        setActivePrompt(newPrompt);
    };
    
    const handleDelete = (id: number) => {
        setPrompts(prompts.filter((p: Prompt) => p.id !== id));
        if(activePrompt?.id === id) setActivePrompt(prompts.length > 1 ? prompts[0] : null);
    }

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><SparklesIcon /><span className="ml-3">Prompt Craft Pad</span></h1><p className="text-text-secondary mt-1">Create, save, and manage your favorite AI prompts.</p></header>
            <div className="flex-grow flex gap-6 min-h-0">
                <aside className="w-1/3 bg-surface border border-border p-4 rounded-lg flex flex-col">
                    <h3 className="font-bold mb-2">My Prompts</h3>
                    <ul className="space-y-2 flex-grow overflow-y-auto">{prompts.map((p: Prompt) => (<li key={p.id} className="group flex items-center justify-between"><div className={`w-full text-left rounded-md ${activePrompt?.id === p.id ? 'bg-primary/10' : ''}`}><button onClick={() => setActivePrompt(p)} onDoubleClick={() => {setEditingId(p.id); setTempName(p.name);}} className={`w-full text-left px-3 py-2 ${activePrompt?.id === p.id ? 'text-primary' : 'hover:bg-gray-100'}`}> {editingId === p.id ? <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={() => handleNameUpdate(p.id, tempName)} onKeyDown={e => e.key === 'Enter' && handleNameUpdate(p.id, tempName)} className="bg-gray-100 text-text-primary w-full"/> : p.name} </button></div><button onClick={() => handleDelete(p.id)} className="ml-2 p-1 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100">&times;</button></li>))}</ul>
                    <div className="mt-4 pt-4 border-t border-border"><button onClick={handleAddNew} className="btn-primary w-full text-sm py-2">Add New Prompt</button></div>
                </aside>
                <main className="w-2/3 flex flex-col gap-4">
                    {activePrompt ? (<>
                        <textarea value={activePrompt.text} onChange={handleTextChange} className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"/>
                        {variableNames.length > 0 && <div className="flex-shrink-0 bg-surface border border-border p-4 rounded-lg"><h4 className="font-bold mb-2">Test Variables</h4><div className="grid grid-cols-2 gap-2">{variableNames.map(v => (<div key={v}><label className="text-xs">{v}</label><input type="text" value={variables[v] || ''} onChange={e => setVariables({...variables, [v]: e.target.value})} className="w-full bg-background border border-border px-2 py-1 rounded text-sm"/></div>))}</div><h4 className="font-bold mt-4 mb-2">Live Preview</h4><p className="text-sm p-2 bg-background rounded border border-border">{renderedPrompt}</p></div>}
                    </>) : (<div className="flex-grow flex items-center justify-center bg-background rounded-lg text-text-secondary border border-border">Select a prompt or create a new one.</div>)}
                </main>
            </div>
        </div>
    );
};