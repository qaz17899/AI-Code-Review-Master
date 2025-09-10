// services/geminiService.ts
// FIX: Removed `ModelParams` as it's no longer exported from `@google/genai`.
import { GoogleGenAI, GenerateContentResponse, Content, Part, Type } from "@google/genai";
import type { AppFile, ApiSettings, ChatMessage } from '../types';
import { SCOPING_PROMPT } from '../components/constants';
import { handleSseStream } from '../utils';

function getClient(settings: ApiSettings): GoogleGenAI {
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API key is not configured. Please set it in the settings or configure the GEMINI_API_KEY environment variable.");
    }
    return new GoogleGenAI({ apiKey });
}

function chatHistoryToGeminiContent(history: ChatMessage[]): Content[] {
    return history.map(msg => {
        const parts: Part[] = [];
        if (msg.content) {
            parts.push({ text: msg.content });
        }
        if (msg.files) {
            msg.files.forEach(file => {
                parts.push({ text: `File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`` });
            });
        }
        if (msg.images) {
            msg.images.forEach(base64Image => {
                const [header, data] = base64Image.split(',');
                 const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
                 parts.push({
                     inlineData: {
                         mimeType,
                         data: data || header,
                     },
                 });
            });
        }
        return {
            role: msg.role as 'user' | 'model',
            parts,
        };
    });
}

const fileToPart = (file: AppFile): Part => ({
    text: `File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``,
});

const imageToPart = (base64Image: string): Part => {
    const [header, data] = base64Image.split(',');
    if (!data) {
        return {
            inlineData: {
                mimeType: 'image/png', // Guess for raw base64
                data: header,
            },
        };
    }
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    return {
        inlineData: {
            mimeType,
            data,
        },
    };
};

export const listModels = async (settings: ApiSettings): Promise<string[]> => {
    const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("API key is required to list models.");
    }

    const endpoint = settings.geminiProxyUrl?.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com';
    const url = `${endpoint}/v1beta/models?key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch Gemini models: ${response.statusText} - ${errorBody}`);
    }
    const data = await response.json();
    return data.models
        .filter((model: any) => model.supportedGenerationMethods.includes('generateContent'))
        .map((model: any) => model.name.replace('models/', ''))
        .sort((a: string, b: string) => a.localeCompare(b));
};


export const countInputTokens = async (
    files: AppFile[],
    userMessage: string,
    images: string[],
    settings: ApiSettings
): Promise<number> => {
    const ai = getClient(settings);
    // FIX: Replaced deprecated `getGenerativeModel().countTokens()` with direct `ai.models.countTokens()`.
    const modelName = settings.geminiModelId || 'gemini-2.5-pro';

    const parts: Part[] = [];
    if (userMessage) parts.push({ text: userMessage });
    parts.push(...files.map(fileToPart));
    parts.push(...images.map(imageToPart));

    const { totalTokens } = await ai.models.countTokens({
        model: modelName,
        contents: [{ role: 'user', parts }]
    });

    return totalTokens;
};

export const countResponseTokens = async (
    text: string,
    settings: ApiSettings
): Promise<number> => {
    const ai = getClient(settings);
    const modelName = settings.geminiModelId || 'gemini-2.5-pro';

    const { totalTokens } = await ai.models.countTokens({
        model: modelName,
        contents: [{ role: 'model', parts: [{ text }] }]
    });

    return totalTokens;
};

export const scopeRelevantFiles = async (
    files: AppFile[],
    userMessage: string,
    settings: ApiSettings
): Promise<string[]> => {
    if (files.length === 0) return [];
    
    const ai = getClient(settings);
    
    const fileList = files.map(f => `"${f.path}"`).join('\n');
    
    const prompt = SCOPING_PROMPT
        .replace('{USER_MESSAGE}', userMessage)
        .replace('{FILE_LIST}', fileList);
    
    const modelName = 'gemini-2.5-pro';
    
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        relevant_files: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                            },
                        },
                    },
                    required: ['relevant_files'],
                },
            }
        });

        const result = JSON.parse(response.text);
        
        if (result && Array.isArray(result.relevant_files)) {
            const validPaths = new Set(files.map(f => f.path));
            return result.relevant_files.filter((p: any): p is string => typeof p === 'string' && validPaths.has(p));
        }
    } catch (e) {
        console.error("Failed to scope relevant files:", e);
        // Fallback to selecting all files on error
        return files.map(f => f.path);
    }
    return [];
};


