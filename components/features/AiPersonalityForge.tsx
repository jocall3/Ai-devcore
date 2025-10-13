import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon, PlusIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpOnSquareIcon } from '../icons.tsx';
import { useAiPersonalities } from '../../hooks/useAiPersonalities.ts';
import { formatSystemPromptToString } from '../../utils/promptUtils.ts';
import { streamContent } from '../../services/index.ts';
import { downloadJson } from '../../services/fileUtils.ts';
import type { SystemPrompt } from '../../types.ts';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';

const defaultNewPrompt: Omit<SystemPrompt, 'id' | 'name'> = {
    persona: 'You are a helpful assistant.',
    rules: [],
    outputFormat: 'markdown',
    exampleIO: [],
};

export const AiPersonalityForge: React.FC = () => {
    const [personalities, setPersonalities] = useAiPersonalities();
    const [activeId, setActiveId] = useState<string | null>(null);
    const { addNotification } = useNotification();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Testbed State
    const [testbedInput, setTestbedInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    const activePersonality = personalities.find(p => p.id === activeId);

    useEffect(() => {
        if (!activeId && personalities.length > 0) {
            setActiveId(personalities[0].id);
        }
    }, [personalities, activeId]);
    
    const handleUpdate = (field: keyof SystemPrompt, value: any) => {
        if (!activePersonality) return;
        const updated = { ...activePersonality, [field]: value };
        setPersonalities(personalities.map(p => (p.id === activeId ? updated : p)));
    };

    const handleAddNew = () => {
        const newId = Date.now().toString();
        const newPersonality: SystemPrompt = { ...defaultNewPrompt, id: newId, name: 'Untitled Personality' };
        setPersonalities([...personalities, newPersonality]);
        setActiveId(newId);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this personality?')) {
            setPersonalities(personalities.filter(p => p.id !== id));
            if (activeId === id) {
                setActiveId(personalities.length > 1 ? personalities[0].id : null);
            }
        }
    };
    
    const handleTestbedSend = async () => {
        if (!testbedInput.trim() || !activePersonality || isStreaming) return;
        
        const systemInstruction = formatSystemPromptToString(activePersonality);
        const newHistory = [...chatHistory, { role: 'user' as const, content: testbedInput }];
        setChatHistory(newHistory);
        setTestbedInput('');
        setIsStreaming(true);

        try {
            const stream = streamContent(testbedInput, systemInstruction, 0.7);
            let fullResponse = '';
            setChatHistory(prev => [...prev, { role: 'model', content: '' }]);
            for await (const chunk of stream) {
                fullResponse += chunk;
                setChatHistory(prev => {
                    const last = prev[prev.length - 1];
                    if (last.role === 'model') {
                        return [...prev.slice(0, -1), { role: 'model', content: fullResponse }];
                    }
                    return prev;
                });
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'An error occurred';
            setChatHistory(prev => [...prev, { role: 'model', content: `**Error:** ${errorMsg}` }]);
        } finally {
            setIsStreaming(false);
        }
    };
    
    const handleExport = () => {
        if (!activePersonality) return;
        downloadJson(activePersonality, `${activePersonality.name.replace(/\s+/g, '_')}.json`);
        addNotification('Personality exported!', 'success');
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string) as SystemPrompt;
                // Basic validation
                if (imported.id && imported.name && imported.persona) {
                    setPersonalities(prev => [...prev.filter(p => p.id !== imported.id), imported]);
                    setActiveId(imported.id);
                    addNotification('Personality imported!', 'success');
                } else {
                     addNotification('Invalid personality file.', 'error');
                }
            } catch {
                 addNotification('Failed to parse JSON file.', 'error');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="h-full flex text-text-primary">
            {/* Sidebar */}
            <aside className="w-64 bg-surface border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-bold">Personalities</h2>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {personalities.map(p => (
                        <div key={p.id} onClick={() => setActiveId(p.id)} className={`group flex justify-between items-center p-3 text-sm cursor-pointer ${activeId === p.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                            <span className="truncate">{p.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id)}} className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500"><TrashIcon /></button>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-border space-y-2">
                    <button onClick={handleAddNew} className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2"><PlusIcon /> New</button>
                    <div className="flex gap-2">
                         <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-md flex items-center justify-center gap-2"><ArrowUpOnSquareIcon/> Import</button>
                         <button onClick={handleExport} className="flex-1 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-md flex items-center justify-center gap-2"><ArrowDownTrayIcon/> Export</button>
                         <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden"/>
                    </div>
                </div>
            </aside>
            {/* Main Content */}
            {activePersonality ? (
                 <div className="flex-1 grid grid-cols-2 gap-px bg-border">
                    {/* Editor */}
                    <div className="bg-background p-4 flex flex-col gap-4 overflow-y-auto">
                        <div><label className="font-bold">Name</label><input type="text" value={activePersonality.name} onChange={e => handleUpdate('name', e.target.value)} className="w-full mt-1 p-2 bg-surface border rounded"/></div>
                        <div><label className="font-bold">Persona</label><textarea value={activePersonality.persona} onChange={e => handleUpdate('persona', e.target.value)} className="w-full mt-1 p-2 bg-surface border rounded h-24"/></div>
                        <div><label className="font-bold">Rules (one per line)</label><textarea value={activePersonality.rules.join('\n')} onChange={e => handleUpdate('rules', e.target.value.split('\n'))} className="w-full mt-1 p-2 bg-surface border rounded h-32"/></div>
                        <div><label className="font-bold">Output Format</label><select value={activePersonality.outputFormat} onChange={e => handleUpdate('outputFormat', e.target.value)} className="w-full mt-1 p-2 bg-surface border rounded"><option>markdown</option><option>json</option><option>text</option></select></div>
                        <div>
                            <h3 className="font-bold mb-2">Examples</h3>
                            {activePersonality.exampleIO.map((ex, i) => (
                                <div key={i} className="grid grid-cols-2 gap-2 mb-2 p-2 border rounded bg-surface">
                                    <textarea placeholder="User Input" value={ex.input} onChange={e => handleUpdate('exampleIO', activePersonality.exampleIO.map((item, idx) => idx === i ? {...item, input: e.target.value} : item))} className="h-20 p-1 bg-background border rounded"/>
                                    <textarea placeholder="Model Output" value={ex.output} onChange={e => handleUpdate('exampleIO', activePersonality.exampleIO.map((item, idx) => idx === i ? {...item, output: e.target.value} : item))} className="h-20 p-1 bg-background border rounded"/>
                                </div>
                            ))}
                            <button onClick={() => handleUpdate('exampleIO', [...activePersonality.exampleIO, {input: '', output: ''}])} className="text-sm text-primary">+ Add Example</button>
                        </div>
                    </div>
                    {/* Testbed */}
                    <div className="bg-background p-4 flex flex-col">
                        <h2 className="text-lg font-bold mb-2 border-b pb-2">Live Testbed</h2>
                        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                           {chatHistory.map((msg, i) => (
                               <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary/10' : 'bg-surface'}`}>
                                    <strong className="capitalize">{msg.role}</strong>
                                    <MarkdownRenderer content={msg.content} />
                               </div>
                           ))}
                           {isStreaming && <div className="flex justify-center"><LoadingSpinner/></div>}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <input value={testbedInput} onChange={e => setTestbedInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTestbedSend()} className="flex-grow p-2 bg-surface border rounded" placeholder="Test your AI..."/>
                            <button onClick={handleTestbedSend} disabled={isStreaming} className="btn-primary px-4">Send</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-text-secondary">Select or create a personality to begin.</div>
            )}
        </div>
    );
};