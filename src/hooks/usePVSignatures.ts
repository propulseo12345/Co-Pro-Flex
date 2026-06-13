'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { pvSignatureService } from '@/lib/services/pv-signature.service';
import {
  SignatairePV,
  ConfigurationSignature,
  ModeSignature,
  TypeSignataire,
  StatutSignature,
  PreRemplissageResult,
  LABELS_MODE_SIGNATURE,
} from '@/types/models/pv-signature';

interface UsePVSignaturesOptions {
  agId: string;
}

interface UsePVSignaturesReturn {
  // État
  signataires: SignatairePV[];
  configuration: ConfigurationSignature;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;

  // Mode de signature
  modeSignature: ModeSignature;
  setModeSignature: (mode: ModeSignature) => Promise<void>;
  modeConfig: typeof LABELS_MODE_SIGNATURE[ModeSignature];

  // Validation
  isEmailObligatoire: boolean;
  validerSignataire: (signataire: Partial<SignatairePV>) => { valide: boolean; erreurs: string[] };

  // Statut
  tousSignes: boolean;
  signaturesManquantes: SignatairePV[];
  preRempliDepuisAG: boolean;
  peutFinaliser: boolean;

  // Actions pré-remplissage
  preRemplirDepuisAG: () => Promise<PreRemplissageResult>;
  isPreRemplissageEnCours: boolean;

  // Actions signataires
  ajouterSignataire: (signataire: Omit<SignatairePV, 'id' | 'sourceRoleAG'>) => Promise<void>;
  mettreAJourSignataire: (signataireId: string, updates: Partial<SignatairePV>) => Promise<void>;
  supprimerSignataire: (signataireId: string) => Promise<void>;

  // Actions signature selon le mode
  validerSignaturesSurPlace: (options?: { lieuSignature?: string; dateSignature?: Date }) => Promise<void>;
  envoyerDemandesSignature: () => Promise<{ envoyes: number; erreurs: { signataireId: string; erreur: string }[] }>;

  // Actions individuelles
  marquerSigne: (signataireId: string, signatureImage?: string) => Promise<void>;
  marquerRefuse: (signataireId: string, commentaire?: string) => Promise<void>;
  marquerAbsent: (signataireId: string) => Promise<void>;
  reinitialiserSignature: (signataireId: string) => Promise<void>;

  // Upload PV scanné (mode sur place)
  uploadPVScanne: (fichier: File) => Promise<void>;
  pvScanne: { url?: string; nom?: string; taille?: number } | null;

  // Utilitaires
  getSignataireParType: (type: TypeSignataire) => SignatairePV | undefined;
  getBoutonActionLabel: () => string;
}

