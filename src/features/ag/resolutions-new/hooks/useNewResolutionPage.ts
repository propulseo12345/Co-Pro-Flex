'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import { ModeEcheancier, Echeance } from '@/types';
import { creerEcheancier, genererEcheances } from '@/lib/utils/echeancier';
import { saveDraft, loadDraft } from '@/lib/ag/draft-persistence';

export const CLES_REPARTITION = [
  { value: 'CHARGES_GENERALES', label: 'Charges generales' },
  { value: 'BATIMENT_A', label: 'Batiment A' },
  { value: 'BATIMENT_B', label: 'Batiment B' },
  { value: 'BATIMENT_C', label: 'Batiment C' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'ESPACES_VERTS', label: 'Espaces verts' }
];

export function useNewResolutionPage() {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;

  const [showAlert, setShowAlert] = useState(true);
  const [titre, setTitre] = useState('');
  const [majorite, setMajorite] = useState<MajorityType>('ART_24');
  const [cleRepartition, setCleRepartition] = useState('CHARGES_GENERALES');
  const [corps, setCorps] = useState('');

  // Etats pour les echeances d'appels de fonds
  const [estAppelFonds, setEstAppelFonds] = useState(false);
  const [modeEcheancier, setModeEcheancier] = useState<ModeEcheancier>('UNE_FOIS');
  const [montantTotal, setMontantTotal] = useState<number>(0);
  const [dateDebut, setDateDebut] = useState<string>('');
  const [nombreEcheancesPersonnalisees, setNombreEcheancesPersonnalisees] = useState<number>(2);
  const [echeances, setEcheances] = useState<Echeance[]>([]);

  // Fonction pour generer les echeances automatiquement
  const handleModeEcheancierChange = useCallback((newMode: ModeEcheancier) => {
    setModeEcheancier(newMode);
    if (montantTotal > 0 && dateDebut) {
      const nouvellesEcheances = genererEcheances(
        newMode,
        montantTotal,
        dateDebut,
        newMode === 'PERSONNALISE' ? nombreEcheancesPersonnalisees : undefined
      );
      setEcheances(nouvellesEcheances);
    }
  }, [montantTotal, dateDebut, nombreEcheancesPersonnalisees]);

  const handleMontantOrDateChange = useCallback(() => {
    if (montantTotal > 0 && dateDebut) {
      const nouvellesEcheances = genererEcheances(
        modeEcheancier,
        montantTotal,
        dateDebut,
        modeEcheancier === 'PERSONNALISE' ? nombreEcheancesPersonnalisees : undefined
      );
      setEcheances(nouvellesEcheances);
    }
  }, [modeEcheancier, montantTotal, dateDebut, nombreEcheancesPersonnalisees]);

  const handleEcheanceChange = useCallback((index: number, field: 'dateExigibilite' | 'montantTotal', value: string | number) => {
    const nouvEcheances = [...echeances];
    nouvEcheances[index] = {
      ...nouvEcheances[index],
      [field]: value
    };
    setEcheances(nouvEcheances);
  }, [echeances]);

  const handleMontantChange = useCallback((value: number) => {
    setMontantTotal(value);
    setTimeout(handleMontantOrDateChange, 100);
  }, [handleMontantOrDateChange]);

  const handleDateDebutChange = useCallback((value: string) => {
    setDateDebut(value);
    setTimeout(handleMontantOrDateChange, 100);
  }, [handleMontantOrDateChange]);

  const handleNombreEcheancesChange = useCallback((value: number) => {
    setNombreEcheancesPersonnalisees(value);
    setTimeout(handleMontantOrDateChange, 100);
  }, [handleMontantOrDateChange]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titre.trim() || !corps.trim()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Valider les echeances si c'est un appel de fonds
    if (estAppelFonds) {
      if (montantTotal <= 0) {
        alert('Veuillez saisir un montant total valide');
        return;
      }
      if (!dateDebut) {
        alert('Veuillez saisir une date de debut');
        return;
      }
      if (echeances.length === 0) {
        alert('Veuillez generer les echeances');
        return;
      }
    }

    // Charger les resolutions existantes depuis Supabase (fallback localStorage)
    const { data: savedResolutions } = await loadDraft<unknown[]>(agId, 'resolutions', 'ag-resolutions-' + agId);
    const resolutions = savedResolutions || [];

    // Creer l'echeancier si c'est un appel de fonds
    let echeancier = undefined;
    if (estAppelFonds) {
      echeancier = creerEcheancier(
        modeEcheancier,
        montantTotal,
        dateDebut,
        undefined,
        undefined,
        cleRepartition,
        modeEcheancier === 'PERSONNALISE' ? nombreEcheancesPersonnalisees : undefined
      );
      echeancier.echeances = echeances; // Utiliser les echeances modifiees
    }

    // Creer la nouvelle resolution
    const newResolution = {
      id: 'res-' + Date.now(),
      titre: titre.trim(),
      texte: corps.trim(),
      majorite: majorite,
      cleRepartition: cleRepartition,
      custom: true,
      estAppelFonds: estAppelFonds,
      echeancier: echeancier
    };

    // Ajouter a la liste et sauvegarder via Supabase (fallback localStorage)
    resolutions.push(newResolution);
    await saveDraft(agId, 'resolutions', resolutions, 'ag-resolutions-' + agId);

    // Rediriger vers l'ordre du jour
    router.push(`/ag/${agId}/agenda`);
  }, [
    titre,
    corps,
    estAppelFonds,
    montantTotal,
    dateDebut,
    echeances,
    agId,
    modeEcheancier,
    cleRepartition,
    nombreEcheancesPersonnalisees,
    majorite,
    router
  ]);

  const handleBack = useCallback(() => {
    router.push(`/ag/${agId}/agenda`);
  }, [router, agId]);

  const closeAlert = useCallback(() => {
    setShowAlert(false);
  }, []);

  return {
    // Data
    agId,
    MAJORITES,
    // Form state
    showAlert,
    titre,
    majorite,
    cleRepartition,
    corps,
    estAppelFonds,
    modeEcheancier,
    montantTotal,
    dateDebut,
    nombreEcheancesPersonnalisees,
    echeances,
    // Setters
    setTitre,
    setMajorite,
    setCleRepartition,
    setCorps,
    setEstAppelFonds,
    // Handlers
    handleModeEcheancierChange,
    handleMontantChange,
    handleDateDebutChange,
    handleNombreEcheancesChange,
    handleEcheanceChange,
    handleSubmit,
    handleBack,
    closeAlert,
  };
}
