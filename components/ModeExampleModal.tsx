import React from 'react';
import { XIcon, MasterIcon, UserIcon } from './icons';
import type { ReviewMode } from '../types';
import { MODE_DESCRIPTIONS, MODE_EXAMPLES, getModeIcon } from './ModeIcons';
import { ModelMessage } from './ModelMessage';

interface ModeExampleModalProps {
  mode: ReviewMode | null;
  onClose: () => void;
}

export const ModeExampleModal: React.FC<ModeExampleModalProps> = ({ mode, onClose }) => {
  if (!mode) return null;

  const example = MODE_EXAMPLES[mode];
  const description = MODE_DESCRIPTIONS[mode];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in" 
      style={{ animationDuration: '200ms' }}
      onClick={onClose}
    >
      <div 
        className="bg-stone-50 dark:bg-[#111827] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-stone-400 dark:border-slate-700" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-start p-4 border-b border-stone-300 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            {getModeIcon(mode, 'h-8 w-8 text-[var(--accent-color)] flex-shrink-0')}
            <div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-slate-100">{example.title}</h2>
                <p className="text-sm text-stone-600 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-stone-600 hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="h-6 w-6" />
          </button>
        </header>
        <main className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <UserIcon className="h-5 w-5 text-stone-600 dark:text-slate-400"/>
                    <h3 className="font-semibold text-stone-800 dark:text-slate-300">用戶提問範例</h3>
                </div>
                <div className="text-sm text-stone-700 dark:text-slate-400 p-3 bg-stone-200 dark:bg-slate-800/50 rounded-md border border-stone-300 dark:border-slate-700 whitespace-pre-wrap font-mono">
                    {example.prompt}
                </div>
            </div>
             <div>
                <div className="flex items-center gap-2 mb-2">
                    <MasterIcon className="h-5 w-5 text-[var(--accent-color)]"/>
                    <h3 className="font-semibold text-stone-800 dark:text-slate-300">大師回覆範例</h3>
                </div>
                <div className="p-3 bg-stone-200 dark:bg-slate-800/50 rounded-md border border-stone-300 dark:border-slate-700">
                    <ModelMessage text={example.response} isStreaming={false} />
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};