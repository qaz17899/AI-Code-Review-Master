import React, { useState, useCallback, useRef, useEffect } from 'react';
// FIX: Added UploadIcon to imports as it is used for the drag-and-drop overlay.
import { CopyIcon, CheckIcon, UserIcon, MasterIcon, TrashIcon, SparklesIcon, TokenIcon, ChevronDownIcon, RefactorIcon, StopIcon, ClockIcon, UploadIcon } from './icons';
import type { ChatMessage, AppFile, ApiSettings } from '../types';
import { ImageModal } from './ImageModal';
import { explainResponse, generateExplanationStream } from '../services/geminiService';
import { FollowUpForm } from './FollowUpForm';
import { ModelMessage } from './ModelMessage';
import { ExplanationDisplay } from './ExplanationDisplay';
import { SubmittedFileTree } from './SubmittedFileTree';
import { useConversation } from '../contexts/ConversationContext';

interface ResultDisplayProps {
  history: ChatMessage[];
  onFollowUp: (files: AppFile[], message: string, images: string[]) => Promise<void>;
  isSubmitting: boolean;
  onDeleteFromTurn: (index: number) => void;
  onRegenerate: () => Promise<void>;
  onStopGeneration: () => void;
  settings: ApiSettings;
}

const MessageToolbar: React.FC<{
    isCopied: boolean;
    onCopy?: () => void;
    onExplain?: () => void;
    onDelete: () => void;
}> = ({ isCopied, onCopy, onExplain, onDelete }) => (
    <div className="flex flex-col gap-1 p-1.5 rounded-full bg-stone-200/50 dark:bg-slate-800/50 backdrop-blur-md border border-stone-300/80 dark:border-slate-700/80 shadow-lg">
        {onCopy && (
             <div className="relative group/item flex justify-center">
                <button onClick={onCopy} aria-label="複製內容" className="p-2 rounded-full text-stone-500 dark:text-slate-400 hover:bg-stone-300/60 dark:hover:bg-slate-700/60 transition-colors transform hover:scale-110">
                    {isCopied ? <CheckIcon className="h-5 w-5 text-green-500" /> : <CopyIcon className="h-5 w-5" />}
                </button>
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-slate-800 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover/item:opacity-100 transition-opacity delay-300 pointer-events-none whitespace-nowrap">
                    {isCopied ? '已複製!' : '複製內容'}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
            </div>
        )}
        {onExplain && (
            <div className="relative group/item flex justify-center">
                <button onClick={onExplain} aria-label="AI 導師解說" className="p-2 rounded-full text-stone-500 dark:text-slate-400 hover:bg-stone-300/60 dark:hover:bg-slate-700/60 transition-colors transform hover:scale-110">
                    <SparklesIcon className="h-5 w-5" />
                </button>
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-slate-800 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover/item:opacity-100 transition-opacity delay-300 pointer-events-none whitespace-nowrap">
                    AI 導師解說
                    <div className="absolute left-full top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
            </div>
        )}
        <div className="relative group/item flex justify-center">
            <button onClick={onDelete} aria-label="刪除此處及之後的對話" className="p-2 rounded-full text-stone-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors transform hover:scale-110">
                <TrashIcon className="h-5 w-5" />
            </button>
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-slate-800 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover/item:opacity-100 transition-opacity delay-300 pointer-events-none whitespace-nowrap">
                刪除對話
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
            </div>
        </div>
    </div>
);


