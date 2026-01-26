// Types pour le module Factures
import type { PosteBudget } from '@/components/features/finance/Budget/types';

export type { PosteBudget };

/**
 * Statuts des factures CoProFlex
 * Workflow MVP : BROUILLON → A_VALIDER → VALIDEE → A_PAYER → PAYEE
 *
 * - BROUILLON : Facture en cours de saisie
 * - A_VALIDER : Facture soumise pour validation
 * - VALIDEE : Facture validée, prête pour paiement
 * - A_PAYER : Facture en attente de paiement
 * - PAYEE : Facture payée (statut final)
 */
export type StatutFacture = 'BROUILLON' | 'A_VALIDER' | 'VALIDEE' | 'A_PAYER' | 'PAYEE';

/** Configuration d'affichage d'un statut */
export interface StatutFactureConfig {
  valeur: StatutFacture;
  libelle: string;
  libelleCourt: string;
  description: string;
  couleur: 'warning' | 'info' | 'success';
  icone: string;
  ordre: number;
}

/** Transition entre deux statuts */
export interface TransitionStatut {
  de: StatutFacture;
  vers: StatutFacture;
  action: string;
  condition?: string;
  estAnnulation: boolean;
  requiertConfirmation: boolean;
}

/** Historique d'un changement de statut */
export interface HistoriqueStatut {
  id: string;
  factureId: string;
  statutPrecedent: StatutFacture | null;
  nouveauStatut: StatutFacture;
  dateChangement: Date;
  utilisateurId: string;
  utilisateurNom: string;
  motif?: string;
  estAnnulation: boolean;
}

/** Résultat d'une tentative de changement de statut */
export interface ResultatChangementStatut {
  succes: boolean;
  nouveauStatut?: StatutFacture;
  erreur?: string;
  historique?: HistoriqueStatut;
}

/** Props pour le badge de statut */
export interface StatutBadgeProps {
  statut: StatutFacture;
  taille?: 'sm' | 'md' | 'lg';
  afficherIcone?: boolean;
  className?: string;
}

/** Props pour le sélecteur de statut */
export interface StatutSelectProps {
  statutActuel: StatutFacture;
  onChangement: (nouveauStatut: StatutFacture, motif?: string) => Promise<void>;
  disabled?: boolean;
  afficherAnnulations?: boolean;
  className?: string;
}

/** Props pour le workflow visuel */
export interface StatutWorkflowProps {
  statutActuel: StatutFacture;
  afficherHistorique?: boolean;
  historique?: HistoriqueStatut[];
  className?: string;
}
export type TypeDepense = 'entretien' | 'electricite' | 'eau' | 'assurance' | 'travaux' | 'menage' | 'ascenseur' | 'divers';

/** Type de document comptable */
export type TypeDocument = 'FACTURE' | 'AVOIR';

/** Motifs possibles pour un avoir */
export type MotifAvoir = 'RETOUR_MARCHANDISE' | 'ERREUR_FACTURATION' | 'REMISE_COMMERCIALE' | 'LITIGE' | 'AUTRE';

export const MOTIFS_AVOIR: Record<MotifAvoir, string> = {
  RETOUR_MARCHANDISE: 'Retour de marchandise',
  ERREUR_FACTURATION: 'Erreur de facturation',
  REMISE_COMMERCIALE: 'Remise commerciale',
  LITIGE: 'Règlement de litige',
  AUTRE: 'Autre motif',
};

/** Ligne de ventilation comptable */
export interface LigneVentilation {
  id: string;
  compteComptable: string;
  libelle: string;
  montantHT: number;
  tauxTVA: number;
  montantTVA: number;
  montantTTC: number;
  cleRepartitionId?: string;
}

/** Historique d'un événement sur la facture */
export interface EvenementFacture {
  id: string;
  date: string;
  type: 'CREATION' | 'MODIFICATION' | 'CHANGEMENT_STATUT' | 'PAIEMENT' | 'COMMENTAIRE';
  statutPrecedent?: StatutFacture;
  nouveauStatut?: StatutFacture;
  utilisateur: string;
  commentaire?: string;
}

export interface Facture {
  id: string;
  typeDocument: TypeDocument; // Facture ou Avoir
  date: string;
  dateEcheance: string; // Date limite de paiement (ISO format)
  fournisseur: string;
  reference: string;
  montant: number; // Toujours positif, le type détermine le sens
  statut: StatutFacture;
  fichier?: string;
  typeDepense?: TypeDepense;
  posteBudgetaire?: PosteBudget; // Lien vers le poste budgétaire
  compteDebite?: string;
  datePaiement?: string;
  piecesJointes?: PJFacture[];
  // Champs spécifiques aux avoirs
  factureOrigineId?: string; // ID de la facture d'origine (pour les avoirs)
  motifAvoir?: MotifAvoir; // Motif de l'avoir
  // Liaison avec ordre de service
  ordreServiceId?: string; // ID de l'ordre de service associé
  // Ventilation multi-comptes
  ventilation?: LigneVentilation[];
  cleRepartitionId?: string; // Clé de répartition globale
  // Timeline des événements
  historique?: EvenementFacture[];
  // Métadonnées validation
  dateValidation?: string;
  validePar?: string;
}

