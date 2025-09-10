import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ResultDisplay } from './ResultDisplay';
import { generateChatStream, countInputTokens, countResponseTokens } from '../services/aiService';
import { scopeRelevantFiles } from '../services/geminiService';
import { DIFF_INSTRUCTION, ALL_SUPPORTED_TYPES, WORKFLOW_MODES } from './constants';
import type { ReviewMode, ChatMessage, AppFile, Conversation } from '../types';
import { StarIcon, TrashIcon } from './icons';
import { useConversation } from '../contexts/ConversationContext';
import { ModeSelectorGrid } from './ModeSelectorGrid';
import { FileManagementArea } from './FileManagementArea';
import { PromptInputArea } from './PromptInputArea';
import { useApiSettings } from '../contexts/ApiSettingsContext';
import { LoadingDisplay } from './LoadingDisplay';
import { MODES } from '../config/modes';
import { ModeExampleModal } from './ModeExampleModal';
import { WorkflowManager } from './WorkflowManager';
import { useDebouncedTokenCounter } from '../hooks/useDebouncedTokenCounter';
import { getModeIcon } from './ModeIcons';


export const CodeReviewer: React.FC = () => {
  const { activeConversation, dispatch } = useConversation();
  const prevConversationIdRef = useRef(activeConversation?.id);
  
  const [files, setFiles] = useState<AppFile[]>([]);
  const [error, setError] = useState<string>('');
  const [submittingConversationId, setSubmittingConversationId] = useState<string | null>(null);
  
  const [userMessage, setUserMessage] = useState('');
  const [pastedImages, setPastedImages] = useState<string[]>([]);
  
  // Workflow-related state, now managed here
  const [isWorkflowView, setIsWorkflowView] = useState(false); // Controls switch to execution view
  const [sequence, setSequence] = useState<ReviewMode[]>(['CONSOLIDATE', 'REFACTOR']);
  const [cycles, setCycles] = useState(1);
  const dragItem = useRef<number | null>(null);

  const [acceptedTypes, setAcceptedTypes] = useState<string[]>(() => {
      const currentMode = activeConversation?.mode || 'REVIEW';
      return currentMode === 'WORKFLOW' ? ALL_SUPPORTED_TYPES.filter(t => t !== '.zip') : ALL_SUPPORTED_TYPES;
  });
  
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [recommendedPaths, setRecommendedPaths] = useState<Set<string>>(new Set());
  const [isScoping, setIsScoping] = useState(false);

  const { settings } = useApiSettings();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [exampleModalMode, setExampleModalMode] = useState<ReviewMode | null>(null);

  const conversation = activeConversation;
  const mode = conversation?.mode || 'REVIEW';
  const provider = conversation?.provider || 'gemini';

  const filesToCount = useMemo(() => files.filter(f => selectedFilePaths.has(f.path)), [files, selectedFilePaths]);
  const [inputTokenCount, isCountingTokens] = useDebouncedTokenCounter(provider, filesToCount, userMessage, pastedImages, settings);


  const isSubmitting = submittingConversationId !== null;
  const onUpdateConversation = (conversation: Conversation) => {
    dispatch({ type: 'UPDATE_CONVERSATION', payload: { conversation } });
  }

  useEffect(() => {
    if (prevConversationIdRef.current !== conversation?.id) {
      if (conversation?.history.length === 0) {
        setFiles([]);
        setError('');
        setUserMessage('');
        setPastedImages([]);
        setIsWorkflowView(false);
        setSequence(['CONSOLIDATE', 'REFACTOR']);
        setCycles(1);
        setSelectedFilePaths(new Set());
        setRecommendedPaths(new Set());
      }
      prevConversationIdRef.current = conversation?.id;
    }
    const newMode = conversation?.mode || 'REVIEW';
    setAcceptedTypes(newMode === 'WORKFLOW' ? ALL_SUPPORTED_TYPES.filter(t => t !== '.zip') : ALL_SUPPORTED_TYPES);

  }, [conversation]);
  
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
        // Create the new history array ONCE, with a placeholder for the model's message.
        const streamingHistory = [...initialConversation.history.slice(0, -1), { role: 'model' as const, content: '' }];
        const conversationUpdateTemplate = { ...initialConversation, history: streamingHistory };
    
        let finalContent = '';
        for await (const chunk of stream) {
            // The abort is now handled by the fetch signal, but this is a good safeguard.
            if (abortControllerRef.current?.signal.aborted) {
                console.log("User aborted generation.");
                break;
            }
            finalContent += chunk;
            
            // OPTIMIZED: Mutate the last message in place instead of creating a new array.
            // This drastically reduces memory churn and GC pressure.
            streamingHistory[streamingHistory.length - 1] = { role: 'model', content: finalContent };
            onUpdateConversation(conversationUpdateTemplate);
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
            history: [...streamingHistory.slice(0, -1), finalModelMessage],
        };
        onUpdateConversation(finalConversation);
    
    }, [onUpdateConversation, settings, provider]);

  const executeChatGeneration = useCallback(async (
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
        const masterPromptTemplate = MODES[mode].prompt;
        const masterPrompt = settings.forceDiff ? `${masterPromptTemplate}\n\n${DIFF_INSTRUCTION}` : masterPromptTemplate;
        const promptTokenCount = await countInputTokens(provider, filesToSubmit, messageToSend, imagesToSend, settings);
        const signal = abortControllerRef.current.signal;

        const stream = await generateChatStream({
            provider,
            history: historyForAPI,
            files: filesToSubmit,
            userMessage: messageToSend,
            images: imagesToSend,
            masterPrompt,
            signal,
            settings,
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
  }, [conversation, isSubmitting, submittingConversationId, onUpdateConversation, mode, provider, settings, handleStreamingResponse]);
    
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

  const onFollowUp = async (followUpFiles: AppFile[], message: string, images: string[]) => {
    await handleSubmit(true, { files: followUpFiles, message, images });
  };
  
  const handlePrimaryAction = () => {
    if (mode === 'WORKFLOW') {
      const filesToProcess = files.filter(f => selectedFilePaths.has(f.path));
      if (filesToProcess.length === 0 || sequence.length === 0) {
        setError('請至少選擇一個檔案並在序列中加入一個模式。');
        return;
      }
      setError('');
      setIsWorkflowView(true);
    } else {
      handleSubmit(false);
    }
  };

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setSubmittingConversationId(null);
  }, []);

  const handleDeleteFromTurn = (indexToDelete: number) => {
    if (!conversation) return;

    const isDeletingCurrentGenerationTurn = isSubmitting && indexToDelete >= conversation.history.length - 2;

    if (isDeletingCurrentGenerationTurn) {
        handleStopGeneration();
        setSubmittingConversationId(null);
    }

    const updatedHistory = conversation.history.slice(0, indexToDelete);

    const updatedConversation: Conversation = {
      ...conversation,
      history: updatedHistory,
    };

    if (updatedHistory.length === 0) {
      updatedConversation.title = '新的對話';
    }
    
    onUpdateConversation(updatedConversation);
  };

  const handleRegenerate = useCallback(async () => {
    if (!conversation || conversation.history.length < 1) return;

    let lastUserMessageIndex = -1
    for (let i = conversation.history.length - 1; i >= 0; i--) {
      if (conversation.history[i].role === 'user') {
        lastUserMessageIndex = i
        break
      }
    }

    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = conversation.history[lastUserMessageIndex];
    const historyForAPI = conversation.history.slice(0, lastUserMessageIndex);
    
    const { files, content: message, images } = lastUserMessage;
    const filesToSubmit = files || [];
    const messageToSend = message;
    const imagesToSend = images || [];

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
  }, [conversation, onUpdateConversation, executeChatGeneration]);
  
    const handleAiScoping = async () => {
        if (files.length === 0 || provider !== 'gemini') return;
        setIsScoping(true);
        setError('');
        try {
          const defaultMessage = MODES[mode]?.ui.placeholder || "請對我上傳的檔案進行一次全面的程式碼審查。";
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
    
    const handleAddModeToSequence = (modeToAdd: ReviewMode) => {
        setSequence(prev => [...prev, modeToAdd]);
    };
    const handleRemoveModeFromSequence = (index: number) => {
        setSequence(prev => prev.filter((_, i) => i !== index));
    };
    const handleDragStart = (index: number) => { dragItem.current = index; };
    const handleDragEnter = (index: number) => {
        if (dragItem.current === null || dragItem.current === index) return;
        setSequence(prev => {
            const newSequence = [...prev];
            const [draggedItem] = newSequence.splice(dragItem.current!, 1);
            newSequence.splice(index, 0, draggedItem);
            dragItem.current = index;
            return newSequence;
        });
    };
    const handleDragEnd = () => (dragItem.current = null);


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
                acceptedTypes={acceptedTypes}
            />
        </main>
      </>
    );
  }
  
  if (isWorkflowView) {
    return (
        <main className="flex-grow min-h-0 h-full overflow-y-auto custom-scrollbar">
            <WorkflowManager
                initialFiles={files.filter(f => selectedFilePaths.has(f.path))}
                sequence={sequence}
                cycles={cycles}
            />
        </main>
    );
  }

  const renderContent = () => (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 pt-8 sm:pt-12 animate-fade-in flex flex-col gap-8">
      <div className={`relative bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 dark:ring-1 dark:ring-inset dark:ring-white/10 transition-all duration-300 shadow-lg shadow-stone-200/50 dark:shadow-none hover:border-[var(--accent-color)]/50 dark:hover:shadow-lg dark:hover:shadow-[var(--accent-color)]/10 dark:hover:-translate-y-px`}>
        <ModeSelectorGrid 
            currentMode={mode} 
            onModeChange={(newMode) => onUpdateConversation({ ...conversation, mode: newMode })} 
            onShowExample={setExampleModalMode}
        />
      </div>
      
      <div className={`relative bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 dark:ring-1 dark:ring-inset dark:ring-white/10 transition-all duration-300 shadow-lg shadow-stone-200/50 dark:shadow-none hover:border-[var(--accent-color)]/50 dark:hover:shadow-lg dark:hover:shadow-[var(--accent-color)]/10 dark:hover:-translate-y-px`}>
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
            onAiScoping={provider === 'gemini' ? handleAiScoping : undefined}
            userMessage={userMessage}
            setError={setError}
        />
      </div>
      
      {mode === 'WORKFLOW' ? (
          <div className="bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 shadow-lg animate-fade-in">
            <h3 className="text-lg font-bold text-stone-900 dark:text-slate-200 mb-4 flex items-center gap-3">
                <span className="bg-stone-500 dark:bg-slate-600 text-white rounded-full h-7 w-7 flex items-center justify-center font-bold text-base flex-shrink-0">3</span>
                <span>設定工作流</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-2">模式執行序列</label>
                    <div className="bg-stone-200 dark:bg-slate-800/60 border border-stone-300 dark:border-slate-700 rounded-lg p-2 min-h-[120px]">
                        {sequence.map((seqMode, index) => (
                            <div 
                                key={`${seqMode}-${index}`}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragEnter={() => handleDragEnter(index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                className="flex items-center justify-between p-2 bg-stone-100 dark:bg-slate-900/70 rounded-md mb-1.5 animate-fade-in-up cursor-grab active:cursor-grabbing"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono text-stone-500">{index + 1}.</span>
                                    {getModeIcon(seqMode, "h-5 w-5 text-stone-700 dark:text-slate-300")}
                                    <span className="font-semibold text-stone-800 dark:text-slate-200">{MODES[seqMode].name}</span>
                                </div>
                                <button onClick={() => handleRemoveModeFromSequence(index)} className="p-1 text-stone-500 hover:text-red-500 transition-colors">
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                         <div className="flex gap-2 p-1">
                                <select onChange={(e) => { if(e.target.value) handleAddModeToSequence(e.target.value as ReviewMode); e.target.value = ""; }} defaultValue="" className="flex-grow bg-stone-300 dark:bg-slate-700/80 border-stone-400 dark:border-slate-600 rounded-md text-sm p-2 outline-none focus:ring-1 focus:ring-[var(--accent-color)]">
                                    <option value="" disabled>新增模式至序列...</option>
                                    {WORKFLOW_MODES.map(m => <option key={m} value={m}>{MODES[m].name}</option>)}
                                </select>
                            </div>
                    </div>
                </div>
                <div>
                     <label htmlFor="cycles" className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-2">循環次數</label>
                     <input type="number" id="cycles" value={cycles} onChange={e => setCycles(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="w-full bg-stone-200 dark:bg-slate-800/60 border border-stone-300 dark:border-slate-700 rounded-lg p-3 text-lg font-bold text-center"/>
                </div>
            </div>
          </div>
      ) : (
        <div className="relative bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 dark:ring-1 dark:ring-inset dark:ring-white/10 shadow-lg shadow-stone-200/50 dark:shadow-none transition-all duration-300 hover:border-[var(--accent-color)]/50 dark:hover:shadow-lg dark:hover:shadow-[var(--accent-color)]/10 dark:hover:-translate-y-px">
            <PromptInputArea 
                userMessage={userMessage}
                setUserMessage={setUserMessage}
                pastedImages={pastedImages}
                setPastedImages={setPastedImages}
                isCountingTokens={isCountingTokens}
                inputTokenCount={inputTokenCount}
                placeholder={MODES[mode].ui.placeholder}
            />
        </div>
      )}
      
      <div className={`relative transition-all duration-300`}>
          <button
            onClick={handlePrimaryAction}
            disabled={(mode !== 'WORKFLOW' && selectedFilePaths.size === 0 && pastedImages.length === 0) || isSubmitting}
            className="relative overflow-hidden w-full flex items-center justify-center gap-2 p-4 accent-gradient-bg text-white text-lg font-bold rounded-lg shadow-lg hover:shadow-xl hover:shadow-[var(--accent-color)]/20 transition-all duration-300 transform hover:-translate-y-px active:scale-[0.98] hover:brightness-105 active:brightness-110 disabled:from-stone-400 dark:disabled:from-slate-700 disabled:to-stone-300 dark:disabled:to-slate-600 disabled:text-stone-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:transform-none before:absolute before:inset-0 before:bg-white/20 before:transition-opacity before:opacity-0 hover:before:opacity-100 before:duration-500 before:ease-in-out dark:before:bg-black/20 before:rounded-lg animate-subtle-pulse"
          >
              <div className="relative z-10 flex items-center justify-center gap-2">
                <StarIcon className="h-6 w-6" />
                <span>{MODES[mode].ui.buttonText}</span>
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
