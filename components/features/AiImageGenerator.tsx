import React, { useState, useCallback, useRef } from 'react';
import { generateImage, generateImageFromImageAndText } from '../../services/aiService.ts';
import { fileToBase64, blobToDataURL } from '../../services/fileUtils.ts';
import { ImageGeneratorIcon, SparklesIcon, ArrowDownTrayIcon, XMarkIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';

const surprisePrompts = [
    'A majestic lion wearing a crown, painted in the style of Van Gogh.',
    'A futuristic cityscape on another planet with two moons in the sky.',
    'A cozy, magical library inside a giant tree.',
    'A surreal image of a ship sailing on a sea of clouds.',
    'An astronaut riding a space-themed bicycle on the moon.',
];

interface UploadedImage {
    base64: string;
    dataUrl: string;
    mimeType: string;
}

export const AiImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('A photorealistic image of a futuristic city at sunset, with flying cars.');
    const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedImageUrl(null);
        try {
            let resultUrl: string;
            if (uploadedImage) {
                resultUrl = await generateImageFromImageAndText(prompt, uploadedImage.base64, uploadedImage.mimeType);
            } else {
                resultUrl = await generateImage(prompt);
            }
            setGeneratedImageUrl(resultUrl);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate image: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, uploadedImage]);

    const handleSurpriseMe = () => {
        const randomPrompt = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
        setPrompt(randomPrompt);
    };

    const processImageBlob = async (blob: Blob) => {
        try {
            const [dataUrl, base64] = await Promise.all([
                blobToDataURL(blob),
                fileToBase64(blob as File)
            ]);
            setUploadedImage({ dataUrl, base64, mimeType: blob.type });
        } catch (e) {
            setError('Could not process the image.');
        }
    };

    const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
        const items = event.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                if (blob) {
                    await processImageBlob(blob);
                    return;
                }
            }
        }
    }, []);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await processImageBlob(file);
        }
    };
    
    const handleDownload = () => {
        if (!generatedImageUrl) return;
        const link = document.createElement('a');
        link.href = generatedImageUrl;
        link.download = `${prompt.slice(0, 30).replace(/\s/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <ImageGeneratorIcon />
                    <span className="ml-3">AI Image Generator</span>
                </h1>
                <p className="text-text-secondary mt-1">Generate images from text, or provide an image for inspiration.</p>
            </header>
            
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Left Column: Inputs */}
                <div className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="prompt-input" className="text-sm font-medium text-text-secondary">Your Prompt</label>
                        <textarea
                            id="prompt-input"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A cute cat wearing a wizard hat"
                            className="w-full p-3 mt-1 rounded-md bg-surface border border-border focus:ring-2 focus:ring-primary focus:outline-none resize-y"
                            rows={3}
                        />
                    </div>
                    
                    <div className="flex flex-col flex-grow min-h-[200px]">
                         <label className="text-sm font-medium text-text-secondary mb-1">Inspiration Image (Optional)</label>
                         <div onPaste={handlePaste} className="relative flex-grow flex flex-col items-center justify-center bg-surface p-4 rounded-lg border-2 border-dashed border-border focus:outline-none focus:border-primary" tabIndex={0}>
                            {uploadedImage ? (
                                <>
                                    <img src={uploadedImage.dataUrl} alt="Uploaded content" className="max-w-full max-h-full object-contain rounded-md shadow-lg" />
                                    <button onClick={() => setUploadedImage(null)} className="absolute top-2 right-2 p-1 bg-black/30 text-white rounded-full hover:bg-black/50"><XMarkIcon /></button>
                                </>
                            ) : (
                                <div className="text-center text-text-secondary">
                                    <h2 className="text-lg font-bold text-text-primary">Paste an image here</h2>
                                    <p className="text-sm">(Cmd/Ctrl + V)</p>
                                    <p className="text-xs my-1">or</p>
                                    <button onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-primary hover:underline">Upload File</button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                                </div>
                            )}
                         </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="btn-primary w-full flex items-center justify-center px-6 py-3"
                        >
                            {isLoading ? <LoadingSpinner /> : 'Generate Image'}
                        </button>
                        <button
                            onClick={handleSurpriseMe}
                            disabled={isLoading}
                            className="px-4 py-3 bg-surface border border-border rounded-md hover:bg-gray-100 transition-colors"
                            title="Surprise Me!"
                        >
                            <SparklesIcon />
                        </button>
                    </div>
                </div>

                {/* Right Column: Output */}
                <div className="flex flex-col h-full">
                    <label className="text-sm font-medium text-text-secondary mb-2">Generated Image</label>
                    <div className="flex-grow flex items-center justify-center bg-background border-2 border-dashed border-border rounded-lg p-4 relative overflow-auto">
                        {isLoading && <LoadingSpinner />}
                        {error && <p className="text-red-500 text-center">{error}</p>}
                        {generatedImageUrl && !isLoading && (
                            <>
                                <img src={generatedImageUrl} alt={prompt || "Generated by AI"} className="max-w-full max-h-full object-contain rounded-md shadow-lg" />
                                <button 
                                  onClick={handleDownload}
                                  className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 backdrop-blur-sm"
                                  title="Download Image"
                                >
                                    <ArrowDownTrayIcon />
                                </button>
                            </>
                        )}
                        {!isLoading && !generatedImageUrl && !error && (
                            <div className="text-center text-text-secondary">
                                <p>Your generated image will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};