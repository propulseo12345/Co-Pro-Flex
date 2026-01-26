/**
 * Types pour le module Impayés
 * Gestion des impayés et du workflow de recouvrement
 */

// Canal d'envoi des relances
export type CanalEnvoi = 'email' | 'courrier' | 'courrier_recommande' | 'telephone' | 'huissier';

// Types d'actions dans l'historique
export type HistoriqueActionType =
  | 'creation'
  | 'relance_amiable_1'
  | 'relance_amiable_2'
  | 'mise_en_demeure'
  | 'contentieux'
  | 'paiement_partiel'
  | 'paiement_total'
  | 'note'
  | 'appel_telephonique';

// Statuts possibles d'un impayé
export type ImpayeStatut =
  | 'en_retard'
  | 'relance_amiable_1'
  | 'relance_amiable_2'
  | 'mise_en_demeure'
  | 'contentieux'
  | 'regle';

// Contenu d'un email envoyé
export interface EmailContenu {
  objet: string;
  corps: string;
  destinataire: string;
  dateEnvoi: string;
}

// Contenu d'un courrier envoyé
export interface CourrierContenu {
  titre: string;
  corps: string;
  destinataire: string;
  adresse: string;
  dateEnvoi: string;
  recommande: boolean;
  numeroSuivi?: string;
}

// Note d'appel téléphonique
export interface AppelTelephoniqueContenu {
  dateAppel: string;
  duree?: string;
  interlocuteur: string;
  telephone: string;
  resumeEchange: string;
  engagementsPris?: string;
  prochainContact?: string;
}

// Contenu détaillé d'une action de l'historique
export interface HistoriqueContenu {
  type: 'email' | 'courrier' | 'telephone' | 'paiement' | 'note' | 'autre';
  email?: EmailContenu;
  courrier?: CourrierContenu;
  telephone?: AppelTelephoniqueContenu;
  note?: string;
  pdfGenere?: boolean; // Indique si un PDF a été généré
}

// Item de l'historique enrichi
export interface HistoriqueItemEnrichi {
  id: number;
  date: string;
  type: HistoriqueActionType;
  description: string;
  montant?: number;
  destinataire?: string;
  canal?: CanalEnvoi;
  contenu?: HistoriqueContenu;
}

// Informations du copropriétaire
export interface CoproprietaireImpaye {
  id?: string;
  nom: string;
  prenom?: string;
  email: string;
  telephone: string;
  adresse: string;
}

// Impayé complet
export interface ImpayeComplet {
  id: number;
  coproprietaire: CoproprietaireImpaye;
  lot: string;
  batiment: string;
  montant: number;
  montantInitial: number;
  periode: string;
  type: 'charges' | 'travaux' | 'autre';
  statut: ImpayeStatut;
  dateEcheance: string;
  dateCreation: string;
  historique: HistoriqueItemEnrichi[];
}

// Templates de relance
export interface TemplateRelance {
  id: string;
  type: 'relance_amiable_1' | 'relance_amiable_2' | 'mise_en_demeure';
  canal: 'email' | 'courrier';
  objet: string;
  corps: string;
  delaiJours: number;
}

