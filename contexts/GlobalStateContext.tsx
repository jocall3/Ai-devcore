import React, { createContext, useReducer, useContext, useEffect } from 'react';
import type { ViewType, AppUser, GitHubUser, FileNode } from '../types.ts';

// State shape
interface GlobalState {
  activeView: ViewType;
  viewProps: any;
  hiddenFeatures: string[];
  user: AppUser | null;
  githubUser: GitHubUser | null;
  projectFiles: FileNode | null;
  selectedRepo: { owner: string; repo: string } | null;
  vaultState: {
    isInitialized: boolean;
    isUnlocked: boolean;
  };
}

// Action types
type Action =
  | { type: 'SET_VIEW'; payload: { view: ViewType, props?: any } }
  | { type: 'TOGGLE_FEATURE_VISIBILITY'; payload: { featureId: string } }
  | { type: 'SET_APP_USER', payload: AppUser | null }
  | { type: 'SET_GITHUB_USER', payload: GitHubUser | null }
  | { type: 'LOAD_PROJECT_FILES'; payload: FileNode | null }
  | { type: 'SET_SELECTED_REPO'; payload: { owner: string; repo: string } | null }
  | { type: 'SET_VAULT_STATE'; payload: Partial<{ isInitialized: boolean, isUnlocked: boolean }> };


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
            }
        }
        return { ...state, user: action.payload };
    case 'SET_GITHUB_USER':
        return {
            ...state,
            githubUser: action.payload,
             // Reset repo-specific data if disconnected
            selectedRepo: action.payload ? state.selectedRepo : null,
            projectFiles: action.payload ? state.projectFiles : null,
        }
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

const GlobalStateContext = createContext<{
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

const LOCAL_STORAGE_KEY = 'devcore_snapshot';
const CONSENT_KEY = 'devcore_ls_consent';

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

export const useGlobalState = () => useContext(GlobalStateContext);