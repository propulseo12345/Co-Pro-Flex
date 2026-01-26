'use client';

import { X } from 'lucide-react';
import { PV_VARIABLE_CATEGORIES, getVariablesByCategory } from '@/lib/constants/pv-variables';
import type { PVVariableCategory } from '@/types/models/pv-template';
import styles from '@/app/(dashboard)/settings/templates/[id]/editor.module.css';

interface VariablesPaletteProps {
  onClose: () => void;
  onInsert: (key: string) => void;
}

export function VariablesPalette({ onClose, onInsert }: VariablesPaletteProps) {
  const categories = Object.keys(PV_VARIABLE_CATEGORIES) as PVVariableCategory[];

  return (
    <div className={styles.variablesPalette}>
      <div className={styles.paletteHeader}>
        <h3>Variables disponibles</h3>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      <div className={styles.paletteContent}>
        {categories.map(category => {
          const variables = getVariablesByCategory(category);
          if (variables.length === 0) return null;
          return (
            <div key={category} className={styles.variableCategory}>
              <h4>{PV_VARIABLE_CATEGORIES[category]}</h4>
              <div className={styles.variableList}>
                {variables.map(variable => (
                  <button key={variable.key} className={styles.variableBtn} onClick={() => onInsert(variable.key)} title={variable.description}>
                    <span className={styles.variableKey}>{`{{${variable.key}}}`}</span>
                    <span className={styles.variableLabel}>{variable.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
