/**
 * Service de génération de documents avec variables
 *
 * Ce service permet de générer des documents en résolvant automatiquement
 * les variables dynamiques depuis un contexte de données.
 */

import {
  resolveVariables,
  resolveVariable,
  CATALOGUE_VARIABLES,
  type VariablesContext,
  type ResolvedVariable,
  type GenerateDocumentResult,
} from './variables';

interface GenerateDocumentOptions {
  template: string;
  context: VariablesContext;
  validateRequired?: boolean;
}

/**
 * Service de génération de documents avec variables
 */
export class DocumentGenerator {
  /**
   * Génère un document à partir d'un template et d'un contexte
   */
  static generate(options: GenerateDocumentOptions): GenerateDocumentResult {
    const { template, context, validateRequired = true } = options;

    // Résoudre les variables
    const { text, resolved } = resolveVariables(template, context);

    // Identifier les variables non résolues
    const missingVariables = resolved
      .filter(r => !r.resolu)
      .map(r => r.cle);

    // Vérifier les variables obligatoires
    const warnings: string[] = [];

    if (validateRequired) {
      const requiredMissing = CATALOGUE_VARIABLES
        .filter(v => v.obligatoire)
        .filter(v => {
          const r = resolved.find(res => res.cle === v.cle);
          return r && !r.resolu;
        })
        .map(v => v.cle);

      if (requiredMissing.length > 0) {
        warnings.push(`Variables obligatoires manquantes: ${requiredMissing.join(', ')}`);
      }
    }

    return {
      content: text,
      resolvedVariables: resolved,
      missingVariables,
      warnings,
      isValid: missingVariables.length === 0,
    };
  }

  /**
   * Prévisualise les variables qui seront utilisées dans un template
   */
  static preview(template: string, context: VariablesContext): ResolvedVariable[] {
    const variablesInTemplate = this.extractVariables(template);

    return variablesInTemplate.map(varKey => {
      return resolveVariable(varKey.replace(/[{}]/g, ''), context);
    });
  }

  /**
   * Extrait les variables présentes dans un template
   */
  static extractVariables(template: string): string[] {
    const regex = /\{([a-z_]+)\}/g;
    const matches = template.match(regex);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Valide qu'un contexte contient toutes les données nécessaires
   */
  static validateContext(
    template: string,
    context: VariablesContext
  ): { isValid: boolean; errors: string[] } {
    const variables = this.extractVariables(template);
    const errors: string[] = [];

    for (const varKey of variables) {
      const varName = varKey.replace(/[{}]/g, '');
      const result = resolveVariable(varName, context);

      if (!result.resolu) {
        const varDef = CATALOGUE_VARIABLES.find(v => v.nom === varName);
        if (varDef?.obligatoire) {
          errors.push(`Variable obligatoire "${varKey}" non résolue: ${result.erreur}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Résout une seule variable
   */
  static resolveOne(variableName: string, context: VariablesContext): string {
    const result = resolveVariable(variableName, context);
    return result.resolu ? result.valeur : '';
  }

  /**
   * Vérifie si un template contient des variables non résolues
   */
  static hasUnresolvedVariables(template: string, context: VariablesContext): boolean {
    const { resolved } = resolveVariables(template, context);
    return resolved.some(r => !r.resolu);
  }

  /**
   * Compte les variables dans un template
   */
  static countVariables(template: string): { total: number; unique: string[] } {
    const variables = this.extractVariables(template);
    return {
      total: (template.match(/\{[a-z_]+\}/g) || []).length,
      unique: variables,
    };
  }
}

export default DocumentGenerator;
