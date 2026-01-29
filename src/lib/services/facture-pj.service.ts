/**
 * Service de gestion des pièces jointes de factures
 * VERSION SUPABASE - Utilise l'API documents et Supabase Storage
 */

import {
  PJFacture,
  UploadPJData,
  UploadResult,
  validateFile,
  validateUrl,
  generatePJId,
} from '@/components/features/finance/Factures/types';
import * as documentsApi from '@/lib/documents/api';
import { createClient } from '@/lib/supabase/client';

// Constante pour cleanup legacy localStorage (one-shot en dev)
const LEGACY_STORAGE_KEY = 'coproflex-factures-pj';

/**
 * Service de gestion des pièces jointes de factures
 * Utilise Supabase pour le stockage (table documents + storage bucket ged)
 */
class FacturePJService {
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
        console.warn('[FacturePJService] Suppression données localStorage legacy');
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  }

  // ========================================
  // RÉCUPÉRATION
  // ========================================

  /**
   * Récupère toutes les PJ d'une facture
   * Utilise document_links pour trouver les documents liés à la facture
   */
  async getPJParFacture(factureId: string): Promise<PJFacture[]> {
    await this.init();

    try {
      const documents = await documentsApi.getDocumentsForEntity('facture', factureId);

      return documents
        .map(doc => this.documentToPJ(doc, factureId))
        .sort((a, b) => {
          // PJ principale en premier
          if (a.estPrincipale && !b.estPrincipale) return -1;
          if (!a.estPrincipale && b.estPrincipale) return 1;
          // Puis par date d'ajout (plus récente en premier)
          return new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime();
        });
    } catch (error) {
      console.error('[FacturePJService] Erreur getPJParFacture:', error);
      return [];
    }
  }

  /**
   * Récupère une PJ par son ID
   */
  async getPJById(pjId: string): Promise<PJFacture | null> {
    await this.init();

    try {
      const doc = await documentsApi.getDocumentById(pjId);
      if (!doc) return null;
      return this.documentToPJ(doc, '');
    } catch (error) {
      console.error('[FacturePJService] Erreur getPJById:', error);
      return null;
    }
  }

  // ========================================
  // UPLOAD ET CRÉATION
  // ========================================

  /**
   * Upload un fichier comme PJ
   */
  async uploadFichier(
    factureId: string,
    data: UploadPJData,
    coproId: string
  ): Promise<UploadResult> {
    await this.init();

    if (!data.file) {
      return { success: false, error: 'Aucun fichier fourni' };
    }

    // Valider le fichier
    const validation = validateFile(data.file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Upload vers Supabase via l'API documents
      const doc = await documentsApi.uploadDocument(data.file, coproId, 'facture', {
        title: data.nomPersonnalise || data.file.name,
        description: `Pièce jointe facture ${factureId}`,
        tags: data.estPrincipale ? ['principale'] : [],
      });

      // Créer le lien avec la facture
      await documentsApi.linkDocumentToEntity(
        doc.id,
        'facture',
        factureId,
        data.estPrincipale ? 'main' : 'annexe'
      );

      // Si c'est la principale, retirer le tag des autres
      if (data.estPrincipale) {
        await this.unsetPrincipale(factureId, doc.id);
      }

      const pj = this.documentToPJ(doc, factureId);
      pj.estPrincipale = data.estPrincipale ?? false;

      return { success: true, pj };
    } catch (error) {
      console.error('[FacturePJService] Erreur upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      };
    }
  }

  /**
   * Ajoute un lien externe comme PJ
   */
  async ajouterLienExterne(
    factureId: string,
    data: UploadPJData,
    coproId: string
  ): Promise<UploadResult> {
    await this.init();

    if (!data.lienExterne) {
      return { success: false, error: 'Aucun lien fourni' };
    }

    // Valider l'URL
    const validation = validateUrl(data.lienExterne);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Créer un document avec le lien externe comme file_path
      const doc = await documentsApi.createDocument({
        copro_id: coproId,
        file_name: data.nomPersonnalise || this.extraireNomDepuisUrl(data.lienExterne),
        file_path: data.lienExterne,
        category: 'facture',
        title: data.nomPersonnalise || this.extraireNomDepuisUrl(data.lienExterne),
        description: `Lien externe - Facture ${factureId}`,
        tags: data.estPrincipale ? ['principale', 'lien-externe'] : ['lien-externe'],
        confidentiality: 'public',
        source_module: 'finance',
      });

      // Créer le lien avec la facture
      await documentsApi.linkDocumentToEntity(
        doc.id,
        'facture',
        factureId,
        data.estPrincipale ? 'main' : 'annexe'
      );

      // Si c'est la principale, retirer le tag des autres
      if (data.estPrincipale) {
        await this.unsetPrincipale(factureId, doc.id);
      }

      const pj: PJFacture = {
        id: doc.id,
        type: 'LIEN_EXTERNE',
        nom: doc.file_name,
        url: data.lienExterne,
        dateAjout: doc.created_at,
        estPrincipale: data.estPrincipale ?? false,
      };

      return { success: true, pj };
    } catch (error) {
      console.error('[FacturePJService] Erreur ajouterLienExterne:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la création du lien'
      };
    }
  }

  // ========================================
  // MODIFICATION
  // ========================================

  /**
   * Définit une PJ comme principale
   */
  async definirPrincipale(factureId: string, pjId: string): Promise<boolean> {
    await this.init();

    try {
      // Récupérer toutes les PJ de cette facture
      const documents = await documentsApi.getDocumentsForEntity('facture', factureId);

      // Mettre à jour les tags pour enlever 'principale' des autres et l'ajouter à celle-ci
      for (const doc of documents) {
        const currentTags = doc.tags || [];
        const isPrincipal = doc.id === pjId;

        let newTags: string[];
        if (isPrincipal) {
          newTags = currentTags.includes('principale')
            ? currentTags
            : [...currentTags, 'principale'];
        } else {
          newTags = currentTags.filter(t => t !== 'principale');
        }

        if (JSON.stringify(currentTags) !== JSON.stringify(newTags)) {
          await documentsApi.updateDocument(doc.id, { tags: newTags });
        }
      }

      return true;
    } catch (error) {
      console.error('[FacturePJService] Erreur definirPrincipale:', error);
      return false;
    }
  }

  /**
   * Renomme une PJ
   */
  async renommerPJ(pjId: string, nouveauNom: string): Promise<boolean> {
    await this.init();

    try {
      await documentsApi.updateDocument(pjId, {
        title: nouveauNom,
        file_name: nouveauNom,
      });
      return true;
    } catch (error) {
      console.error('[FacturePJService] Erreur renommerPJ:', error);
      return false;
    }
  }

  // ========================================
  // SUPPRESSION
  // ========================================

  /**
   * Supprime une PJ (archive le document)
   */
  async supprimerPJ(pjId: string): Promise<boolean> {
    await this.init();

    try {
      // Archive au lieu de supprimer pour garder l'historique
      await documentsApi.archiveDocument(pjId);
      return true;
    } catch (error) {
      console.error('[FacturePJService] Erreur supprimerPJ:', error);
      return false;
    }
  }

  /**
   * Supprime toutes les PJ d'une facture (archive)
   */
  async supprimerToutesPJ(factureId: string): Promise<number> {
    await this.init();

    try {
      const documents = await documentsApi.getDocumentsForEntity('facture', factureId);

      for (const doc of documents) {
        await documentsApi.archiveDocument(doc.id);
      }

      return documents.length;
    } catch (error) {
      console.error('[FacturePJService] Erreur supprimerToutesPJ:', error);
      return 0;
    }
  }

  // ========================================
  // UTILITAIRES
  // ========================================

  /**
   * Vérifie si une facture a au moins une PJ
   */
  async aDesPJ(factureId: string): Promise<boolean> {
    const pj = await this.getPJParFacture(factureId);
    return pj.length > 0;
  }

  /**
   * Compte le nombre de PJ d'une facture
   */
  async compterPJ(factureId: string): Promise<number> {
    const pj = await this.getPJParFacture(factureId);
    return pj.length;
  }

  /**
   * Retourne la PJ principale d'une facture
   */
  async getPJPrincipale(factureId: string): Promise<PJFacture | null> {
    const pj = await this.getPJParFacture(factureId);
    return pj.find((p) => p.estPrincipale) || pj[0] || null;
  }

  /**
   * Obtient l'URL signée pour télécharger/visualiser un document
   */
  async getUrlDocument(filePath: string): Promise<string> {
    try {
      // Si c'est un lien externe, retourner directement
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
      }
      return await documentsApi.getDocumentUrl(filePath);
    } catch (error) {
      console.error('[FacturePJService] Erreur getUrlDocument:', error);
      return filePath;
    }
  }

  // ========================================
  // HELPERS PRIVÉS
  // ========================================

  /**
   * Convertit un Document Supabase en PJFacture
   */
  private documentToPJ(doc: documentsApi.Document, factureId: string): PJFacture {
    const isExternal = doc.file_path?.startsWith('http://') || doc.file_path?.startsWith('https://');

    return {
      id: doc.id,
      type: isExternal ? 'LIEN_EXTERNE' : 'FICHIER',
      nom: doc.title || doc.file_name,
      url: doc.file_path,
      mimeType: doc.mime_type,
      taille: doc.file_size,
      dateAjout: doc.created_at,
      estPrincipale: doc.tags?.includes('principale') ?? false,
    };
  }

  /**
   * Retire le tag 'principale' de toutes les PJ sauf celle spécifiée
   */
  private async unsetPrincipale(factureId: string, exceptPjId: string): Promise<void> {
    try {
      const documents = await documentsApi.getDocumentsForEntity('facture', factureId);

      for (const doc of documents) {
        if (doc.id === exceptPjId) continue;

        const currentTags = doc.tags || [];
        if (currentTags.includes('principale')) {
          const newTags = currentTags.filter(t => t !== 'principale');
          await documentsApi.updateDocument(doc.id, { tags: newTags });
        }
      }
    } catch (error) {
      console.error('[FacturePJService] Erreur unsetPrincipale:', error);
    }
  }

  private extraireNomDepuisUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      const segments = pathname.split('/').filter(Boolean);
      return segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : url;
    } catch {
      return url;
    }
  }
}

export const facturePJService = new FacturePJService();
