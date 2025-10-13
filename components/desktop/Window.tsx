import React, { Suspense, useRef, useState } from 'react';
import type { Feature } from '../../types.ts';
import { FEATURES_MAP } from '../features/index.ts';
import { LoadingIndicator } from '../../App.tsx';
import { MinimizeIcon, XMarkIcon } from '../icons.tsx';

interface WindowState {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
}

interface WindowProps {
  feature: Feature;
  state: WindowState;
  isActive: boolean;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onFocus: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WindowState>) => void;
}

export const Window: React.FC<WindowProps> = ({ feature, state, isActive, onClose, onMinimize, onFocus, onUpdate }) => {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const initialPos = useRef<{ x: number; y: number } | null>(null);
  
  const FeatureComponent = FEATURES_MAP.get(feature.id)?.component;

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onFocus(feature.id);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { x: state.position.x, y: state.position.y };
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!dragStartPos.current || !initialPos.current) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    onUpdate(feature.id, { position: { x: initialPos.current.x + dx, y: initialPos.current.y + dy }});
  };

  const handleDragEnd = () => {
    dragStartPos.current = null;
    initialPos.current = null;
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  };
  
  return (
    <div
      className={`absolute bg-slate-800/70 backdrop-blur-md border rounded-lg shadow-2xl shadow-black/50 flex flex-col transition-all duration-100 ${isActive ? 'border-cyan-500/50' : 'border-slate-700/50'}`}
      style={{
        left: state.position.x,
        top: state.position.y,
        width: state.size.width,
        height: state.size.height,
        zIndex: state.zIndex
      }}
      onMouseDown={() => onFocus(feature.id)}
    >
      <header
        className={`flex items-center justify-between h-8 px-2 border-b ${isActive ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-800/50 border-slate-700'} rounded-t-lg cursor-move`}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2 text-xs">
           <div className="w-4 h-4">{feature.icon}</div>
           <span>{feature.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMinimize(feature.id)} className="p-1 rounded hover:bg-slate-600"><MinimizeIcon /></button>
          <button onClick={() => onClose(feature.id)} className="p-1 rounded hover:bg-red-500/50"><XMarkIcon className="w-4 h-4"/></button>
        </div>
      </header>
      <main className="flex-1 overflow-auto bg-slate-800/50 rounded-b-lg">
        {FeatureComponent ? (
          <Suspense fallback={<LoadingIndicator/>}>
            <FeatureComponent />
          </Suspense>
        ) : (
            <div className="p-4 text-red-400">Error: Component not found for {feature.name}</div>
        )}
      </main>
    </div>
  );
};