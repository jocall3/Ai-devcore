import React from 'react';
import { DesktopView } from './desktop/DesktopView';

interface DashboardViewProps {
  openFeatureId?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ openFeatureId }) => {
  return (
    <DesktopView openFeatureId={openFeatureId} />
  );
};
