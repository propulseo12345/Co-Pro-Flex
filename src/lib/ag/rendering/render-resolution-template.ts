/**
 * Moteur de rendu unifié pour les templates de résolutions AG
 *
 * USAGE UNIQUE: Cette fonction doit être utilisée dans TOUS les contextes:
 * - Preview UI (ordre du jour, étape 2)
 * - PDF Convocation (étape 3)
 * - Session de vote (étape 6)
 * - PV final
 *
 * RÈGLES DE FORMATAGE:
 * - Dates ISO/string -> format DD/MM/YYYY (fr-FR)
 * - Montants numériques -> format "10 500" (fr-FR)
 * - Variables manquantes -> chaîne vide ou placeholder selon option
 */

// Type pour les variables (peut être string, number, Date, ou objet)
export type VariableValue = string | number | Date | boolean | null | undefined;
export type VariablesRecord = Record<string, VariableValue>;

export interface RenderOptions {
  /** Si true, les variables non trouvées affichent [variable_name] au lieu de vide */
  showBracketsForMissing?: boolean;
  /** Si true, log un warning pour chaque variable non trouvée */
  warnOnMissing?: boolean;
  /** Contexte pour le logging (ex: 'pdf', 'preview', 'session') */
  context?: string;
}

/**
 * Détecte si une variable est un montant d'après son nom
 */
function isMontantVariable(varName: string): boolean {
  const lowerName = varName.toLowerCase();
  return (
    lowerName.includes('montant') ||
    lowerName.includes('budget') ||
    lowerName.includes('somme') ||
    lowerName.includes('cout') ||
    lowerName.includes('prix') ||
    lowerName.includes('total') ||
    lowerName.includes('provision') ||
    lowerName.includes('appel') ||
    lowerName.includes('solde')
  );
}

/**
 * Détecte si une variable est une date d'après son nom
 */
function isDateVariable(varName: string): boolean {
  const lowerName = varName.toLowerCase();
  return (
    lowerName.includes('date') ||
    lowerName.includes('debut') ||
    lowerName.includes('fin') ||
    lowerName.includes('cloture') ||
    lowerName.includes('echeance')
  );
}

/**
 * Détecte si une valeur ressemble à une date ISO (YYYY-MM-DD ou ISO 8601)
 */
function isISODateString(value: string): boolean {
  // Format ISO: 2026-01-31 ou 2026-01-31T00:00:00.000Z
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(value);
}

/**
 * Formate une date en DD/MM/YYYY (format français)
 */
function formatDateFR(value: VariableValue): string {
  if (!value) return '';

  try {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      // Si c'est déjà au format DD/MM/YYYY, le garder tel quel
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        return value;
      }
      // Parser comme ISO
      date = new Date(value);
    } else {
      return String(value);
    }

    if (isNaN(date.getTime())) {
      return String(value);
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return String(value);
  }
}

/**
 * Formate un montant en format français (10 500 sans symbole €)
 */
function formatMontantFR(value: VariableValue): string {
  if (value === null || value === undefined || value === '') return '';

  try {
    let num: number;

    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      // Nettoyer la chaîne: enlever espaces, €, et remplacer virgule par point
      const cleaned = value.replace(/[€\s]/g, '').replace(',', '.');
      num = parseFloat(cleaned);
    } else {
      return String(value);
    }

    if (isNaN(num)) {
      return String(value);
    }

    // Format français avec espace comme séparateur de milliers
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    return String(value);
  }
}

/**
 * Formate une valeur selon son type et le nom de la variable
 */
function formatValue(varName: string, value: VariableValue): string {
  if (value === null || value === undefined) return '';

  // Booléen
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }

  // String ou number
  const strValue = String(value);
  if (strValue === '') return '';

  // Dates: formatter si c'est un nom de variable date OU si la valeur ressemble à ISO
  if (isDateVariable(varName) || (typeof value === 'string' && isISODateString(value))) {
    return formatDateFR(value);
  }

  // Montants: formatter si c'est un nom de variable montant ET c'est numérique
  if (isMontantVariable(varName)) {
    const formatted = formatMontantFR(value);
    if (formatted !== strValue) {
      return formatted;
    }
  }

  return strValue;
}

/**
 * Rend un template de résolution en remplaçant les placeholders {variable} par leurs valeurs
 *
 * @param body - Le texte template avec placeholders {xxx}
 * @param variables - Record des valeurs de variables
 * @param options - Options de rendu
 * @returns Le texte avec les variables remplacées
 *
 * @example
 * renderResolutionBody(
 *   "L'exercice du {date_debut} au {date_fin} présente un résultat de {montant} euros.",
 *   { date_debut: "2026-01-01", date_fin: "2026-12-31", montant: 10500 }
 * )
 * // => "L'exercice du 01/01/2026 au 31/12/2026 présente un résultat de 10 500 euros."
 */
export function renderResolutionBody(
  body: string,
  variables?: VariablesRecord | null,
  options: RenderOptions = {}
): string {
  if (!body) return '';

  const {
    showBracketsForMissing = false,
    warnOnMissing = false,
    context = 'render',
  } = options;

  // Regex pour trouver tous les placeholders {xxx}
  const placeholderRegex = /\{([^}]+)\}/g;

  const result = body.replace(placeholderRegex, (match, varName: string) => {
    const trimmedName = varName.trim();

    // Vérifier si la variable existe
    if (!variables || !(trimmedName in variables)) {
      if (warnOnMissing) {
        // Variable non trouvée: trimmedName
      }
      return showBracketsForMissing ? `[${trimmedName}]` : '';
    }

    const value = variables[trimmedName];
    return formatValue(trimmedName, value);
  });

  return result;
}

/**
 * Vérifie si un texte contient encore des placeholders non résolus
 */
export function hasUnresolvedPlaceholders(text: string): boolean {
  return /\{[^}]+\}/.test(text);
}

/**
 * Extrait la liste des noms de variables d'un template
 */
export function extractVariableNames(template: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const names: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    const name = match[1].trim();
    if (!names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Valide qu'un template a toutes ses variables remplies
 */
export function validateTemplateVariables(
  template: string,
  variables?: VariablesRecord | null
): { isComplete: boolean; missing: string[] } {
  const required = extractVariableNames(template);
  const missing: string[] = [];

  for (const varName of required) {
    if (!variables || !(varName in variables) || variables[varName] === '' || variables[varName] === null) {
      missing.push(varName);
    }
  }

  return {
    isComplete: missing.length === 0,
    missing,
  };
}

// Export par défaut pour compatibilité
export default renderResolutionBody;
