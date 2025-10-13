import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ALL_FEATURES } from './index.ts';
import { FEATURE_TAXONOMY } from '../../services/taxonomyService.ts';
import { generatePipelineCode } from '../../services/aiService.ts';
import type { Feature } from '../../types.ts';
import { MapIcon, SparklesIcon, XMarkIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

interface Node {
    id: number;
    featureId: string;
    x: number;
    y: number;
}

interface Link {
    from: number;
    to: number;
}

const featuresMap = new Map(ALL_FEATURES.map(f => [f.id, f]));
const taxonomyMap = new Map(FEATURE_TAXONOMY.map(f => [f.id, f]));

const FeaturePaletteItem: React.FC<{ feature: Feature, onDragStart: (e: React.DragEvent, featureId: string) => void }> = ({ feature, onDragStart }) => (
    <div
        draggable
        onDragStart={e => onDragStart(e, feature.id)}
        className="p-3 rounded-md bg-gray-50 border border-border flex items-center gap-3 cursor-grab hover:bg-gray-100 transition-colors"
    >
        <div className="text-primary flex-shrink-0">{feature.icon}</div>
        <div>
            <h4 className="font-bold text-sm text-text-primary">{feature.name}</h4>
            <p className="text-xs text-text-secondary">{feature.category}</p>
        </div>
    </div>
);

const NodeComponent: React.FC<{
    node: Node;
    feature: Feature;
    onMouseDown: (e: React.MouseEvent, id: number) => void;
    onLinkStart: (e: React.MouseEvent, id: number) => void;
    onLinkEnd: (e: React.MouseEvent, id: number) => void;
}> = ({ node, feature, onMouseDown, onLinkStart, onLinkEnd }) => (
    <div
        className="absolute w-52 bg-surface rounded-lg shadow-md border-2 border-border cursor-grab active:cursor-grabbing flex flex-col"
        style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
        onMouseDown={e => onMouseDown(e, node.id)}
        onMouseUp={e => onLinkEnd(e, node.id)}
    >
        <div className="p-2 flex items-center gap-2 border-b border-border">
            <div className="w-5 h-5 text-primary">{feature.icon}</div>
            <span className="text-sm font-semibold truncate text-text-primary">{feature.name}</span>
        </div>
        <div className="relative p-3 text-xs text-text-secondary min-h-[40px] flex items-center justify-center">
            Workflow Node
            <div
                onMouseDown={e => onLinkStart(e, node.id)}
                className="absolute right-[-9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-surface cursor-crosshair hover:scale-125 transition-transform"
                title="Drag to connect"
            />
        </div>
    </div>
);

const SVGGrid: React.FC = React.memo(() => (
    <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0, 0, 0, 0.05)" strokeWidth="0.5"/>
            </pattern>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <rect width="50" height="50" fill="url(#smallGrid)"/>
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0, 0, 0, 0.1)" strokeWidth="1"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
));

