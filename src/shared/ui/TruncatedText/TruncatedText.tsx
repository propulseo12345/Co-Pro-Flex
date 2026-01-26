'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './TruncatedText.module.css';

interface TooltipState {
    visible: boolean;
    text: string;
    x: number;
    y: number;
}

interface TruncatedTextProps {
    text: string;
    maxWidth?: number;
}

export function TruncatedText({ text, maxWidth = 300 }: TruncatedTextProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });

    useEffect(() => {
        if (ref.current) {
            setIsTruncated(ref.current.scrollWidth > ref.current.clientWidth);
        }
    }, [text]);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (isTruncated) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({ visible: true, text, x: rect.left, y: rect.bottom + 4 });
        }
    };

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    return (
        <>
            <span
                ref={ref}
                className={styles.truncatedText}
                style={{ maxWidth }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {text}
            </span>
            {tooltip.visible && (
                <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y }}>
                    {tooltip.text}
                </div>
            )}
        </>
    );
}
