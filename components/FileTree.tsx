import React from 'react';
import type { AppFile } from '../types';
import {
    ChevronDownIcon,
    ChevronRightIcon,
    FolderIcon,
    FolderOpenIcon,
    StarIcon,
    CheckIcon,
    TrashIcon
} from './icons';
import type { TreeNodeData } from '../utils/fileTree';
import { getFileIcon } from '../utils/fileTree';

interface TreeNodeProps {
    node: TreeNodeData;
    level: number;
    folderFileMap: Map<string, string[]>;
    selectedFilePaths: Set<string>;
    recommendedPaths: Set<string>;
    expandedFolders: Set<string>;
    fileFilter: string;
    animationIndex: number;
    onToggleFolder: (path: string) => void;
    onToggleFileSelection: (path: string, isFolder: boolean) => void;
    onRemove: (path: string, isFolder: boolean) => void;
}

const getFolderSelectionState = (folderPath: string, folderFileMap: Map<string, string[]>, selectedFilePaths: Set<string>): 'all' | 'partial' | 'none' => {
    const allFiles = folderFileMap.get(folderPath) || [];
    if (allFiles.length === 0) return 'none';
    const selectedCount = allFiles.filter(path => selectedFilePaths.has(path)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === allFiles.length) return 'all';
    return 'partial';
};


const TreeNode: React.FC<TreeNodeProps> = ({
    node, level, folderFileMap, selectedFilePaths, recommendedPaths, expandedFolders, fileFilter, animationIndex,
    onToggleFolder, onToggleFileSelection, onRemove
}) => {
    const isExpanded = expandedFolders.has(node.path);
    const filter = fileFilter.trim().toLowerCase();
    const isMatch = filter ? node.name.toLowerCase().includes(filter) : false;

    if (node.type === 'folder') {
        const selectionState = getFolderSelectionState(node.path, folderFileMap, selectedFilePaths);
        const childrenContent = node.children ? node.children.map((child, i) => (
            <TreeNode
                key={child.path}
                node={child}
                level={level + 1}
                folderFileMap={folderFileMap}
                selectedFilePaths={selectedFilePaths}
                recommendedPaths={recommendedPaths}
                expandedFolders={expandedFolders}
                fileFilter={fileFilter}
                onToggleFolder={onToggleFolder}
                onToggleFileSelection={onToggleFileSelection}
                onRemove={onRemove}
                animationIndex={i}
            />
        )) : null;

        const hasVisibleChildren = filter ? node.children?.some(child => child.path.toLowerCase().includes(filter)) : false;

        if (filter && !isMatch && !hasVisibleChildren) {
            return null;
        }

        return (
            <div className="animate-fade-in" style={{ animationDuration: '300ms', animationDelay: `${animationIndex * 20}ms`, opacity: 0 }}>
                <div className="flex items-center gap-1 group text-sm p-0.5 rounded-md hover:bg-stone-300/60 dark:hover:bg-slate-700/50">
                    <button onClick={() => onToggleFolder(node.path)} className="flex items-center gap-1 flex-grow text-left" style={{ paddingLeft: `${level * 1.25}rem` }}>
                        {isExpanded ? <ChevronDownIcon className="h-4 w-4 flex-shrink-0" /> : <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />}
                        <div onClick={(e) => {e.stopPropagation(); onToggleFileSelection(node.path, true)}} className={`w-5 h-5 flex-shrink-0 border-2 rounded-md flex items-center justify-center transition-colors ${selectionState !== 'none' ? 'accent-gradient-bg border-transparent' : 'border-stone-500 dark:border-slate-600'}`}>
                           {selectionState === 'all' && <CheckIcon className="h-4 w-4 text-white" />}
                           {selectionState === 'partial' && <div className="w-2.5 h-0.5 bg-white"></div>}
                        </div>
                        {isExpanded ? <FolderOpenIcon className="h-5 w-5 text-[var(--accent-color)] transition-transform group-hover:-rotate-3" /> : <FolderIcon className="h-5 w-5 text-stone-600 dark:text-slate-400 transition-all group-hover:text-[var(--accent-color)] group-hover:-rotate-3" />}
                        <span className={`font-mono truncate ${isMatch ? 'text-[var(--accent-color)] font-bold' : 'font-semibold text-stone-800 dark:text-slate-300'}`}>{node.name}</span>
                    </button>
                    <button onClick={() => onRemove(node.path, true)} className="p-1 text-stone-500 dark:text-slate-500 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0" aria-label={`Remove ${node.name}`}>
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
                {isExpanded && <div className="border-l border-stone-400 dark:border-slate-700 ml-3">{childrenContent}</div>}
            </div>
        );
    }

    // File node
    if (filter && !isMatch) {
        return null;
    }
    
    const isSelected = selectedFilePaths.has(node.path);
    const isRecommended = recommendedPaths.has(node.path);

    return (
        <div className="flex items-center gap-1 group text-sm p-0.5 rounded-md hover:bg-stone-300/60 dark:hover:bg-slate-700/50 animate-fade-in" style={{ animationDuration: '300ms', animationDelay: `${animationIndex * 20}ms`, opacity: 0 }}>
            <button onClick={() => onToggleFileSelection(node.path, false)} className="flex items-center gap-2 flex-grow text-left" style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}>
                <div className="w-1.5 h-full"></div>
                <div className={`w-5 h-5 flex-shrink-0 border-2 rounded-md flex items-center justify-center transition-colors ${isSelected ? 'accent-gradient-bg border-transparent' : 'border-stone-500 dark:border-slate-600'}`}>
                    {isSelected && <CheckIcon className="h-4 w-4 text-white" />}
                </div>
                {getFileIcon(node.name)}
                <span className={`font-mono truncate ${isMatch ? 'text-[var(--accent-color)] font-bold' : 'font-normal text-stone-700 dark:text-slate-400'}`}>{node.name}</span>
                {isRecommended && <StarIcon className="h-4 w-4 text-[var(--accent-color)] flex-shrink-0" />}
            </button>
            <button onClick={() => onRemove(node.path, false)} className="p-1 text-stone-500 dark:text-slate-500 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0" aria-label={`Remove ${node.name}`}>
                <TrashIcon className="h-4 w-4" />
            </button>
        </div>
    );
};


interface FileTreeProps {
    files: AppFile[];
    folderFileMap: Map<string, string[]>;
    fileTree: TreeNodeData[];
    selectedFilePaths: Set<string>;
    recommendedPaths: Set<string>;
    expandedFolders: Set<string>;
    fileFilter: string;
    onToggleFolder: (path: string) => void;
    onToggleFileSelection: (path: string, isFolder: boolean) => void;
    onRemove: (path: string, isFolder: boolean) => void;
}


export const FileTree: React.FC<FileTreeProps> = ({ fileTree, ...props }) => {
    return (
        <div className="space-y-1 mt-1">
            {fileTree.map((node, i) => (
                <TreeNode
                    key={node.path}
                    node={node}
                    level={0}
                    animationIndex={i}
                    {...props}
                />
            ))}
        </div>
    );
};
