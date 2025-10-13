import React, { useState, useMemo } from 'react';
import { CodeBracketSquareIcon } from '../icons.tsx';

const initialScss = `$primary-color: #0047AB;
$font-size: 16px;

.container {
  padding: 20px;
  background-color: #f0f0f0;

  .title {
    color: $primary-color;
    font-size: $font-size * 1.5;

    &:hover {
      text-decoration: underline;
    }
  }
  
  > p {
    margin-top: 10px;
  }
}`;

const escapeRegExp = (string: string): string => {
    // $& means the whole matched string
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const compileScss = (scss: string): string => {
    try {
        let css = scss;
        css = css.replace(/\/\/.*$/gm, '');
        
        const variables: Record<string, string> = {};
        css = css.replace(/\$([\w-]+):\s*(.*?);/g, (_, name, value) => {
            variables[name] = value.trim(); return '';
        });

        for (let i = 0; i < 5; i++) {
            Object.entries(variables).forEach(([name, value]) => {
                css = css.replace(new RegExp(`\\$${escapeRegExp(name)}`, 'g'), value);
            });
        }
        
        css = css.replace(/([\d.]+)(px|rem|em|%)\s*([*\/])\s*([\d.]+)/g, (_, n1, unit, op, n2) => {
            const num1 = parseFloat(n1); const num2 = parseFloat(n2);
            const result = op === '*' ? num1 * num2 : num1 / num2;
            return `${result}${unit}`;
        });

        const processBlock = (block: string, parentSelector: string = ''): string => {
            let currentCss = '';
            let nestedCss = '';
            const properties = [];
            
            const regex = /((?:[\w-:.#&>+~*\s,]+|\([^)]*\))\s*\{[^{}]*\})|((?:[\w-]+\s*:[^;]+;))/g;
            const content = block.substring(block.indexOf('{') + 1, block.lastIndexOf('}'));
            let match;
            while ((match = regex.exec(content)) !== null) {
                if (match[1]) {
                    const nestedSelector = match[1].substring(0, match[1].indexOf('{')).trim();
                    const fullSelector = nestedSelector.includes('&') ? nestedSelector.replace(/&/g, parentSelector) : `${parentSelector} ${nestedSelector}`.trim();
                    nestedCss += processBlock(match[1], fullSelector);
                } else if (match[2]) {
                    properties.push(`  ${match[2].trim()}`);
                }
            }
            
            if (properties.length > 0) {
                currentCss = `${parentSelector} {\n${properties.join('\n')}\n}\n`;
            }

            return currentCss + nestedCss;
        };
        
        let result = processBlock(`root{${css}}`, '').trim();
        return result.replace(/root\s*\{\s*\}/, '').trim();

    } catch(e) {
        console.error("SCSS Compilation Error:", e);
        return "/* Error compiling SCSS. Check console for details. */";
    }
};


export const SassScssCompiler: React.FC = () => {
    const [scss, setScss] = useState(initialScss);
    const compiledCss = useMemo(() => compileScss(scss), [scss]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl flex items-center"><CodeBracketSquareIcon /><span className="ml-3">SASS/SCSS Compiler</span></h1>
                <p className="text-text-secondary mt-1">A real-time SASS/SCSS to CSS compiler.</p>
            </header>
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col flex-1 min-h-0">
                    <label htmlFor="scss-input" className="text-sm font-medium text-text-secondary mb-2">SASS/SCSS Input</label>
                    <textarea id="scss-input" value={scss} onChange={(e) => setScss(e.target.value)} className="flex-grow p-4 bg-surface border border-border rounded-md resize-y font-mono text-sm text-pink-600" spellCheck="false" />
                </div>
                <div className="flex flex-col flex-1 min-h-0">
                    <label className="text-sm font-medium text-text-secondary mb-2">Compiled CSS Output</label>
                    <pre className="flex-grow p-4 bg-background border border-border rounded-md overflow-y-auto text-blue-700 font-mono text-sm whitespace-pre-wrap">{compiledCss}</pre>
                </div>
            </div>
        </div>
    );
};