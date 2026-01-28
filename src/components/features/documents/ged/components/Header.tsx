'use client';

import { Upload, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import type { DocumentStats } from '@/lib/documents/api';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface HeaderProps {
  showChecklist: boolean;
  onChecklistToggle: () => void;
  stats?: DocumentStats | null;
  rootFolderCount: number;
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '0 Mo';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (mb > 1000) return `${(mb / 1024).toFixed(1)} Go`;
  return `${mb.toFixed(1)} Mo`;
}

export function Header({ showChecklist, onChecklistToggle, stats, rootFolderCount }: HeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Gestion Électronique des Documents</h1>
        <p className={styles.subtitle}>
          {stats?.total_documents || 0} documents • {formatBytes(stats?.total_size_bytes)} •{' '}
          {rootFolderCount} dossiers principaux
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
