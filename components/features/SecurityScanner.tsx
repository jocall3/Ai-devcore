import React, { useState } from 'react';
import { analyzeCodeForVulnerabilities } from '../../services/aiService.ts';
import { runStaticScan, SecurityIssue } from '../../services/security/staticAnalysisService.ts';
import type { SecurityVulnerability } from '../../types.ts';
import { ShieldCheckIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

const exampleCode = `function UserProfile({ user }) {
  // TODO: remove this temporary api key
  const API_KEY = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx";
  const userContent = user.bio; // This might contain malicious scripts

  return (
    <div>
      <h2>{user.name}</h2>
      <div dangerouslySetInnerHTML={{ __html: userContent }} />
    </div>
  );
}`;

export const SecurityScanner: React.FC = () => {
    const [code, setCode] = useState(exampleCode);
    const [localIssues, setLocalIssues] = useState<SecurityIssue[]>([]);
    const [aiIssues, setAiIssues] = useState<SecurityVulnerability[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleScan = async () => {
        if (!code.trim()) {
            setError('Please enter code to scan.');
            return;
        }
        setIsLoading(true);
        setError('');
        setLocalIssues([]);
        setAiIssues([]);
        try {
            // Run local scan first
            const staticIssues = runStaticScan(code);
            setLocalIssues(staticIssues);
            
            // Then run AI scan
            const geminiIssues = await analyzeCodeForVulnerabilities(code);
            setAiIssues(geminiIssues);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during scanning.');
        } finally {
            setIsLoading(false);
        }
    };

    const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
        const colors: Record<string, string> = {
            'Critical': 'bg-red-500 text-white',
            'High': 'bg-red-400 text-white',
            'Medium': 'bg-yellow-400 text-yellow-900',
            'Low': 'bg-blue-400 text-white',
            'Informational': 'bg-gray-400 text-gray-900',
        };
        return <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${colors[severity] || 'bg-gray-300'}`}>{severity}</span>
    }

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><ShieldCheckIcon /><span className="ml-3">AI Security Co-Pilot</span></h1>
                <p className="text-text-secondary mt-1">Find vulnerabilities in your code with static analysis and AI.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="flex flex-col">
                    <label className="text-sm mb-2">Code to Scan</label>
                    <textarea value={code} onChange={e => setCode(e.target.value)} className="w-full flex-grow p-2 bg-surface border rounded font-mono text-xs" />
                    <button onClick={handleScan} disabled={isLoading} className="btn-primary w-full mt-4 py-2 flex justify-center items-center gap-2">{isLoading ? <LoadingSpinner/> : 'Scan Code'}</button>
                </div>
                <div className="flex flex-col bg-surface p-4 border rounded-lg">
                    <h3 className="text-lg font-bold mb-2">Scan Results</h3>
                    {error && <p className="text-red-500">{error}</p>}
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        {isLoading && <div className="flex justify-center items-center h-full"><LoadingSpinner/></div>}
                        {!isLoading && localIssues.length === 0 && aiIssues.length === 0 && <p className="text-text-secondary text-center mt-8">No issues found. Run a scan to begin.</p>}
                        
                        {localIssues.length > 0 && <div>
                            <h4 className="font-semibold text-sm mb-1">Static Analysis Findings</h4>
                            {localIssues.map((issue, i) => <div key={`local-${i}`} className="p-2 bg-background border rounded mb-2"><p className="font-bold flex items-center gap-2">{issue.type} <SeverityBadge severity={issue.severity} /></p><p className="text-xs">Line {issue.line}: {issue.description}</p></div>)}
                        </div>}

                         {aiIssues.length > 0 && <div>
                            <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><SparklesIcon/> AI-Powered Findings</h4>
                            {aiIssues.map((issue, i) => (
                                <details key={`ai-${i}`} className="p-2 bg-background border rounded mb-2">
                                    <summary className="cursor-pointer font-bold flex items-center gap-2">{issue.vulnerability} <SeverityBadge severity={issue.severity} /></summary>
                                    <div className="mt-2 pt-2 border-t text-xs space-y-2">
                                        <p><strong>Description:</strong> {issue.description}</p>
                                        <p><strong>Mitigation:</strong> {issue.mitigation}</p>
                                        {issue.exploitSuggestion && (
                                            <div>
                                                <strong>Exploit Simulation:</strong>
                                                <div className="mt-1 p-2 bg-gray-50 rounded">
                                                     <MarkdownRenderer content={'```bash\n' + issue.exploitSuggestion + '\n```'}/>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>}
                    </div>
                </div>
            </div>
        </div>
    );
};