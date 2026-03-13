'use client';

import { Building2, Wrench, ShieldCheck, TrendingUp } from 'lucide-react';
import type { ContratDetaille, ContratSyndic } from '@/types';
import styles from '@/app/(dashboard)/maintenance/contracts/contracts.module.css';

interface ContractsCostBarProps {
  contrats: ContratDetaille[];
  contratSyndic: ContratSyndic | null;
}

const ASSURANCE_TYPES = new Set(['ASSURANCE']);
const ENERGIE_TYPES = new Set(['ENERGIE']);

function isActive(statut: string): boolean {
  return statut === 'ACTIF' || statut === 'A_RENOUVELER';
}

export function ContractsCostBar({ contrats, contratSyndic }: ContractsCostBarProps) {
  const syndicMontant =
    contratSyndic && isActive(contratSyndic.statut) ? contratSyndic.montantAnnuel : 0;

  const maintenanceContrats = contrats.filter((c) => !ASSURANCE_TYPES.has(c.type) && !ENERGIE_TYPES.has(c.type));
  const assuranceContrats = contrats.filter((c) => ASSURANCE_TYPES.has(c.type));
  const energieContrats = contrats.filter((c) => ENERGIE_TYPES.has(c.type));

  const sumActive = (list: ContratDetaille[]) =>
    list.filter((c) => isActive(c.statut)).reduce((s, c) => s + (c.coutAnnuel || 0), 0);

  const cats = [
    { label: 'Syndic', icon: Building2, color: '#5b8def', montant: syndicMontant, count: 1 },
    { label: 'Maintenance', icon: Wrench, color: '#5b8def', montant: sumActive(maintenanceContrats), count: maintenanceContrats.length },
    { label: 'Assurances', icon: ShieldCheck, color: '#9b8afb', montant: sumActive(assuranceContrats), count: assuranceContrats.length },
    { label: 'Énergie', icon: TrendingUp, color: '#e5a63e', montant: sumActive(energieContrats), count: energieContrats.length },
  ];

  return (
    <div className={styles.v2CostStrip}>
      {cats.map((cat) => {
        const I = cat.icon;
        return (
          <div key={cat.label} className={styles.v2CostCell}>
            <div className={styles.v2CostIcon} style={{ background: cat.color + '12', color: cat.color }}>
              <I size={14} />
            </div>
            <div className={styles.v2CostData}>
              <span className={styles.v2CostLabel}>{cat.label} ({cat.count})</span>
              <span className={styles.v2CostAmount}>{cat.montant.toLocaleString('fr-FR')} €</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
