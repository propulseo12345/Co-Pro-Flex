'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  CategorieDesignation,
  PersonneDesignee,
  ConfigDesignationMultiple
} from '@/types/models/ag';

type CategorieDesignationMultiple = 'scrutateur' | 'conseil_syndical';

interface SousResolution {
  id: string;
  sousNumero: number;
  numeroComplet: string;
  titre: string;
  personneDesignee: PersonneDesignee | null;
  statut: 'a_voter' | 'en_cours' | 'votee' | 'reportee';
  resultat?: {
    pour: number;
    contre: number;
    abstention: number;
    adoptee: boolean;
  };
}

const CONFIGS: Record<CategorieDesignationMultiple, ConfigDesignationMultiple> = {
  scrutateur: {
    categorie: 'scrutateur',
    nombreMinimum: 2,
    nombreMaximum: undefined,
    titreTemplate: "Désignation du scrutateur n°{n}",
    questionAjout: "Un autre copropriétaire souhaite-t-il être scrutateur ?",
  },
  conseil_syndical: {
    categorie: 'conseil_syndical',
    nombreMinimum: 3,
    nombreMaximum: 5,
    titreTemplate: "Élection du membre du Conseil Syndical n°{n}",
    questionAjout: "Souhaitez-vous élire un autre membre du Conseil Syndical ?",
  },
};

interface UseDesignationMultipleOptions {
  categorie: CategorieDesignationMultiple;
  resolutionParenteNumero: number;
  nombreMaximumOverride?: number;
  onSousResolutionCreated?: (sr: SousResolution) => void;
  onSousResolutionVotee?: (sr: SousResolution) => void;
  onDesignationComplete?: (designees: PersonneDesignee[]) => void;
}

interface UseDesignationMultipleReturn {
  // État
  sousResolutions: SousResolution[];
  currentSousResolution: SousResolution | null;
  currentIndex: number;

  // Config
  config: ConfigDesignationMultiple;
  nombreMinimum: number;
  nombreMaximum: number | undefined;

  // Statut
  isMinimumAtteint: boolean;
  isMaximumAtteint: boolean;
  canAddMore: boolean;
  personnesDesignees: PersonneDesignee[];

  // Actions
  creerPremiereSousResolution: () => SousResolution;
  ajouterSousResolution: () => SousResolution;
  selectionnerPersonne: (index: number, personne: PersonneDesignee) => void;
  validerVote: (index: number, resultat: SousResolution['resultat']) => void;
  supprimerSousResolution: (index: number) => void;

  // Navigation
  allerASousResolution: (index: number) => void;

  // Pop-up
  showAjoutPopup: boolean;
  setShowAjoutPopup: (show: boolean) => void;
  confirmerAjout: () => void;
  refuserAjout: () => void;
}

