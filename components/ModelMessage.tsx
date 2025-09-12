import React, { useMemo, useState, useCallback } from 'react';
import { SafeMarkdown } from './SafeMarkdown';
import { CodeBlock } from './CodeBlock';
import { CopyIcon, CheckIcon, MasterIcon, DownloadIcon, SpinnerIcon } from './icons';
import { AnimatedMessage } from './AnimatedMessage';
import { DEFAULT_LOADING_MESSAGES } from './constants';
import { zipAndDownloadFiles } from '../utils';
import { parseDiffs, applyPatch } from '../utils/patch';
import type { AppFile, ChatMessage } from '../types';

declare global {
    interface Window {
        JSZip: any;
    }
}

export const ModelMessage: React.FC<{
    text: string,
    isStreaming: boolean,
    previousUserMessage?: ChatMessage
}> = ({ text, isStreaming, previousUserMessage }) => {
    const [copiedStates, setCopiedStates] = useState<Record<number, boolean>>({});
    const [isProcessingDownload, setIsProcessingDownload] = useState(false);

    const diffs = useMemo(() => parseDiffs(text), [text]);

    const handleCopyCode = useCallback((contentToCopy: string, index: number) => {
        navigator.clipboard.writeText(contentToCopy).then(() => {
            setCopiedStates(prev => ({ ...prev, [index]: true }));
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [index]: false }));
            }, 2000);
        });
    }, []);
    
    const handleDownloadPatchedFiles = async () => {
        if (!previousUserMessage?.files || diffs.length === 0 || !window.JSZip) return;
        
        setIsProcessingDownload(true);
        try {
            const originalFilesMap = new Map(previousUserMessage.files.map(f => [f.path, f.content]));
            const patchedFiles: AppFile[] = [];

            for (const diff of diffs) {
                const originalContent = originalFilesMap.get(diff.filename);
                if (originalContent) {
                    const newContent = applyPatch(originalContent, diff.patch);
                    patchedFiles.push({
                        name: diff.filename.split('/').pop() || diff.filename,
                        path: diff.filename,
                        content: newContent
                    });
                } else {
                    console.warn(`Original file not found for patch: ${diff.filename}`);
                }
            }

            if (patchedFiles.length > 0) {
                await zipAndDownloadFiles(patchedFiles, 'ai-patched-files.zip');
            } else {
                console.error("No files could be patched because original files were not found.");
            }
        } catch (error) {
            console.error("Failed to create zip file:", error);
        } finally {
            setIsProcessingDownload(false);
        }
    };

    const parts = useMemo(() => {
        // This splits the text into code blocks and markdown parts.
        return text.split(/(```[\s\S]*?```)/g).filter(Boolean);
    }, [text]);
        
    const renderedReview = useMemo(() => {
        return parts.map((part, index) => {
            // Use a more stable key for list items to avoid re-mounting during streaming.
            const stableKey = `${index}-${part.substring(0, 20)}`;
            if (part.startsWith('```')) {
                const codeBlock = part.replace(/^```(\w*)\n/, '```\n').replace(/```/g, '');
                const langMatch = part.match(/^```(\w*)/);
                const lang = langMatch ? langMatch[1] : 'plaintext';
                const code = codeBlock.substring(1); // remove initial newline
                return (
                    <div key={stableKey} className="relative group my-4 bg-stone-200/50 dark:bg-slate-900/70 rounded-lg border border-stone-300 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-1.5 bg-stone-300/60 dark:bg-slate-800/70 border-b border-stone-300 dark:border-slate-800">
                            <span className="text-xs text-stone-600 dark:text-slate-400 font-mono">{lang}</span>
                             <button
                                onClick={() => handleCopyCode(code, index)}
                                className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-slate-400 hover:text-[var(--accent-color)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md"
                            >
                                {copiedStates[index] ? (
                                    <><CheckIcon className="h-4 w-4 text-green-500" /><span>已複製!</span></>
                                ) : (
                                    <><CopyIcon className="h-4 w-4" /><span>複製</span></>
                                )}
                            </button>
                        </div>
                        <CodeBlock code={code} lang={lang} isStreaming={isStreaming} />
                    </div>
                )
            }
            // Pass streaming status to SafeMarkdown
            return <SafeMarkdown key={stableKey} text={part} isStreaming={isStreaming} />;
        });
    }, [parts, isStreaming, handleCopyCode]);

    if (text.length === 0 && isStreaming) {
        return (
            <div className="flex items-center gap-3">
                <MasterIcon className="h-6 w-6 text-[var(--accent-color)] animate-spin-slow flex-shrink-0" style={{ animationDuration: '3s' }}/>
                <div className="flex-1 min-w-0">
                    <AnimatedMessage 
                        messages={DEFAULT_LOADING_MESSAGES} 
                        className="text-base font-medium bg-clip-text text-transparent bg-gradient-to-r from-stone-600 via-stone-400 to-stone-600 dark:from-slate-300 dark:via-slate-500 dark:to-slate-300 bg-[length:200%_auto] animate-text-shimmer"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="prose prose-invert max-w-none text-stone-700 dark:text-slate-300 leading-relaxed">
            {renderedReview}
            {diffs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-300 dark:border-slate-700/50">
                    <button
                        onClick={handleDownloadPatchedFiles}
                        disabled={isProcessingDownload}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 accent-gradient-bg text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:shadow-[var(--accent-color)]/20 transition-all transform hover:-translate-y-px active:scale-[0.98] disabled:from-stone-400 dark:disabled:from-slate-700 disabled:to-stone-300 dark:disabled:to-slate-600 disabled:text-stone-600 dark:disabled:text-slate-400 disabled:cursor-wait"
                    >
                        {isProcessingDownload ? (
                            <SpinnerIcon className="h-5 w-5 animate-spin" />
                        ) : (
                            <DownloadIcon className="h-5 w-5" />
                        )}
                        <span>{isProcessingDownload ? '正在打包...' : '下載已修補的檔案'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};