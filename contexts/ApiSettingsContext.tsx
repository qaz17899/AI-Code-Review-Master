import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { ApiSettings, ApiProvider } from '../types';

interface ApiSettingsState {
    settings: ApiSettings;
    setSettings: (settings: ApiSettings) => void;
}

const ApiSettingsContext = createContext<ApiSettingsState | undefined>(undefined);

const DEFAULT_SETTINGS: ApiSettings = {
    geminiApiKey: '',
    geminiProxyUrl: '',
    geminiModelId: 'gemini-2.5-pro',
    openaiApiKey: '',
    openaiProxyUrl: '',
    openaiModelId: 'gpt-4o',
    defaultProvider: 'gemini',
    forceDiff: true,
};

export const ApiSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<ApiSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem('apiSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            }
        } catch (error) {
            console.error("Failed to load API settings from localStorage:", error);
        }
    }, []);

    const handleSetSettings = (newSettings: ApiSettings) => {
        try {
            localStorage.setItem('apiSettings', JSON.stringify(newSettings));
            setSettings(newSettings);
        } catch (error) {
            console.error("Failed to save API settings to localStorage:", error);
        }
    };

    return (
        <ApiSettingsContext.Provider value={{ settings, setSettings: handleSetSettings }}>
            {children}
        </ApiSettingsContext.Provider>
    );
};

export const useApiSettings = () => {
    const context = useContext(ApiSettingsContext);
    if (context === undefined) {
        throw new Error('useApiSettings must be used within an ApiSettingsProvider');
    }
    return context;
};