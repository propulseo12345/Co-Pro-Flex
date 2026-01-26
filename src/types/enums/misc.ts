/**
 * Types de lots
 */
export enum LotType {
  APPARTEMENT = 'APPARTEMENT',
  STUDIO = 'STUDIO',
  PARKING = 'PARKING',
  CAVE = 'CAVE',
  COMMERCE = 'COMMERCE',
  LOCAL_COMMERCIAL = 'LOCAL_COMMERCIAL',
  BUREAU = 'BUREAU',
  GRENIER = 'GRENIER',
  LOCAL_VELO = 'LOCAL_VELO',
  GARAGE = 'GARAGE',
  MAISON = 'MAISON',
  LOGE = 'LOGE'
}

/**
 * Types de contrats
 */
export enum ContratType {
  ASCENSEUR = 'ASCENSEUR',
  CHAUFFAGE = 'CHAUFFAGE',
  NETTOYAGE = 'NETTOYAGE',
  MENAGE = 'MENAGE',
  ESPACES_VERTS = 'ESPACES_VERTS',
  SECURITE = 'SECURITE',
  ASSURANCE = 'ASSURANCE',
  SYNDIC = 'SYNDIC',
  EAU = 'EAU',
  ELECTRICITE = 'ELECTRICITE',
  TOITURE = 'TOITURE',
  FACADE = 'FACADE',
  INTERPHONE = 'INTERPHONE',
  PORTAIL = 'PORTAIL',
  JURIDIQUE = 'JURIDIQUE',
  MAINTENANCE = 'MAINTENANCE',
  AUTRE = 'AUTRE'
}

/**
 * Catégories de documents
 */
export enum DocumentCategorie {
  PV_AG = 'PV_AG',
  REGLEMENT = 'REGLEMENT',
  CONTRAT = 'CONTRAT',
  FACTURE = 'FACTURE',
  DIAGNOSTIC = 'DIAGNOSTIC',
  CORRESPONDANCE = 'CORRESPONDANCE',
  PLAN = 'PLAN',
  PHOTO = 'PHOTO',
  ORDRE_SERVICE = 'ORDRE_SERVICE',
  AUTRE = 'AUTRE'
}

/**
 * Types de documents (pour ventes)
 */
export enum DocumentType {
  PRE_ETAT_DATE = 'PRE_ETAT_DATE',
  ETAT_DATE = 'ETAT_DATE',
  CERTIFICAT_ARTICLE_20 = 'CERTIFICAT_ARTICLE_20',
  DIAGNOSTIC = 'DIAGNOSTIC',
  PV_AG = 'PV_AG',
  REGLEMENT = 'REGLEMENT',
  CARNET_ENTRETIEN = 'CARNET_ENTRETIEN',
  COMPROMIS = 'COMPROMIS',
  PDF = 'PDF',
  IMAGE = 'IMAGE',
  AUTRE = 'AUTRE'
}

/**
 * Types de documents techniques
 */
export enum DocumentTechniqueType {
  DTA = 'DTA',
  DIAGNOSTIC_PLOMB = 'DIAGNOSTIC_PLOMB',
  DIAGNOSTIC_ELECTRICITE = 'DIAGNOSTIC_ELECTRICITE',
  DIAGNOSTIC_GAZ = 'DIAGNOSTIC_GAZ',
  DPE_COLLECTIF = 'DPE_COLLECTIF',
  CONTROLE_ASCENSEUR = 'CONTROLE_ASCENSEUR',
  CONTROLE_EXTINCTEURS = 'CONTROLE_EXTINCTEURS',
  CONTROLE_CHAUFFERIE = 'CONTROLE_CHAUFFERIE',
  GARANTIE_DECENNALE = 'GARANTIE_DECENNALE',
  GARANTIE_PARFAIT_ACHEVEMENT = 'GARANTIE_PARFAIT_ACHEVEMENT',
  RAPPORT_SECURITE = 'RAPPORT_SECURITE',
  AUTRE = 'AUTRE'
}

/**
 * Niveaux d'urgence
 */
export enum UrgenceLevel {
  BASSE = 'BASSE',
  NORMALE = 'NORMALE',
  MOYENNE = 'MOYENNE',
  HAUTE = 'HAUTE',
  CRITIQUE = 'CRITIQUE'
}

/**
 * Modes d'échéancier
 */
export enum EcheancierMode {
  UNIQUE = 'UNIQUE',
  UNE_FOIS = 'UNE_FOIS',
  SEMESTRIEL = 'SEMESTRIEL',
  TRIMESTRIEL = 'TRIMESTRIEL',
  PERSONNALISE = 'PERSONNALISE'
}

/**
 * Préférence de communication
 */
export enum PreferenceCommunication {
  EMAIL = 'EMAIL',
  COURRIER = 'COURRIER',
  LES_DEUX = 'LES_DEUX'
}

/**
 * Mode de recommandé
 */
