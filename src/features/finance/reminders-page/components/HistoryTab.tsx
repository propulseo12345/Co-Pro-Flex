'use client';

import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/DataState';
import styles from '@/app/(dashboard)/finance/unpaid/reminders/reminders.module.css';
import type { HistoryTabState, HistoryTabHandlers } from '../hooks/useRemindersPage';
import { getStatusBadgeClass, getStatusLabel, formatDate } from '../domain/helpers';

export interface HistoryTabProps {
    state: HistoryTabState;
    handlers: HistoryTabHandlers;
}

export function HistoryTab({ state, handlers }: HistoryTabProps) {
    const { filteredHistory, filters } = state;
    const { setStatusFilter, setDelayFilter, setDateFrom, setDateTo, refreshHistory } = handlers;

    return (
        <div className={styles.historySection}>
            <div className={styles.historyFilters}>
                <select
                    value={filters.statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Tous les statuts</option>
                    <option value="sent">Envoyees</option>
                    <option value="failed">Echouees</option>
                    <option value="pending">En attente</option>
                    <option value="stale">Annulees</option>
                </select>
                <select
                    value={filters.delayFilter}
                    onChange={(e) => setDelayFilter(e.target.value)}
                >
                    <option value="all">Tous les niveaux</option>
                    <option value="7">J+7</option>
                    <option value="30">J+30</option>
                    <option value="60">J+60</option>
                </select>
                <div className={styles.dateRange}>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />
                    <span>au</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={refreshHistory}>
                    <RefreshCw size={14} /> Actualiser
                </button>
            </div>
            {filteredHistory.length === 0 ? (
                <EmptyState
                    title="Aucune relance"
                    message="L'historique est vide pour ces filtres."
                />
            ) : (
                <div className="card">
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Lot</th>
                                    <th>Proprietaire</th>
                                    <th>Montant</th>
                                    <th>Niveau</th>
                                    <th>Statut</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistory.map((r) => (
                                    <tr key={r.id}>
                                        <td>{formatDate(r.created_at)}</td>
                                        <td className={styles.lot}>{r.lot_ref}</td>
                                        <td>
                                            {r.owner_name || '-'}
                                            {r.recipient_email && (
                                                <div
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {r.recipient_email}
                                                </div>
                                            )}
                                        </td>
                                        <td className={styles.montant}>
                                            {Number(r.unpaid_amount).toLocaleString('fr-FR')} EUR
                                        </td>
                                        <td>
                                            <span className="badge">J+{r.delay_level}</span>
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${getStatusBadgeClass(r.status)}`}
                                            >
                                                {r.status === 'sent' && <CheckCircle size={12} />}
                                                {r.status === 'failed' && <XCircle size={12} />}
                                                {r.status === 'pending' && <Clock size={12} />}
                                                {getStatusLabel(r.status)}
                                            </span>
                                        </td>
                                        <td>
                                            {r.sent_at && (
                                                <div style={{ fontSize: '0.75rem' }}>
                                                    Envoye: {formatDate(r.sent_at)}
                                                </div>
                                            )}
                                            {r.cancelled_reason && (
                                                <div
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--error)',
                                                    }}
                                                >
                                                    {r.cancelled_reason}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
