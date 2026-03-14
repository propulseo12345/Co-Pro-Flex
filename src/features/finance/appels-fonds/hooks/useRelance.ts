'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import * as financeApi from '@/lib/finance/api';
import type { CallLineDetailed, CallForFundsOverview, PaymentReminder } from '@/lib/finance/api';
import { RELANCE_PHASES, generateRelanceContent, type RelancePhaseConfig } from '../services/relance-templates';
import { formatEuros } from '../utils';

export interface PhaseStatus {
  phase: number;
  label: string;
  type: string;
  defaultChannel: 'email' | 'courrier' | 'both';
  delayDays: number;
  status: 'sent' | 'active' | 'locked';
  sentAt?: string;
  sentChannel?: string;
}

export interface UseRelanceReturn {
  phases: PhaseStatus[];
  currentPhase: RelancePhaseConfig | null;
  previewContent: string;
  setPreviewContent: (content: string) => void;
  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
  sendReminder: () => Promise<void>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  allPhasesSent: boolean;
}

export function useRelance(
  line: CallLineDetailed | null,
  call: CallForFundsOverview | null,
  coproName: string,
  syndicName: string,
): UseRelanceReturn {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('email');

  // Charger l'historique des relances pour ce lot
  useEffect(() => {
    if (!line || !call) return;
    setIsLoading(true);
    financeApi.listPaymentReminders(call.copro_id, { lot_id: line.lot_id })
      .then(result => {
        if (result.data) {
          // Filtrer les relances sent pour ce call
          setReminders(result.data.filter(r => r.status === 'sent'));
        }
        setIsLoading(false);
      });
  }, [line, call]);

  // Construire le statut des phases
  const phases: PhaseStatus[] = useMemo(() => {
    const sentLevels = new Set(reminders.map(r => r.delay_level));

    return RELANCE_PHASES.map((phase, i) => {
      const sentReminder = reminders.find(r => r.delay_level === phase.delayDays);
      if (sentReminder) {
        return {
          phase: phase.phase,
          label: phase.label,
          type: phase.type,
          defaultChannel: phase.defaultChannel,
          delayDays: phase.delayDays,
          status: 'sent' as const,
          sentAt: sentReminder.sent_at ?? undefined,
          sentChannel: sentReminder.channel ?? undefined,
        };
      }
      // Phase active = premiere phase non envoyee dont toutes les precedentes sont envoyees
      const allPreviousSent = RELANCE_PHASES.slice(0, i).every(p => sentLevels.has(p.delayDays));
      return {
        phase: phase.phase,
        label: phase.label,
        type: phase.type,
        defaultChannel: phase.defaultChannel,
        delayDays: phase.delayDays,
        status: allPreviousSent ? 'active' as const : 'locked' as const,
      };
    });
  }, [reminders]);

  const currentPhase = useMemo(() => {
    const activePhase = phases.find(p => p.status === 'active');
    if (!activePhase) return null;
    return RELANCE_PHASES.find(p => p.phase === activePhase.phase) ?? null;
  }, [phases]);

  const allPhasesSent = phases.every(p => p.status === 'sent');

  // Generer le contenu de preview quand la phase change
  useEffect(() => {
    if (!currentPhase || !line || !call) return;
    const content = generateRelanceContent(currentPhase, {
      coproprietaire: line.owner_name ?? 'Coproprietaire',
      lot: line.lot_ref,
      montant: formatEuros(line.amount_due),
      echeance: new Date(call.due_date).toLocaleDateString('fr-FR'),
      appel: call.label,
      copropriete: coproName,
      syndic: syndicName,
      date: new Date().toLocaleDateString('fr-FR'),
      joursRetard: Math.max(0, Math.floor((Date.now() - new Date(call.due_date).getTime()) / 86400000)),
    });
    setPreviewContent(content);
    setSelectedChannel(currentPhase.defaultChannel);
  }, [currentPhase, line, call, coproName, syndicName]);

  // Envoyer la relance
  const sendReminder = useCallback(async () => {
    if (!currentPhase || !line || !call) return;
    setIsSending(true);
    setError(null);
    try {
      const result = await financeApi.createManualReminder({
        copro_id: call.copro_id,
        lot_id: line.lot_id,
        call_id: call.id,
        call_line_id: line.id,
        delay_level: currentPhase.delayDays,
        unpaid_amount: line.amount_due - line.amount_paid,
        oldest_due_date: call.due_date,
        days_overdue: Math.max(0, Math.floor((Date.now() - new Date(call.due_date).getTime()) / 86400000)),
        recipient_email: null, // TODO: charger depuis coproprietaire
        recipient_name: line.owner_name,
        channel: selectedChannel,
        content: previewContent,
      });
      if (result.error) {
        setError(result.error);
      } else {
        // Recharger l'historique
        const refreshed = await financeApi.listPaymentReminders(call.copro_id, { lot_id: line.lot_id });
        if (refreshed.data) setReminders(refreshed.data.filter(r => r.status === 'sent'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsSending(false);
    }
  }, [currentPhase, line, call, selectedChannel, previewContent]);

  return {
    phases, currentPhase, previewContent, setPreviewContent,
    selectedChannel, setSelectedChannel, sendReminder,
    isLoading, isSending, error, allPhasesSent,
  };
}