export const LogicFlowBuilder: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [draggingNode, setDraggingNode] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
    const [linking, setLinking] = useState<{ from: number; fromPos: { x: number; y: number }; toPos: { x: number; y: number } } | null>(null);
    const [generatedCode, setGeneratedCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    
    const handleGenerateCode = useCallback(async () => {
        setIsGenerating(true);
        setGeneratedCode('');
        
        const sortedNodeIds: number[] = [];
        const inDegree = new Map<number, number>();
        nodes.forEach(node => inDegree.set(node.id, 0));
        links.forEach(link => inDegree.set(link.to, (inDegree.get(link.to) || 0) + 1));
        
        const queue = nodes.filter(node => inDegree.get(node.id) === 0).map(n => n.id);
        
        while(queue.length > 0) {
            const u = queue.shift()!;
            sortedNodeIds.push(u);
            links.filter(l => l.from === u).forEach(l => {
                inDegree.set(l.to, (inDegree.get(l.to) || 0) - 1);
                if(inDegree.get(l.to) === 0) queue.push(l.to);
            })
        }
        
        const flowDescription = sortedNodeIds.map((id, index) => {
            const node = nodes.find(n => n.id === id)!;
            const featureInfo = taxonomyMap.get(node.featureId);
            return `Step ${index + 1}: Execute the '${featureInfo?.name}' tool. Description: ${featureInfo?.description}. Inputs: ${featureInfo?.inputs}.`;
        }).join('\n');

        try {
            const code = await generatePipelineCode(flowDescription);
            setGeneratedCode(code);
        } catch (e) {
            setGeneratedCode(`// Error generating code: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
            setIsGenerating(false);
        }

    }, [nodes, links]);

    const handleDragStart = (e: React.DragEvent, featureId: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ featureId }));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!canvasRef.current) return;
        const { featureId } = JSON.parse(e.dataTransfer.getData('application/json'));
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const newNode: Node = {
            id: Date.now(),
            featureId,
            x: e.clientX - canvasRect.left,
            y: e.clientY - canvasRect.top,
        };
        setNodes(prev => [...prev, newNode]);
    };

    const handleNodeMouseDown = (e: React.MouseEvent, id: number) => {
        const node = nodes.find(n => n.id === id);
        if (!node || (e.target as HTMLElement).title === 'Drag to connect') return;
        const canvasRect = canvasRef.current!.getBoundingClientRect();
        setDraggingNode({ id, offsetX: e.clientX - canvasRect.left - node.x, offsetY: e.clientY - canvasRect.top - node.y });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        if (draggingNode) {
            setNodes(nodes.map(n => n.id === draggingNode.id ? { ...n, x: mouseX - draggingNode.offsetX, y: mouseY - draggingNode.offsetY } : n));
        }
        if (linking) {
            setLinking({ ...linking, toPos: { x: mouseX, y: mouseY } });
        }
    };

    const handleCanvasMouseUp = () => {
        setDraggingNode(null);
        setLinking(null);
    };

    const handleLinkStart = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const fromNode = nodes.find(n => n.id === id);
        if (!fromNode) return;
        setLinking({ from: id, fromPos: { x: fromNode.x, y: fromNode.y }, toPos: { x: fromNode.x, y: fromNode.y } });
    };

    const handleLinkEnd = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (linking && linking.from !== id) {
            setLinks(prev => [...prev, { from: linking.from, to: id }]);
        }
        setLinking(null);
    };

    const nodePositions = useMemo(() => new Map(nodes.map(n => [n.id, { x: n.x, y: n.y }])), [nodes]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold flex items-center"><MapIcon /><span className="ml-3">Logic Flow Builder</span></h1>
                    <p className="text-text-secondary mt-1">Visually build application logic flows and generate pipeline code.</p>
                </div>
                <button onClick={handleGenerateCode} disabled={isGenerating || nodes.length === 0} className="btn-primary flex items-center gap-2 px-4 py-2">
                    <SparklesIcon /> {isGenerating ? 'Generating...' : 'Generate Code'}
                </button>
            </header>
            <div className="flex-grow flex gap-6 min-h-0">
                <aside className="w-72 flex-shrink-0 bg-surface border border-border p-4 rounded-lg flex flex-col">
                    <h3 className="font-bold mb-3 text-lg">Features</h3>
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                        {ALL_FEATURES.map(feature => <FeaturePaletteItem key={feature.id} feature={feature} onDragStart={handleDragStart} />)}
                    </div>
                </aside>
                <main
                    ref={canvasRef}
                    className="flex-grow relative bg-background border-2 border-dashed border-border rounded-lg overflow-hidden"
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                >
                    <SVGGrid />
                    <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
                        {links.map((link, i) => {
                            const fromNode = nodePositions.get(link.from);
                            const toNode = nodePositions.get(link.to);
                            if (!fromNode || !toNode) return null;
                            return <line key={i} x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} stroke="var(--color-primary)" strokeWidth="2" markerEnd="url(#arrow)" />;
                        })}
                        {linking && <line x1={linking.fromPos.x} y1={linking.fromPos.y} x2={linking.toPos.x} y2={linking.toPos.y} stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="5,5" />}
                        <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-primary)" /></marker></defs>
                    </svg>
                    {nodes.map(node => {
                        const feature = featuresMap.get(node.featureId);
                        return feature ? <NodeComponent key={node.id} node={node} feature={feature} onMouseDown={handleNodeMouseDown} onLinkStart={handleLinkStart} onLinkEnd={handleLinkEnd} /> : null;
                    })}
                </main>
            </div>
            {(isGenerating || generatedCode) && (
                <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setGeneratedCode('')}>
                    <div className="w-full max-w-3xl h-3/4 bg-surface border border-border rounded-lg shadow-2xl p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Generated Pipeline Code</h2>
                            <button onClick={() => setGeneratedCode('')}><XMarkIcon/></button>
                        </div>
                        <div className="flex-grow bg-background border border-border rounded-md overflow-auto">
                            {isGenerating && !generatedCode ? <div className="flex justify-center items-center h-full"><LoadingSpinner /></div> : <MarkdownRenderer content={'```javascript\n' + generatedCode + '\n```'} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};