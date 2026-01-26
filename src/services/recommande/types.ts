import type { StatutEnvoiResiliation } from '@/types';

/**
 * Destinataire du recommandé
 */
export interface DestinataireRecommande {
  nom: string;
  email: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
}

/**
 * Expéditeur du recommandé
 */
export interface ExpediteurRecommande {
  nom: string;
  email: string;
  adresse?: string;
  telephone?: string;
}

/**
 * Pièce jointe pour le recommandé
 */
export interface PieceJointeRecommande {
  nom: string;
  data: string; // Base64 encoded
  type: 'application/pdf' | 'image/jpeg' | 'image/png';
}

/**
 * Requête d'envoi de recommandé électronique
 */
export interface EnvoiRecommandeRequest {
  destinataire: DestinataireRecommande;
  expediteur: ExpediteurRecommande;
  objet: string;
  contenu: string;
  pieceJointe?: PieceJointeRecommande;
  referenceInterne?: string;
}

/**
 * Réponse de l'envoi de recommandé
 */
export interface EnvoiRecommandeResponse {
  success: boolean;
  trackingId?: string;
  dateEnvoi?: string;
  error?: string;
  codeErreur?: string;
}

/**
 * Statut détaillé du recommandé
 */
export interface StatutRecommandeDetail {
  trackingId: string;
  statut: StatutEnvoiResiliation;
  dateEnvoi?: string;
  dateDistribution?: string;
  dateAccuseReception?: string;
  motifEchec?: string;
}

/**
 * Interface du service de recommandé électronique
 * À implémenter par les différents providers (AR24, Maileva, etc.)
 */
export interface IRecommandeService {
  /**
   * Envoie un recommandé électronique
   */
  envoyer(request: EnvoiRecommandeRequest): Promise<EnvoiRecommandeResponse>;

  /**
   * Récupère le statut d'un recommandé
   */
  getStatut(trackingId: string): Promise<StatutRecommandeDetail>;

  /**
   * Vérifie si le service est disponible
   */
  isAvailable(): Promise<boolean>;

  /**
   * Nom du provider
   */
  readonly providerName: string;
}
