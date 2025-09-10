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


// --- OPTIMIZATION: Create Blob and URL once at the module level ---
// This avoids recreating the Blob and URL for every instance of CodeBlock,
// reducing memory usage and component mount time.
const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

export const CodeBlock: React.FC<{ code: string, lang: string, isStreaming: boolean }> = ({ code, lang, isStreaming }) => {
    const codeRef = useRef<HTMLElement>(null);
    const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const highlightingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Setup web worker for syntax highlighting
    useEffect(() => {
        const newWorker = new Worker(workerUrl);
        workerRef.current = newWorker;

        newWorker.onmessage = (event: MessageEvent<string>) => {
            setHighlightedCode(event.data);
        };

        return () => {
            newWorker.terminate();
        };
    }, []);

    // Effect to handle code changes and trigger highlighting
    useEffect(() => {
        if (!codeRef.current || !workerRef.current) return;

        // Always display raw text immediately for responsiveness
        codeRef.current.textContent = code;
        setHighlightedCode(null);

        // Clear any previous scheduled highlighting
        if (highlightingTimer.current) {
            clearTimeout(highlightingTimer.current);
        }

        // When streaming is done, highlight immediately. Otherwise, use a short debounce.
        // A shorter delay (e.g., 100ms) provides a more "real-time" feel.
        const delay = isStreaming ? 100 : 0;

        highlightingTimer.current = setTimeout(() => {
            if (code) { // Only highlight if there's content
                workerRef.current?.postMessage({ code, lang });
            }
        }, delay);

        return () => {
            if (highlightingTimer.current) {
                clearTimeout(highlightingTimer.current);
            }
        };
    }, [code, lang, isStreaming]);

    // Effect to apply the highlighted HTML when it's ready from the worker
    useEffect(() => {
        if (codeRef.current && highlightedCode) {
            codeRef.current.innerHTML = highlightedCode;
        }
    }, [highlightedCode]);


    return (
        <pre className="p-4 overflow-x-auto text-sm text-slate-800 dark:text-slate-200 font-mono custom-scrollbar">
            <code ref={codeRef} className={`language-${lang}`}>
                {/* Content is managed imperatively by useEffects */}
            </code>
        </pre>
    );
};
