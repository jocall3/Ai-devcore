import React from 'react';
import type { ViewType, SidebarItem } from '@/types.ts';
import { useGlobalState } from '@/contexts/GlobalStateContext.tsx';
import { signOutUser } from '@/services/googleAuthService.ts';
import { ArrowLeftOnRectangleIcon, LockClosedIcon } from '@/components/icons.tsx';
import { useVaultModal } from '@/contexts/VaultModalContext.tsx';
import { useNotification } from '@/contexts/NotificationContext.tsx';

interface LeftSidebarProps {
  items: SidebarItem[];
  activeView: ViewType;
  onNavigate: (view: ViewType, props?: any) => void;
}

// Views that do NOT require an unlocked vault.
// By default, most features are assumed to require the vault for API keys.
const NON_VAULT_VIEWS: ViewType[] = [
    'settings',
    'css-grid-editor',
    'pwa-manifest-editor',
    'markdown-slides-generator',
    'svg-path-editor',
    'typography-lab',
    'code-diff-ghost',
    'code-spell-checker',
    'meta-tag-editor',
    'responsive-tester',
    'sass-scss-compiler',
    'schema-designer',
    'env-manager',
];

const Tooltip: React.FC<{ text: string, children: React.ReactNode }> = ({ text, children }) => {
  return (
    <div className="group relative flex justify-center">
      {children}
      <span className="absolute left-14 p-2 scale-0 transition-all rounded bg-gray-800 border border-gray-900 text-xs text-white group-hover:scale-100 whitespace-nowrap z-50">
        {text}
      </span>
    </div>
  );
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ items, activeView, onNavigate }) => {
    const { state, dispatch } = useGlobalState();
    const { user, vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();
    const { addNotification } = useNotification();

    const handleLogout = () => {
        try {
            signOutUser();
            dispatch({ type: 'SET_APP_USER', payload: null });
        } catch (error) {
            console.error("Failed to sign out:", error);
            addNotification("Failed to sign out. Please try again.", 'error');
        }
    };

    const handleNavigation = async (item: SidebarItem) => {
        if (item.action) {
          item.action();
          return;
        }
    
        const requiresVault = !NON_VAULT_VIEWS.includes(item.view);
    
        if (requiresVault) {
          if (!vaultState.isInitialized) {
              addNotification('A Master Password is required to use this feature.', 'info');
              const created = await requestCreation();
              if (!created) {
                  addNotification('Vault setup cancelled.', 'error');
                  return; // Stop navigation
              }
          } else if (!vaultState.isUnlocked) {
              const unlocked = await requestUnlock();
              if (!unlocked) {
                  addNotification('Vault unlock cancelled.', 'error');
                  return; // Stop navigation
              }
          }
        }
        
        onNavigate(item.view, item.props);
      };

      const handleVaultClick = async () => {
        if (!vaultState.isInitialized) {
            await requestCreation();
        } else if (!vaultState.isUnlocked) {
            await requestUnlock();
        } else {
            addNotification('Vault is already unlocked.', 'info');
        }
    };

  return (
    <nav className="w-20 h-full bg-surface border-r border-border flex flex-col py-4 px-2">
      <div className="flex-shrink-0 flex justify-center p-2 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
      </div>
       <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center gap-2 pt-4">
        {items.map((item) => {
          const isActive = activeView === item.view;

          return (
            <Tooltip key={item.id} text={item.label}>
              <button
                onClick={() => handleNavigation(item)}
                className={`flex items-center justify-center w-12 h-12 rounded-lg transition-colors duration-200
                  ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700'}`
                }
              >
                {item.icon}
              </button>
            </Tooltip>
          );
        })}
      </div>
      <div className="mt-auto flex-shrink-0 flex flex-col items-center gap-2">
        <Tooltip text={vaultState.isUnlocked ? 'Vault Unlocked' : vaultState.isInitialized ? 'Vault Locked' : 'Setup Vault'}>
            <button
            onClick={handleVaultClick}
            className={`flex items-center justify-center w-12 h-12 rounded-lg transition-colors duration-200 ${vaultState.isUnlocked ? 'text-green-500' : vaultState.isInitialized ? 'text-yellow-500' : 'text-text-secondary'}`}
            >
            <LockClosedIcon />
            </button>
        </Tooltip>
         {user && (
            <Tooltip text={user.displayName || 'User'}>
                 <img src={user.photoURL || undefined} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border-2 border-border" />
            </Tooltip>
         )}
         {user && (
            <Tooltip text="Logout">
                <button
                onClick={handleLogout}
                className="flex items-center justify-center w-12 h-12 rounded-lg text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                <ArrowLeftOnRectangleIcon />
                </button>
            </Tooltip>
         )}
      </div>
    </nav>
  );
};