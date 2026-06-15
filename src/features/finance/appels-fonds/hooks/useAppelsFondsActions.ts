'use client';

import { useCallback, useState } from 'react';
import { useCreateCall } from '@/hooks/modules/useFinanceData';
import { updateCallStatus, cancelCallForFunds } from '@/lib/finance/api';
import type { CreateCallPayload } from '@/lib/finance/api';

type CallStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';

export function useAppelsFondsActions() {
  const { mutate: createCall, isLoading: createLoading } = useCreateCall();
  const [emitLoading, setEmitLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emitCall = useCallback(async (callId: string) => {
    setEmitLoading(true);
    setError(null);
    try {
      const result = await updateCallStatus(callId, 'issued');
      if (!result.data?.success) {
        setError(result.error ?? "Erreur lors de l'émission");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setEmitLoading(false);
    }
  }, []);

  // Annulation : un appel encore en BROUILLON n'a pas d'écriture -> simple bascule de statut. Un appel
  // ÉMIS porte une écriture immuable -> on passe par cancel_call_for_funds qui la CONTRE-PASSE (refus
  // strict si des paiements sont imputés). Sans ce branchement, annuler un appel posté laisserait son
  // écriture orpheline dans le grand livre (écart relevé/GL).
  const cancelCall = useCallback(async (callId: string, status: CallStatus, reason = 'Annulation appel de fonds') => {
    setCancelLoading(true);
    setError(null);
    try {
      const result =
        status === 'draft'
          ? await updateCallStatus(callId, 'cancelled')
          : await cancelCallForFunds(callId, reason);
      if (result.error) {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setCancelLoading(false);
    }
  }, []);

  // useCreateCall.mutate expects Omit<CreateCallPayload, 'copro_id'>
  // (copro_id is injected from context inside the hook)
  const generateCalls = useCallback(async (payload: Omit<CreateCallPayload, 'copro_id'>) => {
    setError(null);
    try {
      const result = await createCall(payload);
      if (result?.error) {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur génération');
    }
  }, [createCall]);

  return {
    emitCall,
    cancelCall,
    generateCalls,
    isLoading: createLoading || emitLoading || cancelLoading,
    error,
  };
}
