/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This file is auto-generated and contains the source code of the entire application.
// It is used by the DownloadManager to create a ZIP file of the source.

export const sourceFiles: Record<string, string> = {
  'index.tsx': `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { GlobalStateProvider } from './contexts/GlobalStateContext.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalStateProvider>
        <App />
    </GlobalStateProvider>
  </React.StrictMode>
);`,
  'metadata.json': `{
  "name": "AUToPoetic",
  "description": "An empty app",
  "requestFramePermissions": []
}`,
  'App.tsx': `


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

export default App;`,
  'globals.d.ts': `// globals.d.ts
declare global {
  /**
   * Loads the Pyodide WebAssembly module.
   * @param config Optional configuration for Pyodide.
   */
  function loadPyodide(config?: { indexURL?: string }): Promise<any>;

  interface Window {
    google?: {
      accounts: {
        id: {
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

// This export statement is required to make the file a module.
export {};`,
  'index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #0047AB; /* Cobalt Blue */
  --color-primary-rgb: 0, 71, 171;
  --color-background: #F5F7FA; /* Light silver-blue */
  --color-surface: #FFFFFF;
  --color-text-primary: #111827; /* Gray 900 */
  --color-text-secondary: #6B7280; /* Gray 500 */
  --color-text-on-primary: #FFFFFF;
  --color-border: #E5E7EB; /* Gray 200 */
}

.dark {
  --color-primary: #38bdf8; /* sky-400 */
  --color-primary-rgb: 56, 189, 248;
  --color-background: #0f172a; /* slate-900 */
  --color-surface: #1e293b; /* slate-800 */
  --color-text-primary: #f8fafc; /* slate-50 */
  --color-text-secondary: #94a3b8; /* slate-400 */
  --color-text-on-primary: #0f172a; /* slate-900 */
  --color-border: #334155; /* slate-700 */
}

/* Custom global styles */
body {
  @apply bg-background text-text-primary transition-colors duration-300;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html.dark body {
    background-image: none;
}


#root {
  position: relative;
  z-index: 1;
}

#root::before {
  content: 'CitiBank demo business inc';
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-family: theme('fontFamily.serif');
  font-size: clamp(2rem, 8vw, 6rem); /* Responsive font size */
  font-weight: bold;
  color: theme('colors.gold');
  opacity: 0.08;
  pointer-events: none;
  z-index: -1;
  white-space: nowrap;
}

h1, h2, h3, h4, h5, h6 {
  @apply font-serif text-text-primary;
}

h1 {
  @apply text-text-primary;
}

/* Update primary buttons for a professional look */
.btn-primary {
  @apply bg-primary text-text-on-primary font-bold rounded-md hover:opacity-90 transition-all disabled:opacity-50 shadow-md;
}

/* Custom scrollbars for the new light theme */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-slate-800;
}
::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-slate-600 rounded;
}
::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-slate-500;
}

/* Base transitions for interactive elements */
button, a, input, textarea, select {
  transition: all 0.2s ease-in-out;
}

/* Keyframe Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.fade-in { animation: fadeIn 0.5s ease-in-out forwards; }
.animate-shake { animation: shake 0.4s ease-in-out; }
.animate-pop-in { animation: pop-in 0.3s ease-out forwards; }

/* For hiding scrollbar but keeping functionality */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { 
  -ms-overflow-style: none; 
  scrollbar-width: none; 
  scroll-behavior: smooth;
}`,
  'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
  'README.md': `# DevCore AI Toolkit

> A supercharged, secure, client-side toolkit for modern developers, powered by Gemini. It runs entirely in your browser, keeping your code, data, and API keys private and secure on your local machine.

DevCore is a serverless web application designed to be a powerful assistant in your development workflow. It combines a suite of intelligent tools with a unique, AI-driven command center that can orchestrate actions across your favorite services like Jira, Slack, and GitHub.

---

## ✨ Key Features

