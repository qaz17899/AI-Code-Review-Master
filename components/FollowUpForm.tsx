import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PaperclipIcon, SendIcon, XIcon } from './icons';
import type { AppFile, ApiSettings } from '../types';
import { countInputTokens } from '../services/aiService';
import { processUploadedFiles, handleImagePaste, type UploadPayload } from '../utils';
import { getFileIcon } from '../utils/fileTree';
import { TokenDisplay } from './TokenDisplay';
import { useDebouncedTokenCounter } from '../hooks/useDebouncedTokenCounter';
import { ALL_SUPPORTED_TYPES } from './constants';

export const FollowUpForm: React.FC<{
    onFollowUp: (files: AppFile[], message: string, images: string[]) => Promise<void>;
    isSubmitting: boolean;
    onReadyForDrop: (handler: (files: FileList | File[]) => void) => void;
    provider: ApiSettings['defaultProvider'];
    settings: ApiSettings;
    acceptedTypes: string[];
}> = ({ onFollowUp, isSubmitting, onReadyForDrop, provider, settings, acceptedTypes }) => {
    const [files, setFiles] = useState<AppFile[]>([]);
    const [message, setMessage] = useState('');
    const [pastedImages, setPastedImages] = useState<string[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [message, pastedImages]);

    const [inputTokenCount, isCountingTokens] = useDebouncedTokenCounter(provider, files, message, pastedImages, settings);

    const processAndSetFiles = useCallback(async (fileList: FileList | File[]) => {
        const filesArray = Array.from(fileList);
        if (filesArray.length === 0) return;

        const payloads: UploadPayload[] = filesArray.map(file => ({
            file,
            path: (file as any).webkitRelativePath || file.name,
        }));

        try {
            const newAppFiles = await processUploadedFiles(payloads, acceptedTypes, console.error);
            setFiles(prevFiles => {
                const newUniqueFiles = newAppFiles.filter(nf => !prevFiles.some(pf => pf.path === nf.path));
                return [...prevFiles, ...newUniqueFiles];
            });
            textareaRef.current?.focus();
        } catch (error) {
            console.error("Error processing follow-up files:", error);
        }
    }, [acceptedTypes]);

    useEffect(() => {
      onReadyForDrop(processAndSetFiles);
    }, [onReadyForDrop, processAndSetFiles]);
    
    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       if (e.target.files) processAndSetFiles(e.target.files);
       e.target.value = '';
    };
    
    const handleRemoveFile = (filePath: string) => {
        setFiles(prev => prev.filter(file => file.path !== filePath));
    };

    const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        handleImagePaste(e, newImages => {
            setPastedImages(prev => [...prev, ...newImages]);
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || (files.length === 0 && !message.trim() && pastedImages.length === 0)) return;
        onFollowUp(files, message, pastedImages);
        setFiles([]);
        setMessage('');
        setPastedImages([]);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex flex-col bg-stone-100/75 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-400/80 dark:border-slate-700/80 rounded-xl p-2 shadow-2xl shadow-black/20 dark:shadow-black/40">
                {(pastedImages.length > 0 || files.length > 0) && (
                    <div className="p-2 border-b border-stone-300 dark:border-slate-700/60 space-y-2">
                        {pastedImages.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {pastedImages.map((imageSrc, index) => (
                                    <div key={index} className="relative self-start animate-fade-in">
                                        <img src={imageSrc} alt="Pasted content preview" className="max-h-24 rounded-lg border border-stone-400 dark:border-slate-600" />
                                        <button type="button" onClick={() => setPastedImages(prev => prev.filter((_, i) => i !== index))} className="absolute -top-1.5 -right-1.5 bg-slate-600 hover:bg-slate-800 text-white rounded-full h-5 w-5 flex items-center justify-center transition-colors" aria-label={`Remove pasted image ${index + 1}`}>
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {files.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {files.map(file => (
                                    <div key={file.path} className="flex items-center gap-1.5 bg-stone-300 dark:bg-slate-700/80 pl-2 pr-1 py-1 rounded-full text-xs animate-fade-in">
                                        {getFileIcon(file.name)}
                                        <span className="font-mono text-stone-700 dark:text-slate-300 truncate max-w-xs">{file.path}</span>
                                        <button type="button" onClick={() => handleRemoveFile(file.path)} className="flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-stone-500 dark:text-slate-400 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors" aria-label={`移除 ${file.path}`}><XIcon className="h-3 w-3"/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div className="flex items-end gap-2">
                    <input ref={fileInputRef} type="file" multiple onChange={handleFilesChange} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-stone-600 dark:text-slate-400 hover:text-[var(--accent-color)] hover:bg-stone-300/50 dark:hover:bg-slate-700/50 rounded-lg transition-all flex-shrink-0 transform-gpu hover:scale-110 active:scale-95" aria-label="附加檔案">
                        <PaperclipIcon className="h-6 w-6" />
                    </button>
                    <textarea ref={textareaRef} className="w-full bg-transparent text-stone-900 dark:text-slate-200 placeholder-stone-500 dark:placeholder-slate-500 focus:outline-none resize-none max-h-40 custom-scrollbar focus:ring-2 focus:ring-[var(--accent-color)] rounded-md py-1" rows={1} placeholder="補充說明、貼上圖片或提出具體問題..." value={message} onChange={(e) => setMessage(e.target.value)} onPaste={onPaste} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} />
                    <div className="flex-shrink-0 text-xs text-stone-500 dark:text-slate-500 flex items-center gap-1.5">
                        <TokenDisplay isCounting={isCountingTokens} tokenCount={inputTokenCount} />
                    </div>
                    <button type="submit" disabled={isSubmitting || (files.length === 0 && !message.trim() && pastedImages.length === 0)} className="relative overflow-hidden p-2 accent-gradient-bg text-white font-bold rounded-lg transition-all transform hover:scale-110 disabled:from-stone-400 dark:disabled:from-slate-700 disabled:to-stone-300 dark:disabled:to-slate-600 disabled:text-stone-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0 before:absolute before:inset-0 before:bg-white/20 dark:before:bg-black/20 before:transition-opacity before:opacity-0 hover:before:opacity-100 before:duration-300 before:ease-in-out before:rounded-lg" aria-label="追問大師">
                        <SendIcon className="h-6 w-6 relative z-10" />
                    </button>
                </div>
            </form>
        </div>
    );
};