'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Calendar,
  FileText,
  History,
  DollarSign,
  CheckCircle,
  Clock,
  Lock,
  ExternalLink,
  Download,
  Paperclip,
  Receipt,
  Inbox,
} from 'lucide-react';
import { usePaymentSchedule } from '@/hooks/modules/usePaymentSchedule';
import { createClient } from '@/lib/supabase/client';
import type { BudgetTravaux, PaymentPhase } from '../types';
import styles from './TravauxDetailModal.module.css';

type DetailTab = 'echeancier' | 'documents' | 'historique';

interface TravauxDetailModalProps {
  travaux: BudgetTravaux;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onClose: () => void;
}

interface SupabaseDocument {
  id: string;
  title: string;
  file_path: string | null;
  category: string | null;
  created_at: string;
  file_size: number | null;
}

interface HistoryEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'creation' | 'payment' | 'document';
  amount?: number;
}

// ── Status helpers ──

const STATUS_CONFIG: Record<PaymentPhase['status'], { label: string; cls: string }> = {
  paid: { label: 'Paye', cls: 'badgeTermine' },
  awaiting_invoice: { label: 'En attente facture', cls: 'badgeEnCours' },
  pending: { label: 'A venir', cls: 'badgeAFaire' },
};

function getPhaseNumColor(status: PaymentPhase['status'], isRetention: boolean): string {
  if (isRetention) return '#f97316';
  switch (status) {
    case 'paid': return '#22c55e';
    case 'awaiting_invoice': return '#3b82f6';
    default: return '#64748b';
  }
}

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' \u20ac';
}

function formatDate(d: string | undefined): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

// ── Empty State ──

function EmptyState({ icon: Icon, title, text }: { icon: typeof Inbox; title: string; text: string }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{text}</p>
    </div>
  );
}

// ── Main Component ──

