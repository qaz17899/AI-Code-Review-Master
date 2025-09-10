import { useState, useEffect } from 'react';
import type { ApiProvider, AppFile, ApiSettings } from '../types';
import { countInputTokens } from '../services/aiService';

export const useDebouncedTokenCounter = (
    provider: ApiProvider,
    files: AppFile[],
    userMessage: string,
    images: string[],
    settings: ApiSettings,
    debounceMs: number = 500
): [number | null, boolean] => {
    const [inputTokenCount, setInputTokenCount] = useState<number | null>(null);
    const [isCountingTokens, setIsCountingTokens] = useState(false);

    useEffect(() => {
        const hasInput = files.length > 0 || images.length > 0 || userMessage.trim();

        if (!hasInput) {
            setInputTokenCount(null);
            return;
        }

        const handler = setTimeout(async () => {
            setIsCountingTokens(true);
            try {
                const count = await countInputTokens(provider, files, userMessage, images, settings);
                setInputTokenCount(count);
            } catch (error) {
                console.error("Error counting tokens:", error);
                setInputTokenCount(null);
            } finally {
                setIsCountingTokens(false);
            }
        }, debounceMs);

        return () => clearTimeout(handler);
    }, [files, userMessage, images, provider, settings, debounceMs]);

    return [inputTokenCount, isCountingTokens];
};