export function usePVSignatures({
  agId,
}: UsePVSignaturesOptions): UsePVSignaturesReturn {
  const [signataires, setSignataires] = useState<SignatairePV[]>([]);
  const [configuration, setConfiguration] = useState<ConfigurationSignature>({ mode: 'sur_place' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreRemplissageEnCours, setIsPreRemplissageEnCours] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [preRempliDepuisAG, setPreRempliDepuisAG] = useState(false);
  const currentUserId = 'user-current'; // TODO: récupérer l'utilisateur courant

  // ========================================
  // CHARGEMENT INITIAL
  // ========================================

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await pvSignatureService.getSignataires(agId);
        if (data) {
          setSignataires(data.signataires);
          setConfiguration(data.configuration);
          setPreRempliDepuisAG(data.preRempliDepuisAG);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [agId]);

  // ========================================
  // MODE DE SIGNATURE
  // ========================================

  const modeSignature = configuration.mode;
  const modeConfig = LABELS_MODE_SIGNATURE[modeSignature];
  const isEmailObligatoire = modeConfig.emailObligatoire;

  const setModeSignature = useCallback(async (mode: ModeSignature) => {
    setIsSaving(true);
    try {
      const data = await pvSignatureService.setModeSignature(agId, mode);
      setConfiguration(data.configuration);
      setSignataires(data.signataires);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSaving(false);
    }
  }, [agId]);

  // ========================================
  // VALIDATION
  // ========================================

  const validerSignataire = useCallback((signataire: Partial<SignatairePV>) => {
    return pvSignatureService.validerSignataire(signataire, modeSignature);
  }, [modeSignature]);

  // ========================================
  // ACTIONS SELON LE MODE
  // ========================================

  const validerSignaturesSurPlace = useCallback(async (options: {
    lieuSignature?: string;
    dateSignature?: Date;
  } = {}) => {
    if (modeSignature !== 'sur_place') {
      throw new Error('Cette action n\'est disponible qu\'en mode "Sur place"');
    }

    setIsSaving(true);
    try {
      const data = await pvSignatureService.validerSignaturesSurPlace(agId, {
        ...options,
        validePar: currentUserId,
      });
      setSignataires(data.signataires);
      setConfiguration(data.configuration);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [agId, modeSignature, currentUserId]);

  const envoyerDemandesSignature = useCallback(async () => {
    if (modeSignature !== 'electronique') {
      throw new Error('Cette action n\'est disponible qu\'en mode "Électronique"');
    }

    // Vérifier que tous les signataires ont un email
    const sansMail = signataires.filter(s => s.statut === 'en_attente' && !s.email);
    if (sansMail.length > 0) {
      throw new Error(`${sansMail.length} signataire(s) n'ont pas d'adresse email`);
    }

    setIsSaving(true);
    try {
      const result = await pvSignatureService.envoyerDemandesSignature(agId);

      // Recharger les données
      const data = await pvSignatureService.getSignataires(agId);
      if (data) {
        setSignataires(data.signataires);
      }

      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [agId, modeSignature, signataires]);

  // ========================================
  // UPLOAD PV SCANNÉ
  // ========================================

  const uploadPVScanne = useCallback(async (fichier: File) => {
    if (modeSignature !== 'sur_place') {
      throw new Error('L\'upload de PV scanné n\'est disponible qu\'en mode "Sur place"');
    }

    setIsSaving(true);
    try {
      const result = await pvSignatureService.uploadPVScanne(agId, fichier);
      setConfiguration(prev => ({
        ...prev,
        pvScanneUrl: result.url,
        pvScanneNom: result.nom,
        pvScanneTaille: result.taille,
      }));
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [agId, modeSignature]);

  const pvScanne = useMemo(() => {
    if (!configuration.pvScanneUrl) return null;
    return {
      url: configuration.pvScanneUrl,
      nom: configuration.pvScanneNom,
      taille: configuration.pvScanneTaille,
    };
  }, [configuration]);

  // ========================================
  // PRÉ-REMPLISSAGE
  // ========================================

  const preRemplirDepuisAG = useCallback(async (): Promise<PreRemplissageResult> => {
    setIsPreRemplissageEnCours(true);
    setError(null);

    try {
      const result = await pvSignatureService.preRemplirDepuisAG(agId);

      if (result.signataires.length > 0) {
        const existantsNonAG = signataires.filter(s => !s.sourceRoleAG);
        const nouveauxSignataires = [...result.signataires, ...existantsNonAG];

        await pvSignatureService.sauvegarderSignataires(agId, nouveauxSignataires, configuration);
        setSignataires(nouveauxSignataires);
        setPreRempliDepuisAG(true);
      }

      return result;
    } catch (err) {
      setError(err as Error);
      return {
        success: false,
        signataires: [],
        rolesManquants: [],
        warnings: [`Erreur: ${(err as Error).message}`],
      };
    } finally {
      setIsPreRemplissageEnCours(false);
    }
  }, [agId, signataires, configuration]);

  // ========================================
  // GESTION DES SIGNATAIRES
  // ========================================

  const ajouterSignataire = useCallback(async (
    signataire: Omit<SignatairePV, 'id' | 'sourceRoleAG'>
  ) => {
    // Valider selon le mode
    const validation = validerSignataire(signataire);
    if (!validation.valide) {
      throw new Error(validation.erreurs.join(', '));
    }

    setIsSaving(true);
    try {
      const nouveau = await pvSignatureService.ajouterSignataire(agId, signataire);
      setSignataires(prev => [...prev, nouveau]);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [agId, validerSignataire]);

  const mettreAJourSignataire = useCallback(async (
    signataireId: string,
    updates: Partial<SignatairePV>
  ) => {
    const updatedList = signataires.map(s =>
      s.id === signataireId ? { ...s, ...updates } : s
    );
    setSignataires(updatedList);

    // Sauvegarder
    setIsSaving(true);
    try {
      await pvSignatureService.sauvegarderSignataires(agId, updatedList, configuration);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSaving(false);
    }
  }, [agId, signataires, configuration]);

  const supprimerSignataire = useCallback(async (signataireId: string) => {
    setIsSaving(true);
    try {
      await pvSignatureService.supprimerSignataire(agId, signataireId);
      setSignataires(prev => prev.filter(s => s.id !== signataireId));
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSaving(false);
    }
  }, [agId]);

  // ========================================
  // ACTIONS INDIVIDUELLES
  // ========================================

  const marquerSigne = useCallback(async (signataireId: string, signatureImage?: string) => {
    await pvSignatureService.mettreAJourSignature(agId, signataireId, {
      statut: 'signe',
      signatureImage,
      dateSignature: new Date(),
    });
    setSignataires(prev => prev.map(s =>
      s.id === signataireId
        ? { ...s, statut: 'signe' as StatutSignature, dateSignature: new Date(), signatureImage }
        : s
    ));
  }, [agId]);

  const marquerRefuse = useCallback(async (signataireId: string, commentaire?: string) => {
    await pvSignatureService.mettreAJourSignature(agId, signataireId, {
      statut: 'refuse',
      commentaireRefus: commentaire,
    });
    setSignataires(prev => prev.map(s =>
      s.id === signataireId
        ? { ...s, statut: 'refuse' as StatutSignature, commentaireRefus: commentaire }
        : s
    ));
  }, [agId]);

  const marquerAbsent = useCallback(async (signataireId: string) => {
    await pvSignatureService.mettreAJourSignature(agId, signataireId, {
      statut: 'absent',
    });
    setSignataires(prev => prev.map(s =>
      s.id === signataireId ? { ...s, statut: 'absent' as StatutSignature } : s
    ));
  }, [agId]);

  const reinitialiserSignature = useCallback(async (signataireId: string) => {
    await pvSignatureService.mettreAJourSignature(agId, signataireId, {
      statut: 'en_attente',
      signatureImage: undefined,
      signaturePhysique: false,
      dateSignature: undefined,
    });
    setSignataires(prev => prev.map(s =>
      s.id === signataireId
        ? {
            ...s,
            statut: 'en_attente' as StatutSignature,
            signatureImage: undefined,
            signaturePhysique: false,
            dateSignature: undefined,
          }
        : s
    ));
  }, [agId]);

  // ========================================
  // CALCULS DÉRIVÉS
  // ========================================

  const tousSignes = signataires.length > 0 && signataires.every(
    s => s.statut === 'signe' || s.statut === 'non_requis'
  );

  const signaturesManquantes = signataires.filter(
    s => (s.type === 'president' || s.type === 'secretaire') && s.statut !== 'signe'
  );

  const peutFinaliser = signataires.length >= 2 &&
    signataires.some(s => s.type === 'president' && s.statut === 'signe') &&
    signataires.some(s => s.type === 'secretaire' && s.statut === 'signe');

  const getSignataireParType = useCallback((type: TypeSignataire) => {
    return signataires.find(s => s.type === type);
  }, [signataires]);

  const getBoutonActionLabel = useCallback(() => {
    return modeConfig.boutonAction;
  }, [modeConfig]);

  return {
    signataires,
    configuration,
    isLoading,
    isSaving,
    error,
    modeSignature,
    setModeSignature,
    modeConfig,
    isEmailObligatoire,
    validerSignataire,
    tousSignes,
    signaturesManquantes,
    preRempliDepuisAG,
    peutFinaliser,
    preRemplirDepuisAG,
    isPreRemplissageEnCours,
    ajouterSignataire,
    mettreAJourSignataire,
    supprimerSignataire,
    validerSignaturesSurPlace,
    envoyerDemandesSignature,
    marquerSigne,
    marquerRefuse,
    marquerAbsent,
    reinitialiserSignature,
    uploadPVScanne,
    pvScanne,
    getSignataireParType,
    getBoutonActionLabel,
  };
}
