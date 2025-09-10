import React, { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import type { Conversation } from '../types';
import { PlusIcon, MessageSquareIcon, TrashIcon, EditIcon, SearchIcon, XIcon, ChevronDownIcon, FolderIcon } from './icons';
import { useConversation } from '../contexts/ConversationContext';
import { MODES } from '../config/modes';
import { useApiSettings } from '../contexts/ApiSettingsContext';
import Portal from './Portal';


interface ConversationSidebarProps {
    isOpen: boolean;
}

const WorkspaceDropdown: React.FC<{
    onClose: () => void;
    triggerRect: DOMRect | null;
}> = ({ onClose, triggerRect }) => {
    const { workspaces, activeWorkspaceId, dispatch } = useConversation();
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleAddWorkspace = (e: FormEvent) => {
        e.preventDefault();
        if (newWorkspaceName.trim()) {
            dispatch({ type: 'NEW_WORKSPACE', payload: { name: newWorkspaceName.trim() } });
            setNewWorkspaceName('');
            onClose();
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (!triggerRect) return null;

    const style: React.CSSProperties = {
        position: 'fixed',
        top: `${triggerRect.top}px`,
        left: `${triggerRect.right + 8}px`,
    };

    return (
        <Portal>
            <div
                ref={dropdownRef}
                style={style}
                className="z-30 w-64 p-2 bg-stone-100/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-lg shadow-2xl border border-stone-300 dark:border-slate-700/80 animate-fade-in glass-noise"
            >
                <div className="space-y-1">
                    {workspaces.map(ws => (
                         <button key={ws.id} onClick={() => dispatch({ type: 'SELECT_WORKSPACE', payload: { id: ws.id } })} className={`w-full text-left p-2 text-sm rounded transition-colors ${ws.id === activeWorkspaceId ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)] font-bold' : 'hover:bg-stone-200/80 dark:hover:bg-slate-800/80'}`}>
                            {ws.name}
                        </button>
                    ))}
                </div>
                <div className="border-t border-stone-300 dark:border-slate-700/60 my-2"></div>
                <form onSubmit={handleAddWorkspace} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="新的工作區名稱..."
                        className="flex-grow bg-stone-50/50 dark:bg-slate-800/50 border border-stone-400 dark:border-slate-700 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition"
                    />
                    <button type="submit" className="p-1.5 rounded-md text-stone-600 dark:text-slate-300 bg-stone-200 hover:bg-stone-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors" aria-label="新增工作區">
                        <PlusIcon className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </Portal>
    );
};


export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
    isOpen,
}) => {
    const { workspaces, conversations, activeWorkspaceId, activeConversationId, dispatch } = useConversation();
    const { settings } = useApiSettings();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editText, setEditText] = useState('');
    const [indicatorStyle, setIndicatorStyle] = useState({});
    const [tooltipData, setTooltipData] = useState<{ conv: Conversation; rect: DOMRect } | null>(null);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [workspaceButtonRect, setWorkspaceButtonRect] = useState<DOMRect | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const workspaceButtonRef = useRef<HTMLButtonElement>(null);
    const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

    const activeWorkspace = useMemo(() => workspaces.find(w => w.id === activeWorkspaceId), [workspaces, activeWorkspaceId]);

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

    const conversationsForCurrentWorkspace = useMemo(() => {
        return conversations
            .filter(conv => conv.workspaceId === activeWorkspaceId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [conversations, activeWorkspaceId]);

    const filteredConversations = useMemo(() => conversationsForCurrentWorkspace.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    ), [conversationsForCurrentWorkspace, searchQuery]);

    return (
        <aside className={`flex-shrink-0 bg-stone-100/75 dark:bg-slate-900/75 backdrop-blur-xl border-r border-stone-300 dark:border-slate-800/50 flex flex-col transition-all duration-300 ease-in-out dark:ring-1 dark:ring-inset dark:ring-white/10 ${isOpen ? 'w-64' : 'w-0'}`}>
            <div className={`p-2 border-b border-stone-300 dark:border-slate-800/50 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative px-2 -mx-2">
                    <button ref={workspaceButtonRef} onClick={() => { setWorkspaceButtonRect(workspaceButtonRef.current?.getBoundingClientRect() || null); setIsWorkspaceOpen(!isWorkspaceOpen); }} className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-50/50 dark:bg-slate-800/50 hover:bg-stone-100 dark:hover:bg-slate-800/80 border border-stone-400 dark:border-slate-700 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <FolderIcon className="h-5 w-5 text-stone-600 dark:text-slate-400 flex-shrink-0" />
                            <span className="font-semibold text-sm text-stone-800 dark:text-slate-200 truncate">{activeWorkspace?.name || '...'}</span>
                        </div>
                        <ChevronDownIcon className={`h-4 w-4 text-stone-500 dark:text-slate-500 transition-transform ${isWorkspaceOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isWorkspaceOpen && <WorkspaceDropdown onClose={() => setIsWorkspaceOpen(false)} triggerRect={workspaceButtonRect} />}
                </div>
            </div>
            <div className={`w-full flex flex-col h-full transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex-shrink-0 p-2 border-b border-stone-300 dark:border-slate-800/50">
                    <button
                        onClick={handleNew}
                        disabled={!activeWorkspaceId}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-stone-800 dark:text-slate-200 bg-stone-50/50 dark:bg-slate-800/50 rounded-lg transition-all duration-200 border border-stone-400 dark:border-slate-700 hover:border-[var(--accent-color)]/70 hover:shadow-md hover:shadow-[var(--accent-color)]/10 transform-gpu hover:-translate-y-px active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                            className="w-full bg-stone-50/50 dark:bg-slate-800/50 border border-stone-400 dark:border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-sm focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition"
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
                        {filteredConversations.length === 0 && (
                            <div className="text-center py-8 text-xs text-stone-500 dark:text-slate-500">
                                <p>此工作區沒有對話。</p>
                                <p>點擊「新的對話」開始。</p>
                            </div>
                        )}
                        {filteredConversations.map((conv, index) => {
                            const isActive = activeConversationId === conv.id && editingId !== conv.id;
                            const turnCount = Math.ceil(conv.history.length / 2);                            
                            const subtitle = `${turnCount} 回合 • ${MODES[conv.mode]?.name || conv.mode}`;
                            return (
                                <li 
                                  key={conv.id}
                                  ref={node => {
                                      if (node) itemRefs.current.set(conv.id, node);
                                      else itemRefs.current.delete(conv.id);
                                  }}
                                  onMouseEnter={(e) => setTooltipData({ conv, rect: e.currentTarget.getBoundingClientRect() })}
                                  onMouseLeave={() => setTooltipData(null)}
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
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{conv.title}</p>
                                                    <p className="text-xs text-stone-500 dark:text-slate-500 truncate">{subtitle}</p>
                                                </div>
                                                <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => startEditing(e, conv)}
                                                        className={`p-1.5 rounded-md transition-all duration-150 hover:scale-110 active:scale-95 ${isActive ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-stone-600 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'}`}
                                                        aria-label={`重新命名 ${conv.title}`}
                                                    >
                                                        <EditIcon className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDelete(e, conv.id)}
                                                        className={`p-1.5 rounded-md transition-all duration-150 hover:scale-110 active:scale-95 ${isActive ? 'text-white/70 hover:text-red-300 hover:bg-white/20' : 'text-stone-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10'}`}
                                                        aria-label={`刪除 ${conv.title}`}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </nav>
            </div>
            {tooltipData && (
                <Portal>
                    <div
                        className="fixed w-max max-w-xs p-3 bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 text-xs rounded-lg shadow-lg z-50 border border-stone-300 dark:border-slate-700 transition-all duration-150"
                        style={{
                            left: `${tooltipData.rect.right + 10}px`,
                            top: `${tooltipData.rect.top + tooltipData.rect.height / 2}px`,
                            transform: `translateY(-50%) scale(${tooltipData ? 1 : 0.95})`,
                            opacity: tooltipData ? 1 : 0
                        }}
                    >
                        <div className="space-y-1.5 font-sans text-left">
                            <p className="font-bold text-sm accent-gradient-text truncate">{tooltipData.conv.title}</p>
                            <div className="border-t border-stone-300 dark:border-slate-700 my-1"></div>
                            <p><strong>工作區:</strong> {activeWorkspace?.name || 'N/A'}</p>
                            <p><strong>模式:</strong> <span className="font-mono bg-stone-300 dark:bg-slate-700 px-1 py-0.5 rounded">{MODES[tooltipData.conv.mode]?.name || tooltipData.conv.mode}</span></p>
                            <p><strong>回合數:</strong> {Math.ceil(tooltipData.conv.history.length / 2)}</p>
                            <p><strong>建立時間:</strong> {new Date(tooltipData.conv.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                </Portal>
            )}
        </aside>
    );
};
