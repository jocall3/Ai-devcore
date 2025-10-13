
import React, { useState, useMemo, useCallback } from 'react';
import { generatePrSummaryStructured, generateTechnicalSpecFromDiff, downloadFile } from '../../services/index.ts';
import { createDocument, insertText } from '../../services/workspaceService.ts';
import type { StructuredPrSummary } from '../../types.ts';
import { AiPullRequestAssistantIcon, DocumentIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';

const exampleDiff = `--- a/src/components/Greeter.js
+++ b/src/components/Greeter.js
@@ -1,6 +1,7 @@
 function Greeter(props) {
-  return <h1>Hello, {props.name}!</h1>;
+  const { name, enthusiasmLevel = 1 } = props;
+  const punctuation = '!'.repeat(enthusiasmLevel);
+  return <h1>Hello, {name}{punctuation}</h1>;
 }`;

export const AiPullRequestAssistant: React.FC = () => {
    const [diff, setDiff] = useState<string>(exampleDiff);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [summary, setSummary] = useState<StructuredPrSummary | null>(null);

    const { addNotification } = useNotification();
    const { state } = useGlobalState();
    const { user } = state;

    const handleGenerateSummary = useCallback(async () => {
        if (!diff.trim()) {
            setError('Please provide a diff to generate a summary.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSummary(null);
        
        try {
            const result: StructuredPrSummary = await generatePrSummaryStructured(diff);
            setSummary(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate summary: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [diff]);

    const handleExportToDocs = async () => {
        if (!summary || !user) {
            addNotification('Please generate a summary first and ensure you are signed in.', 'error');
            return;
        }
        setIsExporting(true);
        try {
            const specContent = await generateTechnicalSpecFromDiff(diff, summary);
            const doc = await createDocument(`Tech Spec: ${summary.title}`);
            await insertText(doc.documentId, specContent);
            addNotification('Successfully exported to Google Docs!', 'success');
            window.open(doc.webViewLink, '_blank');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            addNotification(`Failed to export: ${errorMessage}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };
    
    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <AiPullRequestAssistantIcon />
                    <span className="ml-3">AI Pull Request Assistant</span>
                </h1>
                <p className="text-text-secondary mt-1">Generate a PR summary from a git diff and export a full tech spec.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Left side: Inputs and Generator */}
                <div className="flex flex-col gap-4 min-h-0">
                    <div className="flex flex-col flex-1 min-h-0">
                        <label htmlFor="diff-input" className="text-sm font-medium text-text-secondary mb-2">Git Diff</label>
                        <textarea
                            id="diff-input"
                            value={diff}
                            onChange={e => setDiff(e.target.value)}
                            className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm"
                        />
                    </div>
                    <button onClick={handleGenerateSummary} disabled={isLoading} className="btn-primary w-full flex items-center justify-center px-6 py-3">
                        {isLoading ? <LoadingSpinner /> : 'Generate Summary'}
                    </button>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                </div>

                {/* Right side: Summary and Export */}
                <div className="flex flex-col gap-4 min-h-0">
                    <div className="flex flex-col bg-surface border border-border p-4 rounded-lg flex-grow min-h-0">
                        <h3 className="text-lg font-bold mb-2">Generated Summary</h3>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                            {summary ? (
                                <>
                                    <input type="text" readOnly value={summary.title} className="w-full font-bold p-2 bg-background rounded"/>
                                    <textarea readOnly value={summary.summary} className="w-full h-24 p-2 bg-background rounded resize-none"/>
                                    <div>
                                        <h4 className="font-semibold">Changes:</h4>
                                        <ul className="list-disc list-inside text-sm">
                                            {summary.changes.map((c, i) => <li key={i}>{c}</li>)}
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <div className="text-text-secondary h-full flex items-center justify-center">
                                    {isLoading ? <LoadingSpinner /> : 'PR summary will appear here.'}
                                </div>
                            )}
                        </div>
                         {summary && user && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <button onClick={handleExportToDocs} disabled={isExporting} className="w-full btn-primary bg-blue-600 flex items-center justify-center gap-2 py-2">
                                    {isExporting ? <LoadingSpinner /> : <><DocumentIcon /> Export to Google Docs</>}
                                </button>
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};