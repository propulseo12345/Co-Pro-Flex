'use client';

import { useState, useCallback } from 'react';
import {
  emissionAppelService,
  OptionsEmission,
  AppelFondsEmission,
  ResultatEmissionAppel,
  ResultatValidation,
} from '@/lib/services/emission-appel.service';
import {
  AppelFondsStatut,
  STATUTS_APPEL_FONDS,
  peutEmettreAppel,
  peutModifierAppel,
  peutAnnulerAppel,
} from '@/types/enums/statuts';

interface UseEmissionAppelReturn {
  // État
  isValidating: boolean;
  isEmitting: boolean;
  validationResult: ResultatValidation | null;
  emissionResult: ResultatEmissionAppel | null;
  error: Error | null;
  progression: string;

  // Actions
  validerPourEmission: (appel: AppelFondsEmission) => Promise<boolean>;
  emettreAppel: (
    appel: AppelFondsEmission,
    options: Omit<OptionsEmission, 'utilisateurId'>
  ) => Promise<ResultatEmissionAppel>;
  resetState: () => void;

  // Helpers
  peutEmettre: (statut: AppelFondsStatut | string) => boolean;
  peutModifier: (statut: AppelFondsStatut | string) => boolean;
  peutAnnuler: (statut: AppelFondsStatut | string) => boolean;
  getStatutLabel: (statut: AppelFondsStatut | string) => string;
  getStatutCouleur: (statut: AppelFondsStatut | string) => string;
  getRecapitulatif: (appel: AppelFondsEmission) => {
    montantTotal: number;
    nbCoproprietaires: number;
    nbLotsConcernes: number;
    dateEcheanceFormatee: string;
  };
}

export function useEmissionAppel(): UseEmissionAppelReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ResultatValidation | null>(null);
  const [emissionResult, setEmissionResult] = useState<ResultatEmissionAppel | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [progression, setProgression] = useState<string>('');

  // TODO: Récupérer depuis le contexte d'authentification
  const utilisateurId = 'user-current';

  /**
   * Valide un appel avant émission
   */
  const validerPourEmission = useCallback(async (appel: AppelFondsEmission): Promise<boolean> => {
    setIsValidating(true);
    setError(null);
    setValidationResult(null);
    setProgression('Validation en cours...');

    try {
      const result = await emissionAppelService.validerPourEmission(appel);
      setValidationResult(result);
      setProgression(result.valide ? 'Validation réussie' : 'Validation échouée');
      return result.valide;
    } catch (err) {
      setError(err as Error);
      setProgression('Erreur lors de la validation');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Émet un appel de fonds
   */
  const emettreAppel = useCallback(async (
    appel: AppelFondsEmission,
    options: Omit<OptionsEmission, 'utilisateurId'>
  ): Promise<ResultatEmissionAppel> => {
    setIsEmitting(true);
    setError(null);
    setEmissionResult(null);
    setProgression('Préparation de l\'émission...');

    try {
      // Étapes avec progression
      setProgression('Validation des données...');
      await new Promise(r => setTimeout(r, 300));

      if (options.genererEcritures) {
        setProgression('Création des écritures comptables...');
      }

      if (options.genererPDF) {
        setProgression('Génération des documents PDF...');
      }

      setProgression('Mise à jour du statut...');

      const result = await emissionAppelService.emettreAppel(appel, {
        ...options,
        utilisateurId,
      });

      if (options.envoyerEmails && result.success) {
        setProgression('Envoi des emails...');
        await new Promise(r => setTimeout(r, 200));
      }

      setEmissionResult(result);
      setProgression(result.success ? 'Émission terminée avec succès' : 'Erreur lors de l\'émission');

      return result;
    } catch (err) {
      const errorResult: ResultatEmissionAppel = {
        success: false,
        appelId: appel.id,
        nouveauStatut: appel.statut,
        ecrituresCreees: 0,
        documentsGeneres: 0,
        erreurs: [(err as Error).message],
        dateEmission: new Date().toISOString(),
      };
      setEmissionResult(errorResult);
      setError(err as Error);
      setProgression('Erreur lors de l\'émission');
      return errorResult;
    } finally {
      setIsEmitting(false);
    }
  }, [utilisateurId]);

  /**
   * Réinitialise l'état
   */
  const resetState = useCallback(() => {
    setValidationResult(null);
    setEmissionResult(null);
    setError(null);
    setProgression('');
  }, []);

  /**
   * Vérifie si un appel peut être émis
   */
  const peutEmettre = useCallback((statut: AppelFondsStatut | string): boolean => {
    return peutEmettreAppel(statut);
  }, []);

  /**
   * Vérifie si un appel peut être modifié
   */
  const peutModifier = useCallback((statut: AppelFondsStatut | string): boolean => {
    return peutModifierAppel(statut);
  }, []);

  /**
   * Vérifie si un appel peut être annulé
   */
  const peutAnnuler = useCallback((statut: AppelFondsStatut | string): boolean => {
    return peutAnnulerAppel(statut);
  }, []);

  /**
   * Retourne le label d'un statut
   */
  const getStatutLabel = useCallback((statut: AppelFondsStatut | string): string => {
    return STATUTS_APPEL_FONDS[statut as AppelFondsStatut]?.label || statut;
  }, []);

  /**
   * Retourne la couleur d'un statut
   */
  const getStatutCouleur = useCallback((statut: AppelFondsStatut | string): string => {
    return STATUTS_APPEL_FONDS[statut as AppelFondsStatut]?.couleur || '#6B7280';
  }, []);

  /**
   * Calcule le récapitulatif pour la modal
   */
  const getRecapitulatif = useCallback((appel: AppelFondsEmission) => {
    return emissionAppelService.getRecapitulatifEmission(appel);
  }, []);

  return {
    // État
    isValidating,
    isEmitting,
    validationResult,
    emissionResult,
    error,
    progression,

    // Actions
    validerPourEmission,
    emettreAppel,
    resetState,

    // Helpers
    peutEmettre,
    peutModifier,
    peutAnnuler,
    getStatutLabel,
    getStatutCouleur,
    getRecapitulatif,
  };
}
