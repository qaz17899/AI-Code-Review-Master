import React, { useState, useEffect } from 'react';
import { CodeReviewer } from './components/CodeReviewer';
import { MoonIcon, SunIcon, MenuIcon, MasterIcon, XIcon, SettingsIcon } from './components/icons';
import { ConversationSidebar } from './components/ConversationSidebar';
import type { ReviewMode } from './types';
import { useConversation } from './contexts/ConversationContext';
import { SettingsModal } from './components/SettingsModal';
import { useApiSettings } from './contexts/ApiSettingsContext';
import { MODES } from './config/modes';


export type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { activeConversation } = useConversation();
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // --- Theme Management ---
  useEffect(() => {
    const root = window.document.documentElement;
    const lightThemeLink = document.getElementById('hljs-light-theme');
    const darkThemeLink = document.getElementById('hljs-dark-theme');

    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    
    if (lightThemeLink && darkThemeLink) {
        (lightThemeLink as HTMLLinkElement).disabled = theme === 'dark';
        (darkThemeLink as HTMLLinkElement).disabled = theme === 'light';
    }
  }, [theme]);

  // --- Dynamic Background & Accent Color Theme ---
  useEffect(() => {
      const root = document.documentElement;
      const mode = activeConversation?.mode || 'REVIEW';
      const themeConfig = MODES[mode]?.theme || MODES['REVIEW'].theme;
      
      root.style.setProperty('--gradient-color-1', themeConfig.gradient.c1);
      root.style.setProperty('--gradient-color-2', themeConfig.gradient.c2);
      root.style.setProperty('--accent-color', themeConfig.accent.color);
      root.style.setProperty('--accent-color-hover', themeConfig.accent.hover);
      root.style.setProperty('--gradient-from-color', themeConfig.accent.from);
      root.style.setProperty('--gradient-to-color', themeConfig.accent.to);

  }, [activeConversation?.mode]);

  const toggleTheme = () => {
    setIsThemeAnimating(true);
    // Let animation run
    setTimeout(() => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
        // Remove animation class after transition
        setTimeout(() => setIsThemeAnimating(false), 300);
    }, 150);
  };
  
  const themeIconClass = `h-6 w-6 transition-transform duration-300 ${isThemeAnimating ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`;

  return (
    <div className="w-full h-screen flex flex-col">
       <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
       <header className="relative overflow-hidden flex-shrink-0 p-2 sm:p-4 border-b border-[var(--accent-color)]/20 flex justify-between items-center bg-stone-100/75 dark:bg-[#10141c]/75 backdrop-blur-2xl sticky top-0 z-20 dark:ring-1 dark:ring-inset dark:ring-white/10 transition-all duration-500 glass-noise">
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-full text-stone-600 dark:text-slate-400 hover:bg-stone-300 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Toggle sidebar"
                >
                  <div className="relative h-6 w-6">
                    <MenuIcon className={`absolute transition-all duration-300 ${isSidebarOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
                    <XIcon className={`absolute transition-all duration-300 ${isSidebarOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
                  </div>
                </button>
                <div className="hidden sm:flex items-center gap-3">
                    <div className="group relative flex items-center justify-center">
                        <MasterIcon className="h-9 w-9 animate-spin-slow animate-master-pulse transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_var(--accent-color)] rounded-full" style={{ animationDuration: '5s', transitionProperty: 'transform, box-shadow' }}/>
                    </div>
                    <div key={activeConversation?.mode}>
                        <h1 className="text-xl font-bold accent-gradient-text animate-fade-in-up">
                            {MODES[activeConversation?.mode || 'REVIEW'].ui.mainTitle}
                        </h1>
                        <p className="text-xs text-stone-600 dark:text-slate-400 opacity-80 -mt-1 animate-fade-in-up">
                            {MODES[activeConversation?.mode || 'REVIEW'].ui.subTitle}
                        </p>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex items-center gap-4 bg-stone-200 dark:bg-slate-800/50 border border-stone-300 dark:border-slate-700/50 px-3 py-1.5 rounded-full shadow-inner dark:shadow-black/20">
                <div className="flex items-baseline gap-1.5 text-sm">
                    <span className="font-medium text-stone-600 dark:text-slate-400">模式:</span>
                    <span key={activeConversation?.mode} className="font-semibold font-mono text-[var(--accent-color)] px-2 py-0.5 bg-[var(--accent-color)]/10 rounded animate-fade-in-up">
                        {MODES[activeConversation?.mode || 'REVIEW']?.name || activeConversation?.mode || 'N/A'}
                    </span>
                </div>
                <div className="h-4 w-px bg-stone-400 dark:bg-slate-600"></div>
                <div className="flex items-baseline gap-1.5 text-sm">
                    <span className="font-medium text-stone-600 dark:text-slate-400">AI 核心:</span>
                    <span className="font-semibold font-mono text-stone-800 dark:text-slate-200 capitalize">{activeConversation?.provider || 'N/A'}</span>
                </div>
                <div className="h-4 w-px bg-stone-400 dark:bg-slate-600"></div>
                <div className="flex items-center gap-1.5 text-sm">
                    <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 ring-1 ring-green-400/50"></span>
                    </div>
                    <span className="font-semibold text-green-600 dark:text-green-400">準備就緒</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="p-2 rounded-full text-stone-600 dark:text-slate-400 hover:bg-stone-300/70 dark:hover:bg-slate-800/70 hover:text-[var(--accent-color)] transition-all duration-200 transform-gpu hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                    aria-label="API Settings"
                >
                    <SettingsIcon className="h-6 w-6" />
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-stone-600 dark:text-slate-400 hover:bg-stone-300/70 dark:hover:bg-slate-800/70 hover:text-[var(--accent-color)] transition-all duration-200 transform-gpu hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                    aria-label="Toggle theme"
                >
                  <div className="relative h-6 w-6">
                    <SunIcon className={`absolute ${theme === 'dark' ? themeIconClass : 'opacity-0'}`} />
                    <MoonIcon className={`absolute ${theme === 'light' ? themeIconClass : 'opacity-0'}`} />
                  </div>
                </button>
            </div>
       </header>
       <div className="flex-grow min-h-0 flex">
          <ConversationSidebar
            isOpen={isSidebarOpen}
          />
          <div className="flex-1 min-w-0">
            <CodeReviewer />
          </div>
       </div>
    </div>
  );
};

export default App;