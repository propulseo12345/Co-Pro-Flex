'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { PPTYearSelector } from '@/components/features/conformite/ppt/PPTYearSelector';
import { PPTKanban } from '@/components/features/conformite/ppt/PPTKanban';
import { PPTCardDetail } from '@/components/features/conformite/ppt/PPTCardDetail';
import { usePPT } from '@/hooks/usePPT';
import styles from './ppt-detail.module.css';

export default function PPTDetailPage() {
  const { coproprieteId } = useParams<{ coproprieteId: string }>();
  const router = useRouter();
  const {
    selectedCopro,
    travauxByStatut,
    selectedYear,
    setYear,
    years,
    selectedTravail,
    openTravailDetail,
    closeTravailDetail,
  } = usePPT({ coproprieteId });

  if (!selectedCopro) {
    return (
      <div className="container">
        <div className={styles.notFound}>Copropriété introuvable.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <FinanceTopBar
        title={`PPT — ${selectedCopro.nom}`}
        subtitle={`${selectedCopro.nbLots} lots · ${selectedCopro.travaux.length} travaux planifiés`}
        actions={
          <button type="button" className={styles.backBtn} onClick={() => router.push('/conformite/ppt')}>
            <ArrowLeft size={14} /> Retour à la liste
          </button>
        }
      />

      <div className={styles.yearRow}>
        <span className={styles.yearLabel}>Filtrer par année :</span>
        <PPTYearSelector years={years} selectedYear={selectedYear} onSelect={setYear} />
      </div>

      <PPTKanban travauxByStatut={travauxByStatut} onCardClick={openTravailDetail} />

      {selectedTravail && (
        <PPTCardDetail travail={selectedTravail} onClose={closeTravailDetail} />
      )}
    </div>
  );
}
