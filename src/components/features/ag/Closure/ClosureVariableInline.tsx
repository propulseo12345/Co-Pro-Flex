'use client';

import { useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import styles from './ClosureVariableInline.module.css';

interface ClosureVariableInlineProps {
    variableName: string;
    variableLabel: string;
    onSave: (value: string) => Promise<void>;
}

export function ClosureVariableInline({ variableName, variableLabel, onSave }: ClosureVariableInlineProps) {
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = useCallback(async () => {
        if (!value.trim() || saving) return;
        setSaving(true);
        try {
            await onSave(value.trim());
            setSaved(true);
        } finally {
            setSaving(false);
        }
    }, [value, saving, onSave]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    }, [handleSave]);

    if (saved) {
        return (
            <div className={styles.container}>
                <span className={styles.label}>{variableLabel}</span>
                <span className={styles.input} style={{ border: 'none', background: 'none' }}>{value}</span>
                <span className={styles.saved}><Check size={16} aria-hidden="true" /></span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <span className={styles.label}>{variableLabel}</span>
            <input
                className={styles.input}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Saisir ${variableLabel}`}
                aria-label={variableLabel}
            />
            <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={!value.trim() || saving}
                title="Valider"
                type="button"
            >
                <Check size={16} aria-hidden="true" />
            </button>
        </div>
    );
}
