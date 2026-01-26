/**
 * Utilitaires pour construire le contexte de variables depuis les données existantes
 *
 * Ce module fait le pont entre les structures de données existantes
 * (ContratSyndic, ParametresCopropriete, etc.) et le nouveau système de variables.
 */

import type { VariablesContext, ModalitePaiement, TypeSyndic } from './variables';
import type { ContratSyndic } from '@/types';
import type { Gestionnaire, Coproprietaire } from '@/data/mock';

interface BuildContextOptions {
  // Données de la copropriété
  copropriete?: {
    nom: string;
    adresse: string;
    nombreLots?: number;
  };

  // Contrat syndic existant
  contratSyndic?: ContratSyndic;

  // Gestionnaire spécifique (pour nom_gestionnaire)
  gestionnaire?: Gestionnaire;

  // AG
  ag?: {
    type: 'ordinaire' | 'extraordinaire' | 'mixte' | 'urgente' | 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
    date: Date | string;
    heure: string;
    lieu: string;
    dateConvocation?: Date | string;
    dateLimiteCorrespondance?: Date | string;
    exerciceDebut?: Date | string;
    exerciceFin?: Date | string;
  };

  // Finance
  finance?: {
    modalitePaiementFonds?: ModalitePaiement | string;
    modalitePaiementTravaux?: ModalitePaiement | string;
    budgetPrevisionnel?: number;
    fondsTravauxAnnuel?: number;
    datesPaiement?: (Date | string)[];
  };

  // Copropriétaire spécifique (pour mails personnalisés)
  coproprietaire?: Coproprietaire;

  // Tantièmes totaux
  totalTantiemes?: number;
}

/**
 * Construit un VariablesContext depuis les données existantes
 *
 * IMPORTANT: Cette fonction fait le mapping correct entre:
 * - ContratSyndic.nomSyndic → {nom_syndic}
 * - finance.modalitePaiementFonds → {modalite_paiement_fonds} avec libellé
 */
