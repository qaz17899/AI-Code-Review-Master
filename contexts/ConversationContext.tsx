import React, { createContext, useReducer, useContext, useEffect, ReactNode, Dispatch } from 'react';
import type { Conversation, ConversationAction, ApiProvider } from '../types';

interface ConversationState {
    conversations: Conversation[];
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
                conversations: action.payload.conversations,
                activeConversationId: action.payload.activeId,
            };
        case 'NEW_CONVERSATION': {
            const newConversation: Conversation = {
                id: crypto.randomUUID(),
                title: '新的對話',
                history: [],
                mode: 'REVIEW',
                provider: action.payload.provider,
                createdAt: Date.now(),
            };
            const newConversations = [newConversation, ...state.conversations];
            return {
                ...state,
                conversations: newConversations,
                activeConversationId: newConversation.id,
            };
        }
        case 'SELECT_CONVERSATION': {
            if (state.conversations.some(c => c.id === action.payload.id)) {
                return { ...state, activeConversationId: action.payload.id };
            }
            return state;
        }
        case 'DELETE_CONVERSATION': {
            const newConversations = state.conversations.filter(c => c.id !== action.payload.id);
            let newActiveId = state.activeConversationId;
            if (state.activeConversationId === action.payload.id) {
                newActiveId = newConversations.length > 0 ? newConversations[0].id : null;
                if (!newActiveId) {
                     const newConversation: Conversation = {
                        id: crypto.randomUUID(),
                        title: '新的對話',
                        history: [],
                        mode: 'REVIEW',
                        provider: 'gemini', // Fallback provider
                        createdAt: Date.now(),
                    };
                    newConversations.push(newConversation);
                    newActiveId = newConversation.id;
                }
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
        conversations: [],
        activeConversationId: null,
    });

    // Load from localStorage on initial render
    useEffect(() => {
        try {
            const savedConversations = localStorage.getItem('conversations');
            const savedActiveId = localStorage.getItem('activeConversationId');
            if (savedConversations) {
                const parsedConversations: Conversation[] = JSON.parse(savedConversations);
                const activeId = savedActiveId && parsedConversations.some(c => c.id === savedActiveId)
                    ? savedActiveId
                    : parsedConversations.length > 0 ? parsedConversations[0].id : null;
                
                dispatch({ type: 'LOAD_STATE', payload: { conversations: parsedConversations, activeId } });
                
                if (!activeId && parsedConversations.length === 0) {
                    dispatch({ type: 'NEW_CONVERSATION', payload: { provider: 'gemini' } });
                }

            } else {
                dispatch({ type: 'NEW_CONVERSATION', payload: { provider: 'gemini' } });
            }
        } catch (error) {
            console.error("Failed to load conversations from localStorage:", error);
            dispatch({ type: 'NEW_CONVERSATION', payload: { provider: 'gemini' } });
        }
    }, []);

    // Save to localStorage whenever state changes
    useEffect(() => {
        if (state.conversations.length > 0) {
            try {
                // Sanitize conversations before saving to prevent storing large file/image data
                const conversationsToSave = state.conversations.map(conv => ({
                    ...conv,
                    history: conv.history.map(msg => {
                        // Create a new message object excluding files and images
                        const { files, images, ...restOfMsg } = msg;
                        return restOfMsg;
                    })
                }));
                localStorage.setItem('conversations', JSON.stringify(conversationsToSave));
            } catch (error) {
                console.error("Failed to save conversations to localStorage, it might be full:", error);
            }
        }
        if (state.activeConversationId) {
            localStorage.setItem('activeConversationId', state.activeConversationId);
        }
    }, [state.conversations, state.activeConversationId]);

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