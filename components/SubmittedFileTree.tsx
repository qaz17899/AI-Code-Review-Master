import React, { useState, useMemo, useCallback } from 'react';
import type { AppFile } from '../types';
import {
    ChevronDownIcon,
    ChevronRightIcon,
    FolderIcon,
    FolderOpenIcon,
} from './icons';
import { buildFileTree, getFileIcon, type TreeNodeData } from '../utils/fileTree';

interface TreeNodeProps {
    node: TreeNodeData;
    level: number;
    expandedFolders: Set<string>;
    onToggleFolder: (path:string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, expandedFolders, onToggleFolder }) => {
    const isExpanded = expandedFolders.has(node.path);

    if (node.type === 'folder') {
        const childrenContent = isExpanded && node.children ? node.children.map((child) => (
            <TreeNode
                key={child.path}
                node={child}
                level={level + 1}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
            />
        )) : null;

        return (
            <div>
                <div
                    className="flex items-center gap-1.5 text-sm p-1 rounded-md hover:bg-stone-300/60 dark:hover:bg-slate-700/50 cursor-pointer text-stone-700 dark:text-slate-300"
                    onClick={() => onToggleFolder(node.path)}
                    style={{ paddingLeft: `${level * 1.25}rem` }}
                >
                    {isExpanded ? <ChevronDownIcon className="h-4 w-4 flex-shrink-0" /> : <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />}
                    {isExpanded ? <FolderOpenIcon className="h-5 w-5 text-amber-500 dark:text-amber-400" /> : <FolderIcon className="h-5 w-5 text-stone-600 dark:text-slate-400" />}
                    <span className="font-mono truncate font-semibold">{node.name}</span>
                </div>
                {childrenContent}
            </div>
        );
    }

    // File node
    return (
        <div
            className="flex items-center gap-1.5 text-sm p-1 text-stone-600 dark:text-slate-400"
            style={{ paddingLeft: `${level * 1.25}rem` }}
        >
            <span className="w-4 h-4 flex-shrink-0" /> {/* Spacer for chevron */}
            {getFileIcon(node.name)}
            <span className="font-mono truncate font-normal">{node.name}</span>
        </div>
    );
};

export const SubmittedFileTree: React.FC<{ files: AppFile[] }> = ({ files }) => {
    const fileTree = useMemo(() => buildFileTree(files), [files]);
    
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
        const rootFolders = fileTree.filter(node => node.type === 'folder').map(node => node.path);
        return new Set(rootFolders);
    });

    const handleToggleFolder = useCallback((folderPath: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderPath)) {
                newSet.delete(folderPath);
            } else {
                newSet.add(folderPath);
            }
            return newSet;
        });
    }, []);

    return (
        <div className="space-y-0.5 mt-2">
            {fileTree.map((node) => (
                <TreeNode
                    key={node.path}
                    node={node}
                    level={0}
                    expandedFolders={expandedFolders}
                    onToggleFolder={handleToggleFolder}
                />
            ))}
        </div>
    );
};