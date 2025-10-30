import React, { useState } from 'react';
import JSZip from 'jszip';
import { getAllFiles } from '../services/index.ts';
import { ArrowDownTrayIcon } from './icons.tsx';
import { LoadingSpinner } from './shared/index.tsx';

export const ActionManager: React.FC = () => {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleDownloadGeneratedFiles = async () => {
        setIsLoading('zip');
        try {
            const zip = new JSZip();

            const generatedFiles = await getAllFiles();
            if (generatedFiles.length === 0) {
                alert("No generated files to download.");
                setIsLoading(null);
                return;
            }

            generatedFiles.forEach(file => {
                zip.file(file.filePath, file.content);
            });
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'devcore-generated-files.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to create ZIP file", error);
            alert(`Error creating ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="absolute top-6 right-6 z-10">
            <button
                onClick={handleDownloadGeneratedFiles}
                disabled={!!isLoading}
                className="w-14 h-14 bg-primary text-text-on-primary rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-colors disabled:bg-slate-600"
                aria-label="Download Generated Files"
                title="Download Generated Files"
            >
                {isLoading === 'zip' ? <LoadingSpinner /> : <ArrowDownTrayIcon />}
            </button>
        </div>
    );
};
