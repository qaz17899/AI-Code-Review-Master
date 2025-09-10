import React, { createContext, useReducer, useContext, useEffect, ReactNode, Dispatch } from 'react';
import type { Conversation, ConversationAction, ApiProvider, Workspace } from '../types';

interface ConversationState {
    workspaces: Workspace[];
    conversations: Conversation[];
    activeWorkspaceId: string | null;
    activeConversationId: string | null;
    activeConversation: Conversation | null;
    dispatch: Dispatch<ConversationAction>;
}

const ConversationContext = createContext<ConversationState | undefined>(undefined);

const conversationReducer = (state: Omit<ConversationState, 'dispatch' | 'activeConversation'>, action: ConversationAction): Omit<ConversationState, 'dispatch' | 'activeConversation'> => {
    switch (action.type) {
        case 'LOAD_STATE':
            return {
                ...state,
                workspaces: action.payload.workspaces,
                conversations: action.payload.conversations,
                activeWorkspaceId: action.payload.activeWorkspaceId,
                activeConversationId: action.payload.activeConversationId,
            };
        case 'NEW_WORKSPACE': {
            const newWorkspace: Workspace = {
                id: crypto.randomUUID(),
                name: action.payload.name,
                createdAt: Date.now(),
            };
            const newWorkspaces = [newWorkspace, ...state.workspaces];
            return {
                ...state,
                workspaces: newWorkspaces,
                activeWorkspaceId: newWorkspace.id,
                activeConversationId: null, // Switch to the new workspace, no active conversation initially
            };
        }
        case 'SELECT_WORKSPACE': {
            if (state.workspaces.some(w => w.id === action.payload.id)) {
                 const conversationsInWorkspace = state.conversations.filter(c => c.workspaceId === action.payload.id);
                 const latestConversation = conversationsInWorkspace.sort((a,b) => b.createdAt - a.createdAt)[0];
                return { 
                    ...state, 
                    activeWorkspaceId: action.payload.id,
                    activeConversationId: latestConversation ? latestConversation.id : null,
                };
            }
            return state;
        }
        case 'NEW_CONVERSATION': {
            if (!state.activeWorkspaceId) return state; // Cannot create conversation without a workspace
            const newConversation: Conversation = {
                id: crypto.randomUUID(),
                title: '新的對話',
                history: [],
                mode: 'REVIEW',
                provider: action.payload.provider,
                createdAt: Date.now(),
                workspaceId: state.activeWorkspaceId,
            };
            const newConversations = [newConversation, ...state.conversations];
            return {
                ...state,
                conversations: newConversations,
                activeConversationId: newConversation.id,
            };
        }
        case 'SELECT_CONVERSATION': {
            const conv = state.conversations.find(c => c.id === action.payload.id);
            if (conv) {
                return { 
                    ...state, 
                    activeWorkspaceId: conv.workspaceId, // Also switch workspace if selecting a convo from another
                    activeConversationId: action.payload.id 
                };
            }
            return state;
        }
        case 'DELETE_CONVERSATION': {
            const conversationToDelete = state.conversations.find(c => c.id === action.payload.id);
            if (!conversationToDelete) return state;

            const newConversations = state.conversations.filter(c => c.id !== action.payload.id);
            let newActiveId = state.activeConversationId;

            if (state.activeConversationId === action.payload.id) {
                // Find the latest conversation in the same workspace
                const remainingInWorkspace = newConversations
                    .filter(c => c.workspaceId === conversationToDelete.workspaceId)
                    .sort((a, b) => b.createdAt - a.createdAt);
                newActiveId = remainingInWorkspace.length > 0 ? remainingInWorkspace[0].id : null;
            }
            return {
                ...state,
                conversations: newConversations,
                activeConversationId: newActiveId,
            };
        }
        case 'RENAME_CONVERSATION': {
            const newConversations = state.conversations.map(c => 
                c.id === action.payload.id ? { ...c, title: action.payload.title.trim() ? action.payload.title.trim() : 'Untitled Conversation' } : c
            );
            return { ...state, conversations: newConversations };
        }
        case 'UPDATE_CONVERSATION': {
            const newConversations = state.conversations.map(c => 
                c.id === action.payload.conversation.id ? action.payload.conversation : c
            );
            return { ...state, conversations: newConversations };
        }
        default:
            return state;
    }
};