export function buildVariablesContext(options: BuildContextOptions): VariablesContext {
  const context: VariablesContext = {};

  // ========================================
  // COPROPRIÉTÉ
  // ========================================
  if (options.copropriete) {
    const adresseParts = parseAdresse(options.copropriete.adresse);
    context.copropriete = {
      id: 'copro-1',
      nom: options.copropriete.nom,
      adresse: adresseParts.rue,
      codePostal: adresseParts.codePostal,
      ville: adresseParts.ville,
      nombreLots: options.copropriete.nombreLots ?? 0,
      totalTantiemes: options.totalTantiemes ?? 0,
    };
  }

  // ========================================
  // SYNDIC - CORRECTION DU MAPPING
  // ========================================
  if (options.contratSyndic) {
    const syndic = options.contratSyndic;
    const adresseParts = parseAdresse(syndic.adresse ?? '');

    // Déterminer le type de syndic
    // Si cabinetNom est défini, c'est un syndic professionnel
    const typeSyndic: TypeSyndic = syndic.cabinetNom ? 'professionnel' : 'benevole';

    // Extraire nom et prénom du gestionnaire si disponible
    let nomGestionnaire = '';
    let prenomGestionnaire = '';

    if (options.gestionnaire) {
      nomGestionnaire = options.gestionnaire.nom;
      prenomGestionnaire = options.gestionnaire.prenom;
    } else {
      // Essayer d'extraire depuis nomSyndic si c'est un nom de personne
      const parts = syndic.nomSyndic.split(' ');
      if (parts.length >= 2 && !syndic.cabinetNom) {
        prenomGestionnaire = parts[0];
        nomGestionnaire = parts.slice(1).join(' ');
      }
    }

    context.syndic = {
      id: syndic.id,
      type: typeSyndic,
      // CORRECTION: raisonSociale = nomSyndic ou cabinetNom pour syndic pro
      raisonSociale: syndic.cabinetNom || syndic.nomSyndic,
      nom: nomGestionnaire,
      prenom: prenomGestionnaire,
      adresse: adresseParts.rue,
      codePostal: adresseParts.codePostal,
      ville: adresseParts.ville,
      telephone: syndic.telephone ?? '',
      email: syndic.email ?? '',
    };
  }

  // ========================================
  // AG
  // ========================================
  if (options.ag) {
    const ag = options.ag;
    const typeNormalise = normalizeAGType(ag.type);

    context.ag = {
      id: 'ag-1',
      type: typeNormalise,
      dateAG: toDate(ag.date),
      heureAG: ag.heure,
      lieu: ag.lieu,
      dateConvocation: toDate(ag.dateConvocation ?? new Date()),
      dateLimiteCorrespondance: ag.dateLimiteCorrespondance ? toDate(ag.dateLimiteCorrespondance) : undefined,
      exercice: {
        dateDebut: toDate(ag.exerciceDebut ?? `${new Date().getFullYear()}-01-01`),
        dateFin: toDate(ag.exerciceFin ?? `${new Date().getFullYear()}-12-31`),
      },
    };
  }

  // ========================================
  // FINANCE - CORRECTION DU MAPPING
  // ========================================
  if (options.finance) {
    const finance = options.finance;

    context.finance = {
      // CORRECTION: Normaliser la modalité de paiement
      modalitePaiementFonds: normalizeModalite(finance.modalitePaiementFonds),
      modalitePaiementTravaux: finance.modalitePaiementTravaux
        ? normalizeModalite(finance.modalitePaiementTravaux)
        : undefined,
      budgetPrevisionnel: finance.budgetPrevisionnel,
      fondsTravauxAnnuel: finance.fondsTravauxAnnuel,
      datesPaiement: finance.datesPaiement?.map(d => toDate(d)),
    };
  }

  // ========================================
  // COPROPRIÉTAIRE
  // ========================================
  if (options.coproprietaire) {
    const copro = options.coproprietaire;
    const { prenom, nom } = parseNomComplet(copro.nom);

    context.coproprietaire = {
      id: copro.id,
      civilite: 'M.',  // À améliorer avec une vraie civilité
      nom,
      prenom,
      adresse: copro.adressePostale
        ? `${copro.adressePostale.rue}, ${copro.adressePostale.codePostal} ${copro.adressePostale.ville}`
        : '',
      lots: [{ numero: copro.lot, tantiemes: copro.tantiemes, type: 'appartement' }],
      totalTantiemes: copro.tantiemes,
    };
  }

  return context;
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Parse une adresse complète en composants
 */
function parseAdresse(adresse: string): { rue: string; codePostal: string; ville: string } {
  if (!adresse) {
    return { rue: '', codePostal: '', ville: '' };
  }

  // Format attendu: "15 place Bellecour, 69002 Lyon"
  const parts = adresse.split(',').map(p => p.trim());

  if (parts.length >= 2) {
    const rue = parts[0];
    const codeVille = parts[1];
    const cpMatch = codeVille.match(/(\d{5})\s+(.+)/);

    if (cpMatch) {
      return {
        rue,
        codePostal: cpMatch[1],
        ville: cpMatch[2],
      };
    }
  }

  return { rue: adresse, codePostal: '', ville: '' };
}

/**
 * Parse un nom complet "Prénom NOM" en composants
 */
function parseNomComplet(nomComplet: string): { prenom: string; nom: string } {
  if (!nomComplet) {
    return { prenom: '', nom: '' };
  }

  const parts = nomComplet.trim().split(' ');

  if (parts.length === 1) {
    return { prenom: '', nom: parts[0] };
  }

  // Premier mot = prénom, reste = nom
  return {
    prenom: parts[0],
    nom: parts.slice(1).join(' '),
  };
}

/**
 * Convertit une valeur en Date
 */
function toDate(value: Date | string | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return new Date(value);
}

/**
 * Normalise le type d'AG
 */
function normalizeAGType(type: string): 'ordinaire' | 'extraordinaire' | 'mixte' | 'urgente' {
  const normalized = type.toLowerCase();
  if (normalized === 'ordinaire') return 'ordinaire';
  if (normalized === 'extraordinaire') return 'extraordinaire';
  if (normalized === 'mixte') return 'mixte';
  if (normalized === 'urgente') return 'urgente';
  return 'ordinaire';
}

/**
 * Normalise la modalité de paiement
 */
function normalizeModalite(modalite: string | undefined): ModalitePaiement {
  if (!modalite) return 'trimestriel';

  const normalized = modalite.toLowerCase();

  const mapping: Record<string, ModalitePaiement> = {
    'mensuel': 'mensuel',
    'bimestriel': 'bimestriel',
    'trimestriel': 'trimestriel',
    'semestriel': 'semestriel',
    'annuel': 'annuel',
    'au_choix_syndic': 'au_choix_syndic',
    'personnalise': 'personnalise',
  };

  return mapping[normalized] || 'trimestriel';
}
