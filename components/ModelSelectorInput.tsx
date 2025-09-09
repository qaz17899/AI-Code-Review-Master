import React, { useState } from 'react';
import { RefreshIcon } from './icons';
import { listModels } from '../services/aiService';
import type { ApiProvider, ApiSettings } from '../types';

interface ModelSelectorInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  provider: ApiProvider;
  settings: ApiSettings;
}

export const ModelSelectorInput: React.FC<ModelSelectorInputProps> = ({ id, label, value, onChange, provider, settings }) => {
    const [models, setModels] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchModels = async () => {
        setIsLoading(true);
        setError(null);
        setModels([]);
        try {
            const fetchedModels = await listModels(provider, settings);
            setModels(fetchedModels);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`無法載入模型: ${message}`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <input
                        id={id}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        list={`${id}-list`}
                        className="w-full bg-stone-200 dark:bg-slate-900/80 border border-stone-400 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none"
                        placeholder={provider === 'gemini' ? "e.g., gemini-2.5-pro" : "e.g., gpt-4o"}
                    />
                    {models.length > 0 && (
                        <datalist id={`${id}-list`}>
                            {models.map(model => <option key={model} value={model} />)}
                        </datalist>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={isLoading}
                    className="p-2 rounded-md text-stone-600 dark:text-slate-400 bg-stone-300 dark:bg-slate-700/60 hover:bg-stone-400 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
                    aria-label="重新整理模型列表"
                >
                    {isLoading 
                        ? <div className="animate-spin h-5 w-5 border-2 border-stone-500 border-t-transparent rounded-full"></div>
                        : <RefreshIcon className="h-5 w-5" />
                    }
                </button>
            </div>
            {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{error}</p>}
        </div>
    );
};