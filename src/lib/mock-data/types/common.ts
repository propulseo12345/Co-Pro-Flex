/**
 * Mock Data - Types communs et énumérations
 *
 * @description Types partagés entre toutes les entités mock
 *              Alignés sur le futur schéma Supabase
 *
 * @author Migration CoProFlex
 * @created 2025-01-19
 */

// ============================================
// TYPES DE BASE (Supabase-ready)
// ============================================

/**
 * Entité de base avec timestamps
 * Toutes les entités mock héritent de ce type
 */
export interface BaseEntity {
  id: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Entité avec soft delete
 */
export interface SoftDeletableEntity extends BaseEntity {
  deleted_at?: string | null;
  is_deleted?: boolean;
}

/**
 * Entité avec copropriété
 */
export interface CoproprieteOwnedEntity extends BaseEntity {
  copropriete_id: string;
}

// ============================================
// STATUTS GÉNÉRIQUES
// ============================================

export enum StatutGenerique {
  ACTIF = 'ACTIF',
  INACTIF = 'INACTIF',
  ARCHIVE = 'ARCHIVE',
  SUPPRIME = 'SUPPRIME',
}

export enum PrioriteNiveau {
  BASSE = 'BASSE',
  NORMALE = 'NORMALE',
  MOYENNE = 'MOYENNE',
  HAUTE = 'HAUTE',
  URGENTE = 'URGENTE',
}

// ============================================
// STATUTS FACTURES & PAIEMENTS
// ============================================

export enum FactureStatut {
  A_CATEGORISER = 'A_CATEGORISER',
  A_PAYER = 'A_PAYER',
  EN_ATTENTE = 'EN_ATTENTE',
  PAYEE = 'PAYEE',
  ANNULEE = 'ANNULEE',
  LITIGE = 'LITIGE',
}

export enum TypeDocument {
  FACTURE = 'FACTURE',
  AVOIR = 'AVOIR',
  DEVIS = 'DEVIS',
  CONTRAT = 'CONTRAT',
  ATTESTATION = 'ATTESTATION',
}

export enum MotifAvoir {
  ERREUR_FACTURATION = 'ERREUR_FACTURATION',
  REMISE_COMMERCIALE = 'REMISE_COMMERCIALE',
  RETOUR_MARCHANDISE = 'RETOUR_MARCHANDISE',
  ANNULATION_PRESTATION = 'ANNULATION_PRESTATION',
  AUTRE = 'AUTRE',
}

export enum PaiementStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  PAYE = 'PAYE',
  PARTIEL = 'PARTIEL',
  EN_RETARD = 'EN_RETARD',
  ANNULE = 'ANNULE',
}

export enum ModePaiement {
  VIREMENT = 'VIREMENT',
  CHEQUE = 'CHEQUE',
  PRELEVEMENT = 'PRELEVEMENT',
  CB = 'CB',
  ESPECES = 'ESPECES',
}

// ============================================
// STATUTS BUDGET & COMPTABILITÉ
// ============================================

export enum BudgetStatut {
  BROUILLON = 'BROUILLON',
  EN_ATTENTE_VOTE = 'EN_ATTENTE_VOTE',
  VOTE = 'VOTE',
  APPROUVE = 'APPROUVE',
  REJETE = 'REJETE',
  CLOTURE = 'CLOTURE',
}

export enum AppelFondsStatut {
  BROUILLON = 'BROUILLON',
  EMIS = 'EMIS',
  EN_COURS = 'EN_COURS',
  PARTIELLEMENT_PAYE = 'PARTIELLEMENT_PAYE',
  CLOTURE = 'CLOTURE',
  ANNULE = 'ANNULE',
}

export enum BudgetType {
  FONCTIONNEMENT = 'FONCTIONNEMENT',
  TRAVAUX = 'TRAVAUX',
  ALUR = 'ALUR',
}

export enum TypeDepense {
  EAU = 'eau',
  ELECTRICITE = 'electricite',
  ENTRETIEN = 'entretien',
  ASSURANCE = 'assurance',
  TRAVAUX = 'travaux',
  MENAGE = 'menage',
  ASCENSEUR = 'ascenseur',
  PLOMBERIE = 'plomberie',
  ESPACES_VERTS = 'espaces_verts',
  DIVERS = 'divers',
}

