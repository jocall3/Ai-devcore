
import React, { useState, useEffect, useMemo } from 'react';
import { ALL_FEATURES } from './features/index.ts';
import type { ViewType } from '../types.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (view: ViewType) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);
  
  const commandOptions = useMemo(() => {
    const navigationCommands = [
      { id: 'ai-feature-builder', name: 'Go to AI Builder', category: 'Navigation', icon: <span />, description: ''},
    ];
    
    const featureCommands = ALL_FEATURES.map(f => ({...f, name: `Open: ${f.name}`}));

     return [
      ...navigationCommands,
      ...featureCommands,
     ].filter(
        (feature) =>
          feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feature.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [searchTerm]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [commandOptions.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % commandOptions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + commandOptions.length) % commandOptions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = commandOptions[selectedIndex];
        if (selected) {
          onSelect(selected.id as ViewType);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commandOptions, selectedIndex, onSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Type a command or search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          className="w-full p-4 bg-surface text-text-primary text-lg focus:outline-none border-b border-border"
        />
        <ul className="max-h-96 overflow-y-auto p-2">
          {commandOptions.length > 0 ? (
            commandOptions.map((item, index) => (
              <li
                key={item.id + index}
                onMouseDown={() => {
                   onSelect(item.id as ViewType);
                }}
                className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                  selectedIndex === index ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                    <div className="text-text-secondary">{item.icon}</div>
                    <span className="text-text-primary">{item.name}</span>
                </div>
                <span className="text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded">{item.category}</span>
              </li>
            ))
          ) : (
            <li className="p-4 text-center text-text-secondary">No results found.</li>
          )}
        </ul>
      </div>
    </div>
  );
};