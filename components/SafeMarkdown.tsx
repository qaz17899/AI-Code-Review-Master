import React from 'react';
import { processInlineFormatting } from '../lib/inlineFormatting';

const MemoizedSafeMarkdown: React.FC<{ text: string; isStreaming: boolean; }> = ({ text, isStreaming }) => {
    const elements = React.useMemo(() => {
        if (!text) return [];

        const elements: React.ReactNode[] = [];
        let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
        let currentParagraphLines: string[] = [];
        const keyPrefix = Math.random().toString(36).substring(7);

        const flushParagraph = () => {
            if (currentParagraphLines.length > 0) {
                const content = currentParagraphLines.join('\n').trim();
                if (content) {
                    elements.push(
                        <p key={`p-${elements.length}-${keyPrefix}`} className="my-2 text-stone-700 dark:text-slate-300 leading-loose">
                            {processInlineFormatting(content)}
                        </p>
                    );
                }
                currentParagraphLines = [];
            }
        };

        const flushList = () => {
            if (currentList) {
                const ListTag = currentList.type;
                const className = ListTag === 'ul' 
                    ? "list-disc pl-5 my-2 space-y-1" 
                    : "list-decimal pl-5 my-2 space-y-1";
                elements.push(
                    <ListTag key={`${ListTag}-${elements.length}-${keyPrefix}`} className={className}>
                        {currentList.items}
                    </ListTag>
                );
                currentList = null;
            }
        };

        const lines = text.split('\n');

        lines.forEach((line, index) => {
            const key = `${keyPrefix}-${index}`;
            const trimmedLine = line.trim();

            const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
            const unorderedMatch = trimmedLine.match(/^\*\s+(.*)/);
            const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)/);

            if (orderedMatch) {
                flushParagraph();
                if (currentList?.type !== 'ol') {
                    flushList();
                    currentList = { type: 'ol', items: [] };
                }
                currentList.items.push(<li key={key} className="text-stone-700 dark:text-slate-300">{processInlineFormatting(orderedMatch[2])}</li>);
            } else if (unorderedMatch) {
                flushParagraph();
                if (currentList?.type !== 'ul') {
                    flushList();
                    currentList = { type: 'ul', items: [] };
                }
                currentList.items.push(<li key={key} className="text-stone-700 dark:text-slate-300">{processInlineFormatting(unorderedMatch[1])}</li>);
            } else {
                flushList(); // Any non-list line flushes the list.

                if (headingMatch) {
                    flushParagraph();
                    const level = headingMatch[1].length;
                    const content = processInlineFormatting(headingMatch[2]);
                    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
                    const styles = [
                        "text-3xl font-bold mt-8 mb-4 text-stone-950 dark:text-slate-50 border-b-2 border-stone-300 dark:border-slate-700 pb-2",
                        "text-2xl font-bold mt-6 mb-3 text-stone-900 dark:text-slate-100 border-b-2 border-transparent pb-2 [border-image:linear-gradient(to_right,var(--accent-color),transparent)_1]",
                        "text-xl font-bold mt-4 mb-1 text-[var(--accent-color)]",
                        "text-lg font-bold mt-3 mb-1 text-stone-800 dark:text-slate-300",
                        "text-base font-bold mt-2 mb-1 text-stone-800 dark:text-slate-300",
                        "text-sm font-bold mt-2 mb-1 text-stone-700 dark:text-slate-400"
                    ];
                    elements.push(<Tag key={key} className={styles[level - 1]}>{content}</Tag>);
                } else if (trimmedLine === '---') {
                    flushParagraph();
                    elements.push(<hr key={key} className="my-6 border-stone-400 dark:border-slate-600" />);
                } else if (trimmedLine.length > 0) {
                    currentParagraphLines.push(line);
                } else {
                    flushParagraph();
                }
            }
        });

        flushParagraph();
        flushList();

        return elements;
    }, [text]);

    return <>{elements}</>;
};

export const SafeMarkdown = React.memo(MemoizedSafeMarkdown);