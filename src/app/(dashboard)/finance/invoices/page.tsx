'use client';

import { Download, Plus, Search, Filter, Loader2 } from 'lucide-react';
import styles from './invoices.module.css';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useSupplierInvoices } from '@/hooks/modules/useFinanceData';

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

export default function InvoicesPage() {
    const { data: invoices, isLoading, error } = useSupplierInvoices();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filteredInvoices = useMemo(() => {
        if (!invoices) return [];
        return invoices.filter((invoice) => {
            const matchesSearch = invoice.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.label?.toLowerCase().includes(searchTerm.toLowerCase());
            const mappedStatus = mapStatus(invoice.status);
            const matchesStatus = statusFilter === 'ALL' || mappedStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [invoices, searchTerm, statusFilter]);

    const getStatusBadge = (status: string) => {
        const mappedStatus = mapStatus(status);
        switch (mappedStatus) {
            case 'PAYEE':
                return <span className="badge badge-success">Payée</span>;
            case 'A_PAYER':
                return <span className="badge badge-error">À payer</span>;
            case 'EN_ATTENTE_VALIDATION':
                return <span className="badge badge-warning">En attente</span>;
            default:
                return <span className="badge">{mappedStatus}</span>;
        }
    };

    const totalAmount = filteredInvoices.reduce((sum, f) => sum + Number(f.total_amount), 0);
    const unpaidAmount = filteredInvoices
        .filter(f => mapStatus(f.status) === 'A_PAYER')
        .reduce((sum, f) => sum + Number(f.total_amount), 0);

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

                {isLoading ? (
                    <div className={styles.loading}>
                        <Loader2 size={24} className={styles.spinner} />
                        <span>Chargement des factures...</span>
                    </div>
                ) : error ? (
                    <div className={styles.error}>
                        Erreur lors du chargement: {error}
                    </div>
                ) : (
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
                            {filteredInvoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td>{new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</td>
                                    <td className={styles.fournisseur}>{invoice.supplier_name}</td>
                                    <td className={styles.reference}>{invoice.invoice_number || invoice.label || '-'}</td>
                                    <td className={styles.montant}>{Number(invoice.total_amount).toLocaleString('fr-FR')} €</td>
                                    <td>{getStatusBadge(invoice.status)}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <Link href={`/finance/invoices/${invoice.id}`} className="btn btn-secondary btn-sm">
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
                )}
            </div>
        </div>
    );
}
