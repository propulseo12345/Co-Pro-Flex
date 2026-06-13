'use client';

import { useState } from 'react';
import {
  Mail,
  Send,
  Check,
  CheckCheck,
  Eye,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Bell,
} from 'lucide-react';
import type {
  RecipientWithStatus,
  DeliveryStatus,
  AgNotificationStats,
} from '../../types/notifications';
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
} from '../../types/notifications';
import styles from './NotificationStatusPanel.module.css';

// ============================================================================
// Types
// ============================================================================

interface NotificationStatusPanelProps {
  recipients: RecipientWithStatus[];
  stats: AgNotificationStats | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSendRelance: (coproprietaireIds: string[]) => void;
  relanceLoading?: boolean;
}

// ============================================================================
// Status Icon Component
// ============================================================================

function StatusIcon({ status }: { status: DeliveryStatus | null }) {
  if (!status) {
    return <Clock size={16} className={styles.iconPending} />;
  }

  switch (status) {
    case 'pending':
    case 'queued':
      return <Clock size={16} className={styles.iconPending} />;
    case 'sent':
      return <Send size={16} className={styles.iconSent} />;
    case 'delivered':
      return <Check size={16} className={styles.iconDelivered} />;
    case 'opened':
      return <Eye size={16} className={styles.iconOpened} />;
    case 'bounced':
      return <AlertTriangle size={16} className={styles.iconBounced} />;
    case 'failed':
      return <XCircle size={16} className={styles.iconFailed} />;
    case 'cancelled':
      return <XCircle size={16} className={styles.iconCancelled} />;
    default:
      return <Mail size={16} />;
  }
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  stats: AgNotificationStats;
}

