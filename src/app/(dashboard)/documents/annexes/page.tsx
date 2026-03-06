'use client';

import { useState } from 'react';
import { useAnnexeSummary } from '@/hooks/modules/useAnnexeSummary';
import { useAnnexeData } from '@/hooks/modules/useAnnexeData';
import { useCopro } from '@/providers/CoproContext';
import {
  Annexe1Table,
  Annexe1DetailCoprosTable,
  Annexe2Table,
  Annexe3Table,
  Annexe4Table,
  Annexe5Table,
} from '@/components/features/finance/Comptabilite';
import type { AnnexeKpis } from '@/components/features/finance/Comptabilite/types';
import styles from './annexes.module.css';

type ViewMode = 'simplified' | 'legal';

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

interface SimplifiedViewProps {
  kpis: AnnexeKpis;
}

function SimplifiedView({ kpis }: SimplifiedViewProps) {
  return (
    <div className={styles.kpiGrid}>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Tresorerie</span>
        <span className={styles.kpiValue}>{formatEuro(kpis.tresorerie)}</span>
      </div>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Budget consomme</span>
        <span className={styles.kpiValue}>{kpis.budget_pct}%</span>
      </div>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Travaux en cours</span>
        <span className={styles.kpiValue}>
          {kpis.nb_travaux_ouverts} ({formatEuro(kpis.travaux_en_cours)})
        </span>
      </div>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Impayes</span>
        <span className={styles.kpiValue}>{formatEuro(kpis.total_impayes)}</span>
      </div>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Provisions travaux</span>
        <span className={styles.kpiValue}>{formatEuro(kpis.provisions_travaux)}</span>
      </div>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Dettes fournisseurs</span>
        <span className={styles.kpiValue}>{formatEuro(kpis.dettes)}</span>
      </div>
    </div>
  );
}

interface LegalViewProps {
  coproId: string | null;
  periodId: string | null;
  coproName: string;
  exercice: string;
}

function LegalView({ coproId, periodId, coproName, exercice }: LegalViewProps) {
  const annexe1 = useAnnexeData(coproId, periodId, 1);
  const annexe1Detail = useAnnexeData(coproId, periodId, '1_detail');
  const annexe2 = useAnnexeData(coproId, periodId, 2);
  const annexe3 = useAnnexeData(coproId, periodId, 3);
  const annexe4 = useAnnexeData(coproId, periodId, 4);
  const annexe5 = useAnnexeData(coproId, periodId, 5);

  const year = new Date().getFullYear();
  const periodLabels = {
    exPrecedent: `${year - 1}`,
    exClosBudget: `${year}`,
    exClosRealise: `${year}`,
    bpEnCours: `${year + 1}`,
    bpAVoter: `${year + 2}`,
  };

  const anyLoading = annexe1.isLoading || annexe2.isLoading || annexe3.isLoading || annexe4.isLoading || annexe5.isLoading;

  if (anyLoading) {
    return <p className={styles.loadingText}>Chargement des annexes officielles...</p>;
  }

  return (
    <div className={styles.legalSection}>
      {annexe1.data && (
        <Annexe1Table data={annexe1.data} exercice={exercice} coproName={coproName} />
      )}
      {annexe1Detail.data && (
        <Annexe1DetailCoprosTable data={annexe1Detail.data} coproName={coproName} />
      )}
      {annexe2.data && (
        <Annexe2Table data={annexe2.data} exercice={exercice} coproName={coproName} periodLabels={periodLabels} />
      )}
      {annexe3.data && (
        <Annexe3Table data={annexe3.data} exercice={exercice} coproName={coproName} periodLabels={periodLabels} />
      )}
      {annexe4.data && (
        <Annexe4Table data={annexe4.data} exercice={exercice} coproName={coproName} />
      )}
      {annexe5.data && (
        <Annexe5Table data={annexe5.data} exercice={exercice} coproName={coproName} />
      )}
    </div>
  );
}

export default function AnnexesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('simplified');
  const { kpis, periodId, isLoading, error } = useAnnexeSummary();
  const { currentCoproId, currentCopro } = useCopro();

  if (isLoading) {
    return <div className={styles.container}><p className={styles.loadingText}>Chargement...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  }

  const coproName = currentCopro?.name || 'Copropriete';
  const exercice = String(new Date().getFullYear());

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Annexes comptables</h1>
        <p className={styles.subtitle}>Decret n 2005-240 - Documents obligatoires</p>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${viewMode === 'simplified' ? styles.tabActive : ''}`}
            onClick={() => setViewMode('simplified')}
          >
            Vue simplifiee
          </button>
          <button
            className={`${styles.tab} ${viewMode === 'legal' ? styles.tabActive : ''}`}
            onClick={() => setViewMode('legal')}
          >
            Documents officiels
          </button>
        </div>
      </div>

      {viewMode === 'simplified' && kpis && (
        <SimplifiedView kpis={kpis} />
      )}

      {viewMode === 'legal' && (
        <LegalView
          coproId={currentCoproId}
          periodId={periodId}
          coproName={coproName}
          exercice={exercice}
        />
      )}
    </div>
  );
}
