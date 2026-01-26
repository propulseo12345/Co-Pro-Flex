'use client';

import { FileText, Download, Plus, Search, Filter } from 'lucide-react';
import styles from './invoices.module.css';
import { MOCK_FACTURES } from '@/data/mock';
import Link from 'next/link';
import { useState } from 'react';

export default function InvoicesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filteredInvoices = MOCK_FACTURES.filter((facture) => {
        const matchesSearch = facture.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
            facture.reference?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || facture.statut === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (statut: string) => {
        switch (statut) {
            case 'PAYEE':
                return <span className="badge badge-success">Payée</span>;
            case 'A_PAYER':
                return <span className="badge badge-error">À payer</span>;
            case 'EN_ATTENTE_VALIDATION':
                return <span className="badge badge-warning">En attente</span>;
            default:
                return null;
        }
    };

    const totalAmount = filteredInvoices.reduce((sum, f) => sum + f.montant, 0);
    const unpaidAmount = filteredInvoices.filter(f => f.statut === 'A_PAYER').reduce((sum, f) => sum + f.montant, 0);

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Factures</h1>
                    <p className={styles.subtitle}>
                        Gestion des factures fournisseurs
                    </p>
                </div>
                <Link href="/finance/invoices/new" className="btn btn-primary">
                    <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                    Nouvelle facture
                </Link>
            </div>

            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total factures</div>
                    <div className={styles.statValue}>{filteredInvoices.length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Montant total</div>
                    <div className={styles.statValue}>{totalAmount.toLocaleString('fr-FR')} €</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>À payer</div>
                    <div className={styles.statValue + ' ' + styles.statValueError}>{unpaidAmount.toLocaleString('fr-FR')} €</div>
                </div>
            </div>

            <div className="card">
                <div className={styles.filters}>
                    <div className={styles.searchBox}>
                        <Search size={16} aria-hidden="true" />
                        <input type="text" placeholder="Rechercher par fournisseur ou référence..." className="input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <Filter size={16} aria-hidden="true" />
                        <select
                            className="input"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Tous les statuts</option>
                            <option value="A_PAYER">À payer</option>
                            <option value="EN_ATTENTE_VALIDATION">En attente</option>
                            <option value="PAYEE">Payée</option>
                        </select>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Fournisseur</th>
                                <th>Référence</th>
                                <th>Montant</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map((facture) => (
                                <tr key={facture.id}>
                                    <td>{new Date(facture.date).toLocaleDateString('fr-FR')}</td>
                                    <td className={styles.fournisseur}>{facture.fournisseur}</td>
                                    <td className={styles.reference}>{facture.reference || '-'}</td>
                                    <td className={styles.montant}>{facture.montant.toLocaleString('fr-FR')} €</td>
                                    <td>{getStatusBadge(facture.statut)}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <Link href={`/finance/invoices/${facture.id}`} className="btn btn-secondary btn-sm">
                                                Détails
                                            </Link>
                                            <button className="btn btn-secondary btn-sm" aria-label="Télécharger"><Download size={14} aria-hidden="true" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