-   **AI Command Center:** The heart of the toolkit. Use natural language (\`Ctrl+K\`) to navigate, run features, and execute complex, multi-service workflows.
-   **Workspace Connector Hub:** Connect to Jira, Slack, GitHub, and more. Let the AI execute commands like "create a high-priority Jira ticket and post a summary to the #dev channel in Slack."
-   **AI Feature Builder:** Generate multi-file components, unit tests, and conventional commit messages from a single, high-level prompt.
-   **Intelligent Code Tools:** Explain complex code, migrate between languages, review for bugs and security vulnerabilities, and refactor with one click.
-   **Performance & Auditing:** Profile runtime performance, analyze bundle stats, and audit live websites for accessibility issues with AI-powered advice.
-   **Visual Editors & Sandboxes:** A suite of focused tools, from a CSS Grid editor and a RegEx sandbox to a PWA Manifest generator, designed to streamline frontend development.

---

## 🏛️ Architecture: Secure & Client-Side

DevCore is built on a serverless, client-side architecture. This design choice offers several key advantages:

-   **Privacy First:** Your code, prompts, and sensitive data never leave your browser. All processing happens locally.
-   **Ultimate Security:** API keys and credentials for services like GitHub or Jira are encrypted with AES-GCM using the Web Crypto API. They are stored securely in your browser's IndexedDB and can only be decrypted with your master password.
-   **Runs Anywhere:** As a static application, you can deploy it on any CDN (like GitHub Pages or Netlify) or simply run it from your local filesystem. No backend, no databases, no complex setup.

---

## 🚀 Getting Started

1.  **Open the App:** Just open \`index.html\` in your browser.
2.  **Set Up Your Vault:** On first use, you'll be prompted to create a master password. This password encrypts and decrypts your credentials locally and is **never** stored.
3.  **Connect Your Services:** Navigate to the **Workspace Connector Hub** to securely add your API keys for services like GitHub, Jira, and Slack.
4.  **Use the AI Command Center:** Press \`Ctrl+K\` (or \`Cmd+K\`) anywhere to open the command palette and start giving instructions to the AI.

---

## 🔌 The Workspace Connector Hub

This is the core of DevCore's workflow automation. Instead of just being a collection of tools, the Hub turns the app into a true command center.

-   **Connect Once, Use Everywhere:** Securely store your API tokens for essential developer services in the encrypted vault.
-   **AI-Powered Orchestration:** The AI Command Center can use these connections to perform multi-step actions across different platforms.
-   **Example Command:** _"A new critical bug was reported. Create a high-priority ticket in Jira, post a summary to the #engineering channel in Slack, and create a new git branch called \`hotfix/payment-bug\`."_

---

## 🔐 Security & Your Data

Your privacy is paramount. Here's how your data is handled:

-   **No Server-Side Storage:** All files, settings, and credentials reside exclusively in your browser's IndexedDB.
-   **End-to-End Encryption (Locally):** Credentials entered into the Vault are encrypted using the Web Crypto API before being stored. The encryption key is derived from your master password and is only held in memory during your session.
-   **Direct API Calls:** When you use an integrated service, the app makes direct, client-to-service API calls. Your data is not proxied through any intermediary server.

---

## 🛠️ Scope & Limitations

As a client-side application, DevCore has a focused scope. It is designed to be a powerful **assistant** for your development workflow, not a replacement for your primary IDE, backend services, or CI/CD platform. It excels at code generation, analysis, and API-based automation but does not run backend servers, train models, or manage infrastructure.`,
  'tailwind.config.js': `import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./constants.tsx",
    "./types.ts",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"EB Garamond"', 'serif'],
        calligraphy: ['"Great Vibes"', 'cursive'],
      },
      colors: {
        'primary': 'var(--color-primary)',
        'background': 'var(--color-background)',
        'surface': 'var(--color-surface)',
        'text': {
          'primary': 'var(--color-text-primary)',
          'secondary': 'var(--color-text-secondary)',
          'on-primary': 'var(--color-text-on-primary)',
        },
        'border': 'var(--color-border)',
        'gold': '#B8860B', // DarkGoldenRod - better for watermark
      },
       boxShadow: {
        'focus-primary': '0 0 0 3px rgba(var(--color-primary-rgb), 0.4)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [
     typography,
  ],
}`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ES2022",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}`,
  'tsconfig.server.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}`,
  'types.ts': `import type React from 'react';
import { CHROME_VIEW_IDS, FEATURE_CATEGORIES } from './constants.tsx';

export type ChromeViewType = typeof CHROME_VIEW_IDS[number];
export type FeatureId = string;
export type FeatureCategory = typeof FEATURE_CATEGORIES[number];

export interface Feature {
  id: FeatureId;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: FeatureCategory;
  component: React.FC<any>;
  aiConfig?: {
    model: string;
    systemInstruction?: string;
  };
  isCustom?: boolean;
}

export type ViewType = FeatureId | ChromeViewType;

export interface GeneratedFile {
  filePath: string;
  content: string;
  description: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  view: ViewType;
  props?: any;
  action?: () => void;
}

export interface StructuredPrSummary {
    title: string;
    summary: string;
    changes: string[];
}

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  tier: 'free' | 'pro';
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  email: string | null;
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: FileNode[];
}

export type Theme = 'light' | 'dark';

export interface StructuredExplanation {
    summary: string;
    lineByLine: { lines: string; explanation: string }[];
    complexity: { time: string; space: string };
    suggestions: string[];
}

export interface ColorTheme {
    primary: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textOnPrimary: string;
    border: string;
}

export interface ThemeState {
    mode: Theme;
    customColors: ColorTheme | null;
}

export interface SemanticColorTheme {
    mode: 'light' | 'dark';
    palette: {
        primary: { value: string; name: string; };
        secondary: { value: string; name: string; };
        accent: { value: string; name: string; };
        neutral: { value: string; name: string; };
    };
    theme: {
        background: { value: string; name: string; };
        surface: { value: string; name: string; };
        textPrimary: { value: string; name: string; };
        textSecondary: { value: string; name: string; };
        textOnPrimary: { value: string; name: string; };
        border: { value: string; name: string; };
    };
    accessibility: {
        primaryOnSurface: { ratio: number; score: string; };
        textPrimaryOnSurface: { ratio: number; score:string; };
        textSecondaryOnSurface: { ratio: number; score: string; };
        textOnPrimaryOnPrimary: { ratio: number; score: string; };
    };
}

export interface SlideSummary {
    title: string;
    body: string;
}

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
}

// --- Code Review Types ---
export interface StructuredReviewSuggestion {
    suggestion: string;
    codeBlock: string;
    explanation: string;
}

export interface StructuredReview {
    summary: string;
    suggestions: StructuredReviewSuggestion[];
}

// --- AI Personality Forge Types ---
export interface SystemPrompt {
  id: string;
  name: string;
  persona: string;
  rules: string[];
  outputFormat: 'json' | 'markdown' | 'text';
  exampleIO: { input: string; output: string }[];
}

// --- Vault Types ---
export interface EncryptedData {
    id: string;
    ciphertext: ArrayBuffer;
    iv: Uint8Array;
}

// --- New Types for Implemented Features ---
export interface SecurityVulnerability {
    vulnerability: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
    description: string;
    mitigation: string;
    exploitSuggestion?: string;
}

export interface CodeSmell {
    smell: string;
    line: number;
    explanation: string;
}

export interface CustomFeature {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name as a string
  code: string;
}`,
  'vite.config.ts': `
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    return {
      optimizeDeps: {
        exclude: [
          'axe-core',
          '@google/genai'
        ]
      },
      define: {
        // The GOOGLE_CLIENT_ID is public and safe to expose.
        // The Gemini API key has been removed to be handled securely at runtime.
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        // Disable CORS to mitigate vulnerability where malicious sites can request source files.
        cors: false,
      },
      build: {
        outDir: 'web', // Emit assets to a 'web' directory.
        sourcemap: true, // Enable source maps for easier debugging in production.
        rollupOptions: {
          output: {
            // Improve caching by splitting vendor code into separate chunks.
            manualChunks(id) {
              if (id.includes('node_modules')) {
                return id.toString().split('node_modules/')[1].split('/')[0].toString();
              }
            }
          }
        }
      }
    };
});`,
  'constants.tsx': `


import React from 'react';
import {
    CommandCenterIcon, CodeExplainerIcon, FeatureBuilderIcon, CodeMigratorIcon, ThemeDesignerIcon, SnippetVaultIcon,
    UnitTestGeneratorIcon, CommitGeneratorIcon, GitLogAnalyzerIcon, ConcurrencyAnalyzerIcon, RegexSandboxIcon,
    PromptCraftPadIcon, CodeFormatterIcon, JsonTreeIcon, CssGridEditorIcon, SchemaDesignerIcon, PwaManifestEditorIcon,
    MarkdownSlidesIcon, ScreenshotToComponentIcon, SvgPathEditorIcon, StyleTransferIcon, CodingChallengeIcon,
    CodeReviewBotIcon, ChangelogGeneratorIcon, CronJobBuilderIcon,
    AsyncCallTreeIcon, AudioToCodeIcon, CodeDiffGhostIcon, CodeSpellCheckerIcon, ColorPaletteGeneratorIcon, LogicFlowBuilderIcon,
    MetaTagEditorIcon, NetworkVisualizerIcon, ResponsiveTesterIcon, SassCompilerIcon, ImageGeneratorIcon, XbrlConverterIcon,
    DigitalWhiteboardIcon, TypographyLabIcon, AiPullRequestAssistantIcon, ProjectExplorerIcon,
    ServerStackIcon, DocumentTextIcon, ChartBarIcon, EyeIcon, PaperAirplaneIcon, CloudIcon, ShieldCheckIcon, CpuChipIcon, SparklesIcon,
    MailIcon, BugAntIcon, MagnifyingGlassIcon, RectangleGroupIcon, GcpIcon
} from './components/icons.tsx';

export const CHROME_VIEW_IDS = ['features-list'] as const;

export const FEATURE_CATEGORIES = ['Core', 'AI Tools', 'Frontend', 'Testing', 'Database', 'Data', 'Productivity', 'Git', 'Local Dev', 'Performance & Auditing', 'Deployment & CI/CD', 'Security', 'Workflow', 'Cloud'] as const;
export type FeatureCategory = typeof FEATURE_CATEGORIES[number];

export type SlotCategory = FeatureCategory;
export const SLOTS: SlotCategory[] = ['Core', 'AI Tools', 'Frontend', 'Testing', 'Git', 'Productivity'];

interface RawFeature {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: FeatureCategory;
}

export const RAW_FEATURES: RawFeature[] = [
    // --- Domain 1: Local Development & Testing Parity ---
    { id: "api-mock-generator", name: "API Mock Server", description: "Generate mock API data from a description and serve it locally.", icon: <ServerStackIcon />, category: "Local Dev" },
    { id: "env-manager", name: ".env File Generator", description: "A graphical interface for creating and downloading .env files.", icon: <DocumentTextIcon />, category: "Local Dev" },

    // --- Domain 2: Performance & Optimization Intelligence ---
    { id: "performance-profiler", name: "AI Performance Profiler", description: "Analyze runtime traces and bundle stats with AI-powered advice.", icon: <ChartBarIcon />, category: "Performance & Auditing" },
    { id: "a11y-auditor", name: "Accessibility Auditor", description: "Audit a live URL for accessibility issues and get AI-powered fixes.", icon: <EyeIcon />, category: "Performance & Auditing" },
    { id: "tech-debt-sonar", name: "Tech Debt Sonar", description: "Scan code to find code smells and areas with high complexity.", icon: <MagnifyingGlassIcon />, category: "Performance & Auditing" },

    // --- Domain 3: Deployment & CI/CD Automation ---
    { id: "ci-cd-generator", name: "AI CI/CD Architect", description: "Generate CI/CD config files from a natural language description.", icon: <PaperAirplaneIcon />, category: "Deployment & CI/CD" },
    { id: "deployment-preview", name: "Static Deployment Preview", description: "See a live preview of files generated by the AI Feature Builder.", icon: <CloudIcon />, category: "Deployment & CI/CD" },
    { id: "terraform-generator", name: "AI Terraform Generator", description: "Generate Terraform config from a description and cloud context.", icon: <CpuChipIcon />, category: "Deployment & CI/CD" },

    // --- Domain 4: Security & Vulnerability Scanning ---
    { id: "security-scanner", name: "AI Security Scanner", description: "Find common vulnerabilities in code with static analysis and AI.", icon: <ShieldCheckIcon />, category: "Security" },
    { id: "iam-policy-generator", name: "IAM Policy Generator", description: "Generate AWS or GCP IAM policies from a natural language description.", icon: <ShieldCheckIcon />, category: "Security" },
    { id: "iam-policy-visualizer", name: "GCP IAM Policy Visualizer", description: "Visually test and audit GCP IAM permissions in real-time across your resources.", icon: <GcpIcon />, category: "Cloud" },

    // --- Existing Features (Re-categorized and Ordered) ---
    { id: "ai-command-center", name: "AI Command Center", description: "Use natural language to navigate and control the toolkit.", icon: <CommandCenterIcon />, category: "Core" },
    { id: "project-explorer", name: "Project Explorer", description: "Manage and edit files from your connected repositories.", icon: <ProjectExplorerIcon />, category: "Core" },
    { id: "workspace-connector-hub", name: "Workspace Connector Hub", description: "Connect to services like Jira, Slack & GitHub to orchestrate actions with AI.", icon: <RectangleGroupIcon />, category: "Workflow" },
    { id: "linter-formatter", name: "AI Code Formatter", description: "AI-powered, real-time code formatting.", icon: <CodeFormatterIcon />, category: "Core" },
    { id: "json-tree-navigator", name: "JSON Tree Navigator", description: "Navigate large JSON objects as a collapsible tree.", icon: <JsonTreeIcon />, category: "Core" },
    
    { id: "feature-forge", name: "Feature Forge", description: "Use AI to create new tools and add them to your desktop.", icon: <CpuChipIcon />, category: "AI Tools" },
    { id: "ai-image-generator", name: "AI Image Generator", description: "Generate high-quality images from a text prompt.", icon: <ImageGeneratorIcon />, category: "AI Tools" },
    { id: "ai-code-explainer", name: "AI Code Explainer", description: "Get a structured analysis of code, including complexity.", icon: <CodeExplainerIcon />, category: "AI Tools" },
    { id: "ai-feature-builder", name: "AI Feature Builder", description: "Generate code, tests, and commit messages from a prompt or API schema.", icon: <FeatureBuilderIcon />, category: "AI Tools" },
    { id: "ai-full-stack-builder", name: "AI Full-Stack Builder", description: "Generate a frontend component, backend cloud function, and database rules from a single prompt.", icon: <ServerStackIcon />, category: "AI Tools" },
    { id: "ai-personality-forge", name: "AI Personality Forge", description: "Architect, test, and save complex system prompts to create different 'AI personalities'.", icon: <SparklesIcon />, category: "AI Tools" },
    { id: "ai-code-migrator", name: "AI Code Migrator", description: "Translate code between languages & frameworks.", icon: <CodeMigratorIcon />, category: "AI Tools" },
    { id: "theme-designer", name: "AI Theme Designer", description: "Generate, fine-tune, and export UI color themes from a text description or image.", icon: <ThemeDesignerIcon />, category: "AI Tools" },
    { id: "one-click-refactor", name: "One-Click Refactor", description: "Apply common refactoring patterns to your code with a single click.", icon: <SparklesIcon />, category: "AI Tools" },
    { id: "ai-commit-generator", name: "AI Commit Message Generator", description: "Smart, conventional commits via AI.", icon: <CommitGeneratorIcon />, category: "AI Tools" },
    { id: "prompt-craft-pad", name: "Prompt Craft Pad", description: "Save, edit, and manage your custom AI prompts with variable testing.", icon: <PromptCraftPadIcon />, category: "AI Tools" },
    { id: "ai-style-transfer", name: "AI Code Style Transfer", description: "Rewrite code to match a specific style guide.", icon: <StyleTransferIcon />, category: "AI Tools" },
    { id: "ai-coding-challenge", name: "AI Coding Challenge Generator", description: "Generate unique coding exercises.", icon: <CodingChallengeIcon />, category: "AI Tools" },
    { id: "code-review-bot", name: "AI Code Review Bot", description: "Get an automated code review with one-click refactoring.", icon: <CodeReviewBotIcon />, category: "AI Tools" },
    { id: "ai-pull-request-assistant", name: "AI Pull Request Assistant", description: "Generate a structured PR summary from code diffs and populate a full template.", icon: <AiPullRequestAssistantIcon />, category: "AI Tools" },
    { id: "audio-to-code", name: "AI Audio-to-Code", description: "Speak your programming ideas and watch them turn into code.", icon: <AudioToCodeIcon />, category: "AI Tools" },
    
    { id: "css-grid-editor", name: "CSS Grid Visual Editor", description: "Drag-based layout builder for CSS Grid.", icon: <CssGridEditorIcon />, category: "Frontend" },
    { id: "pwa-manifest-editor", name: "PWA Manifest Editor", description: "Configure and preview Progressive Web App manifests with a home screen simulator.", icon: <PwaManifestEditorIcon />, category: "Frontend" },
    { id: "typography-lab", name: "Typography Lab", description: "Preview font pairings and get CSS import rules.", icon: <TypographyLabIcon />, category: "Frontend" },
    { id: "svg-path-editor", name: "SVG Path Editor", description: "Visually create and manipulate SVG path data with an interactive canvas.", icon: <SvgPathEditorIcon />, category: "Frontend" },
    { id: "color-palette-generator", name: "AI Color Palette Generator", description: "Pick a base color and let Gemini design a beautiful palette.", icon: <ColorPaletteGeneratorIcon />, category: "Frontend" },
    { id: "meta-tag-editor", name: "Meta Tag Editor", description: "Generate SEO/social media meta tags with a live social card preview.", icon: <MetaTagEditorIcon />, category: "Frontend" },
    { id: "responsive-tester", name: "Responsive Tester", description: "Preview your web pages at different screen sizes and custom resolutions.", icon: <ResponsiveTesterIcon />, category: "Frontend" },
    { id: "sass-scss-compiler", name: "SASS/SCSS Compiler", description: "A real-time SASS/SCSS to CSS compiler.", icon: <SassCompilerIcon />, category: "Frontend" },
    
    { id: "ai-unit-test-generator", name: "AI Unit Test Generator", description: "Generate unit tests from source code.", icon: <UnitTestGeneratorIcon />, category: "Testing" },
    { id: "bug-reproducer", name: "Bug Reproducer", description: "Paste a stack trace to automatically generate a failing unit test.", icon: <BugAntIcon />, category: "Testing" },
    { id: "worker-thread-debugger", name: "AI Concurrency Analyzer", description: "Analyze JS for Web Worker issues like race conditions.", icon: <ConcurrencyAnalyzerIcon />, category: "Testing" },
    { id: "regex-sandbox", name: "RegEx Sandbox", description: "Visually test regular expressions, generate them with AI, and inspect match groups.", icon: <RegexSandboxIcon />, category: "Testing" },
    { id: "async-call-tree-viewer", name: "Async Call Tree Viewer", description: "Visualize a tree of asynchronous function calls from JSON data.", icon: <AsyncCallTreeIcon />, category: "Testing" },
    { id: "code-spell-checker", name: "Code Spell Checker", description: "A spell checker that finds common typos in code.", icon: <CodeSpellCheckerIcon />, category: "Testing" },
    { id: "network-visualizer", name: "Network Visualizer", description: "Inspect network resources with a summary and visual waterfall chart.", icon: <NetworkVisualizerIcon />, category: "Testing" },
    
    { id: "visual-git-tree", name: "Visual Git Tree", description: "Visually trace your git commit history with an interactive graph and an AI-powered summary.", icon: <GitLogAnalyzerIcon />, category: "Git" },
    { id: "changelog-generator", name: "AI Changelog Generator", description: "Auto-build changelogs from raw git logs.", icon: <ChangelogGeneratorIcon />, category: "Git" },
    { id: "code-diff-ghost", name: "Code Diff Ghost", description: "Visualize code changes with a 'ghost typing' effect.", icon: <CodeDiffGhostIcon />, category: "Git" },
    
    { id: "cron-job-builder", name: "AI Cron Job Builder", description: "Visually tool to configure cron jobs, with AI.", icon: <CronJobBuilderIcon />, category: "Deployment & CI/CD" },
    
    { id: "portable-snippet-vault", name: "Snippet Vault", description: "Store, search, tag, and enhance reusable code snippets with AI.", icon: <SnippetVaultIcon />, category: "Productivity" },
    { id: "digital-whiteboard", name: "Digital Whiteboard", description: "Organize ideas with interactive sticky notes and get AI-powered summaries.", icon: <DigitalWhiteboardIcon />, category: "Productivity" },
    { id: "markdown-slides-generator", name: "Markdown Slides", description: "Turn markdown into a fullscreen presentation with an interactive overlay.", icon: <MarkdownSlidesIcon />, category: "Productivity" },
    { id: "weekly-digest-generator", name: "Weekly Digest Generator", description: "Generate and send a weekly project summary email via Gmail.", icon: <MailIcon />, category: "Productivity" },
    { id: "gmail-addon-simulator", name: "Gmail Add-on Simulator", description: "A simulation of how contextual add-on scopes would work inside Gmail.", icon: <MailIcon />, category: "Productivity" },
    
    { id: "schema-designer", name: "Schema Designer", description: "Visually design a database schema with a drag-and-drop interface and SQL export.", icon: <SchemaDesignerIcon />, category: "Database" },
    { id: "xbrl-converter", name: "XBRL Converter", description: "Convert JSON data to a simplified XBRL-like XML format using AI.", icon: <XbrlConverterIcon />, category: "Data" },
    { id: "logic-flow-builder", name: "Logic Flow Builder", description: "A visual tool for building application logic flows.", icon: <LogicFlowBuilderIcon />, category: "Workflow" },
];

export const ALL_FEATURE_IDS = RAW_FEATURES.map(f => f.id);`,
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Citibank Demo Business Inc</title>
    <script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19.1.0",
    "react-dom/client": "https://esm.sh/react-dom@19.1.1/client",
    "@google/genai": "https://esm.sh/@google/genai@0.16.0",
    "marked": "https://esm.sh/marked@16.2.1",
    "jszip": "https://esm.sh/jszip@3.10.1",
    "diff": "https://esm.sh/diff@8.0.2",
    "idb": "https://esm.sh/idb@8.0.3",
    "react-colorful": "https://esm.sh/react-colorful@5.6.1",
    "octokit": "https://esm.sh/octokit@5.0.3",
    "axe-core": "https://esm.sh/axe-core@4.10.3",
    "mermaid": "https://esm.sh/mermaid@11.10.1",
    "@tailwindcss/typography": "https://esm.sh/@tailwindcss/typography@0.5.19",
    "react/": "https://aistudiocdn.com/react@^19.1.1/",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.1.1/",
    "vite": "https://aistudiocdn.com/vite@^7.1.3",
    "path": "https://aistudiocdn.com/path@^0.12.7",
    "url": "https://aistudiocdn.com/url@^0.11.4"
  }
}
</script>
    <script src="https://apis.google.com/js/api.js"></script>
    <style>
      html, body, #root {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
      }
    </style>
  <link rel="stylesheet" href="/index.css">
