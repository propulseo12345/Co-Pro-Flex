'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLotDetailPage } from '@/hooks/modules/useLotDetailPage';
import { LotDetailSidebar, LotDetailMain } from '@/components/features/lots';
import { LoadingState, ErrorState } from '@/components/ui/DataState/DataState';
import styles from './lot-detail.module.css';

const LOT_TYPE_LABELS: Record<string, string> = {
  appartement: 'Appartement', studio: 'Studio', parking: 'Parking',
  cave: 'Cave', local_commercial: 'Commerce', bureau: 'Bureau',
  garage: 'Garage', box: 'Box', autre: 'Autre',
};

export default function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { lot, isLoading, error, repartition, loanShares, advances, refresh } = useLotDetailPage(id);

  if (isLoading) return <LoadingState message="Chargement du lot..." />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!lot) return <ErrorState message="Lot introuvable" />;

  return (
    <div className="container">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1>Lot {lot.ref}</h1>
          <div className={styles.topBarMeta}>
            {lot.type && <span className={styles.metaBadge}>{LOT_TYPE_LABELS[lot.type] || lot.type}</span>}
            {lot.floor != null && <span className={styles.metaBadge}>Étage {lot.floor}</span>}
            <span className={styles.metaBadge}>{lot.tantiemes_generaux} tantièmes</span>
          </div>
        </div>
        <button className={styles.backBtn} onClick={() => router.push('/coproprietaires/lots')}>
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className={styles.layout}>
        <LotDetailSidebar lot={lot} loanShares={loanShares} advances={advances} />
        <LotDetailMain repartition={repartition} />
      </div>
    </div>
  );
}
