/**
 * Hook pour gérer les drafts de convocation (ag_session_drafts)
 */

import { useState, useCallback } from 'react';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';
import type { SendingChoice, CoproprietaireEditable } from '../types';

export interface UseConvocationDraftResult {
  sendingChoices: SendingChoice[];
  isSaving: boolean;
}

export interface UseConvocationDraftReturn extends UseConvocationDraftResult {
  loadSendingChoices: (agId: string, coproprietaires: CoproprietaireEditable[]) => Promise<SendingChoice[]>;
  saveSendingChoices: (agId: string, choices: SendingChoice[]) => Promise<void>;
  saveCoproprietaires: (agId: string, copros: CoproprietaireEditable[]) => Promise<void>;
  setSendingChoices: (choices: SendingChoice[]) => void;
}

export function useConvocationDraft(): UseConvocationDraftReturn {
  const [sendingChoices, setSendingChoicesState] = useState<SendingChoice[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadSendingChoices = useCallback(
    async (agId: string, coproprietaires: CoproprietaireEditable[]): Promise<SendingChoice[]> => {
      if (!isValidUUID(agId)) {
        const defaultChoices = coproprietaires.map((copro) => ({
          coproprietaireId: copro.id,
          methods: [] as SendingChoice['methods'],
        }));
        setSendingChoicesState(defaultChoices);
        return defaultChoices;
      }

      try {
        const { data: savedChoices } = await loadDraft<SendingChoice[]>(agId, 'session', `ag-sending-${agId}`);

        if (savedChoices && Array.isArray(savedChoices)) {
          setSendingChoicesState(savedChoices);
          return savedChoices;
        }
      } catch {
        // Fallback to default
      }

      const defaultChoices = coproprietaires.map((copro) => ({
        coproprietaireId: copro.id,
        methods: [] as SendingChoice['methods'],
      }));

      setSendingChoicesState(defaultChoices);
      return defaultChoices;
    },
    []
  );

  const saveSendingChoices = useCallback(async (agId: string, choices: SendingChoice[]) => {
    if (!isValidUUID(agId)) return;

    setIsSaving(true);
    try {
      await saveDraft(agId, 'session', choices, `ag-sending-${agId}`);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const saveCoproprietaires = useCallback(async (agId: string, copros: CoproprietaireEditable[]) => {
    if (!isValidUUID(agId)) return;

    setIsSaving(true);
    try {
      await saveDraft(agId, 'session', copros, `ag-coproprietaires-temp-${agId}`);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const setSendingChoices = useCallback((choices: SendingChoice[]) => {
    setSendingChoicesState(choices);
  }, []);

  return {
    sendingChoices,
    isSaving,
    loadSendingChoices,
    saveSendingChoices,
    saveCoproprietaires,
    setSendingChoices,
  };
}