// Configuration des templates par défaut
export const TEMPLATES_RELANCE: TemplateRelance[] = [
  {
    id: 'relance_1_email',
    type: 'relance_amiable_1',
    canal: 'email',
    objet: 'Rappel de paiement - Charges de copropriété',
    corps: `Madame, Monsieur,

Nous vous informons que votre compte présente un solde débiteur correspondant aux charges de copropriété.

Montant dû : {{MONTANT}} €
Période concernée : {{PERIODE}}
Date d'échéance initiale : {{DATE_ECHEANCE}}

Nous vous remercions de bien vouloir procéder au règlement de cette somme dans les meilleurs délais.

En cas de difficulté de paiement, nous vous invitons à prendre contact avec notre service afin d'étudier ensemble les solutions possibles.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Le Syndic`,
    delaiJours: 15,
  },
  {
    id: 'relance_2_courrier',
    type: 'relance_amiable_2',
    canal: 'courrier',
    objet: 'Deuxième rappel - Charges de copropriété impayées',
    corps: `Madame, Monsieur,

Malgré notre précédent rappel du {{DATE_RELANCE_1}}, nous constatons que votre compte présente toujours un solde débiteur.

Montant dû : {{MONTANT}} €
Période concernée : {{PERIODE}}

Nous vous demandons instamment de régulariser votre situation sous 8 jours à compter de la réception de ce courrier.

À défaut, nous serons contraints d'engager une procédure de recouvrement qui entraînera des frais supplémentaires à votre charge.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Le Syndic`,
    delaiJours: 8,
  },
  {
    id: 'mise_demeure_courrier',
    type: 'mise_en_demeure',
    canal: 'courrier',
    objet: 'MISE EN DEMEURE - Charges de copropriété impayées',
    corps: `Lettre recommandée avec accusé de réception

Madame, Monsieur,

Par la présente, nous vous mettons en demeure de régler la somme de {{MONTANT}} € correspondant aux charges de copropriété impayées.

Période concernée : {{PERIODE}}

Conformément aux dispositions de l'article 19 de la loi du 10 juillet 1965, cette mise en demeure vaut commandement de payer.

À défaut de règlement intégral dans un délai de 8 jours à compter de la réception de la présente, nous transmettrons le dossier à notre conseil juridique aux fins de recouvrement judiciaire.

Les frais de procédure seront intégralement à votre charge, en sus des intérêts de retard au taux légal.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Le Syndic`,
    delaiJours: 8,
  },
];

// Fonction pour interpoler les variables dans un template
export function interpolerTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let resultat = template;
  for (const [key, value] of Object.entries(variables)) {
    resultat = resultat.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return resultat;
}

// ============================================
// JOURNAL DE RECOUVREMENT
// ============================================

/** Catégories de notes pour le journal de recouvrement */
export type CategorieNote =
  | 'relance_amiable'
  | 'mise_en_demeure'
  | 'echange_avocat'
  | 'courrier_recommande'
  | 'appel_telephonique'
  | 'commandement_payer'
  | 'audience'
  | 'jugement'
  | 'huissier'
  | 'echeancier'
  | 'paiement_partiel'
  | 'decision_cs'
  | 'autre';

/** Pièce jointe associée à une note du journal */
export interface PieceJointeNote {
  id: string;
  nom: string;
  type: string; // MIME type
  taille: number; // en bytes
  url: string;
  dateUpload: string;
}

/** Note individuelle du journal de recouvrement */
export interface NoteJournal {
  id: string;
  impayeId: number;
  categorie: CategorieNote;
  contenu: string;
  auteurId: string;
  auteurNom: string;
  auteurRole: 'gestionnaire' | 'comptable' | 'avocat' | 'syndic';
  dateCreation: string;
  dateModification?: string;
  piecesJointes: PieceJointeNote[];
  important: boolean;
  confidentiel: boolean;
}

/** Journal de recouvrement complet pour un impayé */
export interface JournalRecouvrementComplet {
  impayeId: number;
  notes: NoteJournal[];
  nombreNotes: number;
  derniereActivite: string;
}

// ============================================
// RELANCES GROUPÉES - PRÉVISUALISATION
// ============================================

/** Mode d'envoi des relances */
export type ModeEnvoi = 'email' | 'courrier' | 'lrar';

/** Modèle de relance avec contenu complet */
export interface ModeleRelance {
  id: string;
  libelle: string;
  etape: number;
  type: 'relance_amiable_1' | 'relance_amiable_2' | 'mise_en_demeure';
  modeEnvoi: ModeEnvoi;
  objet: string;
  contenu: string; // Avec variables : {{nom}}, {{montant}}, {{date_echeance}}, {{copropriete}}, {{periode}}
}

/** Destinataire d'une relance groupée */
export interface DestinataireRelance {
  id: number;
  nom: string;
  email?: string;
  adresse?: string;
  montantDu: number;
  lot?: string;
  batiment?: string;
}

/** Données de prévisualisation d'une relance groupée */
export interface RelanceGroupeePreview {
  modele: ModeleRelance;
  destinataires: DestinataireRelance[];
  contenuPreview: string; // Contenu avec placeholders lisibles
  objetPreview: string;
}

