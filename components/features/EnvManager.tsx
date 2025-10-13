import React, { useState } from 'react';
import { downloadEnvFile } from '../../services/fileUtils.ts';
import { DocumentTextIcon, PlusIcon, TrashIcon, ArrowDownTrayIcon } from '../icons.tsx';

interface EnvVar {
    id: number;
    key: string;
    value: string;
}

export const EnvManager: React.FC = () => {
    const [envVars, setEnvVars] = useState<EnvVar[]>([
        { id: 1, key: 'VITE_API_URL', value: 'https://api.example.com' },
        { id: 2, key: 'VITE_ENABLE_FEATURE_X', value: 'true' },
    ]);

    const handleAdd = () => {
        setEnvVars([...envVars, { id: Date.now(), key: '', value: '' }]);
    };

    const handleUpdate = (id: number, field: 'key' | 'value', val: string) => {
        setEnvVars(envVars.map(v => v.id === id ? { ...v, [field]: val } : v));
    };

    const handleRemove = (id: number) => {
        setEnvVars(envVars.filter(v => v.id !== id));
    };
    
    const handleDownload = () => {
        const envObject = envVars.reduce((acc, v) => {
            if (v.key) acc[v.key] = v.value;
            return acc;
        }, {} as Record<string, string>);
        downloadEnvFile(envObject);
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><DocumentTextIcon /><span className="ml-3">Environment Variable Manager</span></h1>
                <p className="text-text-secondary mt-1">Create and manage your `.env` files with a simple interface.</p>
            </header>
            <div className="flex-grow bg-surface p-6 rounded-lg border border-border w-full max-w-4xl mx-auto overflow-y-auto">
                <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-text-secondary px-2">
                        <div className="col-span-5">Key</div>
                        <div className="col-span-6">Value</div>
                        <div className="col-span-1"></div>
                    </div>
                    {envVars.map((v, index) => (
                        <div key={v.id} className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-5">
                                <input
                                    type="text"
                                    value={v.key}
                                    onChange={e => handleUpdate(v.id, 'key', e.target.value)}
                                    placeholder={`KEY_${index + 1}`}
                                    className="w-full p-2 bg-background border border-border rounded-md font-mono text-sm"
                                />
                            </div>
                            <div className="col-span-6">
                                <input
                                    type="text"
                                    value={v.value}
                                    onChange={e => handleUpdate(v.id, 'value', e.target.value)}
                                    placeholder="value"
                                    className="w-full p-2 bg-background border border-border rounded-md font-mono text-sm"
                                />
                            </div>
                            <div className="col-span-1">
                                <button onClick={() => handleRemove(v.id)} className="p-2 text-text-secondary hover:text-red-500 rounded-md"><TrashIcon /></button>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-sm font-semibold rounded-md hover:bg-gray-200">
                        <PlusIcon /> Add Variable
                    </button>
                    <button onClick={handleDownload} disabled={envVars.length === 0} className="btn-primary flex items-center gap-2 px-4 py-2">
                        <ArrowDownTrayIcon /> Download .env File
                    </button>
                </div>
            </div>
        </div>
    );
};
