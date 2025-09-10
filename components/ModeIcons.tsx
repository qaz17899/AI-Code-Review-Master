import React from 'react';
import type { ReviewMode } from '../types';
import { MODES } from '../config/modes';

export const getModeIcon = (mode: ReviewMode, className: string): JSX.Element => {
    const IconComponent = MODES[mode]?.icon || MODES['REVIEW'].icon;
    return <IconComponent className={className} />;
};
