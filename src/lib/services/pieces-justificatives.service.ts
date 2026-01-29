/**
 * Service de gestion des pièces justificatives
 * VERSION SUPABASE - Utilise l'API documents et Supabase Storage
 */

import {
  PieceJustificative,
  DepenseAvecPJ,
  RoleAccesPJ,
  getDroitsAccesPJ,
  extraireFormat,
  TypePieceJustificative,
} from '@/types/models/piece-justificative';
import * as documentsApi from '@/lib/documents/api';

// Constante pour cleanup legacy localStorage (one-shot en dev)
const LEGACY_STORAGE_KEY = 'coproflex-pieces-justificatives';

/**
 * Service de gestion des pièces justificatives
 * Utilise Supabase pour le stockage (table documents + storage bucket ged)
 */
export class PiecesJustificativesService {
  private initialized = false;

  /**
   * Initialise le service et nettoie le localStorage legacy si présent
   */
  private async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Cleanup legacy localStorage (one-shot)
    if (typeof window !== 'undefined') {
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
        console.warn('[PiecesJustificativesService] Suppression données localStorage legacy');
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  }

  // ========================================
  // RÉCUPÉRATION
  // ========================================

  /**
   * Récupère toutes les PJ d'une dépense
   */
  async getPiecesParDepense(depenseId: string): Promise<PieceJustificative[]> {
    await this.init();

    try {
      const documents = await documentsApi.getDocumentsForEntity('depense', depenseId);
      return documents.map(doc => this.documentToPJ(doc, depenseId));
    } catch (error) {
      console.error('[PiecesJustificativesService] Erreur getPiecesParDepense:', error);
      return [];
    }
  }

  /**
   * Récupère une PJ par son ID
   */
  async getPieceById(pieceId: string): Promise<PieceJustificative | null> {
    await this.init();

    try {
      const doc = await documentsApi.getDocumentById(pieceId);
      if (!doc) return null;
      return this.documentToPJ(doc, '');
    } catch (error) {
      console.error('[PiecesJustificativesService] Erreur getPieceById:', error);
      return null;
    }
  }

  /**
   * Récupère les dépenses avec leurs PJ
   */
  async getDepensesAvecPJ(depenses: Array<{ id: string }>): Promise<DepenseAvecPJ[]> {
    await this.init();

    const result: DepenseAvecPJ[] = [];

    for (const depense of depenses) {
      const pjs = await this.getPiecesParDepense(depense.id);
      result.push({
        ...depense,
        piecesJustificatives: pjs,
      } as DepenseAvecPJ);
    }

    return result;
  }

  // ========================================
  // VÉRIFICATION D'ACCÈS
  // ========================================

  /**
   * Vérifie si l'utilisateur peut voir une PJ
   */
  peutVoirPiece(piece: PieceJustificative, role: RoleAccesPJ): boolean {
    const droits = getDroitsAccesPJ(role);

    if (!droits.peutVoir) return false;

    // Les gestionnaires voient tout
    if (role === 'gestionnaire') return true;

    // Les PJ confidentielles ne sont pas visibles par les copropriétaires
    if (piece.estConfidentiel && role === 'coproprietaire') return false;

    // Les PJ non publiques ne sont pas visibles par les copropriétaires
    if (!piece.estPublic && role === 'coproprietaire') return false;

    return true;
  }

  /**
   * Vérifie si l'utilisateur peut télécharger une PJ
   */
  peutTelechargerPiece(piece: PieceJustificative, role: RoleAccesPJ): boolean {
    const droits = getDroitsAccesPJ(role);
    return droits.peutTelecharger && this.peutVoirPiece(piece, role);
  }

  // ========================================
  // GÉNÉRATION D'URL
  // ========================================

  /**
   * Génère l'URL de visualisation d'une PJ
   */
  async getUrlVisualisation(piece: PieceJustificative): Promise<string> {
    // Si c'est déjà une URL complète, la retourner
    if (piece.urlFichier.startsWith('http://') || piece.urlFichier.startsWith('https://')) {
      return piece.urlFichier;
    }

    try {
      return await documentsApi.getDocumentUrl(piece.urlFichier);
    } catch (error) {
      console.error('[PiecesJustificativesService] Erreur getUrlVisualisation:', error);
      return piece.urlFichier;
    }
  }

