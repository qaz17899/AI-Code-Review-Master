import React from 'react';

export const ScopingLoader: React.FC<{text: string}> = ({ text }) => (
    <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full"></div>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{text}</span>
        </div>
    </div>
);
