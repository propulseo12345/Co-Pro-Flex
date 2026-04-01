// User & Roles
export type UserRole = 'ADMIN' | 'PRESIDENT_CS' | 'MEMBRE_CS' | 'COPROPRIETAIRE' | 'LOCATAIRE' | 'SYNDIC';

export interface User {
    id: string;
    nom: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
}

// Page 1: Paramètres
export interface AccesInvitation {
    email: string;
    role: UserRole;
    statut: 'EN_ATTENTE' | 'ACCEPTE' | 'EXPIRE';
}

export interface NiveauAcces {
    role: UserRole;
    permissions: string[];
}

export interface Tantieme {
    lotId: string;
    valeur: number;
    type: 'GENERAL' | 'BATIMENT_A' | 'ASCENSEUR';
}

export interface CleRepartition {
    id: string;
    nom: string;
    type: string;
    description?: string;
}

export interface CompteComptable {
    numero: string;
    libelle: string;
    type: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
}

export interface ParametresCopropriete {
    typesAcces: {
        invitations: AccesInvitation[];
        niveauxAcces: NiveauAcces[];
    };
    tableauBord: {
        informationsAffichees: string[];
        widgetsActifs: string[];
    };
    visibiliteInfos: {
        proprietesVisibles: string[];
        restrictionsParRole: Record<UserRole, string[]>;
    };
    informationsCopro: {
        nom: string;
        adresse: string;
        nombreLots: number;
        anneeConstruction: number;
    };
    finance: {
        tantiemes: Tantieme[];
        clesRepartition: CleRepartition[];
        planComptable: CompteComptable[];
    };
}

// Accounting
export enum TypeCompte {
    ACTIF = 'ACTIF',
    PASSIF = 'PASSIF',
    CHARGE = 'CHARGE',
    PRODUIT = 'PRODUIT'
}

export interface PlanComptable {
    id: string;
    numero: string;
    libelle: string;
    type: TypeCompte;
    niveau: number;
    compteParentId?: string;
    solde: number;
    sousComptes?: PlanComptable[];
    // Champs pour balance comparative N-1
    soldeN1?: number;           // Solde au 31/12/N-1
    mouvementDebit?: number;    // Total des mouvements débit N
    mouvementCredit?: number;   // Total des mouvements crédit N
}

export interface EcritureComptable {
    id: string;
    date: string;
    libelle: string;
    numeroJournal: string;
    numeroPiece?: string;
    debit: number;
    credit: number;
    compteId: string;
    exerciceId: string;
}

export interface Exercice {
    id: string;
    annee: string;
    dateDebut: string;
    dateFin: string;
    statut: 'EN_COURS' | 'ARRETE' | 'CLOTURE';
}

export interface Depense {
    id: string;
    date: string;
    libelle: string;
    fournisseur: string;
    montant: number;
    compteId: string;
    recuperable: number;
    deductible: number;
}

// Statuts de paiement détaillés
export type StatutPaiement = 'NON_PAYE' | 'PARTIELLEMENT_PAYE' | 'PAYE';

// Statuts de recommandé avec suivi des phases
export type StatutRecommande = 'NON_ENVOYE' | 'PREPARE' | 'ENVOYE' | 'LIVRE' | 'LU';
export type ModeRecommande = 'ELECTRONIQUE' | 'POSTAL';

export interface PaiementCoproprietaire {
    coproprietaireId: string;
    montantDu: number;
    montantPaye: number;
    statutPaiement: StatutPaiement;
    datePaiement?: string;
    modePaiement?: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES';
}

export interface RecommandeCoproprietaire {
    coproprietaireId: string;
    modeEnvoi: ModeRecommande;
    statut: StatutRecommande;
    datePrepare?: string;
    dateEnvoi?: string;
    dateLivraison?: string;
    dateLecture?: string;
    numeroSuivi?: string; // Pour les recommandés électroniques
}

export interface AppelFonds {
    id: string;
    dateExigibilite: string;
    statut: 'ENVOYE' | 'EN_ATTENTE' | 'PAYE';
    montant: number;
    periode: string;
    // Lien avec projet/budget travaux
    budgetTravauxId?: string;
    devisUrl?: string;
    // Détails des paiements et recommandés
    paiements?: PaiementCoproprietaire[];
    recommandes?: RecommandeCoproprietaire[];
}

