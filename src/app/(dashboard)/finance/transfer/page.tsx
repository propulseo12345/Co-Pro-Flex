'use client';

import { Send, AlertCircle } from 'lucide-react';
import styles from './transfer.module.css';
import { useState } from 'react';

export default function TransferPage() {
    const [amount, setAmount] = useState('');
    const [beneficiary, setBeneficiary] = useState('');
    const [iban, setIban] = useState('');
    const [label, setLabel] = useState('');

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Effectuer un virement</h1>
                    <p className={styles.subtitle}>
                        Initiez un virement manuel depuis le compte de la copropriété.
                    </p>
                </div>
            </div>

            <div className={styles.centerCard}>
                <div className="card">
                    <div className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="beneficiary">Bénéficiaire</label>
                            <input
                                type="text"
                                id="beneficiary"
                                className="input"
                                placeholder="Nom du bénéficiaire"
                                value={beneficiary}
                                onChange={(e) => setBeneficiary(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="iban">IBAN</label>
                            <input
                                type="text"
                                id="iban"
                                className="input"
                                placeholder="FR76 ..."
                                value={iban}
                                onChange={(e) => setIban(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="amount">Montant</label>
                            <div className={styles.amountWrapper}>
                                <input
                                    type="number"
                                    id="amount"
                                    className="input"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <span className={styles.currency}>€</span>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="label">Libellé</label>
                            <input
                                type="text"
                                id="label"
                                className="input"
                                placeholder="Motif du virement"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                        </div>

                        <div className={styles.alert}>
                            <AlertCircle size={20} aria-hidden="true" />
                            <p>Le virement sera soumis à validation si le montant dépasse le seuil autorisé.</p>
                        </div>

                        <button className="btn btn-primary w-full">
                            <Send size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Effectuer le virement
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
