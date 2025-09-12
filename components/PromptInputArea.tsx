import React from 'react';
import { XIcon } from './icons';
import { handleImagePaste } from '../utils';
import { TokenDisplay } from './TokenDisplay';

interface PromptInputAreaProps {
    userMessage: string;
    setUserMessage: (message: string) => void;
    pastedImages: string[];
    setPastedImages: (images: string[]) => void;
    isCountingTokens: boolean;
    inputTokenCount: number | null;
    placeholder: string;
}

export const PromptInputArea: React.FC<PromptInputAreaProps> = (props) => {
    
    const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        handleImagePaste(e, newImages => {
            props.setPastedImages([...props.pastedImages, ...newImages]);
        });
    };

    return (
        <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-slate-200 mb-4 flex items-center gap-3">
                <span className="bg-stone-500 dark:bg-slate-600 text-white rounded-full h-7 w-7 flex items-center justify-center font-bold text-base flex-shrink-0">3</span>
                <span>補充說明 (選填)</span>
            </h3>
            <div className="relative">
                {props.pastedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {props.pastedImages.map((imageSrc, index) => (
                             <div key={index} className="relative self-start animate-fade-in">
                                <img src={imageSrc} alt={`Pasted content ${index + 1}`} className="max-h-32 rounded-lg border-2 border-[var(--accent-color)] shadow-md" />
                                <button 
                                    type="button" 
                                    onClick={() => props.setPastedImages(props.pastedImages.filter((_, i) => i !== index))} 
                                    className="absolute -top-2 -right-2 bg-slate-600 hover:bg-slate-800 text-white rounded-full h-6 w-6 flex items-center justify-center transition-colors shadow-lg" 
                                    aria-label={`Remove pasted image ${index + 1}`}>
                                        <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <textarea className="w-full p-3 bg-stone-200 dark:bg-slate-800/60 border-2 border-stone-300 dark:border-slate-700 rounded-lg text-stone-800 dark:text-slate-200 focus:border-[var(--accent-color)] outline-none transition custom-scrollbar" rows={4} placeholder={props.placeholder} value={props.userMessage} onChange={(e) => props.setUserMessage(e.target.value)} onPaste={onPaste} />
                <div className="absolute bottom-3 right-3 text-xs text-stone-500 dark:text-slate-500 flex items-center gap-1.5">
                    <TokenDisplay isCounting={props.isCountingTokens} tokenCount={props.inputTokenCount} />
                </div>
            </div>
        </div>
    );
};