// Types pour les échéances d'appels de fonds
export type ModeEcheancier = 'UNE_FOIS' | 'SEMESTRIEL' | 'TRIMESTRIEL' | 'PERSONNALISE';

export interface Echeance {
    id: string;
    dateExigibilite: string;
    montantTotal: number;
    ordre: number; // 1er appel, 2ème appel, etc.
    description?: string;
}

export interface EcheancierAppelsFonds {
    id: string;
    resolutionId?: string;
    budgetId?: string;
    modeEcheancier: ModeEcheancier;
    montantTotal: number;
    dateDebut?: string;
    echeances: Echeance[];
    cleRepartitionId?: string;
}

export interface Budget {
    id: string;
    annee: number;
    poste: string;
    montantN1: number; // N-1
    montantN: number;  // N
    montantN1_Prev: number; // N+1
}

export interface MouvementBancaire {
    id: string;
    date: string;
    libelle: string;
    montant: number;
    statut: 'A_CATEGORISER' | 'CATEGORISE';
    compteId?: string;
}

export interface BudgetTravaux {
    id: string;
    nom: string;
    description: string;
    montantVote: number;
    montantRealise: number;
    cleRepartitionId: string;
    statut: 'EN_COURS' | 'TERMINE' | 'A_VENIR';
    devisUrl?: string; // Lien vers le devis du projet
}

// Fonds ALUR (Loi ALUR - Fonds travaux obligatoire)
export interface VersementFondsALUR {
    id: string;
    lotId: string;
    coproprietaireId: string;
    montantVerse: number;
    dateVersement: string;
    annee: number;
    origine: 'APPEL_FONDS' | 'REGULARISATION' | 'VENTE';
}

export interface SoldeFondsALUR {
    lotId: string;
    coproprietaireId: string;
    soldeActuel: number;
    versements: VersementFondsALUR[];
}

export interface Facture {
    id: string;
    date: string;
    fournisseur: string;
    montant: number;
    statut: 'A_PAYER' | 'PAYEE' | 'EN_ATTENTE_VALIDATION';
    iban?: string;
    bic?: string;
    reference?: string;
}

export interface Intervention {
    id: string;
    date: string;
    titre: string;
    description: string;
    intervenant: string;
    statut: 'PLANIFIEE' | 'TERMINEE' | 'EN_COURS';
    type: 'ENTRETIEN' | 'REPARATION' | 'AMELIORATION';
}

export interface Contrat {
    id: string;
    nom: string;
    fournisseur: string;
    type: 'MAINTENANCE' | 'ASSURANCE' | 'AUTRE';
    dateDebut: string;
    dateFin: string;
    coutAnnuel: number;
    statut: 'ACTIF' | 'RESILIE' | 'A_RENOUVELER';
}

export interface Fournisseur {
    id: string;
    nom: string;
    metier: string;
    telephone: string;
    email: string;
    adresse: string;
    note?: number;
}

// Ordres de service - Types
export type TypeOrdreService = 'CLASSIQUE' | 'CONTRACTUEL';

export type StatutOrdreService =
  | 'BROUILLON'
  | 'A_ENVOYER'
  | 'ENVOYE'
  | 'EN_ATTENTE_PRESTATAIRE'
  | 'ACCEPTE'
  | 'REFUSE'
  | 'PLANIFIE'
  | 'INTERVENTION_PROGRAMMEE'
  | 'EN_COURS'
  | 'REALISE'
  | 'INTERVENTION_REALISEE'
  | 'FACTURE'
  | 'PAYE'
  | 'CLOTURE'
  | 'ANNULE';

export interface PieceJointeOS {
  id: string;
  nom: string;
  type: 'PDF' | 'IMAGE' | 'AUTRE';
  taille: string;
  url: string;
  dateAjout: string;
}

export interface ModificationHistoriqueOS {
  id: string;
  date: string;
  auteur: string;
  action: string;
  champModifie?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
}

export interface EmailTemplateOS {
  id: string;
  type: TypeOrdreService;
  nom: string;
  objet: string;
  corps: string;
  variablesDisponibles: string[];
}

/**
 * Contact sur place pour accueillir l'intervenant
 */
export interface ContactSurPlaceLegacy {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  coproprietaireId?: string;
}

export interface OrdreService {
  id: string;
  date: string;
  dateCreation: string;
  dateModification: string;
  titre: string;
  description: string;
  typeOrdre: TypeOrdreService;

