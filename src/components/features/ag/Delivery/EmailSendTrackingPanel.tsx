'use client';

import { Send, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { EmailSendStatus } from '@/types/enums';
import type { OwnerDeliveryStatus, DeliveryStats } from '@/hooks/modules/useDeliveryConfig';
import styles from './EmailSendTrackingPanel.module.css';

interface EmailSendTrackingPanelProps {
  emailRecipients: OwnerDeliveryStatus[];
  stats: DeliveryStats;
  onSendEmail: (ownerId: string) => void;
  onSendAllEmails: () => void;
}

const STATUS_CONFIG: Record<EmailSendStatus, { icon: typeof CheckCircle; label: string; className: string }> = {
  [EmailSendStatus.A_ENVOYER]: {
    icon: Clock,
    label: 'À envoyer',
    className: 'statusPending',
  },
  [EmailSendStatus.ENVOYE]: {
    icon: CheckCircle,
    label: 'Envoyé',
    className: 'statusSent',
  },
  [EmailSendStatus.ECHEC]: {
    icon: XCircle,
    label: 'Échec',
    className: 'statusFailed',
  },
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EmailSendTrackingPanel({
  emailRecipients,
  stats,
  onSendEmail,
  onSendAllEmails,
}: EmailSendTrackingPanelProps) {
  const validRecipients = emailRecipients.filter((r) => r.hasEmail);
  const pendingCount = validRecipients.filter(
    (r) => r.emailStatus?.status === EmailSendStatus.A_ENVOYER
  ).length;

  if (validRecipients.length === 0) {
    return (
      <div className={styles.emptyState}>
        <AlertCircle size={48} aria-hidden="true" />
        <h3>Aucun destinataire email</h3>
        <p>Aucun copropriétaire n&apos;est configuré pour recevoir par email.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>
            <Send size={20} aria-hidden="true" />
            Suivi des envois email
          </h2>
          <p className={styles.subtitle}>
            {validRecipients.length} destinataire(s) • {pendingCount} en attente
          </p>
        </div>

        <button
          type="button"
          onClick={onSendAllEmails}
          disabled={pendingCount === 0}
          className={styles.sendAllBtn}
        >
          <Send size={16} aria-hidden="true" />
          <span>Envoyer tous les emails ({pendingCount})</span>
        </button>
      </div>

      <div className={styles.statsBar}>
        <div className={`${styles.statChip} ${styles.statChipPending}`}>
          <Clock size={14} aria-hidden="true" />
          <span>{pendingCount} à envoyer</span>
        </div>
        <div className={`${styles.statChip} ${styles.statChipSent}`}>
          <CheckCircle size={14} aria-hidden="true" />
          <span>{stats.emailsSent} envoyé(s)</span>
        </div>
        {stats.emailsFailed > 0 && (
          <div className={`${styles.statChip} ${styles.statChipFailed}`}>
            <XCircle size={14} aria-hidden="true" />
            <span>{stats.emailsFailed} échec(s)</span>
          </div>
        )}
      </div>

      <div className={styles.recipientsList}>
        {validRecipients.map((recipient) => {
          const status = recipient.emailStatus?.status || EmailSendStatus.A_ENVOYER;
          const config = STATUS_CONFIG[status];
          const StatusIcon = config.icon;

          return (
            <div key={recipient.id} className={styles.recipientCard}>
              <div className={styles.recipientInfo}>
                <span className={styles.recipientName}>{recipient.nom}</span>
                <span className={styles.recipientEmail}>{recipient.email}</span>
              </div>

              <div className={styles.recipientStatus}>
                <span className={`${styles.statusBadge} ${styles[config.className]}`}>
                  <StatusIcon size={14} aria-hidden="true" />
                  <span>{config.label}</span>
                </span>

                {recipient.emailStatus?.sentAt && (
                  <span className={styles.sentDate}>
                    {formatDate(recipient.emailStatus.sentAt)}
                  </span>
                )}

                {recipient.emailStatus?.error && (
                  <span className={styles.errorText} title={recipient.emailStatus.error}>
                    {recipient.emailStatus.error}
                  </span>
                )}
              </div>

              <div className={styles.recipientActions}>
                {status === EmailSendStatus.A_ENVOYER && (
                  <button
                    type="button"
                    onClick={() => onSendEmail(recipient.id)}
                    className={styles.sendBtn}
                    title="Envoyer maintenant"
                  >
                    <Send size={16} aria-hidden="true" />
                  </button>
                )}
                {status === EmailSendStatus.ECHEC && (
                  <button
                    type="button"
                    onClick={() => onSendEmail(recipient.id)}
                    className={styles.retryBtn}
                    title="Réessayer"
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.mockNotice}>
        <AlertCircle size={14} aria-hidden="true" />
        <span>Mode simulation - Les emails ne sont pas réellement envoyés</span>
      </div>
    </div>
  );
}
