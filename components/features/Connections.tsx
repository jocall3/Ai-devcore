import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import * as vaultService from '../../services/vaultService.ts';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { validateToken } from '../../services/authService.ts';
import { ACTION_REGISTRY, executeWorkspaceAction } from '../../services/workspaceConnectorService.ts';
import { RectangleGroupIcon, GithubIcon, SparklesIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { signInWithGoogle } from '../../services/googleAuthService.ts';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';

const ServiceConnectionCard: React.FC<{
    serviceName: string;
    icon: React.ReactNode;
    fields: { id: string; label: string; placeholder: string }[];
    onConnect: (credentials: Record<string, string>) => Promise<void>;
    onDisconnect: () => Promise<void>;
    status: string;
    isLoading: boolean;
}> = ({ serviceName, icon, fields, onConnect, onDisconnect, status, isLoading }) => {
    const [creds, setCreds] = useState<Record<string, string>>({});

    const handleConnect = () => {
        onConnect(creds);
    };

    const isConnected = status.startsWith('Connected');

    return (
        <div className="bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10">{icon}</div>
                    <div>
                        <h3 className="text-lg font-bold text-text-primary">{serviceName}</h3>
                        <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-text-secondary'}`}>{status}</p>
                    </div>
                </div>
                {isConnected && (
                    <button onClick={onDisconnect} className="px-4 py-2 bg-red-500/10 text-red-600 font-semibold rounded-lg hover:bg-red-500/20">
                        Disconnect
                    </button>
                )}
            </div>
            {!isConnected && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                    {fields.map(field => (
                        <div key={field.id}>
                            <label className="text-xs text-text-secondary">{field.label}</label>
                            <input
                                type={field.id.includes('token') || field.id.includes('pat') ? 'password' : 'text'}
                                value={creds[field.id] || ''}
                                onChange={e => setCreds(prev => ({ ...prev, [field.id]: e.target.value }))}
                                placeholder={field.placeholder}
                                className="w-full mt-1 p-2 bg-background border border-border rounded-md text-sm"
                            />
                        </div>
                    ))}
                    <button onClick={handleConnect} disabled={isLoading} className="btn-primary w-full mt-2 py-2 flex items-center justify-center">
                        {isLoading ? <LoadingSpinner /> : 'Connect'}
                    </button>
                </div>
            )}
        </div>
    );
};


