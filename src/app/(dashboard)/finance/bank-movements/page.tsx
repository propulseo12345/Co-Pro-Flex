'use client';

import { MOCK_MOUVEMENTS_BANCAIRES, MOCK_PLAN_COMPTABLE } from '@/data/mock';
import { PlanComptable } from '@/types';
import { ArrowRight, Check, Search } from 'lucide-react';
import styles from './bank-movements.module.css';
import { useState } from 'react';

export default function BankMovementsPage() {
    // Flatten accounts for selection
    const flattenAccounts = (accounts: PlanComptable[]): PlanComptable[] => {
        let result: PlanComptable[] = [];
        for (const account of accounts) {
            result.push(account);
            if (account.sousComptes) {
                result = [...result, ...flattenAccounts(account.sousComptes)];
            }
        }
        return result;
    };

    const allAccounts = flattenAccounts(MOCK_PLAN_COMPTABLE);
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Catégorisation des mouvements bancaires</h1>
                    <p className={styles.subtitle}>
                        Affectez vos mouvements bancaires aux comptes de charges ou de produits correspondants.
                    </p>
                </div>
            </div>

            <div className="card">
                <h2 className={styles.sectionTitle}>Mouvements à catégoriser ({MOCK_MOUVEMENTS_BANCAIRES.length})</h2>

                <div className={styles.movementsList}>
                    {MOCK_MOUVEMENTS_BANCAIRES.map((mouvement) => (
                        <div key={mouvement.id} className={styles.movementRow}>
                            <div className={styles.movementInfo}>
                                <div className={styles.date}>{new Date(mouvement.date).toLocaleDateString('fr-FR')}</div>
                                <div className={styles.libelle}>{mouvement.libelle}</div>
                                <div className={styles.amount} style={{ color: mouvement.montant < 0 ? '#DC2626' : '#059669' }}>
                                    {mouvement.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </div>
                            </div>

                            <div className={styles.categorization}>
                                <ArrowRight className={styles.arrow} size={20} aria-hidden="true" />
                                <div className={styles.selectWrapper}>
                                    <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                                    <select
                                        className={styles.accountSelect}
                                        value={selectedAccount}
                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                    >
                                        <option value="">Rechercher un compte (ex: 601 Eau)...</option>
                                        {allAccounts.map(account => (
                                            <option key={account.id} value={account.id}>
                                                {account.numero} - {account.libelle}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button className="btn btn-primary" disabled={!selectedAccount}>
                                    <Check size={16} aria-hidden="true" /> Valider
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
