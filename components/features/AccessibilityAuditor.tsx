import React, { useState, useRef } from 'react';
import { suggestA11yFix } from '../../services/index.ts';
import { runAxeAudit, AxeResult } from '../../services/auditing/accessibilityService.ts';
import { EyeIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

export const AccessibilityAuditor: React.FC = () => {
    const [url, setUrl] = useState('https://react.dev');
    const [auditUrl, setAuditUrl] = useState('');
    const [results, setResults] = useState<AxeResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState<string | null>(null);
    const [aiFixes, setAiFixes] = useState<Record<string, string>>({});
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleAudit = () => {
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        setAuditUrl(targetUrl);
        setIsLoading(true);
        setResults(null);
        setAiFixes({});
    };
    
    const handleIframeLoad = async () => {
        if (isLoading && iframeRef.current) {
            try {
                const auditResults = await runAxeAudit(iframeRef.current.contentWindow!.document);
                setResults(auditResults);
            } catch (error) {
                console.error(error);
                alert('Could not audit this page. This may be due to security restrictions (CORS).');
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleGetFix = async (issue: any) => {
        const issueId = issue.id;
        setIsLoadingAi(issueId);
        try {
            const fix = await suggestA11yFix(issue);
            setAiFixes(prev => ({...prev, [issueId]: fix}));
        } catch(e) {
            setAiFixes(prev => ({...prev, [issueId]: 'Could not get suggestion.'}));
        } finally {
            setIsLoadingAi(null);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><EyeIcon /><span className="ml-3">Automated Accessibility Auditor</span></h1><p className="text-text-secondary mt-1">Audit a live URL for accessibility issues and get AI-powered fixes.</p></header>
            <div className="flex gap-2 mb-4"><input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="flex-grow p-2 border rounded"/><button onClick={handleAudit} disabled={isLoading} className="btn-primary px-6 py-2">{isLoading ? 'Auditing...' : 'Audit'}</button></div>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="bg-background border-2 border-dashed border-border rounded-lg overflow-hidden"><iframe ref={iframeRef} src={auditUrl} title="Audit Target" className="w-full h-full bg-white" onLoad={handleIframeLoad} sandbox="allow-scripts allow-same-origin"/></div>
                <div className="bg-surface p-4 border border-border rounded-lg flex flex-col">
                    <h3 className="text-lg font-bold mb-2">Audit Results</h3>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {isLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner/></div>}
                        {results && (results.violations.length === 0 ? <p>No violations found!</p> :
                            results.violations.map((v, i) => (
                                <div key={v.id + i} className="p-3 mb-2 bg-background border border-border rounded">
                                    <p className="font-bold text-red-600">{v.help}</p>
                                    <p className="text-sm my-1">{v.description}</p>
                                    <button onClick={() => handleGetFix(v)} disabled={!!isLoadingAi} className="text-xs flex items-center gap-1 text-primary font-semibold"><SparklesIcon/> {isLoadingAi === v.id ? 'Getting fix...' : 'Ask AI for a fix'}</button>
                                    {aiFixes[v.id] && <div className="mt-2 text-xs border-t pt-2"><MarkdownRenderer content={aiFixes[v.id]}/></div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};