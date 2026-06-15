import { useState, useCallback, useMemo } from 'react';
import type { AnnexeItem } from '../components/ConvocationAnnexesSection';
import type { ConvocationAnnexePDF } from '@/lib/pdf/generateConvocationPDF';

type AGType = 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';

interface AnnexeDefinition {
  id: string;
  label: string;
  description: string;
  obligatoire: boolean;
  category: AnnexeItem['category'];
  /** Si défini, l'annexe n'apparaît que pour ces types d'AG */
  agTypes?: AGType[];
}

const ANNEXES_DEFINITIONS: AnnexeDefinition[] = [
  // Documents obligatoires (legal)
  {
    id: 'formulaire_vote_correspondance',
    label: 'Formulaire de vote par correspondance',
    description: 'Permet aux copropriétaires absents de voter (art. 17-1 A loi 1965)',
    obligatoire: true,
    category: 'legal',
  },
  {
    id: 'pouvoir_procuration',
    label: 'Pouvoir / Procuration',
    description: 'Formulaire de délégation de vote à un mandataire',
    obligatoire: true,
    category: 'legal',
  },
  {
    id: 'projet_reglement_interieur',
    label: 'Projet de résolutions',
    description: 'Texte complet des résolutions soumises au vote',
    obligatoire: true,
    category: 'legal',
  },

  // Annexes comptables (pour AG ordinaire)
  {
    id: 'annexe_1',
    label: 'Annexe 1 — État financier après répartition',
    description: 'Situation financière et trésorerie (partie haute) ; état des dettes et créances (partie basse)',
    obligatoire: true,
    category: 'comptable',
    agTypes: ['ORDINAIRE'],
  },
  {
    id: 'annexe_2',
    label: 'Annexe 2 — Compte de gestion général',
    description: 'Charges et produits de l\'exercice clos réalisé (opérations courantes + travaux et opérations exceptionnelles) et budget prévisionnel',
    obligatoire: true,
    category: 'comptable',
    agTypes: ['ORDINAIRE'],
  },
  {
    id: 'annexe_3',
    label: 'Annexe 3 — Compte de gestion par clés de répartition',
    description: 'Charges et produits pour opérations courantes, ventilés par clé de répartition',
    obligatoire: true,
    category: 'comptable',
    agTypes: ['ORDINAIRE'],
  },
  {
    id: 'annexe_4',
    label: 'Annexe 4 — Travaux art. 14-2 et opérations exceptionnelles',
    description: 'Compte de gestion des travaux de l\'article 14-2 et opérations exceptionnelles hors budget, réalisés sur l\'exercice clos',
    obligatoire: true,
    category: 'comptable',
    agTypes: ['ORDINAIRE'],
  },
  {
    id: 'annexe_5',
    label: 'Annexe 5 — Travaux votés non clôturés',
    description: 'État des travaux de l\'article 14-2 et opérations exceptionnelles votés, non encore clôturés à la fin de l\'exercice',
    obligatoire: true,
    category: 'comptable',
    agTypes: ['ORDINAIRE'],
  },

  // Documents complémentaires (contextuels)
  {
    id: 'rapport_conseil_syndical',
    label: 'Rapport du conseil syndical',
    description: 'Rapport d\'activité et avis du conseil syndical',
    obligatoire: false,
    category: 'contextuel',
  },
  {
    id: 'devis_travaux',
    label: 'Devis de travaux',
    description: 'Devis comparatifs pour les résolutions de travaux',
    obligatoire: false,
    category: 'contextuel',
  },
  {
    id: 'contrats_prestataires',
    label: 'Projets de contrats',
    description: 'Contrats de prestataires soumis au vote',
    obligatoire: false,
    category: 'contextuel',
  },
  {
    id: 'diagnostic_technique',
    label: 'Diagnostic technique global (DTG)',
    description: 'État technique de l\'immeuble et plan pluriannuel de travaux',
    obligatoire: false,
    category: 'contextuel',
  },
  {
    id: 'fiche_synthetique',
    label: 'Fiche synthétique de copropriété',
    description: 'Données financières et techniques essentielles (art. 8-2 loi 1965)',
    obligatoire: false,
    category: 'contextuel',
    agTypes: ['ORDINAIRE'],
  },
];

export interface UseConvocationAnnexesReturn {
  annexes: AnnexeItem[];
  annexeNames: string[];
  annexesForPDF: ConvocationAnnexePDF[];
  toggleAnnexe: (id: string) => void;
}

export function useConvocationAnnexes(agType: AGType | null): UseConvocationAnnexesReturn {
  const type = agType ?? 'ORDINAIRE';

  const filteredDefinitions = useMemo(() => {
    return ANNEXES_DEFINITIONS.filter(
      (def) => !def.agTypes || def.agTypes.includes(type)
    );
  }, [type]);

  // Les documents optionnels sont exclus par defaut (seuls les obligatoires sont inclus)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => {
    const optionalIds = ANNEXES_DEFINITIONS
      .filter((def) => !def.obligatoire && (!def.agTypes || def.agTypes.includes(type)))
      .map((def) => def.id);
    return new Set(optionalIds);
  });

  const annexes = useMemo<AnnexeItem[]>(() => {
    return filteredDefinitions.map((def) => ({
      id: def.id,
      label: def.label,
      description: def.description,
      obligatoire: def.obligatoire,
      category: def.category,
      included: def.obligatoire ? true : !excludedIds.has(def.id),
    }));
  }, [filteredDefinitions, excludedIds]);

  const toggleAnnexe = useCallback((id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const annexeNames = useMemo(() => {
    return annexes.filter((a) => a.included).map((a) => a.label);
  }, [annexes]);

  const annexesForPDF = useMemo<ConvocationAnnexePDF[]>(() => {
    return annexes
      .filter((a) => a.included)
      .map((a) => ({ label: a.label, category: a.category, obligatoire: a.obligatoire }));
  }, [annexes]);

  return { annexes, annexeNames, annexesForPDF, toggleAnnexe };
}
