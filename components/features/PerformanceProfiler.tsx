import React, { useState, useCallback } from 'react';
import { analyzePerformanceTrace } from '../../services/index.ts';
import { startTracing, stopTracing, TraceEntry } from '../../services/profiling/performanceService.ts';
import { parseViteStats, BundleStatsNode } from '../../services/profiling/bundleAnalyzer.ts';
import { ChartBarIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

const FlameChart: React.FC<{ trace: TraceEntry[] }> = ({ trace }) => {
    if (trace.length === 0) return <p className="text-text-secondary">No trace data collected.</p>;
    const maxTime = Math.max(...trace.map(t => t.startTime + t.duration));
    return (
        <div className="space-y-1 font-mono text-xs">
            {trace.filter(t => t.entryType === 'measure').map((entry, i) => (
                <div key={i} className="group relative h-6 bg-primary/20 rounded">
                    <div className="h-full bg-primary" style={{ marginLeft: `${(entry.startTime / maxTime) * 100}%`, width: `${(entry.duration / maxTime) * 100}%` }}></div>
                    <div className="absolute inset-0 px-2 flex items-center text-primary font-bold">{entry.name} ({entry.duration.toFixed(1)}ms)</div>
                </div>
            ))}
        </div>
    );
};

export const PerformanceProfiler: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'runtime' | 'bundle'>('runtime');
    const [isTracing, setIsTracing] = useState(false);
    const [trace, setTrace] = useState<TraceEntry[]>([]);
    const [bundleStats, setBundleStats] = useState<string>('');
    const [bundleTree, setBundleTree] = useState<BundleStatsNode | null>(null);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState('');

    const handleTraceToggle = () => {
        if (isTracing) {
            const collectedTrace = stopTracing();
            setTrace(collectedTrace);
            setIsTracing(false);
        } else {
            setTrace([]);
            startTracing();
            setIsTracing(true);
        }
    };

    const handleAnalyzeBundle = () => {
        try {
            setBundleTree(parseViteStats(bundleStats));
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Parsing failed.');
        }
    };
    
    const handleAiAnalysis = async () => {
        const dataToAnalyze = activeTab === 'runtime' ? trace : bundleTree;
        if (!dataToAnalyze || (Array.isArray(dataToAnalyze) && dataToAnalyze.length === 0)) {
            alert('No data to analyze.');
            return;
        }
        setIsLoadingAi(true);
        setAiAnalysis('');
        try {
            const analysis = await analyzePerformanceTrace(dataToAnalyze);
            setAiAnalysis(analysis);
        } catch (e) {
            setAiAnalysis('Error getting analysis from AI.');
        } finally {
            setIsLoadingAi(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><ChartBarIcon /><span className="ml-3">AI Performance Profiler</span></h1><p className="text-text-secondary mt-1">Analyze runtime performance and bundle sizes with AI insights.</p></header>
            <div className="flex border-b border-border mb-4"><button onClick={() => setActiveTab('runtime')} className={`px-4 py-2 text-sm ${activeTab === 'runtime' ? 'border-b-2 border-primary' : ''}`}>Runtime Performance</button><button onClick={() => setActiveTab('bundle')} className={`px-4 py-2 text-sm ${activeTab === 'bundle' ? 'border-b-2 border-primary' : ''}`}>Bundle Analysis</button></div>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="bg-surface p-4 border border-border rounded-lg flex flex-col">
                    {activeTab === 'runtime' ? (
                        <>
                            <button onClick={handleTraceToggle} className="btn-primary mb-4 py-2">{isTracing ? 'Stop Tracing' : 'Start Tracing'}</button>
                            <div className="flex-grow overflow-y-auto"><FlameChart trace={trace} /></div>
                        </>
                    ) : (
                         <>
                            <textarea value={bundleStats} onChange={e => setBundleStats(e.target.value)} placeholder="Paste your stats.json content here" className="w-full h-48 p-2 bg-background border rounded font-mono text-xs mb-2"/>
                            <button onClick={handleAnalyzeBundle} className="btn-primary py-2">Analyze Bundle</button>
                            <div className="flex-grow overflow-y-auto mt-2">
                                <pre className="text-xs">{bundleTree ? JSON.stringify(bundleTree, null, 2) : 'Analysis will appear here.'}</pre>
                            </div>
                        </>
                    )}
                </div>
                 <div className="bg-surface p-4 border border-border rounded-lg flex flex-col">
                    <button onClick={handleAiAnalysis} disabled={isLoadingAi} className="btn-primary flex items-center justify-center gap-2 py-2 mb-4"><SparklesIcon />{isLoadingAi ? 'Analyzing...' : 'Get AI Optimization Suggestions'}</button>
                    <div className="flex-grow bg-background border border-border rounded p-2 overflow-y-auto">
                        {isLoadingAi ? <div className="flex justify-center items-center h-full"><LoadingSpinner/></div> : <MarkdownRenderer content={aiAnalysis} />}
                    </div>
                 </div>
            </div>
        </div>
    );
};