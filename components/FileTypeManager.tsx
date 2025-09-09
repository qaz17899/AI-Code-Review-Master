
import React, { useState, KeyboardEvent } from 'react';

interface FileTypeManagerProps {
  types: string[];
  onChange: (newTypes: string[]) => void;
}

export const FileTypeManager: React.FC<FileTypeManagerProps> = ({ types, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddType = () => {
    let newType = inputValue.trim().toLowerCase();
    if (!newType) return;

    // Add leading dot if missing
    if (!newType.startsWith('.')) {
      newType = `.${newType}`;
    }

    // Prevent duplicates
    if (!types.includes(newType)) {
      onChange([...types, newType]);
    }
    setInputValue('');
  };

  const handleRemoveType = (typeToRemove: string) => {
    onChange(types.filter(t => t !== typeToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddType();
    }
  };

  return (
    <div className="mt-6">
      <label htmlFor="file-type-input" className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-2">
        可接受的檔案類型:
      </label>
      <div className="flex flex-wrap items-center gap-2 p-2 bg-stone-200 dark:bg-slate-800 border-2 border-stone-300 dark:border-slate-700 rounded-lg focus-within:ring-2 focus-within:ring-[var(--accent-color)] transition">
        {types.map(type => (
          <div key={type} className="flex items-center gap-1.5 bg-stone-300 dark:bg-slate-700 text-stone-800 dark:text-slate-200 text-sm font-mono px-2 py-1 rounded-md animate-fade-in">
            <span>{type}</span>
            <button
              type="button"
              onClick={() => handleRemoveType(type)}
              className="text-stone-500 dark:text-slate-500 hover:text-red-400 transition-colors"
              aria-label={`移除 ${type}`}
            >
              &times;
            </button>
          </div>
        ))}
        <input
          id="file-type-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddType}
          className="flex-grow bg-transparent text-stone-800 dark:text-slate-200 placeholder-stone-500 dark:placeholder-slate-500 focus:outline-none p-1 min-w-[120px]"
          placeholder="新增類型..."
        />
      </div>
    </div>
  );
};