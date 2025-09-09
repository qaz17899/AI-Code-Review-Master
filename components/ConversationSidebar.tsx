import React, { useState, useEffect, useRef } from 'react';
import type { Conversation } from '../types';
import { PlusIcon, MessageSquareIcon, TrashIcon, EditIcon, SearchIcon, XIcon } from './icons';
import { useConversation } from '../contexts/ConversationContext';
import { useApiSettings } from '../contexts/ApiSettingsContext';

interface ConversationSidebarProps {
    isOpen: boolean;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
    isOpen,
}) => {
    const { conversations, activeConversationId, dispatch } = useConversation();
    const { settings } = useApiSettings();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editText, setEditText] = useState('');
    const [indicatorStyle, setIndicatorStyle] = useState({});
    
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);
    
    useEffect(() => {
        const activeItem = activeConversationId ? itemRefs.current.get(activeConversationId) : null;
        if (activeItem) {
            setIndicatorStyle({
                top: `${activeItem.offsetTop}px`,
                height: `${activeItem.offsetHeight}px`,
                opacity: 1,
            });
        } else {
            setIndicatorStyle({ opacity: 0 });
        }
    }, [activeConversationId, conversations, isOpen, searchQuery]); // Added searchQuery dependency

    const handleRename = (id: string) => {
        if (editText.trim()) {
            dispatch({ type: 'RENAME_CONVERSATION', payload: { id, title: editText } });
        }
        setEditingId(null);
        setEditText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
        if (e.key === 'Enter') {
            handleRename(id);
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditText('');
        }
    };
    
    const startEditing = (e: React.MouseEvent, conv: Conversation) => {
        e.stopPropagation();
        setEditingId(conv.id);
        setEditText(conv.title);
    };
    
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        dispatch({ type: 'DELETE_CONVERSATION', payload: { id } });
    }
    
    const handleNew = () => {
        dispatch({ type: 'NEW_CONVERSATION', payload: { provider: settings.defaultProvider } });
    }

    const handleSelect = (id: string) => {
        dispatch({ type: 'SELECT_CONVERSATION', payload: { id } });
    }

    const filteredConversations = conversations.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <aside className={`flex-shrink-0 bg-stone-100/75 dark:bg-slate-900/75 backdrop-blur-xl border-r border-stone-300 dark:border-slate-800/50 flex flex-col transition-all duration-300 ease-in-out dark:ring-1 dark:ring-inset dark:ring-white/10 ${isOpen ? 'w-64' : 'w-0'}`}>
            <div className={`w-64 flex flex-col h-full transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex-shrink-0 p-2 border-b border-stone-300 dark:border-slate-800/50">
                    <button
                        onClick={handleNew}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-stone-800 dark:text-slate-200 bg-stone-50/50 dark:bg-slate-800/50 hover:bg-stone-100/60 dark:hover:bg-slate-700/60 rounded-lg transition-all duration-200 border border-stone-400 dark:border-slate-700 active:scale-95 hover:border-[var(--accent-color)]/70"
                    >
                        <PlusIcon className="h-5 w-5" />
                        新的對話
                    </button>
                </div>
                <div className="flex-shrink-0 p-2 border-b border-stone-300 dark:border-slate-800/50">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 dark:text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="搜尋對話..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-50/50 dark:bg-slate-800/50 border border-stone-400 dark:border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-sm focus:ring-1 focus:ring-[var(--accent-color)] outline-none transition"
                        />
                         {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                                <XIcon className="h-4 w-4" />
                            </button>
                         )}
                    </div>
                </div>
                <nav className="flex-grow overflow-y-auto custom-scrollbar p-2">
                    <ul ref={listRef} className="relative space-y-1">
                        <div 
                            className="absolute left-0 w-full accent-gradient-bg-b rounded-lg transition-all duration-300 ease-in-out"
                            style={indicatorStyle}
                        />
                        {filteredConversations.map((conv, index) => {
                            const isActive = activeConversationId === conv.id && editingId !== conv.id;
                            return (
                                <li 
                                  key={conv.id}
                                  ref={node => {
                                      if (node) itemRefs.current.set(conv.id, node);
                                      else itemRefs.current.delete(conv.id);
                                  }}
                                  className="relative group animate-fade-in-up" 
                                  style={{ animationDelay: `${index * 30}ms`, opacity: 0 }}
                                >
                                    <button
                                        onClick={() => editingId !== conv.id && handleSelect(conv.id)}
                                        className={`w-full relative flex items-center gap-3 p-2 rounded-lg text-left transition-all duration-200 transform-gpu ${
                                            isActive
                                            ? 'text-white' 
                                            : editingId === conv.id
                                            ? 'bg-stone-100/80 dark:bg-slate-700/80 ring-1 ring-[var(--accent-color)]'
                                            : 'text-stone-700 dark:text-slate-400 hover:bg-stone-100/70 dark:hover:bg-slate-800/70 hover:translate-x-1'
                                        }`}
                                    >
                                        <MessageSquareIcon className="h-5 w-5 flex-shrink-0 ml-1" />
                                        {editingId === conv.id ? (
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onBlur={() => handleRename(conv.id)}
                                                onKeyDown={(e) => handleKeyDown(e, conv.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-grow bg-transparent text-sm font-medium focus:outline-none p-0 text-stone-900 dark:text-slate-200 focus:ring-1 focus:ring-[var(--accent-color)] rounded"
                                            />
                                        ) : (
                                            <>
                                                <span className="text-sm font-medium truncate flex-grow">{conv.title}</span>
                                                <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => startEditing(e, conv)}
                                                        className={`p-1 rounded-md transition-all duration-150 hover:scale-110 active:scale-95 ${isActive ? 'text-white/70 hover:text-white' : 'text-stone-600 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-300'}`}
                                                        aria-label={`重新命名 ${conv.title}`}
                                                    >
                                                        <EditIcon className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDelete(e, conv.id)}
                                                        className={`p-1 rounded-md transition-all duration-150 hover:scale-110 active:scale-95 ${isActive ? 'text-white/70 hover:text-red-300' : 'text-stone-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400'}`}
                                                        aria-label={`刪除 ${conv.title}`}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-max max-w-xs p-3 bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 text-xs rounded-lg shadow-lg z-30 opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 delay-500 border border-stone-300 dark:border-slate-700">
                                        <div className="space-y-1.5 font-sans text-left">
                                            <p className="font-bold text-sm accent-gradient-text truncate">{conv.title}</p>
                                            <div className="border-t border-stone-300 dark:border-slate-700 my-1"></div>
                                            <p><strong>模式:</strong> <span className="font-mono bg-stone-300 dark:bg-slate-700 px-1 py-0.5 rounded">{conv.mode}</span></p>
                                            <p><strong>回合數:</strong> {Math.ceil(conv.history.length / 2)}</p>
                                            <p><strong>建立時間:</strong> {new Date(conv.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-stone-50 dark:bg-slate-800 rotate-45 border-b border-l border-stone-300 dark:border-slate-700"></div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </nav>
            </div>
        </aside>
    );
};