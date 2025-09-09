import React, { useState, useEffect, useRef } from 'react';
import type { ReviewMode } from '../types';
import { getModeIcon, MODE_DESCRIPTIONS } from './ModeIcons';
import { InfoIcon } from './icons';
import { useApiSettings } from '../contexts/ApiSettingsContext';

const MODE_CATEGORIES: { title: string; modes: ReviewMode[] }[] = [
    {
        title: '自動化',
        modes: ['WORKFLOW']
    },
    {
        title: '程式碼品質',
        modes: ['REVIEW', 'REFACTOR', 'SIMPLIFY', 'DOCS', 'CONSOLIDATE']
    },
    {
        title: '健壯性與安全',
        modes: ['BUGFIX', 'OPTIMIZE', 'TESTER', 'SECURITY']
    },
    {
        title: '系統設計',
        modes: ['DESIGN', 'IMPLEMENT', 'SCALE', 'VERIFY']
    },
    {
        title: '創意與問答',
        modes: ['Q&A', 'DESIGNER', 'ENHANCE', 'BALANCE']
    }
];

const ModeButton: React.FC<{
    mode: ReviewMode;
    isSelected: boolean;
    onClick: () => void;
    onShowExample: (mode: ReviewMode) => void;
    animationIndex: number;
}> = ({ mode, isSelected, onClick, onShowExample, animationIndex }) => {
    
    const selectedClasses = isSelected 
        ? 'relative shadow-lg shadow-[var(--accent-color)]/20 before:absolute before:-inset-px before:rounded-lg before:bg-gradient-to-r before:from-[var(--gradient-from-color)] before:via-white/80 before:dark:via-black/80 before:to-[var(--gradient-to-color)] before:bg-[length:200%_auto] before:animate-[shimmer-border_4s_linear_infinite]'
        : 'bg-stone-400 dark:bg-slate-700';

    return (
        <button
            onClick={onClick}
            className={`group w-full h-full text-left rounded-lg p-px transition-all duration-150 transform-gpu hover:-translate-y-px active:scale-[0.98] animate-fade-in-up ${selectedClasses}`}
            style={{ animationDelay: `${animationIndex * 50}ms`, opacity: 0 }}
        >
            <div
                className={`relative w-full h-full p-3 rounded-[7px] transition-colors duration-150 flex flex-col gap-2 ${
                    isSelected
                        ? 'bg-stone-300 dark:bg-slate-900'
                        : 'bg-stone-200 dark:bg-slate-800/60 group-hover:bg-stone-300/70 dark:group-hover:bg-slate-800'
                }`}
            >
                <div>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 pr-2">
                             {getModeIcon(mode, `h-6 w-6 ${isSelected ? 'text-[var(--accent-color)]' : 'text-stone-600 dark:text-slate-400'} flex-shrink-0`)}
                             <p className={`font-semibold uppercase text-base ${isSelected ? 'accent-gradient-text' : 'text-stone-800 dark:text-slate-200'}`}>{mode}</p>
                        </div>
                        <button
                            className="text-stone-500 dark:text-slate-500 hover:text-[var(--accent-color)] transition-colors z-10 flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); onShowExample(mode); }}
                            aria-label={`查看 ${mode} 模式範例`}
                        >
                            <InfoIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <p className="text-sm text-stone-600 dark:text-slate-400">{MODE_DESCRIPTIONS[mode]}</p>
            </div>
        </button>
    );
};

export const ModeSelectorGrid: React.FC<{
    currentMode: ReviewMode;
    onModeChange: (mode: ReviewMode) => void;
    onShowExample: (mode: ReviewMode) => void;
}> = ({ currentMode, onModeChange, onShowExample }) => {
    const { settings, setSettings } = useApiSettings();
    const findCategoryForMode = (mode: ReviewMode) => 
        MODE_CATEGORIES.find(cat => cat.modes.includes(mode));

    const [activeCategory, setActiveCategory] = useState(() => {
        return findCategoryForMode(currentMode)?.title || MODE_CATEGORIES[0].title;
    });
    
    const [indicatorStyle, setIndicatorStyle] = useState({});
    const tabsRef = useRef<HTMLDivElement>(null);
    const tabItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    useEffect(() => {
        const category = findCategoryForMode(currentMode);
        if (category) {
            setActiveCategory(category.title);
        }
    }, [currentMode]);

    useEffect(() => {
        const activeTabNode = tabItemRefs.current.get(activeCategory);
        const tabsContainerNode = tabsRef.current;

        if (activeTabNode && tabsContainerNode) {
            const containerRect = tabsContainerNode.getBoundingClientRect();
            const tabRect = activeTabNode.getBoundingClientRect();

            setIndicatorStyle({
                left: `${tabRect.left - containerRect.left}px`,
                top: `${tabRect.top - containerRect.top}px`,
                width: `${tabRect.width}px`,
                height: `${tabRect.height}px`,
            });
        }
    }, [activeCategory]);

    const activeCategoryData = MODE_CATEGORIES.find(cat => cat.title === activeCategory);

    return (
        <div className="space-y-4">
            <div>
                <div className="text-lg font-bold text-stone-900 dark:text-slate-200 mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="bg-[var(--accent-color)] text-white rounded-full h-7 w-7 flex items-center justify-center font-bold text-base flex-shrink-0">1</span>
                        <span>選擇模式</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="force-diff-toggle" className="text-sm font-medium text-stone-600 dark:text-slate-400 cursor-pointer whitespace-nowrap">
                            強制使用 Diff 格式
                        </label>
                        <button
                            id="force-diff-toggle"
                            role="switch"
                            aria-checked={settings.forceDiff}
                            onClick={() => setSettings({ ...settings, forceDiff: !settings.forceDiff })}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${settings.forceDiff ? 'bg-[var(--accent-color)]' : 'bg-stone-300 dark:bg-slate-700'}`}
                        >
                            <span
                                aria-hidden="true"
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.forceDiff ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                </div>
                
                {/* Category Tabs */}
                <div ref={tabsRef} className="relative flex items-stretch gap-1 bg-stone-300/60 dark:bg-slate-800/70 p-1 rounded-lg">
                    {MODE_CATEGORIES.map(category => (
                        <button
                            key={category.title}
                            ref={node => {
                                if (node) tabItemRefs.current.set(category.title, node);
                                else tabItemRefs.current.delete(category.title);
                            }}
                            onClick={() => setActiveCategory(category.title)}
                            className={`relative z-10 px-3 sm:px-4 py-1.5 text-sm font-semibold transition-colors duration-300 rounded-md flex-grow text-center ${
                                activeCategory === category.title
                                    ? 'text-stone-950 dark:text-slate-50'
                                    : 'text-stone-700 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/5'
                            }`}
                            aria-current={activeCategory === category.title}
                        >
                            {category.title}
                        </button>
                    ))}
                    <div 
                        className="absolute bg-stone-100 dark:bg-slate-700 rounded-md shadow-sm transition-all duration-300 ease-in-out"
                        style={indicatorStyle}
                    />
                </div>

                {/* Mode Buttons Grid */}
                {activeCategoryData && (
                    <div key={activeCategoryData.title} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
                        {activeCategoryData.modes.map((mode, index) => (
                            <ModeButton 
                                key={mode}
                                mode={mode}
                                isSelected={currentMode === mode}
                                onClick={() => onModeChange(mode)}
                                onShowExample={onShowExample}
                                animationIndex={index}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};