import React from 'react';
import { XIcon, TokenIcon } from './icons';

interface PromptInputAreaProps {
    userMessage: string;
    setUserMessage: (message: string) => void;
    pastedImages: string[];
    setPastedImages: (images: string[]) => void;
    isCountingTokens: boolean;
    tokenCount: number | null;
}

export const PromptInputArea: React.FC<PromptInputAreaProps> = (props) => {

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageBlobs: File[] = [];
        for (const item of e.clipboardData.items) {
            if (item.type.includes('image')) {
                const blob = item.getAsFile();
                if (blob) {
                    imageBlobs.push(blob);
                }
            }
        }

        if (imageBlobs.length > 0) {
            e.preventDefault();
            const newImagesPromises = imageBlobs.map(blob => 
                new Promise<string>(resolve => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.readAsDataURL(blob);
                })
            );

            Promise.all(newImagesPromises).then(newImages => {
                props.setPastedImages([...props.pastedImages, ...newImages]);
            });
        }
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
                <textarea className="w-full p-3 bg-stone-200 dark:bg-slate-800/60 border-2 border-stone-300 dark:border-slate-700 rounded-lg text-stone-800 dark:text-slate-200 focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition custom-scrollbar" rows={4} placeholder="例如：請專注於檢查 auth.py 中的安全性問題，或貼上圖片..." value={props.userMessage} onChange={(e) => props.setUserMessage(e.target.value)} onPaste={handlePaste} />
                <div className="absolute bottom-3 right-3 text-xs text-stone-500 dark:text-slate-500 flex items-center gap-1.5">
                    {props.isCountingTokens ? (
                        <div className="animate-spin h-3 w-3 border-2 border-stone-500 border-t-transparent rounded-full"></div>
                    ) : props.tokenCount !== null ? (
                        <div key={props.tokenCount} className="flex items-center gap-1.5 animate-fade-in" style={{ animationDuration: '300ms' }}>
                            <TokenIcon className="h-3 w-3" />
                            <span>{props.tokenCount.toLocaleString()} Tokens</span>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};