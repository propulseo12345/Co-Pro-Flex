'use client';

import { useState, useCallback } from 'react';
import { Send, Mail, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, History, X, Eye, AlertTriangle, Lock, Settings } from 'lucide-react';
import styles from './reminders.module.css';
import Link from 'next/link';
import { useCopro } from '@/providers/CoproContext';
import {
    useUnpaidWithReminders,
    usePaymentReminders,
    useSendManualReminder,
    useRunPaymentReminders,
    type UnpaidWithReminder,
} from '@/hooks/modules/useFinanceData';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState';

type TabType = 'unpaid' | 'history';

interface ManualReminderModalProps {
    lot: UnpaidWithReminder;
    onClose: () => void;
    onConfirm: (dryRun: boolean) => Promise<void>;
    isLoading: boolean;
    previewResult: { success: boolean; would_send: boolean; delay_level: number } | null;
}

function ManualReminderModal({ lot, onClose, onConfirm, isLoading, previewResult }: ManualReminderModalProps) {
    const [dryRun, setDryRun] = useState(true);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>
                        <Send size={18} />
                        Envoyer une relance
                    </h3>
                    <button className={styles.modalCloseBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    <div className={styles.reminderDetails}>
                        <div className={styles.reminderDetailRow}>
                            <span className={styles.reminderDetailLabel}>Lot</span>
                            <span className={styles.reminderDetailValue}>{lot.lot_ref}</span>
                        </div>
                        <div className={styles.reminderDetailRow}>
                            <span className={styles.reminderDetailLabel}>Proprietaire</span>
                            <span className={styles.reminderDetailValue}>{lot.owner_name || 'Non renseigne'}</span>
                        </div>
                        <div className={styles.reminderDetailRow}>
                            <span className={styles.reminderDetailLabel}>Email</span>
                            <span className={styles.reminderDetailValue}>{lot.owner_email || 'Non renseigne'}</span>
                        </div>
                        <div className={styles.reminderDetailRow}>
                            <span className={styles.reminderDetailLabel}>Montant impaye</span>
                            <span className={`${styles.reminderDetailValue} ${styles.reminderDetailValueError}`}>
                                {Number(lot.total_unpaid).toLocaleString('fr-FR')} EUR
                            </span>
                        </div>
                        <div className={styles.reminderDetailRow}>
                            <span className={styles.reminderDetailLabel}>Jours de retard</span>
                            <span className={styles.reminderDetailValue}>{lot.days_overdue} jours</span>
                        </div>
                        {lot.total_reminders_sent > 0 && (
                            <div className={styles.reminderDetailRow}>
                                <span className={styles.reminderDetailLabel}>Relances deja envoyees</span>
                                <span className={styles.reminderDetailValue}>{lot.total_reminders_sent}</span>
                            </div>
                        )}
                    </div>

                    <div className={styles.dryRunToggle}>
                        <label>
                            <input
                                type="checkbox"
                                checked={dryRun}
                                onChange={(e) => setDryRun(e.target.checked)}
                            />
                            <span>Mode simulation</span>
                        </label>
                        <div className={styles.dryRunDescription}>
                            {dryRun
                                ? "Aucun email ne sera envoye. Previsualisation uniquement."
                                : "L'email sera reellement envoye au proprietaire."}
                        </div>
                    </div>

                    {previewResult && (
                        <div className={styles.previewResults}>
                            <div className={styles.previewTitle}>
                                <Eye size={16} />
                                Resultat de la simulation
                            </div>
                            <div className={styles.previewItem}>
                                <span className={styles.previewItemLabel}>Niveau de relance</span>
                                <span className={styles.previewItemValue}>J+{previewResult.delay_level}</span>
                            </div>
                            <div className={styles.previewItem}>
                                <span className={styles.previewItemLabel}>Envoi prevu</span>
                                <span className={styles.previewItemValue}>
                                    {previewResult.would_send ? 'Oui' : 'Non (deja relance a ce niveau)'}
                                </span>
                            </div>
                        </div>
                    )}

                    {!dryRun && (
                        <div className={styles.warningBox}>
                            <AlertTriangle size={20} />
                            <div className={styles.warningContent}>
                                <p>
                                    Un email sera envoye a <strong>{lot.owner_email}</strong>.
                                    Cette action est irreversible.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.modalActions}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
                        Annuler
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => onConfirm(dryRun)}
                        disabled={isLoading || !lot.owner_email}
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw size={16} className="spinning" />
                                {dryRun ? 'Simulation...' : 'Envoi...'}
                            </>
                        ) : dryRun ? (
                            <>
                                <Eye size={16} />
                                Simuler
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                Envoyer
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface BulkReminderModalProps {
    unpaidCount: number;
    eligibleCount: number;
    totalAmount: number;
    onClose: () => void;
    onConfirm: (dryRun: boolean) => Promise<void>;
    isLoading: boolean;
    previewResult: { processed: number; sent: number; skipped: number; failed: number } | null;
}

function BulkReminderModal({
    unpaidCount,
    eligibleCount,
    totalAmount,
    onClose,
    onConfirm,
    isLoading,
    previewResult
}: BulkReminderModalProps) {
    const [dryRun, setDryRun] = useState(true);

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>
                        <Send size={18} />
                        Executer les relances automatiques
                    </h3>
                    <button className={styles.modalCloseBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    <div className={styles.bulkStats}>
                        <div className={styles.bulkStatItem}>
                            <div className={styles.bulkStatValue}>{unpaidCount}</div>
                            <div className={styles.bulkStatLabel}>Lots en retard</div>
                        </div>
                        <div className={styles.bulkStatItem}>
                            <div className={styles.bulkStatValue}>{eligibleCount}</div>
                            <div className={styles.bulkStatLabel}>Eligibles</div>
                        </div>
                        <div className={styles.bulkStatItem}>
                            <div className={styles.bulkStatValue} style={{ color: 'var(--error)' }}>
                                {totalAmount.toLocaleString('fr-FR')} EUR
                            </div>
                            <div className={styles.bulkStatLabel}>Total impaye</div>
                        </div>
                    </div>

                    <div className={styles.dryRunToggle}>
                        <label>
                            <input
                                type="checkbox"
                                checked={dryRun}
                                onChange={(e) => setDryRun(e.target.checked)}
                            />
                            <span>Mode simulation</span>
                        </label>
                        <div className={styles.dryRunDescription}>
                            {dryRun
                                ? "Aucun email ne sera envoye. Previsualisation du nombre de relances."
                                : "Les emails seront reellement envoyes aux proprietaires."}
                        </div>
                    </div>

                    {previewResult && (
                        <div className={styles.previewResults}>
                            <div className={styles.previewTitle}>
                                <Eye size={16} />
                                {dryRun ? 'Resultat de la simulation' : 'Resultat de l\'execution'}
                            </div>
                            <div className={styles.previewItem}>
                                <span className={styles.previewItemLabel}>Traites</span>
                                <span className={styles.previewItemValue}>{previewResult.processed}</span>
                            </div>
                            <div className={styles.previewItem}>
                                <span className={styles.previewItemLabel}>Envoyes</span>
                                <span className={styles.previewItemValue} style={{ color: 'var(--success)' }}>
                                    {previewResult.sent}
                                </span>
                            </div>
                            <div className={styles.previewItem}>
                                <span className={styles.previewItemLabel}>Ignores (deja relances)</span>
                                <span className={styles.previewItemValue}>{previewResult.skipped}</span>
                            </div>
                            {previewResult.failed > 0 && (
                                <div className={styles.previewItem}>
                                    <span className={styles.previewItemLabel}>Echoues</span>
                                    <span className={styles.previewItemValue} style={{ color: 'var(--error)' }}>
                                        {previewResult.failed}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {!dryRun && !previewResult && (
                        <div className={styles.warningBox}>
                            <AlertTriangle size={20} />
                            <div className={styles.warningContent}>
                                <p>
                                    Des emails de relance seront envoyes a tous les proprietaires
                                    eligibles. Cette action est irreversible.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.modalActions}>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
                        {previewResult && !dryRun ? 'Fermer' : 'Annuler'}
                    </button>
                    {(!previewResult || dryRun) && (
                        <button
                            className="btn btn-primary"
                            onClick={() => onConfirm(dryRun)}
                            disabled={isLoading || eligibleCount === 0}
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw size={16} className="spinning" />
                                    {dryRun ? 'Simulation...' : 'Execution...'}
                                </>
                            ) : dryRun ? (
                                <>
                                    <Eye size={16} />
                                    Simuler
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Executer
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RemindersPage() {
    const { currentCoproId, isManager } = useCopro();
    const { data: unpaidLots, isLoading, error, refresh } = useUnpaidWithReminders();
    const { data: remindersHistory, refresh: refreshHistory } = usePaymentReminders();
    const { isLoading: isSending, mutate: sendReminder } = useSendManualReminder();
    const { isLoading: isRunning, mutate: runAllReminders } = useRunPaymentReminders();

    const [activeTab, setActiveTab] = useState<TabType>('unpaid');
    const [selectedImpayes, setSelectedImpayes] = useState<string[]>([]);

    // Modal states
    const [manualReminderLot, setManualReminderLot] = useState<UnpaidWithReminder | null>(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [manualPreviewResult, setManualPreviewResult] = useState<{ success: boolean; would_send: boolean; delay_level: number } | null>(null);
    const [bulkPreviewResult, setBulkPreviewResult] = useState<{ processed: number; sent: number; skipped: number; failed: number } | null>(null);

    // History filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [delayFilter, setDelayFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const unpaid = unpaidLots || [];
    const history = remindersHistory || [];

    const toggleSelection = (id: string) => {
        setSelectedImpayes(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedImpayes.length === unpaid.length) {
            setSelectedImpayes([]);
        } else {
            setSelectedImpayes(unpaid.map(i => i.lot_id));
        }
    };

    const getRelanceType = (daysOverdue: number) => {
        if (daysOverdue > 90) return 'Contentieux';
        if (daysOverdue > 60) return 'Mise en demeure (60j)';
        if (daysOverdue > 30) return '2e relance (30j)';
        return '1re relance (7j)';
    };

    const getRelanceBadgeClass = (daysOverdue: number) => {
        return daysOverdue > 60 ? 'badge-error' : 'badge-warning';
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'sent': return styles.statusSent;
            case 'failed': return styles.statusFailed;
            case 'pending': return styles.statusPending;
            case 'stale':
            case 'skipped': return styles.statusStale;
            default: return '';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'sent': return 'Envoyee';
            case 'failed': return 'Echec';
            case 'pending': return 'En attente';
            case 'stale': return 'Annulee (paye)';
            case 'skipped': return 'Ignoree';
            default: return status;
        }
    };

    // Manual reminder with modal
    const handleOpenManualReminder = (lot: UnpaidWithReminder) => {
        setManualReminderLot(lot);
        setManualPreviewResult(null);
    };

    const handleConfirmManualReminder = useCallback(async (dryRun: boolean) => {
        if (!manualReminderLot) return;

        const result = await sendReminder({
            lot_id: manualReminderLot.lot_id,
            dry_run: dryRun,
        });

        if (result.data?.success) {
            if (dryRun) {
                setManualPreviewResult({
                    success: true,
                    would_send: result.data.would_send ?? true,
                    delay_level: result.data.delay_level ?? 7,
                });
            } else {
                setManualReminderLot(null);
                setManualPreviewResult(null);
                refresh();
                refreshHistory();
            }
        } else {
            alert(result.data?.error || result.error || 'Erreur lors de l\'envoi');
        }
    }, [manualReminderLot, sendReminder, refresh, refreshHistory]);

    // Bulk reminders with modal
    const handleOpenBulkReminder = () => {
        setShowBulkModal(true);
        setBulkPreviewResult(null);
    };

    const handleConfirmBulkReminder = useCallback(async (dryRun: boolean) => {
        const result = await runAllReminders({ dry_run: dryRun });

        if (result.data?.success) {
            const summary = result.data.summary || { processed: 0, sent: 0, skipped: 0, failed: 0 };
            setBulkPreviewResult({
                processed: summary.processed ?? 0,
                sent: summary.sent ?? 0,
                skipped: summary.skipped ?? 0,
                failed: summary.failed ?? 0,
            });

            if (!dryRun) {
                refresh();
                refreshHistory();
            }
        } else {
            alert(result.data?.error || result.error || 'Erreur lors de l\'execution');
        }
    }, [runAllReminders, refresh, refreshHistory]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Stats
    const totalUnpaid = unpaid.reduce((sum, item) => sum + Number(item.total_unpaid), 0);
    const lotsOver30Days = unpaid.filter(i => i.days_overdue > 30).length;
    const lotsOver60Days = unpaid.filter(i => i.days_overdue > 60).length;
    const totalReminded = unpaid.filter(i => i.total_reminders_sent > 0).length;
    const eligibleForReminder = unpaid.filter(i => i.owner_email).length;

    // Filtered history
    const filteredHistory = history.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (delayFilter !== 'all' && r.delay_level !== Number(delayFilter)) return false;
        if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
        if (dateTo && new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false;
        return true;
    });

    // Mode Single Copro: si pas encore chargé ou en cours de chargement
    if (!currentCoproId || isLoading) {
        return <LoadingState message="Chargement des impayés..." />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={refresh} />;
    }

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Gestion des relances</h1>
                    <p className={styles.subtitle}>
                        Envoyez des relances automatiques aux coproprietaires en retard de paiement
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {isManager ? (
                        <button
                            className="btn btn-primary"
                            onClick={handleOpenBulkReminder}
                            disabled={isRunning || unpaid.length === 0}
                        >
                            <span className={styles.runAllButton}>
                                <Send size={16} aria-hidden="true" />
                                Executer les relances auto
                            </span>
                        </button>
                    ) : (
                        <button className="btn btn-primary" disabled title="Acces reserve aux gestionnaires">
                            <Lock size={16} aria-hidden="true" />
                            Relances (acces restreint)
                        </button>
                    )}
                    {isManager && (
                        <Link href="/settings/reminders" className="btn btn-secondary">
                            <Settings size={16} style={{ marginRight: 6 }} aria-hidden="true" />
                            Parametrer
                        </Link>
                    )}
                    <Link href="/finance/unpaid" className="btn btn-secondary">
                        Retour aux impayes
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total impayes</div>
                    <div className={`${styles.statValue} ${styles.statValueError}`}>
                        {totalUnpaid.toLocaleString('fr-FR')} EUR
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Lots en retard</div>
                    <div className={styles.statValue}>{unpaid.length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Retard &gt; 30 jours</div>
                    <div className={`${styles.statValue} ${styles.statValueWarning}`}>{lotsOver30Days}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Deja relances</div>
                    <div className={`${styles.statValue} ${styles.statValueSuccess}`}>{totalReminded}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'unpaid' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('unpaid')}
                >
                    <AlertCircle size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} aria-hidden="true" />
                    A relancer ({unpaid.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <History size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} aria-hidden="true" />
                    Historique ({history.length})
                </button>
            </div>

            {activeTab === 'unpaid' && (
                <>
                    {!isManager && (
                        <div className={styles.roleRestricted}>
                            <Lock size={24} />
                            <p>Vous consultez les impayes en lecture seule. Seuls les gestionnaires peuvent envoyer des relances.</p>
                        </div>
                    )}

                    {selectedImpayes.length > 0 && isManager && (
                        <div className={styles.actionBar}>
                            <div className={styles.actionBarInfo}>
                                {selectedImpayes.length} dossier(s) selectionne(s)
                            </div>
                            <div className={styles.actionBarButtons}>
                                <button className="btn btn-primary" disabled>
                                    <Mail size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                                    Envoyer par email (groupe)
                                </button>
                            </div>
                        </div>
                    )}

                    {unpaid.length === 0 ? (
                        <EmptyState
                            title="Aucun impaye"
                            message="Tous les coproprietaires sont a jour de leurs charges."
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
                                                        checked={selectedImpayes.length === unpaid.length && unpaid.length > 0}
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
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
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
                                                    <span className={`badge ${getRelanceBadgeClass(item.days_overdue)}`}>
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
                                                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(item.last_reminder_status || '')}`}>
                                                                {item.last_reminder_status === 'sent' && <CheckCircle size={12} aria-hidden="true" />}
                                                                {item.last_reminder_status === 'failed' && <XCircle size={12} aria-hidden="true" />}
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
                                                            onClick={() => handleOpenManualReminder(item)}
                                                            disabled={!item.owner_email || isSending}
                                                            title={!item.owner_email ? 'Pas d\'email' : 'Envoyer une relance'}
                                                        >
                                                            <Send size={14} style={{ marginRight: 4 }} aria-hidden="true" />
                                                            Relancer
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
            )}

            {activeTab === 'history' && (
                <div className={styles.historySection}>
                    <div className={styles.historyFilters}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="sent">Envoyees</option>
                            <option value="failed">Echouees</option>
                            <option value="pending">En attente</option>
                            <option value="stale">Annulees (paye)</option>
                        </select>
                        <select
                            value={delayFilter}
                            onChange={(e) => setDelayFilter(e.target.value)}
                        >
                            <option value="all">Tous les niveaux</option>
                            <option value="7">J+7 (1re relance)</option>
                            <option value="30">J+30 (2e relance)</option>
                            <option value="60">J+60 (dernier rappel)</option>
                        </select>
                        <div className={styles.dateRange}>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                placeholder="Du"
                            />
                            <span>au</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                placeholder="Au"
                            />
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={refreshHistory}>
                            <RefreshCw size={14} style={{ marginRight: 4 }} aria-hidden="true" />
                            Actualiser
                        </button>
                    </div>

                    {filteredHistory.length === 0 ? (
                        <EmptyState
                            title="Aucune relance"
                            message="L'historique des relances est vide pour les filtres selectionnes."
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
                                        {filteredHistory.map((reminder) => (
                                            <tr key={reminder.id}>
                                                <td>{formatDate(reminder.created_at)}</td>
                                                <td className={styles.lot}>{reminder.lot_ref}</td>
                                                <td>
                                                    {reminder.owner_name || 'Non renseigne'}
                                                    {reminder.recipient_email && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            {reminder.recipient_email}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={styles.montant}>
                                                    {Number(reminder.unpaid_amount).toLocaleString('fr-FR')} EUR
                                                </td>
                                                <td>
                                                    <span className="badge">
                                                        J+{reminder.delay_level}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(reminder.status)}`}>
                                                        {reminder.status === 'sent' && <CheckCircle size={12} aria-hidden="true" />}
                                                        {reminder.status === 'failed' && <XCircle size={12} aria-hidden="true" />}
                                                        {reminder.status === 'pending' && <Clock size={12} aria-hidden="true" />}
                                                        {getStatusLabel(reminder.status)}
                                                    </span>
                                                </td>
                                                <td>
                                                    {reminder.sent_at && (
                                                        <div style={{ fontSize: '0.75rem' }}>
                                                            Envoye: {formatDate(reminder.sent_at)}
                                                        </div>
                                                    )}
                                                    {reminder.cancelled_reason && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                                                            {reminder.cancelled_reason}
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
            )}

            {/* Templates section */}
            <div className={styles.templates}>
                <div className={styles.templatesHeader}>
                    <h2 className={styles.templatesTitle}>Modeles de relance</h2>
                    {isManager && (
                        <Link href="/settings/reminders" className="btn btn-secondary btn-sm">
                            <Settings size={14} style={{ marginRight: 4 }} aria-hidden="true" />
                            Gerer les parametres
                        </Link>
                    )}
                </div>
                <div className={styles.templatesGrid}>
                    <div className={styles.templateCard}>
                        <h3>1re relance amiable (J+7)</h3>
                        <p>Information courtoise sur le solde en attente</p>
                    </div>
                    <div className={styles.templateCard}>
                        <h3>2e relance (J+30)</h3>
                        <p>Rappel avec mention du delai de retard</p>
                    </div>
                    <div className={styles.templateCard}>
                        <h3>Dernier rappel (J+60)</h3>
                        <p>Dernier rappel avant transmission au conseil syndical</p>
                    </div>
                </div>
            </div>

            {/* Manual Reminder Modal */}
            {manualReminderLot && (
                <ManualReminderModal
                    lot={manualReminderLot}
                    onClose={() => {
                        setManualReminderLot(null);
                        setManualPreviewResult(null);
                    }}
                    onConfirm={handleConfirmManualReminder}
                    isLoading={isSending}
                    previewResult={manualPreviewResult}
                />
            )}

            {/* Bulk Reminder Modal */}
            {showBulkModal && (
                <BulkReminderModal
                    unpaidCount={unpaid.length}
                    eligibleCount={eligibleForReminder}
                    totalAmount={totalUnpaid}
                    onClose={() => {
                        setShowBulkModal(false);
                        setBulkPreviewResult(null);
                    }}
                    onConfirm={handleConfirmBulkReminder}
                    isLoading={isRunning}
                    previewResult={bulkPreviewResult}
                />
            )}
        </div>
    );
}
