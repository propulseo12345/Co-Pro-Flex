/**
 * Types pour le Mode Projecteur AG
 *
 * Vue read-only pour afficher les votes en temps réel sur un projecteur/écran
 */

import type { MajorityType } from '@/lib/constants/resolutions';

/**
 * Données de session projecteur
 * Contrat JSON entre la page session et la vue projecteur
 * Stocké dans localStorage avec clé: `ag-projector-data-${agId}`
 */
export interface ProjectorSessionData {
  // Métadonnées
  agId: string;
  agTitle: string;
  agDate: string;
  coproprieteNom: string;
  lastUpdated: string;        // ISO timestamp
  version: number;            // Incrément pour détection de changements

  // État de la session
  sessionStarted: boolean;
  sessionPaused: boolean;
  sessionEnded: boolean;

  // Résolution courante
  currentResolution: ProjectorResolution | null;
  resolutionIndex: number;
  totalResolutions: number;
  completedResolutions: string[];

  // Participation
  quorum: ProjectorQuorum;

  // Sécurité
  accessToken: string;
  tokenCreatedAt: string;

  // URL pour voter (QR code)
  voteUrl: string;
}

/**
 * Résolution affichée sur le projecteur
 */
export interface ProjectorResolution {
  id: string;
  numero: number;
  titre: string;
  texte?: string;
  majorite: MajorityType;
  majoriteLabel: string;      // "Article 24", "Article 25", etc.
  isInformation: boolean;     // Point d'information sans vote

  // Statut du vote
  voteStatus: ProjectorVoteStatus;

  // Résultats (null si pas encore de votes)
  stats: ProjectorVoteStats | null;
  result: ProjectorVoteResult | null;
}

/**
 * Statut du vote pour une résolution
 */
export type ProjectorVoteStatus = 'waiting' | 'in_progress' | 'closed';

/**
 * Statistiques de vote pour affichage
 */
export interface ProjectorVoteStats {
  pour: number;               // Tantièmes pour
  contre: number;             // Tantièmes contre
  abstention: number;         // Tantièmes abstention
  nonVote: number;            // Tantièmes non votés
  totalExprime: number;       // pour + contre + abstention
  totalTantiemes: number;     // Tous les tantièmes de la copropriété

  // Pourcentages pour les barres de progression
  pourcentagePour: number;
  pourcentageContre: number;
  pourcentageAbstention: number;
  pourcentageNonVote: number;
}

/**
 * Résultat du vote
 */
export interface ProjectorVoteResult {
  adopted: boolean;
  reason: string;
  isPasserelle?: boolean;
  passerelleType?: 'PASSERELLE_25_1' | 'PASSERELLE_26_1';
}

/**
 * Informations de quorum
 */
export interface ProjectorQuorum {
  required: number;           // Seuil en tantièmes requis
  current: number;            // Tantièmes présents/représentés/correspondance
  reached: boolean;           // Quorum atteint ou non
  percentagePresent: number;  // Pourcentage de participation
  totalCoproprietaires: number;
  presentCount: number;       // Nombre de copropriétaires présents
  representedCount: number;   // Nombre de copropriétaires représentés
  correspondanceCount: number; // Nombre de votes par correspondance
}

/**
 * Statut de synchronisation du projecteur
 */
export type ProjectorSyncStatus =
  | 'connecting'      // Connexion initiale
  | 'connected'       // Connecté, attente de données
  | 'synced'          // Synchronisé avec données fraîches
  | 'stale'           // Données > 30s sans mise à jour
  | 'disconnected'    // Déconnecté (localStorage inaccessible)
  | 'error';          // Erreur

/**
 * État d'affichage du projecteur
 */
export type ProjectorDisplayState =
  | 'loading'             // Chargement initial
  | 'invalid_token'       // Token invalide ou expiré
  | 'waiting_session'     // Session non démarrée
  | 'session_paused'      // Session en pause
  | 'between_resolutions' // Entre deux résolutions
  | 'vote_in_progress'    // Vote en cours
  | 'vote_closed'         // Vote clôturé, résultat affiché
  | 'information_point'   // Point d'information (sans vote)
  | 'session_ended'       // Session terminée
  | 'error';              // Erreur technique

/**
 * Token d'accès pour URL sécurisée du projecteur
 */
export interface ProjectorAccessToken {
  token: string;
  agId: string;
  createdAt: string;
  expiresAt: string;
  createdBy?: string;
}

/**
 * Options du hook useProjectorSync
 */
export interface UseProjectorSyncOptions {
  agId: string;
  token: string;
  pollingInterval?: number;   // Défaut: 500ms
  staleThreshold?: number;    // Défaut: 30000ms (30s)
  onDataUpdate?: (data: ProjectorSessionData) => void;
  onError?: (error: Error) => void;
}

/**
 * Retour du hook useProjectorSync
 */
export interface UseProjectorSyncReturn {
  data: ProjectorSessionData | null;
  syncStatus: ProjectorSyncStatus;
  displayState: ProjectorDisplayState;
  lastSyncTime: Date | null;
  error: Error | null;
  isValidToken: boolean;

  // Contrôles manuels
  forceSync: () => void;
  disconnect: () => void;
}

/**
 * Clés localStorage pour le projecteur
 */
export const PROJECTOR_STORAGE_KEYS = {
  DATA: (agId: string) => `ag-projector-data-${agId}`,
  TOKEN: (agId: string) => `ag-projector-token-${agId}`,
} as const;

/**
 * Configuration par défaut du projecteur
 */
export const PROJECTOR_CONFIG = {
  POLLING_INTERVAL: 500,      // ms
  STALE_THRESHOLD: 30000,     // 30s
  TOKEN_EXPIRY_HOURS: 24,
} as const;
