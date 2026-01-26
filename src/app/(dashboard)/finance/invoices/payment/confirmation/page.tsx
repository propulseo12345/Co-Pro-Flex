'use client';

import { CheckCircle, ArrowRight } from 'lucide-react';
import styles from './confirmation.module.css';
import Link from 'next/link';

export default function PaymentConfirmationPage() {
    return (
        <div className="container">
            <div className={styles.centerCard}>
                <div className="card">
                    <div className={styles.content}>
                        <div className={styles.iconWrapper}>
                            <CheckCircle size={64} aria-hidden="true" />
                        </div>
                        <h1 className={styles.title}>Virement effectué !</h1>
                        <p className={styles.message}>
                            Le virement a bien été pris en compte. Il sera traité par la banque dans les plus brefs délais.
                        </p>
                        <div className={styles.actions}>
                            <Link href="/finance/invoices/payment" className="btn btn-primary">
                                Retour aux factures
                            </Link>
                            <Link href="/dashboard" className="btn btn-secondary">
                                Retour au tableau de bord
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
