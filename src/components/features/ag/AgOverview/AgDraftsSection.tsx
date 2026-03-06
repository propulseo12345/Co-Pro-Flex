'use client';

import Link from 'next/link';
import { AlertCircle, Plus } from 'lucide-react';
import type { AgDraft } from '@/hooks/modules/useAgDrafts';
import { AgDraftCard } from './AgDraftCard';
import styles from './AgOverview.module.css';

interface AgDraftsSectionProps {
  drafts: AgDraft[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDeleteDraft: (id: string) => Promise<boolean>;
}

export function AgDraftsSection({
  drafts,
  isLoading,
  error,
  onRefresh,
  onDeleteDraft,
}: AgDraftsSectionProps) {
  return (
    <div className={styles.draftsList}>
      <h3 className={styles.draftsListTitle}>
        Brouillons AG en cours
        {drafts.length > 0 && (
          <span className={styles.draftsListCount}>{drafts.length}</span>
        )}
      </h3>

      {isLoading ? (
        <div className={styles.draftsLoading}>
          <span>Chargement des brouillons...</span>
        </div>
      ) : error ? (
        <div className={styles.draftsError}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={onRefresh} className={styles.draftsRetryBtn}>
            Réessayer
          </button>
        </div>
      ) : drafts.length > 0 ? (
        <div className={styles.draftsRows}>
          {drafts.map((draft) => (
            <AgDraftCard key={draft.id} draft={draft} onDelete={onDeleteDraft} />
          ))}
        </div>
      ) : (
        <div className={styles.draftsEmpty}>
          <p>Aucun brouillon</p>
          <Link href="/ag/new" className={styles.draftsEmptyBtn}>
            <Plus size={16} aria-hidden="true" />
            Planifier une nouvelle AG
          </Link>
        </div>
      )}
    </div>
  );
}
