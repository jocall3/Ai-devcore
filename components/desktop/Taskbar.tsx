import React from 'react';
import type { Feature } from '../../types.ts';

interface TaskbarProps {
  minimizedWindows: Feature[];
  onRestore: (id: string) => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({ minimizedWindows, onRestore }) => {
  if (minimizedWindows.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-20 right-0 h-10 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 flex items-center px-2 gap-2 z-[999]">
      {minimizedWindows.map(feature => (
        <button
          key={feature.id}
          onClick={() => onRestore(feature.id)}
          className="h-8 px-3 flex items-center gap-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm"
          title={`Restore ${feature.name}`}
        >
          <div className="w-4 h-4">{feature.icon}</div>
          <span>{feature.name}</span>
        </button>
      ))}
    </div>
  );
};
