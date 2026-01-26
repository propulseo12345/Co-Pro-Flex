'use client';

import Link from 'next/link';
import { Eye, Mail, FileText, Trash2, Edit, Receipt, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { OrdreService } from '@/types';
import { getTypeLabel, formatDate } from '@/lib/utils/service-order';
import type { Facture } from '@/components/features/finance/Factures/types';
import StatusBadge from '@/app/(dashboard)/maintenance/service-orders/components/StatusBadge';
import clsx from 'clsx';
import styles from './ServiceOrderTable.module.css';

const STATUT_FACTURE_LABELS: Record<string, string> = {
    'BROUILLON': 'Brouillon',
    'A_VALIDER': 'À valider',
    'VALIDEE': 'Validée',
    'A_PAYER': 'À payer',
    'PAYEE': 'Payée'
};

function calculerEcart(montantEstime: number | undefined, montantFacture: number): { ecart: number; pourcentage: number; estAlerte: boolean } | null {
    if (!montantEstime) return null;
    const ecart = montantFacture - montantEstime;
    const pourcentage = (ecart / montantEstime) * 100;
    const estAlerte = Math.abs(pourcentage) > 10;
    return { ecart, pourcentage, estAlerte };
}

interface ServiceOrderTableProps {
    ordresService: OrdreService[];
    facturesParOS: Record<string, Facture>;
    onViewDetail: (id: string) => void;
    onEdit: (id: string) => void;
    onEmailPreview: (os: OrdreService) => void;
    onViewPdf: (os: OrdreService) => void;
    onDelete: (id: string) => void;
    onClearFilters: () => void;
    hasActiveFilters: boolean;
}

export function ServiceOrderTable({
    ordresService,
    facturesParOS,
    onViewDetail,
    onEdit,
    onEmailPreview,
    onViewPdf,
    onDelete,
    onClearFilters,
    hasActiveFilters
}: ServiceOrderTableProps) {
    if (ordresService.length === 0) {
        return (
            <div className={styles.emptyState}>
                <FileText size={48} aria-hidden="true" />
                <p>Aucun ordre de service trouvé</p>
                {hasActiveFilters && (
                    <button className="btn btn-secondary" onClick={onClearFilters}>
                        Réinitialiser les filtres
                    </button>
                )}
            </div>
        );
    }

    return (
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Titre</th>
                    <th>Fournisseur</th>
                    <th>Statut</th>
                    <th className={styles.textRight}>Montant estimé</th>
                    <th>Facture</th>
                    <th className={styles.textCenter}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {ordresService.map((os) => {
                    const facture = facturesParOS[os.id];
                    const ecartInfo = facture ? calculerEcart(os.montantEstime, facture.montant) : null;

                    return (
                        <tr key={os.id} className={styles.row}>
                            <td>{formatDate(os.date)}</td>
                            <td>
                                <span className={clsx(
                                    styles.typeBadge,
                                    os.typeOrdre === 'CLASSIQUE' ? styles.typeClassique : styles.typeContractuel
                                )}>
                                    {getTypeLabel(os.typeOrdre)}
                                </span>
                            </td>
                            <td>
                                <div className={styles.titleCell}>
                                    <span className={styles.titre}>{os.titre}</span>
                                    {os.contratNom && (
                                        <span className={styles.contratBadge}>
                                            Contrat: {os.contratNom}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td>{os.fournisseurNom}</td>
                            <td>
                                <StatusBadge statut={os.statut} size="small" />
                            </td>
                            <td className={styles.textRight}>
                                {os.montantEstime
                                    ? os.montantEstime.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                                    : '-'}
                            </td>
                            <td>
                                {!facture ? (
                                    <span className={styles.noFacture}>-</span>
                                ) : (
                                    <div className={styles.factureCell}>
                                        <Link
                                            href={`/finance/factures?id=${facture.id}`}
                                            className={styles.factureLink}
                                            title={`Voir la facture ${facture.reference}`}
                                        >
                                            <Receipt size={14} aria-hidden="true" />
                                            {facture.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                        </Link>
                                        {ecartInfo && (
                                            <span className={clsx(
                                                styles.factureEcart,
                                                ecartInfo.ecart > 0 ? styles.ecartPositif : styles.ecartNegatif,
                                                ecartInfo.estAlerte && styles.ecartAlerte
                                            )}>
                                                {ecartInfo.estAlerte && <AlertTriangle size={10} aria-hidden="true" />}
                                                {ecartInfo.ecart > 0 ? <TrendingUp size={10} aria-hidden="true" /> : <TrendingDown size={10} aria-hidden="true" />}
                                                {ecartInfo.ecart > 0 ? '+' : ''}{ecartInfo.ecart.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                                {' '}({ecartInfo.pourcentage > 0 ? '+' : ''}{ecartInfo.pourcentage.toFixed(0)}%)
                                            </span>
                                        )}
                                        <span className={clsx(
                                            styles.factureStatut,
                                            facture.statut === 'PAYEE' && styles.statutPayee,
                                            facture.statut === 'A_PAYER' && styles.statutAPayer,
                                            (facture.statut === 'BROUILLON' || facture.statut === 'A_VALIDER' || facture.statut === 'VALIDEE') && styles.statutEnCours
                                        )}>
                                            {STATUT_FACTURE_LABELS[facture.statut]}
                                        </span>
                                    </div>
                                )}
                            </td>
                            <td className={styles.textCenter}>
                                <div className={styles.actions}>
                                    <button className={styles.iconButton} onClick={() => onViewDetail(os.id)} title="Voir les détails">
                                        <Eye size={16} aria-hidden="true" />
                                    </button>
                                    <button className={styles.iconButton} onClick={() => onEdit(os.id)} title="Modifier">
                                        <Edit size={16} aria-hidden="true" />
                                    </button>
                                    <button className={styles.iconButton} onClick={() => onEmailPreview(os)} title="Aperçu email">
                                        <Mail size={16} aria-hidden="true" />
                                    </button>
                                    <button className={styles.iconButton} onClick={() => onViewPdf(os)} title="Voir le PDF">
                                        <FileText size={16} aria-hidden="true" />
                                    </button>
                                    <button className={clsx(styles.iconButton, styles.danger)} onClick={() => onDelete(os.id)} title="Supprimer">
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
