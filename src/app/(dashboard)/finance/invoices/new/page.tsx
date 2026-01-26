'use client';

import { ArrowLeft, Upload, Save } from 'lucide-react';
import styles from './new-invoice.module.css';
import Link from 'next/link';
import { useState } from 'react';

export default function NewInvoicePage() {
    const [fournisseur, setFournisseur] = useState('');
    const [date, setDate] = useState('');
    const [reference, setReference] = useState('');
    const [montant, setMontant] = useState('');
    const [iban, setIban] = useState('');
    const [bic, setBic] = useState('');

    return (
        <div className="container">
            <Link href="/finance/invoices" className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux factures
            </Link>

            <div className={styles.header}>
                <h1 className={styles.title}>Nouvelle facture</h1>
                <p className={styles.subtitle}>
                    Enregistrez une nouvelle facture fournisseur
                </p>
            </div>

            <div className={styles.centerCard}>
                <div className="card">
                    <div className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="fournisseur">Fournisseur *</label>
                            <input
                                type="text"
                                id="fournisseur"
                                className="input"
                                placeholder="Nom du fournisseur"
                                value={fournisseur}
                                onChange={(e) => setFournisseur(e.target.value)}
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label htmlFor="date">Date de facture *</label>
                                <input type="date" id="date" className="input" value={date} onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="reference">Référence</label>
                                <input
                                    type="text"
                                    id="reference"
                                    className="input"
                                    placeholder="Ex: FAC-2025-001"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="montant">Montant TTC *</label>
                            <div className={styles.inputWithUnit}>
                                <input
                                    type="number"
                                    id="montant"
                                    className="input"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={montant}
                                    onChange={(e) => setMontant(e.target.value)}
                                />
                                <span className={styles.unit}>€</span>
                            </div>
                        </div>

                        <div className={styles.separator}>
                            <span>Informations bancaires (optionnel)</span>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="iban">IBAN</label>
                            <input
                                type="text"
                                id="iban"
                                className="input"
                                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                                value={iban}
                                onChange={(e) => setIban(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="bic">BIC</label>
                            <input
                                type="text"
                                id="bic"
                                className="input"
                                placeholder="XXXXXXXX"
                                value={bic}
                                onChange={(e) => setBic(e.target.value)}
                            />
                        </div>

                        <div className={styles.separator}>
                            <span>Document</span>
                        </div>

                        <div className={styles.uploadZone}>
                            <Upload size={32} aria-hidden="true" />
                            <p className={styles.uploadText}>
                                Glissez-déposez le PDF de la facture ici
                            </p>
                            <p className={styles.uploadSubtext}>ou cliquez pour parcourir</p>
                            <input type="file" accept=".pdf" className={styles.fileInput} />
                        </div>

                        <div className={styles.actions}>
                            <Link href="/finance/invoices" className="btn btn-secondary">
                                Annuler
                            </Link>
                            <button className="btn btn-primary">
                                <Save size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                                Enregistrer la facture
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
