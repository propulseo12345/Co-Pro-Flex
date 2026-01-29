'use client';

import Link from 'next/link';
import { Edit3, AlertCircle, Plus } from 'lucide-react';
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
    <div className={styles.draftsSection}>
      <div className={styles.draftsSectionHeader}>
        <div className={styles.draftsSectionTitle}>
          <Edit3 size={24} aria-hidden="true" />
          <div>
            <h3>Brouillons AG en cours</h3>
            <p>
              {drafts.length > 0
                ? `${drafts.length} AG non finalisée${drafts.length > 1 ? 's' : ''}`
                : 'Vos AG en cours de création apparaîtront ici'}
            </p>
          </div>
        </div>
      </div>

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
        <div className={styles.draftsGrid}>
          {drafts.map((draft) => (
            <AgDraftCard key={draft.id} draft={draft} onDelete={onDeleteDraft} />
          ))}
        </div>
      ) : (
        <div className={styles.draftsEmpty}>
          <Edit3 size={32} aria-hidden="true" />
          <p>Aucun brouillon pour le moment</p>
          <span>
            Lorsque vous commencez à planifier une AG, elle sera automatiquement sauvegardée ici
            jusqu'à sa finalisation.
          </span>
          <Link href="/ag/new" className={styles.draftsEmptyBtn}>
            <Plus size={16} aria-hidden="true" />
            Planifier une nouvelle AG
          </Link>
        </div>
      )}
    </div>
  );
}
