import React, { useState, useEffect, useRef } from 'react';

export const AnimatedMessage: React.FC<{ messages: string[]; className?: string }> = ({ messages, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(messages[0] || '');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
        const initialIndex = Math.floor(Math.random() * messages.length);
        setCurrentIndex(initialIndex);
        setDisplayedText(messages[initialIndex] || '');
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length <= 1) return;

    // Clear previous timeout if messages change
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
        setIsAnimatingOut(true); // Start fade-out animation

        setTimeout(() => {
            const nextIndex = (currentIndex + 1) % messages.length;
            setCurrentIndex(nextIndex);
            setDisplayedText(messages[nextIndex]);
            setIsAnimatingOut(false); // Reset for fade-in
        }, 500); // This should match the animation duration
    }, 3500);

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) };
  }, [currentIndex, messages, messages.length]);

  return (
    <div className="relative h-6 w-full flex items-center justify-start">
      <p key={displayedText} className={`font-mono absolute ${isAnimatingOut ? 'animate-fade-out-down' : 'animate-fade-in-up'} ${className}`}>{displayedText}</p>
    </div>
  );
};