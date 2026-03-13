'use client';

import clsx from 'clsx';
import type { ContratDetaille, ContratSyndic } from '@/types';
import styles from '@/app/(dashboard)/maintenance/contracts/contracts.module.css';

interface ContractsKpiBarProps {
  contrats: ContratDetaille[];
  contratSyndic: ContratSyndic | null;
}

export function ContractsKpiBar({ contrats, contratSyndic }: ContractsKpiBarProps) {
  const actifs =
    contrats.filter((c) => c.statut === 'ACTIF').length +
    (contratSyndic?.statut === 'ACTIF' ? 1 : 0);

  const aRenouveler = contrats.filter((c) => c.statut === 'A_RENOUVELER').length;
  const expires = contrats.filter((c) => c.statut === 'EXPIRE').length;

  const montantTotal =
    contrats
      .filter((c) => c.statut === 'ACTIF' || c.statut === 'A_RENOUVELER')
      .reduce((sum, c) => sum + (c.coutAnnuel || 0), 0) +
    (contratSyndic && (contratSyndic.statut === 'ACTIF' || contratSyndic.statut === 'A_RENOUVELER')
      ? contratSyndic.montantAnnuel
      : 0);

  const kpis = [
    { value: actifs, label: 'Actifs', color: '#3ecf8e' },
    { value: aRenouveler, label: 'À renouveler', color: '#e5a63e' },
    { value: expires, label: 'Expirés', color: '#e35d6a', alert: expires > 0 },
    { value: montantTotal.toLocaleString('fr-FR') + ' €', label: 'Coût annuel', color: '#5b8def' },
    { value: contrats.length, label: 'Total contrats', color: '#7b8498' },
  ];

  return (
    <div className={styles.v2KpiRow}>
      {kpis.map((k) => (
        <div key={k.label} className={clsx(styles.v2Kpi, k.alert && styles.v2KpiAlert)}>
          <span className={styles.v2KpiDot} style={{ background: k.color }} />
          <div className={styles.v2KpiData}>
            <span className={styles.v2KpiNum}>{k.value}</span>
            <span className={styles.v2KpiLabel}>{k.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
