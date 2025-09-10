import { generateGeminiChatStream, listModels as listGeminiModels, countResponseTokens as countGeminiResponseTokens, countInputTokens as countGeminiInputTokens } from './geminiService';
import { generateOpenAIChatStream, listModels as listOpenAIModels, countResponseTokens as countOpenAIResponseTokens, countInputTokens as countOpenAIInputTokens } from './openaiService';
import type { ApiProvider, ChatMessage, AppFile, ApiSettings } from '../types';
// FIX: Removed unused imports for Content and Part as data transformation is now handled within the geminiService.

interface GenerateChatStreamParams {
    provider: ApiProvider;
    history: ChatMessage[];
    files: AppFile[];
    userMessage: string;
    signal: AbortSignal;
    images: string[];
    masterPrompt: string;
    settings: ApiSettings;
}

// FIX: Removed redundant `chatHistoryToGeminiContent` function.
// The conversion from `ChatMessage[]` to `Content[]` is now correctly encapsulated within `geminiService.ts`.

export const listModels = async (provider: ApiProvider, settings: ApiSettings): Promise<string[]> => {
    if (provider === 'gemini') {
        return listGeminiModels(settings);
    } else if (provider === 'openai') {
        return listOpenAIModels(settings);
    }
    throw new Error(`Unsupported AI provider for listing models: ${provider}`);
};

export const countResponseTokens = async (
    provider: ApiProvider,
    text: string,
    settings: ApiSettings
): Promise<number> => {
    if (provider === 'gemini') {
        return countGeminiResponseTokens(text, settings);
    } else if (provider === 'openai') {
        return countOpenAIResponseTokens(text, settings);
    }
    throw new Error(`Unsupported AI provider for token counting: ${provider}`);
};

export const countInputTokens = async (
    provider: ApiProvider,
    files: AppFile[],
    userMessage: string,
    images: string[],
    settings: ApiSettings
): Promise<number> => {
    if (provider === 'gemini') {
        return countGeminiInputTokens(files, userMessage, images, settings);
    } else if (provider === 'openai') {
        return countOpenAIInputTokens(files, userMessage, images, settings);
    }
    throw new Error(`Unsupported AI provider for input token counting: ${provider}`);
};

export async function* generateChatStream({
    provider,
    history,
    files,
    userMessage,
    signal,
    images,
    masterPrompt,
    settings
}: GenerateChatStreamParams): AsyncGenerator<string> {
    if (provider === 'gemini') {
        // FIX: Passed the original `history` (ChatMessage[]) to `generateGeminiChatStream`.
        // The service dispatcher (`aiService`) should not perform provider-specific data transformations.
        // This is now correctly handled within `geminiService`, resolving the type mismatch error.
        yield* generateGeminiChatStream(history, files, userMessage, images, masterPrompt, signal, settings);
    } else if (provider === 'openai') {
        yield* generateOpenAIChatStream(history, files, userMessage, images, masterPrompt, signal, settings);
    } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
}