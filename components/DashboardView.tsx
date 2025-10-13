import React from 'react';
import { MachineView } from './MachineView.tsx';
import { FeaturePalette } from './FeaturePalette.tsx';
import type { ViewType } from '../types.ts';

interface DashboardViewProps {
  onNavigate: (view: ViewType, props?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const handleFeatureSelect = (featureId: string) => {
    onNavigate(featureId);
  };

  return (
    <div className="h-full flex flex-row overflow-hidden">
      <div className="flex-grow">
        <MachineView />
      </div>
      <FeaturePalette onFeatureSelect={handleFeatureSelect} />
    </div>
  );
};
