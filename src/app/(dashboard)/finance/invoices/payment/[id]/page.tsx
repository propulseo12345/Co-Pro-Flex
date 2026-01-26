'use client';

import { MOCK_FACTURES } from '@/data/mock';
import { ArrowLeft, CreditCard, FileText } from 'lucide-react';
import styles from './detail.module.css';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';

export default function InvoiceDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const facture = MOCK_FACTURES.find(f => f.id === id);

    if (!facture) {
        return <div>Facture non trouvée</div>;
    }

    return (
        <div className="container">
            <Link href="/finance/invoices/payment" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux factures
            </Link>

            <div className={styles.grid}>
                <div className={styles.mainContent}>
                    <div className="card">
                        <h1 className={styles.title}>Paiement de la facture {facture.fournisseur}</h1>

                        <div className={styles.summary}>
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Montant à payer</span>
                                <span className={styles.amount}>{facture.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>Bénéficiaire</span>
                                <span className={styles.value}>{facture.fournisseur}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>IBAN</span>
                                <span className={styles.value}>{facture.iban}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.label}>BIC</span>
                                <span className={styles.value}>{facture.bic}</span>
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
