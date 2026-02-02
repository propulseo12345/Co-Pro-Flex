'use client';

import { useMemo } from 'react';
import type { Coproprietaire } from '../types';

interface VoterData {
  coproprietaire_id: string;
  name: string;
  email: string | null;
  tantiemes: number;
  lot_ids: string[];
  lot_refs: string[];
}

export interface UseSessionParticipantsReturn {
  coproprietaires: Coproprietaire[];
  totalTantiemes: number;
}

export function useSessionParticipants(voters: VoterData[]): UseSessionParticipantsReturn {
  const coproprietaires = useMemo(() => {
    if (voters.length > 0) {
      return voters.map(v => ({
        id: v.coproprietaire_id,
        nom: v.name,
        email: v.email,
        tantiemes: v.tantiemes,
        lotIds: v.lot_ids,
        lotRefs: v.lot_refs,
      }));
    }
    return [];
  }, [voters]);

  const totalTantiemes = useMemo(
    () => coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0),
    [coproprietaires]
  );

  return {
    coproprietaires,
    totalTantiemes,
  };
}
