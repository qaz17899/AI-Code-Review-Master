import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    const elementRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        elementRef.current = document.createElement('div');
        document.body.appendChild(elementRef.current);
        setMounted(true);
        return () => {
            if (elementRef.current) {
                document.body.removeChild(elementRef.current);
            }
        };
    }, []);

    if (!mounted || !elementRef.current) {
        return null;
    }

    return ReactDOM.createPortal(children, elementRef.current);
};

export default Portal;