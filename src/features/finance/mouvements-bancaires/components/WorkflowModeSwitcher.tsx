'use client';

import clsx from 'clsx';
import { Table, Zap } from 'lucide-react';
import type { WorkflowMode } from '../domain/types';
import styles from './WorkflowModeSwitcher.module.css';

interface WorkflowModeSwitcherProps {
  mode: WorkflowMode;
  onModeChange: (mode: WorkflowMode) => void;
  pendingCount: number;
}

export function WorkflowModeSwitcher({ mode, onModeChange, pendingCount }: WorkflowModeSwitcherProps) {
  return (
    <div className={styles.switcher}>
      <button
        className={clsx(styles.btn, mode === 'table' && styles.active)}
        onClick={() => onModeChange('table')}
      >
        <Table size={14} />
        Vue table
      </button>
      <button
        className={clsx(styles.btn, mode === 'workflow' && styles.active)}
        onClick={() => onModeChange('workflow')}
      >
        <Zap size={14} />
        Workflow
        {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
      </button>
    </div>
  );
}
