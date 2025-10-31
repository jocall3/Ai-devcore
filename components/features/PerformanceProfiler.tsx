import React, { useState, useCallback } from 'react';

// AI Engine and Command imports based on the new architecture
// Assuming these paths are correct as per the ongoing refactor, despite missing source files in context.
import { aiEngineServiceInstance as aiEngineService } from '../../modules/ai-engine/ai-engine.service';
import { ICommand } from '../../modules/ai-engine/commands/i-command.interface';
import { IAIEngineProvider } from '../../modules/ai-engine/providers/i-ai-engine-provider.interface';

// Local utilities and services (not part of the CQRS refactor for AI calls)
import { startTracing, stopTracing, TraceEntry } from '../../services/profiling/performanceService.ts';
import { parseViteStats, BundleStatsNode } from '../../services/profiling/bundleAnalyzer.ts';

// UI components
import { ChartBarIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

// Hooks for global state and notifications
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';

/**
 * Command for analyzing performance traces using the AI engine.
 * This encapsulates the AI logic, decoupling it from the UI component.
 */
class AnalyzePerformanceTraceCommand implements ICommand<string> {
    constructor(private dataToAnalyze: TraceEntry[] | BundleStatsNode | null) {}

    /**
     * Executes the command using the provided AI provider.
     * @param provider An instance of a class that implements IAIEngineProvider.
     * @returns A promise that resolves with the AI's analysis in markdown format.
     */
    public async execute(provider: IAIEngineProvider): Promise<string> {
        if (!this.dataToAnalyze || (Array.isArray(this.dataToAnalyze) && this.dataToAnalyze.length === 0)) {
            return Promise.resolve("No data available to analyze.");
        }
        const prompt = `Analyze this performance data and provide optimization suggestions.\n\nData:\n${JSON.stringify(this.dataToAnalyze, null, 2)}`;
        const systemInstruction = `You are a web performance expert. Provide actionable advice in markdown format.`;
        return provider.generateContent(prompt, systemInstruction, 0.5);
    }
}

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

    const { state } = useGlobalState();
    const { vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();
    const { addNotification } = useNotification();

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
            addNotification(e instanceof Error ? e.message : 'Parsing failed.', 'error');
        }
    };
    
    const handleAiAnalysis = useCallback(async () => {
        const dataToAnalyze = activeTab === 'runtime' ? trace : bundleTree;
        if (!dataToAnalyze || (Array.isArray(dataToAnalyze) && dataToAnalyze.length === 0)) {
            addNotification('No data to analyze.', 'info');
            return;
        }
        setIsLoadingAi(true);
        setAiAnalysis('');

        try {
            if (!vaultState.isInitialized) {
                const created = await requestCreation();
                if (!created) {
                    throw new Error('Vault setup is required for AI features.');
                }
            }
            if (!vaultState.isUnlocked) {
                const unlocked = await requestUnlock();
                if (!unlocked) {
                    throw new Error('Vault must be unlocked for AI features.');
                }
            }

            const command = new AnalyzePerformanceTraceCommand(dataToAnalyze);
            const analysis = await aiEngineService.execute<string>(command);
            setAiAnalysis(analysis);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setAiAnalysis(`Error getting analysis from AI: ${errorMessage}`);
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoadingAi(false);
        }
    }, [activeTab, trace, bundleTree, vaultState, requestCreation, requestUnlock, addNotification]);

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