/**
 * Calcule le montant net d'une facture (facture - avoirs liés)
 */
export function calculerMontantNet(facture: Facture, toutesFactures: Facture[]): number {
  if (facture.typeDocument === 'AVOIR') {
    return -facture.montant; // Un avoir est toujours négatif
  }

  // Trouver tous les avoirs liés à cette facture
  const avoirsLies = toutesFactures.filter(
    f => f.typeDocument === 'AVOIR' && f.factureOrigineId === facture.id
  );

  const totalAvoirs = avoirsLies.reduce((sum, avoir) => sum + avoir.montant, 0);
  return facture.montant - totalAvoirs;
}

/**
 * Calcule le solde fournisseur (Factures non payées - Avoirs à déduire)
 */
export function calculerSoldeFournisseur(fournisseur: string, factures: Facture[]): number {
  // Inclut les factures à catégoriser et à payer (tout sauf PAYEE)
  const facturesFournisseur = factures.filter(f => f.fournisseur === fournisseur && f.statut !== 'PAYEE');

  let solde = 0;
  for (const f of facturesFournisseur) {
    if (f.typeDocument === 'FACTURE') {
      solde += f.montant;
    } else {
      solde -= f.montant; // Avoir déduit du solde
    }
  }
  return solde;
}

/**
 * Vérifie si une facture a des avoirs liés
 */
export function hasAvoirsLies(factureId: string, factures: Facture[]): boolean {
  return factures.some(f => f.typeDocument === 'AVOIR' && f.factureOrigineId === factureId);
}

/**
 * Récupère les avoirs liés à une facture
 */
export function getAvoirsLies(factureId: string, factures: Facture[]): Facture[] {
  return factures.filter(f => f.typeDocument === 'AVOIR' && f.factureOrigineId === factureId);
}

export interface CompteBancaire {
  id: string;
  nom: string;
  type: 'courant' | 'travaux';
  solde: number;
  iban: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  iban?: string;
  bic?: string;
  services: string[];
}

export interface NewFactureForm {
  date: string;
  dateEcheance: string; // Date limite de paiement
  fournisseur: string;
  reference: string;
  montant: string;
  fichier: string;
  posteBudgetaire?: PosteBudget; // Lien vers le poste budgétaire
  piecesJointes?: PJFacture[];
}

/**
 * Calcule la date d'échéance par défaut (30 jours fin de mois)
 */
export function calculerDateEcheanceDefaut(dateFacture: string): string {
  const date = new Date(dateFacture);
  // Ajouter 30 jours
  date.setDate(date.getDate() + 30);
  // Aller à la fin du mois
  const finDeMois = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return finDeMois.toISOString().split('T')[0];
}

/**
 * Vérifie si une facture est en retard de paiement
 * Une facture payée n'est jamais en retard
 */
export function isFactureEnRetard(facture: Facture): boolean {
  // Une facture payée n'est jamais considérée en retard
  if (facture.statut === 'PAYEE') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const echeance = new Date(facture.dateEcheance);
  echeance.setHours(0, 0, 0, 0);
  return echeance < today;
}

/**
 * Calcule le nombre de jours avant/après échéance
 */
export function getJoursAvantEcheance(dateEcheance: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const echeance = new Date(dateEcheance);
  echeance.setHours(0, 0, 0, 0);
  const diffTime = echeance.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// =============================================
// Types pour les pièces jointes de factures
// =============================================

/**
 * Type de pièce jointe
 */
export type TypePJFacture = 'FICHIER' | 'LIEN_EXTERNE';

/**
 * Pièce jointe attachée à une facture
 */
export interface PJFacture {
  id: string;
  type: TypePJFacture;
  nom: string;
  url: string;
  mimeType?: string;
  taille?: number;
  dateAjout: string;
  estPrincipale: boolean;
}

/**
 * Données pour l'upload d'une nouvelle PJ
 */
export interface UploadPJData {
  file?: File;
  lienExterne?: string;
  nomPersonnalise?: string;
  estPrincipale?: boolean;
}

/**
 * Résultat d'un upload
 */
export interface UploadResult {
  success: boolean;
  pj?: PJFacture;
  error?: string;
}

/**
 * Configuration des uploads
 */
export const UPLOAD_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10 Mo
  acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  acceptedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
} as const;

