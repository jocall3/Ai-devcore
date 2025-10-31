/**
 * @file Manages the global state of the application using React's Context and useReducer hook.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useReducer, useContext, useEffect, useMemo } from 'react';
import type { ViewType, AppUser, GitHubUser, FileNode } from '../types.ts';
import { container } from '../core/di/container.ts';
import { SecurityCoreService } from '../modules/security-core/security-core.service.ts';
import { TYPES } from '../core/di/types.ts';
import { VaultStatus } from '../modules/security-core/types.ts';
import { eventBus, type AppEventMap } from '../core/bus/event-bus.service.ts';

/**
 * Defines the shape of the global application state.
 * @interface GlobalState
 */
interface GlobalState {
  /** The currently active view or feature component being displayed. */
  activeView: ViewType;
  /** Props passed to the active view component. */
  viewProps: any;
  /** A list of feature IDs that are hidden from the UI. */
  hiddenFeatures: string[];
  /** The currently authenticated application user. Null if not signed in. */
  user: AppUser | null;
  /** The authenticated GitHub user profile. Null if not connected. */
  githubUser: GitHubUser | null;
  /** The file tree structure of the currently selected repository. */
  projectFiles: FileNode | null;
  /** The currently selected GitHub repository. */
  selectedRepo: { owner: string; repo: string } | null;
  /** The state of the local credential vault. */
  vaultState: {
    /** Whether the vault has been set up with a master password. */
    isInitialized: boolean;
    /** Whether the vault is currently unlocked for the session. */
    isUnlocked: boolean;
  };
}

/**
 * Defines the actions that can be dispatched to update the global state.
 * @type Action
 */
type Action =
  | { type: 'SET_VIEW'; payload: { view: ViewType, props?: any } }
  | { type: 'TOGGLE_FEATURE_VISIBILITY'; payload: { featureId: string } }
  | { type: 'SET_APP_USER', payload: AppUser | null }
  | { type: 'SET_GITHUB_USER', payload: GitHubUser | null }
  | { type: 'LOAD_PROJECT_FILES'; payload: FileNode | null }
  | { type: 'SET_SELECTED_REPO'; payload: { owner: string; repo: string } | null }
  | { type: 'SET_VAULT_STATE'; payload: Partial<{ isInitialized: boolean, isUnlocked: boolean }> };

/**
 * The initial state of the application.
 * @const
 */
const initialState: GlobalState = {
  activeView: 'ai-command-center',
  viewProps: {},
  hiddenFeatures: [],
  user: null,
  githubUser: null,
  projectFiles: null,
  selectedRepo: null,
  vaultState: {
    isInitialized: false,
    isUnlocked: false,
  },
};

/**
 * The reducer function to handle state updates.
 * It takes the current state and an action, and returns the new state.
 * @param state - The current global state.
 * @param action - The action to perform.
 * @returns The new global state.
 */
const reducer = (state: GlobalState, action: Action): GlobalState => {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, activeView: action.payload.view, viewProps: action.payload.props || {} };
    case 'TOGGLE_FEATURE_VISIBILITY': {
        const { featureId } = action.payload;
        const isHidden = state.hiddenFeatures.includes(featureId);
        const newHiddenFeatures = isHidden
            ? state.hiddenFeatures.filter(id => id !== featureId)
            : [...state.hiddenFeatures, featureId];
        return { ...state, hiddenFeatures: newHiddenFeatures };
    }
    case 'SET_APP_USER':
        if (action.payload === null) { // User logged out
            return {
                ...state,
                user: null,
                githubUser: null,
                selectedRepo: null,
                projectFiles: null,
            };
        }
        return { ...state, user: action.payload };
    case 'SET_GITHUB_USER':
        return {
            ...state,
            githubUser: action.payload,
             // Reset repo-specific data if disconnected
            selectedRepo: action.payload ? state.selectedRepo : null,
            projectFiles: action.payload ? state.projectFiles : null,
        };
    case 'LOAD_PROJECT_FILES':
      return { ...state, projectFiles: action.payload };
    case 'SET_SELECTED_REPO':
      return { ...state, selectedRepo: action.payload, projectFiles: null }; // Reset files on repo change
    case 'SET_VAULT_STATE':
        return {
            ...state,
            vaultState: { ...state.vaultState, ...action.payload },
        };
    default:
      return state;
  }
};

/**
 * The React context for accessing the global state and dispatch function.
 */
const GlobalStateContext = createContext<{
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
}>({ 
  state: initialState,
  dispatch: () => null,
});