export enum TypeCompte {
  ACTIF = 'ACTIF',
  PASSIF = 'PASSIF',
  CHARGE = 'CHARGE',
  PRODUIT = 'PRODUIT',
}

export enum DepenseStatut {
  BROUILLON = 'BROUILLON',
  A_VALIDER = 'A_VALIDER',
  VALIDEE = 'VALIDEE',
  COMPTABILISEE = 'COMPTABILISEE',
  REJETEE = 'REJETEE',
}

// ============================================
// STATUTS ORDRES DE SERVICE
// ============================================

export enum OrdreServiceStatut {
  BROUILLON = 'BROUILLON',
  ENVOYE = 'ENVOYE',
  EN_ATTENTE_PRESTATAIRE = 'EN_ATTENTE_PRESTATAIRE',
  INTERVENTION_PROGRAMMEE = 'INTERVENTION_PROGRAMMEE',
  INTERVENTION_REALISEE = 'INTERVENTION_REALISEE',
  CLOTURE = 'CLOTURE',
  ANNULE = 'ANNULE',
}

export enum TypeOrdre {
  CLASSIQUE = 'CLASSIQUE',
  CONTRACTUEL = 'CONTRACTUEL',
  URGENT = 'URGENT',
}

// ============================================
// STATUTS CONTRATS
// ============================================

export enum ContratStatut {
  ACTIF = 'ACTIF',
  A_RENOUVELER = 'A_RENOUVELER',
  EXPIRE = 'EXPIRE',
  RESILIE = 'RESILIE',
  EN_ATTENTE = 'EN_ATTENTE',
}

export enum ContratType {
  MAINTENANCE = 'MAINTENANCE',
  ASSURANCE = 'ASSURANCE',
  SERVICE = 'SERVICE',
  PRESTATION = 'PRESTATION',
}

// ============================================
// STATUTS VENTES
// ============================================

export enum VenteStatut {
  EN_COURS = 'EN_COURS',
  SUSPENDUE = 'SUSPENDUE',
  FINALISEE = 'FINALISEE',
  ANNULEE = 'ANNULEE',
}

export enum VenteEtapeWorkflow {
  DEMANDE = 'demande',
  PRE_ETAT_DATE = 'pre_etat_date',
  ETAT_DATE = 'etat_date',
  ENVOI_NOTAIRE = 'envoi_notaire',
  SIGNATURE_ACTE = 'signature_acte',
  CLOTURE_COMPTE = 'cloture_compte',
}

export enum DocumentVenteStatut {
  EN_ATTENTE = 'en_attente',
  DISPONIBLE = 'disponible',
  SIGNE = 'signe',
  EXPIRE = 'expire',
}

export enum DocumentVenteType {
  PRE_ETAT_DATE = 'PRE_ETAT_DATE',
  ETAT_DATE = 'ETAT_DATE',
  CERTIFICAT_ARTICLE_20 = 'CERTIFICAT_ARTICLE_20',
  COMPROMIS = 'COMPROMIS',
  DIAGNOSTIC = 'DIAGNOSTIC',
  PV_AG = 'PV_AG',
  AUTRE = 'AUTRE',
}

// ============================================
// STATUTS IMPAYÉS & RECOUVREMENT
// ============================================

export enum ImpayeStatut {
  EN_RETARD = 'EN_RETARD',
  RELANCE_1 = 'RELANCE_1',
  RELANCE_2 = 'RELANCE_2',
  RELANCE_3 = 'RELANCE_3',
  MISE_EN_DEMEURE = 'MISE_EN_DEMEURE',
  CONTENTIEUX = 'CONTENTIEUX',
  REGLE = 'REGLE',
  IRRECOVRABLE = 'IRRECOVRABLE',
}

// ============================================
// STATUTS ASSEMBLÉES GÉNÉRALES
// ============================================

export enum AGStatut {
  PLANIFIEE = 'PLANIFIEE',
  CONVOCATIONS_ENVOYEES = 'CONVOCATIONS_ENVOYEES',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
}

export enum AGType {
  ORDINAIRE = 'ORDINAIRE',
  EXTRAORDINAIRE = 'EXTRAORDINAIRE',
  MIXTE = 'MIXTE',
}

