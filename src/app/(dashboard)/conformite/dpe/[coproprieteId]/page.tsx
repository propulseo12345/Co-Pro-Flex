'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { DPEFicheDetail } from '@/components/features/conformite/dpe/DPEFicheDetail';
import { useDPE } from '@/hooks/useDPE';
import styles from './dpe-detail.module.css';

export default function DPEDetailPage() {
  const { coproprieteId } = useParams<{ coproprieteId: string }>();
  const router = useRouter();
  const { selectedDPE } = useDPE({ coproprieteId });

  if (!selectedDPE) {
    return (
      <div className="container">
        <p className={styles.notFound}>DPE introuvable pour cette copropriété.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <FinanceTopBar
        title={`DPE — ${selectedDPE.coproprieteNom}`}
        subtitle={`${selectedDPE.nbLots} lots · Classe ${selectedDPE.classeEnergie} · ${selectedDPE.consoEnergie} kWh/m²/an`}
        actions={
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.push('/conformite/dpe')}
            aria-label="Retour à la liste des DPE"
          >
            <ArrowLeft size={14} /> Retour à la liste
          </button>
        }
      />
      <DPEFicheDetail dpe={selectedDPE} />
    </div>
  );
}