/**
 * Valide un fichier avant upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > UPLOAD_CONFIG.maxSize) {
    return {
      valid: false,
      error: `Le fichier dépasse la taille maximale de ${UPLOAD_CONFIG.maxSize / (1024 * 1024)} Mo`,
    };
  }

  if (!(UPLOAD_CONFIG.acceptedTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non accepté. Types autorisés : PDF, JPG, PNG, WebP`,
    };
  }

  return { valid: true };
}

/**
 * Valide une URL externe
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'L\'URL doit commencer par http:// ou https://' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'URL invalide' };
  }
}

/**
 * Formate la taille d'un fichier en chaîne lisible
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Génère un ID unique pour une PJ
 */
export function generatePJId(): string {
  return `pj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================
// KPI Factures
// =============================================

/**
 * Interface pour les KPI des factures
 * Workflow: BROUILLON → A_VALIDER → VALIDEE → A_PAYER → PAYEE
 */
export interface FacturesKPIData {
  totalAPayer: number;
  nombreFactures: number;
  facturesEchues: number;
  montantEchu: number;
  echeancesSemaine: number;
  montantSemaine: number;
  fournisseurPrincipal: { nom: string; montant: number } | null;
  nombreBrouillon: number;
  nombreAValider: number;
  nombreValidee: number;
  nombreAPayer: number;
  nombrePayees: number;
}

/**
 * Calcule tous les KPI des factures
 */
export function calculerKPIFactures(factures: Facture[]): FacturesKPIData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Date de fin de semaine (dimanche prochain)
  const finSemaine = new Date(today);
  finSemaine.setDate(today.getDate() + (7 - today.getDay()));
  finSemaine.setHours(23, 59, 59, 999);

  // Filtrer uniquement les factures (pas les avoirs) pour certains calculs
  const facturesUniquement = factures.filter(f => f.typeDocument === 'FACTURE');
  const facturesNonPayees = facturesUniquement.filter(f => f.statut !== 'PAYEE');

  // Total à payer (factures non payées - avoirs)
  let totalAPayer = 0;
  for (const f of factures) {
    if (f.statut === 'PAYEE') continue;
    if (f.typeDocument === 'FACTURE') {
      totalAPayer += f.montant;
    } else {
      totalAPayer -= f.montant; // Déduire les avoirs
    }
  }

  // Nombre de factures (hors avoirs)
  const nombreFactures = facturesUniquement.length;

  // Factures échues (en retard)
  const facturesEnRetard = facturesNonPayees.filter(f => isFactureEnRetard(f));
  const facturesEchues = facturesEnRetard.length;
  const montantEchu = facturesEnRetard.reduce((sum, f) => sum + calculerMontantNet(f, factures), 0);

  // Échéances cette semaine
  const facturesSemaine = facturesNonPayees.filter(f => {
    const echeance = new Date(f.dateEcheance);
    echeance.setHours(0, 0, 0, 0);
    return echeance >= today && echeance <= finSemaine;
  });
  const echeancesSemaine = facturesSemaine.length;
  const montantSemaine = facturesSemaine.reduce((sum, f) => sum + calculerMontantNet(f, factures), 0);

  // Fournisseur principal (parmi les factures non payées)
  const parFournisseur: Record<string, number> = {};
  for (const f of facturesNonPayees) {
    if (!parFournisseur[f.fournisseur]) {
      parFournisseur[f.fournisseur] = 0;
    }
    parFournisseur[f.fournisseur] += calculerMontantNet(f, factures);
  }

  let fournisseurPrincipal: { nom: string; montant: number } | null = null;
  let maxMontant = 0;
  for (const [nom, montant] of Object.entries(parFournisseur)) {
    if (montant > maxMontant) {
      maxMontant = montant;
      fournisseurPrincipal = { nom, montant };
    }
  }

  // Compteurs par statut (nouveau workflow 5 étapes)
  const nombreBrouillon = facturesUniquement.filter(f => f.statut === 'BROUILLON').length;
  const nombreAValider = facturesUniquement.filter(f => f.statut === 'A_VALIDER').length;
  const nombreValidee = facturesUniquement.filter(f => f.statut === 'VALIDEE').length;
  const nombreAPayer = facturesUniquement.filter(f => f.statut === 'A_PAYER').length;
  const nombrePayees = facturesUniquement.filter(f => f.statut === 'PAYEE').length;

  return {
    totalAPayer: Math.max(0, totalAPayer),
    nombreFactures,
    facturesEchues,
    montantEchu: Math.max(0, montantEchu),
    echeancesSemaine,
    montantSemaine: Math.max(0, montantSemaine),
    fournisseurPrincipal,
    nombreBrouillon,
    nombreAValider,
    nombreValidee,
    nombreAPayer,
    nombrePayees,
  };
}
