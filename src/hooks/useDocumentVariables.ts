'use client';

/**
 * Hook pour utiliser les variables de documents dans les composants React
 *
 * Ce hook fournit des fonctions pour résoudre les variables dynamiques
 * dans les templates de documents et prévisualiser les valeurs.
 */

import { useMemo, useCallback } from 'react';
import {
  DocumentGenerator,
  type VariablesContext,
  type ResolvedVariable,
  CATALOGUE_VARIABLES,
  getVariablesByCategorie,
  type CategorieVariable,
} from '@/lib/documents';

interface UseDocumentVariablesOptions {
  context: VariablesContext;
}

interface UseDocumentVariablesReturn {
  // Résolution
  resolveTemplate: (template: string) => string;
  previewVariables: (template: string) => ResolvedVariable[];
  validateTemplate: (template: string) => { isValid: boolean; errors: string[] };

  // Catalogue
  allVariables: typeof CATALOGUE_VARIABLES;
  getVariablesByCategory: typeof getVariablesByCategorie;

  // Contexte
  isContextComplete: boolean;
  missingRequiredData: string[];
}

export function useDocumentVariables({
  context,
}: UseDocumentVariablesOptions): UseDocumentVariablesReturn {
  // Vérifier si le contexte est complet
  const { isContextComplete, missingRequiredData } = useMemo(() => {
    const requiredVariables = CATALOGUE_VARIABLES.filter(v => v.obligatoire);
    const missing: string[] = [];

    for (const varDef of requiredVariables) {
      // Vérifier si la donnée source existe dans le contexte
      const sourceParts = varDef.source.split('.');
      let value: unknown = context;

      for (const part of sourceParts) {
        // Ignorer les expressions complexes (||, +)
        if (part.includes('||') || part.includes('+')) break;

        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[part];
        } else {
          value = undefined;
          break;
        }
      }

      if (value === undefined || value === null || value === '') {
        missing.push(varDef.nom);
      }
    }

    return {
      isContextComplete: missing.length === 0,
      missingRequiredData: missing,
    };
  }, [context]);

  // Résoudre un template
  const resolveTemplate = useCallback((template: string): string => {
    const result = DocumentGenerator.generate({ template, context });
    return result.content;
  }, [context]);

  // Prévisualiser les variables
  const previewVariables = useCallback((template: string): ResolvedVariable[] => {
    return DocumentGenerator.preview(template, context);
  }, [context]);

  // Valider un template
  const validateTemplate = useCallback((template: string) => {
    return DocumentGenerator.validateContext(template, context);
  }, [context]);

  return {
    resolveTemplate,
    previewVariables,
    validateTemplate,
    allVariables: CATALOGUE_VARIABLES,
    getVariablesByCategory: getVariablesByCategorie,
    isContextComplete,
    missingRequiredData,
  };
}

/**
 * Hook simplifié pour résoudre une seule variable
 */
export function useResolveVariable(variableName: string, context: VariablesContext): string {
  return useMemo(() => {
    return DocumentGenerator.resolveOne(variableName, context);
  }, [variableName, context]);
}

/**
 * Hook pour obtenir les variables disponibles par catégorie
 */
export function useVariablesByCategory(category: CategorieVariable) {
  return useMemo(() => {
    return getVariablesByCategorie(category);
  }, [category]);
}
