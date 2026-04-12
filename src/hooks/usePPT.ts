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
  const [coproData, setCoproData] = useState<IPPTCopropriete[]>(MOCK_PPT_COPROPRIETES);

  // Vue gestionnaire : toutes les copros
  const coproprietes = useMemo(() => {
    if (filter === 'TOUTES') return coproData;
    return coproData.filter(c => getStatutGlobal(c) === filter);
  }, [coproData, filter]);

  // Vue détail : copro sélectionnée
  // Fallback au premier mock si l'ID ne correspond pas (mode dev sans Supabase)
  const selectedCopro = useMemo(() => {
    if (!coproprieteId) return null;
    return coproData.find(c => c.coproprieteId === coproprieteId)
      ?? coproData[0];
  }, [coproprieteId, coproData]);

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

  const addTravail = useCallback((targetCoproId: string, data: Omit<ITravauxPPT, 'id' | 'etapes'>) => {
    const ts = Date.now();
    const newTravail: ITravauxPPT = {
      ...data,
      id: `trav-${ts}`,
      etapes: [
        { id: `e1-${ts}`, label: 'Devis', statut: 'A_VENIR' },
        { id: `e2-${ts}`, label: 'Vote en AG', statut: 'A_VENIR' },
        { id: `e3-${ts}`, label: 'Commande', statut: 'A_VENIR' },
        { id: `e4-${ts}`, label: 'Intervention', statut: 'A_VENIR' },
        { id: `e5-${ts}`, label: 'Réception', statut: 'A_VENIR' },
      ],
    };
    setCoproData(prev =>
      prev.map(c =>
        c.coproprieteId === targetCoproId
          ? { ...c, travaux: [...c.travaux, newTravail], derniereMAJ: new Date().toISOString().slice(0, 10) }
          : c
      )
    );
  }, []);

  const updateTravail = useCallback((targetCoproId: string, travailId: string, data: Partial<Omit<ITravauxPPT, 'id' | 'etapes'>>) => {
    setCoproData(prev =>
      prev.map(c =>
        c.coproprieteId === targetCoproId
          ? {
              ...c,
              derniereMAJ: new Date().toISOString().slice(0, 10),
              travaux: c.travaux.map(t =>
                t.id === travailId ? { ...t, ...data } : t
              ),
            }
          : c
      )
    );
    setSelectedTravail(prev =>
      prev?.id === travailId ? { ...prev, ...data } : prev
    );
  }, []);

  const deleteTravail = useCallback((targetCoproId: string, travailId: string) => {
    setCoproData(prev =>
      prev.map(c =>
        c.coproprieteId === targetCoproId
          ? {
              ...c,
              derniereMAJ: new Date().toISOString().slice(0, 10),
              travaux: c.travaux.filter(t => t.id !== travailId),
            }
          : c
      )
    );
    setSelectedTravail(prev => (prev?.id === travailId ? null : prev));
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
    addTravail,
    updateTravail,
    deleteTravail,
    isLoading: false,
  };
}
