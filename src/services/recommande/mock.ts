import type {
  IRecommandeService,
  EnvoiRecommandeRequest,
  EnvoiRecommandeResponse,
  StatutRecommandeDetail
} from './types';

/**
 * Génère un ID de tracking fictif
 */
function generateTrackingId(): string {
  const prefix = 'MOCK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Stockage en mémoire des envois mockés (pour simulation)
 */
const mockEnvois: Map<string, {
  request: EnvoiRecommandeRequest;
  dateEnvoi: string;
  statut: 'EN_ATTENTE' | 'ENVOYE' | 'CONFIRME';
}> = new Map();

/**
 * Service de recommandé électronique mocké
 * Utilisé pour le développement et les tests
 */
export class MockRecommandeService implements IRecommandeService {
  readonly providerName = 'Mock (Développement)';

  async envoyer(request: EnvoiRecommandeRequest): Promise<EnvoiRecommandeResponse> {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 800));

    // Validation basique
    if (!request.destinataire.email) {
      return {
        success: false,
        error: 'Email du destinataire requis',
        codeErreur: 'MISSING_EMAIL'
      };
    }

    if (!request.objet || !request.contenu) {
      return {
        success: false,
        error: 'Objet et contenu requis',
        codeErreur: 'MISSING_CONTENT'
      };
    }

    // Générer un tracking ID
    const trackingId = generateTrackingId();
    const dateEnvoi = new Date().toISOString();

    // Stocker l'envoi
    mockEnvois.set(trackingId, {
      request,
      dateEnvoi,
      statut: 'ENVOYE'
    });

    // Simuler une confirmation automatique après 2 secondes
    setTimeout(() => {
      const envoi = mockEnvois.get(trackingId);
      if (envoi) {
        envoi.statut = 'CONFIRME';
      }
    }, 2000);

    return {
      success: true,
      trackingId,
      dateEnvoi
    };
  }

  async getStatut(trackingId: string): Promise<StatutRecommandeDetail> {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 300));

    const envoi = mockEnvois.get(trackingId);

    if (!envoi) {
      return {
        trackingId,
        statut: 'ECHEC',
        motifEchec: 'Tracking ID non trouvé'
      };
    }

    return {
      trackingId,
      statut: envoi.statut,
      dateEnvoi: envoi.dateEnvoi,
      dateDistribution: envoi.statut === 'CONFIRME' ? new Date().toISOString() : undefined,
      dateAccuseReception: envoi.statut === 'CONFIRME' ? new Date().toISOString() : undefined
    };
  }

  async isAvailable(): Promise<boolean> {
    // Le mock est toujours disponible
    return true;
  }
}

/**
 * Instance singleton du service mock
 */
export const mockRecommandeService = new MockRecommandeService();