export function TravauxDetailModal({
  travaux,
  activeTab,
  onTabChange,
  onClose,
}: TravauxDetailModalProps) {
  // ── Echeancier ──
  const {
    phases,
    isLoading: phasesLoading,
    totalPaid,
    totalAmount,
    remaining,
    loadPhases,
    markPaid,
  } = usePaymentSchedule(travaux.id);

  useEffect(() => {
    loadPhases();
  }, [loadPhases]);

  // ── Documents ──
  const [documents, setDocuments] = useState<SupabaseDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!travaux.id) return;
    setDocsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{ data: SupabaseDocument[] | null; error: unknown }>;
            };
          };
        };
      }).from('documents')
        .select('*')
        .eq('budget_id', travaux.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDocuments(data);
      }
    } catch {
      // silent
    } finally {
      setDocsLoading(false);
    }
  }, [travaux.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ── Historique (computed) ──
  const historyEntries: HistoryEntry[] = (() => {
    const entries: HistoryEntry[] = [];

    // Budget creation
    if (travaux.dateVote) {
      entries.push({
        id: 'creation',
        date: travaux.dateVote,
        title: 'Budget cree',
        description: `Budget travaux "${travaux.titre}" vote pour ${formatCurrency(travaux.budgetVote)}`,
        type: 'creation',
        amount: travaux.budgetVote,
      });
    }

    // Paid phases
    for (const phase of phases) {
      if (phase.status === 'paid' && phase.paidDate) {
        entries.push({
          id: `phase-${phase.id}`,
          date: phase.paidDate,
          title: `Phase payee : ${phase.label}`,
          description: `Paiement de ${formatCurrency(phase.amount)} (${phase.percentage}%)`,
          type: 'payment',
          amount: phase.amount,
        });
      }
    }

    // Documents uploaded
    for (const doc of documents) {
      entries.push({
        id: `doc-${doc.id}`,
        date: doc.created_at,
        title: 'Document ajoute',
        description: doc.title || 'Document sans titre',
        type: 'document',
      });
    }

    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries;
  })();

  // ── Tab counts ──
  const tabCounts = {
    echeancier: phases.length,
    documents: documents.length,
    historique: historyEntries.length,
  };

  const progressPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  // ── Handlers ──
  const handleMarkPaid = useCallback(async (phaseId: string) => {
    const today = new Date().toISOString().split('T')[0];
    await markPaid(phaseId, today);
  }, [markPaid]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2 className={styles.title}>{travaux.titre}</h2>
            <p className={styles.subtitle}>{travaux.description}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {([
            { id: 'echeancier' as const, icon: Calendar, label: 'Echeancier' },
            { id: 'documents' as const, icon: FileText, label: 'Documents' },
            { id: 'historique' as const, icon: History, label: 'Historique' },
          ]).map(({ id, icon: TabIcon, label }) => (
            <button
              key={id}
              className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
              onClick={() => onTabChange(id)}
            >
              <TabIcon size={15} aria-hidden="true" />
              {label}
              <span className={styles.tabCount}>{tabCounts[id]}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* ── Tab: Echeancier ── */}
          {activeTab === 'echeancier' && (
            phasesLoading ? (
              <EmptyState icon={Clock} title="Chargement..." text="Recuperation de l'echeancier en cours." />
            ) : phases.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Aucun echeancier"
                text="Aucune phase de paiement n'est definie pour ce budget travaux."
              />
            ) : (
              <div className={styles.scheduleTable}>
                <div className={styles.scheduleHeader}>
                  <span>#</span>
                  <span>Phase</span>
                  <span>%</span>
                  <span>Montant</span>
                  <span>Date</span>
                  <span>Statut</span>
                  <span></span>
                </div>
                {phases.map((phase) => {
                  const cfg = STATUS_CONFIG[phase.status] ?? STATUS_CONFIG.pending;
                  const numColor = getPhaseNumColor(phase.status, phase.isRetention);
                  return (
                    <div
                      key={phase.id}
                      className={`${styles.scheduleRow} ${phase.isRetention ? styles.rowRetention : ''}`}
                    >
                      <span className={styles.phaseNum} style={{ color: numColor }}>
                        {phase.phaseNumber}
                      </span>
                      <span className={styles.scheduleLabel}>{phase.label}</span>
                      <span className={styles.schedulePct}>{phase.percentage}%</span>
                      <span className={styles.scheduleAmount}>{formatCurrency(phase.amount)}</span>
                      <span className={styles.scheduleDate}>
                        {phase.status === 'paid' && phase.paidDate
                          ? formatDate(phase.paidDate)
                          : formatDate(phase.dueDate)}
                      </span>
                      <span>
                        <span className={`${styles.badge} ${styles[cfg.cls]}`}>
                          {phase.isRetention ? (
                            <><Lock size={12} aria-hidden="true" /> Bloquee</>
                          ) : (
                            <>{phase.status === 'paid'
                              ? <CheckCircle size={12} aria-hidden="true" />
                              : phase.status === 'awaiting_invoice'
                                ? <Receipt size={12} aria-hidden="true" />
                                : <Clock size={12} aria-hidden="true" />
                            } {cfg.label}</>
                          )}
                        </span>
                      </span>
                      <span>
                        {phase.status !== 'paid' && !phase.isRetention && (
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleMarkPaid(phase.id)}
                            title="Marquer comme paye"
                            aria-label={`Marquer phase ${phase.phaseNumber} comme payee`}
                          >
                            <DollarSign size={14} aria-hidden="true" />
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}

                {/* Summary bar */}
                <div className={styles.summaryBar}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Paye</span>
                    <span className={styles.summaryValueSuccess}>{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Reste</span>
                    <span className={styles.summaryValue}>{formatCurrency(remaining)}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Total</span>
                    <span className={styles.summaryValue}>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )
          )}

          {/* ── Tab: Documents ── */}
          {activeTab === 'documents' && (
            docsLoading ? (
              <EmptyState icon={Clock} title="Chargement..." text="Recuperation des documents en cours." />
            ) : documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Aucun document"
                text="Les devis, factures et autres documents seront listes ici."
              />
            ) : (
              <div className={styles.docList}>
                {documents.map((doc) => (
                  <div key={doc.id} className={styles.docCard}>
                    <div className={styles.docIcon}>
                      <FileText size={18} aria-hidden="true" />
                    </div>
                    <div className={styles.docInfo}>
                      <p className={styles.docName}>{doc.title || 'Document'}</p>
                      <div className={styles.docMeta}>
                        {doc.category && (
                          <span className={styles.docType}>{doc.category}</span>
                        )}
                        <span className={styles.docDate}>
                          {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        {doc.file_size != null && (
                          <span className={styles.docSize}>{formatFileSize(doc.file_size)}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.docActions}>
                      {doc.file_path && (
                        <>
                          <button
                            className={styles.docBtn}
                            onClick={() => window.open(doc.file_path!, '_blank')}
                            title="Ouvrir"
                            aria-label={`Ouvrir ${doc.title}`}
                          >
                            <ExternalLink size={15} aria-hidden="true" />
                          </button>
                          <button
                            className={styles.docBtn}
                            title="Telecharger"
                            aria-label={`Telecharger ${doc.title}`}
                          >
                            <Download size={15} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Tab: Historique ── */}
          {activeTab === 'historique' && (
            historyEntries.length === 0 ? (
              <EmptyState
                icon={History}
                title="Aucun evenement"
                text="L'historique des travaux apparaitra ici au fur et a mesure de l'avancement."
              />
            ) : (
              <div className={styles.timeline}>
                {historyEntries.map((entry) => {
                  const iconMap = {
                    creation: DollarSign,
                    payment: CheckCircle,
                    document: Paperclip,
                  };
                  const colorMap = {
                    creation: '#6366f1',
                    payment: '#22c55e',
                    document: '#3b82f6',
                  };
                  const EntryIcon = iconMap[entry.type];
                  const color = colorMap[entry.type];
                  return (
                    <div key={entry.id} className={styles.timelineItem}>
                      <div className={styles.timelineDot} style={{ backgroundColor: color }}>
                        <EntryIcon size={16} aria-hidden="true" />
                      </div>
                      <div className={styles.timelineBody}>
                        <div className={styles.timelineTop}>
                          <span className={styles.timelineDate}>
                            {new Date(entry.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          {entry.amount != null && (
                            <span className={styles.timelineAmount}>
                              {formatCurrency(entry.amount)}
                            </span>
                          )}
                        </div>
                        <h4 className={styles.timelineEventTitle}>{entry.title}</h4>
                        <p className={styles.timelineDesc}>{entry.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
