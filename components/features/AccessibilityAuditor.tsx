import React, { useState, useRef, useCallback } from 'react';
import { suggestA11yFix } from '../../services/index.ts';
import { runAxeAudit, AxeResult } from '../../services/auditing/accessibilityService.ts';
import { EyeIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';

export const AccessibilityAuditor: React.FC = () => {
    const [url, setUrl] = useState('https://react.dev');
    const [auditUrl, setAuditUrl] = useState('');
    const [results, setResults] = useState<AxeResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState<string | null>(null);
    const [aiFixes, setAiFixes] = useState<Record<string, string>>({});
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { requestUnlock } = useVaultModal();
    const { addNotification } = useNotification();

    const handleAudit = () => {
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        setAuditUrl(targetUrl);
        setIsLoading(true);
        setResults(null);
        setAiFixes({});
    };
    
    const handleIframeLoad = async () => {
        if (isLoading && iframeRef.current?.contentWindow) {
            try {
                const auditResults = await runAxeAudit(iframeRef.current.contentWindow.document);
                setResults(auditResults);
            } catch (error) {
                console.error(error);
                addNotification('Could not audit this page. This may be due to security restrictions (CORS).', 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleGetFix = useCallback(async (issue: any) => {
        const issueId = issue.id;
        setIsLoadingAi(issueId);
        try {
            const fix = await suggestA11yFix(issue);
            setAiFixes(prev => ({...prev, [issueId]: fix}));
        } catch(e) {
            const err = e as Error;
            if (err.message.includes('Vault is locked')) {
                addNotification('Vault is locked. Please unlock it to use AI features.', 'info');
                const unlocked = await requestUnlock();
                if (unlocked) {
                    handleGetFix(issue); // Retry the operation after unlocking
                    return; // Exit to avoid setting loading to false prematurely
                }
            }
            setAiFixes(prev => ({...prev, [issueId]: `Could not get suggestion: ${err.message}`}));
            addNotification(`AI suggestion failed: ${err.message}`, 'error');
        } finally {
            // This will now only run on the final attempt (success or failure), not before the retry.
            if (isLoadingAi === issueId) {
              setIsLoadingAi(null);
            }
        }
    }, [requestUnlock, addNotification, isLoadingAi]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><EyeIcon /><span className="ml-3">Automated Accessibility Auditor</span></h1><p className="text-text-secondary mt-1">Audit a live URL for accessibility issues and get AI-powered fixes.</p></header>
            <div className="flex gap-2 mb-4"><input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="flex-grow p-2 border rounded-md bg-surface border-border"/><button onClick={handleAudit} disabled={isLoading} className="btn-primary px-6 py-2">{isLoading ? 'Auditing...' : 'Audit'}</button></div>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="bg-background border-2 border-dashed border-border rounded-lg overflow-hidden"><iframe ref={iframeRef} src={auditUrl} title="Audit Target" className="w-full h-full bg-white" onLoad={handleIframeLoad} sandbox="allow-scripts allow-same-origin"/></div>
                <div className="bg-surface p-4 border border-border rounded-lg flex flex-col">
                    <h3 className="text-lg font-bold mb-2">Audit Results</h3>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {isLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner/></div>}
                        {results && (results.violations.length === 0 ? <p className="text-center text-text-secondary p-4">No violations found!</p> :
                            results.violations.map((v, i) => (
                                <div key={v.id + i} className="p-3 mb-2 bg-background border border-border rounded">
                                    <p className="font-bold text-red-600">{v.help}</p>
                                    <p className="text-sm my-1">{v.description}</p>
                                    <button onClick={() => handleGetFix(v)} disabled={!!isLoadingAi} className="text-xs flex items-center gap-1 text-primary font-semibold"><SparklesIcon/> {isLoadingAi === v.id ? 'Getting fix...' : 'Ask AI for a fix'}</button>
                                    {aiFixes[v.id] && <div className="mt-2 text-xs border-t border-border pt-2"><MarkdownRenderer content={aiFixes[v.id]}/></div>}
                                </div>
                            ))
                        )}
                        {!isLoading && !results && <p className="text-center text-text-secondary p-4">Enter a URL and click 'Audit' to begin.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};