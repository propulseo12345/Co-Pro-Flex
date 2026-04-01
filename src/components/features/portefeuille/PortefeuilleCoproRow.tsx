'use client';

import { Building2, AlertTriangle, Wrench, CheckCircle, ChevronRight, Calendar } from 'lucide-react';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import styles from '../../../app/(gestionnaire)/portefeuille/portefeuille.module.css';

interface PortefeuilleCoproRowProps {
  copro: ICoproprietePortefeuille;
  onSelect: (copro: ICoproprietePortefeuille) => void;
}

function formatMontant(m: number): string {
  return m.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PortefeuilleCoproRow({ copro, onSelect }: PortefeuilleCoproRowProps) {
  const alertesCritiques = copro.alertes.filter(a => a.severite === 'critique').length;
  const maintenanceCount = copro.facturesEnRetard;

  return (
    <button
      className={styles.coproRow}
      onClick={() => onSelect(copro)}
      type="button"
    >
      <div className={styles.rowIcon}>
        <Building2 size={20} />
      </div>

      <div className={styles.rowInfo}>
        <h5 className={styles.rowName}>{copro.nom}</h5>
        <p className={styles.rowAddress}>{copro.adresse}</p>
      </div>

      <div className={styles.rowSolde}>
        <p className={styles.rowSoldeLabel}>Solde Global</p>
        <p className={styles.rowSoldeValue}>{formatMontant(copro.soldeDisponible)}&euro;</p>
      </div>

      <div className={styles.rowAlerts}>
        <div className={`${styles.rowAlertItem} ${alertesCritiques > 0 ? styles.rowAlertDanger : styles.rowAlertOk}`}>
          {alertesCritiques > 0 ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
          <span className={styles.rowAlertCount}>{alertesCritiques}</span>
        </div>
        <div className={`${styles.rowAlertItem} ${maintenanceCount > 0 ? styles.rowAlertWarning : styles.rowAlertOk}`}>
          <Wrench size={14} />
          <span className={styles.rowAlertCount}>{maintenanceCount}</span>
        </div>
      </div>

      <div className={styles.rowAG}>
        <p className={styles.rowAGLabel}>Date AG</p>
        <p className={styles.rowAGValue}>
          {copro.prochaineAG ? formatDate(copro.prochaineAG) : '\u2014'}
        </p>
      </div>

      <ChevronRight size={18} className={styles.rowChevron} />
    </button>
  );
}
