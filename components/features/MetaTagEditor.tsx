import React, { useState, useMemo } from 'react';
import { CodeBracketSquareIcon } from '../icons.tsx';

interface MetaData {
    title: string;
    description: string;
    image: string;
    url: string;
}

const SocialCardPreview: React.FC<{ meta: MetaData }> = ({ meta }) => (
    <div className="w-full max-w-md mx-auto bg-surface border border-border rounded-2xl overflow-hidden shadow-lg">
        <div className="h-52 bg-gray-100 flex items-center justify-center">
            {meta.image ? <img src={meta.image} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display='none'}/> : <span className="text-text-secondary">Image Preview</span>}
        </div>
        <div className="p-4">
            <p className="text-xs text-text-secondary truncate">{new URL(meta.url || 'https://example.com').hostname}</p>
            <h3 className="font-bold text-text-primary truncate mt-1">{meta.title || 'Your Title Here'}</h3>
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{meta.description || 'A concise description of your content will appear here.'}</p>
        </div>
    </div>
);

export const MetaTagEditor: React.FC = () => {
    const [meta, setMeta] = useState<MetaData>({
        title: 'DevCore AI Toolkit', description: 'The ultimate toolkit for modern developers, powered by Gemini.',
        image: 'https://storage.googleapis.com/maker-studio-project-images-prod/programming_power_on_a_laptop_3a8f0bb1_39a9_4c2b_81f0_a74551480f2c.png',
        url: 'https://devcore.example.com'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMeta({ ...meta, [e.target.name]: e.target.value });
    };

    const generatedHtml = useMemo(() => {
        return `<!-- Primary Meta Tags -->
<title>${meta.title}</title>
<meta name="title" content="${meta.title}" />
<meta name="description" content="${meta.description}" />
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="${meta.url}" />
<meta property="og:title" content="${meta.title}" />
<meta property="og:description" content="${meta.description}" />
<meta property="og:image" content="${meta.image}" />
<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image" />
<meta property="twitter:url" content="${meta.url}" />
<meta property="twitter:title" content="${meta.title}" />
<meta property="twitter:description" content="${meta.description}" />
<meta property="twitter:image" content="${meta.image}" />`;
    }, [meta]);
    
    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6"><h1 className="text-3xl font-bold flex items-center"><CodeBracketSquareIcon /><span className="ml-3">Meta Tag Editor</span></h1><p className="text-text-secondary mt-1">Generate SEO & social media meta tags with a live preview.</p></header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 min-h-0">
                <div className="xl:col-span-1 flex flex-col gap-4 bg-surface border border-border p-6 rounded-lg overflow-y-auto">
                    <h3 className="text-xl font-bold">Metadata</h3>
                    <div><label className="block text-sm">Title</label><input type="text" name="title" value={meta.title} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"/></div>
                    <div><label className="block text-sm">Description</label><input type="text" name="description" value={meta.description} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"/></div>
                    <div><label className="block text-sm">Canonical URL</label><input type="text" name="url" value={meta.url} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"/></div>
                    <div><label className="block text-sm">Social Image URL</label><input type="text" name="image" value={meta.image} onChange={handleChange} className="w-full mt-1 p-2 rounded bg-background border border-border"/></div>
                </div>
                <div className="xl:col-span-1 flex flex-col">
                     <label className="text-sm font-medium text-text-secondary mb-2">Generated HTML</label>
                     <div className="relative flex-grow"><pre className="w-full h-full bg-background p-4 rounded-md text-primary text-sm overflow-auto">{generatedHtml}</pre><button onClick={() => navigator.clipboard.writeText(generatedHtml)} className="absolute top-2 right-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-xs">Copy</button></div>
                </div>
                 <div className="hidden xl:flex flex-col items-center justify-center">
                    <label className="text-sm font-medium text-text-secondary mb-2">Live Preview</label>
                    <SocialCardPreview meta={meta} />
                </div>
            </div>
        </div>
    );
};