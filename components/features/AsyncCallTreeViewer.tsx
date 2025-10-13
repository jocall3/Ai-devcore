

import React, { useState, useMemo } from 'react';
import { ChartBarIcon } from '../icons.tsx';

interface CallNode {
    name: string;
    duration: number;
    children?: CallNode[];
}

const exampleJson = `{
    "name": "startApp",
    "duration": 500,
    "children": [
        {
            "name": "fetchUserData",
            "duration": 300,
            "children": [
                { "name": "authenticate", "duration": 100 },
                { "name": "fetchProfile", "duration": 150 }
            ]
        },
        {
            "name": "loadInitialAssets",
            "duration": 450,
            "children": [
                { "name": "loadImage.png", "duration": 200 },
                { "name": "loadScript.js", "duration": 250 }
            ]
        }
    ]
}`;


const TreeNode: React.FC<{ node: CallNode, level: number, maxDuration: number }> = ({ node, level, maxDuration }) => {
    const [isOpen, setIsOpen] = React.useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="my-1">
            <div
                className="flex items-center p-2 rounded-md hover:bg-gray-100"
                style={{ paddingLeft: `${level * 20 + 8}px` }}
            >
                {hasChildren && (
                    <button onClick={() => setIsOpen(!isOpen)} className={`mr-2 text-text-secondary w-4 h-4 flex-shrink-0 transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                       ▶
                    </button>
                )}
                 {!hasChildren && <div className="w-6 mr-2 flex-shrink-0" />}
                 <div className="flex-grow flex items-center justify-between gap-4">
                    <span className="truncate">{node.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                         <div className="w-24 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-4 bg-primary" style={{ width: `${(node.duration / maxDuration) * 100}%` }}/>
                         </div>
                        <span className="text-primary w-16 text-right">{node.duration.toFixed(0)}ms</span>
                    </div>
                </div>
            </div>
            {isOpen && hasChildren && (
                <div>
                    {node.children!.map((child, index) => (
                        <TreeNode key={index} node={child} level={level + 1} maxDuration={maxDuration} />
                    ))}
                </div>
            )}
        </div>
    );
};


export const AsyncCallTreeViewer: React.FC = () => {
    const [jsonInput, setJsonInput] = useState(exampleJson);
    const [error, setError] = useState('');

    const { treeData, maxDuration } = useMemo(() => {
        try {
            const data: CallNode = JSON.parse(jsonInput);
             let max = 0;
            const findMax = (node: CallNode) => {
                if (node.duration > max) max = node.duration;
                if (node.children) node.children.forEach(findMax);
            };
            findMax(data);
            setError('');
            return { treeData: data, maxDuration: max };
        } catch (e) {
            setError('Invalid JSON format.');
            return { treeData: null, maxDuration: 0 };
        }
    }, [jsonInput]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl flex items-center">
                    <ChartBarIcon />
                    <span className="ml-3">Async Call Tree Viewer</span>
                </h1>
                <p className="text-text-secondary mt-1">Paste a JSON structure to visualize an asynchronous function call tree.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col h-2/5 min-h-[200px]">
                    <label htmlFor="json-input" className="text-sm font-medium text-text-secondary mb-2">JSON Input</label>
                    <textarea
                        id="json-input"
                        value={jsonInput}
                        onChange={e => setJsonInput(e.target.value)}
                        className={`flex-grow p-4 bg-surface border ${error ? 'border-red-500' : 'border-border'} rounded-md resize-y font-mono text-sm`}
                        spellCheck="false"
                    />
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
                <div className="flex flex-col flex-grow min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">Visual Tree</label>
                    <div className="flex-grow bg-surface p-4 rounded-lg text-sm overflow-y-auto border border-border">
                        {treeData ? <TreeNode node={treeData} level={0} maxDuration={maxDuration} /> : <div className="text-text-secondary">{error || 'Enter valid JSON to see the tree.'}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};