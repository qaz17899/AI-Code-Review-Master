import React, { useState, useEffect, useRef, useMemo } from 'react';

export const AnimatedMessage: React.FC<{ messages: string[]; files?: string[]; className?: string }> = ({ messages, files = [], className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(messages[0] || '');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const combinedMessages = useMemo(() => {
    if (files.length === 0) return messages;
    // Interleave file names with generic messages, capping file names to avoid being too repetitive
    const fileMessages = files.slice(0, 15).map(f => `掃描 ${f}...`);
    const newMessages: string[] = [];
    const maxLength = Math.max(messages.length, fileMessages.length);

    for (let i = 0; i < maxLength; i++) {
        if (messages[i]) newMessages.push(messages[i]);
        if (fileMessages[i]) newMessages.push(fileMessages[i]);
    }
    return newMessages.length > 0 ? newMessages : messages;
  }, [messages, files]);

  useEffect(() => {
    // Reset when messages change
    setDisplayedText(combinedMessages[0] || '');
    setCurrentIndex(0);
  }, [combinedMessages]);

  useEffect(() => {
    if (combinedMessages.length <= 1) return;

    // Clear previous timeout if messages change
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
        setIsAnimatingOut(true); // Start fade-out animation

        setTimeout(() => {
            const nextIndex = (currentIndex + 1) % combinedMessages.length;
            setCurrentIndex(nextIndex);
            setDisplayedText(combinedMessages[nextIndex]);
            setIsAnimatingOut(false); // Reset for fade-in
        }, 500); // This should match the animation duration
    }, 3500);

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) };
  }, [currentIndex, combinedMessages]);

  return (
    <div className="relative h-6 w-full flex items-center justify-start">
      <p key={displayedText} className={`font-mono absolute ${isAnimatingOut ? 'animate-fade-out-down' : 'animate-fade-in-up'} ${className}`}>{displayedText}</p>
    </div>
  );
};