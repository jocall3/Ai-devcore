import React, { useState, useEffect } from 'react';
import { TypographyLabIcon } from '../icons.tsx';

const popularFonts = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro', 'Raleway', 'Poppins', 'Nunito', 'Merriweather',
    'Playfair Display', 'Lora', 'Noto Sans', 'Ubuntu', 'PT Sans', 'Slabo 27px'
];

export const TypographyLab: React.FC = () => {
    const [headingFont, setHeadingFont] = useState('Oswald');
    const [bodyFont, setBodyFont] = useState('Roboto');

    useEffect(() => {
        const fontsToLoad = [headingFont, bodyFont].filter(Boolean).join('|');
        if (fontsToLoad) {
            const linkId = 'font-pairing-stylesheet';
            let link = document.getElementById(linkId) as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            link.href = `https://fonts.googleapis.com/css?family=${fontsToLoad.replace(/ /g, '+')}:400,700&display=swap`;
        }
    }, [headingFont, bodyFont]);
    
    const FontSelector: React.FC<{ label: string, value: string, onChange: (font: string) => void }> = ({ label, value, onChange }) => (
        <div>
            <label className="block text-sm font-medium text-text-secondary">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md bg-surface border border-border">
                {popularFonts.map(font => <option key={font} value={font}>{font}</option>)}
            </select>
        </div>
    );

    const headingImport = `@import url('https://fonts.googleapis.com/css?family=${headingFont.replace(/ /g, '+')}:700&display=swap');`;
    const bodyImport = `@import url('https://fonts.googleapis.com/css?family=${bodyFont.replace(/ /g, '+')}:400&display=swap');`;
    const headingRule = `font-family: '${headingFont}', sans-serif;`;
    const bodyRule = `font-family: '${bodyFont}', sans-serif;`;

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <TypographyLabIcon />
                    <span className="ml-3">Typography Lab</span>
                </h1>
                <p className="text-text-secondary mt-1">Preview font pairings and get the necessary CSS rules.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                <div className="lg:col-span-1 flex flex-col gap-4 bg-surface border border-border p-6 rounded-lg">
                    <h3 className="text-xl font-bold">Controls</h3>
                    <FontSelector label="Heading Font" value={headingFont} onChange={setHeadingFont} />
                    <FontSelector label="Body Font" value={bodyFont} onChange={setBodyFont} />
                    <div className="space-y-2 mt-4 pt-4 border-t border-border">
                        <label className="block text-sm font-medium text-text-secondary">CSS Rules</label>
                        <div className="relative"><pre className="bg-background p-2 rounded-md text-primary text-xs overflow-x-auto">{headingImport}</pre><button onClick={() => navigator.clipboard.writeText(headingImport)} className="absolute top-1 right-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs">Copy</button></div>
                        <div className="relative"><pre className="bg-background p-2 rounded-md text-primary text-xs overflow-x-auto">{headingRule}</pre><button onClick={() => navigator.clipboard.writeText(headingRule)} className="absolute top-1 right-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs">Copy</button></div>
                        <div className="relative"><pre className="bg-background p-2 rounded-md text-primary text-xs overflow-x-auto">{bodyImport}</pre><button onClick={() => navigator.clipboard.writeText(bodyImport)} className="absolute top-1 right-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs">Copy</button></div>
                        <div className="relative"><pre className="bg-background p-2 rounded-md text-primary text-xs overflow-x-auto">{bodyRule}</pre><button onClick={() => navigator.clipboard.writeText(bodyRule)} className="absolute top-1 right-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs">Copy</button></div>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-background border border-border rounded-lg p-8 overflow-y-auto">
                    <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: `'${headingFont}', sans-serif` }}>
                        The Quick Brown Fox Jumps Over the Lazy Dog
                    </h2>
                    <p className="text-lg" style={{ fontFamily: `'${bodyFont}', sans-serif` }}>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat.
                    </p>
                </div>
            </div>
        </div>
    );
};