export function useDesignationMultiple({
  categorie,
  resolutionParenteNumero,
  nombreMaximumOverride,
  onSousResolutionCreated,
  onSousResolutionVotee,
  onDesignationComplete,
}: UseDesignationMultipleOptions): UseDesignationMultipleReturn {
  const config = CONFIGS[categorie];
  const nombreMaximum = nombreMaximumOverride ?? config.nombreMaximum;

  const [sousResolutions, setSousResolutions] = useState<SousResolution[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAjoutPopup, setShowAjoutPopup] = useState(false);

  // Générer le titre d'une sous-résolution
  const genererTitre = useCallback(
    (numero: number) => {
      return config.titreTemplate.replace('{n}', numero.toString());
    },
    [config.titreTemplate]
  );

  // Générer le numéro complet (ex: "3.1", "3.2")
  const genererNumeroComplet = useCallback(
    (sousNumero: number) => {
      return `${resolutionParenteNumero}.${sousNumero}`;
    },
    [resolutionParenteNumero]
  );

  // Créer une nouvelle sous-résolution
  const creerSousResolution = useCallback(
    (sousNumero: number): SousResolution => {
      const sr: SousResolution = {
        id: `sr-${categorie}-${Date.now()}-${sousNumero}`,
        sousNumero,
        numeroComplet: genererNumeroComplet(sousNumero),
        titre: genererTitre(sousNumero),
        personneDesignee: null,
        statut: 'a_voter',
      };
      return sr;
    },
    [categorie, genererNumeroComplet, genererTitre]
  );

  // Créer la première sous-résolution
  const creerPremiereSousResolution = useCallback(() => {
    const sr = creerSousResolution(1);
    setSousResolutions([sr]);
    setCurrentIndex(0);
    onSousResolutionCreated?.(sr);
    return sr;
  }, [creerSousResolution, onSousResolutionCreated]);

  // Ajouter une sous-résolution
  const ajouterSousResolution = useCallback(() => {
    const nouveauNumero = sousResolutions.length + 1;
    const sr = creerSousResolution(nouveauNumero);
    setSousResolutions((prev) => [...prev, sr]);
    setCurrentIndex(nouveauNumero - 1);
    setShowAjoutPopup(false);
    onSousResolutionCreated?.(sr);
    return sr;
  }, [sousResolutions.length, creerSousResolution, onSousResolutionCreated]);

  // Sélectionner une personne pour une sous-résolution
  const selectionnerPersonne = useCallback(
    (index: number, personne: PersonneDesignee) => {
      setSousResolutions((prev) =>
        prev.map((sr, i) => {
          if (i !== index) return sr;
          return { ...sr, personneDesignee: personne };
        })
      );
    },
    []
  );

  // Valider le vote d'une sous-résolution
  const validerVote = useCallback(
    (index: number, resultat: SousResolution['resultat']) => {
      setSousResolutions((prev) => {
        const updated = prev.map((sr, i) => {
          if (i !== index) return sr;
          return {
            ...sr,
            statut: 'votee' as const,
            resultat,
          };
        });

        const sr = updated[index];
        onSousResolutionVotee?.(sr);

        // Vérifier si on doit afficher la pop-up d'ajout
        const votees = updated.filter(
          (s) => s.statut === 'votee' && s.resultat?.adoptee
        );
        const peutAjouter = !nombreMaximum || votees.length < nombreMaximum;

        if (resultat?.adoptee && peutAjouter) {
          // Afficher la pop-up après un court délai
          setTimeout(() => setShowAjoutPopup(true), 500);
        } else if (
          !peutAjouter ||
          votees.length >= (nombreMaximum || Infinity)
        ) {
          // Désignation terminée
          const designees = updated
            .filter(
              (s) =>
                s.statut === 'votee' && s.resultat?.adoptee && s.personneDesignee
            )
            .map((s) => s.personneDesignee!);
          onDesignationComplete?.(designees);
        }

        return updated;
      });
    },
    [nombreMaximum, onSousResolutionVotee, onDesignationComplete]
  );

  // Supprimer une sous-résolution
  const supprimerSousResolution = useCallback(
    (index: number) => {
      setSousResolutions((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        // Renuméroter
        return updated.map((sr, i) => ({
          ...sr,
          sousNumero: i + 1,
          numeroComplet: genererNumeroComplet(i + 1),
          titre: genererTitre(i + 1),
        }));
      });
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    },
    [genererNumeroComplet, genererTitre]
  );

  // Navigation
  const allerASousResolution = useCallback(
    (index: number) => {
      if (index >= 0 && index < sousResolutions.length) {
        setCurrentIndex(index);
      }
    },
    [sousResolutions.length]
  );

  // Confirmer l'ajout d'une nouvelle désignation
  const confirmerAjout = useCallback(() => {
    ajouterSousResolution();
  }, [ajouterSousResolution]);

  // Refuser l'ajout (terminer)
  const refuserAjout = useCallback(() => {
    setShowAjoutPopup(false);
    const designees = sousResolutions
      .filter(
        (s) => s.statut === 'votee' && s.resultat?.adoptee && s.personneDesignee
      )
      .map((s) => s.personneDesignee!);
    onDesignationComplete?.(designees);
  }, [sousResolutions, onDesignationComplete]);

  // Calculs dérivés
  const personnesDesignees = useMemo(() => {
    return sousResolutions
      .filter(
        (sr) =>
          sr.statut === 'votee' && sr.resultat?.adoptee && sr.personneDesignee
      )
      .map((sr) => sr.personneDesignee!);
  }, [sousResolutions]);

  const isMinimumAtteint = personnesDesignees.length >= config.nombreMinimum;
  const isMaximumAtteint = nombreMaximum
    ? personnesDesignees.length >= nombreMaximum
    : false;
  const canAddMore = !isMaximumAtteint;

  const currentSousResolution = sousResolutions[currentIndex] || null;

  return {
    sousResolutions,
    currentSousResolution,
    currentIndex,
    config,
    nombreMinimum: config.nombreMinimum,
    nombreMaximum,
    isMinimumAtteint,
    isMaximumAtteint,
    canAddMore,
    personnesDesignees,
    creerPremiereSousResolution,
    ajouterSousResolution,
    selectionnerPersonne,
    validerVote,
    supprimerSousResolution,
    allerASousResolution,
    showAjoutPopup,
    setShowAjoutPopup,
    confirmerAjout,
    refuserAjout,
  };
}

export type { SousResolution, UseDesignationMultipleOptions, UseDesignationMultipleReturn };
