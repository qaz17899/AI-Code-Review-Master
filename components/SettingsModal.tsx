import React, { useState, useEffect } from 'react';
import { useApiSettings } from '../contexts/ApiSettingsContext';
import { XIcon } from './icons';
import type { ApiProvider } from '../types';
import { ModelSelectorInput } from './ModelSelectorInput';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings } = useApiSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);
  
  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  const handleProviderChange = (provider: ApiProvider) => {
    setLocalSettings(prev => ({ ...prev, defaultProvider: provider }));
  };
  
  const handleCancel = () => {
      setLocalSettings(settings); // Revert changes
      onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 animate-fade-in" style={{ animationDuration: '200ms' }} onClick={handleCancel}>
      <div className="bg-stone-100/80 dark:bg-[#111827]/80 backdrop-blur-2xl rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-stone-400 dark:border-slate-700 relative glass-noise" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-stone-300 dark:border-slate-700/80">
          <h2 className="text-xl font-bold text-stone-900 dark:text-slate-100">API 設定</h2>
          <button onClick={handleCancel} className="p-1 rounded-full text-stone-600 hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="h-6 w-6" />
          </button>
        </header>
        <main className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-8">
            
            <section>
                <h3 className="text-base font-semibold text-stone-800 dark:text-slate-300 mb-2">預設 AI 核心</h3>
                <p className="text-sm text-stone-600 dark:text-slate-400 mb-4">選擇開啟新對話時預設使用的 AI 模型提供者。</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                        onClick={() => handleProviderChange('gemini')}
                        className={`text-center p-4 rounded-lg border-2 transition-all ${localSettings.defaultProvider === 'gemini' ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 ring-2 ring-[var(--accent-color)]/30' : 'border-stone-400 dark:border-slate-700 bg-stone-200 dark:bg-slate-800/50 hover:border-stone-500 dark:hover:border-slate-600'}`}
                    >
                        <h4 className="font-bold text-stone-900 dark:text-slate-100 flex items-center justify-center gap-2">✨ Google Gemini</h4>
                    </button>
                    <button 
                        onClick={() => handleProviderChange('openai')}
                        className={`text-center p-4 rounded-lg border-2 transition-all ${localSettings.defaultProvider === 'openai' ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 ring-2 ring-[var(--accent-color)]/30' : 'border-stone-400 dark:border-slate-700 bg-stone-200 dark:bg-slate-800/50 hover:border-stone-500 dark:hover:border-slate-600'}`}
                    >
                        <h4 className="font-bold text-stone-900 dark:text-slate-100 flex items-center justify-center gap-2">🔄 OpenAI</h4>
                    </button>
                </div>
            </section>

            <div className="border-t border-stone-300 dark:border-slate-700/80"></div>

            <section>
                 <h3 className="text-lg font-semibold text-stone-900 dark:text-slate-200 mb-1">Google Gemini</h3>
                 <p className="text-sm text-stone-600 dark:text-slate-400 mb-4">設定 Gemini API 的連線參數。應用程式預設使用 <code className="font-mono text-xs">process.env.API_KEY</code>。</p>
                 <div className="space-y-4">
                     <div>
                         <label htmlFor="gemini-key" className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1.5">API Key</label>
                         <input
                           id="gemini-key"
                           type="password"
                           value={localSettings.geminiApiKey}
                           onChange={(e) => setLocalSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                           className="w-full bg-stone-200 dark:bg-slate-900/80 border border-stone-400 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:border-[var(--accent-color)] outline-none transition-all"
                           placeholder="若留空，則使用環境變數中的金鑰"
                         />
                     </div>
                     <div>
                         <label htmlFor="gemini-url" className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1.5">自訂 API 端點 (反向代理)</label>
                         <input
                           id="gemini-url"
                           type="text"
                           value={localSettings.geminiProxyUrl}
                           onChange={(e) => setLocalSettings(prev => ({ ...prev, geminiProxyUrl: e.target.value }))}
                           className="w-full bg-stone-200 dark:bg-slate-900/80 border border-stone-400 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:border-[var(--accent-color)] outline-none transition-all"
                           placeholder="可選。若留空則使用官方 API 端點。"
                         />
                     </div>
                     <ModelSelectorInput 
                        id="gemini-model"
                        label="模型 ID"
                        value={localSettings.geminiModelId}
                        onChange={(value) => setLocalSettings(prev => ({...prev, geminiModelId: value}))}
                        provider="gemini"
                        settings={localSettings}
                     />
                 </div>
            </section>
            
            <div className="border-t border-stone-300 dark:border-slate-700/80"></div>

            <section>
                 <h3 className="text-lg font-semibold text-stone-900 dark:text-slate-200 mb-1">OpenAI</h3>
                 <p className="text-sm text-stone-600 dark:text-slate-400 mb-4">設定相容 OpenAI 格式的 API Key 與端點。</p>
                 <div className="space-y-4">
                     <div>
                         <label htmlFor="openai-key" className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1.5">API Key</label>
                         <input
                           id="openai-key"
                           type="password"
                           value={localSettings.openaiApiKey}
                           onChange={(e) => setLocalSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                           className="w-full bg-stone-200 dark:bg-slate-900/80 border border-stone-400 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:border-[var(--accent-color)] outline-none transition-all"
                           placeholder="sk-..."
                         />
                     </div>
                     <div>
                         <label htmlFor="openai-url" className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1.5">API 端點</label>
                         <input
                           id="openai-url"
                           type="text"
                           value={localSettings.openaiProxyUrl}
                           onChange={(e) => setLocalSettings(prev => ({ ...prev, openaiProxyUrl: e.target.value }))}
                           className="w-full bg-stone-200 dark:bg-slate-900/80 border border-stone-400 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:border-[var(--accent-color)] outline-none transition-all"
                           placeholder="https://api.openai.com/v1"
                         />
                          <p className="text-xs text-stone-500 dark:text-slate-500 mt-1">可選。若留空則使用官方預設端點。</p>
                     </div>
                     <ModelSelectorInput 
                        id="openai-model"
                        label="模型 ID"
                        value={localSettings.openaiModelId}
                        onChange={(value) => setLocalSettings(prev => ({...prev, openaiModelId: value}))}
                        provider="openai"
                        settings={localSettings}
                     />
                 </div>
            </section>

        </main>
        <footer className="flex justify-end items-center gap-4 p-4 border-t border-stone-300 dark:border-slate-700/80 bg-stone-200 dark:bg-slate-800/50">
          <button onClick={handleCancel} className="px-5 py-2 bg-stone-100 dark:bg-slate-700 text-stone-800 dark:text-slate-200 text-sm font-bold rounded-lg hover:bg-stone-300 dark:hover:bg-slate-600 transition-all border border-stone-400 dark:border-slate-600 transform active:scale-95">
            取消
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-[var(--accent-color)] text-white text-sm font-bold rounded-lg hover:brightness-110 transition-all transform hover:-translate-y-px hover:shadow-lg hover:shadow-[var(--accent-color)]/30 active:scale-95">
            儲存
          </button>
        </footer>
      </div>
    </div>
  );
};