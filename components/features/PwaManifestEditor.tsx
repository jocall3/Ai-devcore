import React, { useState, useMemo } from 'react';
import { CodeBracketSquareIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { downloadFile } from '../../services/fileUtils.ts';

interface ManifestData {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
    orientation: 'any' | 'natural' | 'landscape' | 'portrait';
    background_color: string;
    theme_color: string;
}

const HomeScreenPreview: React.FC<{ manifest: ManifestData }> = ({ manifest }) => (
    <div className="w-full max-w-xs mx-auto flex flex-col items-center">
        <div className="w-72 h-[550px] bg-gray-800 rounded-[40px] border-[10px] border-black shadow-2xl p-4 flex flex-col">
            <div className="flex-shrink-0 h-6 flex justify-between items-center px-4">
                <span className="text-xs font-bold" style={{color: manifest.theme_color}}>9:41</span>
                <div className="w-16 h-4 bg-black rounded-full" />
                <span className="text-xs font-bold" style={{color: manifest.theme_color}}>100%</span>
            </div>
            <div className="flex-grow grid grid-cols-4 gap-4 p-4">
                <div className="flex flex-col items-center gap-1">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-3xl" style={{backgroundColor: manifest.background_color}}>
                        <span style={{color: manifest.theme_color}}>{manifest.short_name[0]}</span>
                    </div>
                    <p className="text-xs text-center text-white truncate w-full">{manifest.short_name}</p>
                </div>
            </div>
        </div>
         <p className="text-xs text-text-secondary mt-2 text-center">Home Screen Preview</p>
    </div>
);


export const PwaManifestEditor: React.FC = () => {
    const [manifest, setManifest] = useState<ManifestData>({
        name: 'DevCore Progressive Web App', short_name: 'DevCore', start_url: '/', scope: '/',
        display: 'standalone', orientation: 'any', background_color: '#F5F7FA', theme_color: '#0047AB',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setManifest({ ...manifest, [e.target.name]: e.target.value });
    };

    const generatedJson = useMemo(() => {
        const fullManifest = { ...manifest, icons: [{"src": "icon-192.png", "type": "image/png", "sizes": "192x192"}, {"src": "icon-512.png", "type": "image/png", "sizes": "512x512"}] };
        return JSON.stringify(fullManifest, null, 2);
    }, [manifest]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><CodeBracketSquareIcon /><span className="ml-3">PWA Manifest Editor</span></h1><p className="text-text-secondary mt-1">Configure and generate the `manifest.json` file for your PWA.</p></header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 min-h-0">
                <div className="xl:col-span-1 flex flex-col gap-4 bg-surface border border-border p-6 rounded-lg overflow-y-auto">
                    <h3 className="text-xl font-bold">Configuration</h3>
                    <div><label className="block text-sm">App Name</label><input type="text" name="name" value={manifest.name} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"/></div>
                    <div><label className="block text-sm">Short Name</label><input type="text" name="short_name" value={manifest.short_name} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"/></div>
                    <div><label className="block text-sm">Start URL</label><input type="text" name="start_url" value={manifest.start_url} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"/></div>
                    <div><label className="block text-sm">Scope</label><input type="text" name="scope" value={manifest.scope} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"/></div>
                    <div><label className="block text-sm">Display Mode</label><select name="display" value={manifest.display} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"><option>standalone</option><option>fullscreen</option><option>minimal-ui</option><option>browser</option></select></div>
                    <div><label className="block text-sm">Orientation</label><select name="orientation" value={manifest.orientation} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"><option>any</option><option>natural</option><option>landscape</option><option>portrait</option></select></div>
                     <div className="flex gap-4">
                        <div className="w-1/2"><label className="block text-sm">Background Color</label><input type="color" name="background_color" value={manifest.background_color} onChange={handleChange} className="w-full mt-1 h-10 rounded bg-background border border-border"/></div>
                        <div className="w-1/2"><label className="block text-sm">Theme Color</label><input type="color" name="theme_color" value={manifest.theme_color} onChange={handleChange} className="w-full mt-1 h-10 rounded bg-background border border-border"/></div>
                     </div>
                </div>
                <div className="xl:col-span-1 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                         <label className="text-sm font-medium text-text-secondary">Generated manifest.json</label>
                         <button onClick={() => downloadFile(generatedJson, 'manifest.json', 'application/json')} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-xs rounded-md hover:bg-gray-200">
                            <ArrowDownTrayIcon className="w-4 h-4"/> Download
                        </button>
                    </div>
                     <div className="relative flex-grow"><pre className="w-full h-full bg-background p-4 rounded-md text-primary text-sm overflow-auto">{generatedJson}</pre></div>
                </div>
                <div className="hidden xl:flex flex-col items-center justify-center">
                    <label className="text-sm font-medium text-text-secondary mb-2">Live Preview</label>
                    <HomeScreenPreview manifest={manifest} />
                </div>
            </div>
        </div>
    );
};