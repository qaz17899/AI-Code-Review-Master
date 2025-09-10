import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppFile } from '../types';
import { FileTree } from './FileTree';
import type { TreeNodeData } from '../utils/fileTree';
import { buildFileTree } from '../utils/fileTree';
import { FileUpload } from './FileUpload';
import { FileTypeManager } from './FileTypeManager';
import { ScopingLoader } from './ScopingLoader';
import { SearchIcon, XIcon, CheckIcon, StarIcon } from './icons';
import { processUploadedFiles, type UploadPayload } from '../utils';

interface FileManagementAreaProps {
    files: AppFile[];
    setFiles: React.Dispatch<React.SetStateAction<AppFile[]>>;
    acceptedTypes: string[];
    setAcceptedTypes: React.Dispatch<React.SetStateAction<string[]>>;
    selectedFilePaths: Set<string>;
    setSelectedFilePaths: React.Dispatch<React.SetStateAction<Set<string>>>;
    userMessage: string;
    setError: React.Dispatch<React.SetStateAction<string>>;
    // AI Scoping props are optional for reusability
    recommendedPaths?: Set<string>;
    setRecommendedPaths?: React.Dispatch<React.SetStateAction<Set<string>>>;
    isScoping?: boolean;
    onAiScoping?: () => Promise<void>;
    showTypeManager?: boolean;
}

