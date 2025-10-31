import React, { useState, useCallback, useRef } from 'react';
import { streamContent } from '../../services/index.ts';
import { PhotoIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';
import { fileToBase64, blobToDataURL, downloadFile } from '../../services/fileUtils.ts';
import { useVaultModal } from '../../contexts/VaultModalContext.tsx';
import { useNotification } from '../../contexts/NotificationContext.tsx';
import { useGlobalState } from '../../contexts/GlobalStateContext.tsx';

export const ScreenshotToComponent: React.FC = () => {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [rawCode, setRawCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { state } = useGlobalState();
    const { vaultState } = state;
    const { requestUnlock, requestCreation } = useVaultModal();
    const { addNotification } = useNotification();

    const withVault = useCallback(async (callback: () => Promise<void>) => {
        if (!vaultState.isInitialized) {
            const created = await requestCreation();
            if (!created) {
                addNotification('Vault setup is required to use AI features.', 'error');
                return;
            }
        }
        if (!vaultState.isUnlocked) {
            const unlocked = await requestUnlock();
            if (!unlocked) {
                addNotification('Vault must be unlocked to use AI features.', 'info');
                return;
            }
        }
        await callback();
    }, [vaultState, requestCreation, requestUnlock, addNotification]);

    const handleGenerate = useCallback(async (base64Image: string, mimeType: string) => {
        await withVault(async () => {
            setIsLoading(true);
            setError('');
            setRawCode('');
            
            try {
                const prompt = {
                    parts: [
                        { text: 'Generate a single file for a React component that looks like this image, using Tailwind CSS for styling. Respond only with the TSX code, without any markdown fences or explanations.' },
                        { inlineData: { mimeType: mimeType, data: base64Image } }
                    ]
                };
                const systemInstruction = 'You are an expert at creating React components from images. You only output valid TSX code.';
                const stream = streamContent(prompt, systemInstruction, 0.3);
                let fullResponse = '';
                for await (const chunk of stream) {
                    fullResponse += chunk;
                    setRawCode(fullResponse.replace(/^```(?:\w+\n)?/, '').replace(/```$/, ''));
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(errorMessage);
                addNotification(errorMessage, 'error');
            } finally {
                setIsLoading(false);
            }
        });
    }, [withVault, addNotification]);

    const processImageBlob = useCallback(async (blob: Blob) => {
        try {
            const [dataUrl, base64Image] = await Promise.all([blobToDataURL(blob), fileToBase64(blob as File)]);
            setPreviewImage(dataUrl);
            await handleGenerate(base64Image, blob.type);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Could not process the image.';
            setError(errorMessage);
            addNotification(errorMessage, 'error');
        }
    }, [handleGenerate, addNotification]);
    
    const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
        const items = event.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                if (blob) await processImageBlob(blob);
                return;
            }
        }
    }, [processImageBlob]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) await processImageBlob(file);
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><PhotoIcon /><span className="ml-3">AI Screenshot-to-Component</span></h1><p className="text-text-secondary mt-1">Paste or upload a screenshot of a UI element to generate React/Tailwind code.</p></header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div onPaste={handlePaste} className="flex flex-col items-center justify-center bg-surface p-6 rounded-lg border-2 border-dashed border-border focus:outline-none focus:border-primary overflow-y-auto" tabIndex={0}>
                    {previewImage ? (<img src={previewImage} alt="Pasted content" className="max-w-full max-h-full object-contain rounded-md shadow-lg" />) : (<div className="text-center text-text-secondary">
                            <h2 className="text-xl font-bold text-text-primary">Paste an image here</h2>
                            <p className="mb-2">(Cmd/Ctrl + V)</p>
                            <p className="text-sm">or</p>
                            <button onClick={() => fileInputRef.current?.click()} className="mt-2 btn-primary px-4 py-2 text-sm">Upload File</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                        </div>)}
                </div>
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-text-secondary">Generated Code</label>
                        {rawCode && !isLoading && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => navigator.clipboard.writeText(rawCode)} className="px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600">Copy Code</button>
                                <button onClick={() => downloadFile(rawCode, 'Component.tsx', 'text/typescript')} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Download
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex-grow bg-background border border-border rounded-md overflow-y-auto">
                        {isLoading && (<div className="flex items-center justify-center h-full"><LoadingSpinner /></div>)}
                        {error && <p className="p-4 text-red-500">{error}</p>}
                        {rawCode && !isLoading && <MarkdownRenderer content={`\`\`\`tsx\n${rawCode}\n\`\`\``} />}
                        {!isLoading && !rawCode && !error && (<div className="text-text-secondary h-full flex items-center justify-center">Generated component code will appear here.</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};
