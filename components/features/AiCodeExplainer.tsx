import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import mermaid from 'mermaid';
import { explainCodeStructured, generateMermaidJs } from '../../services/index.ts';
import type { StructuredExplanation } from '../../types.ts';
import { CpuChipIcon } from '../icons.tsx';
import { MarkdownRenderer, LoadingSpinner } from '../shared/index.tsx';

const exampleCode = `const bubbleSort = (arr) => {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
};`;

type ExplanationTab = 'summary' | 'lineByLine' | 'complexity' | 'suggestions' | 'flowchart';

const simpleSyntaxHighlight = (code: string) => {
    const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return escapedCode
        .replace(/\b(const|let|var|function|return|if|for|=>|import|from|export|default)\b/g, '<span class="text-indigo-400 font-semibold">$1</span>')
        .replace(/(\`|'|")(.*?)(\`|'|")/g, '<span class="text-emerald-400">$1$2$3</span>')
        .replace(/(\/\/.*)/g, '<span class="text-gray-400 italic">$1</span>')
        .replace(/(\{|\}|\(|\)|\[|\])/g, '<span class="text-gray-400">$1</span>');
};

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });

export const AiCodeExplainer: React.FC<{ initialCode?: string }> = ({ initialCode }) => {
    const [code, setCode] = useState<string>(initialCode || exampleCode);
    const [explanation, setExplanation] = useState<StructuredExplanation | null>(null);
    const [mermaidCode, setMermaidCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<ExplanationTab>('summary');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const mermaidContainerRef = useRef<HTMLDivElement>(null);

    const handleExplain = useCallback(async (codeToExplain: string) => {
        if (!codeToExplain.trim()) {
            setError('Please enter some code to explain.');
            return;
        }
        setIsLoading(true);
        setError('');
        setExplanation(null);
        setMermaidCode('');
        setActiveTab('summary');
        try {
            const [explanationResult, mermaidResult] = await Promise.all([
                explainCodeStructured(codeToExplain),
                generateMermaidJs(codeToExplain)
            ]);
            setExplanation(explanationResult);
            setMermaidCode(mermaidResult.replace(/```mermaid\n|```/g, ''));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to get explanation: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        if (initialCode) {
            setCode(initialCode);
            handleExplain(initialCode);
        }
    }, [initialCode, handleExplain]);

    useEffect(() => {
        const renderMermaid = async () => {
             if (activeTab === 'flowchart' && mermaidCode && mermaidContainerRef.current) {
                try {
                    mermaidContainerRef.current.innerHTML = ''; // Clear previous
                    const { svg } = await mermaid.render(`mermaid-graph-${Date.now()}`, mermaidCode);
                    mermaidContainerRef.current.innerHTML = svg;
                } catch (e) {
                    console.error("Mermaid rendering error:", e);
                    mermaidContainerRef.current.innerHTML = `<p class="text-red-500">Error rendering flowchart.</p>`;
                }
            }
        }
        renderMermaid();
    }, [activeTab, mermaidCode]);


    const handleScroll = () => {
        if (preRef.current && textareaRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    const highlightedCode = useMemo(() => simpleSyntaxHighlight(code), [code]);

    const renderTabContent = () => {
        if (!explanation) return null;
        switch(activeTab) {
            case 'summary':
                return <MarkdownRenderer content={explanation.summary} />;
            case 'lineByLine':
                return (
                    <div className="space-y-3">
                        {explanation.lineByLine.map((item, index) => (
                            <div key={index} className="p-3 bg-background rounded-md border border-border">
                                <p className="font-mono text-xs text-primary mb-1">Lines: {item.lines}</p>
                                <p className="text-sm">{item.explanation}</p>
                            </div>
                        ))}
                    </div>
                );
            case 'complexity':
                return (
                    <div>
                        <p><strong>Time Complexity:</strong> <span className="font-mono text-amber-600">{explanation.complexity.time}</span></p>
                        <p><strong>Space Complexity:</strong> <span className="font-mono text-amber-600">{explanation.complexity.space}</span></p>
                    </div>
                );
            case 'suggestions':
                return (
                     <ul className="list-disc list-inside space-y-2">
                        {explanation.suggestions.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                );
            case 'flowchart':
                return (
                    <div ref={mermaidContainerRef} className="w-full h-full flex items-center justify-center">
                        <LoadingSpinner />
                    </div>
                );
        }
    }

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold flex items-center">
                    <CpuChipIcon />
                    <span className="ml-3">AI Code Explainer</span>
                </h1>
                <p className="text-text-secondary mt-1">Get a detailed, structured analysis of any code snippet.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                
                {/* Left Column: Code Input */}
                <div className="flex flex-col min-h-0 md:col-span-1">
                    <label htmlFor="code-input" className="text-sm font-medium text-text-secondary mb-2">Your Code</label>
                    <div className="relative flex-grow bg-surface border border-border rounded-md focus-within:ring-2 focus-within:ring-primary overflow-hidden">
                        <textarea
                            ref={textareaRef}
                            id="code-input"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onScroll={handleScroll}
                            placeholder="Paste your code here..."
                            spellCheck="false"
                            className="absolute inset-0 w-full h-full p-4 bg-transparent resize-none font-mono text-sm text-transparent caret-primary outline-none z-10"
                        />
                        <pre 
                            ref={preRef}
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full p-4 font-mono text-sm text-text-primary pointer-events-none z-0 whitespace-pre-wrap overflow-auto no-scrollbar"
                            dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
                        />
                    </div>
                    <div className="mt-4 flex-shrink-0">
                        <button
                            onClick={() => handleExplain(code)}
                            disabled={isLoading}
                            className="btn-primary w-full flex items-center justify-center px-6 py-3"
                        >
                            {isLoading ? <LoadingSpinner/> : 'Analyze Code'}
                        </button>
                    </div>
                </div>

                {/* Right Column: AI Analysis */}
                <div className="flex flex-col min-h-0 md:col-span-1">
                    <label className="text-sm font-medium text-text-secondary mb-2">AI Analysis</label>
                    <div className="relative flex-grow flex flex-col bg-surface border border-border rounded-md overflow-hidden">
                        <div className="flex-shrink-0 flex border-b border-border">
                           {(['summary', 'lineByLine', 'complexity', 'suggestions', 'flowchart'] as ExplanationTab[]).map(tab => (
                               <button key={tab} onClick={() => setActiveTab(tab)} disabled={!explanation}
                                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-background text-primary font-semibold' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500'}`}>
                                   {tab.replace(/([A-Z])/g, ' $1')}
                               </button>
                           ))}
                        </div>
                        <div className="p-4 flex-grow overflow-y-auto">
                            {isLoading && <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>}
                            {error && <p className="text-red-500">{error}</p>}
                            {explanation && !isLoading && renderTabContent()}
                            {!isLoading && !explanation && !error && <div className="text-text-secondary h-full flex items-center justify-center">The analysis will appear here.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};