  /**
   * Génère l'URL de téléchargement d'une PJ
   */
  async getUrlTelechargement(piece: PieceJustificative): Promise<string> {
    const url = await this.getUrlVisualisation(piece);
    // En production, ajouter un paramètre pour forcer le téléchargement
    return `${url}${url.includes('?') ? '&' : '?'}download=true`;
  }

  // ========================================
  // UPLOAD
  // ========================================

  /**
   * Upload une nouvelle PJ
   */
  async uploadPiece(
    depenseId: string,
    fichier: File,
    metadata: Partial<PieceJustificative>,
    utilisateurId: string,
    coproId: string
  ): Promise<PieceJustificative> {
    await this.init();

    // Déterminer la catégorie du document
    const categoryMap: Record<TypePieceJustificative, documentsApi.DocumentCategory> = {
      FACTURE: 'facture',
      CONTRAT: 'contrat',
      DEVIS: 'devis',
      ATTESTATION: 'diagnostic',
      RELEVE: 'releve_charges',
      COURRIER: 'courrier',
      AVOIR: 'facture',
      NOTE_CREDIT: 'facture',
      AUTRE: 'autre',
    };

    const category = categoryMap[metadata.type || 'AUTRE'] || 'autre';

    // Upload vers Supabase
    const doc = await documentsApi.uploadDocument(fichier, coproId, category, {
      title: fichier.name,
      description: metadata.description,
      tags: [
        `pj-type:${metadata.type || 'AUTRE'}`,
        metadata.estPublic === false ? 'private' : 'public',
        metadata.estConfidentiel ? 'confidential' : '',
      ].filter(Boolean),
      confidentiality: metadata.estConfidentiel ? 'restricted' : metadata.estPublic ? 'public' : 'council',
    });

    // Créer le lien avec la dépense
    await documentsApi.linkDocumentToEntity(doc.id, 'depense', depenseId, 'main');

    return this.documentToPJ(doc, depenseId);
  }

  /**
   * Supprime une PJ
   */
  async supprimerPiece(pieceId: string): Promise<boolean> {
    await this.init();

    try {
      await documentsApi.archiveDocument(pieceId);
      return true;
    } catch (error) {
      console.error('[PiecesJustificativesService] Erreur supprimerPiece:', error);
      return false;
    }
  }

  // ========================================
  // HELPERS PRIVÉS
  // ========================================

  /**
   * Convertit un Document Supabase en PieceJustificative
   */
  private documentToPJ(doc: documentsApi.Document, depenseId: string): PieceJustificative {
    // Extraire le type de PJ depuis les tags
    const typeTags = (doc.tags || []).filter(t => t.startsWith('pj-type:'));
    const typeFromTag = typeTags.length > 0
      ? typeTags[0].replace('pj-type:', '') as TypePieceJustificative
      : 'AUTRE';

    // Mapper la catégorie document vers type PJ
    const categoryToType: Record<string, TypePieceJustificative> = {
      facture: 'FACTURE',
      contrat: 'CONTRAT',
      devis: 'DEVIS',
      diagnostic: 'ATTESTATION',
      releve_charges: 'RELEVE',
      courrier: 'COURRIER',
    };

    const type = typeFromTag !== 'AUTRE'
      ? typeFromTag
      : categoryToType[doc.category || ''] || 'AUTRE';

    const isConfidential = doc.confidentiality === 'restricted' || (doc.tags || []).includes('confidential');
    const isPublic = doc.confidentiality === 'public' || (doc.tags || []).includes('public');

    return {
      id: doc.id,
      depenseId: depenseId,
      nomFichier: doc.file_name,
      urlFichier: doc.file_path,
      format: extraireFormat(doc.file_name),
      tailleFichier: doc.file_size || 0,
      type,
      description: doc.description,
      dateDocument: doc.document_date,
      reference: undefined,
      uploadePar: doc.created_by || '',
      uploadeParNom: doc.created_by_name,
      uploadeLe: doc.created_at,
      estPublic: isPublic,
      estConfidentiel: isConfidential,
    };
  }
}

export const piecesJustificativesService = new PiecesJustificativesService();
