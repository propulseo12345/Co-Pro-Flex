/**
 * Service de gestion des signatures du procès-verbal d'AG
 * Version mock utilisant localStorage (prêt pour migration Supabase)
 */

import {
  SignatairePV,
  SignaturePVData,
  ConfigurationSignature,
  ModeSignature,
  TypeSignataire,
  StatutSignature,
  PreRemplissageResult,
  LABELS_MODE_SIGNATURE,
} from '@/types/models/pv-signature';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';

// Clé localStorage
const STORAGE_KEY_PREFIX = 'pv-signatures-';

/**
 * Génère un ID unique
 */
function generateId(): string {
  return `sig-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Service de gestion des signatures du PV
 */
class PVSignatureService {
  /**
   * Récupère les données de signature pour une AG
   */
  async getSignataires(agId: string): Promise<SignaturePVData | null> {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${agId}`);
    if (!stored) return null;

    const data = JSON.parse(stored);
    return this.mapToSignatureData(data);
  }

  /**
   * Définit le mode de signature
   */
  async setModeSignature(
    agId: string,
    mode: ModeSignature
  ): Promise<SignaturePVData> {
    const existant = await this.getSignataires(agId);

    const configuration: ConfigurationSignature = {
      mode,
      ...(existant?.configuration || {}),
    };

    // Si passage en mode sur place, réinitialiser les infos électroniques
    if (mode === 'sur_place' && existant) {
      const signataires = existant.signataires.map(s => ({
        ...s,
        signatureEnvoyeeLe: undefined,
        signatureRelanceLe: undefined,
      }));

      return this.sauvegarderSignataires(agId, signataires, configuration);
    }

    return this.sauvegarderSignataires(
      agId,
      existant?.signataires || [],
      configuration
    );
  }

  /**
   * Valide un signataire selon le mode
   */
  validerSignataire(
    signataire: Partial<SignatairePV>,
    mode: ModeSignature
  ): { valide: boolean; erreurs: string[] } {
    const erreurs: string[] = [];
    const config = LABELS_MODE_SIGNATURE[mode];

    // Nom et prénom toujours obligatoires
    if (!signataire.nom?.trim()) {
      erreurs.push('Le nom est obligatoire');
    }
    if (!signataire.prenom?.trim()) {
      erreurs.push('Le prénom est obligatoire');
    }

    // Email obligatoire uniquement en mode électronique
    if (config.emailObligatoire && !signataire.email?.trim()) {
      erreurs.push('L\'email est obligatoire pour la signature électronique');
    }

    // Validation format email si fourni
    if (signataire.email && !this.isValidEmail(signataire.email)) {
      erreurs.push('Le format de l\'email est invalide');
    }

    return {
      valide: erreurs.length === 0,
      erreurs,
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Pré-remplit les signataires depuis les rôles de l'AG
   */
  async preRemplirDepuisAG(agId: string): Promise<PreRemplissageResult> {
    const rolesData = localStorage.getItem(`roles-ag-${agId}`);

    if (!rolesData) {
      return {
        success: false,
        signataires: [],
        rolesManquants: ['president', 'secretaire', 'scrutateur'],
        warnings: ['Aucun rôle désigné pour cette AG'],
      };
    }

    const roles = JSON.parse(rolesData);
    const signataires: SignatairePV[] = [];
    const rolesManquants: TypeSignataire[] = [];
    const warnings: string[] = [];

    // Président
    if (roles.presidentSeance?.nom) {
      const copro = roles.presidentSeance.coproprietaireId
        ? MOCK_COPROPRIETAIRES.find(c => c.id === roles.presidentSeance.coproprietaireId)
        : null;

      const { prenom, nom } = this.parseFullName(roles.presidentSeance.nom);

      signataires.push({
        id: generateId(),
        type: 'president',
        ordre: 1,
        personneId: roles.presidentSeance.coproprietaireId || generateId(),
        typePersonne: 'coproprietaire',
        nom,
        prenom,
        email: copro?.email,
        telephone: copro?.telephone,
        statut: 'en_attente',
        signaturePhysique: false,
        sourceRoleAG: true,
      });
    } else {
      rolesManquants.push('president');
    }

    // Secrétaire
    if (roles.secretaireSeance?.nom) {
      const copro = roles.secretaireSeance.coproprietaireId
        ? MOCK_COPROPRIETAIRES.find(c => c.id === roles.secretaireSeance.coproprietaireId)
        : null;

      const { prenom, nom } = this.parseFullName(roles.secretaireSeance.nom);
      const isGestionnaire = roles.secretaireSeance.estGestionnaire;

      signataires.push({
        id: generateId(),
        type: 'secretaire',
        ordre: 2,
        personneId: roles.secretaireSeance.coproprietaireId || generateId(),
        typePersonne: isGestionnaire ? 'gestionnaire' : 'coproprietaire',
        nom,
        prenom,
        email: copro?.email,
        telephone: copro?.telephone,
        societe: isGestionnaire ? roles.secretaireSeance.representeSyndic : undefined,
        statut: 'en_attente',
        signaturePhysique: false,
        sourceRoleAG: true,
      });
    } else {
      rolesManquants.push('secretaire');
    }

    // Scrutateur
    if (roles.scrutateur?.nom) {
      const copro = roles.scrutateur.coproprietaireId
        ? MOCK_COPROPRIETAIRES.find(c => c.id === roles.scrutateur.coproprietaireId)
        : null;

      const { prenom, nom } = this.parseFullName(roles.scrutateur.nom);

      signataires.push({
        id: generateId(),
        type: 'scrutateur',
        ordre: 3,
        personneId: roles.scrutateur.coproprietaireId || generateId(),
        typePersonne: 'coproprietaire',
        nom,
        prenom,
        email: copro?.email,
        telephone: copro?.telephone,
        statut: 'en_attente',
        signaturePhysique: false,
        sourceRoleAG: true,
      });
    } else {
      rolesManquants.push('scrutateur');
    }

    return {
      success: signataires.length > 0,
      signataires,
      rolesManquants,
      warnings,
    };
  }

  /**
   * Valide les signatures sur place
   */
  async validerSignaturesSurPlace(
    agId: string,
    options: {
      lieuSignature?: string;
      dateSignature?: Date;
      validePar: string;
    }
  ): Promise<SignaturePVData> {
    const existant = await this.getSignataires(agId);
    if (!existant) {
      throw new Error('Signataires non trouvés');
    }

    if (existant.configuration.mode !== 'sur_place') {
      throw new Error('Cette action n\'est disponible qu\'en mode "Sur place"');
    }

    const now = new Date();

    // Marquer tous les signataires en attente comme signés physiquement
    const signataires = existant.signataires.map(s => {
      if (s.statut === 'en_attente') {
        return {
          ...s,
          statut: 'signe' as StatutSignature,
          signaturePhysique: true,
          signaturePhysiqueValideLe: now,
          signaturePhysiqueValidePar: options.validePar,
          dateSignature: options.dateSignature || now,
        };
      }
      return s;
    });

    // Mettre à jour la configuration
    const configuration: ConfigurationSignature = {
      ...existant.configuration,
      lieuSignature: options.lieuSignature,
      dateSignaturePhysique: options.dateSignature || now,
    };

    return this.sauvegarderSignataires(agId, signataires, configuration);
  }

  /**
   * Envoie les demandes de signature électronique
   */
  async envoyerDemandesSignature(agId: string): Promise<{
    envoyes: number;
    erreurs: { signataireId: string; erreur: string }[];
  }> {
    const existant = await this.getSignataires(agId);
    if (!existant) {
      throw new Error('Signataires non trouvés');
    }

    if (existant.configuration.mode !== 'electronique') {
      throw new Error('Cette action n\'est disponible qu\'en mode "Électronique"');
    }

    const erreurs: { signataireId: string; erreur: string }[] = [];
    let envoyes = 0;
    const now = new Date();

    const signataires = existant.signataires.map(s => {
      if (s.statut !== 'en_attente') return s;

      // Vérifier l'email
      if (!s.email) {
        erreurs.push({
          signataireId: s.id,
          erreur: 'Email manquant',
        });
        return s;
      }

      // Simulation d'envoi d'email
      envoyes++;
      return {
        ...s,
        signatureEnvoyeeLe: now,
      };
    });

    await this.sauvegarderSignataires(agId, signataires, existant.configuration);

    return { envoyes, erreurs };
  }

  /**
   * Ajoute un signataire
   */
  async ajouterSignataire(
    agId: string,
    signataire: Omit<SignatairePV, 'id' | 'sourceRoleAG'>
  ): Promise<SignatairePV> {
    const existant = await this.getSignataires(agId);
    const configuration = existant?.configuration || { mode: 'sur_place' as ModeSignature };

    const nouveau: SignatairePV = {
      ...signataire,
      id: generateId(),
      sourceRoleAG: false,
    };

    const signataires = [...(existant?.signataires || []), nouveau];
    await this.sauvegarderSignataires(agId, signataires, configuration);

    return nouveau;
  }

  /**
   * Supprime un signataire
   */
  async supprimerSignataire(agId: string, signataireId: string): Promise<void> {
    const existant = await this.getSignataires(agId);
    if (!existant) return;

    const signataires = existant.signataires.filter(s => s.id !== signataireId);
    await this.sauvegarderSignataires(agId, signataires, existant.configuration);
  }

  /**
   * Met à jour le statut de signature d'un signataire
   */
  async mettreAJourSignature(
    agId: string,
    signataireId: string,
    updates: Partial<SignatairePV>
  ): Promise<void> {
    const existant = await this.getSignataires(agId);
    if (!existant) return;

    const signataires = existant.signataires.map(s =>
      s.id === signataireId ? { ...s, ...updates } : s
    );

    await this.sauvegarderSignataires(agId, signataires, existant.configuration);
  }

  /**
   * Upload du PV scanné (mode sur place)
   * Note: Version mock - en production, utiliser Supabase Storage
   */
  async uploadPVScanne(
    agId: string,
    fichier: File
  ): Promise<{ url: string; nom: string; taille: number }> {
    // Simulation - en production utiliser Supabase Storage
    const fakeUrl = URL.createObjectURL(fichier);

    // Mettre à jour la configuration
    const existant = await this.getSignataires(agId);
    if (existant) {
      const configuration: ConfigurationSignature = {
        ...existant.configuration,
        pvScanneUrl: fakeUrl,
        pvScanneNom: fichier.name,
        pvScanneTaille: fichier.size,
      };
      await this.sauvegarderSignataires(agId, existant.signataires, configuration);
    }

    return {
      url: fakeUrl,
      nom: fichier.name,
      taille: fichier.size,
    };
  }

  /**
   * Sauvegarde les signataires avec configuration
   */
  async sauvegarderSignataires(
    agId: string,
    signataires: SignatairePV[],
    configuration?: ConfigurationSignature
  ): Promise<SignaturePVData> {
    const config = configuration || { mode: 'sur_place' as ModeSignature };
    const now = new Date();

    const data: SignaturePVData = {
      pvId: `pv-${agId}`,
      agId,
      configuration: config,
      signataires,
      tousSignes: signataires.length > 0 && signataires.every(
        s => s.statut === 'signe' || s.statut === 'non_requis'
      ),
      preRempliDepuisAG: signataires.some(s => s.sourceRoleAG),
      createdAt: now,
      updatedAt: now,
    };

    localStorage.setItem(`${STORAGE_KEY_PREFIX}${agId}`, JSON.stringify(data));

    return data;
  }

  /**
   * Parse un nom complet en prénom et nom
   */
  private parseFullName(fullName: string): { prenom: string; nom: string } {
    if (!fullName) return { prenom: '', nom: '' };
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return { prenom: '', nom: parts[0] };
    }
    return {
      prenom: parts.slice(0, -1).join(' '),
      nom: parts[parts.length - 1],
    };
  }

  /**
   * Map les données brutes vers SignaturePVData
   */
  private mapToSignatureData(data: Partial<SignaturePVData>): SignaturePVData {
    return {
      pvId: data.pvId || '',
      agId: data.agId || '',
      configuration: data.configuration || { mode: 'sur_place' },
      signataires: data.signataires || [],
      tousSignes: data.tousSignes || false,
      dateFinalisationPV: data.dateFinalisationPV ? new Date(data.dateFinalisationPV) : undefined,
      preRempliDepuisAG: data.preRempliDepuisAG || false,
      datePreRemplissage: data.datePreRemplissage ? new Date(data.datePreRemplissage) : undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
  }
}

export const pvSignatureService = new PVSignatureService();
