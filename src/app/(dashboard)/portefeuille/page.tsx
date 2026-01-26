'use client';

import { Search, AlertTriangle, RefreshCcw } from 'lucide-react';
import { usePortefeuille } from '@/hooks/modules/usePortefeuille';
import { PortefeuilleKpis, PortefeuilleTable } from '@/components/features/portefeuille';
import type { AlerteType } from '@/types/models/portefeuille';
import styles from './portefeuille.module.css';

const alerteTypeLabels: Record<AlerteType, string> = { IMPAYE: 'Impayés', FACTURE: 'Factures', BUDGET: 'Budgets', RAPPROCHEMENT: 'Rapprochement', CONTRAT: 'Contrats', AG: 'AG' };

export default function PortefeuillePage() {
  const { filteredCoproprietes, kpis, filtres, exercicesDisponibles, setRecherche, setExercice, setAlertesSeulement, setTypeAlerte, resetFiltres } = usePortefeuille();

  const formatMontant = (m: number) => m.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
  const totalAlertes = kpis.alertesCritiques + kpis.alertesWarning;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}><h1>Portefeuille</h1><p>Vue consolidée de vos {kpis.totalCoproprietes} copropriétés · {kpis.totalLots} lots</p></div>
        <div className={styles.headerActions}>
          <select className={styles.exerciceSelect} value={filtres.exercice} onChange={(e) => setExercice(parseInt(e.target.value, 10))}>
            {exercicesDisponibles.map((ex) => (<option key={ex} value={ex}>Exercice {ex}</option>))}
          </select>
        </div>
      </div>

      <PortefeuilleKpis kpis={kpis} formatMontant={formatMontant} />

      <div className={styles.filtersBar}>
        <div className={styles.searchBox}><Search size={18} /><input type="text" placeholder="Rechercher une copropriété..." value={filtres.recherche} onChange={(e) => setRecherche(e.target.value)} /></div>
        <div className={styles.filterButtons}>
          <button className={`${styles.filterButton} ${filtres.alertesSeulement ? styles.filterButtonActive : ''}`} onClick={() => setAlertesSeulement(!filtres.alertesSeulement)}>
            <AlertTriangle size={14} />Alertes{totalAlertes > 0 && <span className={styles.filterBadge}>{totalAlertes}</span>}
          </button>
          {(['IMPAYE', 'FACTURE', 'BUDGET', 'RAPPROCHEMENT'] as AlerteType[]).map((type) => (
            <button key={type} className={`${styles.filterButton} ${filtres.typeAlerte === type ? styles.filterButtonActive : ''}`} onClick={() => setTypeAlerte(filtres.typeAlerte === type ? undefined : type)}>
              {alerteTypeLabels[type]}
            </button>
          ))}
        </div>
        {(filtres.recherche || filtres.alertesSeulement || filtres.typeAlerte) && (<button className={styles.resetButton} onClick={resetFiltres}><RefreshCcw size={14} />Réinitialiser</button>)}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}><h2 className={styles.tableTitle}>Copropriétés</h2><span className={styles.tableCount}>{filteredCoproprietes.length} copropriété{filteredCoproprietes.length > 1 ? 's' : ''}</span></div>
        <div className={styles.tableContainer}>
          <PortefeuilleTable coproprietes={filteredCoproprietes} formatMontant={formatMontant} formatDate={formatDate} />
        </div>
      </div>
    </div>
  );
}
