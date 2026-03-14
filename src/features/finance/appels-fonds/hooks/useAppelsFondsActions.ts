'use client';

import { useCallback, useState } from 'react';
import { useCreateCall } from '@/hooks/modules/useFinanceData';
import { updateCallStatus } from '@/lib/finance/api';
import type { CreateCallPayload } from '@/lib/finance/api';

export function useAppelsFondsActions() {
  const { mutate: createCall, isLoading: createLoading } = useCreateCall();
  const [emitLoading, setEmitLoading] = useState(false);
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

  const cancelCall = useCallback(async (callId: string) => {
    setEmitLoading(true);
    setError(null);
    try {
      const result = await updateCallStatus(callId, 'cancelled');
      if (!result.data?.success) {
        setError(result.error ?? "Erreur lors de l'annulation");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setEmitLoading(false);
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
    isLoading: createLoading || emitLoading,
    error,
  };
}
