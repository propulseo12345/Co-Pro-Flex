'use client';

import { Send, Mail, Lock, CheckCircle, XCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/DataState';
import styles from '@/app/(dashboard)/finance/unpaid/reminders/reminders.module.css';
import type { UnpaidTabState, UnpaidTabHandlers } from '../hooks/useRemindersPage';
import {
    getRelanceType,
    getRelanceBadgeClass,
    getStatusBadgeClass,
    getStatusLabel,
    formatDate,
} from '../domain/helpers';

export interface UnpaidTabProps {
    state: UnpaidTabState;
    handlers: UnpaidTabHandlers;
}

export function UnpaidTab({ state, handlers }: UnpaidTabProps) {
    const { unpaid, selectedImpayes, isManager, isSending } = state;
    const { toggleSelection, toggleAll, openManualReminderModal } = handlers;

    return (
        <>
            {!isManager && (
                <div className={styles.roleRestricted}>
                    <Lock size={24} />
                    <p>Vous consultez les impayes en lecture seule.</p>
                </div>
            )}
            {selectedImpayes.length > 0 && isManager && (
                <div className={styles.actionBar}>
                    <div className={styles.actionBarInfo}>
                        {selectedImpayes.length} dossier(s) selectionne(s)
                    </div>
                    <button className="btn btn-primary" disabled>
                        <Mail size={16} /> Envoyer par email (groupe)
                    </button>
                </div>
            )}
            {unpaid.length === 0 ? (
                <EmptyState
                    title="Aucun impaye"
                    message="Tous les coproprietaires sont a jour."
                />
            ) : (
                <div className="card">
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    {isManager && (
                                        <th>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedImpayes.length === unpaid.length &&
                                                    unpaid.length > 0
                                                }
                                                onChange={toggleAll}
                                            />
                                        </th>
                                    )}
                                    <th>Lot</th>
                                    <th>Proprietaire</th>
                                    <th>Montant du</th>
                                    <th>Retard</th>
                                    <th>Type relance</th>
                                    <th>Derniere relance</th>
                                    {isManager && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {unpaid.map((item) => (
                                    <tr key={item.lot_id}>
                                        {isManager && (
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedImpayes.includes(item.lot_id)}
                                                    onChange={() => toggleSelection(item.lot_id)}
                                                />
                                            </td>
                                        )}
                                        <td className={styles.lot}>{item.lot_ref}</td>
                                        <td className={styles.proprietaire}>
                                            {item.owner_name || 'Non renseigne'}
                                            {item.owner_email && (
                                                <div
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {item.owner_email}
                                                </div>
                                            )}
                                        </td>
                                        <td className={styles.montant}>
                                            {Number(item.total_unpaid).toLocaleString('fr-FR')} EUR
                                        </td>
                                        <td>
                                            <span className={styles.retardBadge}>
                                                {item.days_overdue} jours
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${getRelanceBadgeClass(item.days_overdue)}`}
                                            >
                                                {getRelanceType(item.days_overdue)}
                                            </span>
                                        </td>
                                        <td>
                                            {item.last_reminder_sent_at ? (
                                                <div className={styles.lastReminder}>
                                                    <span className={styles.lastReminderLabel}>
                                                        Niveau {item.last_reminder_level}j
                                                    </span>
                                                    <span className={styles.lastReminderValue}>
                                                        {formatDate(item.last_reminder_sent_at)}
                                                    </span>
                                                    <span
                                                        className={`${styles.statusBadge} ${getStatusBadgeClass(item.last_reminder_status || '')}`}
                                                    >
                                                        {item.last_reminder_status === 'sent' && (
                                                            <CheckCircle size={12} />
                                                        )}
                                                        {item.last_reminder_status === 'failed' && (
                                                            <XCircle size={12} />
                                                        )}
                                                        {getStatusLabel(item.last_reminder_status || '')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className={styles.noReminder}>Aucune</span>
                                            )}
                                        </td>
                                        {isManager && (
                                            <td>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => openManualReminderModal(item)}
                                                    disabled={!item.owner_email || isSending}
                                                >
                                                    <Send size={14} /> Relancer
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}
