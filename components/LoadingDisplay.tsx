import React from 'react';
import type { AppFile, ReviewMode } from '../types';
import { MasterIcon } from './icons';
import { DEEP_DIVE_MESSAGES } from './constants';
import { AnimatedMessage } from './AnimatedMessage';
import { MODES } from '../config/modes';

export const LoadingDisplay: React.FC<{ files: AppFile[], mode: ReviewMode }> = ({ files, mode }) => {
  const messages = MODES[mode]?.ui.loadingMessages || DEEP_DIVE_MESSAGES;

  return (
    <main className="w-full h-full flex flex-col items-center justify-center text-center p-4 animate-fade-in bg-transparent">
        <div className="relative mb-8">
            <div className="absolute -inset-4 rounded-full accent-gradient-bg opacity-20 blur-2xl animate-pulse" style={{animationDuration: '4s'}}></div>
            <div className="relative p-4 bg-stone-100/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full shadow-lg">
                <MasterIcon className="h-20 w-20 text-[var(--accent-color)]" />
                <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-color)]/30 animate-ping"></div>
            </div>
        </div>

        <h2 className="text-3xl font-bold text-stone-900 dark:text-slate-100">大師正在深度審查...</h2>
        <p className="text-stone-600 dark:text-slate-400 mt-2 max-w-md">正在為您選擇的 {files.length} 個檔案進行 <span className="font-bold text-[var(--accent-color)]">{mode}</span> 模式分析。請稍候。</p>

        <div className="mt-10 w-full max-w-2xl bg-stone-100/50 dark:bg-slate-900/50 backdrop-blur-lg border border-stone-400 dark:border-slate-800/50 rounded-xl p-6 dark:ring-1 dark:ring-inset dark:ring-white/10 shadow-md">
            <AnimatedMessage messages={messages} files={files.map(f => f.path)} className="text-lg text-stone-700 dark:text-slate-400 h-6" />
        </div>
      
        {files.length > 0 && (
            <div className="mt-6 text-xs text-stone-500 dark:text-slate-500 max-w-2xl w-full text-left">
                <h4 className="font-semibold mb-1 uppercase tracking-wider">分析範圍:</h4>
                <div className="max-h-20 overflow-y-auto custom-scrollbar p-2 bg-stone-200/50 dark:bg-slate-800/40 rounded-md">
                    <p className="font-mono opacity-80 whitespace-pre-wrap leading-relaxed break-all">
                        {files.map(f => f.path).join('\n')}
                    </p>
                </div>
            </div>
        )}
    </main>
  );
};