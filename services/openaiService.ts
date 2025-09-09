import type { ChatMessage, AppFile, ApiSettings } from '../types';

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
    text: string
): Promise<number> => {
    // OpenAI token counting on the client is complex without a library like tiktoken.
    // We'll use a rough estimation (4 chars ~ 1 token).
    return Promise.resolve(Math.ceil(text.length / 4));
};


export async function* generateOpenAIChatStream(
    history: ChatMessage[],
    files: AppFile[],
    userMessage: string,
    images: string[],
    masterPrompt: string,
    settings: ApiSettings
): AsyncGenerator<string> {
    const controller = new AbortController();
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
            signal: controller.signal,
        });

        if (!response.ok || !response.body) {
            const errorBody = await response.text();
            throw new Error(`OpenAI API request failed: ${response.statusText} - ${errorBody}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    if (jsonStr.trim() === '[DONE]') {
                        return;
                    }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            yield delta;
                        }
                    } catch (e) {
                        console.error("Failed to parse OpenAI SSE chunk:", e, "Chunk:", jsonStr);
                    }
                }
            }
        }
    } finally {
        controller.abort();
    }
}