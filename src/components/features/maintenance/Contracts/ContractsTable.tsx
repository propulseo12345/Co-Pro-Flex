'use client';

import { ContratDetaille } from '@/types';
import { TYPES_CONTRAT } from '@/lib/constants/categories-contrat';
import { FileText, AlertTriangle, Shield, RefreshCw, Ban, Clock } from 'lucide-react';
import clsx from 'clsx';
import styles from './Contracts.module.css';
import StatusBadge from './StatusBadge';
import ActionsDropdown from './ActionsDropdown';
import {
    formatDate,
    formatMontant,
    getJoursAvantEcheance,
    getJoursDepuisExpiration,
    getTypeReconduction,
    getJoursAvantDateLimiteResiliation,
    isDelaiResiliationDepasse,
    isDelaiResiliationProche
} from './utils';
import { RECONDUCTION_LABELS } from './types';

interface ContractsTableProps {
    contrats: ContratDetaille[];
    onVoirDetails: (contrat: ContratDetaille) => void;
    onModifier: (contrat: ContratDetaille) => void;
    onResilier: (contrat: ContratDetaille) => void;
    onTelecharger: (contrat: ContratDetaille) => void;
}

export default function ContractsTable({
    contrats,
    onVoirDetails,
    onModifier,
    onResilier,
    onTelecharger
}: ContractsTableProps) {
    if (contrats.length === 0) {
        return (
            <div className={styles.emptyState}>
                <FileText size={48} aria-hidden="true" />
                <p>Aucun contrat trouvé</p>
                <span>Modifiez vos filtres ou ajoutez un nouveau contrat</span>
            </div>
        );
    }

    return (
        <div className={styles.tableWrapper}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Statut</th>
                        <th>Libellé</th>
                        <th>Prestataire</th>
                        <th>Type</th>
                        <th>Reconduction</th>
                        <th>Échéance</th>
                        <th>Coût annuel</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {contrats.map(contrat => {
                        const jours = getJoursAvantEcheance(contrat.dateFin);
                        const joursDepasses = getJoursDepuisExpiration(contrat.dateFin);
                        const delai = contrat.delaiResiliation || 60;
                        const estUrgent = jours > 0 && jours <= delai;
                        const estProche = jours > 0 && jours <= delai + 30;
                        const estExpire = contrat.statut === 'EXPIRE' || joursDepasses > 0;

                        // Reconduction
                        const typeReconduction = getTypeReconduction(contrat);
                        const delaiResiliationDepasse = isDelaiResiliationDepasse(contrat);
                        const delaiResiliationProche = isDelaiResiliationProche(contrat);
                        const joursAvantLimite = contrat.taciteReconduction
                            ? getJoursAvantDateLimiteResiliation(contrat.dateFin, delai)
                            : null;

                        return (
                            <tr
                                key={contrat.id}
                                className={clsx(
                                    styles.tableRow,
                                    contrat.estReglementaire && styles.rowReglementaire,
                                    estExpire && joursDepasses > 30 && styles.rowCritique,
                                    delaiResiliationDepasse && styles.rowResiliationDepasse
                                )}
                                onClick={() => onVoirDetails(contrat)}
                            >
                                <td>
                                    <StatusBadge
                                        statut={estExpire ? 'EXPIRE' : contrat.statut}
                                        joursDepasses={joursDepasses}
                                    />
                                </td>
                                <td>
                                    <div className={styles.cellLibelle}>
                                        <span className={styles.contratNom}>{contrat.nom}</span>
                                        {contrat.estReglementaire && (
                                            <span className={styles.badgeReglementaire}>
                                                <Shield size={12} aria-hidden="true" /> Réglementaire
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>{contrat.fournisseur}</td>
                                <td>
                                    {TYPES_CONTRAT.find(t => t.value === contrat.type)?.label || contrat.type}
                                </td>
                                <td>
                                    <div className={styles.reconductionCell}>
                                        <span className={clsx(
                                            styles.badgeReconduction,
                                            typeReconduction === 'TACITE' && styles.badgeReconductionTacite,
                                            typeReconduction === 'EXPRESS' && styles.badgeReconductionExpress,
                                            typeReconduction === 'NON_RENOUVELABLE' && styles.badgeReconductionNon,
                                            delaiResiliationDepasse && styles.badgeReconductionDepasse
                                        )}>
                                            {typeReconduction === 'TACITE' && <RefreshCw size={12} aria-hidden="true" />}
                                            {typeReconduction === 'EXPRESS' && <Clock size={12} aria-hidden="true" />}
                                            {typeReconduction === 'NON_RENOUVELABLE' && <Ban size={12} aria-hidden="true" />}
                                            {RECONDUCTION_LABELS[typeReconduction]}
                                        </span>
                                        {/* Alerte si délai de résiliation proche ou dépassé */}
                                        {typeReconduction === 'TACITE' && delaiResiliationDepasse && (
                                            <span className={styles.reconductionAlerte}>
                                                <AlertTriangle size={12} aria-hidden="true" />
                                                Délai dépassé
                                            </span>
                                        )}
                                        {typeReconduction === 'TACITE' && delaiResiliationProche && !delaiResiliationDepasse && joursAvantLimite !== null && (
                                            <span className={styles.reconductionAlerteProche}>
                                                {joursAvantLimite}j pour résilier
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className={clsx(
                                        styles.echeanceCell,
                                        estUrgent && styles.echeanceUrgent,
                                        estProche && !estUrgent && styles.echeanceProche
                                    )}>
                                        {estUrgent && <AlertTriangle size={14} aria-hidden="true" />}
                                        {formatDate(contrat.dateFin)}
                                        {estProche && jours > 0 && (
                                            <span className={styles.joursRestants}>({jours}j)</span>
                                        )}
                                    </span>
                                </td>
                                <td className={styles.cellMontant}>
                                    {formatMontant(contrat.coutAnnuel)}
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                    <ActionsDropdown
                                        contrat={contrat}
                                        onModifier={() => onModifier(contrat)}
                                        onResilier={() => onResilier(contrat)}
                                        onTelecharger={() => onTelecharger(contrat)}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