function ProgressBar({ stats }: ProgressBarProps) {
  const total = stats.total_count;
  if (total === 0) return null;

  const segments = [
    { count: stats.opened_count, color: DELIVERY_STATUS_COLORS.opened, label: 'Ouverts' },
    { count: stats.delivered_count - stats.opened_count, color: DELIVERY_STATUS_COLORS.delivered, label: 'Delivres' },
    { count: stats.sent_count - stats.delivered_count, color: DELIVERY_STATUS_COLORS.sent, label: 'Envoyes' },
    { count: stats.bounced_count, color: DELIVERY_STATUS_COLORS.bounced, label: 'Rejetes' },
    { count: stats.failed_count, color: DELIVERY_STATUS_COLORS.failed, label: 'Echecs' },
    { count: stats.pending_count, color: DELIVERY_STATUS_COLORS.pending, label: 'En attente' },
  ].filter(s => s.count > 0);

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={styles.progressSegment}
            style={{
              width: `${(segment.count / total) * 100}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>
      <div className={styles.progressLegend}>
        {segments.map((segment) => (
          <span key={segment.label} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: segment.color }}
            />
            {segment.count}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationStatusPanel({
  recipients,
  stats,
  isLoading,
  onRefresh,
  onSendRelance,
  relanceLoading,
}: NotificationStatusPanelProps) {
  const [selectedForRelance, setSelectedForRelance] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<DeliveryStatus | 'all' | 'no_email'>('all');

  // Filter recipients
  const filteredRecipients = recipients.filter(r => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'no_email') return !r.email;
    return r.latestStatus === filterStatus;
  });

  // Toggle selection for relance
  const toggleRelanceSelection = (id: string) => {
    setSelectedForRelance(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all for relance
  const selectAllForRelance = () => {
    const eligibleIds = filteredRecipients
      .filter(r => r.hasConvocation && r.email && !['opened', 'delivered'].includes(r.latestStatus || ''))
      .map(r => r.id);
    setSelectedForRelance(new Set(eligibleIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedForRelance(new Set());
  };

  // Handle send relance
  const handleSendRelance = () => {
    if (selectedForRelance.size > 0) {
      onSendRelance(Array.from(selectedForRelance));
      setSelectedForRelance(new Set());
    }
  };

  // Count by status
  const statusCounts = recipients.reduce((acc, r) => {
    const status = r.latestStatus || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const noEmailCount = recipients.filter(r => !r.email).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Mail size={20} />
          Suivi des envois
        </h3>
        <button
          onClick={onRefresh}
          className={styles.refreshButton}
          disabled={isLoading}
          title="Actualiser"
        >
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
        </button>
      </div>

      {/* Progress */}
      {stats && stats.total_count > 0 && (
        <div className={styles.statsSection}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.total_count}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValueSuccess}>{stats.sent_count}</span>
              <span className={styles.statLabel}>Envoyes</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValueSuccess}>{stats.delivered_count}</span>
              <span className={styles.statLabel}>Delivres</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValueWarning}>{stats.bounced_count + stats.failed_count}</span>
              <span className={styles.statLabel}>Echecs</span>
            </div>
          </div>
          <ProgressBar stats={stats} />
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <button
          onClick={() => setFilterStatus('all')}
          className={`${styles.filterBtn} ${filterStatus === 'all' ? styles.filterBtnActive : ''}`}
        >
          Tous ({recipients.length})
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as DeliveryStatus)}
            className={`${styles.filterBtn} ${filterStatus === status ? styles.filterBtnActive : ''}`}
          >
            <span
              className={styles.filterDot}
              style={{ backgroundColor: DELIVERY_STATUS_COLORS[status as DeliveryStatus] }}
            />
            {DELIVERY_STATUS_LABELS[status as DeliveryStatus]} ({count})
          </button>
        ))}
        {noEmailCount > 0 && (
          <button
            onClick={() => setFilterStatus('no_email')}
            className={`${styles.filterBtn} ${filterStatus === 'no_email' ? styles.filterBtnActive : ''}`}
          >
            Sans email ({noEmailCount})
          </button>
        )}
      </div>

      {/* Relance Actions */}
      {selectedForRelance.size > 0 && (
        <div className={styles.relanceBar}>
          <span>{selectedForRelance.size} selectionne(s) pour relance</span>
          <div className={styles.relanceActions}>
            <button onClick={clearSelection} className={styles.clearBtn}>
              Annuler
            </button>
            <button
              onClick={handleSendRelance}
              className={styles.relanceBtn}
              disabled={relanceLoading}
            >
              <Bell size={14} />
              {relanceLoading ? 'Envoi...' : 'Envoyer relance'}
            </button>
          </div>
        </div>
      )}

      {/* Recipients List */}
      <div className={styles.recipientsList}>
        {!isLoading && filteredRecipients.length === 0 && (
          <div className={styles.emptyState}>
            Aucun destinataire pour ce filtre
          </div>
        )}

        {isLoading && (
          <div className={styles.loadingState}>
            Chargement...
          </div>
        )}

        {!isLoading && filteredRecipients.map(recipient => (
          <div
            key={recipient.id}
            className={`${styles.recipientRow} ${selectedForRelance.has(recipient.id) ? styles.recipientRowSelected : ''}`}
          >
            {/* Checkbox for relance */}
            {recipient.hasConvocation && recipient.email && (
              <input
                type="checkbox"
                checked={selectedForRelance.has(recipient.id)}
                onChange={() => toggleRelanceSelection(recipient.id)}
                className={styles.checkbox}
              />
            )}

            {/* Recipient info */}
            <div className={styles.recipientInfo}>
              <span className={styles.recipientName}>
                {recipient.prenom} {recipient.nom}
              </span>
              <span className={styles.recipientMeta}>
                Lot {recipient.lot} - {recipient.tantiemes} tantiemes
              </span>
              {recipient.email && (
                <span className={styles.recipientEmail}>{recipient.email}</span>
              )}
            </div>

            {/* Status badge */}
            <div className={styles.statusBadgeContainer}>
              {!recipient.email ? (
                <span className={styles.noEmailBadge}>
                  <AlertTriangle size={14} />
                  Pas d'email
                </span>
              ) : !recipient.hasConvocation ? (
                <span className={styles.notSentBadge}>
                  <Clock size={14} />
                  Non envoye
                </span>
              ) : (
                <span
                  className={styles.statusBadge}
                  style={{
                    backgroundColor: DELIVERY_STATUS_COLORS[recipient.latestStatus || 'pending'],
                  }}
                >
                  <StatusIcon status={recipient.latestStatus} />
                  {DELIVERY_STATUS_LABELS[recipient.latestStatus || 'pending']}
                </span>
              )}

              {recipient.hasRelance && (
                <span className={styles.relanceBadge}>
                  <Bell size={12} />
                  Relance
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {filteredRecipients.some(r => r.hasConvocation && r.email) && (
        <div className={styles.quickActions}>
          <button onClick={selectAllForRelance} className={styles.quickActionBtn}>
            <CheckCheck size={14} />
            Selectionner pour relance
          </button>
        </div>
      )}
    </div>
  );
}
