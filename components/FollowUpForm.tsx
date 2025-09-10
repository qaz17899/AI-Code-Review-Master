import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PaperclipIcon, SendIcon, XIcon, TokenIcon } from './icons';
import type { AppFile, ApiSettings } from '../types';
import { countInputTokens } from '../services/aiService';
import { readFile, handleImagePaste } from '../utils';
import { getFileIcon } from '../utils/fileTree';

export const FollowUpForm: React.FC<{
    onFollowUp: (files: AppFile[], message: string, images: string[]) => Promise<void>;
    isSubmitting: boolean;
    onReadyForDrop: (handler: (files: FileList | File[]) => void) => void;
    // FIX: Retrieve provider from active conversation to correctly dispatch token counting.
    provider: ApiSettings['defaultProvider'];
    settings: ApiSettings;
}> = ({ onFollowUp, isSubmitting, onReadyForDrop, provider, settings }) => {
    const [files, setFiles] = useState<AppFile[]>([]);
    const [message, setMessage] = useState('');
    const [pastedImages, setPastedImages] = useState<string[]>([]);
    const [inputTokenCount, setInputTokenCount] = useState<number | null>(null);
    const [isCountingTokens, setIsCountingTokens] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [message, pastedImages]);

    // Debounced token counting
    useEffect(() => {
        const handler = setTimeout(async () => {
            const hasInput = files.length > 0 || pastedImages.length > 0 || message.trim();
            if (!hasInput) {
                setInputTokenCount(null);
                return;
            }
            setIsCountingTokens(true);
            try {
                const count = await countInputTokens(provider, files, message, pastedImages, settings);
                setInputTokenCount(count);
            } catch (error) {
                console.error("Error counting tokens for follow-up:", error);
                setInputTokenCount(null);
            } finally {
                setIsCountingTokens(false);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [files, message, pastedImages, settings, provider]);

    const processAndSetFiles = useCallback(async (fileList: FileList | File[]) => {
        const selectedFiles = Array.from(fileList);
        if (selectedFiles.length === 0) return;
        try {
            const newAppFiles = await Promise.all(
                selectedFiles.map(file => readFile({ file, path: (file as any).webkitRelativePath || file.name }))
            );
            setFiles(prevFiles => {
                const newUniqueFiles = newAppFiles.filter(nf => !prevFiles.some(pf => pf.path === nf.path));
                return [...prevFiles, ...newUniqueFiles];
            });
            textareaRef.current?.focus();
        } catch (error) {
            console.error("Error reading follow-up files:", error);
        }
    }, []);

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
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-stone-600 dark:text-slate-400 hover:text-[var(--accent-color)] hover:bg-stone-300/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0" aria-label="附加檔案">
                        <PaperclipIcon className="h-6 w-6" />
                    </button>
                    <textarea ref={textareaRef} className="w-full bg-transparent text-stone-900 dark:text-slate-200 placeholder-stone-500 dark:placeholder-slate-500 focus:outline-none resize-none max-h-40 custom-scrollbar" rows={1} placeholder="補充說明、貼上圖片或提出具體問題..." value={message} onChange={(e) => setMessage(e.target.value)} onPaste={onPaste} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} />
                    <div className="flex-shrink-0 text-xs text-stone-500 dark:text-slate-500 flex items-center gap-1.5">
                        {isCountingTokens ? (
                             <div className="animate-spin h-3 w-3 border-2 border-stone-500 border-t-transparent rounded-full"></div>
                        ) : inputTokenCount !== null ? (
                            <div key={inputTokenCount} className="flex items-center gap-1.5 animate-fade-in" style={{ animationDuration: '300ms' }}>
                                <TokenIcon className="h-3 w-3" />
                                <span>{inputTokenCount.toLocaleString()} Tokens</span>
                            </div>
                        ) : null}
                    </div>
                    <button type="submit" disabled={isSubmitting || (files.length === 0 && !message.trim() && pastedImages.length === 0)} className="relative overflow-hidden p-2 accent-gradient-bg text-white font-bold rounded-lg transition-all transform hover:scale-110 disabled:from-stone-400 dark:disabled:from-slate-700 disabled:to-stone-300 dark:disabled:to-slate-600 disabled:text-stone-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0 before:absolute before:inset-0 before:bg-black/15 dark:before:bg-black/20 before:transition-opacity hover:before:opacity-0 before:rounded-lg" aria-label="追問大師">
                        <SendIcon className="h-6 w-6 relative z-10" />
                    </button>
                </div>
            </form>
        </div>
    );
};