export const WorkspaceConnectorHub: React.FC = () => {
    const { state, dispatch } = useGlobalState();
    const { user, githubUser, vaultState } = state;
    const { addNotification } = useNotification();
    const { requestUnlock, requestCreation } = useVaultModal();
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({});
    
    // Manual action state
    const [selectedActionId, setSelectedActionId] = useState<string>([...ACTION_REGISTRY.keys()][0]);
    const [actionParams, setActionParams] = useState<Record<string, any>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [actionResult, setActionResult] = useState<string>('');

    const services = useMemo(() => {
        const serviceMap = new Map();
        ACTION_REGISTRY.forEach(action => {
            if (!serviceMap.has(action.service)) {
                serviceMap.set(action.service, {
                    name: action.service,
                    actions: [],
                });
            }
            serviceMap.get(action.service).actions.push(action);
        });
        return Array.from(serviceMap.values());
    }, []);

    const checkConnections = useCallback(async () => {
        if (!user || !vaultState.isUnlocked) return;
        
        const checkCred = async (credId: string, serviceName: string, successMessage: string) => {
             const token = await vaultService.getDecryptedCredential(credId);
             setConnectionStatuses(s => ({ ...s, [serviceName]: token ? successMessage : 'Not Connected' }));
        };

        await checkCred('github_pat', 'GitHub', githubUser ? `Connected as ${githubUser.login}`: 'Connected');
        await checkCred('jira_pat', 'Jira', 'Connected');
        await checkCred('slack_bot_token', 'Slack', 'Connected');

    }, [user, vaultState.isUnlocked, githubUser]);

    useEffect(() => {
        checkConnections();
    }, [checkConnections]);
    
    const withVault = useCallback(async (callback: () => Promise<void>) => {
        if (!vaultState.isInitialized) {
            const created = await requestCreation();
            if (!created) { addNotification('Vault setup is required.', 'error'); return; }
        }
        if (!vaultState.isUnlocked) {
            const unlocked = await requestUnlock();
            if (!unlocked) { addNotification('Vault must be unlocked to manage connections.', 'error'); return; }
        }
        await callback();
    }, [vaultState, requestCreation, requestUnlock, addNotification]);


    const handleConnect = async (serviceName: string, credentials: Record<string, string>) => {
        await withVault(async () => {
            setLoadingStates(s => ({ ...s, [serviceName]: true }));
            try {
                for (const [key, value] of Object.entries(credentials)) {
                    if (value) await vaultService.saveCredential(key, value);
                }
                if (serviceName === 'GitHub' && credentials.github_pat) {
                     const githubProfile = await validateToken(credentials.github_pat);
                     dispatch({ type: 'SET_GITHUB_USER', payload: githubProfile });
                     await vaultService.saveCredential('github_user', JSON.stringify(githubProfile));
                }
                addNotification(`${serviceName} connected successfully!`, 'success');
                checkConnections();
            } catch (e) {
                addNotification(`Failed to connect ${serviceName}: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
            } finally {
                setLoadingStates(s => ({ ...s, [serviceName]: false }));
            }
        });
    };
    
    const handleDisconnect = async (serviceName: string, credIds: string[]) => {
       await withVault(async () => {
            setLoadingStates(s => ({ ...s, [serviceName]: true }));
            try {
                for (const id of credIds) {
                     await vaultService.saveCredential(id, ''); // Overwrite with empty string
                }
                 if (serviceName === 'GitHub') {
                     dispatch({ type: 'SET_GITHUB_USER', payload: null });
                     await vaultService.saveCredential('github_user', '');
                }
                addNotification(`${serviceName} disconnected.`, 'info');
                checkConnections();
            } catch(e) {
                addNotification(`Failed to disconnect ${serviceName}.`, 'error');
            } finally {
                 setLoadingStates(s => ({ ...s, [serviceName]: false }));
            }
       });
    };
    
    const handleExecuteAction = async () => {
        await withVault(async () => {
            setIsExecuting(true);
            setActionResult('');
            try {
                const result = await executeWorkspaceAction(selectedActionId, actionParams);
                setActionResult(JSON.stringify(result, null, 2));
                addNotification('Action executed successfully!', 'success');
            } catch(e) {
                setActionResult(`Error: ${e instanceof Error ? e.message : 'Unknown Error'}`);
                addNotification('Action failed.', 'error');
            } finally {
                setIsExecuting(false);
            }
        });
    };

    const handleSignIn = () => {
        signInWithGoogle();
        // The result is handled by the global callback set in App.tsx
    };

    const selectedAction = ACTION_REGISTRY.get(selectedActionId);
    const actionParameters = selectedAction ? selectedAction.getParameters() : {};

    if (!user) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center bg-surface p-8 rounded-lg border border-border max-w-md">
                    <h2 className="text-xl font-bold">Sign In Required</h2>
                    <p className="text-text-secondary my-4">Please sign in with your Google account to manage workspace connections.</p>
                    <button onClick={handleSignIn} disabled={loadingStates.google} className="btn-primary px-6 py-3 flex items-center justify-center gap-2 mx-auto">
                        {loadingStates.google ? <LoadingSpinner/> : 'Sign in with Google'}
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
             <header className="mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight flex items-center"><RectangleGroupIcon /><span className="ml-3">Workspace Connector Hub</span></h1>
                <p className="mt-2 text-lg text-text-secondary">Connect to your development services to unlock cross-platform AI actions.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                <div className="flex flex-col gap-6 overflow-y-auto pr-4">
                    <h2 className="text-2xl font-bold">Service Connections</h2>
                    <ServiceConnectionCard 
                        serviceName="GitHub"
                        icon={<GithubIcon />}
                        fields={[{ id: 'github_pat', label: 'Personal Access Token', placeholder: 'ghp_...' }]}
                        onConnect={(creds) => handleConnect('GitHub', creds)}
                        onDisconnect={() => handleDisconnect('GitHub', ['github_pat'])}
                        status={connectionStatuses.GitHub || 'Checking...'}
                        isLoading={loadingStates.GitHub}
                    />
                     {/* Placeholder cards for Jira and Slack */}
                    <ServiceConnectionCard 
                        serviceName="Jira"
                        icon={<div className="w-10 h-10 bg-[#0052CC] rounded flex items-center justify-center text-white font-bold text-xl">J</div>}
                        fields={[
                            { id: 'jira_domain', label: 'Jira Domain', placeholder: 'your-company.atlassian.net' },
                            { id: 'jira_email', label: 'Your Jira Email', placeholder: 'you@example.com' },
                            { id: 'jira_pat', label: 'API Token', placeholder: 'Your API Token' },
                        ]}
                        onConnect={(creds) => handleConnect('Jira', creds)}
                        onDisconnect={() => handleDisconnect('Jira', ['jira_domain', 'jira_email', 'jira_pat'])}
                        status={connectionStatuses.Jira || 'Checking...'}
                        isLoading={loadingStates.Jira}
                    />
                    <ServiceConnectionCard 
                        serviceName="Slack"
                        icon={<div className="w-10 h-10 bg-[#4A154B] rounded flex items-center justify-center text-white font-bold text-2xl">#</div>}
                        fields={[{ id: 'slack_bot_token', label: 'Bot User OAuth Token', placeholder: 'xoxb-...' }]}
                        onConnect={(creds) => handleConnect('Slack', creds)}
                        onDisconnect={() => handleDisconnect('Slack', ['slack_bot_token'])}
                        status={connectionStatuses.Slack || 'Checking...'}
                        isLoading={loadingStates.Slack}
                    />
                </div>
                <div className="flex flex-col gap-6 bg-surface p-6 border border-border rounded-lg">
                    <h2 className="text-2xl font-bold">Manual Action Runner</h2>
                    <div className="space-y-4">
                         <div>
                            <label className="text-sm font-medium">Action</label>
                            <select value={selectedActionId} onChange={e => setSelectedActionId(e.target.value)} className="w-full mt-1 p-2 bg-background border rounded">
                                {services.map(service => (
                                    <optgroup label={service.name} key={service.name}>
                                        {service.actions.map((action: any) => (
                                            <option key={action.id} value={action.id}>{action.description}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        {Object.entries(actionParameters).map(([key, param]: [string, any]) => (
                            <div key={key}>
                                <label className="text-sm font-medium">{key} {param.required && '*'}</label>
                                <input 
                                    type={param.type}
                                    value={actionParams[key] || ''}
                                    onChange={e => setActionParams(p => ({...p, [key]: e.target.value}))}
                                    placeholder={param.default || ''}
                                    className="w-full mt-1 p-2 bg-background border rounded"
                                />
                            </div>
                        ))}
                        <button onClick={handleExecuteAction} disabled={isExecuting} className="btn-primary w-full py-2 flex items-center justify-center gap-2">
                           {isExecuting ? <LoadingSpinner/> : <><SparklesIcon /> Execute Action</>}
                        </button>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Result</label>
                        <pre className="w-full h-48 mt-1 p-2 bg-background border rounded overflow-auto text-xs">{actionResult || 'Action results will appear here.'}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
};