'use client';

import { Upload, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { GED_FOLDERS, MOCK_DOCUMENTS_STATS } from '@/data/mock/documents-ged';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface HeaderProps {
  showChecklist: boolean;
  onChecklistToggle: () => void;
}

export function Header({ showChecklist, onChecklistToggle }: HeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Gestion Électronique des Documents</h1>
        <p className={styles.subtitle}>
          {MOCK_DOCUMENTS_STATS.total} documents • {MOCK_DOCUMENTS_STATS.tailleTotal} •{' '}
          {GED_FOLDERS.filter((f) => f.parentId === null).length} dossiers principaux
        </p>
      </div>
      <div className={styles.headerActions}>
        <button
          className={clsx('btn', showChecklist ? 'btn-primary' : 'btn-outline')}
          onClick={onChecklistToggle}
        >
          <CheckCircle size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Checklist
        </button>
        <button className="btn btn-primary">
          <Upload size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Importer
        </button>
      </div>
    </div>
  );
}