export const FileManagementArea: React.FC<FileManagementAreaProps> = (props) => {
    const {
        files, setFiles, acceptedTypes, setAcceptedTypes, selectedFilePaths, setSelectedFilePaths,
        recommendedPaths, isScoping, onAiScoping,
    } = props;
    const showTypeManager = props.showTypeManager !== false; // Default to true

    const [fileFilter, setFileFilter] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const fileTree = useMemo(() => buildFileTree(files), [files]);

    // Pre-compute folder contents for efficient selection state calculation.
    const folderFileMap = useMemo(() => {
        const map = new Map<string, string[]>();
        files.forEach(file => {
            const pathParts = file.path.split('/');
            pathParts.pop(); // remove filename
            let currentPath = '';
            pathParts.forEach(part => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                if (!map.has(currentPath)) map.set(currentPath, []);
                map.get(currentPath)!.push(file.path);
            });
        });
        return map;
    }, [files]);

    useEffect(() => {
        if (!fileFilter.trim()) return;

        const newExpanded = new Set<string>();
        files.forEach(file => {
            if (file.path.toLowerCase().includes(fileFilter.trim().toLowerCase())) {
                const pathParts = file.path.split('/');
                pathParts.pop(); // remove file name
                let currentPath = '';
                for (const part of pathParts) {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    newExpanded.add(currentPath);
                }
            }
        });
        setExpandedFolders(newExpanded);
    }, [fileFilter, files]);

    const handleFilesChange = useCallback(async (payloads: UploadPayload[]) => {
        try {
            const newFiles = await processUploadedFiles(payloads, acceptedTypes, props.setError);
            if (newFiles.length === 0 && payloads.length > 0) {
                // This can happen if all uploaded files were filtered out.
                return;
            }

            setFiles(prevFiles => {
                const existingFilePaths = new Set(prevFiles.map(f => f.path));
                const uniqueNewFiles = newFiles.filter(nf => !existingFilePaths.has(nf.path));
                return [...prevFiles, ...uniqueNewFiles].sort((a,b) => a.path.localeCompare(b.path));
            });
            setSelectedFilePaths(prevSelected => {
                const newSelected = new Set(prevSelected);
                newFiles.forEach(file => newSelected.add(file.path));
                return newSelected;
            });
        } catch (err) {
            console.error("Error reading files:", err);
            props.setError("讀取檔案時發生錯誤。");
        }
    }, [setFiles, setSelectedFilePaths, props.setError, acceptedTypes]);

    const handleRemoveFile = (pathToRemove: string, isFolder: boolean) => {
        const pathsToRemove = new Set<string>([pathToRemove]);
        if (isFolder) {
            const filesInFolder = folderFileMap.get(pathToRemove) || [];
            filesInFolder.forEach(p => pathsToRemove.add(p));
        }

        setFiles(prev => prev.filter(f => !pathsToRemove.has(f.path)));
        setSelectedFilePaths(prev => {
          const newSet = new Set(prev);
          pathsToRemove.forEach(p => newSet.delete(p));
          return newSet;
        });
    };

    const handleToggleFileSelection = (path: string, isFolder: boolean) => {
        setSelectedFilePaths(prev => {
            const newSet = new Set(prev);
            const filesToToggle = isFolder ? (folderFileMap.get(path) || []) : [path];
            
            const shouldSelect = filesToToggle.some(f => !newSet.has(f));

            filesToToggle.forEach(f => {
                if (shouldSelect) newSet.add(f);
                else newSet.delete(f);
            });

            return newSet;
        });
    };
  
    const handleToggleSelectAll = () => {
        const visibleFilePaths = (fileFilter.trim() ? files.filter(f => f.path.toLowerCase().includes(fileFilter.trim().toLowerCase())) : files).map(f => f.path);
        const allVisibleCurrentlySelected = visibleFilePaths.length > 0 && visibleFilePaths.every(p => selectedFilePaths.has(p));

        if (allVisibleCurrentlySelected) {
            setSelectedFilePaths(prev => {
                const newSet = new Set(prev);
                visibleFilePaths.forEach(path => newSet.delete(path));
                return newSet;
            });
        } else {
            setSelectedFilePaths(prev => {
                const newSet = new Set(prev);
                visibleFilePaths.forEach(path => newSet.add(path));
                return newSet;
            });
        }
    };

    const handleToggleFolder = (folderPath: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderPath)) {
                newSet.delete(folderPath);
            } else {
                newSet.add(folderPath);
            }
            return newSet;
        });
    };
    
    const visibleFiles = useMemo(() => {
        if (!fileFilter.trim()) return files;
        return files.filter(f => f.path.toLowerCase().includes(fileFilter.trim().toLowerCase()));
    }, [files, fileFilter]);

    const allVisibleSelected = visibleFiles.length > 0 && visibleFiles.every(f => selectedFilePaths.has(f.path));

    return (
        <div className="relative">
            {isScoping && <ScopingLoader text="AI 正在分析關聯性..." />}
            <h3 className="text-lg font-bold text-stone-900 dark:text-slate-200 mb-4 flex items-center gap-3">
                <span className="bg-stone-500 dark:bg-slate-600 text-white rounded-full h-7 w-7 flex items-center justify-center font-bold text-base flex-shrink-0">2</span>
                <span>上傳檔案</span>
            </h3>
            <div className="space-y-4">
                {files.length > 0 && (
                    <div className="bg-stone-200 dark:bg-slate-800/60 border border-stone-300 dark:border-slate-700 rounded-lg p-2 max-h-72 flex flex-col">
                        <div className="relative mb-2 flex-shrink-0">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500 dark:text-slate-500 pointer-events-none" />
                            <input type="text" placeholder="搜尋檔案..." value={fileFilter} onChange={(e) => setFileFilter(e.target.value)} className="w-full bg-stone-300/50 dark:bg-slate-900/50 border border-stone-400 dark:border-slate-700 rounded-lg pl-10 pr-8 py-2 text-sm text-stone-800 dark:text-slate-200 focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition" />
                            {fileFilter && ( <button onClick={() => setFileFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-500 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-300" aria-label="Clear search"> <XIcon className="h-4 w-4" /> </button> )}
                        </div>
                        <div className="flex-grow overflow-y-auto custom-scrollbar">
                             <div className="flex items-center justify-between p-1.5 sticky top-0 bg-stone-200/80 dark:bg-slate-800/80 backdrop-blur-sm z-10">
                                <button onClick={handleToggleSelectAll} className="flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200">
                                    <div className={`w-4 h-4 flex-shrink-0 border-2 rounded-sm flex items-center justify-center ${selectedFilePaths.size > 0 ? 'bg-[var(--accent-color)] border-[var(--accent-color)]' : 'border-stone-500 dark:border-slate-600'}`}>
                                        {allVisibleSelected && <CheckIcon className="h-3 w-3 text-white" />}
                                        {selectedFilePaths.size > 0 && !allVisibleSelected && <div className="w-2 h-0.5 bg-white"></div>}
                                    </div>
                                    <span>{selectedFilePaths.size} / {files.length} 已選擇</span>
                                </button>
                                {onAiScoping && (
                                    <button onClick={onAiScoping} disabled={files.length === 0} className="flex items-center gap-1.5 text-xs text-[var(--accent-color)] font-semibold hover:brightness-125 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                        <StarIcon className="h-4 w-4" />
                                        <span>為 AI 推薦檔案</span>
                                    </button>
                                )}
                            </div>
                            <FileTree 
                                files={files}
                                folderFileMap={folderFileMap}
                                fileTree={fileTree}
                                selectedFilePaths={selectedFilePaths}
                                recommendedPaths={recommendedPaths ?? new Set()}
                                expandedFolders={expandedFolders}
                                fileFilter={fileFilter}
                                onToggleFolder={handleToggleFolder}
                                onToggleFileSelection={handleToggleFileSelection}
                                onRemove={handleRemoveFile}
                            />
                        </div>
                    </div>
                )}
                <FileUpload onFilesChange={handleFilesChange} acceptedTypes={acceptedTypes} />
                {showTypeManager && <FileTypeManager types={acceptedTypes} onChange={setAcceptedTypes} />}
            </div>
        </div>
    );
};
