import React, { useState, useEffect, useCallback } from 'react';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { executeWorkspaceAction, generateCommitMessageStream } from '../../services/index.ts';
import type { Repo, FileNode } from '../../types.ts';
import { FolderIcon, DocumentIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import * as Diff from 'diff';

const FileTree: React.FC<{ node: FileNode, onFileSelect: (path: string, name: string) => void, activePath: string | null }> = ({ node, onFileSelect, activePath }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (node.type === 'file') {
        const isActive = activePath === node.path;
        return (
            <div
                className={`flex items-center space-x-2 pl-4 py-1 cursor-pointer rounded ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                onClick={() => onFileSelect(node.path, node.name)}
            >
                <DocumentIcon />
                <span>{node.name}</span>
            </div>
        );
    }

    return (
        <div>
            <div
                className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>â–¶</div>
                <FolderIcon />
                <span className="font-semibold">{node.name}</span>
            </div>
            {isOpen && node.children && (
                <div className="pl-4 border-l border-border ml-3">
                    {node.children.map(child => <FileTree key={child.path} node={child} onFileSelect={onFileSelect} activePath={activePath} />)}
                </div>
            )}
        </div>
    );
};

export const ProjectExplorer: React.FC = () => {
    const { state, dispatch } = useGlobalState();
    const { user, githubUser, selectedRepo, projectFiles, vaultState } = state;
    const { addNotification } = useNotification();
    const { requestUnlock, requestCreation } = useVaultModal();
    const [repos, setRepos] = useState<Repo[]>([]);
    const [isLoading, setIsLoading] = useState<'repos' | 'tree' | 'file' | 'commit' | null>(null);
    const [error, setError] = useState('');
    const [activeFile, setActiveFile] = useState<{ path: string; name: string; originalContent: string; editedContent: string} | null>(null);
    
    const withGitHubApi = useCallback(async <T,>(
        apiCall: () => Promise<T>,
        loadingState: 'repos' | 'tree' | 'file' | 'commit'
    ): Promise<T | undefined> => {
        setIsLoading(loadingState);
        setError('');
        try {
            if (!user || !githubUser) {
                throw new Error("Please connect to GitHub first via the Connections page.");
            }
            if (!vaultState.isInitialized) {
                const created = await requestCreation();
                if (!created) throw new Error("Vault setup is required to access GitHub.");
            }
            if (!vaultState.isUnlocked) {
                const unlocked = await requestUnlock();
                if (!unlocked) throw new Error("Vault must be unlocked to access GitHub.");
            }
            return await apiCall();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
        } finally {
            setIsLoading(null);
        }
        return undefined;
    }, [user, githubUser, vaultState, requestCreation, requestUnlock]);


    useEffect(() => {
        const loadRepos = async () => {
            if (user && githubUser) {
                const result = await withGitHubApi(
                    () => executeWorkspaceAction('github_get_repos', {}),
                    'repos'
                );
                if (result) {
                    setRepos(result as Repo[]);
                }
            } else {
                setRepos([]);
            }
        };
        loadRepos();
    }, [user, githubUser, withGitHubApi]);

    useEffect(() => {
        const loadTree = async () => {
             if (selectedRepo && user && githubUser) {
                setActiveFile(null);
                const result = await withGitHubApi(
                    () => executeWorkspaceAction('github_get_repo_tree', { owner: selectedRepo.owner, repo: selectedRepo.repo }),
                    'tree'
                );
                if (result) {
                    dispatch({ type: 'LOAD_PROJECT_FILES', payload: result as FileNode });
                }
            }
        };
        loadTree();
    }, [selectedRepo, user, githubUser, dispatch, withGitHubApi]);

    const handleFileSelect = async (path: string, name: string) => {
        if (!selectedRepo) return;
        const content = await withGitHubApi(
            () => executeWorkspaceAction('github_get_file_content', { owner: selectedRepo.owner, repo: selectedRepo.repo, path }),
            'file'
        );
        if (typeof content === 'string') {
            setActiveFile({ path, name, originalContent: content, editedContent: content });
        }
    };

    const handleCommit = async () => {
        if (!activeFile || !selectedRepo || activeFile.originalContent === activeFile.editedContent) return;
        
        const result = await withGitHubApi(async () => {
            const diff = Diff.createPatch(activeFile.path, activeFile.originalContent, activeFile.editedContent);
            
            const stream = generateCommitMessageStream(diff);
            let commitMessage = '';
            for await (const chunk of stream) { commitMessage += chunk; }
            
            const finalMessage = window.prompt("Confirm or edit commit message:", commitMessage);
            if (!finalMessage) {
                return { committed: false };
            }

            const filesToCommit = [{ path: activeFile.path, content: activeFile.editedContent }];
            await executeWorkspaceAction('github_commit_files', {
                owner: selectedRepo.owner,
                repo: selectedRepo.repo,
                message: finalMessage,
                files: JSON.stringify(filesToCommit)
            });
            return { committed: true };
        }, 'commit');

        if (result?.committed) {
            addNotification(`Successfully committed to ${selectedRepo.repo}`, 'success');
            setActiveFile(prev => prev ? { ...prev, originalContent: prev.editedContent } : null);
        }
    };
    
    if (!user) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary p-4">
                <FolderIcon />
                <h2 className="text-lg font-semibold mt-2">Please Sign In</h2>
                <p>Sign in via the "Connections" tab to explore your repositories.</p>
            </div>
        );
    }
    
    if (!githubUser) {
         return (
            <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary p-4">
                <FolderIcon />
                <h2 className="text-lg font-semibold mt-2">Connect to GitHub</h2>
                <p>Please go to the "Connections" tab and provide a Personal Access Token to explore your repositories.</p>
            </div>
        );
    }

    const hasChanges = activeFile ? activeFile.originalContent !== activeFile.editedContent : false;

    return (
        <div className="h-full flex flex-col text-text-primary">
            <header className="p-4 border-b border-border flex-shrink-0">
                <h1 className="text-xl font-bold flex items-center"><FolderIcon /><span className="ml-3">Project Explorer</span></h1>
                <div className="mt-2">
                    <select
                        value={selectedRepo ? `${selectedRepo.owner}/${selectedRepo.repo}` : ''}
                        onChange={e => {
                            const [owner, repo] = e.target.value.split('/');
                            dispatch({ type: 'SET_SELECTED_REPO', payload: { owner, repo } });
                        }}
                        className="w-full p-2 bg-surface border border-border rounded-md text-sm"
                    >
                        <option value="" disabled>{isLoading === 'repos' ? 'Loading...' : 'Select a repository'}</option>
                        {repos.map(r => <option key={r.id} value={r.full_name}>{r.full_name}</option>)}
                    </select>
                </div>
                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </header>
            <div className="flex-grow flex min-h-0">
                <aside className="w-1/3 bg-background border-r border-border p-4 overflow-y-auto">
                    {isLoading === 'tree' && <div className="flex justify-center"><LoadingSpinner /></div>}
                    {projectFiles && <FileTree node={projectFiles} onFileSelect={handleFileSelect} activePath={activeFile?.path ?? null} />}
                </aside>
                <main className="flex-1 bg-surface flex flex-col">
                     <div className="flex justify-between items-center p-2 border-b border-border bg-gray-50 dark:bg-slate-800">
                        <span className="text-sm font-semibold">{activeFile?.name || 'No file selected'}</span>
                        <button onClick={handleCommit} disabled={!hasChanges || isLoading === 'commit'} className="btn-primary px-4 py-1 text-sm flex items-center justify-center min-w-[100px]">
                           {isLoading === 'commit' ? <LoadingSpinner/> : 'Commit'}
                        </button>
                     </div>
                     {isLoading === 'file' ? <div className="flex items-center justify-center h-full"><LoadingSpinner /></div> :
                        <textarea 
                            value={activeFile?.editedContent ?? 'Select a file to view its content.'}
                            onChange={e => setActiveFile(prev => prev ? { ...prev, editedContent: e.target.value } : null)}
                            disabled={!activeFile}
                            className="w-full h-full p-4 text-sm font-mono bg-transparent resize-none focus:outline-none"
                        />
                    }
                </main>
            </div>
        </div>
    );
};