// ============================================================================
// Types pour AG Notifications - NIVEAU 5A
// CoProFlex
// ============================================================================

export type NotificationType = 'convocation' | 'relance' | 'pv' | 'reminder';
export type DeliveryStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed' | 'cancelled';
export type NotificationChannel = 'email' | 'registered_email' | 'postal' | 'registered_postal' | 'hand_delivery';

export interface AgNotification {
  id: string;
  copro_id: string;
  ag_id: string;
  coproprietaire_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  status: DeliveryStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  provider_message_id: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  coproprietaire?: {
    id: string;
    civilite: string | null;
    nom: string;
    prenom: string | null;
    email: string | null;
  };
}

export interface AgNotificationEvent {
  id: string;
  notification_id: string;
  event_type: string;
  event_timestamp: string;
  raw_data: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AgNotificationStats {
  ag_id: string;
  notification_type: NotificationType;
  total_count: number;
  pending_count: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  bounced_count: number;
  failed_count: number;
}

export interface SendConvocationsRequest {
  ag_id: string;
  send_to: 'all' | 'missing_only' | 'selected';
  coproprietaire_ids?: string[];
  dry_run?: boolean;
}

export interface SendConvocationsResponse {
  success: boolean;
  error?: string;
  dry_run?: boolean;
  validation?: {
    convocation_date: string;
    meeting_date: string;
    days_until_meeting: number;
    minimum_delay: number;
    is_valid: boolean;
    warning?: string;
  };
  summary?: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  details?: {
    coproprietaire_id: string;
    name: string;
    email: string;
    status: 'sent' | 'failed' | 'skipped';
    notification_id?: string;
    error?: string;
  }[];
}

export interface SendRelanceRequest {
  ag_id: string;
  coproprietaire_ids: string[];
  message_personnalise?: string;
}

export interface SendRelanceResponse {
  success: boolean;
  error?: string;
  summary?: {
    total: number;
    sent: number;
    failed: number;
  };
  details?: {
    coproprietaire_id: string;
    name: string;
    email: string;
    status: 'sent' | 'failed';
    notification_id?: string;
    error?: string;
  }[];
}

export interface RecipientWithStatus {
  id: string;
  civilite: string | null;
  nom: string;
  prenom: string | null;
  email: string | null;
  lot: string;
  tantiemes: number;
  notification?: AgNotification;
  hasConvocation: boolean;
  hasRelance: boolean;
  latestStatus: DeliveryStatus | null;
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'En attente',
  queued: 'En file d\'attente',
  sent: 'Envoy\u00e9',
  delivered: 'D\u00e9livr\u00e9',
  opened: 'Ouvert',
  bounced: 'Rejet\u00e9',
  failed: '\u00c9chec',
  cancelled: 'Annul\u00e9',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: '#6b7280',    // gray
  queued: '#3b82f6',     // blue
  sent: '#8b5cf6',       // purple
  delivered: '#22c55e',  // green
  opened: '#10b981',     // emerald
  bounced: '#f59e0b',    // amber
  failed: '#ef4444',     // red
  cancelled: '#9ca3af',  // gray-400
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  convocation: 'Convocation',
  relance: 'Relance',
  pv: 'Proc\u00e8s-verbal',
  reminder: 'Rappel',
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  registered_email: 'Avis \u00e9lectronique',
  postal: 'Courrier simple',
  registered_postal: 'Recommand\u00e9',
  hand_delivery: 'Remise en main propre',
};
