import React, { useState, useCallback, useEffect } from 'react';
import { SparklesIcon, ArrowDownTrayIcon, PhotoIcon } from '../icons.tsx';
import { generateSemanticTheme } from '../../services/index.ts';
import { fileToBase64 } from '../../services/fileUtils.ts';
import type { SemanticColorTheme, ColorTheme } from '../../types.ts';
import { LoadingSpinner } from '../shared/index.tsx';
import { useTheme } from '../../hooks/useTheme.ts';

const ColorDisplay: React.FC<{ name: string; color: { name: string; value: string; } }> = ({ name, color }) => (
    <div className="flex items-center justify-between p-2 bg-background rounded-md border border-border">
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: color.value }} />
            <div>
                <p className="text-sm font-semibold text-text-primary capitalize">{name}</p>
                <p className="text-xs text-text-secondary">{color.name}</p>
            </div>
        </div>
        <span className="font-mono text-sm text-text-secondary">{color.value}</span>
    </div>
);

const AccessibilityCheck: React.FC<{ name: string, check: { ratio: number; score: string; } }> = ({ name, check }) => {
    const scoreColor = check.score === 'AAA' ? 'text-green-600' : check.score === 'AA' ? 'text-emerald-600' : 'text-red-600';
    return (
        <div className="flex items-center justify-between p-2 bg-background rounded-md border border-border text-sm">
            <p className="text-text-secondary">{name}</p>
            <div className="flex items-center gap-2">
                <span className="font-mono">{check.ratio.toFixed(2)}</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${scoreColor} ${scoreColor.replace('text-', 'bg-')}/10`}>{check.score}</span>
            </div>
        </div>
    );
}

export const ThemeDesigner: React.FC = () => {
    const [theme, setTheme] = useState<SemanticColorTheme | null>(null);
    const [prompt, setPrompt] = useState('A calming, minimalist theme for a blog');
    const [image, setImage] = useState<{ base64: string, name: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [, , applyCustomTheme] = useTheme();

    const handleGenerate = useCallback(async () => {
        const textPart = { text: `Generate a theme based on this description: "${prompt}"` };
        const imagePart = image ? { inlineData: { mimeType: 'image/png', data: image.base64 } } : null;
        const parts = imagePart ? [textPart, imagePart] : [textPart];

        setIsLoading(true); setError('');
        try {
            const newTheme = await generateSemanticTheme({ parts });
            setTheme(newTheme);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [prompt, image]);
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            setImage({ base64, name: file.name });
            setPrompt(`A theme based on the uploaded image: ${file.name}`);
        }
    };
    
    useEffect(() => { handleGenerate(); }, []);

    const handleApplyTheme = () => {
        if (!theme) return;
        const colorsToApply: ColorTheme = {
            primary: theme.palette.primary.value,
            background: theme.theme.background.value,
            surface: theme.theme.surface.value,
            textPrimary: theme.theme.textPrimary.value,
            textSecondary: theme.theme.textSecondary.value,
            textOnPrimary: theme.theme.textOnPrimary.value,
            border: theme.theme.border.value,
        };
        applyCustomTheme(colorsToApply, theme.mode);
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><SparklesIcon /><span className="ml-3">AI Theme Designer</span></h1>
                <p className="text-text-secondary mt-1">Generate a full design system from a description or image.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                <div className="md:col-span-1 flex flex-col gap-4 bg-surface border border-border p-6 rounded-lg overflow-y-auto">
                    <h3 className="text-xl font-bold">Describe or Upload</h3>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="p-2 bg-background border border-border rounded-md resize-none text-sm h-24" placeholder="e.g., A light, airy theme for a blog" />
                     <div className="relative border border-dashed border-border rounded-lg p-4 text-center">
                        <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <PhotoIcon/>
                        <p className="text-sm mt-1">{image ? `Image: ${image.name}` : 'Upload an image (optional)'}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleGenerate} disabled={isLoading} className="btn-primary flex-grow flex items-center justify-center gap-2 px-4 py-2">
                            {isLoading ? <LoadingSpinner /> : 'Generate New Theme'}
                        </button>
                         <button onClick={handleApplyTheme} disabled={isLoading || !theme} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-md hover:opacity-90 transition-all disabled:opacity-50 shadow-md">
                            Apply to App
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                    {theme && !isLoading && (
                        <div className="mt-4 border-t border-border pt-4 space-y-4">
                            <div><h3 className="text-lg font-bold mb-2">Palette</h3><div className="space-y-2"><ColorDisplay name="Primary" color={theme.palette.primary}/><ColorDisplay name="Secondary" color={theme.palette.secondary}/><ColorDisplay name="Accent" color={theme.palette.accent}/><ColorDisplay name="Neutral" color={theme.palette.neutral}/></div></div>
                            <div><h3 className="text-lg font-bold mb-2">Theme Roles</h3><div className="space-y-2"><ColorDisplay name="Background" color={theme.theme.background}/><ColorDisplay name="Surface" color={theme.theme.surface}/><ColorDisplay name="Text Primary" color={theme.theme.textPrimary}/><ColorDisplay name="Text Secondary" color={theme.theme.textSecondary}/><ColorDisplay name="Text on Primary" color={theme.theme.textOnPrimary}/><ColorDisplay name="Border" color={theme.theme.border}/></div></div>
                            <div><h3 className="text-lg font-bold mb-2">Accessibility (WCAG 2.1)</h3><div className="space-y-2"><AccessibilityCheck name="Primary on Surface" check={theme.accessibility.primaryOnSurface}/><AccessibilityCheck name="Text on Surface" check={theme.accessibility.textPrimaryOnSurface}/><AccessibilityCheck name="Subtle Text on Surface" check={theme.accessibility.textSecondaryOnSurface}/><AccessibilityCheck name="Text on Primary" check={theme.accessibility.textOnPrimaryOnPrimary}/></div></div>
                        </div>
                    )}
                </div>
                <div className="md:col-span-1 rounded-lg p-8 overflow-y-auto border border-border" style={{ backgroundColor: theme?.theme.background.value, color: theme?.theme.textPrimary.value }}>
                     <h3 className="text-2xl font-bold mb-6">Live Preview</h3>
                     {theme ? (
                         <div className="p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6" style={{ backgroundColor: theme.theme.surface.value }}>
                            <div className="space-y-4">
                                <h4 className="text-lg font-bold">Sample Card</h4>
                                <p className="text-sm" style={{color: theme.theme.textSecondary.value}}>This is a sample card to demonstrate the theme colors. It contains a primary button and some secondary text.</p>
                                <button className="px-4 py-2 rounded-md font-bold transition-colors" style={{ backgroundColor: theme.palette.primary.value, color: theme.theme.textOnPrimary.value }}>Primary Button</button>
                            </div>
                             <div className="space-y-4">
                                <input type="text" placeholder="Text input" className="w-full px-3 py-2 rounded-md border" style={{backgroundColor: theme.theme.background.value, borderColor: theme.theme.border.value, color: theme.theme.textPrimary.value}} />
                                <div className="p-3 border rounded" style={{borderColor: theme.theme.border.value, color: theme.theme.textSecondary.value}}>
                                    <p>A bordered container.</p>
                                </div>
                             </div>
                         </div>
                     ) : <div className="flex items-center justify-center h-full text-text-secondary">Theme preview will appear here.</div>}
                </div>
            </div>
        </div>
    );
};