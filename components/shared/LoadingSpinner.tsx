
import React from 'react';

export const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-1" aria-label="Loading">
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
);
