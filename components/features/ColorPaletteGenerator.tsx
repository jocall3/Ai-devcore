import React, { useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { generateColorPalette, downloadFile } from '../../services/index.ts';
import { SparklesIcon, ArrowDownTrayIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';

interface PreviewColors {
    cardBg: string;
    pillBg: string;
    pillText: string;
    buttonBg: string;
}

const PreviewCard: React.FC<{ palette: string[], colors: PreviewColors, setColors: React.Dispatch<React.SetStateAction<PreviewColors>> }> = ({ palette, colors, setColors }) => {
    
    const ColorSelector: React.FC<{ label: string, value: string, onChange: (val: string) => void }> = ({ label, value, onChange }) => (
        <div className="flex items-center justify-between text-sm">
            <label className="text-text-primary">{label}</label>
            <div className="flex items-center gap-2">
                {palette.map(color => (
                     <button 
                        key={color}
                        onClick={() => onChange(color)}
                        className={`w-5 h-5 rounded-full border border-gray-300 ${value === color ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        style={{ backgroundColor: color }}
                        title={color}
                     />
                ))}
            </div>
        </div>
    );
    
    return (
        <div className="bg-surface p-4 rounded-lg border border-border w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-text-primary">Live Preview</h3>
            <div className="p-8 rounded-xl mb-4" style={{ backgroundColor: colors.cardBg }}>
                <div className="px-4 py-1 rounded-full text-center text-sm inline-block" style={{ backgroundColor: colors.pillBg, color: colors.pillText }}>
                    New Feature
                </div>
                <div className="mt-8 text-center">
                     <button className="px-6 py-2 rounded-lg font-bold" style={{ backgroundColor: colors.buttonBg, color: colors.cardBg }}>
                        Get Started
                    </button>
                </div>
            </div>
            <div className="space-y-3">
                <ColorSelector label="Card Background" value={colors.cardBg} onChange={val => setColors(c => ({...c, cardBg: val}))} />
                <ColorSelector label="Pill Background" value={colors.pillBg} onChange={val => setColors(c => ({...c, pillBg: val}))} />
                <ColorSelector label="Pill Text" value={colors.pillText} onChange={val => setColors(c => ({...c, pillText: val}))} />
                <ColorSelector label="Button Background" value={colors.buttonBg} onChange={val => setColors(c => ({...c, buttonBg: val}))} />
            </div>
        </div>
    );
};

export const ColorPaletteGenerator: React.FC = () => {
    const [baseColor, setBaseColor] = useState("#0047AB");
    const [palette, setPalette] = useState<string[]>(['#F0F2F5', '#CCD3E8', '#99AADD', '#6688D1', '#3366CC', '#0047AB']);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [previewColors, setPreviewColors] = useState<PreviewColors>({
        cardBg: '#F0F2F5', pillBg: '#CCD3E8', pillText: '#0047AB', buttonBg: '#0047AB'
    });
    
    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await generateColorPalette(baseColor);
            setPalette(result.colors);
            setPreviewColors({
                cardBg: result.colors[0],
                pillBg: result.colors[2],
                pillText: result.colors[5],
                buttonBg: result.colors[5],
            })
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate palette: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [baseColor]);
    
    const downloadColors = () => {
        const cssContent = `:root {\n${palette.map((c, i) => `  --color-palette-${i+1}: ${c};`).join('\n')}\n}`;
        downloadFile(cssContent, 'palette.css', 'text/css');
    };
    
    const downloadCard = () => {
        const htmlContent = `
<div class="card">
  <div class="pill">New Feature</div>
  <button class="button">Get Started</button>
</div>
        `;
        const cssContent = `
.card {
  background-color: ${previewColors.cardBg};
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
}
.pill {
  background-color: ${previewColors.pillBg};
  color: ${previewColors.pillText};
  display: inline-block;
  padding: 0.25rem 1rem;
  border-radius: 9999px;
  text-align: center;
  font-size: 0.875rem;
}
.button {
  margin-top: 2rem;
  background-color: ${previewColors.buttonBg};
  color: ${previewColors.cardBg};
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: bold;
  border: none;
  cursor: pointer;
}
        `;
        const combined = `<!-- HTML -->\n${htmlContent}\n\n<!-- CSS -->\n<style>\n${cssContent}\n</style>`;
        downloadFile(combined, 'preview-card.html', 'text/html');
    }

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6 text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center">
                    <SparklesIcon />
                    <span className="ml-3">AI Color Palette Generator</span>
                </h1>
                <p className="text-text-secondary mt-1">Pick a base color, let Gemini design a palette, and preview it on a UI card.</p>
            </header>
            <div className="flex-grow flex flex-col lg:flex-row items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-4">
                     <HexColorPicker color={baseColor} onChange={setBaseColor} className="!w-64 !h-64"/>
                     <div className="p-2 bg-surface rounded-md font-mono text-lg border border-border" style={{color: baseColor}}>{baseColor}</div>
                      <button onClick={handleGenerate} disabled={isLoading} className="btn-primary w-full flex items-center justify-center px-6 py-3">
                        {isLoading ? <LoadingSpinner /> : 'Generate Palette'}
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                    <label className="text-sm font-medium text-text-secondary mb-2">Generated Palette:</label>
                    {isLoading ? (
                         <div className="flex items-center justify-center h-48"><LoadingSpinner /></div>
                    ) : (
                        palette.map((color) => (
                            <div key={color} className="group flex items-center justify-between p-4 rounded-md shadow-sm border border-border" style={{ backgroundColor: color }}>
                                <span className="font-mono font-bold text-black/70 mix-blend-overlay">{color}</span>
                                <button onClick={() => navigator.clipboard.writeText(color)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/30 hover:bg-white/50 px-3 py-1 rounded text-xs text-black font-semibold backdrop-blur-sm">Copy</button>
                            </div>
                        ))
                    )}
                    <div className="flex gap-2 mt-2">
                        <button onClick={downloadColors} className="flex-1 flex items-center justify-center gap-2 text-sm py-2 bg-gray-100 border border-border rounded-md hover:bg-gray-200"><ArrowDownTrayIcon className="w-4 h-4"/> Download Colors</button>
                        <button onClick={downloadCard} className="flex-1 flex items-center justify-center gap-2 text-sm py-2 bg-gray-100 border border-border rounded-md hover:bg-gray-200"><ArrowDownTrayIcon className="w-4 h-4"/> Download Card</button>
                    </div>
                </div>
                {!isLoading && <PreviewCard palette={palette} colors={previewColors} setColors={setPreviewColors} />}
            </div>
        </div>
    );
};