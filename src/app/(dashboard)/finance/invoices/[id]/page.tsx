'use client';

import { ArrowLeft, Download, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import styles from './invoice-detail.module.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSupplierInvoices } from '@/hooks/modules/useFinanceData';
import { useMemo } from 'react';

// Map Supabase status to display status
function mapStatus(status: string): string {
    switch (status) {
        case 'paid': return 'PAYEE';
        case 'posted':
        case 'approved': return 'A_PAYER';
        case 'draft': return 'EN_ATTENTE_VALIDATION';
        default: return status.toUpperCase();
    }
}

export default function InvoiceDetailPage() {
    const params = useParams();
    const { data: invoices, isLoading, error } = useSupplierInvoices();

    const invoice = useMemo(() => {
        if (!invoices) return null;
        return invoices.find(f => f.id === params.id);
    }, [invoices, params.id]);

    // Convert to display format
    const facture = useMemo(() => {
        if (!invoice) return null;
        return {
            id: invoice.id,
            fournisseur: invoice.supplier_name,
            date: invoice.invoice_date,
            reference: invoice.invoice_number || invoice.label,
            montant: Number(invoice.total_amount),
            statut: mapStatus(invoice.status),
            iban: null as string | null,
            bic: null as string | null,
        };
    }, [invoice]);

    if (isLoading) {
        return (
            <div className="container">
                <div className={styles.loading || ''}>
                    <Loader2 size={24} className={styles.spinner || ''} />
                    <span>Chargement...</span>
                </div>
            </div>
        );
    }

    if (error || !facture) {
        return (
            <div className="container">
                <p>Facture non trouvée</p>
                <Link href="/finance/invoices" className="btn btn-secondary">
                    Retour aux factures
                </Link>
            </div>
        );
    }

    const getStatusInfo = (statut: string) => {
        switch (statut) {
            case 'PAYEE':
                return { icon: <Check size={20} aria-hidden="true" />, label: 'Payée', className: styles.statusSuccess };
            case 'A_PAYER':
                return { icon: <AlertCircle size={20} aria-hidden="true" />, label: 'À payer', className: styles.statusError };
            case 'EN_ATTENTE_VALIDATION':
                return { icon: <AlertCircle size={20} aria-hidden="true" />, label: 'En attente de validation', className: styles.statusWarning };
            default:
                return { icon: null, label: statut, className: '' };
        }
    };

    const statusInfo = getStatusInfo(facture.statut);

    return (
        <div className="container">
            <Link href="/finance/invoices" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux factures
            </Link>

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Facture {facture.reference || `#${facture.id}`}</h1>
                    <p className={styles.subtitle}>
                        {facture.fournisseur} • {new Date(facture.date).toLocaleDateString('fr-FR')}
                    </p>
                </div>
                <div className={`${styles.statusBadge} ${statusInfo.className}`}>
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                </div>
            </div>

            <div className={styles.grid}>
                <div className={styles.mainColumn}>
                    <div className="card">
                        <h2 className={styles.sectionTitle}>Informations générales</h2>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Fournisseur</span>
                                <span className={styles.infoValue}>{facture.fournisseur}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Date de facture</span>
                                <span className={styles.infoValue}>{new Date(facture.date).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Référence</span>
                                <span className={styles.infoValue}>{facture.reference || '-'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Montant TTC</span>
                                <span className={styles.infoValueAmount}>{facture.montant.toLocaleString('fr-FR')} €</span>
                            </div>
                        </div>
                    </div>

                    {facture.statut === 'A_PAYER' && facture.iban && (
                        <div className="card">
                            <h2 className={styles.sectionTitle}>Informations bancaires</h2>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>IBAN</span>
                                    <span className={styles.infoValue}>{facture.iban}</span>
                                </div>
                                {facture.bic && (
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>BIC</span>
                                        <span className={styles.infoValue}>{facture.bic}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <h2 className={styles.sectionTitle}>Document</h2>
                        <div className={styles.documentPreview}>
                            <div className={styles.documentIcon}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                            </div>
                            <div className={styles.documentInfo}>
                                <div className={styles.documentName}>Facture_{facture.reference || facture.id}.pdf</div>
                                <div className={styles.documentSize}>245 Ko</div>
                            </div>
                            <button className="btn btn-secondary">
                                <Download size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                                Télécharger
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.sidebar}>
                    <div className="card">
                        <h3 className={styles.sidebarTitle}>Actions</h3>
                        <div className={styles.actionButtons}>
                            {facture.statut === 'EN_ATTENTE_VALIDATION' && (
                                <>
                                    <button className="btn btn-success w-full">
                                        <Check size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                                        Valider la facture
                                    </button>
                                    <button className="btn btn-error w-full">
                                        <X size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                                        Rejeter
                                    </button>
                                </>
                            )}
                            {facture.statut === 'A_PAYER' && (
                                <button className="btn btn-primary w-full">
                                    <Check size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                                    Marquer comme payée
                                </button>
                            )}
                            <button className="btn btn-secondary w-full">
                                <Download size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                                Télécharger PDF
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className={styles.sidebarTitle}>Historique</h3>
                        <div className={styles.timeline}>
                            <div className={styles.timelineItem}>
                                <div className={styles.timelineDot}></div>
                                <div className={styles.timelineContent}>
                                    <div className={styles.timelineTitle}>Facture créée</div>
                                    <div className={styles.timelineDate}>{new Date(facture.date).toLocaleDateString('fr-FR')}</div>
                                </div>
                            </div>
                            {facture.statut === 'PAYEE' && (
                                <div className={styles.timelineItem}>
                                    <div className={`${styles.timelineDot} ${styles.timelineDotSuccess}`}></div>
                                    <div className={styles.timelineContent}>
                                        <div className={styles.timelineTitle}>Facture payée</div>
                                        <div className={styles.timelineDate}>Il y a 2 jours</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
