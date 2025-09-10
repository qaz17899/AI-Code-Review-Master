import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons';
import { getUploadPayloadFromFileEntry, getFilesFromDirectoryEntry, type UploadPayload } from '../utils';

interface FileUploadProps {
  onFilesChange: (payloads: UploadPayload[]) => void;
  acceptedTypes?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange, acceptedTypes = [] }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    let allPayloads: UploadPayload[] = [];
    const items = e.dataTransfer.items;

    if (items && items.length > 0) {
        const entryPromises: Promise<UploadPayload[]>[] = [];
        for (const item of items) {
            const entry = item.webkitGetAsEntry();
            if (!entry) continue;

            if (entry.isFile) {
                entryPromises.push(getUploadPayloadFromFileEntry(entry as FileSystemFileEntry).then(payload => [payload]));
            } else if (entry.isDirectory) {
                entryPromises.push(getFilesFromDirectoryEntry(entry as FileSystemDirectoryEntry));
            }
        }
        
        try {
            const payloadArrays = await Promise.all(entryPromises);
            allPayloads = payloadArrays.flat();
        } catch (error) {
            console.error("Error processing dropped items:", error);
            // Fallback for safety, though less reliable for folder structure
            const files = Array.from(e.dataTransfer.files);
            allPayloads = files.map(file => ({ file, path: (file as any).webkitRelativePath || file.name }));
        }
    } else {
        // Fallback for browsers without item support or when dropping only files
        const files = Array.from(e.dataTransfer.files);
        allPayloads = files.map(file => ({ file, path: (file as any).webkitRelativePath || file.name }));
    }
    
    if (allPayloads.length > 0) {
      onFilesChange(allPayloads);
    }
  }, [onFilesChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        const payloads: UploadPayload[] = files.map(file => ({
            file,
            path: (file as any).webkitRelativePath || file.name,
        }));
        if (payloads.length > 0) {
          onFilesChange(payloads);
        }
    }
    // Reset input value to allow re-uploading the same file/folder
    e.target.value = '';
  };
  
  const handleClick = () => {
      inputRef.current?.click();
  }

  const dragClasses = isDragging
    ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 ring-2 ring-[var(--accent-color)] shadow-inner'
    : 'border-stone-500 dark:border-slate-700 bg-stone-300/50 dark:bg-slate-800/60 hover:border-[var(--accent-color)]/80 hover:bg-stone-400/50 dark:hover:bg-slate-800/90';

  return (
    <div
      className={`relative w-full p-8 text-center border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${dragClasses}`}
      style={{ borderColor: isDragging ? 'var(--accent-color)' : '' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      aria-label="File upload area"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        mozdirectory=""
      />
      <div className="flex flex-col items-center justify-center text-stone-600 dark:text-slate-400 pointer-events-none">
        <UploadIcon className={`h-12 w-12 mb-4 text-stone-500 dark:text-slate-500 transition-all duration-300 ${isDragging ? 'text-[var(--accent-color)] animate-bounce' : ''}`} />
        <p className="text-lg font-semibold text-stone-700 dark:text-slate-300">
          將您的專案資料夾或檔案拖放到此處
        </p>
        <p className="mt-1">或 <span className="font-bold text-[var(--accent-color)]">點擊瀏覽</span></p>
        <p className="text-xs text-stone-500 dark:text-slate-500 mt-2">（提示：支援上傳 .zip 壓縮檔、單一資料夾或多個檔案。）</p>
      </div>
    </div>
  );
};