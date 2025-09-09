import React, { useState, useEffect } from 'react';

export const AnimatedMessage: React.FC<{ messages: string[]; className?: string }> = ({ messages, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (messages.length > 0) {
        setCurrentIndex(Math.floor(Math.random() * messages.length));
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length <= 1) return;

    const timeout = setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % messages.length);
    }, 3500); // Change message every 3.5 seconds

    return () => clearTimeout(timeout);
  }, [currentIndex, messages]);

  const displayedText = messages[currentIndex] || '';

  return (
    <div className="relative h-6 flex items-center justify-center">
      <p key={displayedText} className={`font-mono absolute animate-[fade-in-up_0.5s_ease-out_forwards] ${className}`}>
        {displayedText}
      </p>
    </div>
  );
};
