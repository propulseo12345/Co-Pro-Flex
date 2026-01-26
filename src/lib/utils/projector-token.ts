/**
 * Utilitaires de gestion des tokens pour le Mode Projecteur
 *
 * Génération et validation de tokens sécurisés pour l'accès read-only
 */

import {
  PROJECTOR_STORAGE_KEYS,
  PROJECTOR_CONFIG,
  type ProjectorAccessToken
} from '@/types/projector';

/**
 * Génère un token sécurisé non devinable
 * Utilise crypto.randomUUID() si disponible, sinon fallback
 */
export function generateProjectorToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Utiliser crypto.randomUUID() pour un token vraiment aléatoire
    return crypto.randomUUID().replace(/-/g, '');
  }

  // Fallback pour les environnements sans crypto.randomUUID
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `proj_${timestamp}_${random1}${random2}`;
}

/**
 * Crée un token d'accès complet avec métadonnées
 */
export function createProjectorAccessToken(agId: string): ProjectorAccessToken {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PROJECTOR_CONFIG.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  return {
    token: generateProjectorToken(),
    agId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Valide un token fourni contre le token stocké
 */
export function validateProjectorToken(
  providedToken: string,
  storedToken: ProjectorAccessToken
): { valid: boolean; reason?: string } {
  // Vérifier que le token correspond
  if (providedToken !== storedToken.token) {
    return { valid: false, reason: 'Token invalide' };
  }

  // Vérifier l'expiration
  const now = new Date();
  const expiresAt = new Date(storedToken.expiresAt);

  if (now > expiresAt) {
    return { valid: false, reason: 'Token expiré' };
  }

  return { valid: true };
}

/**
 * Stocke le token dans localStorage
 */
export function saveProjectorToken(agId: string, token: ProjectorAccessToken): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      PROJECTOR_STORAGE_KEYS.TOKEN(agId),
      JSON.stringify(token)
    );
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Récupère le token depuis localStorage
 */
export function getProjectorToken(agId: string): ProjectorAccessToken | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(PROJECTOR_STORAGE_KEYS.TOKEN(agId));
    if (!stored) return null;
    return JSON.parse(stored) as ProjectorAccessToken;
  } catch {
    return null;
  }
}

/**
 * Récupère ou crée un nouveau token
 */
export function getOrCreateProjectorToken(agId: string): ProjectorAccessToken {
  const existing = getProjectorToken(agId);

  // Si token existant et non expiré, le réutiliser
  if (existing) {
    const validation = validateProjectorToken(existing.token, existing);
    if (validation.valid) {
      return existing;
    }
  }

  // Créer un nouveau token
  const newToken = createProjectorAccessToken(agId);
  saveProjectorToken(agId, newToken);
  return newToken;
}

/**
 * Supprime le token
 */
export function revokeProjectorToken(agId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(PROJECTOR_STORAGE_KEYS.TOKEN(agId));
  } catch {
    // Silently fail
  }
}

/**
 * Génère l'URL complète du projecteur
 */
export function getProjectorUrl(agId: string, token: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : '';
  return `${baseUrl}/ag/${agId}/projector?token=${token}`;
}

/**
 * Extrait le token de l'URL courante
 */
export function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

/**
 * Vérifie si un token URL est valide pour une AG donnée
 */
export function isValidProjectorAccess(agId: string, urlToken: string): boolean {
  const storedToken = getProjectorToken(agId);
  if (!storedToken) return false;

  const validation = validateProjectorToken(urlToken, storedToken);
  return validation.valid;
}
