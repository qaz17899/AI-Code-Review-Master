import type { Chat } from '@google/genai';

export type ReviewMode = 'REVIEW' | 'BUGFIX' | 'REFACTOR' | 'Q&A' | 'OPTIMIZE' | 'DESIGNER' | 'TESTER' | 'DESIGN' | 'IMPLEMENT' | 'ENHANCE' | 'SIMPLIFY' | 'BALANCE' | 'VERIFY' | 'SCALE' | 'SECURITY' | 'DOCS' | 'CONSOLIDATE' | 'WORKFLOW' | 'POLISH' | 'INSIGHT' | 'BLUEPRINT';
export type ApiProvider = 'gemini' | 'openai';

export interface AppFile {
  name: string;
  path: string;
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  files?: AppFile[];
  images?: string[]; // For pasted image data (base64)
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  generationTimeMs?: number;
}

export interface Workspace {
  id: string;
  name: string;
  // files: AppFile[]; // Future feature: workspace-level files
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  history: ChatMessage[];
  mode: ReviewMode;
  provider: ApiProvider;
  createdAt: number;
  workspaceId: string;
}

export type ConversationAction =
  | { type: 'LOAD_STATE'; payload: { workspaces: Workspace[]; conversations: Conversation[]; activeWorkspaceId: string | null; activeConversationId: string | null } }
  | { type: 'NEW_CONVERSATION'; payload: { provider: ApiProvider } }
  | { type: 'SELECT_CONVERSATION'; payload: { id: string } }
  | { type: 'DELETE_CONVERSATION'; payload: { id: string } }
  | { type: 'RENAME_CONVERSATION'; payload: { id:string; title: string } }
  | { type: 'UPDATE_CONVERSATION'; payload: { conversation: Conversation } }
  | { type: 'NEW_WORKSPACE'; payload: { name: string } }
  | { type: 'SELECT_WORKSPACE'; payload: { id: string } }
  | { type: 'DELETE_WORKSPACE'; payload: { id: string } };

export interface ApiSettings {
    geminiApiKey: string;
    geminiProxyUrl: string;
    geminiModelId: string;
    openaiApiKey: string;
    openaiProxyUrl:string;
    openaiModelId: string;
    defaultProvider: ApiProvider;
    forceDiff: boolean;
}