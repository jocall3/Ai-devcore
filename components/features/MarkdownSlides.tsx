

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import { PhotoIcon } from '../icons.tsx';

const exampleMarkdown = `# Slide 1: Welcome

This is a slide deck generated from Markdown.

- Use standard markdown syntax
- Like lists, headers, and **bold** text.

---

# Slide 2: Features

Navigate using the buttons below.

\`\`\`javascript
console.log("Code blocks work too!");
\`\`\`

---

# Slide 3: The End

Easy to create and present.
`;

export const MarkdownSlides: React.FC = () => {
    const [markdown, setMarkdown] = useState(exampleMarkdown);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [slideHtml, setSlideHtml] = useState<string | TrustedHTML>('');
    const presentationRef = useRef<HTMLDivElement>(null);

    const slides = useMemo(() => markdown.split(/^-{3,}\s*$/m), [markdown]);

    useEffect(() => {
        const parse = async () => {
            const currentSlideContent = slides[currentSlide] || '';
            const html = await marked.parse(currentSlideContent);
            setSlideHtml(html);
        };
        parse();
    }, [slides, currentSlide]);

    const goToNext = useCallback(() => setCurrentSlide(s => Math.min(s + 1, slides.length - 1)), [slides.length]);
    const goToPrev = useCallback(() => setCurrentSlide(s => Math.max(s - 1, 0)), []);

    const handleFullscreen = () => {
        presentationRef.current?.requestFullscreen();
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.fullscreenElement === presentationRef.current) {
                if (e.key === 'ArrowRight' || e.key === ' ') goToNext();
                if (e.key === 'ArrowLeft') goToPrev();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [goToNext, goToPrev]);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><PhotoIcon /><span className="ml-3">Markdown to Slides</span></h1>
                <p className="text-text-secondary mt-1">Write markdown, present it as a slideshow. Use '---' to separate slides.</p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
                <div className="flex flex-col h-full">
                     <label htmlFor="md-input" className="text-sm font-medium text-text-secondary mb-2">Markdown Editor</label>
                     <textarea id="md-input" value={markdown} onChange={e => setMarkdown(e.target.value)} className="flex-grow p-4 bg-surface border border-border rounded-md resize-none font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"/>
                </div>
                 <div ref={presentationRef} className="flex flex-col h-full bg-surface fullscreen:bg-background border border-border rounded-md">
                    <div className="flex-shrink-0 flex justify-end items-center p-2 border-b border-border gap-2">
                        <button onClick={handleFullscreen} className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-md text-xs hover:bg-gray-200 dark:hover:bg-slate-600">Fullscreen</button>
                    </div>
                    <div className="relative flex-grow flex flex-col justify-center items-center p-8 overflow-y-auto">
                        <div className="prose prose-lg max-w-none w-full" dangerouslySetInnerHTML={{ __html: slideHtml }} />
                         <button onClick={goToPrev} disabled={currentSlide === 0} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-gray-200/50 dark:bg-slate-700/50 rounded-full disabled:opacity-30 hover:bg-gray-300/50 dark:hover:bg-slate-600/50">◀</button>
                         <button onClick={goToNext} disabled={currentSlide === slides.length - 1} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-gray-200/50 dark:bg-slate-700/50 rounded-full disabled:opacity-30 hover:bg-gray-300/50 dark:hover:bg-slate-600/50">▶</button>
                         <div className="absolute bottom-4 right-4 text-xs bg-black/50 px-2 py-1 rounded-md text-white">
                            {currentSlide + 1} / {slides.length}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};