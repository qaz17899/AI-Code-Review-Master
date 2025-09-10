import React, { useRef, useEffect } from 'react';

export const CodeBlock: React.FC<{ code: string, lang: string, isStreaming: boolean }> = ({ code, lang, isStreaming }) => {
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current) {
            const element = codeRef.current;
            
            // Only apply raw text content during streaming to avoid performance hit
            if (isStreaming) {
                element.textContent = code;
            } else {
                // Once streaming is done, apply highlighting
                element.textContent = code; // Ensure content is up to date
                // @ts-ignore - Assuming hljs is available globally
                if (window.hljs) {
                    element.removeAttribute('data-highlighted');
                    // @ts-ignore
                    window.hljs.highlightElement(element);
                }
            }
        }
    }, [code, lang, isStreaming]);

    return (
        <pre className="p-4 overflow-x-auto text-sm text-slate-800 dark:text-slate-200 font-mono custom-scrollbar">
            <code ref={codeRef} className={`language-${lang}`}>
                {/* Content is managed imperatively by the useEffect hook to handle highlighting and cursor */}
            </code>
        </pre>
    );
};