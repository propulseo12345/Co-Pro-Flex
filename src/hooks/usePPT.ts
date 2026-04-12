'use client';

import { useState, useMemo, useCallback } from 'react';
import type { IPPTCopropriete, ITravauxPPT } from '@/types';
import { MOCK_PPT_COPROPRIETES } from '@/components/features/conformite/ppt/mock-data';
import { TravauxPrevisionnelStatut } from '@/types/enums';

const YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];

export type PPTFilter = 'TOUTES' | 'A_COMPLETER' | 'EN_RETARD' | 'A_JOUR';

export function getStatutGlobal(copro: IPPTCopropriete): PPTFilter {
  if (copro.travaux.length === 0) return 'A_COMPLETER';
  const hasEnRetard = copro.travaux.some(t =>
    t.statut === TravauxPrevisionnelStatut.EN_COURS &&
    new Date(t.datePrevisionnelle) < new Date()
  );
  if (hasEnRetard) return 'EN_RETARD';
  return 'A_JOUR';
}

interface UsePPTOptions {
  coproprieteId?: string;
}

export function usePPT({ coproprieteId }: UsePPTOptions = {}) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [filter, setFilter] = useState<PPTFilter>('TOUTES');
  const [selectedTravail, setSelectedTravail] = useState<ITravauxPPT | null>(null);

  // Vue gestionnaire : toutes les copros
  const coproprietes = useMemo(() => {
    if (filter === 'TOUTES') return MOCK_PPT_COPROPRIETES;
    return MOCK_PPT_COPROPRIETES.filter(c => getStatutGlobal(c) === filter);
  }, [filter]);

  // Vue détail : copro sélectionnée
  const selectedCopro = useMemo(
    () => coproprieteId ? MOCK_PPT_COPROPRIETES.find(c => c.coproprieteId === coproprieteId) ?? null : null,
    [coproprieteId]
  );

  // Travaux filtrés par année
  const travaux = useMemo(() => {
    if (!selectedCopro) return [];
    if (!selectedYear) return selectedCopro.travaux;
    return selectedCopro.travaux.filter(t => {
      const year = new Date(t.datePrevisionnelle).getFullYear();
      return year === selectedYear;
    });
  }, [selectedCopro, selectedYear]);

  // Groupement par statut pour le kanban
  const travauxByStatut = useMemo(() => {
    const map: Record<string, ITravauxPPT[]> = {
      A_L_ETUDE: [],
      PREVU: [],
      VOTE: [],
      EN_COURS: [],
      TERMINE: [],
    };
    travaux.forEach(t => {
      const key = t.statut as string;
      if (key in map) map[key].push(t);
    });
    return map;
  }, [travaux]);

  const openTravailDetail = useCallback((travail: ITravauxPPT) => {
    setSelectedTravail(travail);
  }, []);

  const closeTravailDetail = useCallback(() => {
    setSelectedTravail(null);
  }, []);

  return {
    coproprietes,
    filter,
    setFilter,
    selectedCopro,
    travaux,
    travauxByStatut,
    selectedYear,
    setYear: setSelectedYear,
    years: YEARS,
    selectedTravail,
    openTravailDetail,
    closeTravailDetail,
    isLoading: false,
  };
}
