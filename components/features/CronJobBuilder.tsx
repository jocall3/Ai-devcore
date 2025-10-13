import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CommandLineIcon, SparklesIcon } from '../icons.tsx';
import { generateCronFromDescription, CronParts } from '../../services/index.ts';
import { LoadingSpinner } from '../shared/index.tsx';

const CronPartSelector: React.FC<{ label: string, value: string, onChange: (value: string) => void, options: (string|number)[] }> = ({ label, value, onChange, options }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-text-secondary">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md bg-surface border border-border">
                <option value="*">* (every)</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
};

export const CronJobBuilder: React.FC<{ initialPrompt?: string }> = ({ initialPrompt }) => {
    const [minute, setMinute] = useState('0');
    const [hour, setHour] = useState('17');
    const [dayOfMonth, setDayOfMonth] = useState('*');
    const [month, setMonth] = useState('*');
    const [dayOfWeek, setDayOfWeek] = useState('1-5');
    const [aiPrompt, setAiPrompt] = useState(initialPrompt || 'every weekday at 5pm');
    const [isLoading, setIsLoading] = useState(false);
    
    const cronExpression = useMemo(() => {
        return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
    }, [minute, hour, dayOfMonth, month, dayOfWeek]);

    const handleAiGenerate = useCallback(async (p: string) => {
        if (!p) return;
        setIsLoading(true);
        try {
            const result: CronParts = await generateCronFromDescription(p);
            setMinute(result.minute);
            setHour(result.hour);
            setDayOfMonth(result.dayOfMonth);
            setMonth(result.month);
            setDayOfWeek(result.dayOfWeek);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (initialPrompt) {
            setAiPrompt(initialPrompt);
            handleAiGenerate(initialPrompt);
        }
    }, [initialPrompt, handleAiGenerate]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <CommandLineIcon />
                    <span className="ml-3">AI Cron Job Builder</span>
                </h1>
                <p className="text-text-secondary mt-1">Visually construct a cron expression or describe it in plain English.</p>
            </header>
             <div className="flex gap-2 mb-6">
                <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe a schedule..." className="flex-grow px-3 py-1.5 rounded-md bg-surface border border-border text-sm"/>
                <button onClick={() => handleAiGenerate(aiPrompt)} disabled={isLoading} className="btn-primary px-4 py-1.5 flex items-center gap-2">
                    {isLoading ? <LoadingSpinner /> : <SparklesIcon />} AI Generate
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <CronPartSelector label="Minute" value={minute} onChange={setMinute} options={Array.from({length: 60}, (_, i) => i)} />
                <CronPartSelector label="Hour" value={hour} onChange={setHour} options={Array.from({length: 24}, (_, i) => i)} />
                <CronPartSelector label="Day (Month)" value={dayOfMonth} onChange={setDayOfMonth} options={Array.from({length: 31}, (_, i) => i + 1)} />
                <CronPartSelector label="Month" value={month} onChange={setMonth} options={Array.from({length: 12}, (_, i) => i + 1)} />
                <CronPartSelector label="Day (Week)" value={dayOfWeek} onChange={setDayOfWeek} options={Array.from({length: 7}, (_, i) => i)} />
            </div>
            <div className="bg-surface p-4 rounded-lg text-center border border-border">
                <p className="text-text-secondary text-sm">Generated Expression</p>
                <p className="font-mono text-primary text-2xl mt-1">{cronExpression}</p>
                 <button onClick={() => navigator.clipboard.writeText(cronExpression)} className="mt-4 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-xs">Copy</button>
            </div>
        </div>
    );
};