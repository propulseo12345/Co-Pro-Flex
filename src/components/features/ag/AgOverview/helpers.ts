import type { AgStatus, AgMeetingType } from '@/lib/ag/types';

/**
 * Maps backend meeting_type to display label
 */
export function getTypeLabel(type: AgMeetingType): string {
  switch (type) {
    case 'ordinary':
      return 'Ordinaire';
    case 'extraordinary':
      return 'Extraordinaire';
    case 'special':
      return 'Mixte';
    default:
      return type;
  }
}

/**
 * Maps backend status to display badge configuration
 */
export function getStatusBadge(
  status: AgStatus,
  styles: Record<string, string>
): { label: string; className: string } {
  switch (status) {
    case 'draft':
      return { label: 'Brouillon', className: styles.planifiee };
    case 'convoked':
      return { label: 'Convoquée', className: styles.convoquee };
    case 'in_progress':
      return { label: 'En cours', className: styles.ready };
    case 'closed':
      return { label: 'Clôturée', className: styles.closed };
    case 'pv_generated':
      return { label: 'PV généré', className: styles.closed };
    default:
      return { label: status, className: '' };
  }
}
