import React from 'react';

const parseInline = (text: string): React.ReactNode[] => {
  const segments = text.split(/(\*\*.*?\*\*|\*.*?\*|`[^`]+`)/g);
  return segments.map((segment, i) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={i} className="font-bold text-stone-950 dark:text-slate-100">{segment.slice(2, -2)}</strong>;
    }
    if (segment.startsWith('*') && segment.endsWith('*')) {
      return <em key={i}>{segment.slice(1, -1)}</em>;
    }
    if (segment.startsWith('`') && segment.endsWith('`')) {
      return <code key={i} className="bg-stone-300 dark:bg-slate-700/80 text-[var(--accent-color)] font-mono text-sm px-1.5 py-0.5 rounded-md mx-0.5">{segment.slice(1, -1)}</code>;
    }
    return segment;
  }).filter(Boolean);
};

export const SafeMarkdown: React.FC<{ text: string; }> = ({ text }) => {
    const elements = React.useMemo(() => {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let currentListItems: React.ReactElement[] = [];
        let currentParagraphLines: string[] = [];
        const keyPrefix = Math.random().toString(36).substring(7);

        const flushParagraph = () => {
            if (currentParagraphLines.length > 0) {
                const content = currentParagraphLines.join(' ').trim();
                if (content) {
                    elements.push(
                        <p key={`p-${elements.length}-${keyPrefix}`} className="my-2 text-stone-700 dark:text-slate-300 leading-loose">
                           {parseInline(content)}
                        </p>
                    );
                }
                currentParagraphLines = [];
            }
        };

        const flushList = () => {
            if (currentListItems.length > 0) {
                elements.push(
                    <ul key={`ul-${elements.length}-${keyPrefix}`} className="list-disc pl-5 my-2 space-y-1">
                        {currentListItems}
                    </ul>
                );
                currentListItems = [];
            }
        };
        
        const flushAll = () => {
            flushParagraph();
            flushList();
        };

        lines.forEach((line, index) => {
            const key = `${keyPrefix}-${index}`;
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('## ')) {
                flushAll();
                elements.push(<h2 key={key} className="text-2xl font-bold mt-6 mb-3 text-stone-900 dark:text-slate-100 border-b-2 border-transparent pb-2 [border-image:linear-gradient(to_right,var(--accent-color),transparent)_1]">{parseInline(trimmedLine.substring(3))}</h2>);
            } else if (trimmedLine.startsWith('### ')) {
                flushAll();
                elements.push(<h3 key={key} className="text-xl font-bold mt-4 mb-1 text-[var(--accent-color)]">{parseInline(trimmedLine.substring(4))}</h3>);
            } else if (trimmedLine.startsWith('#### ')) {
                flushAll();
                elements.push(<h4 key={key} className="text-lg font-bold mt-3 mb-1 text-stone-800 dark:text-slate-300">{parseInline(trimmedLine.substring(5))}</h4>);
            } else if (trimmedLine.startsWith('* ')) {
                flushParagraph();
                currentListItems.push(<li key={key} className="text-stone-700 dark:text-slate-300">{parseInline(trimmedLine.substring(2))}</li>);
            } else if (trimmedLine === '') {
                flushAll();
            } else {
                flushList();
                currentParagraphLines.push(line);
            }
        });

        flushAll();

        return elements;
    }, [text]);

    return <>{elements}</>;
};