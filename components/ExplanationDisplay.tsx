import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, UserIcon, SendIcon, ChevronDownIcon, XIcon, SpinnerIcon } from './icons';
import { SafeMarkdown } from './SafeMarkdown';

interface ExplanationDisplayProps {
  state?: {
    isLoading: boolean;
    content: string | null;
    error: string | null;
    followUpHistory: Array<{ role: 'user' | 'model', content: string }>;
    isGeneratingFollowUp: boolean;
    followUpError: string | null;
    suggestedQuestions?: string[];
    isExpanded: boolean;
  };
  onAskFollowUp: (question: string) => void;
  onToggle: () => void;
  onDelete: () => void;
}

export const ExplanationDisplay: React.FC<ExplanationDisplayProps> = ({ state, onAskFollowUp, onToggle, onDelete }) => {
    const [followUpMessage, setFollowUpMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const historyEndRef = useRef<HTMLDivElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [followUpMessage]);

    // Auto-scroll follow-up history
    useEffect(() => {
        if (state?.isExpanded) {
            historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [state?.followUpHistory, state?.isExpanded]);

    if (!state) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!followUpMessage.trim() || state.isGeneratingFollowUp) return;
        onAskFollowUp(followUpMessage);
        setFollowUpMessage('');
    };

    return (
        <div className="mt-4 bg-stone-200/70 dark:bg-slate-800/50 p-4 rounded-lg border border-stone-400 dark:border-slate-700/60 animate-fade-in">
            <div className="flex justify-between items-center cursor-pointer" onClick={onToggle}>
                <h4 className="text-sm font-bold text-[var(--accent-color)] flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5" />
                    AI 導師解說
                </h4>
                <div className="flex items-center gap-1">
                     <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1 rounded-full text-stone-500 hover:text-stone-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-stone-300 dark:hover:bg-slate-700/50 transition-colors"
                        aria-label="刪除解說"
                    >
                        <XIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                        className="p-1 rounded-full text-stone-500 hover:text-stone-700 dark:text-slate-500 dark:hover:text-slate-300"
                        aria-label={state.isExpanded ? "收合解說" : "展開解說"}
                    >
                        <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${state.isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                    </button>
                </div>
            </div>
            
            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${state.isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="mt-3 pt-3 border-t border-stone-300 dark:border-slate-700/60">
                    {state.isLoading && (
                        <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-slate-400">
                            <SpinnerIcon className="h-4 w-4 animate-spin" />
                            <span>正在為您分析...</span>
                        </div>
                    )}
                    {state.error && <p className="text-sm text-red-500 dark:text-red-400">解說失敗: {state.error}</p>}
                    {state.content && (
                        <>
                            <div className="text-sm prose prose-invert max-w-none text-stone-700 dark:text-slate-300 leading-relaxed"><SafeMarkdown text={state.content} isStreaming={state.isLoading} /></div>
                            
                            {/* Follow-up chat history */}
                            <div className="mt-4 pt-4 border-t border-stone-400/70 dark:border-slate-700/60 space-y-4 text-sm">
                                {state.followUpHistory.map((msg, index) => {
                                    const isLast = index === state.followUpHistory.length - 1;
                                    if (msg.role === 'user') {
                                        return (
                                            <div key={index} className="flex items-start gap-2.5 animate-fade-in-up" style={{animationDuration: '300ms'}}>
                                                <UserIcon className="h-4 w-4 text-stone-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                                                <p className="flex-grow text-stone-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            </div>
                                        );
                                    } else { // model
                                        return (
                                            <div key={index} className="flex items-start gap-2.5 animate-fade-in-up" style={{animationDuration: '300ms'}}>
                                                <SparklesIcon className="h-4 w-4 text-[var(--accent-color)] mt-0.5 flex-shrink-0" />
                                                <div className="flex-grow text-stone-700 dark:text-slate-300 prose prose-invert max-w-none text-sm leading-relaxed">
                                                    {msg.content ? <SafeMarkdown text={msg.content} isStreaming={isLast && state.isGeneratingFollowUp} /> : ''}
                                                    {isLast && state.isGeneratingFollowUp && !msg.content && (
                                                        <div className="animate-pulse h-3 bg-stone-400 dark:bg-slate-700 rounded-md w-1/3"></div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                })}
                                <div ref={historyEndRef} />
                            </div>
                            {state.followUpError && <p className="text-xs text-red-500 dark:text-red-400 mt-2">追問失败: {state.followUpError}</p>}
                            
                            {/* NEW: Suggested Questions */}
                            {state.suggestedQuestions && state.suggestedQuestions.length > 0 && !state.isGeneratingFollowUp && (
                                <div className="mt-4 pt-4 border-t border-stone-400/70 dark:border-slate-700/60">
                                    <p className="text-xs font-semibold text-stone-600 dark:text-slate-400 mb-2">您可以接著問：</p>
                                    <div className="flex flex-wrap gap-2">
                                        {state.suggestedQuestions.map((q, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => { setFollowUpMessage(q); handleSubmit({ preventDefault: () => {} } as React.FormEvent); }}
                                                className="px-2.5 py-1 bg-stone-300/80 dark:bg-slate-700/80 text-stone-700 dark:text-slate-300 text-xs rounded-full hover:bg-stone-400/80 dark:hover:bg-slate-700 transition-colors"
                                            >{q}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Follow-up form */}
                            <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-stone-400/70 dark:border-slate-700/60 relative flex items-center gap-2">
                                <textarea
                                    ref={textareaRef}
                                    value={followUpMessage}
                                    onChange={(e) => setFollowUpMessage(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                                    disabled={state.isGeneratingFollowUp}
                                    rows={1}
                                    className="flex-grow bg-stone-300/50 dark:bg-slate-800/60 border border-stone-400 dark:border-slate-700 rounded-lg pl-3 pr-2 py-1.5 text-sm resize-none custom-scrollbar focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition placeholder:text-stone-500 dark:placeholder:text-slate-500 max-h-32"
                                    placeholder="對此解說提出追問..."
                                />
                                <button
                                    type="submit"
                                    disabled={!followUpMessage.trim() || state.isGeneratingFollowUp}
                                    className="p-1.5 rounded-full text-stone-600 dark:text-slate-400 hover:bg-stone-400/80 dark:hover:bg-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform-gpu hover:scale-110 active:scale-95 flex-shrink-0"
                                    aria-label="傳送追問"
                                >
                                    {state.isGeneratingFollowUp 
                                        ? <SpinnerIcon className="h-4 w-4 animate-spin" />
                                        : <SendIcon className="h-4 w-4" />
                                    }
                                </button>
                            </form>
                        </>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};
