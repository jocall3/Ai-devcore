import React, { useState, useMemo } from 'react';
import { CodeBracketSquareIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { downloadFile } from '../../services/index.ts';

const initialSettings = { rows: 3, cols: 4, rowGap: 1, colGap: 1 };

export const CssGridEditor: React.FC = () => {
    const [rows, setRows] = useState(initialSettings.rows);
    const [cols, setCols] = useState(initialSettings.cols);
    const [rowGap, setRowGap] = useState(initialSettings.rowGap);
    const [colGap, setColGap] = useState(initialSettings.colGap);

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: `${rowGap}rem ${colGap}rem`,
        height: '100%',
        width: '100%'
    };

    const cssCode = useMemo(() => {
        return `.grid-container {
  display: grid;
  grid-template-columns: repeat(${cols}, 1fr);
  grid-template-rows: repeat(${rows}, 1fr);
  gap: ${rowGap}rem ${colGap}rem;
}`;
    }, [rows, cols, rowGap, colGap]);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(cssCode);
    };
    
    const handleDownload = () => {
        downloadFile(cssCode, 'grid.css', 'text/css');
    };

    const handleReset = () => {
        setRows(initialSettings.rows);
        setCols(initialSettings.cols);
        setRowGap(initialSettings.rowGap);
        setColGap(initialSettings.colGap);
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <CodeBracketSquareIcon />
                    <span className="ml-3">CSS Grid Visual Editor</span>
                </h1>
                <p className="text-text-secondary mt-1">Configure your grid layout and copy the generated CSS.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                <div className="lg:col-span-1 flex flex-col gap-4 bg-surface border border-border p-6 rounded-lg overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">Controls</h3>
                        <button onClick={handleReset} className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md">Reset</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="rows" className="block text-sm font-medium text-text-secondary">Rows ({rows})</label>
                            <input id="rows" type="range" min="1" max="12" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div>
                            <label htmlFor="cols" className="block text-sm font-medium text-text-secondary">Columns ({cols})</label>
                            <input id="cols" type="range" min="1" max="12" value={cols} onChange={e => setCols(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                         <div>
                            <label htmlFor="rowGap" className="block text-sm font-medium text-text-secondary">Row Gap ({rowGap}rem)</label>
                            <input id="rowGap" type="range" min="0" max="8" step="0.25" value={rowGap} onChange={e => setRowGap(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                         <div>
                            <label htmlFor="colGap" className="block text-sm font-medium text-text-secondary">Column Gap ({colGap}rem)</label>
                            <input id="colGap" type="range" min="0" max="8" step="0.25" value={colGap} onChange={e => setColGap(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                     <div className="flex-grow mt-4 flex flex-col min-h-[150px]">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-text-secondary">Generated CSS</label>
                            <div className="flex gap-2">
                                <button onClick={handleCopy} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-xs">Copy</button>
                                <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-xs"><ArrowDownTrayIcon className="w-4 h-4"/> Download</button>
                            </div>
                        </div>
                        <div className="relative flex-grow">
                            <pre className="bg-background p-4 rounded-md text-primary text-sm overflow-auto h-full w-full absolute">{cssCode}</pre>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-background rounded-lg p-4 border-2 border-dashed border-border">
                    <div style={gridStyle}>
                        {Array.from({ length: rows * cols }).map((_, i) => (
                            <div key={i} className="bg-primary/10 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center text-primary">
                                <span className="text-xs opacity-70">{i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};