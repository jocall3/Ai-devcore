import React, { useState, useCallback } from 'react';
import * as Diff from 'diff';
import { applySpecificRefactor, refactorForPerformance, refactorForReadability, generateJsDoc, convertToFunctionalComponent } from '../../services/aiService.ts';
import { SparklesIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';

type RefactorAction = 'readability' | 'performance' | 'jsdoc' | 'functional' | 'custom';

const exampleCode = `const MyComponent = ({ data }) => {
  // A less readable component
  let transformedData = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].value > 50) {
      let item = { ...data[i], status: 'high' };
      transformedData.push(item);
    }
  }
  return (
    <div>
      {transformedData.map(d => <p key={d.id}>{d.name}</p>)}
    </div>
  );
}`;

const DiffViewer: React.FC<{ oldCode: string, newCode: string }> = ({ oldCode, newCode }) => {
    const diff = Diff.diffLines(oldCode, newCode);

    return (
        <pre className="whitespace-pre-wrap font-mono text-xs">
            {diff.map((part, index) => {
                const color = part.added ? 'bg-green-500/20' : part.removed ? 'bg-red-500/20' : 'bg-transparent';
                return <div key={index} className={color}>{part.value}</div>;
            })}
        </pre>
    );
};


export const OneClickRefactor: React.FC = () => {
    const [code, setCode] = useState(exampleCode);
    const [refactoredCode, setRefactoredCode] = useState('');
    const [loadingAction, setLoadingAction] = useState<RefactorAction | null>(null);

    const handleRefactor = useCallback(async (action: RefactorAction) => {
        if (!code.trim()) return;
        setLoadingAction(action);
        setRefactoredCode('');

        let stream;
        switch(action) {
            case 'readability':
                stream = refactorForReadability(code);
                break;
            case 'performance':
                stream = refactorForPerformance(code);
                break;
            case 'jsdoc':
                stream = generateJsDoc(code);
                break;
            case 'functional':
                stream = convertToFunctionalComponent(code);
                break;
            default:
                setLoadingAction(null);
                return;
        }

        try {
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setRefactoredCode(fullResponse.replace(/^```(?:\w+\n)?/, '').replace(/```$/, ''));
            }
        } catch (e) {
            console.error(e);
            setRefactoredCode(`// Error during refactoring: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
            setLoadingAction(null);
        }
    }, [code]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <SparklesIcon />
                    <span className="ml-3">One-Click Refactor</span>
                </h1>
                <p className="text-text-secondary mt-1">Apply common refactoring patterns to your code with a single click.</p>
            </header>
            <div className="flex items-center justify-center flex-wrap gap-2 mb-4 p-4 bg-surface rounded-lg border border-border">
                <button onClick={() => handleRefactor('readability')} disabled={!!loadingAction} className="btn-primary px-3 py-1.5 text-sm">{loadingAction === 'readability' ? <LoadingSpinner/> : 'Improve Readability'}</button>
                <button onClick={() => handleRefactor('performance')} disabled={!!loadingAction} className="btn-primary px-3 py-1.5 text-sm">{loadingAction === 'performance' ? <LoadingSpinner/> : 'Boost Performance'}</button>
                <button onClick={() => handleRefactor('jsdoc')} disabled={!!loadingAction} className="btn-primary px-3 py-1.5 text-sm">{loadingAction === 'jsdoc' ? <LoadingSpinner/> : 'Add JSDoc'}</button>
                <button onClick={() => handleRefactor('functional')} disabled={!!loadingAction} className="btn-primary px-3 py-1.5 text-sm">{loadingAction === 'functional' ? <LoadingSpinner/> : 'To Functional Component'}</button>
            </div>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2">Original Code</label>
                    <textarea value={code} onChange={e => setCode(e.target.value)} className="flex-grow p-2 bg-surface border rounded font-mono text-xs"/>
                </div>
                 <div className="flex flex-col">
                    <label className="text-sm font-medium mb-2">Refactored Code</label>
                    <div className="flex-grow p-2 bg-background border rounded overflow-auto">
                        {loadingAction ? <div className="flex justify-center items-center h-full"><LoadingSpinner/></div> : <DiffViewer oldCode={code} newCode={refactoredCode} />}
                    </div>
                </div>
            </div>
        </div>
    );
};
