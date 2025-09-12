import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AppFile, ReviewMode } from '../types';
import { useApiSettings } from '../contexts/ApiSettingsContext';
// FIX: Removed import from non-existent 'aiService.ts' and replaced with specific service imports.
import { generateGeminiChatStream } from '../services/geminiService';
import { generateOpenAIChatStream } from '../services/openaiService';
import { WORKFLOW_STEP_PROMPT } from './constants';
import { parseDiffs, applyPatch } from '../utils/patch';
import { zipAndDownloadFiles } from '../utils';
import { WorkflowIcon, StopIcon, DownloadIcon, RefreshIcon, CheckIcon } from './icons';
import { MODES } from '../config/modes';

type WorkflowStatus = 'running' | 'done' | 'stopped' | 'error';

interface WorkflowManagerProps {
    initialFiles: AppFile[];
    sequence: ReviewMode[];
    cycles: number;
}

interface LogEntry {
    type: 'info' | 'success' | 'error' | 'step';
    message: string;
    timestamp: string;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({ initialFiles, sequence, cycles }) => {
    const { settings } = useApiSettings();
    
    // Running state
    const [status, setStatus] = useState<WorkflowStatus>('running');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentProgress, setCurrentProgress] = useState({ cycle: 0, step: 0, mode: '' });
    const [finalFiles, setFinalFiles] = useState<AppFile[]>([]);
    const isAbortingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const logContainerRef = useRef<HTMLDivElement>(null);