export const explainResponse = async (
    content: string,
    settings: ApiSettings
): Promise<{ explanation: string; suggestedQuestions: string[] }> => {
    const ai = getClient(settings);
    const modelName = 'gemini-2.5-pro';
    const prompt = `You are an AI programming tutor. A senior developer provided the following code review. Your task is to explain it clearly for a junior developer, focusing on the "why" behind the suggestions.

After the explanation, you MUST provide 3-4 follow-up questions a junior developer might ask. These questions should encourage deeper learning about related concepts.

The code review to explain:
---
${content}
---

Your response MUST be a valid JSON object. Do not include any other text or markdown formatting. The JSON object must have the following structure:
{
  "explanation": "Your detailed explanation here, in Markdown format.",
  "suggestedQuestions": [
    "A relevant follow-up question.",
    "Another interesting question.",
    "A third, insightful question."
  ]
}`;

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
        });

        const result = JSON.parse(response.text);
        if (result && typeof result.explanation === 'string' && Array.isArray(result.suggestedQuestions)) {
            return result;
        }
        // Fallback if JSON is not as expected
        return { explanation: response.text, suggestedQuestions: [] };
    } catch (error) {
        console.error("Failed to get structured explanation:", error);
        // Fallback on error, return the original content as explanation
        return { explanation: "抱歉，分析解說時發生錯誤。", suggestedQuestions: [] };
    }
};

export async function* generateExplanationStream(
    originalResponse: string,
    explanation: string,
    history: Array<{ role: 'user' | 'model', content: string }>,
    question: string,
    settings: ApiSettings
): AsyncGenerator<string> {
    const ai = getClient(settings);
    const modelName = 'gemini-2.5-pro';

    const contents: Content[] = [
        { role: 'user', parts: [{ text: `Original code review:\n${originalResponse}` }] },
        { role: 'model', parts: [{ text: explanation }] },
        ...history.map(h => ({
            role: h.role as 'user' | 'model',
            parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{text: question}] }
    ];
    
    const filteredContents = contents.filter(c => !(c.role === 'model' && c.parts.every(p => 'text' in p && !p.text)));

    const stream = await ai.models.generateContentStream({
        model: modelName,
        contents: filteredContents
    });

    for await (const chunk of stream) {
        yield chunk.text;
    }
}

async function* generateGeminiChatStreamWithProxy(
    contents: Content[],
    masterPrompt: string,
    signal: AbortSignal,
    settings: ApiSettings
): AsyncGenerator<string> {
    try {
        const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
        const endpoint = settings.geminiProxyUrl?.replace(/\/$/, '');
        if (!endpoint) {
            throw new Error("Proxy URL is not defined for manual fetch.");
        }

        const modelName = settings.geminiModelId || 'gemini-2.5-pro';
        const url = `${endpoint}/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`;
        
        const body: any = { contents };
        if (masterPrompt) {
            body.systemInstruction = { parts: [{ text: masterPrompt }] };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok || !response.body) {
            const errorBody = await response.text();
            throw new Error(`Proxy request failed: ${response.statusText} - ${errorBody}`);
        }

        // Use the generic SSE stream handler
        const parser = (jsonStr: string) => {
            const parsed = JSON.parse(jsonStr);
            return parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        };

        yield* handleSseStream(response, parser);

    } catch (error) {
        if (error.name !== 'AbortError') throw error;
    }
}


export async function* generateGeminiChatStream(
    history: ChatMessage[],
    files: AppFile[],
    userMessage: string,
    images: string[],
    masterPrompt: string,
    signal: AbortSignal,
    settings: ApiSettings
): AsyncGenerator<string> {
    const geminiHistory = chatHistoryToGeminiContent(history);
    
    const userParts: Part[] = [];
    if (files.length > 0) userParts.push(...files.map(fileToPart));
    if (images.length > 0) userParts.push(...images.map(imageToPart));
    if (userMessage) userParts.push({ text: userMessage });
    
    const contents: Content[] = [...geminiHistory];
    if (userParts.length > 0) {
        contents.push({ role: 'user', parts: userParts });
    }

    // Use proxy if URL is provided
    if (settings.geminiProxyUrl) {
        yield* generateGeminiChatStreamWithProxy(contents, masterPrompt, signal, settings);
        return;
    }
    
    // Otherwise, use the SDK
    const ai = getClient(settings);
    const modelName = settings.geminiModelId || 'gemini-2.5-pro';

    // FIX: The `signal` property is not a valid property on the `GenerateContentParameters` type.
    // This removes the property to resolve the compilation error. Cancellation for direct
    // SDK calls is handled by the consuming loop checking the signal status.
    const stream = await ai.models.generateContentStream({
        model: modelName,
        contents: contents,
        config: {
            systemInstruction: masterPrompt,
        }
    });

    for await (const chunk of stream) {
        yield chunk.text;
    }
}