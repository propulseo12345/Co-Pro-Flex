/**
 * Postes de budget prédéfinis pour les budgets de fonctionnement
 */

export interface PosteBudgetPredefini {
  id: string;
  label: string;
  labelCourt: string;
  color: string;
  icone: string;
  ordre: number;
}

export const POSTES_BUDGET_PREDEFINIS: PosteBudgetPredefini[] = [
  { id: 'eau', label: 'Eau', labelCourt: 'Eau', color: '#3B82F6', icone: 'Droplets', ordre: 1 },
  { id: 'electricite', label: 'Électricité', labelCourt: 'Élec.', color: '#F59E0B', icone: 'Zap', ordre: 2 },
  { id: 'chauffage', label: 'Chauffage', labelCourt: 'Chauff.', color: '#EF4444', icone: 'Flame', ordre: 3 },
  { id: 'assurance', label: 'Assurance', labelCourt: 'Assur.', color: '#10B981', icone: 'Shield', ordre: 4 },
  { id: 'menage', label: 'Ménage / Nettoyage', labelCourt: 'Ménage', color: '#8B5CF6', icone: 'Sparkles', ordre: 5 },
  { id: 'ascenseur', label: 'Ascenseur', labelCourt: 'Asc.', color: '#EC4899', icone: 'ArrowUpDown', ordre: 6 },
  { id: 'espaces_verts', label: 'Espaces verts', labelCourt: 'Esp. verts', color: '#14B8A6', icone: 'Trees', ordre: 7 },
  { id: 'entretien', label: 'Entretien courant', labelCourt: 'Entretien', color: '#06B6D4', icone: 'Wrench', ordre: 8 },
  { id: 'honoraires_syndic', label: 'Honoraires syndic', labelCourt: 'Syndic', color: '#6366F1', icone: 'Building2', ordre: 9 },
  { id: 'divers', label: 'Divers', labelCourt: 'Divers', color: '#6B7280', icone: 'MoreHorizontal', ordre: 99 },
];

/**
 * Map des postes par ID pour accès rapide
 */
export const POSTES_BUDGET_MAP: Record<string, PosteBudgetPredefini> =
  POSTES_BUDGET_PREDEFINIS.reduce((acc, poste) => {
    acc[poste.id] = poste;
    return acc;
  }, {} as Record<string, PosteBudgetPredefini>);

/**
 * Liste ordonnée des postes pour affichage
 */
export const POSTES_BUDGET_ORDONNES = [...POSTES_BUDGET_PREDEFINIS].sort((a, b) => a.ordre - b.ordre);

/**
 * Récupère tous les postes prédéfinis
 */
export function getPostesPredefinis(): PosteBudgetPredefini[] {
  return POSTES_BUDGET_PREDEFINIS;
}

/**
 * Récupère un poste par son ID
 */
export function getPosteById(id: string): PosteBudgetPredefini | undefined {
  return POSTES_BUDGET_PREDEFINIS.find(p => p.id === id);
}

/**
 * Récupère le label d'un poste par son ID
 */
export function getPosteLabel(id: string): string {
  const poste = getPosteById(id);
  return poste?.label ?? id;
}

/**
 * Récupère la couleur d'un poste par son ID
 */
export function getPosteColor(id: string): string {
  const poste = getPosteById(id);
  return poste?.color ?? '#6B7280';
}

/**
 * Vérifie si un poste existe dans les prédéfinis
 */
export function isPostePredefini(id: string): boolean {
  return POSTES_BUDGET_PREDEFINIS.some(p => p.id === id);
}

/**
 * Types de travaux prédéfinis pour les budgets travaux
 */
export interface TypeTravauxPredefini {
  id: string;
  label: string;
  icon?: string;
}

export const TYPES_TRAVAUX: TypeTravauxPredefini[] = [
  { id: 'toiture', label: 'Toiture' },
  { id: 'facade', label: 'Façade / Ravalement' },
  { id: 'ascenseur', label: 'Ascenseur' },
  { id: 'isolation', label: 'Isolation thermique' },
  { id: 'electricite', label: 'Électricité' },
  { id: 'plomberie', label: 'Plomberie' },
  { id: 'espaces_verts', label: 'Espaces verts' },
  { id: 'securite', label: 'Sécurité incendie' },
  { id: 'chauffage', label: 'Chauffage / Climatisation' },
  { id: 'parties_communes', label: 'Parties communes' },
  { id: 'autre', label: 'Autre' },
];

/**
 * Récupère un type de travaux par son ID
 */
export function getTypeTravauxById(id: string): TypeTravauxPredefini | undefined {
  return TYPES_TRAVAUX.find(t => t.id === id);
}

/**
 * Récupère le label d'un type de travaux par son ID
 */
export function getTypeTravauxLabel(id: string): string {
  const type = getTypeTravauxById(id);
  return type?.label ?? id;
}