export const ResultDisplay: React.FC<ResultDisplayProps> = ({ history, onFollowUp, isSubmitting, onDeleteFromTurn, onRegenerate, onStopGeneration, settings }) => {
    const { activeConversation } = useConversation();
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [explanationState, setExplanationState] = useState<Record<number, {
        isLoading: boolean;
        content: string | null;
        error: string | null;
        followUpHistory: Array<{ role: 'user' | 'model', content: string }>;
        isGeneratingFollowUp: boolean;
        followUpError: string | null;
        isExpanded: boolean;
    }>>({});
    
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);
    const [toolbarStyle, setToolbarStyle] = useState<React.CSSProperties>({
        opacity: 0,
        pointerEvents: 'none',
        position: 'fixed',
        top: '50%',
        transform: 'translateY(-50%)',
        transition: 'opacity 0.2s ease-in-out',
        zIndex: 20,
    });
    
    const dropHandlerRef = useRef<((files: FileList | File[]) => void) | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef(new Map<number, HTMLDivElement>());
    // FIX: Replaced `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` for browser compatibility.
    const hideToolbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userInterruptedScroll = useRef(false);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const handleShowToolbar = (index: number) => {
        if (hideToolbarTimeoutRef.current) {
            clearTimeout(hideToolbarTimeoutRef.current);
            hideToolbarTimeoutRef.current = null;
        }
        setHoveredMessageIndex(index);
    };

    const handleHideToolbar = () => {
        hideToolbarTimeoutRef.current = setTimeout(() => {
            setHoveredMessageIndex(null);
        }, 300);
    };

    // Effect to update toolbar position based on container resize
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const updatePosition = () => {
             if (container) {
                const rect = container.getBoundingClientRect();
                setToolbarStyle(prev => ({
                    ...prev,
                    left: `${rect.right + 12}px`,
                }));
            }
        };
        updatePosition();
        const observer = new ResizeObserver(updatePosition);
        observer.observe(document.body);
        return () => observer.disconnect();
    }, []);

    // Effect to update toolbar visibility based on hover state
    useEffect(() => {
        setToolbarStyle(prev => ({
            ...prev,
            opacity: hoveredMessageIndex !== null ? 1 : 0,
            pointerEvents: hoveredMessageIndex !== null ? 'auto' : 'none',
        }));
    }, [hoveredMessageIndex]);

    const isNearBottom = (el: HTMLElement): boolean => {
        const threshold = 150;
        return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    };

    React.useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (container && !userInterruptedScroll.current) {
            container.scrollTop = container.scrollHeight;
        }
    }, [history, explanationState]);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (isNearBottom(container)) {
            userInterruptedScroll.current = false;
            setShowScrollButton(false);
        } else {
            userInterruptedScroll.current = true;
            setShowScrollButton(true);
        }
    }, []);

    const scrollToBottom = () => {
        const container = scrollContainerRef.current;
        if (container) {
            userInterruptedScroll.current = false;
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth',
            });
        }
    };

    const handleCopy = (content: string, index: number) => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setCopiedIndex(index);
        setTimeout(() => {
            setCopiedIndex(null);
        }, 1500);
    };

    const handleReadyForDrop = useCallback((handler: (files: FileList | File[]) => void) => {
        dropHandlerRef.current = handler;
    }, []);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };
    
    const handleDragLeave = () => setIsDraggingOver(false);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (dropHandlerRef.current && e.dataTransfer.files.length > 0) {
            dropHandlerRef.current(e.dataTransfer.files);
        }
    };
    
    const handleGenerateExplanation = async (index: number) => {
        const message = history[index]?.content;
        if (!message) return;

        setExplanationState(prev => ({ ...prev, [index]: { isLoading: true, content: null, error: null, followUpHistory: [], isGeneratingFollowUp: false, followUpError: null, isExpanded: true } }));

        try {
            const explanation = await explainResponse(message, settings);
            setExplanationState(prev => ({ ...prev, [index]: { ...prev[index], isLoading: false, content: explanation } }));
        } catch (err) {
            const error = err instanceof Error ? err.message : "Unknown error";
            setExplanationState(prev => ({ ...prev, [index]: { ...prev[index], isLoading: false, error } }));
        }
    };

    const handleAskFollowUp = async (index: number, question: string) => {
        const state = explanationState[index];
        if (!state || !state.content) return;

        const newHistory = [...state.followUpHistory, { role: 'user' as const, content: question }, { role: 'model' as const, content: '' }];
        setExplanationState(prev => ({ ...prev, [index]: { ...prev[index], followUpHistory: newHistory, isGeneratingFollowUp: true, followUpError: null } }));

        try {
            const originalResponse = history[index].content;
            const stream = generateExplanationStream(originalResponse, state.content, state.followUpHistory, question, settings);

            let finalContent = '';
            for await (const chunk of stream) {
                finalContent += chunk;
                setExplanationState(prev => {
                    const current = { ...prev };
                    const currentHistory = [...current[index].followUpHistory];
                    currentHistory[currentHistory.length - 1] = { role: 'model', content: finalContent };
                    current[index] = { ...current[index], followUpHistory: currentHistory };
                    return current;
                });
            }
        } catch (err) {
             const error = err instanceof Error ? err.message : "Unknown error";
             setExplanationState(prev => ({ ...prev, [index]: { ...prev[index], followUpError: error } }));
        } finally {
            setExplanationState(prev => ({ ...prev, [index]: { ...prev[index], isGeneratingFollowUp: false } }));
        }
    };

    const toggleExplanation = (index: number) => {
        if (!explanationState[index]) {
            handleGenerateExplanation(index);
        } else {
            setExplanationState(prev => ({ ...prev, [index]: { ...prev[index], isExpanded: !prev[index].isExpanded } }));
        }
    };
    
    const deleteExplanation = (index: number) => {
        setExplanationState(prev => {
            const newState = {...prev};
            delete newState[index];
            return newState;
        });
    }

    const lastMessage = history.length > 0 ? history[history.length - 1] : null;
    const lastModelMessageWithMetadata = (lastMessage && lastMessage.role === 'model' && lastMessage.usageMetadata) ? lastMessage : null;

    const hoveredMessage = hoveredMessageIndex !== null ? history[hoveredMessageIndex] : null;
    const isCopied = copiedIndex === hoveredMessageIndex;

    return (
        <div className="h-full flex flex-col" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <ImageModal imageUrl={viewingImage} onClose={() => setViewingImage(null)} />

            <div 
                style={toolbarStyle}
                onMouseEnter={() => handleShowToolbar(hoveredMessageIndex!)}
                onMouseLeave={handleHideToolbar}
            >
                {hoveredMessage && hoveredMessageIndex !== null && (
                    <MessageToolbar
                        isCopied={isCopied}
                        onCopy={
                            (hoveredMessage.role === 'user' && !hoveredMessage.content)
                                ? undefined
                                : () => handleCopy(hoveredMessage.content, hoveredMessageIndex)
                        }
                        onExplain={hoveredMessage.role === 'model' ? () => toggleExplanation(hoveredMessageIndex) : undefined}
                        onDelete={() => onDeleteFromTurn(hoveredMessageIndex)}
                    />
                )}
            </div>

            <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-grow overflow-y-auto custom-scrollbar relative">
                <div ref={messagesContainerRef} className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
                    {history.map((msg, index) => {
                        const isLastMessage = index === history.length - 1;

                        if (msg.role === 'model') {
                            const prevUserMessage = index > 0 && history[index - 1].role === 'user' ? history[index - 1] : undefined;
                            return (
                                <div key={index} ref={el => { if (el) messageRefs.current.set(index, el); }} className="animate-fade-in-up" onMouseEnter={() => handleShowToolbar(index)} onMouseLeave={handleHideToolbar}>
                                    <div className="flex items-start gap-4">
                                        <MasterIcon className="h-8 w-8 text-[var(--accent-color)] flex-shrink-0 mt-1" />
                                        <div className="flex-grow min-w-0 relative">
                                            <div className="bg-stone-100/60 dark:bg-slate-900/60 p-4 rounded-lg border border-stone-300 dark:border-slate-800/50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className="font-bold text-stone-800 dark:text-slate-200">AI Code Review Master</h3>
                                                </div>
                                                <ModelMessage 
                                                  text={msg.content} 
                                                  isStreaming={isLastMessage && isSubmitting}
                                                  previousUserMessage={prevUserMessage}
                                                />
                                                <ExplanationDisplay 
                                                    state={explanationState[index]}
                                                    onAskFollowUp={(question) => handleAskFollowUp(index, question)}
                                                    onToggle={() => toggleExplanation(index)}
                                                    onDelete={() => deleteExplanation(index)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        
                        return (
                             <div key={index} ref={el => { if (el) messageRefs.current.set(index, el); }} className="animate-fade-in-up" onMouseEnter={() => handleShowToolbar(index)} onMouseLeave={handleHideToolbar}>
                                <div className="flex items-start gap-4">
                                    <div className="h-8 w-8 rounded-full bg-stone-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                                        <UserIcon className="h-5 w-5 text-stone-600 dark:text-slate-400" />
                                    </div>
                                    <div className="flex-grow min-w-0 relative">
                                        <div className="bg-stone-100/60 dark:bg-slate-900/60 p-4 rounded-lg border border-stone-300 dark:border-slate-800/50">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-bold text-stone-800 dark:text-slate-200">You</h3>
                                            </div>
                                            <div className="space-y-4">
                                                {msg.content && <p className="text-stone-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                                {msg.images && msg.images.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {msg.images.map((img, i) => (
                                                            <img key={i} src={img} alt={`submitted content ${i}`} className="max-h-48 rounded-md cursor-pointer border border-stone-300 dark:border-slate-700" onClick={() => setViewingImage(img)} />
                                                        ))}
                                                    </div>
                                                )}
                                                {msg.files && msg.files.length > 0 && <SubmittedFileTree files={msg.files} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {!isSubmitting && history.length > 0 && (
                        <div className="flex justify-center animate-fade-in">
                            <button onClick={onRegenerate} className="group flex items-center gap-2 px-4 py-1.5 bg-stone-200/50 dark:bg-slate-800/50 text-stone-600 dark:text-slate-400 border border-stone-400/50 dark:border-slate-700/50 rounded-full hover:border-[var(--accent-color)]/50 hover:bg-stone-300/50 dark:hover:bg-slate-800 transition-all duration-200 text-sm font-semibold">
                                <RefactorIcon className="h-4 w-4 transition-colors group-hover:text-[var(--accent-color)]" />
                                重新生成
                            </button>
                        </div>
                    )}
                     <div ref={messagesEndRef} className="h-px" />
                </div>
                {showScrollButton && (
                    <div className="absolute bottom-4 right-1/2 translate-x-1/2">
                        <button onClick={scrollToBottom} className="p-2 rounded-full bg-stone-100/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg border border-stone-300 dark:border-slate-700 text-stone-600 dark:text-slate-400 hover:scale-110 transition-transform animate-fade-in">
                            <ChevronDownIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}
                 {isDraggingOver && (
                    <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 pointer-events-none animate-fade-in" style={{ animationDuration: '150ms' }}>
                        <div className="p-8 border-4 border-dashed border-[var(--accent-color)] rounded-2xl text-center bg-white/5 shadow-2xl shadow-black/50">
                            <UploadIcon className="h-16 w-16 text-[var(--accent-color)] mx-auto mb-4 animate-bounce" style={{ animationDuration: '1.5s' }} />
                            <p className="text-xl font-bold text-white drop-shadow-md">將檔案拖曳至此處以上傳</p>
                            <p className="text-slate-300 drop-shadow-md">放開即可加入至您的下一則訊息</p>
                        </div>
                    </div>
                )}
            </div>
            
            {lastModelMessageWithMetadata && !isSubmitting && (
                <div className="flex-shrink-0 px-6 pb-2 pt-1 animate-fade-in">
                    <div className="flex items-center justify-center gap-x-4 gap-y-1 flex-wrap text-xs text-stone-500 dark:text-slate-500 border-t border-stone-300 dark:border-slate-700/50 pt-2">
                        <div className="flex items-center gap-1" title="Generation Time">
                            <ClockIcon className="h-3.5 w-3.5" />
                            <span>{(lastModelMessageWithMetadata.generationTimeMs! / 1000).toFixed(2)}s</span>
                        </div>
                        <div 
                            className="flex items-center gap-1" 
                            title={`輸入: ${lastModelMessageWithMetadata.usageMetadata.promptTokenCount.toLocaleString()}, 輸出: ${lastModelMessageWithMetadata.usageMetadata.candidatesTokenCount.toLocaleString()}`}
                        >
                            <TokenIcon className="h-3.5 w-3.5" />
                            <span>總計: {lastModelMessageWithMetadata.usageMetadata.totalTokenCount.toLocaleString()} Tokens</span>
                        </div>
                    </div>
                </div>
            )}
            
            <div className={`flex-shrink-0 p-2 sm:p-4 md:px-6 transition-all duration-300 ${isSubmitting || (lastModelMessageWithMetadata && !isSubmitting) ? 'pt-0' : 'pt-2'}`}>
                {isSubmitting ? (
                    <div className="flex justify-center">
                        <button onClick={onStopGeneration} className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-colors text-sm font-semibold">
                            <StopIcon className="h-4 w-4" />
                            停止生成
                        </button>
                    </div>
                ) : (
                    <FollowUpForm onFollowUp={onFollowUp} isSubmitting={isSubmitting} onReadyForDrop={handleReadyForDrop} provider={activeConversation?.provider || 'gemini'} settings={settings} />
                )}
            </div>
        </div>
    );
};