export enum ResolutionStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  ADOPTEE = 'ADOPTEE',
  REJETEE = 'REJETEE',
  REPORTEE = 'REPORTEE',
}

export enum TypeVote {
  MAJORITE_SIMPLE = 'MAJORITE_SIMPLE', // Article 24
  MAJORITE_ABSOLUE = 'MAJORITE_ABSOLUE', // Article 25
  DOUBLE_MAJORITE = 'DOUBLE_MAJORITE', // Article 26
  UNANIMITE = 'UNANIMITE',
}

// ============================================
// STATUTS LITIGES
// ============================================

export enum LitigeStatut {
  OUVERT = 'OUVERT',
  EN_COURS = 'EN_COURS',
  MEDIATION = 'MEDIATION',
  CONTENTIEUX = 'CONTENTIEUX',
  RESOLU = 'RESOLU',
  FERME = 'FERME',
}

export enum LitigeType {
  VOISINAGE = 'VOISINAGE',
  TRAVAUX = 'TRAVAUX',
  CHARGES = 'CHARGES',
  SINISTRE = 'SINISTRE',
  AUTRE = 'AUTRE',
}

// ============================================
// RÔLES UTILISATEURS
// ============================================

export enum UserRole {
  ADMIN = 'ADMIN',
  SYNDIC = 'SYNDIC',
  PRESIDENT_CS = 'PRESIDENT_CS',
  MEMBRE_CS = 'MEMBRE_CS',
  COPROPRIETAIRE = 'COPROPRIETAIRE',
  LOCATAIRE = 'LOCATAIRE',
  PRESTATAIRE = 'PRESTATAIRE',
}

// ============================================
// DOMAINES D'ACTIVITÉ PRESTATAIRES
// ============================================

export enum DomaineActivite {
  PLOMBERIE = 'PLOMBERIE',
  ELECTRICITE = 'ELECTRICITE',
  CHAUFFAGE = 'CHAUFFAGE',
  ASCENSEUR = 'ASCENSEUR',
  MENAGE = 'MENAGE',
  ESPACES_VERTS = 'ESPACES_VERTS',
  SERRURERIE = 'SERRURERIE',
  PEINTURE = 'PEINTURE',
  ASSURANCE = 'ASSURANCE',
  JURIDIQUE = 'JURIDIQUE',
  ARCHITECTURE = 'ARCHITECTURE',
  TOITURE = 'TOITURE',
  FACADE = 'FACADE',
  CLIMATISATION = 'CLIMATISATION',
  INTERPHONE = 'INTERPHONE',
  PORTAIL = 'PORTAIL',
  SECURITE_INCENDIE = 'SECURITE_INCENDIE',
  AUTRE = 'AUTRE',
}

export enum CategoriePrestataire {
  SYNDIC = 'SYNDIC', // Base interne du syndic
  COPROFLEX = 'COPROFLEX', // Marketplace CoProFlex
  EXTERNE = 'EXTERNE', // Ajouté manuellement
}

// ============================================
// CATÉGORIES DOCUMENTS GED
// ============================================

export enum CategorieDocument {
  PV_AG = 'PV_AG',
  REGLEMENT = 'REGLEMENT',
  FACTURE = 'FACTURE',
  CONTRAT = 'CONTRAT',
  DIAGNOSTIC = 'DIAGNOSTIC',
  ASSURANCE = 'ASSURANCE',
  TRAVAUX = 'TRAVAUX',
  CORRESPONDANCE = 'CORRESPONDANCE',
  JURIDIQUE = 'JURIDIQUE',
  COMPTABILITE = 'COMPTABILITE',
  AUTRE = 'AUTRE',
}

// ============================================
// TYPES FORUM & COMMUNICATION
// ============================================

export enum ForumCategorie {
  ANNONCES = 'ANNONCES',
  TRAVAUX = 'TRAVAUX',
  VOISINAGE = 'VOISINAGE',
  QUESTIONS = 'QUESTIONS',
  SUGGESTIONS = 'SUGGESTIONS',
  AUTRE = 'AUTRE',
}

export enum EventType {
  REUNION = 'REUNION',
  FETE = 'FETE',
  TRAVAUX = 'TRAVAUX',
  AUTRE = 'AUTRE',
}

