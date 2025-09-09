import React, { useState, useEffect } from 'react';

// A component that displays messages, cycling through a list, without a typing animation.
export const AnimatedMessage: React.FC<{ messages: string[]; className?: string }> = ({ messages, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Effect to pick a random starting index once when the component mounts
  useEffect(() => {
    if (messages.length > 0) {
        setCurrentIndex(Math.floor(Math.random() * messages.length));
    }
  }, [messages.length]);

  // Effect to handle message cycling logic
  useEffect(() => {
    if (messages.length <= 1) return;

    // Interval to switch to the next message after a delay
    const timeout = setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % messages.length);
    }, 3000); // Change message every 3 seconds

    return () => clearTimeout(timeout);
  }, [currentIndex, messages]);

  const displayedText = messages[currentIndex] || '';

  return (
    <p className={`font-mono ${className}`}>
      {displayedText}
    </p>
  );
};
