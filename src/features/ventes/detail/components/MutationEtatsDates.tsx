'use client';

import { FileText } from 'lucide-react';
import { EtatDateViewer } from '@/features/ventes/components';
import type { EtatDateSnapshot } from '@/features/ventes/domain/types';
import styles from '@/app/(dashboard)/ventes-impayes/ventes/[id]/detail-vente.module.css';

interface MutationEtatsDatesProps {
  snapshots: EtatDateSnapshot[];
  preEtatSnapshot: EtatDateSnapshot | null;
  finalEtatSnapshot: EtatDateSnapshot | null;
  canGeneratePreEtat: boolean;
  isProcessing: boolean;
  onGeneratePreEtat: () => void;
  onViewDocument: (docId: string) => void;
}

export function MutationEtatsDates({
  snapshots,
  preEtatSnapshot,
  finalEtatSnapshot,
  canGeneratePreEtat,
  isProcessing,
  onGeneratePreEtat,
  onViewDocument,
}: MutationEtatsDatesProps) {
  return (
    <div className={styles.mainCard}>
      <h3 className={styles.cardTitle}>
        <FileText size={16} />
        États Datés (Art. 20)
      </h3>

      {snapshots.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={48} />
          <p>Aucun état daté généré</p>
          {canGeneratePreEtat && (
            <button
              className="btn btn-primary"
              onClick={onGeneratePreEtat}
              disabled={isProcessing}
              style={{ marginTop: '1rem' }}
            >
              Générer le pré-état daté
            </button>
          )}
        </div>
      ) : (
        <div className={styles.etatDateList}>
          {preEtatSnapshot && (
            <EtatDateViewer
              snapshot={preEtatSnapshot}
              onViewDocument={onViewDocument}
            />
          )}
          {finalEtatSnapshot && (
            <EtatDateViewer
              snapshot={finalEtatSnapshot}
              onViewDocument={onViewDocument}
            />
          )}
        </div>
      )}
    </div>
  );
}
