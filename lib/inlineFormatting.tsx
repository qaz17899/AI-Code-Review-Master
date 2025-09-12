import React from 'react';

export const processInlineFormatting = (line: string): React.ReactNode[] => {
    // Splits text by bold, italic, and code segments to apply JSX styling.
    const parts = line.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-stone-950 dark:text-slate-100">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-stone-300 dark:bg-slate-700/80 text-[var(--accent-color)] font-mono text-sm px-1.5 py-0.5 rounded-md mx-0.5">{part.slice(1, -1)}</code>;
        }
        return part;
    }).filter(Boolean); // Filter out empty strings from split
};