  // Références prestataire
  fournisseurId?: string;
  fournisseurNom: string;
  fournisseurEmail?: string;
  fournisseurTelephone?: string;

  // Référence contrat (pour type CONTRACTUEL)
  contratId?: string;
  contratNom?: string;

  // Workflow
  statut: StatutOrdreService;
  dateEnvoi?: string;
  dateInterventionProgrammee?: string;
  dateInterventionRealisee?: string;
  dateCloture?: string;

  // Email
  emailObjet: string;
  emailCorps: string;

  // Pièces jointes
  piecesJointes: PieceJointeOS[];

  // Financier
  montantEstime?: number;
  montantFinal?: number;
  devisRequis?: boolean;

  // Historique
  historique: ModificationHistoriqueOS[];

  // GED
  archiveGedId?: string;
  archiveGedUrl?: string;

  // Contact sur place
  contactSurPlace?: ContactSurPlaceLegacy;
}

export interface Document {
    id: string;
    nom: string;
    type: 'PDF' | 'IMAGE' | 'AUTRE';
    categorie: 'PV_AG' | 'REGLEMENT' | 'FACTURE' | 'CONTRAT' | 'ORDRE_SERVICE' | 'AUTRE';
    dateAjout: string;
    taille: string;
}

export interface Assemblee {
    id: string;
    date: string;
    type: 'ORDINAIRE' | 'EXTRAORDINAIRE';
    statut: 'PLANIFIEE' | 'CONVOQUEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
    lieu: string;
    ordreDuJour?: Resolution[];
    feuillePresence?: FeuillePresence;
    rolesDesignes?: RolesAG;
}

// Feuille de présence
export type StatutPresence = 'PRESENT' | 'REPRESENTE' | 'ABSENT';

export interface SignaturePresence {
    id: string;
    coproprietaireId: string;
    statut: StatutPresence;
    representant?: string; // Nom du représentant si "REPRESENTE"
    signatureData?: string; // Data URL de la signature (canvas)
    dateSignature?: string;
    ipAddress?: string;
}

export interface FeuillePresence {
    id: string;
    agId: string;
    dateCreation: string;
    dateOuverture?: string; // Quand la feuille est ouverte pour signature
    dateCloture?: string; // Quand la feuille est clôturée
    statut: 'BROUILLON' | 'OUVERTE' | 'CLOTUREE';
    signatures: SignaturePresence[];
    exportPdfUrl?: string;
}

// Rôles désignés pendant l'AG
export interface RolesAG {
    presidentSeance?: {
        coproprietaireId?: string;
        nom: string;
        dateDesignation: string;
    };
    secretaireSeance?: {
        coproprietaireId?: string;
        nom: string;
        dateDesignation: string;
        /** Si secrétaire est gestionnaire du syndic */
        estGestionnaire?: boolean;
        /** Nom du syndic représenté (si gestionnaire) */
        representeSyndic?: string;
    };
    scrutateur?: {
        coproprietaireId?: string;
        nom: string;
        dateDesignation: string;
    };
    membresConseilSyndical?: Array<{
        coproprietaireId?: string;
        nom: string;
        type: 'TITULAIRE' | 'SUPPLEANT';
        dateDesignation: string;
    }>;
}

// Votes par correspondance
export type ChoixVote = 'POUR' | 'CONTRE' | 'ABSTENTION' | 'NON_VOTE';

export interface VoteResolution {
    resolutionId: string;
    choix: ChoixVote;
    dateVote: string;
}

export interface VoteCorrespondance {
    id: string;
    agId: string;
    coproprietaireId: string;
    votes: VoteResolution[];
    dateEnregistrement: string;
    dateModification?: string;
    statut: 'BROUILLON' | 'VALIDE';
}

export interface Resolution {
    id: string;
    titre: string;
    description: string;
    typeVote: 'MAJORITE_SIMPLE' | 'MAJORITE_ABSOLUE' | 'DOUBLE_MAJORITE' | 'UNANIMITE';
    resultat?: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE';
    pour?: number;
    contre?: number;
    abstention?: number;
    // Champs pour les résolutions d'appel de fonds
    echeancier?: EcheancierAppelsFonds;
    estAppelFonds?: boolean;
    // Passerelles de majorité
    passerelle?: PasserelleMajorite;
    estSecondExamen?: boolean; // Pour passerelle 26-1
}

