/**
 * Service de gestion de l'émission des appels de fonds
 *
 * Ce service gère :
 * - La validation des appels avant émission
 * - La création des écritures comptables
 * - La génération des documents PDF
 * - La mise à jour du statut
 *
 * Note: Version mock en attendant l'intégration Supabase
 */

import {
  AppelFondsStatut,
  STATUTS_APPEL_FONDS,
  peutEmettreAppel,
} from '@/types/enums/statuts';

// ============================================
// TYPES
// ============================================

/**
 * Interface pour un appel de fonds (simplifié pour le service)
 */
export interface AppelFondsEmission {
  id: string;
  numero: number;
  reference?: string;
  montant: number;
  montantEncaisse: number;
  date: string;
  dateEcheance: string;
  dateEmission?: string;
  description: string;
  statut: AppelFondsStatut | string;
  budgetId?: string;
  projetTravauxId?: string;
  lignes: LigneAppelEmission[];
}

/**
 * Ligne d'appel pour l'émission
 */
export interface LigneAppelEmission {
  id: string;
  coproprietaireId: string;
  coproprietaireNom: string;
  coproprietairePrenom?: string;
  lots: string[];
  quotePart: number;
  montantAppele: number;
  montantPaye: number;
  email?: string;
}

/**
 * Options d'émission d'un appel de fonds
 */
export interface OptionsEmission {
  envoyerEmails: boolean;
  genererPDF: boolean;
  genererEcritures: boolean;
  utilisateurId: string;
  commentaire?: string;
}

/**
 * Résultat de l'émission d'un appel
 */
export interface ResultatEmissionAppel {
  success: boolean;
  appelId: string;
  nouveauStatut: AppelFondsStatut | string;
  ecrituresCreees: number;
  documentsGeneres: number;
  erreurs?: string[];
  dateEmission: string;
}

/**
 * Résultat de la validation
 */
export interface ResultatValidation {
  valide: boolean;
  erreurs: string[];
  appel?: AppelFondsEmission;
}

// ============================================
// SERVICE
// ============================================

class EmissionAppelService {
  // ========================================
  // VALIDATION
  // ========================================

  /**
   * Vérifie si un appel peut être émis
   */
  async validerPourEmission(appel: AppelFondsEmission): Promise<ResultatValidation> {
    const erreurs: string[] = [];

    // Vérifier le statut
    if (!peutEmettreAppel(appel.statut)) {
      const statutInfo = STATUTS_APPEL_FONDS[appel.statut as AppelFondsStatut];
      erreurs.push(
        `L'appel ne peut pas être émis (statut actuel : ${statutInfo?.label || appel.statut})`
      );
    }

    // Vérifier qu'il y a des lignes
    if (!appel.lignes || appel.lignes.length === 0) {
      erreurs.push("L'appel n'a aucune ligne de répartition");
    }

    // Vérifier le montant
    if (appel.montant <= 0) {
      erreurs.push("Le montant de l'appel doit être positif");
    }

    // Vérifier la date d'échéance
    if (!appel.dateEcheance) {
      erreurs.push("La date d'échéance est obligatoire");
    }

    // Vérifier la cohérence des montants
    if (appel.lignes && appel.lignes.length > 0) {
      const totalLignes = appel.lignes.reduce((sum, l) => sum + l.montantAppele, 0);
      if (Math.abs(totalLignes - appel.montant) > 0.01) {
        erreurs.push(
          `Le total des lignes (${totalLignes.toFixed(2)}€) ne correspond pas au montant de l'appel (${appel.montant.toFixed(2)}€)`
        );
      }
    }

    // Vérifier que tous les copropriétaires ont un montant positif
    if (appel.lignes) {
      const lignesInvalides = appel.lignes.filter(l => l.montantAppele <= 0);
      if (lignesInvalides.length > 0) {
        erreurs.push(
          `${lignesInvalides.length} ligne(s) ont un montant nul ou négatif`
        );
      }
    }

    return {
      valide: erreurs.length === 0,
      erreurs,
      appel: erreurs.length === 0 ? appel : undefined,
    };
  }

  // ========================================
  // ÉMISSION
  // ========================================

  /**
   * Émet un appel de fonds
   * - Change le statut EN_ATTENTE → EMIS
   * - Crée les écritures comptables (mock)
   * - Génère les documents PDF (mock)
   */
  async emettreAppel(
    appel: AppelFondsEmission,
    options: OptionsEmission
  ): Promise<ResultatEmissionAppel> {
    const maintenant = new Date().toISOString();

    // 1. Validation
    const validation = await this.validerPourEmission(appel);
    if (!validation.valide) {
      return {
        success: false,
        appelId: appel.id,
        nouveauStatut: appel.statut,
        ecrituresCreees: 0,
        documentsGeneres: 0,
        erreurs: validation.erreurs,
        dateEmission: maintenant,
      };
    }

    let nbEcritures = 0;
    let nbDocuments = 0;
    const erreurs: string[] = [];

    try {
      // 2. Créer les écritures comptables (simulation)
      if (options.genererEcritures) {
        const resultEcritures = await this.creerEcrituresComptables(appel, options.utilisateurId);
        nbEcritures = resultEcritures.nbEcritures;
        if (resultEcritures.erreurs.length > 0) {
          erreurs.push(...resultEcritures.erreurs);
        }
      }

      // 3. Générer les documents PDF (simulation)
      if (options.genererPDF) {
        const resultDocs = await this.genererDocumentsPDF(appel);
        nbDocuments = resultDocs.nbDocuments;
        if (resultDocs.erreurs.length > 0) {
          erreurs.push(...resultDocs.erreurs);
        }
      }

      // 4. Envoyer les emails si demandé (simulation)
      if (options.envoyerEmails) {
        await this.envoyerEmailsCoproprietaires(appel);
      }

      // 5. Logger l'action
      this.loggerEmission(appel.id, options, nbEcritures, nbDocuments);

      return {
        success: true,
        appelId: appel.id,
        nouveauStatut: AppelFondsStatut.EMIS,
        ecrituresCreees: nbEcritures,
        documentsGeneres: nbDocuments,
        erreurs: erreurs.length > 0 ? erreurs : undefined,
        dateEmission: maintenant,
      };

    } catch (error) {
      return {
        success: false,
        appelId: appel.id,
        nouveauStatut: appel.statut,
        ecrituresCreees: 0,
        documentsGeneres: 0,
        erreurs: [(error as Error).message],
        dateEmission: maintenant,
      };
    }
  }

