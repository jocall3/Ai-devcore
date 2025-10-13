import React, { useState, useEffect } from 'react';
import { GitBranchIcon, BellIcon } from './icons.tsx';

type BgImageStatus = 'loading' | 'loaded' | 'error';

const StatusMessage: React.FC<{ status: BgImageStatus }> = ({ status }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        setVisible(true);
        if (status === 'error') {
            const timer = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    if (!visible || status === 'loaded') {
        return null;
    }

    if (status === 'loading') {
        return (
            <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span>Generating background...</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center space-x-2 text-yellow-600">
                <span>Background failed. Using fallback.</span>
            </div>
        );
    }

    return null;
};

const Clock: React.FC = () => {
    const [time, setTime] = useState(() => new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timerId);
    }, []);

    return <span>{time.toLocaleTimeString()}</span>
}


export const StatusBar: React.FC<{ bgImageStatus: BgImageStatus }> = ({ bgImageStatus }) => {
  return (
    <footer className="w-full bg-surface/70 backdrop-blur-sm border-t border-border px-4 py-1 flex items-center justify-between text-xs text-text-secondary">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 cursor-pointer hover:text-primary transition-colors">
          <GitBranchIcon />
          <span>main</span>
        </div>
        <StatusMessage status={bgImageStatus} />
      </div>
      <div className="flex items-center space-x-4">
        <Clock />
        <span className="hidden sm:block">Ready</span>
        <div className="flex items-center space-x-1 cursor-pointer hover:text-primary transition-colors">
          <BellIcon />
          <span>0</span>
        </div>
        <span className="hidden sm:block">
          Powered by Gemini
        </span>
      </div>
    </footer>
  );
};