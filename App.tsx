import React, { useState, useEffect } from 'react';
import { CodeReviewer } from './components/CodeReviewer';
import { MoonIcon, SunIcon, MenuIcon, MasterIcon, XIcon, SettingsIcon } from './components/icons';
import { ConversationSidebar } from './components/ConversationSidebar';
import type { ReviewMode } from './types';
import { useConversation } from './contexts/ConversationContext';
import { SettingsModal } from './components/SettingsModal';
import { useApiSettings } from './contexts/ApiSettingsContext';


export type Theme = 'light' | 'dark';

type ModeTheme = {
    gradient: { c1: string, c2: string };
    accent: { color: string, hover: string, from: string, to: string };
};

const MODE_CONFIG: Record<ReviewMode, ModeTheme> = {
    // Quality & Review
    REVIEW:       { gradient: { c1: 'rgba(29, 78, 216, 0.15)',  c2: 'rgba(107, 33, 168, 0.15)' }, accent: { color: '#f59e0b', hover: '#fbbf24', from: '#fbbf24', to: '#f97316' } },
    REFACTOR:     { gradient: { c1: 'rgba(5, 150, 105, 0.15)',  c2: 'rgba(13, 148, 136, 0.15)' },  accent: { color: '#10b981', hover: '#34d399', from: '#34d399', to: '#2dd4bf' } },
    SIMPLIFY:     { gradient: { c1: 'rgba(101, 163, 13, 0.15)', c2: 'rgba(22, 163, 74, 0.15)' },   accent: { color: '#84cc16', hover: '#a3e635', from: '#a3e635', to: '#bef264' } },
    DOCS:         { gradient: { c1: 'rgba(107, 114, 128, 0.15)',c2: 'rgba(156, 163, 175, 0.15)'}, accent: { color: '#6b7280', hover: '#9ca3af', from: '#9ca3af', to: '#d1d5db' } },
    CONSOLIDATE:  { gradient: { c1: 'rgba(8, 145, 178, 0.15)',  c2: 'rgba(15, 118, 110, 0.15)' },   accent: { color: '#0891b2', hover: '#06b6d4', from: '#06b6d4', to: '#2dd4bf' } },
    // Robustness & Security
    BUGFIX:       { gradient: { c1: 'rgba(190, 18, 60, 0.15)',   c2: 'rgba(234, 88, 12, 0.15)' },  accent: { color: '#ef4444', hover: '#f87171', from: '#f87171', to: '#fb7185' } },
    OPTIMIZE:     { gradient: { c1: 'rgba(37, 99, 235, 0.15)',  c2: 'rgba(79, 70, 229, 0.15)' },  accent: { color: '#3b82f6', hover: '#60a5fa', from: '#60a5fa', to: '#818cf8' } },
    TESTER:       { gradient: { c1: 'rgba(202, 138, 4, 0.15)',  c2: 'rgba(245, 158, 11, 0.15)' }, accent: { color: '#eab308', hover: '#facc15', from: '#facc15', to: '#fde047' } },
    SECURITY:     { gradient: { c1: 'rgba(249, 115, 22, 0.15)', c2: 'rgba(220, 38, 38, 0.15)' },  accent: { color: '#f97316', hover: '#fb923c', from: '#fb923c', to: '#fdba74' } },
    // System Design
    DESIGN:       { gradient: { c1: 'rgba(71, 85, 105, 0.15)',  c2: 'rgba(100, 116, 139, 0.15)' },accent: { color: '#64748b', hover: '#94a3b8', from: '#94a3b8', to: '#cbd5e1' } },
    IMPLEMENT:    { gradient: { c1: 'rgba(79, 70, 229, 0.15)',  c2: 'rgba(124, 58, 237, 0.15)' }, accent: { color: '#4f46e5', hover: '#6366f1', from: '#6366f1', to: '#818cf8' } },
    SCALE:        { gradient: { c1: 'rgba(14, 165, 233, 0.15)', c2: 'rgba(59, 130, 246, 0.15)' }, accent: { color: '#0ea5e9', hover: '#38bdf8', from: '#38bdf8', to: '#7dd3fc' } },
    VERIFY:       { gradient: { c1: 'rgba(22, 163, 74, 0.15)',  c2: 'rgba(132, 204, 22, 0.15)' },  accent: { color: '#22c55e', hover: '#4ade80', from: '#4ade80', to: '#86efac' } },
    // Creative & Q&A
    'Q&A':        { gradient: { c1: 'rgba(14, 165, 233, 0.15)', c2: 'rgba(6, 182, 212, 0.15)' },   accent: { color: '#06b6d4', hover: '#22d3ee', from: '#22d3ee', to: '#67e8f9' } },
    DESIGNER:     { gradient: { c1: 'rgba(147, 51, 234, 0.15)', c2: 'rgba(219, 39, 119, 0.15)' }, accent: { color: '#a855f7', hover: '#c084fc', from: '#c084fc', to: '#d8b4fe' } },
    ENHANCE:      { gradient: { c1: 'rgba(192, 38, 211, 0.15)', c2: 'rgba(225, 29, 72, 0.15)' },   accent: { color: '#ec4899', hover: '#f472b6', from: '#f472b6', to: '#f87171' } },
    BALANCE:      { gradient: { c1: 'rgba(13, 148, 136, 0.15)', c2: 'rgba(6, 182, 212, 0.15)' },   accent: { color: '#14b8a6', hover: '#2dd4bf', from: '#2dd4bf', to: '#06b6d4' } },
    POLISH:       { gradient: { c1: 'rgba(219, 39, 119, 0.15)', c2: 'rgba(236, 72, 153, 0.15)' }, accent: { color: '#f43f5e', hover: '#fb7185', from: '#fb7185', to: '#f87171' } },
    // Automation
    WORKFLOW:     { gradient: { c1: 'rgba(13, 148, 136, 0.15)', c2: 'rgba(8, 145, 178, 0.15)' },   accent: { color: '#0d9488', hover: '#14b8a6', from: '#14b8a6', to: '#0891b2' } },
};

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
      const themeConfig = MODE_CONFIG[mode] || MODE_CONFIG['REVIEW'];
      
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
       <header className="relative overflow-hidden flex-shrink-0 p-2 sm:p-4 border-b border-[var(--accent-color)]/20 flex justify-between items-center bg-stone-100/75 dark:bg-[#10141c]/75 backdrop-blur-2xl sticky top-0 z-20 dark:ring-1 dark:ring-inset dark:ring-white/10 transition-all duration-1000 glass-noise">
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
                    <div>
                        <h1 className="text-xl font-bold accent-gradient-text">AI Code Review Master</h1>
                        <p className="text-xs text-stone-600 dark:text-slate-400 opacity-80 -mt-1">Your Personal Senior Code Review Expert</p>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex items-center gap-4 bg-stone-200 dark:bg-slate-800/50 border border-stone-300 dark:border-slate-700/50 px-3 py-1.5 rounded-full shadow-inner dark:shadow-black/20">
                <div className="flex items-baseline gap-1.5 text-sm">
                    <span className="font-medium text-stone-600 dark:text-slate-400">Mode:</span>
                    <span key={activeConversation?.mode} className="font-semibold font-mono text-[var(--accent-color)] px-2 py-0.5 bg-[var(--accent-color)]/10 rounded animate-fade-in-up">
                        {activeConversation?.mode || 'N/A'}
                    </span>
                </div>
                <div className="h-4 w-px bg-stone-400 dark:bg-slate-600"></div>
                <div className="flex items-baseline gap-1.5 text-sm">
                    <span className="font-medium text-stone-600 dark:text-slate-400">AI Core:</span>
                    <span className="font-semibold font-mono text-stone-800 dark:text-slate-200 capitalize">{activeConversation?.provider || 'N/A'}</span>
                </div>
                <div className="h-4 w-px bg-stone-400 dark:bg-slate-600"></div>
                <div className="flex items-center gap-1.5 text-sm">
                    <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 ring-1 ring-green-400/50"></span>
                    </div>
                    <span className="font-semibold text-green-600 dark:text-green-400">Ready</span>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="p-2 rounded-full text-stone-600 dark:text-slate-400 hover:bg-stone-300/70 dark:hover:bg-slate-800/70 hover:text-[var(--accent-color)] transition-all duration-200 transform-gpu hover:scale-110 active:scale-95"
                    aria-label="API Settings"
                >
                    <SettingsIcon className="h-6 w-6" />
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-stone-600 dark:text-slate-400 hover:bg-stone-300/70 dark:hover:bg-slate-800/70 hover:text-[var(--accent-color)] transition-all duration-200 transform-gpu hover:scale-110 active:scale-95"
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
