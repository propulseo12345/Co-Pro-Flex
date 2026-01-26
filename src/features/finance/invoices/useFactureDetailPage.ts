'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_FACTURES, MOCK_CLES_REPARTITION } from '@/components/features/finance/Factures/data';
import {
  formatCurrency,
  formatDate,
  getStatutBadgeClass,
  getStatutLabel,
  getNextStatut,
  getJoursRetard,
  STATUTS_FACTURE
} from '@/components/features/finance/Factures/utils';
import type { Facture, StatutFacture, EvenementFacture } from '@/components/features/finance/Factures/types';

export function useFactureDetailPage(factureId: string) {
  const router = useRouter();

  const [facture, setFacture] = useState<Facture | null>(() =>
    MOCK_FACTURES.find(f => f.id === factureId) || null
  );

  const cleRepartition = useMemo(() => {
    if (!facture?.cleRepartitionId) return null;
    return MOCK_CLES_REPARTITION.find(c => c.id === facture.cleRepartitionId);
  }, [facture?.cleRepartitionId]);

  const joursRetard = useMemo(() => {
    if (!facture || facture.statut === 'PAYEE') return 0;
    return getJoursRetard(facture.dateEcheance);
  }, [facture]);

  const nextStatut = facture ? getNextStatut(facture.statut) : null;
  const isAvoir = facture?.typeDocument === 'AVOIR';

  const handleBack = useCallback(() => {
    router.push('/finance/factures');
  }, [router]);

  const handleChangeStatut = useCallback((nouveauStatut: StatutFacture) => {
    if (!facture) return;

    const nouvelEvenement: EvenementFacture = {
      id: `evt-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: nouveauStatut === 'PAYEE' ? 'PAIEMENT' : 'CHANGEMENT_STATUT',
      statutPrecedent: facture.statut,
      nouveauStatut,
      utilisateur: 'Utilisateur courant',
    };

    setFacture(prev => prev ? {
      ...prev,
      statut: nouveauStatut,
      historique: [...(prev.historique || []), nouvelEvenement],
      ...(nouveauStatut === 'VALIDEE' ? { dateValidation: new Date().toISOString().split('T')[0], validePar: 'Utilisateur courant' } : {}),
      ...(nouveauStatut === 'PAYEE' ? { datePaiement: new Date().toISOString().split('T')[0] } : {}),
    } : null);
  }, [facture]);

  const getActionLabel = useCallback((statut: StatutFacture): string => {
    switch (statut) {
      case 'BROUILLON': return 'Soumettre pour validation';
      case 'A_VALIDER': return 'Valider la facture';
      case 'VALIDEE': return 'Mettre en paiement';
      case 'A_PAYER': return 'Marquer comme payée';
      default: return '';
    }
  }, []);

  return {
    facture,
    cleRepartition,
    joursRetard,
    nextStatut,
    isAvoir,
    handleBack,
    handleChangeStatut,
    getActionLabel,
    formatCurrency,
    formatDate,
    getStatutBadgeClass,
    getStatutLabel,
    STATUTS_FACTURE,
    MOCK_CLES_REPARTITION,
  };
}