export const ConversationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(conversationReducer, {
        workspaces: [],
        conversations: [],
        activeWorkspaceId: null,
        activeConversationId: null,
    });

    // Load from localStorage on initial render
    useEffect(() => {
        try {
            const savedWorkspaces = localStorage.getItem('workspaces');
            const savedConversations = localStorage.getItem('conversations');
            const savedActiveWorkspaceId = localStorage.getItem('activeWorkspaceId');
            const savedActiveConversationId = localStorage.getItem('activeConversationId');

            let workspaces: Workspace[] = savedWorkspaces ? JSON.parse(savedWorkspaces) : [];
            let conversations: Conversation[] = savedConversations ? JSON.parse(savedConversations) : [];
            let activeWorkspaceId = savedActiveWorkspaceId;
            let activeConversationId = savedActiveConversationId;

            // Migration logic for users from previous versions
            if (workspaces.length === 0 && conversations.length > 0 && !conversations[0].workspaceId) {
                console.log("Migrating old conversation data to new workspace structure...");
                const defaultWorkspace: Workspace = {
                    id: crypto.randomUUID(),
                    name: "預設工作區",
                    createdAt: Date.now()
                };
                workspaces = [defaultWorkspace];
                conversations = conversations.map(c => ({ ...c, workspaceId: defaultWorkspace.id }));
                activeWorkspaceId = defaultWorkspace.id;
            }

            if (workspaces.length === 0) {
                const defaultWorkspace: Workspace = { id: crypto.randomUUID(), name: "我的工作區", createdAt: Date.now() };
                workspaces = [defaultWorkspace];
                activeWorkspaceId = defaultWorkspace.id;
                
                const defaultConversation: Conversation = {
                    id: crypto.randomUUID(),
                    title: '新的對話',
                    history: [],
                    mode: 'REVIEW',
                    provider: 'gemini',
                    createdAt: Date.now(),
                    workspaceId: defaultWorkspace.id,
                };
                conversations = [defaultConversation];
                activeConversationId = defaultConversation.id;
            }
            
            // Validate active IDs
            const finalActiveWorkspaceId = workspaces.some(w => w.id === activeWorkspaceId) ? activeWorkspaceId : workspaces[0]?.id || null;
            const finalActiveConversationId = conversations.some(c => c.id === activeConversationId && c.workspaceId === finalActiveWorkspaceId) 
                ? activeConversationId 
                : conversations.filter(c => c.workspaceId === finalActiveWorkspaceId).sort((a,b) => b.createdAt - a.createdAt)[0]?.id || null;

            dispatch({ type: 'LOAD_STATE', payload: { 
                workspaces, 
                conversations, 
                activeWorkspaceId: finalActiveWorkspaceId, 
                activeConversationId: finalActiveConversationId 
            }});

        } catch (error) {
            console.error("Failed to load state from localStorage:", error);
            // Initialize with a fresh state on error
             const defaultWorkspace: Workspace = { id: crypto.randomUUID(), name: "我的工作區", createdAt: Date.now() };
             dispatch({ type: 'LOAD_STATE', payload: { 
                workspaces: [defaultWorkspace], 
                conversations: [],
                activeWorkspaceId: defaultWorkspace.id, 
                activeConversationId: null 
            }});
        }
    }, []);

    // Save to localStorage whenever state changes
    useEffect(() => {
        if (state.workspaces.length === 0) return; // Don't save empty/initializing state
        try {
            // Sanitize conversations before saving
            const conversationsToSave = state.conversations.map(conv => {
                const { history, ...restOfConv } = conv;
                const sanitizedHistory = history.map(msg => {
                    const { files, images, ...restOfMsg } = msg;
                    return restOfMsg;
                });
                return { ...restOfConv, history: sanitizedHistory };
            });

            localStorage.setItem('workspaces', JSON.stringify(state.workspaces));
            localStorage.setItem('conversations', JSON.stringify(conversationsToSave));
            if (state.activeWorkspaceId) localStorage.setItem('activeWorkspaceId', state.activeWorkspaceId);
            if (state.activeConversationId) localStorage.setItem('activeConversationId', state.activeConversationId);
        } catch (error) {
            console.error("Failed to save state to localStorage:", error);
        }
    }, [state.workspaces, state.conversations, state.activeWorkspaceId, state.activeConversationId]);

    const activeConversation = state.conversations.find(c => c.id === state.activeConversationId) || null;

    return (
        <ConversationContext.Provider value={{ ...state, activeConversation, dispatch }}>
            {children}
        </ConversationContext.Provider>
    );
};

export const useConversation = () => {
    const context = useContext(ConversationContext);
    if (context === undefined) {
        throw new Error('useConversation must be used within a ConversationProvider');
    }
    return context;
};