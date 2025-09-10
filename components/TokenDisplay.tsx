import React from 'react';
import { SpinnerIcon, TokenIcon } from './icons';

interface TokenDisplayProps {
    isCounting: boolean;
    tokenCount: number | null;
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({ isCounting, tokenCount }) => {
    if (isCounting) {
        return <SpinnerIcon className="h-3 w-3 animate-spin" />;
    }

    if (tokenCount !== null) {
        return (
            <div key={tokenCount} className="flex items-center gap-1.5 animate-fade-in" style={{ animationDuration: '300ms' }}>
                <TokenIcon className="h-3 w-3" />
                <span>{tokenCount.toLocaleString()} Tokens</span>
            </div>
        );
    }

    return null;
};
