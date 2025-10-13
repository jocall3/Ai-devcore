import React, { useState, useEffect } from 'react';
import { EyeIcon } from '../icons.tsx';

const devices = {
    'iPhone 12': { width: 390, height: 844 },
    'Pixel 5': { width: 393, height: 851 },
    'iPad Air': { width: 820, height: 1180 },
    'Surface Duo': { width: 540, height: 720 },
    'Laptop': { width: 1366, height: 768 },
    'Desktop': { width: 1920, height: 1080 },
    'Auto': { width: '100%', height: '100%' },
};

type DeviceName = keyof typeof devices;

export const ResponsiveTester: React.FC = () => {
    const [url, setUrl] = useState('https://react.dev');
    const [displayUrl, setDisplayUrl] = useState(url);
    const [size, setSize] = useState<{width: number | string, height: number | string}>(devices['Auto']);

    useEffect(() => {
        const handleResize = () => {
            if (size.width === '100%') {
                setSize({ width: '100%', height: '100%' });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [size.width]);

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setDisplayUrl(url.startsWith('http') ? url : `https://${url}`);
    };

    const handleRotate = () => {
        if(typeof size.width === 'number' && typeof size.height === 'number') {
            setSize({ width: size.height, height: size.width });
        }
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><EyeIcon /><span className="ml-3">Responsive Tester</span></h1><p className="text-text-secondary mt-1">Preview your web pages at different screen sizes.</p></header>
            <form onSubmit={handleUrlSubmit} className="flex items-center gap-2 mb-2">
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="flex-grow px-4 py-2 rounded-md bg-surface border border-border focus:ring-2 focus:ring-primary focus:outline-none"/>
                <button type="submit" className="btn-primary px-6 py-2">Load</button>
            </form>
            <div className="bg-surface p-2 rounded-lg flex flex-wrap justify-center items-center gap-2 mb-4 border border-border">
                {Object.keys(devices).map(name => (
                    <button key={name} onClick={() => setSize(devices[name as DeviceName])} className={`px-3 py-1 rounded-md text-sm ${JSON.stringify(size) === JSON.stringify(devices[name as DeviceName]) ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-gray-100'}`}>{name}</button>
                ))}
                <div className="flex items-center gap-1 ml-4">
                    <input type="number" value={typeof size.width === 'number' ? size.width : ''} onChange={e => setSize({ ...size, width: Number(e.target.value) })} className="w-20 px-2 py-1 bg-gray-100 border border-border rounded-md text-sm"/>
                    <span className="text-sm text-text-secondary">x</span>
                    <input type="number" value={typeof size.height === 'number' ? size.height : ''} onChange={e => setSize({ ...size, height: Number(e.target.value) })} className="w-20 px-2 py-1 bg-gray-100 border border-border rounded-md text-sm"/>
                </div>
                 <button onClick={handleRotate} className="px-3 py-1 rounded-md text-sm hover:bg-gray-100" title="Rotate">🔄</button>
            </div>
            <div className="flex-grow bg-background rounded-lg p-4 overflow-auto border border-border">
                <iframe key={displayUrl} src={displayUrl} style={{ width: size.width, height: size.height }} className="bg-white border-4 border-gray-300 rounded-md transition-all duration-300 shadow-lg mx-auto" title="Responsive Preview"/>
            </div>
        </div>
    );
};