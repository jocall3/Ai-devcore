import React, { useState, useRef } from 'react';
import { MapIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { downloadFile } from '../../services/fileUtils.ts';

interface Column { id: number; name: string; type: string; }
interface Table { id: number; name: string; columns: Column[]; x: number; y: number; }

const exportToSQL = (tables: Table[]) => {
    return tables.map(table => {
        const columnsSQL = table.columns.map(col => `  "${col.name}" ${col.type.toUpperCase()}`).join(',\n');
        return `CREATE TABLE "${table.name}" (\n${columnsSQL}\n);`;
    }).join('\n\n');
};

export const SchemaDesigner: React.FC = () => {
    const [tables, setTables] = useState<Table[]>([
        { id: 1, name: 'users', columns: [{ id: 1, name: 'id', type: 'INTEGER PRIMARY KEY' }, {id: 2, name: 'username', type: 'VARCHAR(255)'}], x: 50, y: 50 },
        { id: 2, name: 'posts', columns: [{ id: 1, name: 'id', type: 'INTEGER PRIMARY KEY' }, {id: 2, name: 'user_id', type: 'INTEGER'}, {id: 3, name: 'content', type: 'TEXT'}], x: 300, y: 100 },
    ]);
    const [dragging, setDragging] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>, id: number) => {
        const tableElement = e.currentTarget;
        const rect = tableElement.getBoundingClientRect();
        setDragging({ id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
    };

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragging || !canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        setTables(tables.map(t => t.id === dragging.id ? { ...t, x: e.clientX - dragging.offsetX - canvasRect.left + canvasRef.current.scrollLeft, y: e.clientY - dragging.offsetY - canvasRect.top + canvasRef.current.scrollTop } : t));
    };

    const onMouseUp = () => setDragging(null);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><MapIcon /><span className="ml-3">Schema Designer</span></h1><p className="text-text-secondary mt-1">Visually design your database schema with drag-and-drop.</p></header>
            <div className="flex-grow flex gap-6 min-h-0">
                <main ref={canvasRef} className="flex-grow relative bg-background rounded-lg border-2 border-dashed border-border overflow-auto" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
                    {tables.map(table => (
                        <div key={table.id} className={`absolute w-64 bg-surface rounded-lg shadow-xl border cursor-grab active:cursor-grabbing ${dragging?.id === table.id ? 'border-primary' : 'border-border'}`} style={{ top: table.y, left: table.x }} onMouseDown={e => onMouseDown(e, table.id)}>
                            <h3 className="font-bold text-primary text-lg p-2 bg-gray-50 rounded-t-lg border-b border-border">{table.name}</h3>
                            <div className="p-2 space-y-1 font-mono text-xs">
                                {table.columns.map(col => (<div key={col.id} className="flex justify-between items-center"><span className="text-text-primary">{col.name}</span><span className="text-text-secondary">{col.type}</span></div>))}
                            </div>
                        </div>
                    ))}
                </main>
                <aside className="w-80 flex-shrink-0 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                         <button onClick={() => downloadFile(JSON.stringify(tables, null, 2), 'schema.json', 'application/json')} className="flex-1 text-sm py-2 bg-gray-100 border border-border rounded-md flex items-center justify-center gap-2 hover:bg-gray-200">
                            <ArrowDownTrayIcon className="w-4 h-4"/> Download JSON
                        </button>
                         <button onClick={() => downloadFile(exportToSQL(tables), 'schema.sql', 'application/sql')} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2">
                            <ArrowDownTrayIcon className="w-4 h-4"/> Download SQL
                         </button>
                    </div>
                    <div className="flex-grow bg-surface border border-border p-4 rounded-lg overflow-y-auto">
                        <h3 className="font-bold mb-2">Editor</h3>
                        <p className="text-xs text-text-secondary">Schema editing coming soon!</p>
                    </div>
                </aside>
            </div>
        </div>
    );
};