const LOCAL_STORAGE_KEY = 'devcore_snapshot';
const CONSENT_KEY = 'devcore_ls_consent';
const VAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * The provider component that makes the global state available to its children.
 * It also handles state persistence to localStorage and vault session management.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components.
 * @example
 * <GlobalStateProvider>
 *   <App />
 * </GlobalStateProvider>
 */
export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const canPersist = (() => {
        try {
            return localStorage.getItem(CONSENT_KEY) === 'granted';
        } catch (e) {
            return false;
        }
    })();

    const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
        if (!canPersist) return initial;
        
        try {
            const storedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!storedStateJSON) return initial;
            
            const storedState = JSON.parse(storedStateJSON);
            const hydratedState = { ...initial };

            // Hydrate state from local storage
            if (storedState.selectedRepo) hydratedState.selectedRepo = storedState.selectedRepo;
            if (storedState.activeView) hydratedState.activeView = storedState.activeView;
            if (storedState.viewProps) hydratedState.viewProps = storedState.viewProps;
            if (storedState.hiddenFeatures) hydratedState.hiddenFeatures = storedState.hiddenFeatures;
            
            return hydratedState;
        } catch (error) {
            console.error("Failed to parse state from localStorage", error);
            return initial;
        }
    });

    const securityCoreService = useMemo(() => {
        try {
            return container.resolve<SecurityCoreService>(TYPES.SecurityCore);
        } catch (e) {
            console.error("Failed to resolve SecurityCoreService:", e);
            return null;
        }
    }, []);

    // Effect to get initial vault status and subscribe to updates.
    useEffect(() => {
        if (!securityCoreService) return;

        const initialStatus = securityCoreService.getStatus();
        dispatch({
            type: 'SET_VAULT_STATE',
            payload: {
                isInitialized: initialStatus !== VaultStatus.UNINITIALIZED,
                isUnlocked: initialStatus === VaultStatus.UNLOCKED,
            }
        });

        const handleVaultStateChange = (payload: AppEventMap['vault:stateChanged']) => {
            dispatch({ type: 'SET_VAULT_STATE', payload });
        };
        
        // The SecurityCoreService publishes 'vault:state-changed', but the central AppEventMap
        // has 'vault:stateChanged'. We subscribe to the canonical event name.
        const unsubscribe = eventBus.subscribe('vault:stateChanged', handleVaultStateChange as any);
        
        return () => unsubscribe();
    }, [securityCoreService]);

    // Effect to manage vault session timeout for automatic locking.
    useEffect(() => {
        if (!securityCoreService) return;
        let timeoutId: number | undefined;

        const resetTimeout = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (state.vaultState.isUnlocked) {
                timeoutId = window.setTimeout(() => {
                    console.log('Vault session timed out due to inactivity. Locking vault.');
                    securityCoreService.lockVault();
                }, VAULT_TIMEOUT_MS);
            }
        };

        const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

        if (state.vaultState.isUnlocked) {
            resetTimeout();
            activityEvents.forEach(event => window.addEventListener(event, resetTimeout));
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            activityEvents.forEach(event => window.removeEventListener(event, resetTimeout));
        };
    }, [state.vaultState.isUnlocked, securityCoreService]);

    // Effect to automatically lock the vault on user logout.
    useEffect(() => {
        if (state.user === null && state.vaultState.isUnlocked && securityCoreService) {
            securityCoreService.lockVault();
        }
    }, [state.user, state.vaultState.isUnlocked, securityCoreService]);

    // Effect to persist parts of the state to localStorage.
    useEffect(() => {
        if (!canPersist) return;

        const handler = setTimeout(() => {
            try {
                const stateToSave = { 
                    selectedRepo: state.selectedRepo,
                    activeView: state.activeView,
                    viewProps: state.viewProps,
                    hiddenFeatures: state.hiddenFeatures,
                };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            } catch (error) {
                console.error("Failed to save state to localStorage", error);
            }
        }, 500);
        
        return () => clearTimeout(handler);
    }, [state, canPersist]);


    return (
        <GlobalStateContext.Provider value={{ state, dispatch }}>
            {children}
        </GlobalStateContext.Provider>
    );
};

/**
 * Custom hook for accessing the global state and dispatch function.
 * @returns An object containing the current state and the dispatch function.
 * @example
 * const { state, dispatch } = useGlobalState();
 */
export const useGlobalState = () => useContext(GlobalStateContext);
