

import React, { useState, useMemo } from 'react';
import type { Feature } from '../types.ts';

interface FeatureCardProps {
  feature: Feature;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex flex-col justify-between transition-all duration-200 hover:bg-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
    >
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="text-cyan-400">{feature.icon}</div>
          <h3 className="font-bold text-slate-200">{feature.name}</h3>
        </div>
        <p className="text-sm text-slate-400">{feature.description}</p>
      </div>
      <div className="text-xs text-slate-500 mt-4">{feature.category}</div>
    </div>
  );
};


export const FeatureGrid: React.FC<{ features: Feature[], onFeatureSelect?: (id: string) => void }> = ({ features, onFeatureSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFeatures = useMemo(() => {
    const featureList = features || [];
    if (!searchTerm) return featureList;
    return featureList.filter(
      (feature) =>
        feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, features]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">DevCore AI Toolkit</h1>
        <p className="mt-2 text-lg text-slate-400">A focused toolkit for modern development, powered by AI.</p>
        <div className="mt-6 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-shadow"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFeatures.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} onClick={() => onFeatureSelect?.(feature.id)} />
        ))}
      </div>
    </div>
  );
};