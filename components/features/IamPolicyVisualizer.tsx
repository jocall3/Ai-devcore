import React, { useState, useCallback, useMemo } from 'react';
import { testIamPermissions } from '../../services/gcpService.ts';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';
import { GcpIcon, SparklesIcon, XMarkIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';

type SimulationStatus = 'idle' | 'running' | 'completed' | 'error';
type NodeStatus = 'neutral' | 'pending' | 'success' | 'fail' | 'partial';

interface ResourceNode {
    id: string; // The full resource name
    name: string;
    type: 'project' | 'bucket' | 'instance' | 'unknown';
    status: NodeStatus;
    results?: { permission: string; granted: boolean }[];
}

const COMMON_ROLES = {
    'Viewer': ['resourcemanager.projects.get', 'storage.objects.list', 'compute.instances.list'],
    'Editor': ['storage.objects.create', 'storage.objects.delete', 'compute.instances.start', 'compute.instances.stop'],
    'Storage Object Admin': ['storage.objects.create', 'storage.objects.delete', 'storage.objects.get', 'storage.objects.list', 'storage.objects.update'],
};

const getResourceType = (resourceId: string): ResourceNode['type'] => {
    if (resourceId.includes('/projects/')) return 'project';
    if (resourceId.includes('/b/')) return 'bucket';
    if (resourceId.includes('/instances/')) return 'instance';
    return 'unknown';
};

export const IamPolicyVisualizer: React.FC = () => {
    const { state } = useGlobalState();
    const [resources, setResources] = useState<ResourceNode[]>([]);
    const [newResource, setNewResource] = useState('//cloudresourcemanager.googleapis.com/projects/your-gcp-project-id');
    const [permissions, setPermissions] = useState('storage.objects.get\nstorage.objects.create');
    const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>('idle');
    const [error, setError] = useState('');
    const [selectedNode, setSelectedNode] = useState<ResourceNode | null>(null);

    const permissionList = useMemo(() => permissions.split('\n').map(p => p.trim()).filter(Boolean), [permissions]);

    const handleAddResource = () => {
        if (newResource.trim() && !resources.find(r => r.id === newResource)) {
            setResources(prev => [...prev, {
                id: newResource,
                name: newResource.split('/').pop() || newResource,
                type: getResourceType(newResource),
                status: 'neutral',
            }]);
            setNewResource('');
        }
    };

    const handleRunSimulation = useCallback(async () => {
        if (!state.user) {
            setError('You must be signed in to run a simulation.');
            return;
        }
        if (resources.length === 0 || permissionList.length === 0) {
            setError('Please add at least one resource and one permission.');
            return;
        }

        setSimulationStatus('running');
        setError('');
        setSelectedNode(null);
        setResources(r => r.map(res => ({ ...res, status: 'pending', results: [] })));

        const promises = resources.map(resource =>
            testIamPermissions(resource.id, permissionList)
                .then(result => ({ id: resource.id, success: true, data: result }))
                .catch(err => ({ id: resource.id, success: false, error: err }))
        );

        const results = await Promise.allSettled(promises);

        setResources(prevResources => prevResources.map(resource => {
            const result: any = results.find((r: any) => r.value?.id === resource.id);
            if (!result || !result.value.success) {
                return { ...resource, status: 'fail' as NodeStatus };
            }
            
            const grantedPermissions = result.value.data.permissions || [];
            const permissionResults = permissionList.map(p => ({ permission: p, granted: grantedPermissions.includes(p) }));
            const allGranted = permissionResults.every(r => r.granted);
            const noneGranted = permissionResults.every(r => !r.granted);

            let status: NodeStatus = 'partial';
            if (allGranted) status = 'success';
            if (noneGranted) status = 'fail';

            return { ...resource, status, results: permissionResults };
        }));

        setSimulationStatus('completed');

    }, [resources, permissionList, state.user]);
    
    const nodeColorClass: Record<NodeStatus, string> = {
        neutral: 'border-slate-600',
        pending: 'border-yellow-500 animate-pulse',
        success: 'border-green-500',
        fail: 'border-red-500',
        partial: 'border-orange-500',
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary bg-background">
            {selectedNode && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setSelectedNode(null)}>
                    <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-lg animate-pop-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold truncate">{selectedNode.name}</h3>
                        <p className="text-xs text-text-secondary font-mono mb-4">{selectedNode.id}</p>
                        <ul className="space-y-2 max-h-96 overflow-y-auto">
                            {selectedNode.results?.map(res => (
                                <li key={res.permission} className={`flex items-center justify-between p-2 rounded text-sm ${res.granted ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    <span className="font-mono">{res.permission}</span>
                                    <span className={`font-bold ${res.granted ? 'text-green-500' : 'text-red-500'}`}>{res.granted ? 'GRANTED' : 'DENIED'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><GcpIcon /><span className="ml-3">GCP IAM Policy Visualizer</span></h1><p className="text-text-secondary mt-1">Visually test and audit GCP IAM permissions in real-time across your resources.</p></header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                <aside className="lg:col-span-1 bg-surface p-4 rounded-lg border border-border flex flex-col gap-4">
                    <h3 className="text-xl font-bold">Simulation Controls</h3>
                    <div><label className="text-sm font-semibold">1. Add Resource</label><div className="flex gap-1 mt-1"><input value={newResource} onChange={e => setNewResource(e.target.value)} placeholder="Full GCP resource name..." className="flex-grow p-2 bg-background border rounded text-xs" /><button onClick={handleAddResource} className="btn-primary px-3 text-sm">+</button></div></div>
                    <div><label className="text-sm font-semibold">2. Define Permission Set</label><select onChange={e => setPermissions(COMMON_ROLES[e.target.value as keyof typeof COMMON_ROLES]?.join('\n') || '')} className="w-full mt-1 p-2 bg-background border rounded text-xs mb-1"><option>Load common role...</option>{Object.keys(COMMON_ROLES).map(r => <option key={r}>{r}</option>)}</select><textarea value={permissions} onChange={e => setPermissions(e.target.value)} placeholder="One permission per line..." className="w-full h-32 p-2 bg-background border rounded text-xs font-mono"/></div>
                    <button onClick={handleRunSimulation} disabled={simulationStatus === 'running'} className="btn-primary py-3 flex items-center justify-center gap-2"><SparklesIcon /> {simulationStatus === 'running' ? 'Simulating...' : 'Run Simulation'}</button>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                </aside>
                <main className="lg:col-span-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4 border-2 border-dashed border-border overflow-auto relative">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {resources.map(res => (
                            <div key={res.id} onClick={() => res.results && setSelectedNode(res)} className={`p-4 bg-surface rounded-lg border-4 transition-colors duration-500 ${nodeColorClass[res.status]} ${res.results ? 'cursor-pointer hover:scale-105' : ''}`}>
                                <h4 className="font-bold truncate">{res.name}</h4>
                                <p className="text-xs text-text-secondary capitalize">{res.type}</p>
                            </div>
                        ))}
                    </div>
                    {resources.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-text-secondary">Add resources to begin your simulation.</div>}
                </main>
            </div>
        </div>
    );
};