    const addLog = (type: LogEntry['type'], message: string) => {
        const newEntry: LogEntry = { type, message, timestamp: new Date().toLocaleTimeString() };
        setLogs(prev => [...prev, newEntry]);
        setTimeout(() => {
            logContainerRef.current?.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const runWorkflow = useCallback(async () => {
        isAbortingRef.current = false;
        abortControllerRef.current = new AbortController();
        
        let currentFiles = [...initialFiles];

        addLog('info', `工作流開始，總共 ${cycles} 個循環，每個循環 ${sequence.length} 個步驟。`);

        try {
            for (let i = 0; i < cycles; i++) {
                if (isAbortingRef.current) throw new Error('Workflow stopped by user.');
                addLog('info', `===== 循環 ${i + 1} / ${cycles} 開始 =====`);

                for (let j = 0; j < sequence.length; j++) {
                    if (isAbortingRef.current) throw new Error('Workflow stopped by user.');
                    const mode = sequence[j];
                    setCurrentProgress({ cycle: i + 1, step: j + 1, mode });
                    addLog('step', `步驟 ${j + 1}: 執行 ${MODES[mode].name} 模式...`);

                    const masterPrompt = WORKFLOW_STEP_PROMPT
                        .replace(/{MODE_NAME}/g, MODES[mode].name)
                        .replace('{MODE_PROMPT}', MODES[mode].prompt);
                    
                    let responseText = '';
                    // FIX: Replaced call to a generic, non-existent `generateChatStream` with a dynamic call
                    // to the appropriate provider-specific stream generation function.
                    const userMessage = 'Please process the files according to the workflow step.';
                    const streamGenerator = settings.defaultProvider === 'gemini' ? generateGeminiChatStream : generateOpenAIChatStream;

                    const stream = streamGenerator(
                        [], // history
                        currentFiles,
                        userMessage,
                        [], // images
                        masterPrompt,
                        abortControllerRef.current.signal,
                        settings,
                    );

                    for await (const chunk of stream) {
                        if (isAbortingRef.current) break;
                        responseText += chunk;
                    }
                     if (isAbortingRef.current) throw new Error('Workflow stopped by user.');

                    const diffs = parseDiffs(responseText);
                    if (diffs.length === 0) {
                        addLog('info', `在 ${MODES[mode].name} 模式中未偵測到任何變更。`);
                        continue;
                    }

                    const currentFilesMap = new Map(currentFiles.map(f => [f.path, f]));
                    let changedFileCount = 0;
                    for (const diff of diffs) {
                        const originalFile = currentFilesMap.get(diff.filename);
                        if (originalFile) {
                            const newContent = applyPatch(originalFile.content, diff.patch);
                            currentFilesMap.set(diff.filename, { ...originalFile, content: newContent });
                            changedFileCount++;
                        }
                    }
                    currentFiles = Array.from(currentFilesMap.values());
                    addLog('success', `套用 ${changedFileCount} 個檔案的變更。`);
                }
            }
            setFinalFiles(currentFiles);
            addLog('success', '工作流執行成功！');
            setStatus('done');
        } catch (error) {
            const message = error instanceof Error ? error.message : '發生未知錯誤';
            if (message.includes('stopped by user') || (error instanceof DOMException && error.name === 'AbortError')) {
                setStatus('stopped');
                addLog('error', '工作流已由使用者中止。');
            } else {
                setStatus('error');
                addLog('error', `工作流失敗: ${message}`);
            }
            setFinalFiles(currentFiles); // Save partial progress
        }
    }, [initialFiles, sequence, cycles, settings]);

    useEffect(() => {
        runWorkflow();
    }, [runWorkflow]);
    
    const handleStopWorkflow = () => {
        isAbortingRef.current = true;
        abortControllerRef.current?.abort();
    };
    
    const renderRunning = () => (
        <div className="w-full h-full p-4 sm:p-8 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="relative mb-8">
                <div className="absolute -inset-4 rounded-full accent-gradient-bg opacity-20 blur-2xl animate-pulse"></div>
                <div className="relative p-4 bg-stone-100/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full shadow-lg">
                    <WorkflowIcon className="h-20 w-20 text-[var(--accent-color)] animate-spin" style={{ animationDuration: '10s' }} />
                </div>
            </div>
             <h2 className="text-3xl font-bold text-stone-900 dark:text-slate-100">工作流執行中...</h2>
             <p className="text-stone-600 dark:text-slate-400 mt-2">
                循環 {currentProgress.cycle}/{cycles} | 步驟 {currentProgress.step}/{sequence.length}: <span className="font-bold text-[var(--accent-color)]">{MODES[currentProgress.mode as ReviewMode]?.name || currentProgress.mode}</span>
            </p>
            <div ref={logContainerRef} className="mt-8 w-full max-w-3xl h-64 bg-stone-100 dark:bg-slate-900/80 border border-stone-400 dark:border-slate-700 rounded-xl p-4 text-left font-mono text-xs text-stone-700 dark:text-slate-300 overflow-y-auto custom-scrollbar">
                {logs.map((log, i) => (
                    <p key={i} className={`whitespace-pre-wrap ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-500' : ''}`}>
                        <span className="text-stone-500 dark:text-slate-500 mr-2">{log.timestamp}</span>
                        {log.message}
                    </p>
                ))}
            </div>
            <button onClick={handleStopWorkflow} className="mt-8 flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-colors font-semibold">
                <StopIcon className="h-5 w-5" /> 停止
            </button>
        </div>
    );

    const renderResults = () => (
        <div className="w-full h-full p-4 sm:p-8 flex flex-col items-center justify-center text-center animate-fade-in">
             <div className="relative mb-8">
                <div className="p-4 bg-stone-100/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full shadow-lg">
                    <CheckIcon className="h-20 w-20 text-green-500" />
                </div>
            </div>
             <h2 className="text-3xl font-bold text-stone-900 dark:text-slate-100">工作流已{status === 'done' ? '完成' : '停止'}</h2>
            <div ref={logContainerRef} className="mt-8 w-full max-w-3xl h-64 bg-stone-100 dark:bg-slate-900/80 border border-stone-400 dark:border-slate-700 rounded-xl p-4 text-left font-mono text-xs text-stone-700 dark:text-slate-300 overflow-y-auto custom-scrollbar">
                {logs.map((log, i) => (
                    <p key={i} className={`whitespace-pre-wrap ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-500' : ''}`}>
                        <span className="text-stone-500 dark:text-slate-500 mr-2">{log.timestamp}</span>
                        {log.message}
                    </p>
                ))}
            </div>
            <div className="mt-8 flex items-center gap-4">
                 <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-6 py-3 bg-stone-200 dark:bg-slate-700 text-stone-800 dark:text-slate-200 border border-stone-400 dark:border-slate-600 rounded-lg hover:bg-stone-300 dark:hover:bg-slate-600 transition-colors font-semibold">
                    <RefreshIcon className="h-5 w-5" /> 返回並設定新的工作流
                </button>
                <button onClick={() => zipAndDownloadFiles(finalFiles, 'ai-workflow-results.zip')} className="flex items-center gap-2 px-6 py-3 accent-gradient-bg text-white rounded-lg hover:brightness-110 transition-colors font-semibold shadow-lg">
                    <DownloadIcon className="h-5 w-5" /> 下載結果
                </button>
            </div>
        </div>
    );
    
    if (status === 'running') return renderRunning();
    return renderResults();
};