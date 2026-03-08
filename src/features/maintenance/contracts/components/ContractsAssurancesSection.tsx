'use client';

import { ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import type { ContratAssurance } from '@/types';
import styles from '@/app/(dashboard)/maintenance/contracts/contracts.module.css';

interface ContractsAssurancesSectionProps {
  assurances: ContratAssurance[];
  onSelectAssurance: (assurance: ContratAssurance) => void;
}

/** Label lisible pour chaque sous-type d'assurance */
function getAssuranceTypeLabel(sousType: string): string {
  switch (sousType) {
    case 'MRI': return 'MRI';
    case 'RC_SYNDICAT': return 'RC Syndicat';
    case 'DOMMAGES_OUVRAGE': return 'Dommages-Ouvrage';
    case 'PROTECTION_JURIDIQUE': return 'Protection Juridique';
    default: return 'Autre';
  }
}

/** Vrai si l'échéance tombe dans les 3 prochains mois */
function isEcheanceProche(dateFin: string): boolean {
  const echeance = new Date(dateFin);
  const now = new Date();
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  return echeance <= threeMonths && echeance > now;
}

/** Vrai si la date de fin n'est pas encore passée */
function isGarantieEnCours(dateFin: string): boolean {
  return new Date(dateFin) > new Date();
}

export function ContractsAssurancesSection({
  assurances,
  onSelectAssurance,
}: ContractsAssurancesSectionProps) {
  if (assurances.length === 0) return null;

  return (
    <section className={styles.assurancesSection}>
      <div className={styles.assurancesSectionHeader}>
        <ShieldCheck size={20} aria-hidden="true" />
        <h2>Assurances</h2>
        <span className={styles.assurancesCount}>{assurances.length}</span>
      </div>

      <div className={styles.assurancesGrid}>
        {assurances.map(assurance => (
          <div
            key={assurance.id}
            className={clsx(
              styles.assuranceCard,
              isEcheanceProche(assurance.dateFin) && styles.assuranceCardAlert,
              assurance.sousType === 'DOMMAGES_OUVRAGE' && styles.assuranceCardDo,
            )}
            onClick={() => onSelectAssurance(assurance)}
            title="Cliquer pour voir les détails"
          >
            <div className={styles.assuranceCardHeader}>
              <div className={styles.assuranceCardTitle}>
                <h4>{assurance.nom}</h4>
                <p>{assurance.assureur}</p>
              </div>
              <span className={clsx(
                styles.assuranceTypeBadge,
                styles[`assuranceType_${assurance.sousType.toLowerCase()}`],
              )}>
                {getAssuranceTypeLabel(assurance.sousType)}
              </span>
            </div>

            <div className={styles.assuranceCardDetails}>
              <div className={styles.assuranceDetailRow}>
                <span>N° Police</span>
                <span className={styles.assuranceDetailValue}>{assurance.numeroPolice}</span>
              </div>
              <div className={styles.assuranceDetailRow}>
                <span>Échéance</span>
                <span className={clsx(
                  styles.assuranceDetailValue,
                  isEcheanceProche(assurance.dateFin) && styles.assuranceEcheanceProche,
                )}>
                  {isEcheanceProche(assurance.dateFin) && <AlertCircle size={12} aria-hidden="true" />}
                  {new Date(assurance.dateFin).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {assurance.primeAnnuelle > 0 && (
                <div className={styles.assuranceDetailRow}>
                  <span>Prime annuelle</span>
                  <span className={styles.assuranceDetailValue}>
                    {assurance.primeAnnuelle.toLocaleString()} €
                  </span>
                </div>
              )}
              {assurance.franchise != null && assurance.franchise > 0 && (
                <div className={styles.assuranceDetailRow}>
                  <span>Franchise</span>
                  <span className={styles.assuranceDetailValue}>
                    {assurance.franchise.toLocaleString()} €
                  </span>
                </div>
              )}
              {assurance.sousType === 'DOMMAGES_OUVRAGE' && assurance.travauxConcernes && (
                <div className={styles.assuranceDetailRow}>
                  <span>Travaux</span>
                  <span className={styles.assuranceDetailValue}>{assurance.travauxConcernes}</span>
                </div>
              )}
              {assurance.sousType === 'DOMMAGES_OUVRAGE' && isGarantieEnCours(assurance.dateFin) && (
                <div className={styles.assuranceDetailRow}>
                  <span>Statut</span>
                  <span className={clsx(styles.assuranceDetailValue, styles.assuranceGarantieActive)}>
                    <CheckCircle size={12} aria-hidden="true" /> Garantie en cours
                  </span>
                </div>
              )}
            </div>

            {assurance.garanties.length > 0 && (
              <div className={styles.assuranceCardGaranties}>
                <p>Garanties</p>
                <div className={styles.assuranceTagsList}>
                  {assurance.garanties.map((garantie, idx) => (
                    <span key={idx} className={styles.assuranceTag}>{garantie}</span>
                  ))}
                </div>
              </div>
            )}

            {assurance.observations && (
              <div className={styles.assuranceCardObs}>
                {assurance.observations}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
