/**
 * Service de recommandé électronique
 *
 * Ce module fournit une abstraction pour l'envoi de recommandés électroniques.
 * Actuellement configuré avec un service mock pour le développement.
 *
 * Pour une intégration future avec AR24 ou Maileva :
 * 1. Créer un fichier ar24.ts ou maileva.ts implémentant IRecommandeService
 * 2. Modifier ce fichier pour exporter le bon provider selon la configuration
 */

export * from './types';
export { MockRecommandeService, mockRecommandeService } from './mock';

// Re-export le service par défaut (mock pour l'instant)
import { mockRecommandeService } from './mock';
import type { IRecommandeService } from './types';

/**
 * Service de recommandé électronique actif
 * En production, ce sera AR24 ou Maileva selon la configuration
 */
export const recommandeService: IRecommandeService = mockRecommandeService;

/**
 * Vérifie si le service de recommandé électronique est configuré
 * Retourne false si seul le mock est disponible
 */
export function isRecommandeElectroniqueConfigured(): boolean {
  // Pour l'instant, seul le mock est disponible
  // Retourner true quand AR24/Maileva sera intégré
  return false;
}
