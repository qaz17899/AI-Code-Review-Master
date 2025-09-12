import React, { useEffect } from 'react';
import { XIcon } from './icons';

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 animate-fade-in" 
      style={{ animationDuration: '200ms' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-all transform-gpu hover:scale-110 active:scale-95"
        aria-label="Close image view"
      >
        <XIcon className="h-8 w-8" />
      </button>
      <div className="relative p-4 animate-fade-in-up" style={{ animationDuration: '300ms' }} onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Enlarged view" 
          className="max-w-screen-lg max-h-[90vh] object-contain rounded-lg shadow-2xl" 
        />
      </div>
    </div>
  );
};