// Passerelles de majorité légale
export type TypePasserelle = 'PASSERELLE_25_1' | 'PASSERELLE_26_1';

export interface PasserelleMajorite {
    type: TypePasserelle;
    dateActivation: string;
    conditionRemplie: boolean;
    voteInitial: {
        pour: number;
        contre: number;
        abstention: number;
        majoriteRequise: string;
    };
    secondVote?: {
        pour: number;
        contre: number;
        abstention: number;
        majoriteRequise: string;
        resultat: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE';
        dateVote: string;
    };
    mentionPV: string;
}

export interface ForumTopic {
    id: string;
    titre: string;
    auteur: string;
    dateCreation: string;
    categorie: 'GENERAL' | 'TRAVAUX' | 'VOISINAGE' | 'ANNONCES';
    nbReponses: number;
    dernierMessage?: string;
    dernierAuteur?: string;
}

export interface ForumMessage {
    id: string;
    topicId: string;
    auteur: string;
    contenu: string;
    date: string;
    isMe?: boolean;
}

export interface Event {
    id: string;
    titre: string;
    date: string;
    lieu: string;
    description: string;
    type: 'FETE' | 'REUNION' | 'TRAVAUX' | 'AUTRE';
    organisateur: string;
}

export interface Conversation {
    id: string;
    participants: string[];
    dernierMessage: string;
    dateDernierMessage: string;
    nonLu: boolean;
}

export interface PrivateMessage {
    id: string;
    conversationId: string;
    auteur: string;
    contenu: string;
    date: string;
    isMe: boolean;
}

// Page 49: Ventes
export type DocumentType = 'PRE_ETAT_DATE' | 'ETAT_DATE' | 'CERTIFICAT_ARTICLE_20' | 'DIAGNOSTIC' | 'PV_AG' | 'REGLEMENT' | 'CARNET_ENTRETIEN' | 'COMPROMIS' | 'AUTRE';

export type DocumentStatut = 'DISPONIBLE' | 'EN_ATTENTE' | 'SIGNE' | 'ENVOYE' | 'EXPIRE';

export interface SaleDocument {
    id: string;
    nom: string;
    type: DocumentType;
    dateUpload: string;
    dateSignature?: string;
    dateEnvoi?: string;
    statut: DocumentStatut;
    url: string;
    signePar?: string;
    observations?: string;
}

export interface SaleHistory {
    id: string;
    date: string;
    action: string;
    utilisateur: string;
    details?: string;
}

export interface Sale {
    id: string;
    lotIds: string[];
    lotTypes: string[];
    vendeur: string;
    vendeurId: string;
    acquereur?: string;
    acquereurId?: string;
    notaire?: string;
    dateCompromis?: string;
    dateActeAuthentique?: string;
    dateNotificationArticle6?: string;
    statut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
    documents: SaleDocument[];
    historique: SaleHistory[];
    observations?: string;
    liensOrdresService?: string[];
    dateCreation: string;
    dateModification: string;
}

// Page 54-55: Impayés
export interface Impaye {
    id: string;
    lotId: string;
    proprietaire: string;
    montantDu: number;
    dateEcheance: string;
    retard: number; // en jours
    statut: 'EN_RETARD' | 'RELANCE_1' | 'RELANCE_2' | 'CONTENTIEUX';
    derniereRelance?: string;
}

// Page 56: Litiges
export interface Litige {
    id: string;
    titre: string;
    type: 'VOISINAGE' | 'TRAVAUX' | 'CHARGES' | 'AUTRE';
    dateOuverture: string;
    statut: 'OUVERT' | 'EN_COURS' | 'RESOLU' | 'CLOS';
    parties: string[];
    description: string;
    priorite: 'BASSE' | 'MOYENNE' | 'HAUTE';
}

// Gestion des lots
export type TypeLot = 'APPARTEMENT' | 'STUDIO' | 'LOCAL_COMMERCIAL' | 'CAVE' | 'PARKING' | 'GARAGE' | 'MAISON' | 'LOGE';

export interface AdressePostale {
    rue: string;
    codePostal: string;
    ville: string;
}

export interface Coproprietaire {
    id: string;
    nom: string;
    prenom?: string;
    email: string;
    telephone?: string;
    adresse?: string;
    lot?: string;
    adressePostale?: AdressePostale;
    tantiemes?: number;
    accepteAvisElectronique?: boolean;
}

