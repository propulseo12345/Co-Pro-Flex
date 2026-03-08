/**
 * Création des résolutions standard pour une AG
 *
 * Cette fonction crée les résolutions obligatoires dans Supabase
 * avec les templates complets et les variables pré-remplies.
 */

import { addResolution } from './api';
import { getResolutionsObligatoires, type TypeAG, type MajorityType } from '@/lib/constants/resolutions';
import { extractVariableNames } from '@/lib/utils/resolution-variables';
import type { MajorityType as DbMajorityType, AddResolutionResponse } from './types';

// Mapper les types de majorité frontend vers backend
function toDbMajorityType(type: MajorityType): DbMajorityType {
  const map: Partial<Record<MajorityType, DbMajorityType>> = {
    'ART_24': 'art24',
    'ART_25': 'art25',
    'ART_25_1': 'art25_1',
    'ART_26': 'art26',
    'ART_26_1': 'art26_1',
    'UNANIMITE': 'unanimity',
  };
  return map[type] || 'art24';
}

// Générer les suggestions de variables par défaut
function getDefaultVariables(variableNames: string[], exerciceYear: number): Record<string, string> {
  const suggestions: Record<string, string> = {};
  const exercice = exerciceYear.toString();
  const today = new Date().toLocaleDateString('fr-FR');

  for (const name of variableNames) {
    const lowerName = name.toLowerCase();

    if (lowerName === 'date' || lowerName === 'date_du_jour') {
      suggestions[name] = today;
    } else if (lowerName === 'date_debut' || lowerName === 'exercice_debut') {
      suggestions[name] = `01/01/${exercice}`;
    } else if (lowerName === 'date_fin' || lowerName === 'exercice_fin' || lowerName === 'date_cloture') {
      suggestions[name] = `31/12/${exercice}`;
    } else if (lowerName === 'annee' || lowerName === 'exercice' || lowerName === 'annee_exercice') {
      suggestions[name] = exercice;
    } else {
      // Valeur vide par défaut pour les autres variables
      suggestions[name] = '';
    }
  }

  return suggestions;
}

export interface BudgetPosteData {
  id: string;
  poste: string;
  montant: number;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  repartitionKeyId?: string;
  repartitionKeyName?: string;
}

export interface CreateStandardResolutionsInput {
  agId: string;
  coproId: string;
  typeAG: TypeAG;
  exerciceYear?: number;
  /** Postes budgétaires saisis à l'étape 1, sauvés dans variables.budget_postes de la résolution budget */
  budgetPostes?: BudgetPosteData[];
}

export interface CreateStandardResolutionsResult {
  success: boolean;
  error?: string;
  resolutionsCreated: number;
  results: Array<{
    title: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Crée les résolutions obligatoires pour une AG
 */
export async function createStandardResolutions(
  input: CreateStandardResolutionsInput
): Promise<CreateStandardResolutionsResult> {
  const { agId, coproId, typeAG, exerciceYear = new Date().getFullYear() + 1, budgetPostes } = input;

  // Récupérer les templates obligatoires pour ce type d'AG
  const templatesObligatoires = getResolutionsObligatoires(typeAG);

  if (templatesObligatoires.length === 0) {
    return {
      success: true,
      resolutionsCreated: 0,
      results: [],
    };
  }

  // Trier par ordre suggéré
  const sortedTemplates = [...templatesObligatoires].sort(
    (a, b) => (a.ordre_suggere || 999) - (b.ordre_suggere || 999)
  );

  const results: Array<{ title: string; success: boolean; error?: string }> = [];
  let resolutionsCreated = 0;

  for (let i = 0; i < sortedTemplates.length; i++) {
    const template = sortedTemplates[i];

    // Extraire et pré-remplir les variables
    const variableNames = extractVariableNames(template.texte);
    const variables: Record<string, unknown> = getDefaultVariables(variableNames, exerciceYear);

    // Injecter les postes budgétaires dans la résolution d'approbation du budget
    if (template.action_type === 'CREATE_BUDGET' && budgetPostes && budgetPostes.length > 0) {
      variables.budget_postes = budgetPostes;
      const total = budgetPostes.reduce((sum, p) => sum + p.montant, 0);
      variables.montant = total.toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    }

    try {
      const result: AddResolutionResponse = await addResolution({
        ag_id: agId,
        copro_id: coproId,
        title: template.titre,
        description: template.texte,
        majority_type: toDbMajorityType(template.majorite),
        resolution_number: i + 1,
        variables: variables as Record<string, string>,
      });

      if (result.success) {
        resolutionsCreated++;
        results.push({ title: template.titre, success: true });
      } else {
        results.push({ title: template.titre, success: false, error: result.error });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      results.push({ title: template.titre, success: false, error: errorMsg });
    }
  }

  return {
    success: resolutionsCreated > 0,
    resolutionsCreated,
    results,
  };
}
