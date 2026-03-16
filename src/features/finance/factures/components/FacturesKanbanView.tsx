'use client';

import type { Facture } from '@/components/features/finance/Factures/types';
import type { KanbanColumn } from '../types';
import { FacturesKanbanColumn } from './FacturesKanbanColumn';
import styles from './FacturesKanban.module.css';

interface FacturesKanbanViewProps {
  columns: KanbanColumn[];
  onCardClick: (facture: Facture) => void;
}

export function FacturesKanbanView({ columns, onCardClick }: FacturesKanbanViewProps) {
  return (
    <div className={styles.columns}>
      {columns.map(column => (
        <FacturesKanbanColumn
          key={column.id}
          column={column}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
