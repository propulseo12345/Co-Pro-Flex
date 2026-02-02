import styles from '@/app/(dashboard)/finance/unpaid/reminders/reminders.module.css';

/**
 * Get the relance type based on days overdue
 */
export function getRelanceType(daysOverdue: number): string {
    if (daysOverdue > 90) return 'Contentieux';
    if (daysOverdue > 60) return 'Mise en demeure (60j)';
    if (daysOverdue > 30) return '2e relance (30j)';
    return '1re relance (7j)';
}

/**
 * Get the badge class for relance type
 */
export function getRelanceBadgeClass(daysOverdue: number): string {
    return daysOverdue > 60 ? 'badge-error' : 'badge-warning';
}

/**
 * Get the status badge class
 */
export function getStatusBadgeClass(status: string): string {
    switch (status) {
        case 'sent':
            return styles.statusSent;
        case 'failed':
            return styles.statusFailed;
        case 'pending':
            return styles.statusPending;
        case 'stale':
        case 'skipped':
            return styles.statusStale;
        default:
            return '';
    }
}

/**
 * Get the status label in French
 */
export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        sent: 'Envoyee',
        failed: 'Echec',
        pending: 'En attente',
        stale: 'Annulee (paye)',
        skipped: 'Ignoree',
    };
    return labels[status] || status;
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
