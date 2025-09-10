import React, { useState, useCallback, useRef } from 'react';
import type { AppFile, ReviewMode } from '../types';
import { useApiSettings } from '../contexts/ApiSettingsContext';
import { generateChatStream } from '../services/aiService';
import { WORKFLOW_STEP_PROMPT, WORKFLOW_MODES, ALL_SUPPORTED_TYPES } from './constants';
import { parseDiffs, applyPatch } from '../utils/patch';
import { zipAndDownloadFiles } from '../utils';
import { FileManagementArea } from './FileManagementArea';
import { WorkflowIcon, PlusIcon, TrashIcon, ChevronDownIcon, StopIcon, DownloadIcon, RefreshIcon, CheckIcon } from './icons';
import { getModeIcon } from './ModeIcons';
import { MODES } from '../config/modes';

type WorkflowStatus = 'config' | 'running' | 'done' | 'stopped' | 'error';

interface LogEntry {
    type: 'info' | 'success' | 'error' | 'step';
    message: string;
    timestamp: string;
}

export const WorkflowManager: React.FC = () => {
    const { settings } = useApiSettings();
    
    // Config state
    const [files, setFiles] = useState<AppFile[]>([]);
    const [acceptedTypes, setAcceptedTypes] = useState<string[]>(ALL_SUPPORTED_TYPES.filter(t => t !== '.zip'));
    const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
    const [sequence, setSequence] = useState<ReviewMode[]>(['CONSOLIDATE', 'REFACTOR']);
    const [cycles, setCycles] = useState(1);
    const [configError, setConfigError] = useState('');
    
    // Running state
    const [status, setStatus] = useState<WorkflowStatus>('config');
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

    const handleStartWorkflow = async () => {
        const filesToProcess = files.filter(f => selectedFilePaths.has(f.path));
        if (filesToProcess.length === 0) {
            setConfigError('請至少選擇一個檔案來開始工作流。');
            return;
        }
        if (sequence.length === 0) {
            setConfigError('請至少在序列中加入一個模式。');
            return;
        }
        setConfigError('');
        isAbortingRef.current = false;
        abortControllerRef.current = new AbortController();
        setStatus('running');
        setLogs([]);
        
        let currentFiles = [...filesToProcess];

        addLog('info', `工作流開始，總共 ${cycles} 個循環，每個循環 ${sequence.length} 個步驟。`);

        try {
            for (let i = 0; i < cycles; i++) {
                if (isAbortingRef.current) throw new Error('Workflow stopped by user.');
                addLog('info', `===== 循環 ${i + 1} / ${cycles} 開始 =====`);

                for (let j = 0; j < sequence.length; j++) {
                    if (isAbortingRef.current) throw new Error('Workflow stopped by user.');
                    const mode = sequence[j];
                    setCurrentProgress({ cycle: i + 1, step: j + 1, mode });
                    addLog('step', `步驟 ${j + 1}: 執行 ${mode} 模式...`);

                    const masterPrompt = WORKFLOW_STEP_PROMPT
                        .replace(/{MODE_NAME}/g, mode)
                        .replace('{MODE_PROMPT}', MODES[mode].prompt);
                    
                    let responseText = '';
                    const stream = await generateChatStream({
                        provider: settings.defaultProvider,
                        history: [],
                        files: currentFiles,
                        userMessage: 'Please process the files according to the workflow step.',
                        images: [],
                        masterPrompt,
                        settings,
                        signal: abortControllerRef.current.signal,
                    });

                    for await (const chunk of stream) {
                        if (isAbortingRef.current) break;
                        responseText += chunk;
                    }
                     if (isAbortingRef.current) throw new Error('Workflow stopped by user.');

                    const diffs = parseDiffs(responseText);
                    if (diffs.length === 0) {
                        addLog('info', `在 ${mode} 模式中未偵測到任何變更。`);
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
    };
    
    const handleStopWorkflow = () => {
        isAbortingRef.current = true;
        abortControllerRef.current?.abort();
    };
    const handleReset = () => {
        setFiles([]);
        setSelectedFilePaths(new Set());
        setSequence(['CONSOLIDATE', 'REFACTOR']);
        setCycles(1);
        setStatus('config');
        setLogs([]);
        setFinalFiles([]);
    }

    const handleAddModeToSequence = (mode: ReviewMode) => {
        setSequence(prev => [...prev, mode]);
    };

    const handleRemoveModeFromSequence = (index: number) => {
        setSequence(prev => prev.filter((_, i) => i !== index));
    };

    const renderConfig = () => (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 pt-8 sm:pt-12 animate-fade-in flex flex-col gap-8">
            <div className="text-center">
                <WorkflowIcon className="h-16 w-16 mx-auto text-[var(--accent-color)]" />
                <h2 className="text-3xl font-bold mt-4 text-stone-900 dark:text-slate-100">自動化工作流</h2>
                <p className="mt-2 text-stone-600 dark:text-slate-400 max-w-2xl mx-auto">建立一個自動化任務序列，讓 AI 持續優化您的專案。完成後，您可以下載最終成果。</p>
            </div>
            
            <div className="bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 shadow-lg">
                 <FileManagementArea
                    files={files}
                    setFiles={setFiles}
                    acceptedTypes={acceptedTypes}
                    setAcceptedTypes={setAcceptedTypes}
                    selectedFilePaths={selectedFilePaths}
                    setSelectedFilePaths={setSelectedFilePaths}
                    userMessage=""
                    setError={setConfigError}
                />
            </div>

            <div className="bg-stone-100/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-300 dark:border-slate-800/50 rounded-xl p-4 sm:p-6 shadow-lg">
                <h3 className="text-lg font-bold text-stone-900 dark:text-slate-200 mb-4 flex items-center gap-3">
                    <span className="bg-stone-500 dark:bg-slate-600 text-white rounded-full h-7 w-7 flex items-center justify-center font-bold text-base flex-shrink-0">3</span>
                    <span>設定工作流</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-2">模式執行序列</label>
                        <div className="bg-stone-200 dark:bg-slate-800/60 border border-stone-300 dark:border-slate-700 rounded-lg p-2 min-h-[120px]">
                            {sequence.map((mode, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-stone-100 dark:bg-slate-900/70 rounded-md mb-1.5 animate-fade-in-up">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono text-stone-500">{index + 1}.</span>
                                        {getModeIcon(mode, "h-5 w-5 text-stone-700 dark:text-slate-300")}
                                        <span className="font-semibold text-stone-800 dark:text-slate-200">{mode}</span>
                                    </div>
                                    <button onClick={() => handleRemoveModeFromSequence(index)} className="p-1 text-stone-500 hover:text-red-500 transition-colors">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2 p-1">
                                <select onChange={(e) => handleAddModeToSequence(e.target.value as ReviewMode)} value="" className="flex-grow bg-stone-300 dark:bg-slate-700/80 border-stone-400 dark:border-slate-600 rounded-md text-sm p-2 outline-none focus:ring-1 focus:ring-[var(--accent-color)]">
                                    <option value="" disabled>新增模式至序列...</option>
                                    {WORKFLOW_MODES.map(m => <option key={m} value={m}>{m}</option>)}
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

            <div>
                <button onClick={handleStartWorkflow} disabled={files.length === 0 || sequence.length === 0} className="w-full flex items-center justify-center gap-2 p-4 accent-gradient-bg text-white text-lg font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed">
                    <WorkflowIcon className="h-6 w-6" />
                    <span>開始工作流</span>
                </button>
                {configError && <p className="text-red-500 mt-4 text-center">{configError}</p>}
            </div>
        </div>
    );
    
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
                循環 {currentProgress.cycle}/{cycles} | 步驟 {currentProgress.step}/{sequence.length}: <span className="font-bold text-[var(--accent-color)]">{currentProgress.mode}</span>
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
                 <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 bg-stone-200 dark:bg-slate-700 text-stone-800 dark:text-slate-200 border border-stone-400 dark:border-slate-600 rounded-lg hover:bg-stone-300 dark:hover:bg-slate-600 transition-colors font-semibold">
                    <RefreshIcon className="h-5 w-5" /> 新的工作流
                </button>
                <button onClick={() => zipAndDownloadFiles(finalFiles, 'ai-workflow-results.zip')} className="flex items-center gap-2 px-6 py-3 accent-gradient-bg text-white rounded-lg hover:brightness-110 transition-colors font-semibold shadow-lg">
                    <DownloadIcon className="h-5 w-5" /> 下載結果
                </button>
            </div>
        </div>
    );
    
    if (status === 'config') return renderConfig();
    if (status === 'running') return renderRunning();
    return renderResults();
};