</head>
  <body>
    <div id="root"></div>
    <script id="gsi-client" src="https://accounts.google.com/gsi/client" async defer></script>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>`,
  'package.json': `{
  "name": "devcore-ai-toolkit",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google/genai": "0.16.0",
    "axe-core": "4.10.3",
    "diff": "8.0.2",
    "idb": "8.0.3",
    "jszip": "3.10.1",
    "marked": "16.2.1",
    "mermaid": "11.10.1",
    "octokit": "5.0.3",
    "react": "19.1.0",
    "react-colorful": "5.6.1",
    "react-dom": "19.1.1"
  },
  "devDependencies": {
    "@tailwindcss/typography": "0.5.19",
    "@types/node": "24.3.0",
    "@types/react": "19.1.12",
    "@types/react-dom": "19.1.8",
    "autoprefixer": "10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "4.1.12",
    "typescript": "5.9.2",
    "vite": "7.1.3"
  }
}`,
  'package-lock.json': `{
  "name": "devcore-ai-toolkit",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "devcore-ai-toolkit",
      "version": "0.0.0",
      "dependencies": {
        "@google/genai": "^1.12.0",
        "axe-core": "^4.9.1",
        "diff": "^5.2.0",
        "firebase": "^10.12.2",
        "idb": "^8.0.0",
        "jszip": "^3.10.1",
        "marked": "^13.0.2",
        "mermaid": "^10.9.1",
        "octokit": "^4.0.2",
        "react": "^18.2.0",
        "react-colorful": "^5.6.1",
        "react-dom": "^18.2.0"
      },
      "devDependencies": {
        "@tailwindcss/typography": "^0.5.13",
        "@types/diff": "^5.2.1",
        "@types/jszip": "^3.4.1",
        "@types/marked": "^6.0.0",
        "@types/node": "^20.14.9",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "autoprefixer": "^10.4.19",
        "postcss": "^8.4.38",
        "tailwindcss": "^3.4.3",
        "typescript": "^5.5.2",
        "vite": "^7.1.2"
      }
    },
    "node_modules/@alloc/quick-lru": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz",
      "integrity": "sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@braintree/sanitize-url": {
      "version": "6.0.4",
      "resolved": "https://registry.npmjs.org/@braintree/sanitize-url/-/sanitize-url-6.0.4.tgz",
      "integrity": "sha512-s3jaWicZd0pkP0jf5ysyHUI/RE7MHos6qlToFcGWXVp+ykHOy77OUMrfbgJ9it2C5bow7OIQwYYaHjk9XlBQ2A==",
      "license": "MIT"
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.25.9.tgz",
      "integrity": "sha512-OaGtL73Jck6pBKjNIe24BnFE6agGl+6KxDtTfHhy1HmhthfKouEcOhqpSL64K4/0WCtbKFLOdzD/44cJ4k9opA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.25.9.tgz",
      "integrity": "sha512-5WNI1DaMtxQ7t7B6xa572XMXpHAaI/9Hnhk8lcxF4zVN4xstUgTlvuGDorBguKEnZO70qwEcLpfifMLoxiPqHQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.25.9.tgz",
      "integrity": "sha512-IDrddSmpSv51ftWslJMvl3Q2ZT98fUSL2/rlUXuVqRXHCs5EUF1/f+jbjF5+NG9UffUDMCiTyh8iec7u8RlTLg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.25.9.tgz",
      "integrity": "sha512-I853iMZ1hWZdNllhVZKm34f4wErd4lMyeV7BLzEExGEIZYsOzqDWDf+y082izYUE8gtJnYHdeDpN/6tUdwvfiw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.9.tgz",
      "integrity": "sha512-XIpIDMAjOELi/9PB30vEbVMs3GV1v2zkkPnuyRRURbhqjyzIINwj+nbQATh4H9GxUgH1kFsEyQMxwiLFKUS6Rg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.25.9.tgz",
      "integrity": "sha512-jhHfBzjYTA1IQu8VyrjCX4ApJDnH+ez+IYVEoJHeqJm9VhG9Dh2BYaJritkYK3vMaXrf7Ogr/0MQ8/MeIefsPQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.25.9.tgz",
      "integrity": "sha512-z93DmbnY6fX9+KdD4Ue/H6sYs+bhFQJNCPZsi4XWJoYblUqT06MQUdBCpcSfuiN72AbqeBFu5LVQTjfXDE2A6Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.25.9.tgz",
      "integrity": "sha512-mrKX6H/vOyo5v71YfXWJxLVxgy1kyt1MQaD8wZJgJfG4gq4DpQGpgTB74e5yBeQdyMTbgxp0YtNj7NuHN0PoZg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.25.9.tgz",
      "integrity": "sha512-HBU2Xv78SMgaydBmdor38lg8YDnFKSARg1Q6AT0/y2ezUAKiZvc211RDFHlEZRFNRVhcMamiToo7bDx3VEOYQw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.25.9.tgz",
      "integrity": "sha512-BlB7bIcLT3G26urh5Dmse7fiLmLXnRlopw4s8DalgZ8ef79Jj4aUcYbk90g8iCa2467HX8SAIidbL7gsqXHdRw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.25.9.tgz",
      "integrity": "sha512-e7S3MOJPZGp2QW6AK6+Ly81rC7oOSerQ+P8L0ta4FhVi+/j/v2yZzx5CqqDaWjtPFfYz21Vi1S0auHrap3Ma3A==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.25.9.tgz",
      "integrity": "sha512-Sbe10Bnn0oUAB2AalYztvGcK+o6YFFA/9829PhOCUS9vkJElXGdphz0A3DbMdP8gmKkqPmPcMJmJOrI3VYB1JQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.25.9.tgz",
      "integrity": "sha512-YcM5br0mVyZw2jcQeLIkhWtKPeVfAerES5PvOzaDxVtIyZ2NUBZKNLjC5z3/fUlDgT6w89VsxP2qzNipOaaDyA==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.25.9.tgz",
      "integrity": "sha512-++0HQvasdo20JytyDpFvQtNrEsAgNG2CY1CLMwGXfFTKGBGQT3bOeLSYE2l1fYdvML5KUuwnZ8L1EWe2tzs1w==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.25.9.tgz",
      "integrity": "sha512-uNIBa279Y3fkjV+2cUjx36xkx7eSjb8IvnL01eXUKXez/CBHNRw5ekCGMPM0BcmqBxBcdgUWuUXmVWwm4CH9kg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.25.9.tgz",
      "integrity": "sha512-Mfiphvp3MjC/lctb+7D287Xw1DGzqJPb/J2aHHcHxflUo+8tmN/6d4k6I2yFR7BVo5/g7x2Monq4+Yew0EHRIA==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.25.9.tgz",
      "integrity": "sha512-iSwByxzRe48YVkmpbgoxVzn76BXjlYFXC7NvLYq+b+kDjyyk30J0JY47DIn8z1MO3K0oSl9fZoRmZPQI4Hklzg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.25.9.tgz",
      "integrity": "sha512-9jNJl6FqaUG+COdQMjSCGW4QiMHH88xWbvZ+kRVblZsWrkXlABuGdFJ1E9L7HK+T0Yqd4akKNa/lO0+jDxQD4Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.25.9.tgz",
      "integrity": "sha512-RLLdkflmqRG8KanPGOU7Rpg829ZHu8nFy5Pqdi9U01VYtG9Y0zOG6Vr2z4/S+/3zIyOxiK6cCeYNWOFR9QP87g==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.25.9.tgz",
      "integrity": "sha512-YaFBlPGeDasft5IIM+CQAhJAqS3St3nJzDEgsgFixcfZeyGPCd6eJBWzke5piZuZ7CtL656eOSYKk4Ls2C0FRQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.25.9.tgz",
      "integrity": "sha512-1MkgTCuvMGWuqVtAvkpkXFmtL8XhWy+j4jaSO2wxfJtilVCi0ZE37b8uOdMItIHz4I6z1bWWtEX4CJwcKYLcuA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.25.9.tgz",
      "integrity": "sha512-4Xd0xNiMVXKh6Fa7HEJQbrpP3m3DDn43jKxMjxLLRjWnRsfxjORYJlXPO4JNcXtOyfajXorRKY9NkOpTHptErg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.25.9.tgz",
      "integrity": "sha512-WjH4s6hzo00nNezhp3wFIAfmGZ8U7KtrJNlFMRKxiI9mxEK1scOMAaa9i4crUtu+tBr+0IN6JCuAcSBJZfnphw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.25.9.tgz",
      "integrity": "sha512-mGFrVJHmZiRqmP8xFOc6b84/7xa5y5YvR1x8djzXpJBSv/UsNK6aqec+6JDjConTgvvQefdGhFDAs2DLAds6gQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.25.9.tgz",
      "integrity": "sha512-b33gLVU2k11nVx1OhX3C8QQP6UHQK4ZtN56oFWvVXvz2VkDoe6fbG8TOgHFxEvqeqohmRnIHe5A1+HADk4OQww==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.25.9",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.25.9.tgz",
      "integrity": "sha512-PPOl1mi6lpLNQxnGoyAfschAodRFYXJ+9fs6WHXz7CSWKbOqiMZsubC+BQsVKuul+3vKLuwTHsS2c2y9EoKwxQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@firebase/analytics": {
      "version": "0.10.8",
      "resolved": "https://registry.npmjs.org/@firebase/analytics/-/analytics-0.10.8.tgz",
      "integrity": "sha512-CVnHcS4iRJPqtIDc411+UmFldk0ShSK3OB+D0bKD8Ck5Vro6dbK5+APZpkuWpbfdL359DIQUnAaMLE+zs/PVyA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/analytics-compat": {
      "version": "0.2.14",
      "resolved": "https://registry.npmjs.org/@firebase/analytics-compat/-/analytics-compat-0.2.14.tgz",
      "integrity": "sha512-unRVY6SvRqfNFIAA/kwl4vK+lvQAL2HVcgu9zTrUtTyYDmtIt/lOuHJynBMYEgLnKm39YKBDhtqdapP2e++ASw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/analytics": "0.10.8",
        "@firebase/analytics-types": "0.8.2",
        "@firebase/component": "0.6.9",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/analytics-types": {
      "version": "0.8.2",
      "resolved": "https://registry.npmjs.org/@firebase/analytics-types/-/analytics-types-0.8.2.tgz",
      "integrity": "sha512-EnzNNLh+9/sJsimsA/FGqzakmrAUKLeJvjRHlg8df1f97NLUlFidk9600y0ZgWOp3CAxn6Hjtk+08tixlUOWyw==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/app": {
      "version": "0.10.13",
      "resolved": "https://registry.npmjs.org/@firebase/app/-/app-0.10.13.tgz",
      "integrity": "sha512-OZiDAEK/lDB6xy/XzYAyJJkaDqmQ+BCtOEPLqFvxWKUz5JbBmej7IiiRHdtiIOD/twW7O5AxVsfaaGA/V1bNsA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/app-check": {
      "version": "0.8.8",
      "resolved": "https://registry.npmjs.org/@firebase/app-check/-/app-check-0.8.8.tgz",
      "integrity": "sha512-O49RGF1xj7k6BuhxGpHmqOW5hqBIAEbt2q6POW0lIywx7emYtzPDeQI+ryQpC4zbKX646SoVZ711TN1DBLNSOQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/app-check-compat": {
      "version": "0.3.15",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-compat/-/app-check-compat-0.3.15.tgz",
      "integrity": "sha512-zFIvIFFNqDXpOT2huorz9cwf56VT3oJYRFjSFYdSbGYEJYEaXjLJbfC79lx/zjx4Fh+yuN8pry3TtvwaevrGbg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-check": "0.8.8",
        "@firebase/app-check-types": "0.5.2",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/app-check-interop-types": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-interop-types/-/app-check-interop-types-0.3.2.tgz",
      "integrity": "sha512-LMs47Vinv2HBMZi49C09dJxp0QT5LwDzFaVGf/+ITHe3BlIhUiLNttkATSXplc89A2lAaeTqjgqVkiRfUGyQiQ==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/app-check-types": {
      "version": "0.5.2",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-types/-/app-check-types-0.5.2.tgz",
      "integrity": "sha512-FSOEzTzL5bLUbD2co3Zut46iyPWML6xc4x+78TeaXMSuJap5QObfb+rVvZJtla3asN4RwU7elaQaduP+HFizDA==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/app-compat": {
      "version": "0.2.43",
      "resolved": "https://registry.npmjs.org/@firebase/app-compat/-/app-compat-0.2.43.tgz",
      "integrity": "sha512-HM96ZyIblXjAC7TzE8wIk2QhHlSvksYkQ4Ukh1GmEenzkucSNUmUX4QvoKrqeWsLEQ8hdcojABeCV8ybVyZmeg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app": "0.10.13",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/app-types": {
      "version": "0.9.2",
      "resolved": "https://registry.npmjs.org/@firebase/app-types/-/app-types-0.9.2.tgz",
      "integrity": "sha512-oMEZ1TDlBz479lmABwWsWjzHwheQKiAgnuKxE0pz0IXCVx7/rtlkx1fQ6GfgK24WCrxDKMplZrT50Kh04iMbXQ==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/app/node_modules/idb": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/idb/-/idb-7.1.1.tgz",
      "integrity": "sha512-gchesWBzyvGHRO9W8tzUWFDycow5gwjvFKfyV9FF32Y7F50yZMp7mP+T2mJIWFx49zicqyC4uefHM17o6xKIVQ==",
      "license": "ISC"
    },
    "node_modules/@firebase/auth-compat": {
      "version": "0.5.14",
      "resolved": "https://registry.npmjs.org/@firebase/auth-compat/-/auth-compat-0.5.14.tgz",
      "integrity": "sha512-2eczCSqBl1KUPJacZlFpQayvpilg3dxXLy9cSMTKtQMTQSmondUtPI47P3ikH3bQAXhzKLOE+qVxJ3/IRtu9pw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/auth": "1.7.9",
        "@firebase/auth-types": "0.12.2",
        "@firebase/component": "0.6.9",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/auth-compat/node_modules/@firebase/auth": {
      "version": "1.7.9",
      "resolved": "https://registry.npmjs.org/@firebase/auth/-/auth-1.7.9.tgz",
      "integrity": "sha512-yLD5095kVgDw965jepMyUrIgDklD6qH/BZNHeKOgvu7pchOKNjVM+zQoOVYJIKWMWOWBq8IRNVU6NXzBbozaJg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@react-native-async-storage/async-storage": "^1.18.1"
      },
      "peerDependenciesMeta": {
        "@react-native-async-storage/async-storage": {
          "optional": true
        }
      }
    },
    "node_modules/@firebase/auth-interop-types": {
      "version": "0.2.3",
      "resolved": "https://registry.npmjs.org/@firebase/auth-interop-types/-/auth-interop-types-0.2.3.tgz",
      "integrity": "sha512-Fc9wuJGgxoxQeavybiuwgyi+0rssr76b+nHpj+eGhXFYAdudMWyfBHvFL/I5fEHniUM/UQdFzi9VXJK2iZF7FQ==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/auth-types": {
      "version": "0.12.2",
      "resolved": "https://registry.npmjs.org/@firebase/auth-types/-/auth-types-0.12.2.tgz",
      "integrity": "sha512-qsEBaRMoGvHO10unlDJhaKSuPn4pyoTtlQuP1ghZfzB6rNQPuhp/N/DcFZxm9i4v0SogjCbf9reWupwIvfmH6w==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/component": {
      "version": "0.6.9",
      "resolved": "https://registry.npmjs.org/@firebase/component/-/component-0.6.9.tgz",
      "integrity": "sha512-gm8EUEJE/fEac86AvHn8Z/QW8BvR56TBw3hMW0O838J/1mThYQXAIQBgUv75EqlCZfdawpWLrKt1uXvp9ciK3Q==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/data-connect": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/@firebase/data-connect/-/data-connect-0.1.0.tgz",
      "integrity": "sha512-vSe5s8dY13ilhLnfY0eYRmQsdTbH7PUFZtBbqU6JVX/j8Qp9A6G5gG6//ulbX9/1JFOF1IWNOne9c8S/DOCJaQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/auth-interop-types": "0.2.3",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/database": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@firebase/database/-/database-1.0.8.tgz",
      "integrity": "sha512-dzXALZeBI1U5TXt6619cv0+tgEhJiwlUtQ55WNZY7vGAjv7Q1QioV969iYwt1AQQ0ovHnEW0YW9TiBfefLvErg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.2",
        "@firebase/auth-interop-types": "0.2.3",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "faye-websocket": "0.11.4",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/database-compat": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@firebase/database-compat/-/database-compat-1.0.8.tgz",
      "integrity": "sha512-OpeWZoPE3sGIRPBKYnW9wLad25RaWbGyk7fFQe4xnJQKRzlynWeFBSRRAoLE2Old01WXwskUiucNqUUVlFsceg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/database": "1.0.8",
        "@firebase/database-types": "1.0.5",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/database-types": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/@firebase/database-types/-/database-types-1.0.5.tgz",
      "integrity": "sha512-fTlqCNwFYyq/C6W7AJ5OCuq5CeZuBEsEwptnVxlNPkWCo5cTTyukzAHRSO/jaQcItz33FfYrrFk1SJofcu2AaQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-types": "0.9.2",
        "@firebase/util": "1.10.0"
      }
    },
    "node_modules/@firebase/firestore": {
      "version": "4.7.3",
      "resolved": "https://registry.npmjs.org/@firebase/firestore/-/firestore-4.7.3.tgz",
      "integrity": "sha512-NwVU+JPZ/3bhvNSJMCSzfcBZZg8SUGyzZ2T0EW3/bkUeefCyzMISSt/TTIfEHc8cdyXGlMqfGe3/62u9s74UEg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "@firebase/webchannel-wrapper": "1.0.1",
        "@grpc/grpc-js": "~1.9.0",
        "@grpc/proto-loader": "^0.7.8",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "engines": {
        "node": ">=10.10.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/firestore-compat": {
      "version": "0.3.38",
      "resolved": "https://registry.npmjs.org/@firebase/firestore-compat/-/firestore-compat-0.3.38.tgz",
      "integrity": "sha512-GoS0bIMMkjpLni6StSwRJarpu2+S5m346Na7gr9YZ/BZ/W3/8iHGNr9PxC+f0rNZXqS4fGRn88pICjrZEgbkqQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/firestore": "4.7.3",
        "@firebase/firestore-types": "3.0.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/firestore-types": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/@firebase/firestore-types/-/firestore-types-3.0.2.tgz",
      "integrity": "sha512-wp1A+t5rI2Qc/2q7r2ZpjUXkRVPtGMd6zCLsiWurjsQpqPgFin3AhNibKcIzoF2rnToNa/XYtyWXuifjOOwDgg==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/functions": {
      "version": "0.11.8",
      "resolved": "https://registry.npmjs.org/@firebase/functions/-/functions-0.11.8.tgz",
      "integrity": "sha512-Lo2rTPDn96naFIlSZKVd1yvRRqqqwiJk7cf9TZhUerwnPKgBzXy+aHE22ry+6EjCaQusUoNai6mU6p+G8QZT1g==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.2",
        "@firebase/auth-interop-types": "0.2.3",
        "@firebase/component": "0.6.9",
        "@firebase/messaging-interop-types": "0.2.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/functions-compat": {
      "version": "0.3.14",
      "resolved": "https://registry.npmjs.org/@firebase/functions-compat/-/functions-compat-0.3.14.tgz",
      "integrity": "sha512-dZ0PKOKQFnOlMfcim39XzaXonSuPPAVuzpqA4ONTIdyaJK/OnBaIEVs/+BH4faa1a2tLeR+Jy15PKqDRQoNIJw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/functions": "0.11.8",
        "@firebase/functions-types": "0.6.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/functions-types": {
      "version": "0.6.2",
      "resolved": "https://registry.npmjs.org/@firebase/functions-types/-/functions-types-0.6.2.tgz",
      "integrity": "sha512-0KiJ9lZ28nS2iJJvimpY4nNccV21rkQyor5Iheu/nq8aKXJqtJdeSlZDspjPSBBiHRzo7/GMUttegnsEITqR+w==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/installations": {
      "version": "0.6.9",
      "resolved": "https://registry.npmjs.org/@firebase/installations/-/installations-0.6.9.tgz",
      "integrity": "sha512-hlT7AwCiKghOX3XizLxXOsTFiFCQnp/oj86zp1UxwDGmyzsyoxtX+UIZyVyH/oBF5+XtblFG9KZzZQ/h+dpy+Q==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/util": "1.10.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/installations-compat": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/@firebase/installations-compat/-/installations-compat-0.2.9.tgz",
      "integrity": "sha512-2lfdc6kPXR7WaL4FCQSQUhXcPbI7ol3wF+vkgtU25r77OxPf8F/VmswQ7sgIkBBWtymn5ZF20TIKtnOj9rjb6w==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/installations-types": "0.5.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/installations-types": {
      "version": "0.5.2",
      "resolved": "https://registry.npmjs.org/@firebase/installations-types/-/installations-types-0.5.2.tgz",
      "integrity": "sha512-que84TqGRZJpJKHBlF2pkvc1YcXrtEDOVGiDjovP/a3s6W4nlbohGXEsBJo0JCeeg/UG9A+DEZVDUV9GpklUzA==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "@firebase/app-types": "0.x"
      }
    },
    "node_modules/@firebase/installations/node_modules/idb": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/idb/-/idb-7.1.1.tgz",
      "integrity": "sha512-gchesWBzyvGHRO9W8tzUWFDycow5gwjvFKfyV9FF32Y7F50yZMp7mP+T2mJIWFx49zicqyC4uefHM17o6xKIVQ==",
      "license": "ISC"
    },
    "node_modules/@firebase/logger": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@firebase/logger/-/logger-0.4.2.tgz",
      "integrity": "sha512-Q1VuA5M1Gjqrwom6I6NUU4lQXdo9IAQieXlujeHZWvRt1b7qQ0KwBaNAjgxG27jgF9/mUwsNmO8ptBCGVYhB0A==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/messaging": {
      "version": "0.12.12",
      "resolved": "https://registry.npmjs.org/@firebase/messaging/-/messaging-0.12.12.tgz",
      "integrity": "sha512-6q0pbzYBJhZEtUoQx7hnPhZvAbuMNuBXKQXOx2YlWhSrlv9N1m0ZzlNpBbu/ItTzrwNKTibdYzUyaaxdWLg+4w==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/messaging-interop-types": "0.2.2",
        "@firebase/util": "1.10.0",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/messaging-compat": {
      "version": "0.2.12",
      "resolved": "https://registry.npmjs.org/@firebase/messaging-compat/-/messaging-compat-0.2.12.tgz",
      "integrity": "sha512-pKsiUVZrbmRgdImYqhBNZlkKJbqjlPkVdQRZGRbkTyX4OSGKR0F/oJeCt1a8jEg5UnBp4fdVwSWSp4DuCovvEQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/messaging": "0.12.12",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/messaging-interop-types": {
      "version": "0.2.2",
      "resolved": "https://registry.npmjs.org/@firebase/messaging-interop-types/-/messaging-interop-types-0.2.2.tgz",
      "integrity": "sha512-l68HXbuD2PPzDUOFb3aG+nZj5KA3INcPwlocwLZOzPp9rFM9yeuI9YLl6DQfguTX5eAGxO0doTR+rDLDvQb5tA==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/messaging/node_modules/idb": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/idb/-/idb-7.1.1.tgz",
      "integrity": "sha512-gchesWBzyvGHRO9W8tzUWFDycow5gwjvFKfyV9FF32Y7F50yZMp7mP+T2mJIWFx49zicqyC4uefHM17o6xKIVQ==",
      "license": "ISC"
    },
    "node_modules/@firebase/performance": {
      "version": "0.6.9",
      "resolved": "https://registry.npmjs.org/@firebase/performance/-/performance-0.6.9.tgz",
      "integrity": "sha512-PnVaak5sqfz5ivhua+HserxTJHtCar/7zM0flCX6NkzBNzJzyzlH4Hs94h2Il0LQB99roBqoE5QT1JqWqcLJHQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/performance-compat": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/@firebase/performance-compat/-/performance-compat-0.2.9.tgz",
      "integrity": "sha512-dNl95IUnpsu3fAfYBZDCVhXNkASE0uo4HYaEPd2/PKscfTvsgqFAOxfAXzBEDOnynDWiaGUnb5M1O00JQ+3FXA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/performance": "0.6.9",
        "@firebase/performance-types": "0.2.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/performance-types": {
      "version": "0.2.2",
      "resolved": "https://registry.npmjs.org/@firebase/performance-types/-/performance-types-0.2.2.tgz",
      "integrity": "sha512-gVq0/lAClVH5STrIdKnHnCo2UcPLjJlDUoEB/tB4KM+hAeHUxWKnpT0nemUPvxZ5nbdY/pybeyMe8Cs29gEcHA==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/remote-config": {
      "version": "0.4.9",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config/-/remote-config-0.4.9.tgz",
      "integrity": "sha512-EO1NLCWSPMHdDSRGwZ73kxEEcTopAxX1naqLJFNApp4hO8WfKfmEpmjxmP5TrrnypjIf2tUkYaKsfbEA7+AMmA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/installations": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/remote-config-compat": {
      "version": "0.2.9",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config-compat/-/remote-config-compat-0.2.9.tgz",
      "integrity": "sha512-AxzGpWfWFYejH2twxfdOJt5Cfh/ATHONegTd/a0p5flEzsD5JsxXgfkFToop+mypEL3gNwawxrxlZddmDoNxyA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/remote-config": "0.4.9",
        "@firebase/remote-config-types": "0.3.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/remote-config-types": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config-types/-/remote-config-types-0.3.2.tgz",
      "integrity": "sha512-0BC4+Ud7y2aPTyhXJTMTFfrGGLqdYXrUB9sJVAB8NiqJswDTc4/2qrE/yfUbnQJhbSi6ZaTTBKyG3n1nplssaA==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/storage": {
      "version": "0.13.2",
      "resolved": "https://registry.npmjs.org/@firebase/storage/-/storage-0.13.2.tgz",
      "integrity": "sha512-fxuJnHshbhVwuJ4FuISLu+/76Aby2sh+44ztjF2ppoe0TELIDxPW6/r1KGlWYt//AD0IodDYYA8ZTN89q8YqUw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0",
        "undici": "6.19.7"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/storage-compat": {
      "version": "0.3.12",
      "resolved": "https://registry.npmjs.org/@firebase/storage-compat/-/storage-compat-0.3.12.tgz",
      "integrity": "sha512-hA4VWKyGU5bWOll+uwzzhEMMYGu9PlKQc1w4DWxB3aIErWYzonrZjF0icqNQZbwKNIdh8SHjZlFeB2w6OSsjfg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.6.9",
        "@firebase/storage": "0.13.2",
        "@firebase/storage-types": "0.8.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/storage-types": {
      "version": "0.8.2",
      "resolved": "https://registry.npmjs.org/@firebase/storage-types/-/storage-types-0.8.2.tgz",
      "integrity": "sha512-0vWu99rdey0g53lA7IShoA2Lol1jfnPovzLDUBuon65K7uKG9G+L5uO05brD9pMw+l4HRFw23ah3GwTGpEav6g==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/util": {
      "version": "1.10.0",
      "resolved": "https://registry.npmjs.org/@firebase/util/-/util-1.10.0.tgz",
      "integrity": "sha512-xKtx4A668icQqoANRxyDLBLz51TAbDP9KRfpbKGxiCAW346d0BeJe5vN6/hKxxmWwnZ0mautyv39JxviwwQMOQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.1.0"
      }
    },
    "node_modules/@firebase/vertexai-preview": {
      "version": "0.0.4",
      "resolved": "https://registry.npmjs.org/@firebase/vertexai-preview/-/vertexai-preview-0.0.4.tgz",
      "integrity": "sha512-EBSqyu9eg8frQlVU9/HjKtHN7odqbh9MtAcVz3WwHj4gLCLOoN9F/o+oxlq3CxvFrd3CNTZwu6d2mZtVlEInng==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.2",
        "@firebase/component": "0.6.9",
        "@firebase/logger": "0.4.2",
        "@firebase/util": "1.10.0",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=18.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-types": "0.x"
      }
    },
    "node_modules/@firebase/webchannel-wrapper": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@firebase/webchannel-wrapper/-/webchannel-wrapper-1.0.1.tgz",
      "integrity": "sha512-jmEnr/pk0yVkA7mIlHNnxCi+wWzOFUg0WyIotgkKAb2u1J7fAeDBcVNSTjTihbAYNusCLQdW5s9IJ5qwnEufcQ==",
      "license": "Apache-2.0"
    },
    "node_modules/@google/genai": {
      "version": "1.15.0",
      "resolved": "https://registry.npmjs.org/@google/genai/-/genai-1.15.0.tgz",
      "integrity": "sha512-4CSW+hRTESWl3xVtde7pkQ3E+dDFhDq+m4ztmccRctZfx1gKy3v0M9STIMGk6Nq0s6O2uKMXupOZQ1JGorXVwQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "google-auth-library": "^9.14.2",
        "ws": "^8.18.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@modelcontextprotocol/sdk": "^1.11.0"
      },
      "peerDependenciesMeta": {
        "@modelcontextprotocol/sdk": {
          "optional": true
        }
      }
    },
    "node_modules/@grpc/grpc-js": {
      "version": "1.9.15",
      "resolved": "https://registry.npmjs.org/@grpc/grpc-js/-/grpc-js-1.9.15.tgz",
      "integrity": "sha512-nqE7Hc0AzI+euzUwDAy0aY5hCp10r734gMGRdU+qOPX0XSceI2ULrcXB5U2xSc5VkWwalCj4M7GzCAygZl2KoQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@grpc/proto-loader": "^0.7.8",
        "@types/node": ">=12.12.47"
      },
      "engines": {
        "node": "^8.13.0 || >=10.10.0"
      }
    },
    "node_modules/@grpc/proto-loader": {
      "version": "0.7.15",
      "resolved": "https://registry.npmjs.org/@grpc/proto-loader/-/proto-loader-0.7.15.tgz",
      "integrity": "sha512-tMXdRCfYVixjuFK+Hk0Q1s38gV9zDiDJfWL3h1rv4Qc39oILCu1TRTDt7+fGUI8K4G1Fj125Hx/ru3azECWTyQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "lodash.camelcase": "^4.3.0",
        "long": "^5.0.0",
        "protobufjs": "^7.2.5",
        "yargs": "^17.7.2"
      },
      "bin": {
        "proto-loader-gen-types": "build/bin/proto-loader-gen-types.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/@isaacs/cliui": {
      "version": "8.0.2",
      "resolved": "https://registry.npmjs.org/@isaacs/cliui/-/cliui-8.0.2.tgz",
      "integrity": "sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "string-width": "^5.1.2",
        "string-width-cjs": "npm:string-width@^4.2.0",
        "strip-ansi": "^7.0.1",
        "strip-ansi-cjs": "npm:strip-ansi@^6.0.1",
        "wrap-ansi": "^8.1.0",
        "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
      "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.30",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.30.tgz",
      "integrity": "sha512-GQ7Nw5G2lTu/BtHTKfXhKHok2WGetd4XYcVKGx00SjAk8GMwgJM3zr6zORiPGuOE+/vkc90KtTosSSvaCjKb2Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@nodelib/fs.scandir": {
      "version": "2.1.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.scandir/-/fs.scandir-2.1.5.tgz",
      "integrity": "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.stat": "2.0.5",
        "run-parallel": "^1.1.9"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.stat": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.stat/-/fs.stat-2.0.5.tgz",
      "integrity": "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@nodelib/fs.walk": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/@nodelib/fs.walk/-/fs.walk-1.2.8.tgz",
      "integrity": "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@nodelib/fs.scandir": "2.1.5",
        "fastq": "^1.6.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/@octokit/app": {
      "version": "15.1.6",
      "resolved": "https://registry.npmjs.org/@octokit/app/-/app-15.1.6.tgz",
      "integrity": "sha512-WELCamoCJo9SN0lf3SWZccf68CF0sBNPQuLYmZ/n87p5qvBJDe9aBtr5dHkh7T9nxWZ608pizwsUbypSzZAiUw==",
      "license": "MIT",
      "dependencies": {
        "@octokit/auth-app": "^7.2.1",
        "@octokit/auth-unauthenticated": "^6.1.3",
        "@octokit/core": "^6.1.5",
        "@octokit/oauth-app": "^7.1.6",
        "@octokit/plugin-paginate-rest": "^12.0.0",
        "@octokit/types": "^14.0.0",
        "@octokit/webhooks": "^13.6.1"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/auth-app": {
      "version": "7.2.2",
      "resolved": "https://registry.npmjs.org/@octokit/auth-app/-/auth-app-7.2.2.tgz",
      "integrity": "sha512-p6hJtEyQDCJEPN9ijjhEC/kpFHMHN4Gca9r+8S0S8EJi7NaWftaEmexjxxpT1DFBeJpN4u/5RE22ArnyypupJw==",
      "license": "MIT",
      "dependencies": {
        "@octokit/auth-oauth-app": "^8.1.4",
        "@octokit/auth-oauth-user": "^5.1.4",
        "@octokit/request": "^9.2.3",
        "@octokit/request-error": "^6.1.8",
        "@octokit/types": "^14.0.0",
        "toad-cache": "^3.7.0",
        "universal-github-app-jwt": "^2.2.0",
        "universal-user-agent": "^7.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/auth-oauth-app": {
      "version": "8.1.4",
      "resolved": "https://registry.npmjs.org/@octokit/auth-oauth-app/-/auth-oauth-app-8.1.4.tgz",
      "integrity": "sha512-71iBa5SflSXcclk/OL3lJzdt4iFs56OJdpBGEBl1wULp7C58uiswZLV6TdRaiAzHP1LT8ezpbHlKuxADb+4NkQ==",
      "license": "MIT",
      "dependencies": {
        "@octokit/auth-oauth-device": "^7.1.5",
        "@octokit/auth-oauth-user": "^5.1.4",
        "@octokit/request": "^9.2.3",
        "@octokit/types": "^14.0.0",
        "universal-user-agent": "^7.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/auth-oauth-device": {
      "version": "7.1.5",
      "resolved": "https://registry.npmjs.org/@octokit/auth-oauth-device/-/auth-oauth-device-7.1.5.tgz",
      "integrity": "sha512-lR00+k7+N6xeECj0JuXeULQ2TSBB/zjTAmNF2+vyGPDEFx1dgk1hTDmL13MjbSmzusuAmuJD8Pu39rjp9jH6yw==",
      "license": "MIT",
      "dependencies": {
        "@octokit/oauth-methods": "^5.1.5",
        "@octokit/request": "^9.2.3",
        "@octokit/types": "^14.0.0",
        "universal-user-agent": "^7.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/auth-oauth-user": {
      "version": "5.1.6",
      "resolved": "https://registry.npmjs.org/@octokit/auth-oauth-user/-/auth-oauth-user-5.1.6.tgz",
      "integrity": "sha512-/R8vgeoulp7rJs+wfJ2LtXEVC7pjQTIqDab7wPKwVG6+2v/lUnCOub6vaHmysQBbb45FknM3tbHW8TOVqYHxCw==",
      "license": "MIT",
      "dependencies": {
        "@octokit/auth-oauth-device": "^7.1.5",
        "@octokit/oauth-methods": "^5.1.5",
        "@octokit/request": "^9.2.3",
        "@octokit/types": "^14.0.0",
        "universal-user-agent": "^7.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/auth-token": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/@octokit/auth-token/-/auth-token-5.1.2.tgz",
      "integrity": "sha512-JcQDsBdg49Yky2w2ld20IHAlwr8d/d8N6NiOXbtuoPCqzbsiJgF633mVUw3x4mo0H5ypataQIX7SFu3yy44Mpw==",
      "license": "MIT",
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/auth-unauthenticated": {
      "version": "6.1.3",
      "resolved": "https://registry.npmjs.org/@octokit/auth-unauthenticated/-/auth-unauthenticated-6.1.3.tgz",
      "integrity": "sha512-d5gWJla3WdSl1yjbfMpET+hUSFCE15qM0KVSB0H1shyuJihf/RL1KqWoZMIaonHvlNojkL9XtLFp8QeLe+1iwA==",
      "license": "MIT",
      "dependencies": {
        "@octokit/request-error": "^6.1.8",
        "@octokit/types": "^14.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/core": {
      "version": "6.1.6",
      "resolved": "https://registry.npmjs.org/@octokit/core/-/core-6.1.6.tgz",
      "integrity": "sha512-kIU8SLQkYWGp3pVKiYzA5OSaNF5EE03P/R8zEmmrG6XwOg5oBjXyQVVIauQ0dgau4zYhpZEhJrvIYt6oM+zZZA==",
      "license": "MIT",
      "dependencies": {
        "@octokit/auth-token": "^5.0.0",
        "@octokit/graphql": "^8.2.2",
        "@octokit/request": "^9.2.3",
        "@octokit/request-error": "^6.1.8",
        "@octokit/types": "^14.0.0",
        "before-after-hook": "^3.0.2",
        "universal-user-agent": "^7.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/endpoint": {
      "version": "10.1.4",
      "resolved": "https://registry.npmjs.org/@octokit/endpoint/-/endpoint-10.1.4.tgz",
      "integrity": "sha512-OlYOlZIsfEVZm5HCSR8aSg02T2lbUWOsCQoPKfTXJwDzcHQBrVBGdGXb89dv2Kw2ToZaRtudp8O3ZIYoaOjKlA==",
      "license": "MIT",
      "dependencies": {
        "@octokit/types": "^14.0.0",
        "universal-user-agent": "^7.0.2"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/graphql": {
      "version": "8.2.2",
      "resolved": "https://registry.npmjs.org/@octokit/graphql/-/graphql-8.2.2.tgz",
      "integrity": "sha512-Yi8hcoqsrXGdt0yObxbebHXFOiUA+2v3n53epuOg1QUgOB6c4XzvisBNVXJSl8RYA5KrDuSL2yq9Qmqe5N0ryA==",
      "license": "MIT",
      "dependencies": {
        "@octokit/request": "^9.2.3",
        "@octokit/types": "^14.0.0",
        "universal-user-agent": "^7.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/oauth-app": {
      "version": "7.1.6",
      "resolved": "https://registry.npmjs.org/@octokit/oauth-app/-/oauth-app-7.1.6.tgz",
      "integrity": "sha512-OMcMzY2WFARg80oJNFwWbY51TBUfLH4JGTy119cqiDawSFXSIBujxmpXiKbGWQlvfn0CxE6f7/+c6+Kr5hI2YA==",
      "license": "MIT",
      "dependencies": {
        "@octokit/auth-oauth-app": "^8.1.3",
        "@octokit/auth-oauth-user": "^5.1.3",
        "@octokit/auth-unauthenticated": "^6.1.2",
        "@octokit/core": "^6.1.4",
        "@octokit/oauth-authorization-url": "^7.1.1",
        "@octokit/oauth-methods": "^5.1.4",
        "@types/aws-lambda": "^8.10.83",
        "universal-user-agent": "^7.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/oauth-authorization-url": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/@octokit/oauth-authorization-url/-/oauth-authorization-url-7.1.1.tgz",
      "integrity": "sha512-ooXV8GBSabSWyhLUowlMIVd9l1s2nsOGQdlP2SQ4LnkEsGXzeCvbSbCPdZThXhEFzleGPwbapT0Sb+YhXRyjCA==",
      "license": "MIT",
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/oauth-methods": {
      "version": "5.1.5",
      "resolved": "https://registry.npmjs.org/@octokit/oauth-methods/-/oauth-methods-5.1.5.tgz",
      "integrity": "sha512-Ev7K8bkYrYLhoOSZGVAGsLEscZQyq7XQONCBBAl2JdMg7IT3PQn/y8P0KjloPoYpI5UylqYrLeUcScaYWXwDvw==",
      "license": "MIT",
      "dependencies": {
        "@octokit/oauth-authorization-url": "^7.0.0",
        "@octokit/request": "^9.2.3",
        "@octokit/request-error": "^6.1.8",
        "@octokit/types": "^14.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/openapi-types": {
      "version": "25.1.0",
      "resolved": "https://registry.npmjs.org/@octokit/openapi-types/-/openapi-types-25.1.0.tgz",
      "integrity": "sha512-idsIggNXUKkk0+BExUn1dQ92sfysJrje03Q0bv0e+KPLrvyqZF8MnBpFz8UNfYDwB3Ie7Z0TByjWfzxt7vseaA==",
      "license": "MIT"
    },
    "node_modules/@octokit/openapi-webhooks-types": {
      "version": "11.0.0",
      "resolved": "https://registry.npmjs.org/@octokit/openapi-webhooks-types/-/openapi-webhooks-types-11.0.0.tgz",
      "integrity": "sha512-ZBzCFj98v3SuRM7oBas6BHZMJRadlnDoeFfvm1olVxZnYeU6Vh97FhPxyS5aLh5pN51GYv2I51l/hVUAVkGBlA==",
      "license": "MIT"
    },
    "node_modules/@octokit/plugin-paginate-graphql": {
      "version": "5.2.4",
      "resolved": "https://registry.npmjs.org/@octokit/plugin-paginate-graphql/-/plugin-paginate-graphql-5.2.4.tgz",
      "integrity": "sha512-pLZES1jWaOynXKHOqdnwZ5ULeVR6tVVCMm+AUbp0htdcyXDU95WbkYdU4R2ej1wKj5Tu94Mee2Ne0PjPO9cCyA==",
      "license": "MIT",
      "engines": {
        "node": ">= 18"
      },
      "peerDependencies": {
        "@octokit/core": ">=6"
      }
    },
    "node_modules/@octokit/plugin-paginate-rest": {
      "version": "12.0.0",
      "resolved": "https://registry.npmjs.org/@octokit/plugin-paginate-rest/-/plugin-paginate-rest-12.0.0.tgz",
      "integrity": "sha512-MPd6WK1VtZ52lFrgZ0R2FlaoiWllzgqFHaSZxvp72NmoDeZ0m8GeJdg4oB6ctqMTYyrnDYp592Xma21mrgiyDA==",
      "license": "MIT",
      "dependencies": {
        "@octokit/types": "^14.0.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "peerDependencies": {
        "@octokit/core": ">=6"
      }
    },
    "node_modules/@octokit/plugin-rest-endpoint-methods": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/@octokit/plugin-rest-endpoint-methods/-/plugin-rest-endpoint-methods-14.0.0.tgz",
      "integrity": "sha512-iQt6ovem4b7zZYZQtdv+PwgbL5VPq37th1m2x2TdkgimIDJpsi2A6Q/OI/23i/hR6z5mL0EgisNR4dcbmckSZQ==",
      "license": "MIT",
      "dependencies": {
        "@octokit/types": "^14.0.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "peerDependencies": {
        "@octokit/core": ">=6"
      }
    },
    "node_modules/@octokit/plugin-retry": {
      "version": "7.2.1",
      "resolved": "https://registry.npmjs.org/@octokit/plugin-retry/-/plugin-retry-7.2.1.tgz",
      "integrity": "sha512-wUc3gv0D6vNHpGxSaR3FlqJpTXGWgqmk607N9L3LvPL4QjaxDgX/1nY2mGpT37Khn+nlIXdljczkRnNdTTV3/A==",
      "license": "MIT",
      "dependencies": {
        "@octokit/request-error": "^6.1.8",
        "@octokit/types": "^14.0.0",
        "bottleneck": "^2.15.3"
      },
      "engines": {
        "node": ">= 18"
      },
      "peerDependencies": {
        "@octokit/core": ">=6"
      }
    },
    "node_modules/@octokit/plugin-throttling": {
      "version": "10.0.0",
      "resolved": "https://registry.npmjs.org/@octokit/plugin-throttling/-/plugin-throttling-10.0.0.tgz",
      "integrity": "sha512-Kuq5/qs0DVYTHZuBAzCZStCzo2nKvVRo/TDNhCcpC2TKiOGz/DisXMCvjt3/b5kr6SCI1Y8eeeJTHBxxpFvZEg==",
      "license": "MIT",
      "dependencies": {
        "@octokit/types": "^14.0.0",
        "bottleneck": "^2.15.3"
      },
      "engines": {
        "node": ">= 18"
      },
      "peerDependencies": {
        "@octokit/core": "^6.1.3"
      }
    },
    "node_modules/@octokit/request": {
      "version": "9.2.4",
      "resolved": "https://registry.npmjs.org/@octokit/request/-/request-9.2.4.tgz",
      "integrity": "sha512-q8ybdytBmxa6KogWlNa818r0k1wlqzNC+yNkcQDECHvQo8Vmstrg18JwqJHdJdUiHD2sjlwBgSm9kHkOKe2iyA==",
      "license": "MIT",
      "dependencies": {
        "@octokit/endpoint": "^10.1.4",
        "@octokit/request-error": "^6.1.8",
        "@octokit/types": "^14.0.0",
        "fast-content-type-parse": "^2.0.0",
        "universal-user-agent": "^7.0.2"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/request-error": {
      "version": "6.1.8",
      "resolved": "https://registry.npmjs.org/@octokit/request-error/-/request-error-6.1.8.tgz",
      "integrity": "sha512-WEi/R0Jmq+IJKydWlKDmryPcmdYSVjL3ekaiEL1L9eo1sUnqMJ+grqmC9cjk7CA7+b2/T397tO5d8YLOH3qYpQ==",
      "license": "MIT",
      "dependencies": {
        "@octokit/types": "^14.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/types": {
      "version": "14.1.0",
      "resolved": "https://registry.npmjs.org/@octokit/types/-/types-14.1.0.tgz",
      "integrity": "sha512-1y6DgTy8Jomcpu33N+p5w58l6xyt55Ar2I91RPiIA0xCJBXyUAhXCcmZaDWSANiha7R9a6qJJ2CRomGPZ6f46g==",
      "license": "MIT",
      "dependencies": {
        "@octokit/openapi-types": "^25.1.0"
      }
    },
    "node_modules/@octokit/webhooks": {
      "version": "13.9.1",
      "resolved": "https://registry.npmjs.org/@octokit/webhooks/-/webhooks-13.9.1.tgz",
      "integrity": "sha512-Nss2b4Jyn4wB3EAqAPJypGuCJFalz/ZujKBQQ5934To7Xw9xjf4hkr/EAByxQY7hp7MKd790bWGz7XYSTsHmaw==",
      "license": "MIT",
      "dependencies": {
        "@octokit/openapi-webhooks-types": "11.0.0",
        "@octokit/request-error": "^6.1.7",
        "@octokit/webhooks-methods": "^5.1.1"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@octokit/webhooks-methods": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/@octokit/webhooks-methods/-/webhooks-methods-5.1.1.tgz",
      "integrity": "sha512-NGlEHZDseJTCj8TMMFehzwa9g7On4KJMPVHDSrHxCQumL6uSQR8wIkP/qesv52fXqV1BPf4pTxwtS31ldAt9Xg==",
      "license": "MIT",
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/@pkgjs/parseargs": {
      "version": "0.11.0",
      "resolved": "https://registry.npmjs.org/@pkgjs/parseargs/-/parseargs-0.11.0.tgz",
      "integrity": "sha512-+1VkjdD0QBLPodGrJUeqarH8VAIvQODIbwh9XpP5Syisf7YoQgsJKPNFoqqLQlu+VQ/tVSshMR6loPMn8U+dPg==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/@protobufjs/aspromise": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/aspromise/-/aspromise-1.1.2.tgz",
      "integrity": "sha512-j+gKExEuLmKwvz3OgROXtrJ2UG2x8Ch2YZUxahh+s1F2HZ+wAceUNLkvy6zKCPVRkU++ZWQrdxsUeQXmcg4uoQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/base64": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/base64/-/base64-1.1.2.tgz",
      "integrity": "sha512-AZkcAA5vnN/v4PDqKyMR5lx7hZttPDgClv83E//FMNhR2TMcLUhfRUBHCmSl0oi9zMgDDqRUJkSxO3wm85+XLg==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/codegen": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/@protobufjs/codegen/-/codegen-2.0.4.tgz",
      "integrity": "sha512-YyFaikqM5sH0ziFZCN3xDC7zeGaB/d0IUb9CATugHWbd1FRFwWwt4ld4OYMPWu5a3Xe01mGAULCdqhMlPl29Jg==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/eventemitter": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/eventemitter/-/eventemitter-1.1.0.tgz",
      "integrity": "sha512-j9ednRT81vYJ9OfVuXG6ERSTdEL1xVsNgqpkxMsbIabzSo3goCjDIveeGv5d03om39ML71RdmrGNjG5SReBP/Q==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/fetch": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/fetch/-/fetch-1.1.0.tgz",
      "integrity": "sha512-lljVXpqXebpsijW71PZaCYeIcE5on1w5DlQy5WH6GLbFryLUrBD4932W/E2BSpfRJWseIL4v/KPgBFxDOIdKpQ==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.1",
        "@protobufjs/inquire": "^1.1.0"
      }
    },
    "node_modules/@protobufjs/float": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/float/-/float-1.0.2.tgz",
      "integrity": "sha512-Ddb+kVXlXst9d+R9PfTIxh1EdNkgoRe5tOX6t01f1lYWOvJnSPDBlG241QLzcyPdoNTsblLUdujGSE4RzrTZGQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/inquire": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/inquire/-/inquire-1.1.0.tgz",
      "integrity": "sha512-kdSefcPdruJiFMVSbn801t4vFK7KB/5gd2fYvrxhuJYg8ILrmn9SKSX2tZdV6V+ksulWqS7aXjBcRXl3wHoD9Q==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/path": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/path/-/path-1.1.2.tgz",
      "integrity": "sha512-6JOcJ5Tm08dOHAbdR3GrvP+yUUfkjG5ePsHYczMFLq3ZmMkAD98cDgcT2iA1lJ9NVwFd4tH/iSSoe44YWkltEA==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/pool": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/pool/-/pool-1.1.0.tgz",
      "integrity": "sha512-0kELaGSIDBKvcgS4zkjz1PeddatrjYcmMWOlAuAPwAeccUrPHdUqo/J6LiymHHEiJT5NrF1UVwxY14f+fy4WQw==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/utf8": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/utf8/-/utf8-1.1.0.tgz",
      "integrity": "sha512-Vvn3zZrhQZkkBE8LSuW3em98c0FwgO4nxzv6OdSxPKJIEKY2bGbHn+mhGIPerzI4twdxaP8/0+06HBpwf345Lw==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.48.0.tgz",
      "integrity": "sha512-aVzKH922ogVAWkKiyKXorjYymz2084zrhrZRXtLrA5eEx5SO8Dj0c/4FpCHZyn7MKzhW2pW4tK28vVr+5oQ2xw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.48.0.tgz",
      "integrity": "sha512-diOdQuw43xTa1RddAFbhIA8toirSzFMcnIg8kvlzRbK26xqEnKJ/vqQnghTAajy2Dcy42v+GMPMo6jq67od+Dw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.48.0.tgz",
      "integrity": "sha512-QhR2KA18fPlJWFefySJPDYZELaVqIUVnYgAOdtJ+B/uH96CFg2l1TQpX19XpUMWUqMyIiyY45wje8K6F4w4/CA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.48.0.tgz",
      "integrity": "sha512-Q9RMXnQVJ5S1SYpNSTwXDpoQLgJ/fbInWOyjbCnnqTElEyeNvLAB3QvG5xmMQMhFN74bB5ZZJYkKaFPcOG8sGg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-arm64": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.48.0.tgz",
      "integrity": "sha512-3jzOhHWM8O8PSfyft+ghXZfBkZawQA0PUGtadKYxFqpcYlOYjTi06WsnYBsbMHLawr+4uWirLlbhcYLHDXR16w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-x64": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-x64/-/rollup-freebsd-x64-4.48.0.tgz",
      "integrity": "sha512-NcD5uVUmE73C/TPJqf78hInZmiSBsDpz3iD5MF/BuB+qzm4ooF2S1HfeTChj5K4AV3y19FFPgxonsxiEpy8v/A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.48.0.tgz",
      "integrity": "sha512-JWnrj8qZgLWRNHr7NbpdnrQ8kcg09EBBq8jVOjmtlB3c8C6IrynAJSMhMVGME4YfTJzIkJqvSUSVJRqkDnu/aA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.48.0.tgz",
      "integrity": "sha512-9xu92F0TxuMH0tD6tG3+GtngwdgSf8Bnz+YcsPG91/r5Vgh5LNofO48jV55priA95p3c92FLmPM7CvsVlnSbGQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.48.0.tgz",
      "integrity": "sha512-NLtvJB5YpWn7jlp1rJiY0s+G1Z1IVmkDuiywiqUhh96MIraC0n7XQc2SZ1CZz14shqkM+XN2UrfIo7JB6UufOA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.48.0.tgz",
      "integrity": "sha512-QJ4hCOnz2SXgCh+HmpvZkM+0NSGcZACyYS8DGbWn2PbmA0e5xUk4bIP8eqJyNXLtyB4gZ3/XyvKtQ1IFH671vQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loongarch64-gnu": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loongarch64-gnu/-/rollup-linux-loongarch64-gnu-4.48.0.tgz",
      "integrity": "sha512-Pk0qlGJnhILdIC5zSKQnprFjrGmjfDM7TPZ0FKJxRkoo+kgMRAg4ps1VlTZf8u2vohSicLg7NP+cA5qE96PaFg==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-gnu": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-gnu/-/rollup-linux-ppc64-gnu-4.48.0.tgz",
      "integrity": "sha512-/dNFc6rTpoOzgp5GKoYjT6uLo8okR/Chi2ECOmCZiS4oqh3mc95pThWma7Bgyk6/WTEvjDINpiBCuecPLOgBLQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.48.0.tgz",
      "integrity": "sha512-YBwXsvsFI8CVA4ej+bJF2d9uAeIiSkqKSPQNn0Wyh4eMDY4wxuSp71BauPjQNCKK2tD2/ksJ7uhJ8X/PVY9bHQ==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-musl": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-musl/-/rollup-linux-riscv64-musl-4.48.0.tgz",
      "integrity": "sha512-FI3Rr2aGAtl1aHzbkBIamsQyuauYtTF9SDUJ8n2wMXuuxwchC3QkumZa1TEXYIv/1AUp1a25Kwy6ONArvnyeVQ==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.48.0.tgz",
      "integrity": "sha512-Dx7qH0/rvNNFmCcIRe1pyQ9/H0XO4v/f0SDoafwRYwc2J7bJZ5N4CHL/cdjamISZ5Cgnon6iazAVRFlxSoHQnQ==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.48.0.tgz",
      "integrity": "sha512-GUdZKTeKBq9WmEBzvFYuC88yk26vT66lQV8D5+9TgkfbewhLaTHRNATyzpQwwbHIfJvDJ3N9WJ90wK/uR3cy3Q==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.48.0.tgz",
      "integrity": "sha512-ao58Adz/v14MWpQgYAb4a4h3fdw73DrDGtaiF7Opds5wNyEQwtO6M9dBh89nke0yoZzzaegq6J/EXs7eBebG8A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.48.0.tgz",
      "integrity": "sha512-kpFno46bHtjZVdRIOxqaGeiABiToo2J+st7Yce+aiAoo1H0xPi2keyQIP04n2JjDVuxBN6bSz9R6RdTK5hIppw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.48.0.tgz",
      "integrity": "sha512-rFYrk4lLk9YUTIeihnQMiwMr6gDhGGSbWThPEDfBoU/HdAtOzPXeexKi7yU8jO+LWRKnmqPN9NviHQf6GDwBcQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.48.0",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.48.0.tgz",
      "integrity": "sha512-sq0hHLTgdtwOPDB5SJOuaoHyiP1qSwg+71TQWk8iDS04bW1wIE0oQ6otPiRj2ZvLYNASLMaTp8QRGUVZ+5OL5A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@tailwindcss/typography": {
      "version": "0.5.16",
      "resolved": "https://registry.npmjs.org/@tailwindcss/typography/-/typography-0.5.16.tgz",
      "integrity": "sha512-0wDLwCVF5V3x3b1SGXPCDcdsbDHMBe+lkFzBRaHeLvNi+nrrnZ1lA18u+OTWO8iSWU2GxUOCvlXtDuqftc1oiA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "lodash.castarray": "^4.4.0",
        "lodash.isplainobject": "^4.0.6",
        "lodash.merge": "^4.6.2",
        "postcss-selector-parser": "6.0.10"
      },
      "peerDependencies": {
        "tailwindcss": ">=3.0.0 || insiders || >=4.0.0-alpha.20 || >=4.0.0-beta.1"
      }
    },
    "node_modules/@types/aws-lambda": {
      "version": "8.10.152",
      "resolved": "https://registry.npmjs.org/@types/aws-lambda/-/aws-lambda-8.10.152.tgz",
      "integrity": "sha512-soT/c2gYBnT5ygwiHPmd9a1bftj462NWVk2tKCc1PYHSIacB2UwbTS2zYG4jzag1mRDuzg/OjtxQjQ2NKRB6Rw==",
      "license": "MIT"
    },
    "node_modules/@types/d3-scale": {
      "version": "4.0.9",
      "resolved": "https://registry.npmjs.org/@types/d3-scale/-/d3-scale-4.0.9.tgz",
      "integrity": "sha512-dLmtwB8zkAeO/juAMfnV+sItKjlsw2lKdZVVy6LRr0cBmegxSABiLEpGVmSJJ8O08i4+sGR6qQtb6WtuwJdvVw==",
      "license": "MIT",
      "dependencies": {
        "@types/d3-time": "*"
      }
    },
    "node_modules/@types/d3-scale-chromatic": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/@types/d3-scale-chromatic/-/d3-scale-chromatic-3.1.0.tgz",
      "integrity": "sha512-iWMJgwkK7yTRmWqRB5plb1kadXyQ5Sj8V/zYlFGMUBbIPKQScw+Dku9cAAMgJG+z5GYDoMjWGLVOvjghDEFnKQ==",
      "license": "MIT"
    },
    "node_modules/@types/d3-time": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/@types/d3-time/-/d3-time-3.0.4.tgz",
      "integrity": "sha512-yuzZug1nkAAaBlBBikKZTgzCeA+k1uy4ZFwWANOfKw5z5LRhV0gNA7gNkKm7HoK+HRN0wX3EkxGk0fpbWhmB7g==",
      "license": "MIT"
    },
    "node_modules/@types/debug": {
      "version": "4.1.12",
      "resolved": "https://registry.npmjs.org/@types/debug/-/debug-4.1.12.tgz",
      "integrity": "sha512-vIChWdVG3LG1SMxEvI/AK+FWJthlrqlTu7fbrlywTkkaONwk/UAGaULXRlf8vkzFBLVm0zkMdCquhL5aOjhXPQ==",
      "license": "MIT",
      "dependencies": {
        "@types/ms": "*"
      }
    },
    "node_modules/@types/diff": {
      "version": "5.2.3",
      "resolved": "https://registry.npmjs.org/@types/diff/-/diff-5.2.3.tgz",
      "integrity": "sha512-K0Oqlrq3kQMaO2RhfrNQX5trmt+XLyom88zS0u84nnIcLvFnRUMRRHmrGny5GSM+kNO9IZLARsdQHDzkhAgmrQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/estree": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.8.tgz",
      "integrity": "sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/jszip": {
      "version": "3.4.1",
      "resolved": "https://registry.npmjs.org/@types/jszip/-/jszip-3.4.1.tgz",
      "integrity": "sha512-TezXjmf3lj+zQ651r6hPqvSScqBLvyPI9FxdXBqpEwBijNGQ2NXpaFW/7joGzveYkKQUil7iiDHLo6LV71Pc0A==",
      "deprecated": "This is a stub types definition. jszip provides its own type definitions, so you do not need this installed.",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "jszip": "*"
      }
    },
    "node_modules/@types/marked": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/@types/marked/-/marked-6.0.0.tgz",
      "integrity": "sha512-jmjpa4BwUsmhxcfsgUit/7A9KbrC48Q0q8KvnY107ogcjGgTFDlIL3RpihNpx2Mu1hM4mdFQjoVc4O6JoGKHsA==",
      "deprecated": "This is a stub types definition. marked provides its own type definitions, so you do not need this installed.",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "marked": "*"
      }
    },
    "node_modules/@types/mdast": {
      "version": "3.0.15",
      "resolved": "https://registry.npmjs.org/@types/mdast/-/mdast-3.0.15.tgz",
      "integrity": "sha512-LnwD+mUEfxWMa1QpDraczIn6k0Ee3SMicuYSSzS6ZYl2gKS09EClnJYGd8Du6rfc5r/GZEk5o1mRb8TaTj03sQ==",
      "license": "MIT",
      "dependencies": {
        "@types/unist": "^2"
      }
    },
    "node_modules/@types/ms": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/@types/ms/-/ms-2.1.0.tgz",
      "integrity": "sha512-GsCCIZDE/p3i96vtEqx+7dBUGXrc7zeSK3wwPHIaRThS+9OhWIXRqzs4d6k1SVU8g91DrNRWxWUGhp5KXQb2VA==",
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "20.19.11",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-20.19.11.tgz",
      "integrity": "sha512-uug3FEEGv0r+jrecvUUpbY8lLisvIjg6AAic6a2bSP5OEOLeJsDSnvhCDov7ipFFMXS3orMpzlmi0ZcuGkBbow==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~6.21.0"
      }
    },
    "node_modules/@types/prop-types": {
      "version": "15.7.15",
      "resolved": "https://registry.npmjs.org/@types/prop-types/-/prop-types-15.7.15.tgz",
      "integrity": "sha512-F6bEyamV9jKGAFBEmlQnesRPGOQqS2+Uwi0Em15xenOxHaf2hv6L8YCVn3rPdPJOiJfPiCnLIRyvwVaqMY3MIw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/react": {
      "version": "18.3.24",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-18.3.24.tgz",
      "integrity": "sha512-0dLEBsA1kI3OezMBF8nSsb7Nk19ZnsyE1LLhB8r27KbgU5H4pvuqZLdtE+aUkJVoXgTVuA+iLIwmZ0TuK4tx6A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/prop-types": "*",
        "csstype": "^3.0.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "18.3.7",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-18.3.7.tgz",
      "integrity": "sha512-MEe3UeoENYVFXzoXEWsvcpg6ZvlrFNlOQ7EOsvhI3CfAXwzPfO8Qwuxd40nepsYKqyyVQnTdEfv68q91yLcKrQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^18.0.0"
      }
    },
    "node_modules/@types/unist": {
      "version": "2.0.11",
      "resolved": "https://registry.npmjs.org/@types/unist/-/unist-2.0.11.tgz",
      "integrity": "sha512-CmBKiL6NNo/OqgmMn95Fk9Whlp2mtvIv+KNpQKN2F4SjvrEesubTRWGYSg+BnWZOnlCaSTU1sMpsBOzgbYhnsA==",
      "license": "MIT"
    },
    "node_modules/agent-base": {
      "version": "7.1.4",
      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-7.1.4.tgz",
      "integrity": "sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/ansi-regex": {
      "version": "6.2.0",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-6.2.0.tgz",
      "integrity": "sha512-TKY5pyBkHyADOPYlRT9Lx6F544mPl0vS5Ew7BJ45hA08Q+t3GjbueLliBWN3sMICk6+y7HdyxSzC4bWS8baBdg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-regex?sponsor=1"
      }
    },
    "node_modules/ansi-styles": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-6.2.1.tgz",
      "integrity": "sha512-bN798gFfQX+viw3R7yrGWRqnrN2oRkEkUjjl4JNn4E8GxxbjtG3FbrEIIY3l8/hrwUwIeCZvi4QuOTP4MErVug==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/any-promise": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/any-promise/-/any-promise-1.3.0.tgz",
      "integrity": "sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/anymatch": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/anymatch/-/anymatch-3.1.3.tgz",
      "integrity": "sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "normalize-path": "^3.0.0",
        "picomatch": "^2.0.4"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/arg": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/arg/-/arg-5.0.2.tgz",
      "integrity": "sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/autoprefixer": {
      "version": "10.4.21",
      "resolved": "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.4.21.tgz",
      "integrity": "sha512-O+A6LWV5LDHSJD3LjHYoNi4VLsj/Whi7k6zG12xTYaU4cQ8oxQGckXNX8cRHK5yOZ/ppVHe0ZBXGzSV9jXdVbQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/autoprefixer"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "browserslist": "^4.24.4",
        "caniuse-lite": "^1.0.30001702",
        "fraction.js": "^4.3.7",
        "normalize-range": "^0.1.2",
        "picocolors": "^1.1.1",
        "postcss-value-parser": "^4.2.0"
      },
      "bin": {
        "autoprefixer": "bin/autoprefixer"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      },
      "peerDependencies": {
        "postcss": "^8.1.0"
      }
    },
    "node_modules/axe-core": {
      "version": "4.10.3",
      "resolved": "https://registry.npmjs.org/axe-core/-/axe-core-4.10.3.tgz",
      "integrity": "sha512-Xm7bpRXnDSX2YE2YFfBk2FnF0ep6tmG7xPh8iHee8MIcrgq762Nkce856dYtJYLkuIoYZvGfTs/PbZhideTcEg==",
      "license": "MPL-2.0",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/base64-js": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz",
      "integrity": "sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/before-after-hook": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/before-after-hook/-/before-after-hook-3.0.2.tgz",
      "integrity": "sha512-Nik3Sc0ncrMK4UUdXQmAnRtzmNQTAAXmXIopizwZ1W1t8QmfJj+zL4OA2I7XPTPW5z5TDqv4hRo/JzouDJnX3A==",
      "license": "Apache-2.0"
    },
    "node_modules/bignumber.js": {
      "version": "9.3.1",
      "resolved": "https://registry.npmjs.org/bignumber.js/-/bignumber.js-9.3.1.tgz",
      "integrity": "sha512-Ko0uX15oIUS7wJ3Rb30Fs6SkVbLmPBAKdlm7q9+ak9bbIeFf0MwuBsQV6z7+X768/cHsfg+WlysDWJcmthjsjQ==",
      "license": "MIT",
      "engines": {
        "node": "*"
      }
    },
    "node_modules/binary-extensions": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/binary-extensions/-/binary-extensions-2.3.0.tgz",
      "integrity": "sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/bottleneck": {
      "version": "2.19.5",
      "resolved": "https://registry.npmjs.org/bottleneck/-/bottleneck-2.19.5.tgz",
      "integrity": "sha512-VHiNCbI1lKdl44tGrhNfU3lup0Tj/ZBMJB5/2ZbNXRCPuRCO7ed2mgcK4r17y+KB2EfuYuRaVlwNbAeaWGSpbw==",
      "license": "MIT"
    },
    "node_modules/brace-expansion": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-2.0.2.tgz",
      "integrity": "sha512-Jt0vHyM+jmUBqojB7E1NIYadt0vI0Qxjxd2TErW94wDz+E2LAm5vKMXXwg6ZZBTHPuUlDgQHKXvjGBdfcF1ZDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.25.3",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.25.3.tgz",
      "integrity": "sha512-cDGv1kkDI4/0e5yON9yM5G/0A5u8sf5TnmdX5C9qHzI9PPu++sQ9zjm1k9NiOrf3riY4OkK0zSGqfvJyJsgCBQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "caniuse-lite": "^1.0.30001735",
        "electron-to-chromium": "^1.5.204",
        "node-releases": "^2.0.19",
        "update-browserslist-db": "^1.1.3"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/buffer-equal-constant-time": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/buffer-equal-constant-time/-/buffer-equal-constant-time-1.0.1.tgz",
      "integrity": "sha512-zRpUiDwd/xk6ADqPMATG8vc9VPrkck7T07OIx0gnjmJAnHnTVXNQG3vfvWNuiZIkwu9KrKdA1iJKfsfTVxE6NA==",
      "license": "BSD-3-Clause"
    },
    "node_modules/camelcase-css": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/camelcase-css/-/camelcase-css-2.0.1.tgz",
      "integrity": "sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001737",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001737.tgz",
      "integrity": "sha512-BiloLiXtQNrY5UyF0+1nSJLXUENuhka2pzy2Fx5pGxqavdrxSCW4U6Pn/PoG3Efspi2frRbHpBV2XsrPE6EDlw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/character-entities": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/character-entities/-/character-entities-2.0.2.tgz",
      "integrity": "sha512-shx7oQ0Awen/BRIdkjkvz54PnEEI/EjwXDSIZp86/KKdbafHh1Df/RYGBhn4hbe2+uKC9FnT5UCEdyPz3ai9hQ==",
      "license": "MIT",
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wooorm"
      }
    },
    "node_modules/chokidar": {
      "version": "3.6.0",
      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-3.6.0.tgz",
      "integrity": "sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "anymatch": "~3.1.2",
        "braces": "~3.0.2",
        "glob-parent": "~5.1.2",
        "is-binary-path": "~2.1.0",
        "is-glob": "~4.0.1",
        "normalize-path": "~3.0.0",
        "readdirp": "~3.6.0"
      },
      "engines": {
        "node": ">= 8.10.0"
      },
      "funding": {
        "url": "https://paulmillr.com/funding/"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/chokidar/node_modules/glob-parent": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-5.1.2.tgz",
      "integrity": "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/cliui": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-8.0.1.tgz",
      "integrity": "sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==",
      "license": "ISC",
      "dependencies": {
        "string-width": "^4.2.0",
        "strip-ansi": "^6.0.1",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/cliui/node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/cliui/node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "license": "MIT"
    },
    "node_modules/cliui/node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cliui/node_modules/wrap-ansi": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "license": "MIT"
    },
    "node_modules/commander": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/commander/-/commander-7.2.0.tgz",
      "integrity": "sha512-QrWXB+ZQSVPmIWIhtEO9H+gwHaMGYiF5ChvoJ+K9ZGHG/sVsa6yiesAD1GC/x46sET00Xlwo1u49RVVVzvcSkw==",
      "license": "MIT",
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/core-util-is": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/core-util-is/-/core-util-is-1.0.3.tgz",
      "integrity": "sha512-ZQBvi1DcpJ4GDqanjucZ2Hj3wEO5pZDS89BWbkcrvdxksJorwUDDZamX9ldFkp9aw2lmBDLgkObEA4DWNJ9FYQ==",
      "license": "MIT"
    },
    "node_modules/cose-base": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/cose-base/-/cose-base-1.0.3.tgz",
      "integrity": "sha512-s9whTXInMSgAp/NVXVNuVxVKzGH2qck3aQlVHxDCdAEPgtMKwc4Wq6/QKhgdEdgbLSi9rBTAcPoRa6JpiG4ksg==",
      "license": "MIT",
      "dependencies": {
        "layout-base": "^1.0.0"
      }
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/@TooLong ...`
};