// ============================================
// TYPES UTILITAIRES
// ============================================

/**
 * Type pour les montants monétaires (en centimes pour éviter les erreurs de flottants)
 */
export type MontantCentimes = number;

/**
 * Type pour les tantièmes
 */
export type Tantiemes = number;

/**
 * Type pour les pourcentages (0-100)
 */
export type Pourcentage = number;

/**
 * Adresse postale
 */
export interface Adresse {
  ligne1: string;
  ligne2?: string;
  codePostal: string;
  ville: string;
  pays?: string;
}

/**
 * Contact (personne ou entreprise)
 */
export interface Contact {
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  telephoneUrgence?: string;
  adresse?: Adresse;
}

/**
 * Pièce jointe générique
 */
export interface PieceJointe {
  id: string;
  nom: string;
  type: string; // MIME type ou extension
  taille?: string;
  url: string;
  dateAjout: string;
}

/**
 * Entrée d'historique générique
 */
export interface HistoriqueEntry {
  id: string;
  date: string;
  auteur?: string;
  action: string;
  description?: string;
  champModifie?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
}

// ============================================
// LABELS POUR L'UI (mapping enum → label FR)
// ============================================

export const STATUT_LABELS: Record<string, string> = {
  // Factures
  A_CATEGORISER: 'À catégoriser',
  A_PAYER: 'À payer',
  EN_ATTENTE: 'En attente',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
  LITIGE: 'En litige',
  // Budget
  BROUILLON: 'Brouillon',
  EN_ATTENTE_VOTE: 'En attente de vote',
  VOTE: 'Voté',
  APPROUVE: 'Approuvé',
  REJETE: 'Rejeté',
  CLOTURE: 'Clôturé',
  // Ordres de service
  ENVOYE: 'Envoyé',
  EN_ATTENTE_PRESTATAIRE: 'En attente prestataire',
  INTERVENTION_PROGRAMMEE: 'Intervention programmée',
  INTERVENTION_REALISEE: 'Intervention réalisée',
  ANNULE: 'Annulé',
  // Contrats
  ACTIF: 'Actif',
  A_RENOUVELER: 'À renouveler',
  EXPIRE: 'Expiré',
  RESILIE: 'Résilié',
  // Ventes
  EN_COURS: 'En cours',
  SUSPENDUE: 'Suspendue',
  FINALISEE: 'Finalisée',
  // AG
  PLANIFIEE: 'Planifiée',
  CONVOCATIONS_ENVOYEES: 'Convocations envoyées',
  TERMINEE: 'Terminée',
  // Résolutions
  ADOPTEE: 'Adoptée',
  REPORTEE: 'Reportée',
  // Impayés
  EN_RETARD: 'En retard',
  RELANCE_1: 'Relance 1',
  RELANCE_2: 'Relance 2',
  RELANCE_3: 'Relance 3',
  MISE_EN_DEMEURE: 'Mise en demeure',
  CONTENTIEUX: 'Contentieux',
  REGLE: 'Réglé',
  IRRECOVRABLE: 'Irrécupérable',
};

export const TYPE_DEPENSE_LABELS: Record<TypeDepense, string> = {
  [TypeDepense.EAU]: 'Eau',
  [TypeDepense.ELECTRICITE]: 'Électricité',
  [TypeDepense.ENTRETIEN]: 'Entretien',
  [TypeDepense.ASSURANCE]: 'Assurance',
  [TypeDepense.TRAVAUX]: 'Travaux',
  [TypeDepense.MENAGE]: 'Ménage',
  [TypeDepense.ASCENSEUR]: 'Ascenseur',
  [TypeDepense.PLOMBERIE]: 'Plomberie',
  [TypeDepense.ESPACES_VERTS]: 'Espaces verts',
  [TypeDepense.DIVERS]: 'Divers',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.SYNDIC]: 'Syndic',
  [UserRole.PRESIDENT_CS]: 'Président CS',
  [UserRole.MEMBRE_CS]: 'Membre CS',
  [UserRole.COPROPRIETAIRE]: 'Copropriétaire',
  [UserRole.LOCATAIRE]: 'Locataire',
  [UserRole.PRESTATAIRE]: 'Prestataire',
};
