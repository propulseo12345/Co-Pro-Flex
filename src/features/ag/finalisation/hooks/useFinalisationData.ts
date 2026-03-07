'use client';

import { useState, useEffect } from 'react';
import { createUntypedClient } from '@/lib/ag/api/utils';

interface BudgetPosteRaw {
  id: string;
  poste: string;
  montant: number;
}

interface FinalisationData {
  budgetPostes: BudgetPosteRaw[];
  budgetExercice: number;
  montantALUR: number;
  modalitesALUR: string;
}

export function useFinalisationData(agId: string): {
  data: FinalisationData | null;
  isLoading: boolean;
} {
  const [data, setData] = useState<FinalisationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createUntypedClient();

      // 1. Lire opening_notes (postes budget)
      const { data: meeting } = await supabase
        .from('ag_meetings')
        .select('opening_notes')
        .eq('id', agId)
        .single();

      let budgetPostes: BudgetPosteRaw[] = [];
      let budgetExercice = new Date().getFullYear() + 1;
      if (meeting?.opening_notes) {
        try {
          const meta = typeof meeting.opening_notes === 'string'
            ? JSON.parse(meeting.opening_notes)
            : meeting.opening_notes;
          budgetPostes = meta.budgetPostes || [];
          budgetExercice = parseInt(meta.budgetExercice) || budgetExercice;
        } catch { /* ignore */ }
      }

      // 2. Lire draft variables session (montant ALUR)
      const { data: drafts } = await supabase
        .from('ag_session_drafts')
        .select('draft_data')
        .eq('ag_id', agId)
        .eq('draft_type', 'variables')
        .order('updated_at', { ascending: false })
        .limit(1);

      let montantALUR = 0;
      let modalitesALUR = 'UNIQUE';
      if (drafts && drafts.length > 0) {
        const vars = (drafts[0].draft_data as Record<string, string>) || {};
        montantALUR = parseFloat(vars['montant_fonds_travaux'] || '0') || 0;
        modalitesALUR = vars['modalites_paiement_fonds'] || 'UNIQUE';
      }

      setData({ budgetPostes, budgetExercice, montantALUR, modalitesALUR });
      setIsLoading(false);
    };

    load();
  }, [agId]);

  return { data, isLoading };
}
