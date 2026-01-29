'use client';

import { useSupplierInvoices } from '@/hooks/modules/useFinanceData';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import styles from './detail.module.css';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

export default function InvoiceDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const { data: invoices, isLoading, error } = useSupplierInvoices();

    const invoice = useMemo(() => {
        if (!invoices) return null;
        return invoices.find(f => f.id === id);
    }, [invoices, id]);

    if (isLoading) {
        return (
            <div className="container">
                <Loader2 size={24} />
                <span>Chargement...</span>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="container">
                <p>Facture non trouvée</p>
                <Link href="/finance/invoices/payment" className="btn btn-secondary">
                    Retour aux factures
                </Link>
            </div>
        );
    }

    return (
        <div className="container">
            <Link href="/finance/invoices/payment" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux factures
            </Link>

            <div className={styles.grid}>
                <div className={styles.mainContent}>
                    <div className="card">
                        <h1 className={styles.title}>Paiement de la facture {invoice.supplier_name}</h1>

                        <div className={styles.summary}>
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Montant à payer</span>
                                <span className={styles.amount}>{Number(invoice.total_amount).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Bénéficiaire</span>
                                <span className={styles.value}>{invoice.supplier_name}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Référence</span>
                                <span className={styles.value}>{invoice.invoice_number || invoice.label || '-'}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Date d&apos;échéance</span>
                                <span className={styles.value}>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : '-'}</span>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <Link href="/finance/invoices/payment/confirmation" className="btn btn-primary w-full">
                                Confirmer le virement
                            </Link>
                        </div>
                    </div>
                </div>

                <div className={styles.sidebar}>
                    <div className={styles.documentPreview}>
                        <FileText size={48} className={styles.docIcon} aria-hidden="true" />
                        <p>Aperçu du document</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
