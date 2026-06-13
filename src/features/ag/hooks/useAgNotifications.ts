'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import type {
  AgNotification,
  AgNotificationStats,
  SendConvocationsRequest,
  SendConvocationsResponse,
  SendRelanceRequest,
  SendRelanceResponse,
  RecipientWithStatus,
} from '../types/notifications';

// ============================================================================
// Types
// ============================================================================

interface UseAgNotificationsParams {
  agId: string;
  coproId?: string;
}

interface UseAgNotificationsReturn {
  // Data
  notifications: AgNotification[];
  stats: AgNotificationStats | null;
  recipients: RecipientWithStatus[];
  isLoading: boolean;
  error: string | null;

  // Computed
  convocationsSent: boolean;
  missingConvocations: RecipientWithStatus[];
  deliveryProgress: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    percentage: number;
  };

  // Actions
  sendConvocations: (request: Omit<SendConvocationsRequest, 'ag_id'>) => Promise<SendConvocationsResponse>;
  sendRelances: (request: Omit<SendRelanceRequest, 'ag_id'>) => Promise<SendRelanceResponse>;
  refreshNotifications: () => Promise<void>;
  validateConvocationDelay: () => Promise<{ valid: boolean; daysRemaining: number; message: string }>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAgNotifications({ agId }: UseAgNotificationsParams): UseAgNotificationsReturn {
  const { supabase } = useSupabase();

  const [notifications, setNotifications] = useState<AgNotification[]>([]);
  const [stats, setStats] = useState<AgNotificationStats | null>(null);
  const [recipients, setRecipients] = useState<RecipientWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch notifications
  // -------------------------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    if (!agId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch notifications with coproprietaire info
      const { data: notifData, error: notifError } = await supabase
        .from('ag_notifications')
        .select(`
          *,
          coproprietaire:coproprietaires(id, civilite, nom, prenom, email)
        `)
        .eq('ag_id', agId)
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;
      setNotifications(notifData || []);

      // Fetch stats
      const { data: statsData } = await supabase
        .from('v_ag_notification_stats')
        .select('*')
        .eq('ag_id', agId)
        .eq('notification_type', 'convocation')
        .single();

      setStats(statsData);

      // Fetch all recipients (coproprietaires) with their notification status
      const { data: recipientsData, error: recipientsError } = await supabase
        .rpc('get_ag_recipients', { p_ag_id: agId });

      if (recipientsError) throw recipientsError;

      // Map recipients with their notification status
      const recipientsWithStatus: RecipientWithStatus[] = (recipientsData || []).map((r: {
        id: string;
        civilite: string | null;
        nom: string;
        prenom: string | null;
        email: string | null;
        lot_principal: string;
        total_tantiemes: number;
      }) => {
        const convocationNotif = notifData?.find(
          n => n.coproprietaire_id === r.id && n.notification_type === 'convocation'
        );
        const relanceNotif = notifData?.find(
          n => n.coproprietaire_id === r.id && n.notification_type === 'relance'
        );

        return {
          id: r.id,
          civilite: r.civilite,
          nom: r.nom,
          prenom: r.prenom,
          email: r.email,
          lot: r.lot_principal || '-',
          tantiemes: r.total_tantiemes || 0,
          notification: convocationNotif,
          hasConvocation: !!convocationNotif,
          hasRelance: !!relanceNotif,
          latestStatus: convocationNotif?.status || null,
        };
      });

      setRecipients(recipientsWithStatus);

    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [agId, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // -------------------------------------------------------------------------
  // Real-time subscription
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!agId) return;

    const channel = supabase
      .channel(`ag_notifications:${agId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ag_notifications',
          filter: `ag_id=eq.${agId}`,
        },
        () => {
          // Refresh on any change
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agId, supabase, fetchNotifications]);

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------
  const convocationsSent = useMemo(() => {
    return notifications.some(n => n.notification_type === 'convocation' && n.status !== 'pending');
  }, [notifications]);

  const missingConvocations = useMemo(() => {
    return recipients.filter(r => !r.hasConvocation && r.email);
  }, [recipients]);

  const deliveryProgress = useMemo(() => {
    const convocations = notifications.filter(n => n.notification_type === 'convocation');
    const total = convocations.length;
    const sent = convocations.filter(n => ['sent', 'delivered', 'opened'].includes(n.status)).length;
    const delivered = convocations.filter(n => ['delivered', 'opened'].includes(n.status)).length;
    const failed = convocations.filter(n => ['bounced', 'failed'].includes(n.status)).length;

    return {
      total,
      sent,
      delivered,
      failed,
      percentage: total > 0 ? Math.round((sent / total) * 100) : 0,
    };
  }, [notifications]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const sendConvocations = useCallback(async (
    request: Omit<SendConvocationsRequest, 'ag_id'>
  ): Promise<SendConvocationsResponse> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ag_send_convocations', {
        body: { ag_id: agId, ...request },
      });

      if (invokeError) {
        return { success: false, error: invokeError.message };
      }

      // Refresh notifications after sending
      await fetchNotifications();

      return data as SendConvocationsResponse;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur lors de l\'envoi',
      };
    }
  }, [agId, supabase, fetchNotifications]);

  const sendRelances = useCallback(async (
    request: Omit<SendRelanceRequest, 'ag_id'>
  ): Promise<SendRelanceResponse> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ag_send_relance', {
        body: { ag_id: agId, ...request },
      });

      if (invokeError) {
        return { success: false, error: invokeError.message };
      }

      // Refresh notifications after sending
      await fetchNotifications();

      return data as SendRelanceResponse;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur lors de l\'envoi des relances',
      };
    }
  }, [agId, supabase, fetchNotifications]);

  const validateConvocationDelay = useCallback(async (): Promise<{
    valid: boolean;
    daysRemaining: number;
    message: string;
  }> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('check_convocation_delay', { p_ag_id: agId });

      if (rpcError) throw rpcError;

      const { is_valid, days_remaining, minimum_delay } = data;

      if (is_valid) {
        return {
          valid: true,
          daysRemaining: days_remaining,
          message: `D\u00e9lai conforme (${days_remaining} jours avant l'AG)`,
        };
      } else {
        return {
          valid: false,
          daysRemaining: days_remaining,
          message: `Attention: D\u00e9lai insuffisant! L'AG est dans ${days_remaining} jours, le minimum l\u00e9gal est de ${minimum_delay} jours (Art. 64 d\u00e9cret 67-223)`,
        };
      }
    } catch (err) {
      return {
        valid: false,
        daysRemaining: 0,
        message: err instanceof Error ? err.message : 'Erreur de validation',
      };
    }
  }, [agId, supabase]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    notifications,
    stats,
    recipients,
    isLoading,
    error,
    convocationsSent,
    missingConvocations,
    deliveryProgress,
    sendConvocations,
    sendRelances,
    refreshNotifications,
    validateConvocationDelay,
  };
}
