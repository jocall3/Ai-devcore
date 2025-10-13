import React, { useState, useEffect, useCallback } from 'react';
import { generateAppFeatureComponent } from '../../services/aiService.ts';
import { getAllCustomFeatures, saveCustomFeature, deleteCustomFeature } from '../../services/dbService.ts';
import type { CustomFeature } from '../../types.ts';
import { CpuChipIcon, PlusIcon, TrashIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { ALL_FEATURES } from './index.ts';
import { CustomFeatureRunner } from '../shared/CustomFeatureRunner.tsx';

const ICON_MAP: Record<string, React.FC> = ALL_FEATURES.reduce((acc, feature) => {
    const iconType = (feature.icon as React.ReactElement)?.type;
    if (typeof iconType === 'function' && iconType.name) {
      const iconName = iconType.name;
      acc[iconName] = iconType as React.FC;
    }
    return acc;
  }, {} as Record<string, React.FC>);
  

export const FeatureForge: React.FC = () => {
    const [customFeatures, setCustomFeatures] = useState<CustomFeature[]>([]);
    const [isLoading, setIsLoading] = useState<'list' | 'generate' | false>(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState('A tool to convert JSON to YAML');
    const [generatedFeature, setGeneratedFeature] = useState<Omit<CustomFeature, 'id'> | null>(null);
    const { addNotification } = useNotification();

    const fetchFeatures = useCallback(async () => {
        setIsLoading('list');
        const features = await getAllCustomFeatures();
        setCustomFeatures(features);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchFeatures();
    }, [fetchFeatures]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setGeneratedFeature(null);
        try {
            const result = await generateAppFeatureComponent(prompt);
            setGeneratedFeature(result);
            addNotification('Feature code generated! Review and save.', 'info');
        } catch (err) {
            addNotification(err instanceof Error ? err.message : 'Failed to generate feature', 'error');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSave = async () => {
        if (!generatedFeature) return;
        const newFeature: CustomFeature = {
            ...generatedFeature,
            id: `custom-${Date.now()}`
        };
        await saveCustomFeature(newFeature);
        // Dispatch event to notify other parts of the app (like the desktop view) to reload features
        window.dispatchEvent(new CustomEvent('custom-feature-update'));
        
        setGeneratedFeature(null);
        setPrompt('');
        fetchFeatures();
        addNotification(`Feature "${newFeature.name}" saved! It's now available on your desktop.`, 'success');
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this feature?")) {
            await deleteCustomFeature(id);
            // Dispatch event to notify other parts of the app (like the desktop view) to reload features
            window.dispatchEvent(new CustomEvent('custom-feature-update'));
            fetchFeatures();
            addNotification('Feature deleted.', 'info');
        }
    };
    
    const IconComponent = ({ name }: { name: string }) => {
        const Comp = ICON_MAP[name];
        return Comp ? <Comp /> : <CpuChipIcon />;
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><CpuChipIcon /><span className="ml-3">Feature Forge</span></h1>
                <p className="text-text-secondary mt-1">Use AI to create new tools and add them to your desktop.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Left: Generator & Preview */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-surface p-4 border border-border rounded-lg">
                        <h3 className="text-lg font-bold">1. Create a New Feature</h3>
                        <div className="flex flex-col mt-2">
                            <label className="text-sm">Describe the tool you want to build</label>
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full mt-1 p-2 bg-background border border-border rounded" rows={3}/>
                        </div>
                        <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary w-full mt-2 py-2 flex items-center justify-center gap-2">{isGenerating ? <LoadingSpinner/> : 'Generate Feature'}</button>
                    </div>
                    {generatedFeature && (
                        <div className="flex-grow flex flex-col bg-surface p-4 border border-dashed rounded-lg space-y-2 animate-pop-in min-h-0">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold">2. Review & Save</h4>
                                <button onClick={handleSave} className="px-4 py-1 bg-green-600 text-white font-bold rounded-md text-sm">Save Feature</button>
                            </div>
                            <p className="text-sm"><strong>Name:</strong> {generatedFeature.name}</p>
                            <div className="flex-grow border rounded-md overflow-hidden min-h-[200px]">
                                 <CustomFeatureRunner feature={{ ...generatedFeature, id: 'preview' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Existing Custom Features */}
                <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                   <div className="bg-surface p-4 border border-border rounded-lg flex-grow flex flex-col min-h-0">
                        <h3 className="text-lg font-bold mb-2">3. Your Custom Features</h3>
                        <div className="flex-grow overflow-y-auto pr-2">
                            {isLoading === 'list' && <LoadingSpinner />}
                            {customFeatures.length === 0 && !isLoading && <p className="text-text-secondary text-center py-8">You haven't created any features yet.</p>}
                            <div className="space-y-3">
                                {customFeatures.map(feature => (
                                    <div key={feature.id} className="group bg-background p-3 rounded-lg border border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-primary"><IconComponent name={feature.icon} /></div>
                                            <div>
                                                <h4 className="font-semibold">{feature.name}</h4>
                                                <p className="text-xs text-text-secondary">{feature.description}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(feature.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"><TrashIcon /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                   </div>
                </div>
            </div>
        </div>
    );
};