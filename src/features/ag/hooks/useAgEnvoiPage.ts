'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import type { SendingMethod, SendingChoice } from '../types';
import { loadDraft, saveDraft } from '@/lib/ag/draft-persistence';

const SENDING_COSTS: Record<SendingMethod, number> = {
  RECOMMANDE: 6.50,
  LETTRE_SIMPLE: 1.50,
  AVIS_ELECTRONIQUE: 3.20,
  EMAIL: 0.00,
  REMISE_MAIN_PROPRE: 0.00
};

export const SENDING_METHODS: { value: SendingMethod; label: string }[] = [
  { value: 'RECOMMANDE', label: 'Recommandé' },
  { value: 'LETTRE_SIMPLE', label: 'Lettre simple' },
  { value: 'AVIS_ELECTRONIQUE', label: 'Avis électronique' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'REMISE_MAIN_PROPRE', label: 'Remise en main propre / Autre' }
];

interface UseAgEnvoiPageParams {
  agId: string;
}

export function useAgEnvoiPage({ agId }: UseAgEnvoiPageParams) {
  const router = useRouter();

  const [sendingChoices, setSendingChoices] = useState<SendingChoice[]>([]);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const defaultChoices = MOCK_COPROPRIETAIRES.map(copro => ({
        coproprietaireId: copro.id,
        methods: [] as SendingMethod[]
      }));
      setSendingChoices(defaultChoices);

      // Load sent status from Supabase/localStorage
      const { data: sentStatus } = await loadDraft<{ sent: boolean }>(agId, 'milestones', 'ag-sent-' + agId);
      if (sentStatus?.sent) setIsSent(true);
    };
    loadData();
  }, [agId]);

  const toggleMethod = useCallback((coproId: string, method: SendingMethod) => {
    setSendingChoices(prev =>
      prev.map(choice => {
        if (choice.coproprietaireId === coproId) {
          const hasMethod = choice.methods.includes(method);
          return {
            ...choice,
            methods: hasMethod
              ? choice.methods.filter(m => m !== method)
              : [...choice.methods, method]
          };
        }
        return choice;
      })
    );
  }, []);

  const selectAllForMethod = useCallback((method: SendingMethod) => {
    setSendingChoices(prev =>
      prev.map(choice => {
        const hasMethod = choice.methods.includes(method);
        return hasMethod
          ? { ...choice, methods: choice.methods.filter(m => m !== method) }
          : { ...choice, methods: [...choice.methods, method] };
      })
    );
  }, []);

  const totalCost = useMemo(() => {
    return sendingChoices.reduce((total, choice) => {
      const choiceCost = choice.methods.reduce((sum, method) => sum + SENDING_COSTS[method], 0);
      return total + choiceCost;
    }, 0);
  }, [sendingChoices]);

  const stats = useMemo(() => {
    const result: Record<SendingMethod, number> = {
      RECOMMANDE: 0,
      LETTRE_SIMPLE: 0,
      AVIS_ELECTRONIQUE: 0,
      EMAIL: 0,
      REMISE_MAIN_PROPRE: 0
    };
    sendingChoices.forEach(choice => {
      choice.methods.forEach(method => { result[method]++; });
    });
    return result;
  }, [sendingChoices]);

  const selectedMethods = useMemo((): SendingMethod[] => {
    const allMethods = new Set<SendingMethod>();
    sendingChoices.forEach(choice => {
      choice.methods.forEach(method => allMethods.add(method));
    });
    return Array.from(allMethods);
  }, [sendingChoices]);

  const handleSend = useCallback(async () => {
    const hasEmptyChoices = sendingChoices.some(choice => choice.methods.length === 0);
    if (hasEmptyChoices) {
      alert('Veuillez sélectionner au moins une méthode d\'envoi pour chaque copropriétaire.');
      return;
    }
    await saveDraft(agId, 'session', { sendingChoices }, 'ag-sending-' + agId);
    await saveDraft(agId, 'milestones', { sent: true }, 'ag-sent-' + agId);
    setIsSent(true);
    alert('Convocations envoyées avec succès !');
  }, [sendingChoices, agId]);

  const handleContinue = useCallback(() => {
    router.push(`/ag/${agId}/preparation`);
  }, [router, agId]);

  const goBack = useCallback(() => {
    router.push(`/ag/${agId}/convocation`);
  }, [router, agId]);

  return {
    sendingChoices,
    isSent,
    totalCost,
    stats,
    selectedMethods,
    SENDING_COSTS,
    coproprietaires: MOCK_COPROPRIETAIRES,
    toggleMethod,
    selectAllForMethod,
    handleSend,
    handleContinue,
    goBack,
  };
}
