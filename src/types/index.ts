/**
 * Types CoProFlex
 *
 * Exports centralisés de tous les types TypeScript
 *
 * Strategy:
 * - Legacy types are the primary source for backward compatibility
 * - New IXxx interfaces from models are exported for the new modular architecture
 * - Common types provide shared utilities
 */

// Re-export legacy types (primary source for backward compatibility)
export * from './legacy';

// Types communs (utilitaires partagés)
export * from './common';

// Export only the new IXxx interfaces from models (no conflicts with legacy)
export type {
  // User
  IUser,
  IUserCredentials,
  IUserSession,
  // Copropriété
  ICopropriete,
  // Copropriétaire
  ILot,
  ICoproprietaire,
  // AG
  IAssembleeGenerale,
  IResolution,
  IVote,
  IParticipant,
  IConvocation,
  // Finance
  IBudget,
  IBudgetCategorie,
  IBudgetPoste,
  IAppelFonds,
  ILigneAppel,
  IImpaye,
  IActionImpaye,
  IPaiement,
  DepenseEtendue,
  TauxTVA,
  // Maintenance
  IPrestataire,
  IContrat,
  IOrdreService,
  IHistoriqueOS,
  ContactSurPlace,
  DocumentSyndic,
  ModeEnvoiResiliation,
  StatutEnvoiResiliation,
  // Planification automatique
  FrequenceIntervention,
  PlanificationContrat,
  OrdreServicePlanifie,
  // Document
  IDocument,
  // Communication
  IMessage,
  IConversation,
  IPost,
  ICommentaire,
  IReaction,
  IEvenement,
  // Notification
  NotificationType,
  INotification,
  IAlerte,
} from './models';

// Export planification constants
export { FREQUENCE_LABELS, FREQUENCE_NB_INTERVENTIONS } from './models/maintenance';

// Export enums that don't conflict with legacy
export {
  // Roles enum (new)
  UserRole as UserRoleEnum,
  ROLE_PERMISSIONS,
  // Statuts enums (new)
  AGStatut,
  ResolutionStatut,
  OrdreServiceStatut,
  ContratStatut,
  ImpayeStatut,
  DocumentStatut as DocumentStatutEnum,
  BudgetStatut,
  ExerciceStatut,
  VenteStatut,
  PaiementStatut,
  RecommandeStatut,
  FeuillePresenceStatut,
  TravauxPrevisionnelStatut,
  ContratSyndicStatut,
  // Vote types enums
  VotingArticle,
  VoteValue,
  VOTING_ARTICLE_DESCRIPTIONS,
  AGType,
  PresenceMode,
  TypeMajorite,
  TypePasserelle as TypePasserelleEnum,
  ResultatVote,
  // Misc enums
  LotType,
  ContratType,
  DocumentCategorie,
  DocumentType as DocumentTypeEnum,
  DocumentTechniqueType,
  UrgenceLevel,
  EcheancierMode,
  PreferenceCommunication,
  ModeRecommande as ModeRecommandeEnum,
  ModePaiement,
  TypeCompte as TypeCompteEnum,
  CategoriForum,
  TypeEvenement,
  TypeLitige,
  StatutLitige,
  CategoriePrestataire as CategoriePrestatireEnum,
  DomaineActivite as DomaineActiviteEnum,
  TypeOrdreService as TypeOrdreServiceEnum,
  TypeIntervention,
  CategorieIntervention as CategorieInterventionEnum,
  TypeTravauxPrevisionnel as TypeTravauxPrevisionnelEnum,
  SousTypeAssurance as SousTypeAssuranceEnum,
  OrigineFondsALUR,
  TypeTantieme,
  NiveauConfidentialite,
  TypeRapport,
  StatutRapport,
  ORDRE_SERVICE_TRANSITIONS,
  // AG Format (loi ELAN)
  AGFormat,
  AG_FORMAT_LABELS,
  AG_FORMAT_DESCRIPTIONS,
  VISIO_PROVIDER_LABELS,
  detectVisioProvider,
  requiresAdresse,
  requiresVisioUrl,
  isVisioUrlMandatory,
  migrateFormat,
  getVisioInstructions,
} from './enums';

// Export type pour VisioProvider
export type { VisioProvider } from './enums/ag-format';

// Export types Projector
export * from './projector';

// Export types Conformité (PPT, DPE, Factur-X)
export type {
  ITravauxPPT,
  IEtapeTravaux,
  IPPTCopropriete,
  ClasseDPE,
  StatutDPE,
  IDPEHistorique,
  IDPE,
  StatutFacturX,
  IFactureFacturX,
} from './models/conformite';
