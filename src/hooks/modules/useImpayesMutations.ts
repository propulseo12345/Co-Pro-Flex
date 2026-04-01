'use client';

/**
 * Impayés Mutations Hook
 * CRUD operations for payment reminders
 */

import { useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as impayesApi from '@/lib/impayes/api';
import type { CreateReminderInput } from '@/lib/impayes/api';

// ============================================================================
// Types
// ============================================================================

export interface UseImpayesMutationsOptions {
  onSuccess?: () => void;
}

export interface UseImpayesMutationsResult {
  isSaving: boolean;
  error: string | null;
  createReminder: (input: Omit<CreateReminderInput, 'copro_id'>) => Promise<string | null>;
  markReminderSent: (reminderId: string, providerMessageId?: string) => Promise<boolean>;
  cancelReminder: (reminderId: string, reason: string) => Promise<boolean>;
}

// ============================================================================
// Hook
// ============================================================================

export function useImpayesMutations(
  options: UseImpayesMutationsOptions = {}
): UseImpayesMutationsResult {
  const { currentCoproId } = useCopro();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withSaving = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      if (!currentCoproId) {
        setError('Aucune copropriété sélectionnée');
        return null;
      }

      setIsSaving(true);
      setError(null);

      try {
        const result = await fn();
        options.onSuccess?.();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de l\'opération';
        setError(message);
        console.error('useImpayesMutations error:', err);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [currentCoproId, options]
  );

  const createReminder = useCallback(
    async (input: Omit<CreateReminderInput, 'copro_id'>): Promise<string | null> => {
      return withSaving(async () => {
        return impayesApi.createPaymentReminder({
          ...input,
          copro_id: currentCoproId!,
        });
      });
    },
    [currentCoproId, withSaving]
  );

  const markReminderSent = useCallback(
    async (reminderId: string, providerMessageId?: string): Promise<boolean> => {
      const result = await withSaving(async () => {
        await impayesApi.markReminderSent(reminderId, providerMessageId);
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  const cancelReminder = useCallback(
    async (reminderId: string, reason: string): Promise<boolean> => {
      const result = await withSaving(async () => {
        await impayesApi.cancelReminder(reminderId, reason);
        return true;
      });
      return result === true;
    },
    [withSaving]
  );

  return {
    isSaving,
    error,
    createReminder,
    markReminderSent,
    cancelReminder,
  };
}
