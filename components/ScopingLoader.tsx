import React from 'react';
import { SpinnerIcon } from './icons';

export const ScopingLoader: React.FC<{text: string}> = ({ text }) => (
    <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="flex items-center gap-3">
            <SpinnerIcon className="h-5 w-5 animate-spin text-amber-500" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">{text}</span>
        </div>
    </div>
);