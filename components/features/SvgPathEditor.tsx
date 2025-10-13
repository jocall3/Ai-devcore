import React, { useState, useRef } from 'react';
import { CodeBracketSquareIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { downloadFile } from '../../services/fileUtils.ts';

const initialPath = "M 20 80 Q 100 20 180 80 T 340 80";

const parsePath = (d: string) => {
    const commands = d.match(/[a-df-z][^a-df-z]*/ig) || [];
    return commands.map((cmdStr, i) => {
        const command = cmdStr[0];
        const args = cmdStr.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
        const points = [];
        for (let j = 0; j < args.length; j += 2) {
            points.push({ x: args[j], y: args[j + 1] });
        }
        return { id: i, command, points };
    });
};

const buildPath = (parsed: any[]) => {
    return parsed.map(cmd => `${cmd.command} ${cmd.points.map((p:any) => `${p.x} ${p.y}`).join(' ')}`).join(' ');
};

export const SvgPathEditor: React.FC = () => {
    const [pathData, setPathData] = useState(initialPath);
    const svgRef = useRef<SVGSVGElement>(null);
    const [draggingPoint, setDraggingPoint] = useState<any>(null);
    const parsedPath = parsePath(pathData);

    const handleMouseDown = (e: React.MouseEvent, cmdIndex: number, pointIndex: number) => {
        e.stopPropagation();
        setDraggingPoint({ cmdIndex, pointIndex });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingPoint || !svgRef.current) return;
        const pt = new DOMPoint(e.clientX, e.clientY);
        const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        
        const newParsedPath = parsedPath.map((cmd, cIdx) => {
            if (cIdx === draggingPoint.cmdIndex) {
                const newPoints = cmd.points.map((p, pIdx) => {
                    if (pIdx === draggingPoint.pointIndex) {
                        return { x: Math.round(svgPoint.x), y: Math.round(svgPoint.y) };
                    }
                    return p;
                });
                return { ...cmd, points: newPoints };
            }
            return cmd;
        });
        setPathData(buildPath(newParsedPath));
    };
    
    const handleMouseUp = () => setDraggingPoint(null);
    
    const handleAddPoint = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const pt = new DOMPoint(e.clientX, e.clientY);
        const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        const newPathData = `${pathData} L ${Math.round(svgPoint.x)} ${Math.round(svgPoint.y)}`;
        setPathData(newPathData);
    };

    const handleDownload = () => {
        const svgContent = `<svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg">
  <path d="${pathData}" stroke="black" fill="transparent" stroke-width="2"/>
</svg>`;
        downloadFile(svgContent, 'path.svg', 'image/svg+xml');
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><CodeBracketSquareIcon /><span className="ml-3">SVG Path Editor</span></h1><p className="text-text-secondary mt-1">Visually create and manipulate SVG path data by dragging points.</p></header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
                <div className="flex flex-col h-full overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="path-input" className="text-sm font-medium text-text-secondary">Path Data (d attribute)</label>
                         <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200">
                            <ArrowDownTrayIcon className="w-4 h-4"/> Download SVG
                        </button>
                    </div>
                    <textarea id="path-input" value={pathData} onChange={(e) => setPathData(e.target.value)} className="h-24 p-4 bg-surface border border-border rounded-md resize-y font-mono text-sm text-primary" />
                     <div className="flex-grow mt-4 p-4 bg-surface border-2 border-dashed border-border rounded-md overflow-hidden flex items-center justify-center min-h-[200px]">
                        <svg ref={svgRef} viewBox="0 0 400 160" className="w-full h-full cursor-crosshair" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onDoubleClick={handleAddPoint}>
                           <rect width="400" height="160" fill="var(--color-background)" />
                            <path d={pathData} stroke="var(--color-primary)" fill="transparent" strokeWidth="2" />
                            {parsedPath.flatMap((cmd, cmdIndex) => 
                                cmd.points.map((p, pointIndex) => (
                                    <circle
                                        key={`${cmd.id}-${pointIndex}`}
                                        cx={p.x}
                                        cy={p.y}
                                        r="5"
                                        fill={cmd.command.toLowerCase() === 'c' || cmd.command.toLowerCase() === 'q' || cmd.command.toLowerCase() === 's' || cmd.command.toLowerCase() === 't' ? '#fde047' : '#f87171'}
                                        stroke="var(--color-surface)"
                                        strokeWidth="2"
                                        className="cursor-move hover:stroke-primary"
                                        onMouseDown={(e) => handleMouseDown(e, cmdIndex, pointIndex)}
                                    />
                                ))
                            )}
                        </svg>
                    </div>
                    <p className="text-xs text-center text-text-secondary mt-2">Double-click on the canvas to add a new point.</p>
                </div>
                <div className="flex flex-col h-full">
                    <label className="text-sm font-medium text-text-secondary mb-2">Parsed Commands</label>
                    <div className="flex-grow p-2 bg-background border border-border rounded-md overflow-y-auto font-mono text-xs space-y-2">
                        {parsedPath.map(cmd => (
                            <div key={cmd.id} className="p-2 bg-surface rounded">
                                <span className="font-bold text-amber-600">{cmd.command}</span>
                                <span className="text-text-secondary"> {cmd.points.map(p => `(${p.x},${p.y})`).join(' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};