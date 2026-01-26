/**
 * Types de pièces justificatives
 */
export type TypePieceJustificative =
  | 'FACTURE'
  | 'CONTRAT'
  | 'DEVIS'
  | 'ATTESTATION'
  | 'RELEVE'
  | 'COURRIER'
  | 'AVOIR'
  | 'NOTE_CREDIT'
  | 'AUTRE';

/**
 * Configuration des types de PJ
 */
export const TYPES_PIECES_JUSTIFICATIVES: Record<
  TypePieceJustificative,
  {
    label: string;
    labelCourt: string;
    icone: string;
  }
> = {
  FACTURE: { label: 'Facture', labelCourt: 'Fact.', icone: 'Receipt' },
  CONTRAT: { label: 'Contrat', labelCourt: 'Contr.', icone: 'FileText' },
  DEVIS: { label: 'Devis', labelCourt: 'Devis', icone: 'FileSpreadsheet' },
  ATTESTATION: { label: 'Attestation', labelCourt: 'Att.', icone: 'BadgeCheck' },
  RELEVE: { label: 'Relevé', labelCourt: 'Rel.', icone: 'ListOrdered' },
  COURRIER: { label: 'Courrier', labelCourt: 'Courr.', icone: 'Mail' },
  AVOIR: { label: 'Avoir', labelCourt: 'Avoir', icone: 'ReceiptRefund' },
  NOTE_CREDIT: { label: 'Note de crédit', labelCourt: 'N.Créd.', icone: 'CreditCard' },
  AUTRE: { label: 'Autre', labelCourt: 'Autre', icone: 'File' },
};

/**
 * Formats de fichiers supportés
 */
export type FormatFichier = 'pdf' | 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp';

export const FORMATS_SUPPORTES: FormatFichier[] = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];

export const FORMATS_IMAGES: FormatFichier[] = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/**
 * Pièce justificative
 */
export interface PieceJustificative {
  id: string;

  // Lien avec la dépense
  depenseId: string;

  // Fichier
  nomFichier: string;
  urlFichier: string;
  format: FormatFichier;
  tailleFichier: number; // En bytes

  // Métadonnées
  type: TypePieceJustificative;
  description?: string;
  dateDocument?: string; // Date du document (facture, etc.)
  reference?: string; // Numéro de facture, etc.

  // Audit
  uploadePar: string;
  uploadeParNom?: string;
  uploadeLe: string;

  // Accès
  estPublic: boolean; // Accessible aux copropriétaires
  estConfidentiel: boolean;
}

/**
 * Dépense avec ses pièces justificatives
 */
export interface DepenseAvecPJ {
  id: string;
  categorieId?: string;
  poste?: string;
  description?: string;
  libelle?: string;
  montant: number;
  date: string;
  fournisseur?: string;
  reference?: string;
  piecesJustificatives: PieceJustificative[];
}

/**
 * Droits d'accès aux pièces justificatives
 */
export type RoleAccesPJ = 'gestionnaire' | 'conseil_syndical' | 'coproprietaire';

export interface DroitsAccesPJ {
  peutVoir: boolean;
  peutTelecharger: boolean;
  peutAjouter: boolean;
  peutSupprimer: boolean;
}

/**
 * Retourne les droits selon le rôle
 */
export function getDroitsAccesPJ(role: RoleAccesPJ): DroitsAccesPJ {
  switch (role) {
    case 'gestionnaire':
      return {
        peutVoir: true,
        peutTelecharger: true,
        peutAjouter: true,
        peutSupprimer: true,
      };
    case 'conseil_syndical':
      return {
        peutVoir: true,
        peutTelecharger: true,
        peutAjouter: false,
        peutSupprimer: false,
      };
    case 'coproprietaire':
      return {
        peutVoir: true,
        peutTelecharger: true,
        peutAjouter: false,
        peutSupprimer: false,
      };
    default:
      return {
        peutVoir: false,
        peutTelecharger: false,
        peutAjouter: false,
        peutSupprimer: false,
      };
  }
}

/**
 * Vérifie si un fichier est une image
 */
export function estImage(format: FormatFichier): boolean {
  return FORMATS_IMAGES.includes(format);
}

/**
 * Vérifie si un fichier est un PDF
 */
export function estPDF(format: FormatFichier): boolean {
  return format === 'pdf';
}

/**
 * Formate la taille d'un fichier
 */
export function formaterTailleFichier(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Extrait le format d'un nom de fichier
 */
export function extraireFormat(nomFichier: string): FormatFichier {
  const extension = nomFichier.split('.').pop()?.toLowerCase() as FormatFichier;
  return FORMATS_SUPPORTES.includes(extension) ? extension : 'pdf';
}
