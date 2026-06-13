'use client';

import {
    ShieldCheck,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import clsx from 'clsx';
import type { LogbookAssurancesProps } from './types';
import { getAssuranceTypeLabel, isEcheanceProche, isGarantieEnCours } from './utils';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function LogbookAssurances({ assurances, onSelectAssurance }: LogbookAssurancesProps) {
    return (
        <div className={styles.section} id="assurances-section">
            <h2 className={styles.sectionTitle}>
                <ShieldCheck size={20} aria-hidden="true" /> Contrats d&apos;assurance
            </h2>
            <div className={styles.assurancesGrid}>
                {assurances.map(assurance => (
                    <div
                        key={assurance.id}
                        className={clsx(
                            styles.assuranceCard,
                            styles.assuranceCardClickable,
                            assurance.sousType === 'DOMMAGES_OUVRAGE' && styles.dommagesOuvrage
                        )}
                        onClick={() => onSelectAssurance(assurance)}
                        title="Cliquer pour voir les détails"
                    >
                        <div className={styles.assuranceHeader}>
                            <div>
                                <h4 className={styles.assuranceNom}>{assurance.nom}</h4>
                                <p className={styles.assuranceAssureur}>{assurance.assureur}</p>
                            </div>
                            <span className={clsx(
                                styles.assuranceType,
                                styles[assurance.sousType.toLowerCase()]
                            )}>
                                {getAssuranceTypeLabel(assurance.sousType)}
                            </span>
                        </div>

                        <div className={styles.assuranceDetails}>
                            <div className={styles.assuranceDetail}>
                                <span>N° Police</span>
                                <span>{assurance.numeroPolice}</span>
                            </div>
                            <div className={styles.assuranceDetail}>
                                <span>Échéance</span>
                                <span className={clsx(isEcheanceProche(assurance.dateFin) && styles.echeanceProche)}>
                                    {isEcheanceProche(assurance.dateFin) && <AlertCircle size={12} aria-hidden="true" />}
                                    {new Date(assurance.dateFin).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                            {assurance.primeAnnuelle > 0 && (
                                <div className={styles.assuranceDetail}>
                                    <span>Prime annuelle</span>
                                    <span>{assurance.primeAnnuelle.toLocaleString()} €</span>
                                </div>
                            )}
                            {assurance.franchise && (
                                <div className={styles.assuranceDetail}>
                                    <span>Franchise</span>
                                    <span>{assurance.franchise.toLocaleString()} €</span>
                                </div>
                            )}
                            {assurance.sousType === 'DOMMAGES_OUVRAGE' && assurance.travauxConcernes && (
                                <div className={styles.assuranceDetail}>
                                    <span>Travaux</span>
                                    <span>{assurance.travauxConcernes}</span>
                                </div>
                            )}
                            {assurance.sousType === 'DOMMAGES_OUVRAGE' && isGarantieEnCours(assurance.dateFin) && (
                                <div className={styles.assuranceDetail}>
                                    <span>Statut</span>
                                    <span className={styles.garantieEnCours}>
                                        <CheckCircle size={12} aria-hidden="true" /> Garantie en cours
                                    </span>
                                </div>
                            )}
                        </div>

                        {assurance.garanties.length > 0 && (
                            <div className={styles.assuranceGaranties}>
                                <p>Garanties</p>
                                <div className={styles.garantiesList}>
                                    {assurance.garanties.map((garantie) => (
                                        <span key={garantie} className={styles.garantieTag}>{garantie}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {assurance.observations && (
                            <div className={styles.assuranceObservations}>
                                {assurance.observations}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
