import React, { useState, useEffect, useRef, useMemo, FormEvent, useCallback } from 'react';
import type { Conversation } from '../types';
import { PlusIcon, MessageSquareIcon, TrashIcon, EditIcon, SearchIcon, XIcon, ChevronDownIcon, FolderIcon } from './icons';
import { useConversation } from '../contexts/ConversationContext';
import { MODES } from '../config/modes';
import { useApiSettings } from '../contexts/ApiSettingsContext';
import Portal from './Portal';


interface ConversationSidebarProps {
    isOpen: boolean;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
    isOpen,
}) => {
    const { workspaces, conversations, activeWorkspaceId, activeConversationId, dispatch } = useConversation();
    const { settings } = useApiSettings();
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editText, setEditText] = useState('');
    const [indicatorStyle, setIndicatorStyle] = useState({});
    const [tooltipData, setTooltipData] = useState<{ conv: Conversation; rect: DOMRect } | null>(null);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

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

    // Reset adding/confirmation state when dropdown closes
    useEffect(() => {
        if (!isWorkspaceOpen) {
            setIsAddingWorkspace(false);
            setConfirmingDeleteId(null);
        }
    }, [isWorkspaceOpen]);

    const handleRename = useCallback((id: string) => {
        if (editText.trim()) {
            dispatch({ type: 'RENAME_CONVERSATION', payload: { id, title: editText } });
        }
        setEditingId(null);
        setEditText('');
    }, [dispatch, editText]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
        if (e.key === 'Enter') {
            handleRename(id);
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditText('');
        }
    }, [handleRename]);
    
    const startEditing = useCallback((e: React.MouseEvent, conv: Conversation) => {
        e.stopPropagation();
        setEditingId(conv.id);
        setEditText(conv.title);
    }, []);
    
    const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        dispatch({ type: 'DELETE_CONVERSATION', payload: { id } });
    }, [dispatch]);
    
    const handleNew = useCallback(() => {
        dispatch({ type: 'NEW_CONVERSATION', payload: { provider: settings.defaultProvider } });
    }, [dispatch, settings.defaultProvider]);
    
    const handleSelect = useCallback((id: string) => {
        dispatch({ type: 'SELECT_CONVERSATION', payload: { id } });
    }, [dispatch]);

    const handleAddWorkspace = useCallback((e: FormEvent) => {
        e.preventDefault();
        if (newWorkspaceName.trim()) {
            dispatch({ type: 'NEW_WORKSPACE', payload: { name: newWorkspaceName.trim() } });
            setNewWorkspaceName('');
            setIsAddingWorkspace(false);
            setIsWorkspaceOpen(false); // Close after adding
        }
    }, [dispatch, newWorkspaceName]);

    const handleSetTooltip = useCallback((data: { conv: Conversation; rect: DOMRect } | null) => {
        setTooltipData(data);
    }, []);

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
            <div className={`p-2 border-b border-stone-300 dark:border-slate-800/50 transition-opacity duration-200 flex flex-col ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative">
                    <button ref={workspaceButtonRef} onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen) } className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-50/50 dark:bg-slate-800/50 hover:bg-stone-100 dark:hover:bg-slate-800/80 border border-stone-400 dark:border-slate-700 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <FolderIcon className="h-5 w-5 text-stone-600 dark:text-slate-400 flex-shrink-0" />
                            <span className="font-semibold text-sm text-stone-800 dark:text-slate-200 truncate">{activeWorkspace?.name || '...'}</span>
                        </div>
                        <ChevronDownIcon className={`h-4 w-4 text-stone-500 dark:text-slate-500 transition-transform ${isWorkspaceOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`grid transition-all duration-300 ease-in-out ${isWorkspaceOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className={`overflow-hidden transition-all duration-300 ${isWorkspaceOpen ? 'mt-2' : 'mt-0'}`}>
                        <div className="bg-stone-200/50 dark:bg-slate-800/50 rounded-lg p-2 space-y-1 border border-stone-300 dark:border-slate-700/60">
                            {workspaces.map(ws => (
                                confirmingDeleteId === ws.id ? (
                                    <div key={ws.id} className="flex items-center justify-between w-full p-1.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 animate-fade-in" style={{ animationDuration: '200ms' }}>
                                        <span className="text-xs font-semibold px-1">確定要刪除嗎？</span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    dispatch({ type: 'DELETE_WORKSPACE', payload: { id: ws.id } });
                                                    setIsWorkspaceOpen(false);
                                                }}
                                                className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                                            >
                                                是
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmingDeleteId(null);
                                                }}
                                                className="px-2 py-0.5 text-xs font-semibold text-stone-700 dark:text-slate-300 bg-stone-300 dark:bg-slate-600 rounded hover:bg-stone-400 dark:hover:bg-slate-500 transition-colors"
                                            >
                                                否
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                <div key={ws.id} className="group flex items-center justify-between w-full rounded">
                                    <button onClick={() => {
                                        dispatch({ type: 'SELECT_WORKSPACE', payload: { id: ws.id } });
                                        setIsWorkspaceOpen(false);
                                    }} className={`flex-grow text-left p-2 text-sm rounded-l transition-colors ${ws.id === activeWorkspaceId ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)] font-bold' : 'hover:bg-stone-300/80 dark:hover:bg-slate-700/80'}`}>
                                        {ws.name}
                                    </button>
                                    {workspaces.length > 1 && (
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmingDeleteId(ws.id);
                                        }} className={`p-2 rounded-r transition-colors opacity-0 group-hover:opacity-100 ${ws.id === activeWorkspaceId ? 'bg-[var(--accent-color)]/20 hover:bg-red-500/20' : 'hover:bg-red-500/10'}`}>
                                            <TrashIcon className="h-4 w-4 text-stone-500 dark:text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400" />
                                        </button>
                                    )}
                                </div>
                                )
                            ))}
                             <div className="border-t border-stone-300 dark:border-slate-700/60 my-1"></div>
                            {isAddingWorkspace ? (
                                <form onSubmit={handleAddWorkspace} className="flex items-center gap-2 p-1 animate-fade-in">
                                    <input
                                        type="text"
                                        value={newWorkspaceName}
                                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                                        placeholder="新的工作區名稱..."
                                        autoFocus
                                        className="flex-grow min-w-0 bg-stone-50/50 dark:bg-slate-800/50 border border-stone-400 dark:border-slate-700 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition"
                                    />
                                    <button type="submit" className="p-1.5 rounded-md text-stone-600 dark:text-slate-300 bg-stone-200 hover:bg-stone-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors" aria-label="新增工作區">
                                        <PlusIcon className="h-4 w-4" />
                                    </button>
                                </form>
                            ) : (
                                <button 
                                    onClick={() => setIsAddingWorkspace(true)} 
                                    className="w-full flex items-center justify-center gap-2 p-2 rounded-md hover:bg-stone-300/80 dark:hover:bg-slate-700/80 transition-colors text-sm text-stone-600 dark:text-slate-300"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    <span>新增工作區</span>
                                </button>
                            )}
                        </div>
                        </div>
                    </div>
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
                            return (
                               <ConversationItem
                                 key={conv.id}
                                 conv={conv}
                                 isActive={activeConversationId === conv.id && editingId !== conv.id}
                                 isEditing={editingId === conv.id}
                                 editText={editText}
                                 setEditText={setEditText}
                                 onSelect={handleSelect}
                                 onStartEditing={startEditing}
                                 onRename={handleRename}
                                 onDelete={handleDelete}
                                 onKeyDown={handleKeyDown}
                                 onSetTooltip={handleSetTooltip}
                                 itemRef={(node) => {
                                     if (node) itemRefs.current.set(conv.id, node);
                                     else itemRefs.current.delete(conv.id);
                                 }}
                                 inputRef={inputRef}
                                 animationIndex={index}
                               />
                            )
                        })}
                    </ul>
                </nav>
            </div>
            {tooltipData && (
                <Portal>
                    <div
                        className="fixed w-max max-w-xs p-3 bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 text-xs rounded-lg shadow-lg z-50 border border-stone-300 dark:border-slate-700 animate-fade-in"
                        style={{
                            animationDuration: '150ms',
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

interface ConversationItemProps {
    conv: Conversation;
    isActive: boolean;
    isEditing: boolean;
    editText: string;
    setEditText: (text: string) => void;
    onSelect: (id: string) => void;
    onStartEditing: (e: React.MouseEvent, conv: Conversation) => void;
    onRename: (id: string) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, id: string) => void;
    onSetTooltip: (data: { conv: Conversation; rect: DOMRect } | null) => void;
    itemRef: (node: HTMLLIElement | null) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    animationIndex: number;
}

const ConversationItem = React.memo<ConversationItemProps>(({
    conv, isActive, isEditing, editText, setEditText, onSelect, onStartEditing,
    onRename, onDelete, onKeyDown, onSetTooltip, itemRef, inputRef, animationIndex
}) => {
    const turnCount = Math.ceil(conv.history.length / 2);                            
    const subtitle = `${turnCount} 回合 • ${MODES[conv.mode]?.name || conv.mode}`;

    return (
        <li 
          ref={itemRef}
          onMouseEnter={(e) => onSetTooltip({ conv, rect: e.currentTarget.getBoundingClientRect() })}
          onMouseLeave={() => onSetTooltip(null)}
          className="relative group animate-fade-in-up" 
          style={{ animationDelay: `${animationIndex * 30}ms`, opacity: 0 }}
        >
            <button
                onClick={() => !isEditing && onSelect(conv.id)}
                className={`w-full relative flex items-center gap-3 p-2 rounded-lg text-left transition-all duration-200 transform-gpu ${
                    isActive
                    ? 'text-white' 
                    : isEditing
                    ? 'bg-stone-100/80 dark:bg-slate-700/80 ring-1 ring-[var(--accent-color)]'
                    : 'text-stone-700 dark:text-slate-400 hover:bg-stone-100/70 dark:hover:bg-slate-800/70 hover:translate-x-1'
                }`}
            >
                <MessageSquareIcon className="h-5 w-5 flex-shrink-0 ml-1" />
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => onRename(conv.id)}
                        onKeyDown={(e) => onKeyDown(e, conv.id)}
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
                                onClick={(e) => onStartEditing(e, conv)}
                                className={`p-1.5 rounded-md transition-all duration-150 hover:scale-110 active:scale-95 ${isActive ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-stone-600 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'}`}
                                aria-label={`重新命名 ${conv.title}`}
                            >
                                <EditIcon className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={(e) => onDelete(e, conv.id)}
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
    );
});