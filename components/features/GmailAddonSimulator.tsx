import React, { useState, useCallback } from 'react';
import { streamContent } from '../../services/aiService.ts';
import { MailIcon, SparklesIcon, XMarkIcon } from '../icons.tsx';
import { LoadingSpinner, MarkdownRenderer } from '../shared/index.tsx';

const mockEmail = {
    from: 'Alice <alice@example.com>',
    to: 'Me <me@example.com>',
    subject: 'Project Update & Question',
    body: `Hey,

Just wanted to give you a quick update. The new user authentication flow is complete and pushed to the staging server.

I had a question about the next task regarding the database migration. The ticket says we need to migrate the 'users' table, but it's not clear on the required schema changes. Should I just add the new 'last_login' column or are there other modifications needed?

Let me know when you have a chance.

Thanks,
Alice`
};

export const GmailAddonSimulator: React.FC = () => {
    const [isComposeOpen, setComposeOpen] = useState(false);
    const [generatedReply, setGeneratedReply] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateReply = useCallback(async () => {
        setIsGenerating(true);
        setGeneratedReply('');
        setComposeOpen(true);
        try {
            const prompt = `Generate a professional and friendly reply to the following email. Acknowledge the update and answer the question by stating that only the 'last_login' column (as a DATETIME) is needed for now.\n\nEMAIL:\n${mockEmail.body}`;
            const stream = streamContent(prompt, "You are a helpful assistant writing a professional email reply.", 0.7);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setGeneratedReply(fullResponse);
            }
        } catch(e) {
            setGeneratedReply(`Error: ${e instanceof Error ? e.message : 'Could not generate reply.'}`);
        }
        finally {
            setIsGenerating(false);
        }
    }, []);

    const ComposeModal = () => (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center p-4 z-20">
            <div className="w-full max-w-2xl h-[70vh] bg-surface rounded-lg shadow-2xl flex flex-col animate-pop-in">
                <header className="flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-700 rounded-t-lg">
                    <h3 className="font-semibold text-sm">New Message</h3>
                    <button onClick={() => setComposeOpen(false)}><XMarkIcon /></button>
                </header>
                <div className="p-3 text-sm border-b border-border">
                    <p><span className="text-text-secondary">To:</span> {mockEmail.from}</p>
                </div>
                <div className="p-3 text-sm border-b border-border">
                     <p><span className="text-text-secondary">Subject:</span> Re: {mockEmail.subject}</p>
                </div>
                <div className="flex-grow p-3 overflow-y-auto">
                    {isGenerating ? <div className="flex justify-center items-center h-full"><LoadingSpinner /></div> : <MarkdownRenderer content={generatedReply} />}
                </div>
                 <footer className="p-3 border-t border-border">
                    <button className="btn-primary px-6 py-2">Send</button>
                 </footer>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center"><MailIcon /><span className="ml-3">Gmail Add-on Simulator</span></h1>
                <p className="text-text-secondary mt-1">A simulation of how contextual add-on scopes would work inside Gmail.</p>
            </header>
            <div className="relative flex-grow bg-surface border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center">
                {isComposeOpen && <ComposeModal />}
                <div className="w-full max-w-4xl h-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex-shrink-0 p-4 border-b border-border">
                        <h2 className="text-xl font-bold">{mockEmail.subject}</h2>
                        <div className="flex items-center gap-2 text-sm mt-2">
                             <img src="https://avatar.vercel.sh/alice" alt="Alice" className="w-8 h-8 rounded-full" />
                             <div>
                                <p className="font-semibold">{mockEmail.from.split('<')[0].trim()}</p>
                                <p className="text-text-secondary text-xs">to {mockEmail.to.split('<')[0].trim()}</p>
                             </div>
                        </div>
                    </div>
                    {/* Body */}
                    <div className="flex-grow p-4 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{mockEmail.body}</pre>
                    </div>
                    {/* Actions */}
                    <div className="flex-shrink-0 p-4 border-t border-border bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <div className="text-xs text-text-secondary">
                            <strong>Disclaimer:</strong> This is a simulation. The requested scopes allow this app to read the current email and compose replies <strong>if it were running inside Gmail.</strong>
                        </div>
                        <button onClick={handleGenerateReply} disabled={isGenerating} className="btn-primary flex items-center justify-center gap-2 px-4 py-2">
                           <SparklesIcon /> AI Reply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