export interface Gestionnaire {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    syndicId: string;
    syndicNom: string;
}

export interface Lot {
    id: string;
    numero: string;
    type: TypeLot;
    estPrincipal: boolean;
    coproprietaireId: string;
    tantiemesGeneraux: number;
    tantiemesAscenseur?: number;
    tantiemesChauffage?: number;
    tantiemesBatiment?: number;
    autresCles?: Record<string, number>; // Clés personnalisées
}

export interface CleRepartitionPersonnalisee {
    id: string;
    nom: string;
    description?: string;
}

// Analytics & Reporting
export interface Rapport {
    id: string;
    titre: string;
    type: 'FINANCIER' | 'TECHNIQUE' | 'JURIDIQUE' | 'PERSONNALISE';
    periode: string;
    dateGeneration: string;
    statut: 'GENERE' | 'EN_COURS' | 'ERREUR';
    url?: string;
}

// ========================================
// PRESTATAIRES & CONTRATS (Système étendu)
// ========================================

// Catégories de prestataires
export type CategoriePrestataire = 'SYNDIC' | 'COPROPRIETE' | 'COPROFLEX';

// Domaines d'activité étendus
export type DomaineActivite =
  | 'PLOMBERIE'
  | 'ELECTRICITE'
  | 'CHAUFFAGE'
  | 'ASCENSEUR'
  | 'MENAGE'
  | 'ESPACES_VERTS'
  | 'SERRURERIE'
  | 'PEINTURE'
  | 'ASSURANCE'
  | 'JURIDIQUE'
  | 'ARCHITECTURE'
  | 'TOITURE'
  | 'FACADE'
  | 'CLIMATISATION'
  | 'INTERPHONE'
  | 'PORTAIL'
  | 'AUTRE';

// Types de contrat étendus
export type TypeContrat =
  | 'ASCENSEUR'
  | 'MENAGE'
  | 'EAU'
  | 'ELECTRICITE'
  | 'ASSURANCE'
  | 'ESPACES_VERTS'
  | 'CHAUFFAGE'
  | 'TOITURE'
  | 'FACADE'
  | 'INTERPHONE'
  | 'PORTAIL'
  | 'JURIDIQUE'
  | 'AUTRE';

// Statut de contrat (étendu avec BROUILLON et ARCHIVE)
export type StatutContrat = 'ACTIF' | 'RESILIE' | 'A_RENOUVELER' | 'BROUILLON' | 'EXPIRE' | 'ARCHIVE';

// Interface Prestataire étendue (remplace et étend Fournisseur)
export interface Prestataire {
  id: string;
  nom: string;
  categorie: CategoriePrestataire;
  domaines: DomaineActivite[]; // Peut avoir plusieurs domaines
  telephone: string;
  /** Téléphone urgence 24h/24 si différent */
  telephoneUrgence?: string;
  email: string;
  adresse: string;
  codePostal?: string;
  ville?: string;
  siren?: string;
  iban?: string;
  bic?: string;

  // Pour CoproFlex uniquement
  noteMoyenne?: number; // Sur 5
  nombreAvis?: number;
  certifications?: string[]; // Ex: ["Qualibat", "RGE"]

  // Métadonnées
  dateAjout: string;
  derniereIntervention?: string;
  nombreInterventions: number;

  // Notes internes (pour tous)
  notesInternes?: string;

  // Contact référent
  /** Nom du contact référent */
  contactReferent?: string;
  /** Fonction du contact référent */
  fonctionContact?: string;

  // === Champs CoproFlex Marketplace ===
  /** Rayon d'intervention en km (ex: 30km autour du code postal) */
  rayonIntervention?: number;
  /** Tarif indicatif (ex: "50-80€/h" ou "Sur devis") */
  tarifIndicatif?: string;
  /** Description des services proposés */
  description?: string;
  /** Disponibilité (ex: "Lun-Ven 8h-18h", "7j/7 urgences") */
  disponibilite?: string;
  /** Label CoproFlex certifié (prestataire vérifié) */
  labelCoproFlex?: boolean;
  /** Délai d'intervention moyen (ex: "24-48h", "Immédiat urgences") */
  delaiIntervention?: string;
  /** Année de création de l'entreprise */
  anneeCreation?: number;
  /** Nombre de salariés */
  nombreSalaries?: number;
  /** Site web */
  siteWeb?: string;
}

