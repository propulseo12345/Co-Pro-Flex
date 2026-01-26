'use client';

import { useMemo } from 'react';
import { ContratDetaille } from '@/types';
import { Bell, AlertTriangle, Clock, AlertOctagon, RefreshCw } from 'lucide-react';
import { getNiveauEscalade, type NiveauEscalade } from '@/lib/utils/alerts';
import {
    isDelaiResiliationDepasse,
    isDelaiResiliationProche,
    getJoursAvantDateLimiteResiliation,
    formatDate
} from './utils';
import clsx from 'clsx';
import styles from './Contracts.module.css';

interface ContractsAlertSectionProps {
    contrats: ContratDetaille[];
    onAction: (contrat: ContratDetaille) => void;
}

interface ContratAlerte extends ContratDetaille {
    joursRestants: number;
    joursDepasses: number;
    estUrgent: boolean;
    estExpire: boolean;
    niveauEscalade?: NiveauEscalade;
}

interface ContratAlerteTacite extends ContratDetaille {
    joursAvantLimite: number;
    dateLimite: string;
    delaiDepasse: boolean;
}

export default function ContractsAlertSection({ contrats, onAction }: ContractsAlertSectionProps) {
    // Filtrer les contrats expirés (priorité haute)
    const contratsExpires = useMemo<ContratAlerte[]>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return contrats
            .filter(c => c.statut === 'EXPIRE' || c.statut === 'A_RENOUVELER')
            .map(c => {
                const dateFin = new Date(c.dateFin);
                dateFin.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - dateFin.getTime();
                const joursDepasses = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                return {
                    ...c,
                    joursRestants: -joursDepasses,
                    joursDepasses: Math.max(0, joursDepasses),
                    estUrgent: true,
                    estExpire: joursDepasses > 0,
                    niveauEscalade: joursDepasses > 0 ? getNiveauEscalade(joursDepasses) : undefined
                };
            })
            .filter(c => c.joursDepasses > 0) // Seulement les contrats expirés
            .sort((a, b) => b.joursDepasses - a.joursDepasses); // Plus ancien en premier
    }, [contrats]);

    // Filtrer les contrats à reconduction tacite avec délai de résiliation critique
    const contratsTaciteAlertes = useMemo<ContratAlerteTacite[]>(() => {
        return contrats
            .filter(c =>
                c.taciteReconduction &&
                (c.statut === 'ACTIF' || c.statut === 'A_RENOUVELER') &&
                (isDelaiResiliationDepasse(c) || isDelaiResiliationProche(c))
            )
            .map(c => {
                const delai = c.delaiResiliation || 60;
                const joursAvantLimite = getJoursAvantDateLimiteResiliation(c.dateFin, delai);
                const dateFin = new Date(c.dateFin);
                dateFin.setDate(dateFin.getDate() - delai);
                return {
                    ...c,
                    joursAvantLimite,
                    dateLimite: formatDate(dateFin.toISOString()),
                    delaiDepasse: joursAvantLimite < 0
                };
            })
            .sort((a, b) => a.joursAvantLimite - b.joursAvantLimite); // Plus urgent en premier
    }, [contrats]);

    // Filtrer les contrats qui arrivent à échéance (priorité normale)
    const contratsAlertes = useMemo<ContratAlerte[]>(() => {
        const today = new Date();
        return contrats
            .filter(c => c.statut === 'ACTIF' || c.statut === 'A_RENOUVELER')
            .map(c => {
                const dateFin = new Date(c.dateFin);
                const joursRestants = Math.ceil((dateFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const delaiAlerte = c.delaiResiliation || 60;
                return {
                    ...c,
                    joursRestants,
                    joursDepasses: 0,
                    estUrgent: joursRestants <= delaiAlerte,
                    estExpire: false
                };
            })
            .filter(c => c.joursRestants > 0 && c.joursRestants <= 90) // 90 jours
            .sort((a, b) => a.joursRestants - b.joursRestants);
    }, [contrats]);

    const totalAlertes = contratsExpires.length + contratsTaciteAlertes.length + contratsAlertes.length;

    if (totalAlertes === 0) return null;

    const urgents = contratsAlertes.filter(c => c.estUrgent);
    const nonUrgents = contratsAlertes.filter(c => !c.estUrgent);

    const getNiveauLabel = (niveau: NiveauEscalade | undefined): string => {
        switch (niveau) {
            case 'tres_critique': return 'TRÈS CRITIQUE';
            case 'critique': return 'CRITIQUE';
            case 'urgence': return 'URGENT';
            case 'relance': return 'Relance';
            default: return 'Expiré';
        }
    };

    const getNiveauStyle = (niveau: NiveauEscalade | undefined): string => {
        switch (niveau) {
            case 'tres_critique': return styles.alertItemTresCritique;
            case 'critique': return styles.alertItemCritique;
            case 'urgence': return styles.alertItemUrgent;
            default: return styles.alertItemExpire;
        }
    };

    return (
        <section className={styles.alertsSection}>
            <div className={styles.alertsHeader}>
                <Bell size={20} aria-hidden="true" />
                <h2>Contrats à surveiller ({totalAlertes})</h2>
            </div>
            <div className={styles.alertsList}>
                {/* Contrats expirés - Priorité haute */}
                {contratsExpires.map(c => (
                    <div key={c.id} className={clsx(styles.alertItem, getNiveauStyle(c.niveauEscalade))}>
                        <div className={styles.alertItemIcon}>
                            <AlertOctagon size={18} aria-hidden="true" />
                        </div>
                        <div className={styles.alertItemContent}>
                            <strong>{c.nom}</strong>
                            <span>
                                {c.fournisseur} • <strong>{getNiveauLabel(c.niveauEscalade)}</strong> - Expiré depuis {c.joursDepasses} jours (J+{c.joursDepasses})
                            </span>
                        </div>
                        <button className="btn btn-sm btn-danger" onClick={() => onAction(c)}>
                            Décision requise
                        </button>
                    </div>
                ))}

                {/* Contrats à reconduction tacite - Délai de résiliation critique */}
                {contratsTaciteAlertes.map(c => (
                    <div key={`tacite-${c.id}`} className={clsx(
                        styles.alertItem,
                        c.delaiDepasse ? styles.alertItemCritique : styles.alertItemTacite
                    )}>
                        <div className={styles.alertItemIcon}>
                            <RefreshCw size={18} aria-hidden="true" />
                        </div>
                        <div className={styles.alertItemContent}>
                            <strong>
                                {c.nom}
                                <span className={styles.badgeTaciteSmall}>Tacite</span>
                            </strong>
                            <span>
                                {c.fournisseur} •
                                {c.delaiDepasse ? (
                                    <> <strong>Délai de résiliation dépassé</strong> depuis {Math.abs(c.joursAvantLimite)} jours - Renouvellement automatique</>
                                ) : (
                                    <> <strong>{c.joursAvantLimite}j</strong> pour résilier (avant le {c.dateLimite})</>
                                )}
                            </span>
                        </div>
                        <button
                            className={clsx('btn btn-sm', c.delaiDepasse ? 'btn-danger' : 'btn-warning')}
                            onClick={() => onAction(c)}
                        >
                            {c.delaiDepasse ? 'Renouvelé' : 'Résilier'}
                        </button>
                    </div>
                ))}

                {/* Contrats urgents (proches de l'échéance) */}
                {urgents.map(c => (
                    <div key={c.id} className={clsx(styles.alertItem, styles.alertItemUrgent)}>
                        <div className={styles.alertItemIcon}>
                            <AlertTriangle size={18} aria-hidden="true" />
                        </div>
                        <div className={styles.alertItemContent}>
                            <strong>{c.nom}</strong>
                            <span>{c.fournisseur} • Échéance dans {c.joursRestants} jours</span>
                        </div>
                        <button className="btn btn-sm btn-warning" onClick={() => onAction(c)}>
                            Gérer
                        </button>
                    </div>
                ))}

                {/* Contrats à surveiller (non urgents) */}
                {nonUrgents.map(c => (
                    <div key={c.id} className={styles.alertItem}>
                        <div className={styles.alertItemIcon}>
                            <Clock size={18} aria-hidden="true" />
                        </div>
                        <div className={styles.alertItemContent}>
                            <strong>{c.nom}</strong>
                            <span>{c.fournisseur} • Échéance dans {c.joursRestants} jours</span>
                        </div>
                        <button className="btn btn-sm btn-secondary" onClick={() => onAction(c)}>
                            Voir
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
