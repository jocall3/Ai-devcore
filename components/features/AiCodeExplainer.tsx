/**
 * @file AiCodeExplainer.tsx
 * @description A feature component that uses AI to provide a detailed, structured analysis of a code snippet.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import mermaid from 'mermaid';
import { generateJson, generateContent } from '../../services/index.ts';
import type { StructuredExplanation } from '../../types.ts';
import { CpuChipIcon } from '../icons.tsx';
import { MarkdownRenderer, LoadingSpinner } from '../shared/index.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';

/**
 * An example code snippet to display when the component first loads.
 * @type {string}
 */
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

/**
 * The possible tabs for displaying different parts of the code explanation.
 * @typedef {'summary' | 'lineByLine' | 'complexity' | 'suggestions' | 'flowchart'} ExplanationTab
 */
type ExplanationTab = 'summary' | 'lineByLine' | 'complexity' | 'suggestions' | 'flowchart';

/**
 * A simple syntax highlighter for displaying code in a <pre> tag.
 * This is a lightweight alternative to a full syntax highlighting library.
 * @param {string} code - The code string to highlight.
 * @returns {string} The HTML string with syntax highlighting spans.
 * @example
 * const highlighted = simpleSyntaxHighlight('const x = 1;');
 * // returns '<span class="text-indigo-400 font-semibold">const</span> x = 1;'
 */
const simpleSyntaxHighlight = (code: string) => {
    const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return escapedCode
        .replace(/\b(const|let|var|function|return|if|for|=>|import|from|export|default)\b/g, '<span class="text-indigo-400 font-semibold">$1</span>')
        .replace(/('.*?')|(".*?")|(`.*?`)/g, '<span class="text-emerald-400">$&</span>')
        .replace(/(\s*\/\/.*)/g, '<span class="text-gray-400 italic">$1</span>')
        .replace(/(\{|\}|\(|\)|\[|\])/g, '<span class="text-gray-400">$1</span>');
};

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });

/**
 * Interface for the props of the AiCodeExplainer component.
 * @interface AiCodeExplainerProps
 */
interface AiCodeExplainerProps {
  /**
   * An optional initial code snippet to load and analyze when the component mounts.
   * @type {string}
   * @optional
   */
  initialCode?: string;
}

/**
 * A React component that allows users to input a code snippet and receive a multi-faceted
 * AI-powered explanation, including a summary, line-by-line analysis, complexity assessment,
 * improvement suggestions, and a visual flowchart.
 *
 * @param {AiCodeExplainerProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered AiCodeExplainer component.
 * @example
 * <AiCodeExplainer initialCode="const x = () => 'hello';" />
 */
export const AiCodeExplainer: React.FC<AiCodeExplainerProps> = ({ initialCode }) => {
    const [code, setCode] = useState<string>(initialCode || exampleCode);
    const [explanation, setExplanation] = useState<StructuredExplanation | null>(null);
    const [mermaidCode, setMermaidCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<ExplanationTab>('summary');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const mermaidContainerRef = useRef<HTMLDivElement>(null);
    const { requestUnlock } = useVaultModal();

    /**
     * Fetches and displays the AI-powered analysis for the given code.
     * Handles vault-locked errors by prompting the user to unlock and then retrying.
     * @param {string} codeToExplain - The code snippet to analyze.
     * @param {boolean} [isRetry=false] - A flag to indicate if this is a retry after unlocking the vault.
     * @returns {Promise<void>}
     */
    const handleExplain = useCallback(async (codeToExplain: string, isRetry: boolean = false) => {
        if (!codeToExplain.trim()) {
            setError('Please enter some code to explain.');
            return;
        }
        setIsLoading(true);
        setError('');
        if (!isRetry) {
            setExplanation(null);
            setMermaidCode('');
            setActiveTab('summary');
        }

        const explainCodeStructured = async (code: string): Promise<StructuredExplanation> => {
            const schema = {
                type: "OBJECT",
                properties: {
                  summary: { type: "STRING", description: "A high-level summary of what the code does, including its purpose and overall approach." },
                  lineByLine: {
                    type: "ARRAY",
                    description: "A detailed, line-by-line or block-by-block breakdown of the code.",
                    items: {
                      type: "OBJECT",
                      properties: {
                        lines: { type: "STRING", description: "The line number or range (e.g., '1-5')." },
                        explanation: { type: "STRING", description: "The explanation for that specific line or block." }
                      },
                      required: ["lines", "explanation"]
                    }
                  },
                  complexity: {
                    type: "OBJECT",
                    description: "Big O notation for time and space complexity.",
                    properties: {
                      time: { type: "STRING", description: "The time complexity (e.g., 'O(n^2)')." },
                      space: { type: "STRING", description: "The space complexity (e.g., 'O(1)')." }
                    },
                    required: ["time", "space"]
                  },
                  suggestions: {
                    type: "ARRAY",
                    description: "A list of suggestions for improvement, such as refactoring, performance optimizations, or best practices.",
                    items: { type: "STRING" }
                  }
                },
                required: ["summary", "lineByLine", "complexity", "suggestions"]
            };
        
            const prompt = `Analyze this code and provide a structured explanation according to the provided JSON schema:\n\n\`\`\`\n${code}\n\`\`\``;
            const systemInstruction = "You are an expert software engineer providing a structured analysis of a code snippet. You must respond with a valid JSON object that adheres to the provided schema.";
        
            return generateJson<StructuredExplanation>(prompt, systemInstruction, schema);
        };
        
        const generateMermaidJs = (code: string): Promise<string> => {
            const prompt = `Based on the following code, generate a Mermaid.js flowchart diagram that visually represents its logic. Only output the Mermaid code inside a \`\`\`mermaid block. Do not include any other text or explanation.
            
            Code:
            \`\`\`
            ${code}
            \`\`\`
            `;
            const systemInstruction = "You are a code analysis tool that generates Mermaid.js diagrams.";
            return generateContent(prompt, systemInstruction);
        };
        
        try {
            const [explanationResult, mermaidResult] = await Promise.all([
                explainCodeStructured(codeToExplain),
                generateMermaidJs(codeToExplain)
            ]);
            setExplanation(explanationResult);
            setMermaidCode(mermaidResult.replace(/```mermaid\n?|```/g, ''));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            
            if (errorMessage.includes('Vault is locked') || errorMessage.includes('API key not found')) {
                setError('Your password vault is locked. Please unlock it to use AI features.');
                const unlocked = await requestUnlock();
                if (unlocked) {
                    // If the user successfully unlocks the vault, retry the operation.
                    handleExplain(codeToExplain, true);
                    return; // Exit to avoid setting loading to false too early
                }
            } else {
                setError(`Failed to get explanation: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [requestUnlock]);
    
    /**
     * Effect to run analysis if an initial code snippet is provided via props.
     */
    useEffect(() => {
        if (initialCode) {
            setCode(initialCode);
            handleExplain(initialCode);
        }
    }, [initialCode, handleExplain]);

    /**
     * Effect to render the Mermaid.js flowchart when the corresponding tab is active.
     */
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


    /**
     * Synchronizes the scroll position between the hidden textarea and the visible pre element.
     * @returns {void}
     */
    const handleScroll = () => {
        if (preRef.current && textareaRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    /**
     * Memoized version of the highlighted code for performance.
     * @type {string}
     */
    const highlightedCode = useMemo(() => simpleSyntaxHighlight(code), [code]);

    /**
     * Renders the content for the currently active analysis tab.
     * @returns {React.ReactElement | null}
     */
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