  // ========================================
  // ÉCRITURES COMPTABLES (MOCK)
  // ========================================

  /**
   * Crée les écritures comptables pour l'appel
   * Note: Version mock - à connecter avec Supabase
   */
  private async creerEcrituresComptables(
    appel: AppelFondsEmission,
    _utilisateurId: string
  ): Promise<{ nbEcritures: number; erreurs: string[] }> {
    const erreurs: string[] = [];

    if (!appel.lignes || appel.lignes.length === 0) {
      return { nbEcritures: 0, erreurs: ['Aucune ligne à traiter'] };
    }

    // Simulation de création d'écritures
    // En réel, cela créerait des lignes dans la table ecritures_comptables
    const nbEcritures = appel.lignes.length * 2; // 2 écritures par ligne (débit/crédit)

    console.log(`[EmissionAppelService] Simulation création ${nbEcritures} écritures comptables`);
    console.log(`  - Appel: ${appel.reference || appel.id}`);
    console.log(`  - Montant total: ${appel.montant}€`);
    console.log(`  - Lignes: ${appel.lignes.length}`);

    // Simuler un délai pour l'effet visuel
    await new Promise(resolve => setTimeout(resolve, 500));

    return { nbEcritures, erreurs };
  }

  // ========================================
  // GÉNÉRATION PDF (MOCK)
  // ========================================

  /**
   * Génère les documents PDF individuels
   * Note: Version mock - à implémenter avec jsPDF
   */
  private async genererDocumentsPDF(appel: AppelFondsEmission): Promise<{
    nbDocuments: number;
    erreurs: string[];
  }> {
    const erreurs: string[] = [];

    if (!appel.lignes || appel.lignes.length === 0) {
      return { nbDocuments: 0, erreurs: ['Aucune ligne à traiter'] };
    }

    // Simulation de génération de PDFs
    const nbDocuments = appel.lignes.length;

    console.log(`[EmissionAppelService] Simulation génération ${nbDocuments} documents PDF`);

    // Simuler un délai pour l'effet visuel
    await new Promise(resolve => setTimeout(resolve, 800));

    return { nbDocuments, erreurs };
  }

  // ========================================
  // ENVOI EMAILS (MOCK)
  // ========================================

  /**
   * Envoie les emails aux copropriétaires
   * Note: Version mock - à intégrer avec un service d'email
   */
  private async envoyerEmailsCoproprietaires(appel: AppelFondsEmission): Promise<void> {
    console.log(`[EmissionAppelService] Simulation envoi emails pour appel ${appel.id}`);

    if (appel.lignes) {
      const coprosAvecEmail = appel.lignes.filter(l => l.email);
      console.log(`  - ${coprosAvecEmail.length}/${appel.lignes.length} copropriétaires avec email`);
    }

    // Simuler un délai pour l'effet visuel
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // ========================================
  // LOGGING
  // ========================================

  /**
   * Log l'émission dans l'historique
   */
  private loggerEmission(
    appelId: string,
    options: OptionsEmission,
    nbEcritures: number,
    nbDocuments: number
  ): void {
    console.log(`[EmissionAppelService] Émission appel ${appelId}`);
    console.log(`  - Options:`, {
      envoyerEmails: options.envoyerEmails,
      genererPDF: options.genererPDF,
      genererEcritures: options.genererEcritures,
    });
    console.log(`  - Résultat: ${nbEcritures} écritures, ${nbDocuments} documents`);
  }

  // ========================================
  // UTILITAIRES
  // ========================================

  /**
   * Calcule le récapitulatif pour la modal d'émission
   */
  getRecapitulatifEmission(appel: AppelFondsEmission): {
    montantTotal: number;
    nbCoproprietaires: number;
    nbLotsConcernes: number;
    dateEcheanceFormatee: string;
  } {
    const nbLots = appel.lignes?.reduce((acc, l) => acc + (l.lots?.length || 0), 0) || 0;

    return {
      montantTotal: appel.montant,
      nbCoproprietaires: appel.lignes?.length || 0,
      nbLotsConcernes: nbLots,
      dateEcheanceFormatee: new Date(appel.dateEcheance).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  /**
   * Génère une référence pour l'appel
   */
  genererReference(numero: number, annee?: number): string {
    const a = annee || new Date().getFullYear();
    return `AF-${a}-${numero.toString().padStart(3, '0')}`;
  }
}

// Export singleton
export const emissionAppelService = new EmissionAppelService();