// Avis sur prestataires CoproFlex
export interface AvisPrestataire {
  id: string;
  prestataireId: string;
  coproprieteId: string; // Quelle copro a laissé l'avis
  note: number; // 1-5
  commentaire?: string;
  dateAvis: string;
  auteur: string; // Anonymisé ou nom du syndic
}

// Document associé à un contrat
export interface DocumentContrat {
  id: string;
  nom: string;
  type: 'CONTRAT_PDF' | 'AVENANT' | 'FACTURE' | 'ATTESTATION' | 'AUTRE';
  url: string; // Simulé
  dateUpload: string;
}

/**
 * Fréquence des interventions planifiées
 */
export type FrequenceIntervention =
  | 'UNIQUE'
  | 'MENSUELLE'
  | 'BIMESTRIELLE'
  | 'TRIMESTRIELLE'
  | 'SEMESTRIELLE'
  | 'ANNUELLE';

/**
 * Labels des fréquences
 */
export const FREQUENCE_LABELS: Record<FrequenceIntervention, string> = {
  UNIQUE: 'Unique',
  MENSUELLE: 'Mensuelle (12/an)',
  BIMESTRIELLE: 'Bimestrielle (6/an)',
  TRIMESTRIELLE: 'Trimestrielle (4/an)',
  SEMESTRIELLE: 'Semestrielle (2/an)',
  ANNUELLE: 'Annuelle (1/an)',
};

/**
 * Configuration de planification pour un contrat
 */
export interface PlanificationContrat {
  frequence: FrequenceIntervention;
  jourPrefere?: number;
  heurePrefere?: string;
  delaiGenerationJours: number;
  descriptionIntervention: string;
  montantEstimeIntervention?: number;
  generationAutomatique: boolean;
  derniereGeneration?: string;
  prochaineIntervention?: string;
}

/**
 * Ordre de service planifié (à valider avant génération)
 */
export interface OrdreServicePlanifie {
  id: string;
  contratId: string;
  contratNom: string;
  prestataireNom: string;
  titre: string;
  description: string;
  datePrevisionnelle: string;
  montantEstime?: number;
  statut: 'A_VALIDER' | 'VALIDE' | 'GENERE' | 'ANNULE';
  dateGeneration?: string;
  ordreServiceId?: string;
}

// Interface Contrat étendue (avec tous les nouveaux champs)
export interface ContratDetaille extends Omit<Contrat, 'type' | 'statut'> {
  prestataireId: string; // ID du prestataire (au lieu de juste le nom)
  type: TypeContrat; // Type étendu
  statut: StatutContrat; // Avec BROUILLON
  description?: string;
  numeroContrat?: string;
  fichierPDF?: string; // Nom du fichier PDF (simulé)
  dateUploadPDF?: string;

  // Informations détaillées
  conditionsParticulieres?: string;
  taciteReconduction: boolean;
  delaiResiliation?: number; // En jours

  // Historique interventions liées
  interventionIds: string[]; // IDs des interventions

  // Pièces jointes
  pieceJointes: DocumentContrat[];

  // Alertes
  dateAlerte?: string; // Quand alerter pour renouvellement

  // Lien avec équipement
  equipementConcerne?: string; // Ex: "Ascenseur principal", "Chaudière collective"

  // Classification réglementaire
  estReglementaire: boolean; // true = obligation légale, false = facultatif

  // Configuration de planification des interventions
  planification?: PlanificationContrat;
}

// Intervention détaillée (extension de l'interface Intervention existante)
export interface InterventionDetaille extends Intervention {
  prestataireId: string; // Lien vers Prestataire
  coproprieteId?: string;
  contratId?: string; // Si liée à un contrat
  ordreServiceId?: string; // Si liée à un OS
  factureId?: string; // Si facturée
  montant?: number;
  domaine: DomaineActivite;
  pieceJointes?: string[]; // URLs des documents
  commentaires?: string;
}

// Mode d'envoi de la résiliation
export type ModeEnvoiResiliation = 'RECOMMANDE_POSTAL' | 'RECOMMANDE_ELECTRONIQUE' | 'NON_DEFINI';

// Statut de l'envoi de résiliation
export type StatutEnvoiResiliation = 'NON_ENVOYE' | 'PREPARE' | 'EN_ATTENTE' | 'ENVOYE' | 'CONFIRME' | 'ECHEC';