/** Configuration des modèles de relance avec contenu complet */
export const MODELES_RELANCE: ModeleRelance[] = [
  {
    id: 'relance_amiable_1',
    libelle: 'Relance amiable 1',
    etape: 1,
    type: 'relance_amiable_1',
    modeEnvoi: 'email',
    objet: 'Rappel de paiement - Copropriété {{copropriete}}',
    contenu: `Madame, Monsieur {{nom}},

Nous vous informons que votre compte présente un solde débiteur de {{montant}} € au {{date}}.

Période concernée : {{periode}}
Lot : {{lot}} - {{batiment}}

Nous vous remercions de bien vouloir régulariser cette situation dans les meilleurs délais.

En cas de difficulté de paiement, nous vous invitons à prendre contact avec notre service afin d'étudier ensemble les solutions possibles.

Cordialement,
Le Syndic`,
  },
  {
    id: 'relance_amiable_2',
    libelle: 'Relance amiable 2',
    etape: 2,
    type: 'relance_amiable_2',
    modeEnvoi: 'courrier',
    objet: 'Second rappel - Impayé de {{montant}} €',
    contenu: `Madame, Monsieur {{nom}},

Malgré notre précédent courrier, nous constatons que la somme de {{montant}} € correspondant à la période {{periode}} reste impayée.

Lot concerné : {{lot}} - {{batiment}}

Sans régularisation sous 8 jours à compter de la réception de ce courrier, nous serons contraints d'engager des démarches de recouvrement qui entraîneront des frais supplémentaires à votre charge.

Nous vous prions de bien vouloir procéder au règlement dans les meilleurs délais.

Cordialement,
Le Syndic`,
  },
  {
    id: 'mise_en_demeure',
    libelle: 'Mise en demeure',
    etape: 3,
    type: 'mise_en_demeure',
    modeEnvoi: 'lrar',
    objet: 'MISE EN DEMEURE - Charges de copropriété impayées',
    contenu: `Lettre recommandée avec accusé de réception

Madame, Monsieur {{nom}},

Par la présente, nous vous mettons en demeure de régler la somme de {{montant}} € correspondant aux charges de copropriété impayées.

Période concernée : {{periode}}
Lot : {{lot}} - {{batiment}}

Conformément aux dispositions de l'article 19 de la loi du 10 juillet 1965, cette mise en demeure vaut commandement de payer.

À défaut de règlement intégral dans un délai de 8 jours à compter de la réception de la présente, nous transmettrons le dossier à notre conseil juridique aux fins de recouvrement judiciaire.

Les frais de procédure seront intégralement à votre charge, en sus des intérêts de retard au taux légal.

Le Syndic`,
  },
];

/** Fonction pour formater le contenu de prévisualisation avec placeholders lisibles */
export function formatPreviewContent(contenu: string): string {
  return contenu
    .replace(/\{\{nom\}\}/g, '[Nom du copropriétaire]')
    .replace(/\{\{montant\}\}/g, '[Montant dû]')
    .replace(/\{\{date\}\}/g, '[Date du jour]')
    .replace(/\{\{copropriete\}\}/g, '[Nom copropriété]')
    .replace(/\{\{periode\}\}/g, '[Période]')
    .replace(/\{\{lot\}\}/g, '[N° Lot]')
    .replace(/\{\{batiment\}\}/g, '[Bâtiment]');
}

/** Fonction pour formater l'objet de prévisualisation avec placeholders lisibles */
export function formatPreviewObjet(objet: string): string {
  return objet
    .replace(/\{\{montant\}\}/g, '[Montant]')
    .replace(/\{\{copropriete\}\}/g, '[Copropriété]')
    .replace(/\{\{periode\}\}/g, '[Période]');
}

/** Récupérer le modèle de relance par type */
export function getModeleByType(type: 'relance_amiable_1' | 'relance_amiable_2' | 'mise_en_demeure'): ModeleRelance | undefined {
  return MODELES_RELANCE.find(m => m.type === type);
}
