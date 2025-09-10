import type { ChatMessage, AppFile, ApiSettings } from '../types';
import { handleSseStream } from '../utils';

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | (string | { type: 'image_url', image_url: { url: string } })[];
}

export const listModels = async (settings: ApiSettings): Promise<string[]> => {
    const apiKey = settings.openaiApiKey;
    if (!apiKey) {
        throw new Error("OpenAI API key is required to list models.");
    }
    const endpoint = settings.openaiProxyUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
    const url = `${endpoint}/models`;
    
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch OpenAI models: ${response.statusText} - ${errorBody}`);
    }
    const data = await response.json();
    return data.data.map((model: any) => model.id).sort();
};

export const countResponseTokens = async (
    text: string,
    // settings is unused but included for interface consistency with geminiService
    settings: ApiSettings
): Promise<number> => {
    // OpenAI token counting on the client is complex without a library like tiktoken.
    // We'll use a rough estimation (4 chars ~ 1 token).
    return Promise.resolve(Math.ceil(text.length / 4));
};

export const countInputTokens = async (
    files: AppFile[],
    userMessage: string,
    images: string[],
    // settings is unused but included for interface consistency with geminiService
    settings: ApiSettings
): Promise<number> => {
    // This is a rough estimation. For accurate counting, a client-side tokenizer like tiktoken is needed.
    const fileText = files.map(f => f.content).join('\n');
    const totalText = fileText + '\n' + userMessage;
    const imageTokenCost = images.length * 85; // OpenAI's cost for low-res images
    return Promise.resolve(Math.ceil(totalText.length / 4) + imageTokenCost);
}


export async function* generateOpenAIChatStream(
    history: ChatMessage[],
    files: AppFile[],
    userMessage: string,
    images: string[],
    masterPrompt: string,
    signal: AbortSignal,
    settings: ApiSettings
): AsyncGenerator<string> {
    try {
        const apiKey = settings.openaiApiKey;
        if (!apiKey) {
            throw new Error("OpenAI API key is required.");
        }
        const endpoint = settings.openaiProxyUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
        const url = `${endpoint}/chat/completions`;

        const messages: OpenAIMessage[] = [];
        
        messages.push({ role: 'system', content: masterPrompt });

        history.forEach(msg => {
            messages.push({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.content });
        });

        const userContent: (string | { type: 'image_url', image_url: { url: string } })[] = [];
        
        let fileText = '';
        if (files.length > 0) {
            fileText = files.map(f => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
        }
        
        const fullUserMessage = [fileText, userMessage].filter(Boolean).join('\n\n');
        if (fullUserMessage) {
            userContent.push(fullUserMessage);
        }
        
        images.forEach(imgDataUrl => {
            userContent.push({ type: 'image_url', image_url: { url: imgDataUrl } });
        });
        
        messages.push({ role: 'user', content: userContent });
        
        const body = {
            model: settings.openaiModelId || 'gpt-4o',
            messages,
            stream: true,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok || !response.body) {
            const errorBody = await response.text();
            throw new Error(`OpenAI API request failed: ${response.statusText} - ${errorBody}`);
        }

        // Use the generic SSE stream handler
        const parser = (jsonStr: string) => {
            const parsed = JSON.parse(jsonStr);
            return parsed.choices?.[0]?.delta?.content;
        };

        yield* handleSseStream(response, parser);
        
    } catch (error) {
        // If the fetch was aborted by our controller, it's not a real error.
        // We just let the generator finish silently.
        if (error.name !== 'AbortError') {
            throw error;
        }
    }
}