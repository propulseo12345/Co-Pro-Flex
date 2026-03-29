'use client';

import { OrdreService } from '@/types';
import { getStatutLabel, getTypeLabel, generatePdfDownload } from '@/lib/utils/service-order';
import { ArrowLeft, Edit, Save, X, FileText, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import StatusBadge from '../../../../app/(dashboard)/maintenance/service-orders/components/StatusBadge';
import styles from './ServiceOrderDetailHeader.module.css';

interface ServiceOrderDetailHeaderProps {
    ordreService: OrdreService;
    editMode: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onShowStatusModal: () => void;
    onShowEmailModal: () => void;
}

export function ServiceOrderDetailHeader({
    ordreService,
    editMode,
    onEdit,
    onCancelEdit,
    onSaveEdit,
    onShowStatusModal,
    onShowEmailModal
}: ServiceOrderDetailHeaderProps) {
    return (
        <>
            <Link href="/maintenance/service-orders" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux ordres de service
            </Link>

            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>{ordreService.titre}</h1>
                    <div className={styles.headerMeta}>
                        <StatusBadge statut={ordreService.statut} size="medium" />
                        <span className={styles.type}>{getTypeLabel(ordreService.typeOrdre)}</span>
                        <span className={styles.id}>#{ordreService.id}</span>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    {!editMode ? (
                        <>
                            <button className={styles.btnSecondary} onClick={onEdit}>
                                <Edit size={16} aria-hidden="true" />
                                Modifier
                            </button>
                            <button className={styles.btnSecondary} onClick={onShowStatusModal}>
                                <RefreshCw size={16} aria-hidden="true" />
                                Changer le statut
                            </button>
                            <button className={styles.btnSecondary} onClick={onShowEmailModal}>
                                <Mail size={16} aria-hidden="true" />
                                Voir l&apos;email
                            </button>
                            <button className={styles.btnSecondary} onClick={() => generatePdfDownload(ordreService)}>
                                <FileText size={16} aria-hidden="true" />
                                Générer PDF
                            </button>
                        </>
                    ) : (
                        <>
                            <button className={styles.btnSecondary} onClick={onCancelEdit}>
                                <X size={16} aria-hidden="true" />
                                Annuler
                            </button>
                            <button className={styles.btnPrimary} onClick={onSaveEdit}>
                                <Save size={16} aria-hidden="true" />
                                Enregistrer
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
