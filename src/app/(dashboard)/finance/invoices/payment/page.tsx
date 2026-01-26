'use client';

import { MOCK_FACTURES } from '@/data/mock';
import { CreditCard, CheckCircle, Clock } from 'lucide-react';
import styles from './payment.module.css';
import Link from 'next/link';
import clsx from 'clsx';

export default function InvoicesPaymentPage() {
    const invoicesToPay = MOCK_FACTURES.filter(f => f.statut === 'A_PAYER');

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

            <div className="card">
                <h2 className={styles.sectionTitle}>En attente de paiement ({invoicesToPay.length})</h2>

                <div className={styles.list}>
                    {invoicesToPay.map((facture) => (
                        <div key={facture.id} className={styles.item}>
                            <div className={styles.itemInfo}>
                                <div className={styles.date}>{new Date(facture.date).toLocaleDateString('fr-FR')}</div>
                                <div className={styles.fournisseur}>{facture.fournisseur}</div>
                                <div className={styles.reference}>{facture.reference}</div>
                            </div>
                            <div className={styles.itemActions}>
                                <div className={styles.amount}>{facture.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                                <Link href={`/finance/invoices/payment/${facture.id}`} className="btn btn-primary">
                                    <CreditCard size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Payer
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
