import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ResultDisplay } from './ResultDisplay';
import { generateChatStream, countResponseTokens, countInputTokens } from '../services/aiService';
import { scopeRelevantFiles } from '../services/geminiService';
import { PROMPTS, DIFF_INSTRUCTION } from './constants';
import type { ReviewMode, ChatMessage, AppFile, Conversation } from '../types';
import { StarIcon, MasterIcon } from './icons';
import { useConversation } from '../contexts/ConversationContext';
import { ModeSelectorGrid } from './ModeSelectorGrid';
import { FileManagementArea } from './FileManagementArea';
import { PromptInputArea } from './PromptInputArea';
import { useApiSettings } from '../contexts/ApiSettingsContext';
import { LoadingDisplay } from './LoadingDisplay';
import { MODE_DESCRIPTIONS } from './ModeIcons';
import { ModeExampleModal } from './ModeExampleModal';
import { WorkflowManager } from './WorkflowManager';


const ALL_SUPPORTED_TYPES = ['.py', '.yml', '.yaml', '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.zip'];

export const CodeReviewer: React.FC = () => {
  const { activeConversation, dispatch } = useConversation();
  const prevConversationIdRef = useRef(activeConversation?.id);
  
  const [files, setFiles] = useState<AppFile[]>([]);
  const [error, setError] = useState<string>('');
  const [submittingConversationId, setSubmittingConversationId] = useState<string | null>(null);
  
  const [userMessage, setUserMessage] = useState('');
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  const [acceptedTypes, setAcceptedTypes] = useState<string[]>(ALL_SUPPORTED_TYPES);
  
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [recommendedPaths, setRecommendedPaths] = useState<Set<string>>(new Set());
  const [isScoping, setIsScoping] = useState(false);

  const [inputTokenCount, setInputTokenCount] = useState<number | null>(null);
  const [isCountingTokens, setIsCountingTokens] = useState(false);
  const { settings } = useApiSettings();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [exampleModalMode, setExampleModalMode] = useState<ReviewMode | null>(null);

  const conversation = activeConversation;
  const mode = conversation?.mode || 'REVIEW';
  const provider = conversation?.provider || 'gemini';

  const isSubmitting = submittingConversationId !== null;
  const onUpdateConversation = (conversation: Conversation) => {
    dispatch({ type: 'UPDATE_CONVERSATION', payload: { conversation } });
  }

  useEffect(() => {
    // If the conversation has changed (i.e., different ID)
    if (prevConversationIdRef.current !== conversation?.id) {
      // And the new conversation is empty (no history)
      if (conversation?.history.length === 0) {
        // Then reset the form state
        setFiles([]);
        setError('');
        setUserMessage('');
        setPastedImages([]);
        setSelectedFilePaths(new Set());
        setRecommendedPaths(new Set());
        setInputTokenCount(null);
      }
      // Update the ref to track the current conversation ID for the next run
      prevConversationIdRef.current = conversation?.id;
    }
  }, [conversation]);
  
  // Debounced token counting for initial prompt
  useEffect(() => {
    const filesToCount = files.filter(f => selectedFilePaths.has(f.path));
    const hasInput = filesToCount.length > 0 || pastedImages.length > 0 || userMessage.trim();
    
    if (!hasInput) {
        setInputTokenCount(null);
        return;
    }

    const handler = setTimeout(async () => {
        setIsCountingTokens(true);
        try {
            const count = await countInputTokens(provider, filesToCount, userMessage, pastedImages, settings);
            setInputTokenCount(count);
        } catch (error) {
            console.error("Error counting tokens for input:", error);
            setInputTokenCount(null);
        } finally {
            setIsCountingTokens(false);
        }
    }, 500);

    return () => {
        clearTimeout(handler);
    };
  }, [selectedFilePaths, files, userMessage, pastedImages, settings, provider]);
  
  // Effect to filter files when accepted types change
  useEffect(() => {
    setFiles(currentFiles => {
      if (currentFiles.length === 0) return currentFiles;

      const updatedFiles = currentFiles.filter(file =>
        acceptedTypes.some(type => file.name.endsWith(type) || type === '.zip')
      );

      if (updatedFiles.length !== currentFiles.length) {
        const updatedFilePaths = new Set(updatedFiles.map(f => f.path));
        setSelectedFilePaths(prevSelected => {
          const newSelected = new Set<string>();
          for (const path of prevSelected) {
            if (updatedFilePaths.has(path)) {
              newSelected.add(path);
            }
          }
          return newSelected;
        });
        return updatedFiles;
      }
      return currentFiles;
    });
  }, [acceptedTypes, setFiles, setSelectedFilePaths]);


    const handleStreamingResponse = useCallback(async (
        stream: AsyncGenerator<string>,
        initialConversation: Conversation,
        promptTokenCount: number,
        startTime: number
    ) => {
        // The conversation history from the previous turn. This is a stable reference.
        const previousHistory = initialConversation.history.slice(0, -1);
    
        let finalContent = '';
        for await (const chunk of stream) {
            // The abort is now handled by the fetch signal, but this is a good safeguard.
            if (abortControllerRef.current?.signal.aborted) {
                console.log("User aborted generation.");
                break;
            }
            finalContent += chunk;
            
            // Efficiently update only the last message for streaming UI updates.
            // This avoids deep copying the entire history on every chunk.
            const streamingModelMessage: ChatMessage = { role: 'model', content: finalContent };
            const streamingHistory = [...previousHistory, streamingModelMessage];
            const conversationUpdate: Conversation = {
                ...initialConversation,
                history: streamingHistory,
            };
            onUpdateConversation(conversationUpdate);
        }
    
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        let responseTokens = 0;
        try {
            responseTokens = await countResponseTokens(provider, finalContent, settings);
        } catch (e) {
            console.error("Failed to count response tokens:", e);
        }
    
        const finalContentWithStatus = abortControllerRef.current?.signal.aborted
            ? (finalContent + '\n\n*<生成已由使用者中止>*')
            : finalContent;
    
        const finalModelMessage: ChatMessage = {
            role: 'model',
            content: finalContentWithStatus,
            generationTimeMs: duration,
            usageMetadata: {
                promptTokenCount: promptTokenCount,
                candidatesTokenCount: responseTokens,
                totalTokenCount: promptTokenCount + responseTokens,
            },
        };
        
        // Final update with all metadata.
        const finalConversation: Conversation = {
            ...initialConversation,
            history: [...previousHistory, finalModelMessage],
        };
        onUpdateConversation(finalConversation);
    
    }, [onUpdateConversation, provider, settings]);

  const handleSubmit = async (isFollowUp: boolean, followUpPayload?: { files: AppFile[], message: string, images: string[] }) => {
    const filesToSubmit = isFollowUp ? followUpPayload!.files : files.filter(f => selectedFilePaths.has(f.path));
    const messageToSend = isFollowUp ? followUpPayload!.message : userMessage;
    const imagesToSend = isFollowUp ? followUpPayload!.images : pastedImages;

    if (!isFollowUp && filesToSubmit.length === 0 && imagesToSend.length === 0) {
      setError("請至少選擇一個檔案或貼上一張圖片進行審查。");
      return;
    }
    
    const historyForAPI = isFollowUp ? [...conversation!.history] : [];
    const userMessagePayload: ChatMessage = { role: 'user', content: messageToSend, files: filesToSubmit, images: imagesToSend };
    const modelMessagePayload: ChatMessage = { role: 'model', content: '' };
    const updatedHistory = [...conversation!.history, userMessagePayload, modelMessagePayload];
    
    let updatedConversation: Conversation = { ...conversation!, history: updatedHistory };

    if (!isFollowUp) {
      if (conversation!.title === '新的對話' && messageToSend.trim()) {
          const newTitle = messageToSend.trim().substring(0, 40) + (messageToSend.trim().length > 40 ? '...' : '');
          updatedConversation.title = newTitle;
          dispatch({ type: 'RENAME_CONVERSATION', payload: { id: conversation!.id, title: newTitle } });
      } else if (conversation!.title === '新的對話' && filesToSubmit.length > 0) {
          const newTitle = `Review: ${filesToSubmit[0].name}`;
          updatedConversation.title = newTitle;
          dispatch({ type: 'RENAME_CONVERSATION', payload: { id: conversation!.id, title: newTitle } });
      }
    }
    onUpdateConversation(updatedConversation);

    await executeChatGeneration(
      historyForAPI,
      filesToSubmit,
      messageToSend,
      imagesToSend,
      updatedConversation
    );
  };

  const executeChatGeneration = async (
    historyForAPI: ChatMessage[],
    filesToSubmit: AppFile[],
    messageToSend: string,
    imagesToSend: string[],
    conversationForStreaming: Conversation
  ) => {
    if (!conversation) return;

    // If another request is running for another conversation, do not start
    if (isSubmitting && submittingConversationId !== conversation.id) {
        console.warn("Another submission is already in progress for a different conversation.");
        // Revert optimistic UI update if we don't proceed
        onUpdateConversation({ ...conversationForStreaming, history: historyForAPI });
        return;
    }

    abortControllerRef.current = new AbortController();
    setSubmittingConversationId(conversation.id);
    setError('');

    const startTime = performance.now();
    try {
        const masterPromptTemplate = PROMPTS[mode];
        const masterPrompt = settings.forceDiff ? `${masterPromptTemplate}\n\n${DIFF_INSTRUCTION}` : masterPromptTemplate;
        const promptTokenCount = await countInputTokens(provider, filesToSubmit, messageToSend, imagesToSend, settings);
        const signal = abortControllerRef.current.signal;

        const stream = await generateChatStream({
            provider,
            history: historyForAPI,
            files: filesToSubmit,
            userMessage: messageToSend,
            signal,
            images: imagesToSend,
            masterPrompt,
            settings
        });
        
        await handleStreamingResponse(stream, conversationForStreaming, promptTokenCount, startTime);

    } catch (err) {
        console.error("Error during chat generation:", err);
        const errorMessage = err instanceof Error ? err.message : '與 AI 通訊時發生錯誤';
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
            setError(errorMessage);
            const currentHistory = [...conversationForStreaming.history];
            currentHistory[currentHistory.length - 1] = { role: 'model', content: `發生錯誤: ${errorMessage}` };
            onUpdateConversation({ ...conversationForStreaming, history: currentHistory });
        }
    } finally {
       abortControllerRef.current = null;
       setSubmittingConversationId(null);
    }
  }

  const onFollowUp = async (followUpFiles: AppFile[], message: string, images: string[]) => {
    await handleSubmit(true, { files: followUpFiles, message, images });
  };
  
  const handleStartReview = () => {
      handleSubmit(false);
  }

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    // 立即更新 UI 狀態，提供即時反饋
    setSubmittingConversationId(null);
  }, []);

  const handleDeleteFromTurn = (indexToDelete: number) => {
    if (!conversation) return;

    const isDeletingCurrentGenerationTurn = isSubmitting && indexToDelete >= conversation.history.length - 2;

    if (isDeletingCurrentGenerationTurn) {
        handleStopGeneration();
        setSubmittingConversationId(null);
    }

    // Remove the message at the target index and all subsequent messages
    const updatedHistory = conversation.history.slice(0, indexToDelete);

    const updatedConversation: Conversation = {
      ...conversation,
      history: updatedHistory,
    };

    // If we deleted all turns, reset the conversation title to be like a new one.
    if (updatedHistory.length === 0) {
      updatedConversation.title = '新的對話';
    }
    
    onUpdateConversation(updatedConversation);
  };

  const handleRegenerate = useCallback(async () => {
    if (!conversation || conversation.history.length < 1) return;

    // Find the last user message in the history for regeneration.
    // Using a reverse loop for broader JavaScript environment compatibility instead of findLastIndex.
    let lastUserMessageIndex = -1
    for (let i = conversation.history.length - 1; i >= 0; i--) {
      if (conversation.history[i].role === 'user') {
        lastUserMessageIndex = i
        break
      }
    }

    // If no user message exists, we can't regenerate.
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = conversation.history[lastUserMessageIndex];

    // History for the API call should include everything UP TO the last user message.
    // The user message itself will be the prompt.
    const historyForAPI = conversation.history.slice(0, lastUserMessageIndex);
    
    const { files, content: message, images } = lastUserMessage;
    const filesToSubmit = files || [];
    const messageToSend = message;
    const imagesToSend = images || [];

    // The new UI state will have the history up to the last user message, plus a new placeholder for the model.
    // This effectively replaces any model messages that might have come after it.
    const modelMessagePayload: ChatMessage = { role: 'model', content: '' };
    const updatedHistory = [...conversation.history.slice(0, lastUserMessageIndex + 1), modelMessagePayload];
    const updatedConversation: Conversation = { ...conversation, history: updatedHistory };
    onUpdateConversation(updatedConversation);

    await executeChatGeneration(
        historyForAPI,
        filesToSubmit,
        messageToSend,
        imagesToSend,
        updatedConversation
    );
  }, [conversation, provider, mode, settings, onUpdateConversation, handleStreamingResponse]);
  
    const handleAiScoping = async () => {
        if (files.length === 0) return;
        setIsScoping(true);
        setError('');
        try {
          const defaultMessage = "請對我上傳的檔案進行一次全面的程式碼審查。";
          let recommended = await scopeRelevantFiles(files, userMessage.trim() || defaultMessage, settings);
          if (recommended.length === 0 && files.length > 0) {
            recommended = files.map(f => f.path);
          }
          const recommendedSet = new Set(recommended);
          setRecommendedPaths(recommendedSet);
          setSelectedFilePaths(recommendedSet);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '分析檔案關聯性時發生錯誤';
          setError(errorMessage);
          setRecommendedPaths(new Set());
        } finally {
          setIsScoping(false);
        }
    };

  if (!conversation) {
    return (
        <>
            <ModeExampleModal mode={exampleModalMode} onClose={() => setExampleModalMode(null)} />
            <div className="w-full h-full flex items-center justify-center"><p>Loading conversation...</p></div>
        </>
    );
  }
  
  if (submittingConversationId === conversation.id && conversation.history.length === 0 && mode !== 'WORKFLOW') {
    const filesToReview = files.filter(f => selectedFilePaths.has(f.path));
    return (
        <>
            <ModeExampleModal mode={exampleModalMode} onClose={() => setExampleModalMode(null)} />
            <LoadingDisplay files={filesToReview} mode={mode} />
        </>
    );
  }

  if (conversation.history.length > 0) {
    return (
      <>
        <ModeExampleModal mode={exampleModalMode} onClose={() => setExampleModalMode(null)} />
        <main className="flex-grow min-h-0 h-full">
            <ResultDisplay
                history={conversation.history}
                onFollowUp={onFollowUp}
                isSubmitting={isSubmitting}
                onDeleteFromTurn={handleDeleteFromTurn}
                onRegenerate={handleRegenerate}
                onStopGeneration={handleStopGeneration}
                settings={settings}
            />
        </main>
      </>
    );
  }
  
  // Special view for Workflow mode when starting a new conversation
  if (mode === 'WORKFLOW') {
      return (
          <main className="flex-grow min-h-0 h-full overflow-y-auto custom-scrollbar">
              <WorkflowManager />
          </main>
      )
  }

  const renderContent = () => (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 pt-8 sm:pt-12 animate-fade-in flex flex-col gap-8">
      <div className={`relative bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 dark:ring-1 dark:ring-inset dark:ring-white/10 transition-all duration-300 shadow-lg shadow-stone-200/50 dark:shadow-none`}>
        <ModeSelectorGrid 
            currentMode={mode} 
            onModeChange={(newMode) => onUpdateConversation({ ...conversation, mode: newMode })} 
            onShowExample={setExampleModalMode}
        />
      </div>
      
      <div className={`relative bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 dark:ring-1 dark:ring-inset dark:ring-white/10 transition-all duration-300 shadow-lg shadow-stone-200/50 dark:shadow-none`}>
        <FileManagementArea
            files={files}
            setFiles={setFiles}
            acceptedTypes={acceptedTypes}
            setAcceptedTypes={setAcceptedTypes}
            selectedFilePaths={selectedFilePaths}
            setSelectedFilePaths={setSelectedFilePaths}
            recommendedPaths={recommendedPaths}
            setRecommendedPaths={setRecommendedPaths}
            isScoping={isScoping}
            onAiScoping={handleAiScoping}
            userMessage={userMessage}
            setError={setError}
        />
      </div>
      
      <div className="bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 dark:ring-1 dark:ring-inset dark:ring-white/10 shadow-lg shadow-stone-200/50 dark:shadow-none">
        <PromptInputArea 
          userMessage={userMessage}
          setUserMessage={setUserMessage}
          pastedImages={pastedImages}
          setPastedImages={setPastedImages}
          isCountingTokens={isCountingTokens}
          inputTokenCount={inputTokenCount}
        />
      </div>
      
      <div className={`relative transition-all duration-300`}>
          <button onClick={handleStartReview} disabled={(selectedFilePaths.size === 0 && pastedImages.length === 0) || isSubmitting} className="relative overflow-hidden w-full flex items-center justify-center gap-2 p-4 accent-gradient-bg text-white text-lg font-bold rounded-lg shadow-lg hover:shadow-xl hover:shadow-[var(--accent-color)]/20 transition-all duration-300 transform hover:-translate-y-px active:scale-[0.98] hover:brightness-105 active:brightness-110 disabled:from-stone-400 dark:disabled:from-slate-700 disabled:to-stone-300 dark:disabled:to-slate-600 disabled:text-stone-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none before:absolute before:inset-0 before:bg-white/20 before:transition-opacity before:opacity-0 hover:before:opacity-100 before:duration-500 before:ease-in-out dark:before:bg-black/20 before:rounded-lg animate-subtle-pulse">
              <div className="relative z-10 flex items-center justify-center gap-2">
                <StarIcon className="h-6 w-6" />
                <span>開始審查</span>
              </div>
          </button>
          {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );

  return (
    <>
      <ModeExampleModal mode={exampleModalMode} onClose={() => setExampleModalMode(null)} />
      <main className="flex-grow min-h-0 h-full overflow-y-auto custom-scrollbar">
          {renderContent()}
      </main>
    </>
  );
};
