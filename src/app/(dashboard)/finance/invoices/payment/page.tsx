'use client';

import { useSupplierInvoices } from '@/hooks/modules/useFinanceData';
import { CreditCard, Loader2 } from 'lucide-react';
import styles from './payment.module.css';
import Link from 'next/link';
import { useMemo } from 'react';

export default function InvoicesPaymentPage() {
    const { data: invoices, isLoading, error } = useSupplierInvoices();

    // Filter invoices that need payment (posted or approved status)
    const invoicesToPay = useMemo(() => {
        if (!invoices) return [];
        return invoices.filter(f => f.status === 'posted' || f.status === 'approved');
    }, [invoices]);

    if (isLoading) {
        return (
            <div className="container">
                <div className={styles.loading || ''}>
                    <Loader2 size={24} />
                    <span>Chargement des factures...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Factures à payer</h1>
                    <p className={styles.subtitle}>
                        Validez et payez vos factures en attente.
                    </p>
                </div>
            </div>

            {error && (
                <div className="card" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                    Erreur: {error}
                </div>
            )}

            <div className="card">
                <h2 className={styles.sectionTitle}>En attente de paiement ({invoicesToPay.length})</h2>

                <div className={styles.list}>
                    {invoicesToPay.length === 0 ? (
                        <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            Aucune facture en attente de paiement
                        </p>
                    ) : (
                        invoicesToPay.map((invoice) => (
                            <div key={invoice.id} className={styles.item}>
                                <div className={styles.itemInfo}>
                                    <div className={styles.date}>{new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</div>
                                    <div className={styles.fournisseur}>{invoice.supplier_name}</div>
                                    <div className={styles.reference}>{invoice.invoice_number || invoice.label}</div>
                                </div>
                                <div className={styles.itemActions}>
                                    <div className={styles.amount}>{Number(invoice.total_amount).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                                    <Link href={`/finance/invoices/payment/${invoice.id}`} className="btn btn-primary">
                                        <CreditCard size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Payer
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
