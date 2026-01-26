import {
  PJFacture,
  UploadPJData,
  UploadResult,
  validateFile,
  validateUrl,
  generatePJId,
} from '@/components/features/finance/Factures/types';

/**
 * Service de gestion des pièces jointes de factures
 * NOTE: Version frontend - stockage localStorage en attendant Supabase
 */
class FacturePJService {
  private storageKey = 'coproflex-factures-pj';

  // ========================================
  // RÉCUPÉRATION
  // ========================================

  /**
   * Récupère toutes les PJ d'une facture
   */
  async getPJParFacture(factureId: string): Promise<PJFacture[]> {
    const toutes = this.getAllPJ();
    return toutes
      .filter((pj) => pj.id.startsWith(`${factureId}-`))
      .sort((a, b) => {
        // PJ principale en premier
        if (a.estPrincipale && !b.estPrincipale) return -1;
        if (!a.estPrincipale && b.estPrincipale) return 1;
        // Puis par date d'ajout (plus récente en premier)
        return new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime();
      });
  }

  /**
   * Récupère une PJ par son ID
   */
  async getPJById(pjId: string): Promise<PJFacture | null> {
    const toutes = this.getAllPJ();
    return toutes.find((pj) => pj.id === pjId) || null;
  }

  // ========================================
  // UPLOAD ET CRÉATION
  // ========================================

  /**
   * Upload un fichier comme PJ
   */
  async uploadFichier(factureId: string, data: UploadPJData): Promise<UploadResult> {
    if (!data.file) {
      return { success: false, error: 'Aucun fichier fourni' };
    }

    // Valider le fichier
    const validation = validateFile(data.file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Simuler un délai d'upload
    await new Promise((r) => setTimeout(r, 300));

    const nouvellePJ: PJFacture = {
      id: `${factureId}-${generatePJId()}`,
      type: 'FICHIER',
      nom: data.nomPersonnalise || data.file.name,
      url: URL.createObjectURL(data.file), // En production: URL Supabase/S3
      mimeType: data.file.type,
      taille: data.file.size,
      dateAjout: new Date().toISOString(),
      estPrincipale: data.estPrincipale ?? false,
    };

    // Gérer l'unicité de estPrincipale
    if (nouvellePJ.estPrincipale) {
      await this.unsetPrincipale(factureId);
    }

    // Sauvegarder
    const toutes = this.getAllPJ();
    toutes.push(nouvellePJ);
    this.savePJ(toutes);

    return { success: true, pj: nouvellePJ };
  }

  /**
   * Ajoute un lien externe comme PJ
   */
  async ajouterLienExterne(factureId: string, data: UploadPJData): Promise<UploadResult> {
    if (!data.lienExterne) {
      return { success: false, error: 'Aucun lien fourni' };
    }

    // Valider l'URL
    const validation = validateUrl(data.lienExterne);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const nouvellePJ: PJFacture = {
      id: `${factureId}-${generatePJId()}`,
      type: 'LIEN_EXTERNE',
      nom: data.nomPersonnalise || this.extraireNomDepuisUrl(data.lienExterne),
      url: data.lienExterne,
      dateAjout: new Date().toISOString(),
      estPrincipale: data.estPrincipale ?? false,
    };

    // Gérer l'unicité de estPrincipale
    if (nouvellePJ.estPrincipale) {
      await this.unsetPrincipale(factureId);
    }

    // Sauvegarder
    const toutes = this.getAllPJ();
    toutes.push(nouvellePJ);
    this.savePJ(toutes);

    return { success: true, pj: nouvellePJ };
  }

  // ========================================
  // MODIFICATION
  // ========================================

  /**
   * Définit une PJ comme principale
   */
  async definirPrincipale(factureId: string, pjId: string): Promise<boolean> {
    const toutes = this.getAllPJ();

    // Enlever le flag principal de toutes les PJ de cette facture
    toutes.forEach((pj) => {
      if (pj.id.startsWith(`${factureId}-`)) {
        pj.estPrincipale = pj.id === pjId;
      }
    });

    this.savePJ(toutes);
    return true;
  }

  /**
   * Renomme une PJ
   */
  async renommerPJ(pjId: string, nouveauNom: string): Promise<boolean> {
    const toutes = this.getAllPJ();
    const pj = toutes.find((p) => p.id === pjId);

    if (!pj) return false;

    pj.nom = nouveauNom;
    this.savePJ(toutes);
    return true;
  }

  // ========================================
  // SUPPRESSION
  // ========================================

  /**
   * Supprime une PJ
   */
  async supprimerPJ(pjId: string): Promise<boolean> {
    const toutes = this.getAllPJ();
    const index = toutes.findIndex((pj) => pj.id === pjId);

    if (index === -1) return false;

    // Révoquer l'URL blob si c'est un fichier local
    const pj = toutes[index];
    if (pj.type === 'FICHIER' && pj.url.startsWith('blob:')) {
      URL.revokeObjectURL(pj.url);
    }

    toutes.splice(index, 1);
    this.savePJ(toutes);

    return true;
  }

  /**
   * Supprime toutes les PJ d'une facture
   */
  async supprimerToutesPJ(factureId: string): Promise<number> {
    const toutes = this.getAllPJ();
    const aSupprimer = toutes.filter((pj) => pj.id.startsWith(`${factureId}-`));

    // Révoquer les URLs blob
    aSupprimer.forEach((pj) => {
      if (pj.type === 'FICHIER' && pj.url.startsWith('blob:')) {
        URL.revokeObjectURL(pj.url);
      }
    });

    const restantes = toutes.filter((pj) => !pj.id.startsWith(`${factureId}-`));
    this.savePJ(restantes);

    return aSupprimer.length;
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

  // ========================================
  // STOCKAGE LOCAL
  // ========================================

  private getAllPJ(): PJFacture[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch {
      return [];
    }
  }

  private savePJ(pj: PJFacture[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(pj));
  }

  private async unsetPrincipale(factureId: string): Promise<void> {
    const toutes = this.getAllPJ();
    toutes.forEach((pj) => {
      if (pj.id.startsWith(`${factureId}-`)) {
        pj.estPrincipale = false;
      }
    });
    this.savePJ(toutes);
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
