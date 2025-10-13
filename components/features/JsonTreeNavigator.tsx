import React, { useState } from 'react';
import { FileCodeIcon } from '../icons.tsx';

interface JsonNodeProps {
    data: any;
    nodeKey: string;
    isRoot?: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, nodeKey, isRoot = false }) => {
    const [isOpen, setIsOpen] = useState(isRoot);
    const isObject = typeof data === 'object' && data !== null;

    const toggleOpen = () => setIsOpen(!isOpen);

    if (!isObject) {
        return (
            <div className="ml-4 pl-4 border-l border-border">
                <span className="text-purple-700">{nodeKey}: </span>
                <span className={typeof data === 'string' ? 'text-green-700' : 'text-orange-700'}>
                    {typeof data === 'string' ? `"${data}"` : String(data)}
                </span>
            </div>
        );
    }

    const entries = Object.entries(data);
    const bracket = Array.isArray(data) ? '[]' : '{}';

    return (
        <div className={`ml-4 ${!isRoot ? 'pl-4 border-l border-border' : ''}`}>
            <button onClick={toggleOpen} className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-1">
                <span className={`transform transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'}`}>▶</span>
                <span className="ml-1 text-purple-700">{nodeKey}:</span>
                <span className="ml-2 text-text-secondary">{bracket[0]}</span>
                {!isOpen && <span className="text-text-secondary">...{bracket[1]}</span>}
            </button>
            {isOpen && (
                <div>
                    {entries.map(([key, value]) => (
                        <JsonNode key={key} nodeKey={key} data={value} />
                    ))}
                    <div className="text-text-secondary ml-4">{bracket[1]}</div>
                </div>
            )}
        </div>
    );
};

export const JsonTreeNavigator: React.FC<{ initialData?: object }> = ({ initialData }) => {
    const defaultJson = '{\n  "id": "devcore-001",\n  "active": true,\n  "features": [\n    "ai-explainer",\n    "api-tester"\n  ],\n  "config": {\n    "theme": "dark",\n    "version": 1\n  }\n}';
    const [jsonInput, setJsonInput] = useState(initialData ? JSON.stringify(initialData, null, 2) : defaultJson);
    const [parsedData, setParsedData] = useState<any>(() => {
        try {
            return JSON.parse(jsonInput);
        } catch {
            return null;
        }
    });
    const [error, setError] = useState('');

    const parseJson = (input: string) => {
        try {
            const parsed = JSON.parse(input);
            setParsedData(parsed);
            setError('');
        } catch (e) {
            if (e instanceof Error) setError(e.message);
            setParsedData(null);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setJsonInput(e.target.value);
        parseJson(e.target.value);
    }
    
    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <FileCodeIcon />
                    <span className="ml-3">JSON Tree Navigator</span>
                </h1>
                <p className="text-text-secondary mt-1">Paste your JSON data to visualize it as a collapsible tree.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col h-2/5 min-h-[200px]">
                    <label htmlFor="json-input" className="text-sm font-medium text-text-secondary mb-2">JSON Input</label>
                    <textarea
                        id="json-input"
                        value={jsonInput}
                        onChange={handleInputChange}
                        className={`flex-grow p-4 bg-surface border ${error ? 'border-red-500' : 'border-border'} rounded-md resize-y font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none`}
                    />
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
                 <div className="flex flex-col flex-grow min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">Tree View</label>
                    <div className="flex-grow p-4 bg-surface border border-border rounded-md overflow-y-auto font-mono text-sm">
                        {parsedData ? <JsonNode data={parsedData} nodeKey="root" isRoot /> : <div className="text-text-secondary">Enter valid JSON to view</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};