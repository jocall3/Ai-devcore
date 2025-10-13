import React, { useState, useEffect, useRef } from 'react';
import { EyeIcon } from '../icons.tsx';

const initialOldCode = `function UserProfile({ user }) {
  return (
    <div className="profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}`;

const initialNewCode = `function UserProfile({ user }) {
  const { name, email, avatar } = user;
  return (
    <div className="profile-card">
      <img src={avatar} alt={name} />
      <h2>{name}</h2>
      <a href={\`mailto:\${email}\`}>{email}</a>
    </div>
  );
}`;

export const CodeDiffGhost: React.FC = () => {
    const [oldCode, setOldCode] = useState(initialOldCode);
    const [newCode, setNewCode] = useState(initialNewCode);
    const [typedCode, setTypedCode] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<number | null>(null);

    const startAnimation = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(true);
        setTypedCode('');
        
        intervalRef.current = window.setInterval(() => {
            setTypedCode(prev => {
                if (prev.length < newCode.length) {
                    return newCode.substring(0, prev.length + 1);
                }
                if (intervalRef.current) clearInterval(intervalRef.current);
                setIsRunning(false);
                return newCode;
            });
        }, 15);
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl flex items-center">
                    <EyeIcon />
                    <span className="ml-3">Code Diff Ghost</span>
                </h1>
                <p className="text-text-secondary mt-1">Visualize code changes with a "ghost typing" effect.</p>
            </header>
            <div className="flex justify-center mb-4">
                <button
                    onClick={startAnimation}
                    disabled={isRunning}
                    className="btn-primary px-6 py-2"
                >
                    {isRunning ? 'Visualizing...' : 'Show Changes'}
                </button>
            </div>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden font-mono text-sm">
                <div className="flex flex-col h-full">
                    <label htmlFor="before-code" className="text-sm font-medium text-text-secondary mb-2">Before</label>
                    <textarea
                        id="before-code"
                        value={oldCode}
                        onChange={e => setOldCode(e.target.value)}
                        className="flex-grow p-4 bg-surface border border-border rounded-md text-red-600 whitespace-pre-wrap resize-none"
                        spellCheck="false"
                    />
                </div>
                 <div className="flex flex-col h-full">
                    <label htmlFor="after-code" className="text-sm font-medium text-text-secondary mb-2">After</label>
                     <div className="relative flex-grow">
                        <textarea
                            id="after-code"
                            value={newCode}
                            onChange={e => setNewCode(e.target.value)}
                            className="absolute inset-0 w-full h-full p-4 bg-surface border border-border rounded-md text-emerald-700 whitespace-pre-wrap resize-none z-0"
                            spellCheck="false"
                        />
                        {(isRunning || typedCode) && (
                            <pre className="absolute inset-0 w-full h-full p-4 bg-surface pointer-events-none text-emerald-700 whitespace-pre-wrap z-10">
                                {typedCode}{isRunning && <span className="animate-pulse">|</span>}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};