// Template de résiliation
export interface TemplateResiliation {
  destinataire: string;
  adresse: string;
  numeroContrat: string;
  dateEffet: string;
  motif?: string;
  htmlContent: string; // HTML généré
  modeEnvoi?: ModeEnvoiResiliation;
  statutEnvoi?: StatutEnvoiResiliation;
  datePrepare?: string;
  dateEnvoi?: string;
  trackingId?: string;
  pdfUrl?: string;
}

// ========================================
// CARNET D'ENTRETIEN (Système étendu)
// ========================================

/**
 * Contact de base avec nom, téléphone et email
 */
export interface ContactBase {
  nom: string;
  telephone: string;
  email?: string;
}

/**
 * Membre du Conseil Syndical (format contact simplifié pour carnet d'entretien)
 */
export interface MembreConseilSyndicalContact {
  nom: string;
  role: 'PRESIDENT' | 'VICE_PRESIDENT' | 'TRESORIER' | 'SECRETAIRE' | 'MEMBRE';
  telephone?: string;
  email?: string;
}

/**
 * Prestataire de la copropriété (contacts principaux)
 */
export interface PrestataireContact {
  type: 'ASCENSEUR' | 'CHAUFFAGE' | 'PLOMBERIE' | 'ELECTRICITE' | 'ESPACES_VERTS' | 'NETTOYAGE' | 'AUTRE';
  nom: string;
  telephone: string;
  telephoneUrgence?: string;
  email?: string;
  contratId?: string;
}

/**
 * Service d'urgence
 */
export interface ServiceUrgence {
  type: 'POMPIERS' | 'POLICE' | 'SAMU' | 'URGENCE_GAZ' | 'URGENCE_EAU' | 'URGENCE_ELECTRICITE' | 'CENTRE_ANTIPOISON';
  nom: string;
  telephone: string;
  disponibilite?: string;
}

/**
 * Contact assurance avec numéro de sinistre
 */
export interface AssuranceContact {
  compagnie: string;
  numeroContrat: string;
  numeroSinistre: string;
  telephone: string;
  telephoneSinistre?: string;
  email?: string;
}

// Informations générales de la copropriété
export interface InformationsCopropriete {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  anneeConstruction: number;
  nombreBatiments: number;
  nombreLots: number;
  equipementsPrincipaux: string[];

  // Contacts de gouvernance
  syndic: ContactBase & {
    cabinet?: string;
    adresse?: string;
  };
  gestionnaire?: ContactBase;
  conseilSyndical?: {
    membres: MembreConseilSyndicalContact[];
  };

  // Personnel sur site
  gardien?: ContactBase & {
    horaires?: string;
    loge?: string;
  };

  // Prestataires principaux
  prestataires?: PrestataireContact[];

  // Services d'urgence
  servicesUrgence?: ServiceUrgence[];

  // Assurances
  assurance?: AssuranceContact;
}

// Types de travaux prévisionnels
export type TypeTravauxPrevisionnel =
  | 'TOITURE'
  | 'FACADE'
  | 'CHAUFFAGE'
  | 'ASCENSEUR'
  | 'ELECTRICITE'
  | 'PLOMBERIE'
  | 'ESPACES_VERTS'
  | 'ETANCHEITE'
  | 'ACCESSIBILITE'
  | 'SECURITE'
  | 'AUTRE';

export type StatutTravauxPrevisionnel =
  | 'A_L_ETUDE'    // En cours d'étude, pas encore soumis au vote
  | 'PREVU'        // Prévu au PPT, en attente de vote
  | 'VOTE'         // Voté en AG
  | 'EN_COURS'     // Travaux en cours de réalisation
  | 'TERMINE'      // Travaux terminés
  | 'REPORTE'      // Reporté à une date ultérieure
  | 'ANNULE';      // Annulé

// Travaux prévisionnels / Plan Pluriannuel
export interface TravauxPrevisionnel {
  id: string;
  titre: string;
  description: string;
  type: TypeTravauxPrevisionnel;
  datePrevisionnelle: string;
  dateVote?: string;
  dateRealisation?: string;
  montantEstime: number;
  montantVote?: number;
  montantReel?: number;
  statut: StatutTravauxPrevisionnel;
  priorite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  issuPPT: boolean; // Issu du Plan Pluriannuel de Travaux
  observations?: string;
}

