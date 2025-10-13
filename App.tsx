

import React, { Suspense, useCallback, useMemo, useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { useGlobalState } from './contexts/GlobalStateContext.tsx';
import { logEvent } from './services/telemetryService.ts';
import { ALL_FEATURES, FEATURES_MAP } from './components/features/index.ts';
import type { ViewType, SidebarItem, AppUser } from './types.ts';
import { ActionManager } from './components/ActionManager.tsx';
import { LeftSidebar } from './components/LeftSidebar.tsx';
import { StatusBar } from './components/StatusBar.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { Cog6ToothIcon, HomeIcon, FolderIcon, RectangleGroupIcon } from './components/icons.tsx';
import { AiCommandCenter } from './components/features/AiCommandCenter.tsx';
import { NotificationProvider } from './contexts/NotificationContext.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { VaultProvider } from './components/vault/VaultProvider.tsx';
import { initGoogleAuth } from './services/googleAuthService.ts';


export const LoadingIndicator: React.FC = () => (
    <div className="w-full h-full flex items-center justify-center bg-surface">
        <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="w-4 h-4 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-4 h-4 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <span className="text-text-secondary ml-2">Loading Feature...</span>
        </div>
    </div>
);

interface LocalStorageConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

const LocalStorageConsentModal: React.FC<LocalStorageConsentModalProps> = ({ onAccept, onDecline }) => {
  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center fade-in">
      <div 
        className="bg-surface border border-border rounded-2xl shadow-2xl shadow-black/50 w-full max-w-md m-4 p-8 text-center animate-pop-in"
      >
        <h2 className="text-2xl mb-4">Store Data Locally?</h2>
        <p className="text-text-secondary mb-6">
          This application uses your browser's local storage to save your settings and remember your progress between sessions. This data stays on your computer and is not shared.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onDecline}
            className="px-6 py-2 bg-surface border border-border text-text-primary font-bold rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="btn-primary px-6 py-2"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
    const { state, dispatch } = useGlobalState();
    const { activeView, viewProps, hiddenFeatures } = state;
    const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              setCommandPaletteOpen(isOpen => !isOpen);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
  
    const handleViewChange = useCallback((view: ViewType, props: any = {}) => {
      dispatch({ type: 'SET_VIEW', payload: { view, props } });
      logEvent('view_changed', { view });
      setCommandPaletteOpen(false);
    }, [dispatch]);
  
    const sidebarItems: SidebarItem[] = useMemo(() => {
        const coreFeatures = ['ai-command-center', 'project-explorer', 'workspace-connector-hub'];
        return [
            { id: 'ai-command-center', label: 'Command Center', icon: <HomeIcon />, view: 'ai-command-center' },
            { id: 'project-explorer', label: 'Project Explorer', icon: <FolderIcon />, view: 'project-explorer' },
            { id: 'workspace-connector-hub', label: 'Workspace Hub', icon: <RectangleGroupIcon />, view: 'workspace-connector-hub' },
            ...ALL_FEATURES
                .filter(feature => !hiddenFeatures.includes(feature.id) && !coreFeatures.includes(feature.id))
                .map(feature => ({
                    id: feature.id,
                    label: feature.name,
                    icon: feature.icon,
                    view: feature.id as ViewType,
                })),
            { id: 'settings', label: 'Settings', icon: <Cog6ToothIcon />, view: 'settings' },
        ];
    }, [hiddenFeatures]);
  
    const ActiveComponent = useMemo(() => {
        if (activeView === 'settings') return SettingsView;
        return FEATURES_MAP.get(activeView as string)?.component ?? AiCommandCenter;
    }, [activeView]);
    
    return (
        <div className="relative flex h-full w-full">
            <LeftSidebar items={sidebarItems} activeView={state.activeView} onNavigate={handleViewChange} />
            <div className="flex-1 flex min-w-0">
                <div className="flex-1 flex flex-col min-w-0">
                    <main className="relative flex-1 min-w-0 bg-surface/50 dark:bg-slate-900/50 overflow-y-auto">
                        <ErrorBoundary>
                            <Suspense fallback={<LoadingIndicator />}>
                                <div key={activeView} className="fade-in w-full h-full">
                                    <ActiveComponent {...viewProps} />
                                </div>
                            </Suspense>
                        </ErrorBoundary>
                        <ActionManager />
                    </main>
                    <StatusBar bgImageStatus="loaded" />
                </div>
            </div>
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onSelect={handleViewChange} />
        </div>
    )
}


const App: React.FC = () => {
    const [showConsentModal, setShowConsentModal] = useState(false);
    const { dispatch } = useGlobalState();
    useTheme(); // Initialize theme hook

    useEffect(() => {
      try {
          const consent = localStorage.getItem('devcore_ls_consent');
          if (!consent) {
              setShowConsentModal(true);
          }
      } catch (e) {
          console.warn("Could not access localStorage.", e);
      }
    }, []);

    useEffect(() => {
        const handleUserChanged = (user: AppUser | null) => {
            dispatch({ type: 'SET_APP_USER', payload: user });
        };

        const init = () => {
            if (window.google) {
                initGoogleAuth(handleUserChanged);
            }
        };

        const gsiScript = document.getElementById('gsi-client');
        if (window.google) {
            init();
        } else if (gsiScript) {
            gsiScript.addEventListener('load', init);
            return () => gsiScript.removeEventListener('load', init);
        }
    }, [dispatch]);
  
    const handleAcceptConsent = () => {
      try {
          localStorage.setItem('devcore_ls_consent', 'granted');
          window.location.reload();
      } catch (e) {
          console.error("Could not write to localStorage.", e);
          setShowConsentModal(false);
      }
    };
  
    const handleDeclineConsent = () => {
      try {
          localStorage.setItem('devcore_ls_consent', 'denied');
      } catch (e) {
          console.error("Could not write to localStorage.", e);
      }
      setShowConsentModal(false);
    };

    return (
        <div className="h-screen w-screen font-sans overflow-hidden bg-background">
            <NotificationProvider>
                <VaultProvider>
                    {showConsentModal && <LocalStorageConsentModal onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />}
                    <AppContent />
                </VaultProvider>
            </NotificationProvider>
        </div>
    );
};

export default App;