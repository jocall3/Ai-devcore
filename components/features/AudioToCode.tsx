import React, { useState, useRef, useCallback } from 'react';
import { transcribeAudioToCodeStream, blobToBase64 } from '../../services/index.ts';
import { MicrophoneIcon } from '../icons.tsx';
import { LoadingSpinner } from '../shared/index.tsx';
import { MarkdownRenderer } from '../shared/index.tsx';

export const AudioToCode: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        setError('');
        setCode('');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('Audio recording is not supported by your browser.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = handleTranscribe;
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            setError('Microphone access was denied. Please enable it in your browser settings.');
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsLoading(true);
        }
    };

    const handleTranscribe = useCallback(async () => {
        if (audioChunksRef.current.length === 0) {
            setIsLoading(false);
            return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        try {
            const base64Audio = await blobToBase64(audioBlob);
            const stream = transcribeAudioToCodeStream(base64Audio, 'audio/webm');
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setCode(fullResponse);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to transcribe audio: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 text-text-primary">
            <header className="mb-6 text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center">
                    <MicrophoneIcon />
                    <span className="ml-3">AI Audio-to-Code</span>
                </h1>
                <p className="text-text-secondary mt-1">Speak your programming ideas and watch them turn into code.</p>
            </header>
            <div className="flex-grow flex flex-col items-center gap-6 min-h-0">
                <div className="flex flex-col items-center justify-center bg-surface p-6 rounded-lg w-full max-w-lg border border-border">
                     <button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}
                        disabled={isLoading}
                    >
                        {isLoading ? <LoadingSpinner/> : isRecording ? 'Stop' : 'Record'}
                    </button>
                    <p className="mt-4 text-text-secondary">
                        {isLoading ? 'Transcribing...' : isRecording ? 'Recording in progress...' : 'Click to start recording'}
                    </p>
                </div>
                 <div className="flex flex-col h-full w-full max-w-3xl">
                    <label className="text-sm font-medium text-text-secondary mb-2">Generated Code</label>
                    <div className="flex-grow p-1 bg-background border border-border rounded-md overflow-y-auto min-h-[200px]">
                        {isLoading && !code && (
                            <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>
                        )}
                        {error && <p className="p-4 text-red-500">{error}</p>}
                        {code && <MarkdownRenderer content={code} />}
                        {!isLoading && !code && !error && (
                            <div className="text-text-secondary h-full flex items-center justify-center">Code will appear here.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};