export enum ModeRecommande {
  ELECTRONIQUE = 'ELECTRONIQUE',
  POSTAL = 'POSTAL'
}

/**
 * Mode de paiement
 */
export enum ModePaiement {
  VIREMENT = 'VIREMENT',
  CHEQUE = 'CHEQUE',
  PRELEVEMENT = 'PRELEVEMENT',
  ESPECES = 'ESPECES'
}

/**
 * Type de compte comptable
 */
export enum TypeCompte {
  ACTIF = 'ACTIF',
  PASSIF = 'PASSIF',
  CHARGE = 'CHARGE',
  PRODUIT = 'PRODUIT'
}

/**
 * Catégories de forum
 */
export enum CategoriForum {
  GENERAL = 'GENERAL',
  TRAVAUX = 'TRAVAUX',
  VOISINAGE = 'VOISINAGE',
  ANNONCES = 'ANNONCES'
}

/**
 * Types d'événements
 */
export enum TypeEvenement {
  FETE = 'FETE',
  REUNION = 'REUNION',
  TRAVAUX = 'TRAVAUX',
  AUTRE = 'AUTRE'
}

/**
 * Types de litiges
 */
export enum TypeLitige {
  VOISINAGE = 'VOISINAGE',
  TRAVAUX = 'TRAVAUX',
  CHARGES = 'CHARGES',
  AUTRE = 'AUTRE'
}

/**
 * Statuts de litiges
 */
export enum StatutLitige {
  OUVERT = 'OUVERT',
  EN_COURS = 'EN_COURS',
  RESOLU = 'RESOLU',
  CLOS = 'CLOS'
}

/**
 * Catégories de prestataires
 */
export enum CategoriePrestataire {
  SYNDIC = 'SYNDIC',
  COPROPRIETE = 'COPROPRIETE',
  COPROFLEX = 'COPROFLEX'
}

/**
 * Domaines d'activité
 */
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
  AUTRE = 'AUTRE'
}

/**
 * Types d'ordres de service
 */
export enum TypeOrdreService {
  CLASSIQUE = 'CLASSIQUE',
  CONTRACTUEL = 'CONTRACTUEL'
}

/**
 * Types d'interventions
 */
export enum TypeIntervention {
  ENTRETIEN = 'ENTRETIEN',
  REPARATION = 'REPARATION',
  AMELIORATION = 'AMELIORATION'
}

/**
 * Catégories d'interventions
 */
export enum CategorieIntervention {
  COURANTE = 'COURANTE',
  TRAVAUX_IMPORTANTS = 'TRAVAUX_IMPORTANTS'
}

/**
 * Types de travaux prévisionnels
 */
export enum TypeTravauxPrevisionnel {
  TOITURE = 'TOITURE',
  FACADE = 'FACADE',
  CHAUFFAGE = 'CHAUFFAGE',
  ASCENSEUR = 'ASCENSEUR',
  ELECTRICITE = 'ELECTRICITE',
  PLOMBERIE = 'PLOMBERIE',
  ESPACES_VERTS = 'ESPACES_VERTS',
  ETANCHEITE = 'ETANCHEITE',
  ACCESSIBILITE = 'ACCESSIBILITE',
  SECURITE = 'SECURITE',
  AUTRE = 'AUTRE'
}

/**
 * Sous-types d'assurance
 */
export enum SousTypeAssurance {
  MRI = 'MRI',
  RC_SYNDICAT = 'RC_SYNDICAT',
  DOMMAGES_OUVRAGE = 'DOMMAGES_OUVRAGE',
  PROTECTION_JURIDIQUE = 'PROTECTION_JURIDIQUE',
  AUTRE = 'AUTRE'
}

/**
 * Origines des versements fonds ALUR
 */
export enum OrigineFondsALUR {
  APPEL_FONDS = 'APPEL_FONDS',
  REGULARISATION = 'REGULARISATION',
  VENTE = 'VENTE'
}

/**
 * Types de tantièmes
 */
export enum TypeTantieme {
  GENERAL = 'GENERAL',
  BATIMENT_A = 'BATIMENT_A',
  ASCENSEUR = 'ASCENSEUR'
}

/**
 * Niveaux de confidentialité
 */
export enum NiveauConfidentialite {
  PUBLIC = 'PUBLIC',
  CS_ONLY = 'CS_ONLY',
  SYNDIC_ONLY = 'SYNDIC_ONLY',
  CONFIDENTIEL = 'CONFIDENTIEL'
}

/**
 * Types de rapports
 */
export enum TypeRapport {
  FINANCIER = 'FINANCIER',
  TECHNIQUE = 'TECHNIQUE',
  JURIDIQUE = 'JURIDIQUE',
  PERSONNALISE = 'PERSONNALISE'
}

/**
 * Statuts de rapports
 */
export enum StatutRapport {
  GENERE = 'GENERE',
  EN_COURS = 'EN_COURS',
  ERREUR = 'ERREUR'
}
