'use client';

import { useState, useCallback } from 'react';
import { Send, Mail, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, History, Lock, Settings } from 'lucide-react';
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
import {
  ManualReminderModal,
  BulkReminderModal,
  type ManualPreviewResult,
  type BulkPreviewResult,
} from '@/components/features/finance/Reminders';

type TabType = 'unpaid' | 'history';

// Helpers
const getRelanceType = (daysOverdue: number) => {
  if (daysOverdue > 90) return 'Contentieux';
  if (daysOverdue > 60) return 'Mise en demeure (60j)';
  if (daysOverdue > 30) return '2e relance (30j)';
  return '1re relance (7j)';
};

const getRelanceBadgeClass = (daysOverdue: number) =>
  daysOverdue > 60 ? 'badge-error' : 'badge-warning';

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
  const labels: Record<string, string> = {
    sent: 'Envoyee',
    failed: 'Echec',
    pending: 'En attente',
    stale: 'Annulee (paye)',
    skipped: 'Ignoree',
  };
  return labels[status] || status;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

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
  const [manualPreviewResult, setManualPreviewResult] = useState<ManualPreviewResult | null>(null);
  const [bulkPreviewResult, setBulkPreviewResult] = useState<BulkPreviewResult | null>(null);

  // History filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [delayFilter, setDelayFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const unpaid = unpaidLots || [];
  const history = remindersHistory || [];

  // Stats
  const totalUnpaid = unpaid.reduce((sum, item) => sum + Number(item.total_unpaid), 0);
  const lotsOver30Days = unpaid.filter(i => i.days_overdue > 30).length;
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

  // Handlers
  const toggleSelection = (id: string) =>
    setSelectedImpayes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelectedImpayes(selectedImpayes.length === unpaid.length ? [] : unpaid.map(i => i.lot_id));

  const handleConfirmManualReminder = useCallback(async (dryRun: boolean) => {
    if (!manualReminderLot) return;
    const result = await sendReminder({ lot_id: manualReminderLot.lot_id, dry_run: dryRun });
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
        refresh(); refreshHistory();
      }
    } else {
      alert(result.data?.error || result.error || 'Erreur lors de l\'envoi');
    }
  }, [manualReminderLot, sendReminder, refresh, refreshHistory]);

  const handleConfirmBulkReminder = useCallback(async (dryRun: boolean) => {
    const result = await runAllReminders({ dry_run: dryRun });
    if (result.data?.success) {
      const summary = result.data.summary || { processed: 0, sent: 0, skipped: 0, failed: 0 };
      setBulkPreviewResult({ processed: summary.processed ?? 0, sent: summary.sent ?? 0, skipped: summary.skipped ?? 0, failed: summary.failed ?? 0 });
      if (!dryRun) { refresh(); refreshHistory(); }
    } else {
      alert(result.data?.error || result.error || 'Erreur lors de l\'execution');
    }
  }, [runAllReminders, refresh, refreshHistory]);

  // Loading states
  if (!currentCoproId || isLoading) return <LoadingState message="Chargement des impayés..." />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <div className="container">
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des relances</h1>
          <p className={styles.subtitle}>Envoyez des relances automatiques aux coproprietaires en retard de paiement</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isManager ? (
            <button className="btn btn-primary" onClick={() => setShowBulkModal(true)} disabled={isRunning || unpaid.length === 0}>
              <Send size={16} /> Executer les relances auto
            </button>
          ) : (
            <button className="btn btn-primary" disabled title="Acces reserve aux gestionnaires">
              <Lock size={16} /> Relances (acces restreint)
            </button>
          )}
          {isManager && <Link href="/settings/reminders" className="btn btn-secondary"><Settings size={16} /> Parametrer</Link>}
          <Link href="/finance/unpaid" className="btn btn-secondary">Retour aux impayes</Link>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}><div className={styles.statLabel}>Total impayes</div><div className={`${styles.statValue} ${styles.statValueError}`}>{totalUnpaid.toLocaleString('fr-FR')} EUR</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Lots en retard</div><div className={styles.statValue}>{unpaid.length}</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Retard &gt; 30 jours</div><div className={`${styles.statValue} ${styles.statValueWarning}`}>{lotsOver30Days}</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Deja relances</div><div className={`${styles.statValue} ${styles.statValueSuccess}`}>{totalReminded}</div></div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'unpaid' ? styles.tabActive : ''}`} onClick={() => setActiveTab('unpaid')}>
          <AlertCircle size={16} /> A relancer ({unpaid.length})
        </button>
        <button className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`} onClick={() => setActiveTab('history')}>
          <History size={16} /> Historique ({history.length})
        </button>
      </div>

      {/* Unpaid Tab */}
      {activeTab === 'unpaid' && (
        <>
          {!isManager && <div className={styles.roleRestricted}><Lock size={24} /><p>Vous consultez les impayes en lecture seule.</p></div>}
          {selectedImpayes.length > 0 && isManager && (
            <div className={styles.actionBar}>
              <div className={styles.actionBarInfo}>{selectedImpayes.length} dossier(s) selectionne(s)</div>
              <button className="btn btn-primary" disabled><Mail size={16} /> Envoyer par email (groupe)</button>
            </div>
          )}
          {unpaid.length === 0 ? <EmptyState title="Aucun impaye" message="Tous les coproprietaires sont a jour." /> : (
            <div className="card">
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr>
                    {isManager && <th><input type="checkbox" checked={selectedImpayes.length === unpaid.length && unpaid.length > 0} onChange={toggleAll} /></th>}
                    <th>Lot</th><th>Proprietaire</th><th>Montant du</th><th>Retard</th><th>Type relance</th><th>Derniere relance</th>{isManager && <th>Actions</th>}
                  </tr></thead>
                  <tbody>
                    {unpaid.map((item) => (
                      <tr key={item.lot_id}>
                        {isManager && <td><input type="checkbox" checked={selectedImpayes.includes(item.lot_id)} onChange={() => toggleSelection(item.lot_id)} /></td>}
                        <td className={styles.lot}>{item.lot_ref}</td>
                        <td className={styles.proprietaire}>{item.owner_name || 'Non renseigne'}{item.owner_email && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.owner_email}</div>}</td>
                        <td className={styles.montant}>{Number(item.total_unpaid).toLocaleString('fr-FR')} EUR</td>
                        <td><span className={styles.retardBadge}>{item.days_overdue} jours</span></td>
                        <td><span className={`badge ${getRelanceBadgeClass(item.days_overdue)}`}>{getRelanceType(item.days_overdue)}</span></td>
                        <td>{item.last_reminder_sent_at ? (
                          <div className={styles.lastReminder}>
                            <span className={styles.lastReminderLabel}>Niveau {item.last_reminder_level}j</span>
                            <span className={styles.lastReminderValue}>{formatDate(item.last_reminder_sent_at)}</span>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(item.last_reminder_status || '')}`}>
                              {item.last_reminder_status === 'sent' && <CheckCircle size={12} />}
                              {item.last_reminder_status === 'failed' && <XCircle size={12} />}
                              {getStatusLabel(item.last_reminder_status || '')}
                            </span>
                          </div>
                        ) : <span className={styles.noReminder}>Aucune</span>}</td>
                        {isManager && <td><button className="btn btn-primary btn-sm" onClick={() => { setManualReminderLot(item); setManualPreviewResult(null); }} disabled={!item.owner_email || isSending}><Send size={14} /> Relancer</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className={styles.historySection}>
          <div className={styles.historyFilters}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tous les statuts</option><option value="sent">Envoyees</option><option value="failed">Echouees</option><option value="pending">En attente</option><option value="stale">Annulees</option>
            </select>
            <select value={delayFilter} onChange={(e) => setDelayFilter(e.target.value)}>
              <option value="all">Tous les niveaux</option><option value="7">J+7</option><option value="30">J+30</option><option value="60">J+60</option>
            </select>
            <div className={styles.dateRange}><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /><span>au</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
            <button className="btn btn-secondary btn-sm" onClick={refreshHistory}><RefreshCw size={14} /> Actualiser</button>
          </div>
          {filteredHistory.length === 0 ? <EmptyState title="Aucune relance" message="L'historique est vide pour ces filtres." /> : (
            <div className="card"><div className={styles.tableWrapper}><table className={styles.table}>
              <thead><tr><th>Date</th><th>Lot</th><th>Proprietaire</th><th>Montant</th><th>Niveau</th><th>Statut</th><th>Details</th></tr></thead>
              <tbody>{filteredHistory.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.created_at)}</td><td className={styles.lot}>{r.lot_ref}</td>
                  <td>{r.owner_name || '-'}{r.recipient_email && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.recipient_email}</div>}</td>
                  <td className={styles.montant}>{Number(r.unpaid_amount).toLocaleString('fr-FR')} EUR</td>
                  <td><span className="badge">J+{r.delay_level}</span></td>
                  <td><span className={`${styles.statusBadge} ${getStatusBadgeClass(r.status)}`}>{r.status === 'sent' && <CheckCircle size={12} />}{r.status === 'failed' && <XCircle size={12} />}{r.status === 'pending' && <Clock size={12} />}{getStatusLabel(r.status)}</span></td>
                  <td>{r.sent_at && <div style={{ fontSize: '0.75rem' }}>Envoye: {formatDate(r.sent_at)}</div>}{r.cancelled_reason && <div style={{ fontSize: '0.75rem', color: 'var(--error)' }}>{r.cancelled_reason}</div>}</td>
                </tr>
              ))}</tbody>
            </table></div></div>
          )}
        </div>
      )}

      {/* Templates section */}
      <div className={styles.templates}>
        <div className={styles.templatesHeader}><h2 className={styles.templatesTitle}>Modeles de relance</h2>{isManager && <Link href="/settings/reminders" className="btn btn-secondary btn-sm"><Settings size={14} /> Gerer</Link>}</div>
        <div className={styles.templatesGrid}>
          <div className={styles.templateCard}><h3>1re relance (J+7)</h3><p>Information courtoise</p></div>
          <div className={styles.templateCard}><h3>2e relance (J+30)</h3><p>Rappel avec delai</p></div>
          <div className={styles.templateCard}><h3>Dernier rappel (J+60)</h3><p>Avant transmission conseil</p></div>
        </div>
      </div>

      {/* Modals */}
      {manualReminderLot && <ManualReminderModal lot={manualReminderLot} onClose={() => { setManualReminderLot(null); setManualPreviewResult(null); }} onConfirm={handleConfirmManualReminder} isLoading={isSending} previewResult={manualPreviewResult} />}
      {showBulkModal && <BulkReminderModal unpaidCount={unpaid.length} eligibleCount={eligibleForReminder} totalAmount={totalUnpaid} onClose={() => { setShowBulkModal(false); setBulkPreviewResult(null); }} onConfirm={handleConfirmBulkReminder} isLoading={isRunning} previewResult={bulkPreviewResult} />}
    </div>
  );
}
