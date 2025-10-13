import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

export const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-1" aria-label="Loading">
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const [sanitizedHtml, setSanitizedHtml] = useState<string | TrustedHTML>('');

    useEffect(() => {
        const parse = async () => {
            if (content) {
                const html = await marked.parse(content);
                setSanitizedHtml(html);
            } else {
                setSanitizedHtml('');
            }
        };
        parse();
    }, [content]);

    return (
        <div
            className="prose prose-sm max-w-none prose-headings:text-text-primary prose-p:text-text-primary prose-strong:text-text-primary prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-50 prose-pre:border prose-pre:border-border prose-pre:p-4 prose-pre:m-0"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
};