// Types de documents techniques
export type TypeDocumentTechnique =
  | 'DTA' // Dossier Technique Amiante
  | 'DIAGNOSTIC_PLOMB'
  | 'DIAGNOSTIC_ELECTRICITE'
  | 'DIAGNOSTIC_GAZ'
  | 'DPE_COLLECTIF'
  | 'CONTROLE_ASCENSEUR'
  | 'CONTROLE_EXTINCTEURS'
  | 'CONTROLE_CHAUFFERIE'
  | 'GARANTIE_DECENNALE'
  | 'GARANTIE_PARFAIT_ACHEVEMENT'
  | 'RAPPORT_SECURITE'
  | 'AUTRE';

// Document technique
export interface DocumentTechnique {
  id: string;
  nom: string;
  type: TypeDocumentTechnique;
  dateAjout: string;
  dateValidite?: string;
  url: string;
  observations?: string;
}

// Catégorie d'intervention étendue
export type CategorieIntervention =
  | 'COURANTE' // Maintenance quotidienne
  | 'TRAVAUX_IMPORTANTS'; // Travaux significatifs

// Poste budgétaire pour le suivi des dépenses maintenance
export type PosteBudgetMaintenance =
  | 'eau'
  | 'electricite'
  | 'assurance'
  | 'menage'
  | 'ascenseur'
  | 'espaces_verts'
  | 'divers'
  | 'plomberie'
  | 'chauffage'
  | 'toiture'
  | 'parking'
  | 'securite'
  | 'parties_communes';

// Intervention étendue pour le carnet d'entretien
export interface InterventionCarnet extends InterventionDetaille {
  categorie: CategorieIntervention;
  cout?: number;
  documentsAssocies?: string[]; // URLs ou IDs des documents
  equipementConcerne?: string;
  // Liens financiers
  posteBudgetaire?: PosteBudgetMaintenance;
  // factureId est déjà dans InterventionDetaille
  // ordreServiceId est déjà dans InterventionDetaille
}

// Sous-types d'assurance pour le carnet d'entretien
export type SousTypeAssurance =
  | 'MRI'                    // Multirisque Immeuble
  | 'RC_SYNDICAT'           // Responsabilité Civile Syndicat
  | 'DOMMAGES_OUVRAGE'      // Dommages-Ouvrage
  | 'PROTECTION_JURIDIQUE'   // Protection Juridique
  | 'AUTRE';

// Type de document assurance
export type TypeDocumentAssurance = 'CONTRAT' | 'CONDITIONS_PARTICULIERES' | 'ATTESTATION' | 'AVENANT' | 'AUTRE';

// Document assurance
export interface DocumentAssurance {
  id: string;
  nom: string;
  type: TypeDocumentAssurance;
  url: string;
  dateUpload: string;
}

// Contrat d'assurance pour le carnet d'entretien
export interface ContratAssurance {
  id: string;
  type: 'ASSURANCE';
  sousType: SousTypeAssurance;
  nom: string;
  assureur: string;
  numeroPolice: string;
  dateDebut: string;
  dateFin: string;
  primeAnnuelle: number;
  franchise?: number;
  garanties: string[];
  // Spécifique dommages-ouvrage
  travauxConcernes?: string;
  dateReceptionTravaux?: string;
  observations?: string;
  // Documents associés
  documents?: DocumentAssurance[];
}

// ========================================
// CONTRAT DU SYNDIC
// ========================================

export type StatutContratSyndic = 'ACTIF' | 'A_RENOUVELER' | 'RESILIE';

export type TypeDocumentSyndic = 'MANDAT' | 'AVENANT' | 'PV_DESIGNATION' | 'RAPPORT_GESTION' | 'RELEVE_CHARGES' | 'AUTRE';

export interface DocumentSyndicLegacy {
  id: string;
  type: TypeDocumentSyndic;
  nom: string;
  url: string;
  dateUpload: string;
}

export interface ContratSyndic {
  id: string;
  nomSyndic: string;
  cabinetNom?: string;
  numeroContrat: string;
  dateDebut: string;
  dateFin: string;
  montantAnnuel: number;
  statut: StatutContratSyndic;
  description?: string;
  fichierPDF?: string;
  dateUploadPDF?: string;
  taciteReconduction: boolean;
  delaiResiliation?: number; // En jours
  telephone?: string;
  email?: string;
  adresse?: string;
  documents?: DocumentSyndicLegacy[];
}


