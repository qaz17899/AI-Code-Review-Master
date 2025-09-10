import React, { useRef, useEffect, useState } from 'react';

const workerScript = `
  // We expect highlight.js and its languages to be loaded.
  // The main script URLs are from index.html
  try {
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js');
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js');
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/yaml.min.js');
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js');
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js');
  } catch (e) {
    console.error('Error importing scripts in worker:', e);
  }

  self.onmessage = (event) => {
    const { code, lang } = event.data;
    if (!self.hljs) {
      // hljs did not load, return plain text
      self.postMessage(code);
      return;
    }
    try {
      const language = self.hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = self.hljs.highlight(code, { language, ignoreIllegals: true }).value;
      self.postMessage(highlighted);
    } catch (e) {
      // In case of highlighting error, return plain text
      self.postMessage(code);
    }
  };
`;


export const CodeBlock: React.FC<{ code: string, lang: string, isStreaming: boolean }> = ({ code, lang, isStreaming }) => {
    const codeRef = useRef<HTMLElement>(null);
    const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
    const workerRef = useRef<Worker | null>(null);

    // Setup web worker for syntax highlighting
    useEffect(() => {
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const newWorker = new Worker(workerUrl);
        workerRef.current = newWorker;

        newWorker.onmessage = (event: MessageEvent<string>) => {
            setHighlightedCode(event.data);
        };

        return () => {
            newWorker.terminate();
            URL.revokeObjectURL(workerUrl);
        };
    }, []);

    // Effect to handle code changes and trigger highlighting
    useEffect(() => {
        if (codeRef.current) {
            // During streaming, display raw text for performance.
            if (isStreaming) {
                setHighlightedCode(null); // Clear previous highlighted content
                codeRef.current.textContent = code;
            } else {
                // When streaming finishes, send the code to the worker for highlighting.
                // Immediately update to final raw text content.
                setHighlightedCode(null);
                codeRef.current.textContent = code; 
                workerRef.current?.postMessage({ code, lang });
            }
        }
    }, [code, lang, isStreaming]);

    // Effect to apply the highlighted HTML when it's ready from the worker
    useEffect(() => {
        if (codeRef.current && highlightedCode && !isStreaming) {
            codeRef.current.innerHTML = highlightedCode;
        }
    }, [highlightedCode, isStreaming]);


    return (
        <pre className="p-4 overflow-x-auto text-sm text-slate-800 dark:text-slate-200 font-mono custom-scrollbar">
            <code ref={codeRef} className={`language-${lang}`}>
                {/* Content is managed imperatively by useEffects */}
            </code>
        </pre>
    );
};
