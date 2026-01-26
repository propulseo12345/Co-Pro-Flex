'use client';

import {
    Briefcase,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import type { LogbookContratsProps } from './types';
import { isEcheanceProche } from './utils';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export function LogbookContrats({ contrats }: LogbookContratsProps) {
    const activeContracts = contrats.filter(c => c.statut === 'ACTIF' && c.type !== 'ASSURANCE');

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    <Briefcase size={20} /> Contrats d&apos;entretien et maintenance
                </h2>
                <Link href="/maintenance/contracts" className="btn btn-sm btn-secondary">
                    Voir tous les contrats <ChevronRight size={14} aria-hidden="true" />
                </Link>
            </div>
            <div className={styles.contractsGrid}>
                {activeContracts.map(contrat => (
                    <Link
                        key={contrat.id}
                        href={`/maintenance/contracts/${contrat.id}?from=logbook`}
                        className={clsx(
                            styles.contractCardEnhanced,
                            isEcheanceProche(contrat.dateFin) && styles.echeanceProche
                        )}
                    >
                        <div className={styles.contractHeader}>
                            <h4>{contrat.nom}</h4>
                            <span className={styles.contractTypeBadge}>{contrat.type}</span>
                        </div>
                        <p className={styles.contractFournisseur}>{contrat.fournisseur}</p>
                        <div className={styles.contractDetailsList}>
                            {contrat.numeroContrat && (
                                <div className={styles.contractDetailItem}>
                                    <span>N° Contrat</span>
                                    <span>{contrat.numeroContrat}</span>
                                </div>
                            )}
                            <div className={styles.contractDetailItem}>
                                <span>Échéance</span>
                                <span className={clsx(isEcheanceProche(contrat.dateFin) && styles.echeanceWarning)}>
                                    {isEcheanceProche(contrat.dateFin) && <AlertCircle size={12} aria-hidden="true" />}
                                    {new Date(contrat.dateFin).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                            <div className={styles.contractDetailItem}>
                                <span>Coût annuel</span>
                                <span>{contrat.coutAnnuel.toLocaleString()} €</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
