import React from 'react';
import type { AppFile } from '../types';
import {
    PythonIcon,
    YamlIcon,
    TypeScriptIcon,
    JavaScriptIcon,
    JsonIcon,
    HtmlIcon,
    CssIcon,
    FileIcon,
} from '../components/icons';

export interface TreeNodeData {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: TreeNodeData[];
}

export type FolderSelectionState = 'all' | 'partial' | 'none';

export const getFolderSelectionState = (folderPath: string, folderFileMap: Map<string, string[]>, selectedFilePaths: Set<string>): FolderSelectionState => {
    const allFiles = folderFileMap.get(folderPath) || [];
    if (allFiles.length === 0) return 'none';
    const selectedCount = allFiles.filter(path => selectedFilePaths.has(path)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === allFiles.length) return 'all';
    return 'partial';
};

export const buildFileTree = (files: AppFile[]): TreeNodeData[] => {
    const root: { type: 'folder', children: { [key: string]: any } } = { type: 'folder', children: {} };

    files.forEach(file => {
        let currentLevel = root.children;
        const pathParts = file.path.split('/');
        pathParts.forEach((part, index) => {
            if (index === pathParts.length - 1) { // It's a file
                currentLevel[part] = { name: part, path: file.path, type: 'file' };
            } else { // It's a folder
                if (!currentLevel[part]) {
                    const currentPath = pathParts.slice(0, index + 1).join('/');
                    currentLevel[part] = { name: part, path: currentPath, type: 'folder', children: {} };
                }
                currentLevel = currentLevel[part].children;
            }
        });
    });

    const convertChildrenToArray = (node: any): any => {
        if (!node.children) return node;
        const childrenArray: TreeNodeData[] = Object.values(node.children);
        childrenArray.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1; // Folders first
        });
        
        node.children = childrenArray.map(child => convertChildrenToArray(child));
        return node;
    };
    
    return convertChildrenToArray(root).children;
};

export const getFileIcon = (fileName: string): React.ReactNode => {
    const className = "h-5 w-5 flex-shrink-0";
    if (fileName.endsWith('.py')) return React.createElement(PythonIcon, { className });
    if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) return React.createElement(YamlIcon, { className: `${className} text-amber-400` });
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return React.createElement(TypeScriptIcon, { className });
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return React.createElement(JavaScriptIcon, { className });
    if (fileName.endsWith('.json')) return React.createElement(JsonIcon, { className });
    if (fileName.endsWith('.html')) return React.createElement(HtmlIcon, { className });
    if (fileName.endsWith('.css')) return React.createElement(CssIcon, { className });
    return React.createElement(FileIcon, { className: `${className} text-slate-500 dark:text-slate-400` });
};
