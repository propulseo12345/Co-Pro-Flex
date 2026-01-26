/**
 * Résolveur de variables pour les documents
 *
 * Ce module gère la résolution des variables dynamiques dans les templates de documents.
 * Il corrige notamment les problèmes de mapping pour {nom_syndic} et {modalite_paiement_fonds}.
 */

import type {
  VariablesContext,
  ResolvedVariable,
  ModalitePaiement,
} from './types';
import { LIBELLES_MODALITE_PAIEMENT } from './types';
import { CATALOGUE_VARIABLES, getVariableDefinition } from './catalogue';

/**
 * Résout toutes les variables dans un texte
 */
export function resolveVariables(
  template: string,
  context: VariablesContext
): { text: string; resolved: ResolvedVariable[] } {
  const resolved: ResolvedVariable[] = [];
  let text = template;

  // Parcourir toutes les variables du catalogue
  for (const varDef of CATALOGUE_VARIABLES) {
    if (text.includes(varDef.cle)) {
      const result = resolveVariable(varDef.nom, context);
      resolved.push(result);

      if (result.resolu) {
        text = text.replaceAll(varDef.cle, result.valeur);
      } else {
        // Garder la variable si non résolue avec indication visuelle
        text = text.replaceAll(varDef.cle, `[${varDef.nom} non défini]`);
      }
    }
  }

  return { text, resolved };
}

/**
 * Résout une variable spécifique
 */
export function resolveVariable(
  nomVariable: string,
  context: VariablesContext
): ResolvedVariable {
  const varDef = getVariableDefinition(nomVariable);

  if (!varDef) {
    return {
      cle: `{${nomVariable}}`,
      valeur: '',
      source: 'inconnu',
      resolu: false,
      erreur: `Variable "${nomVariable}" non reconnue`,
    };
  }

  try {
    const valeur = getVariableValue(nomVariable, context);

    return {
      cle: varDef.cle,
      valeur: valeur ?? '',
      source: varDef.source,
      resolu: valeur !== null && valeur !== undefined && valeur !== '',
      erreur: valeur === null ? 'Donnée manquante dans le contexte' : undefined,
    };
  } catch (error) {
    return {
      cle: varDef.cle,
      valeur: '',
      source: varDef.source,
      resolu: false,
      erreur: `Erreur: ${(error as Error).message}`,
    };
  }
}

/**
 * Obtient la valeur d'une variable depuis le contexte
 *
 * CORRECTIONS PRINCIPALES:
 * - {nom_syndic} : Retourne le nom du syndic (raison sociale ou nom/prénom)
 * - {modalite_paiement_fonds} : Retourne le libellé de la modalité
 */
function getVariableValue(
  nomVariable: string,
  context: VariablesContext
): string | null {
  switch (nomVariable) {
    // ========================================
    // COPROPRIÉTÉ
    // ========================================
    case 'nom_copropriete':
      return context.copropriete?.nom ?? null;

    case 'adresse_copropriete':
      if (!context.copropriete) return null;
      return formatAdresse(
        context.copropriete.adresse,
        context.copropriete.codePostal,
        context.copropriete.ville
      );

    case 'nombre_lots':
      return context.copropriete?.nombreLots?.toString() ?? null;

    case 'total_tantiemes':
      return context.copropriete?.totalTantiemes?.toString() ?? null;

    // ========================================
    // SYNDIC - CORRECTION PRINCIPALE
    // ========================================
    case 'nom_syndic':
      if (!context.syndic) return null;

      // CORRECTION : Retourner le nom du syndic, pas la liste des copropriétaires
      if (context.syndic.type === 'professionnel' && context.syndic.raisonSociale) {
        // Syndic professionnel : raison sociale
        return context.syndic.raisonSociale;
      } else {
        // Syndic bénévole ou coopératif : prénom + nom
        return `${context.syndic.prenom} ${context.syndic.nom}`.trim();
      }

    case 'nom_gestionnaire':
      if (!context.syndic) return null;
      return `${context.syndic.prenom} ${context.syndic.nom}`.trim();

    case 'adresse_syndic':
      if (!context.syndic) return null;
      return formatAdresse(
        context.syndic.adresse,
        context.syndic.codePostal,
        context.syndic.ville
      );

    case 'telephone_syndic':
      return context.syndic?.telephone ?? null;

    case 'email_syndic':
      return context.syndic?.email ?? null;

    case 'carte_professionnelle_syndic':
      return context.syndic?.numeroCarteProf ?? null;

    // ========================================
    // AG
    // ========================================
    case 'type_ag':
      if (!context.ag) return null;
      return formatTypeAG(context.ag.type);

    case 'date_ag':
      if (!context.ag?.dateAG) return null;
      return formatDateLong(context.ag.dateAG);

    case 'heure_ag':
      return context.ag?.heureAG ?? null;

    case 'lieu_ag':
      return context.ag?.lieu ?? null;

    case 'date_convocation':
      if (!context.ag?.dateConvocation) return null;
      return formatDateLong(context.ag.dateConvocation);

    case 'date_limite_correspondance':
      if (!context.ag?.dateLimiteCorrespondance) return null;
      return formatDateLong(context.ag.dateLimiteCorrespondance);

    case 'exercice_debut':
      if (!context.ag?.exercice?.dateDebut) return null;
      return formatDateLong(context.ag.exercice.dateDebut);

    case 'exercice_fin':
      if (!context.ag?.exercice?.dateFin) return null;
      return formatDateLong(context.ag.exercice.dateFin);

    // ========================================
    // COPROPRIÉTAIRE
    // ========================================
    case 'civilite_coproprietaire':
      return context.coproprietaire?.civilite ?? null;

    case 'nom_coproprietaire':
      if (!context.coproprietaire) return null;
      return `${context.coproprietaire.civilite} ${context.coproprietaire.prenom} ${context.coproprietaire.nom}`.trim();

    case 'lots_coproprietaire':
      if (!context.coproprietaire?.lots) return null;
      return context.coproprietaire.lots
        .map(l => `Lot ${l.numero} (${l.type})`)
        .join(', ');

    case 'tantiemes_coproprietaire':
      return context.coproprietaire?.totalTantiemes?.toString() ?? null;

    // ========================================
    // FINANCE - CORRECTION PRINCIPALE
    // ========================================
    case 'modalite_paiement_fonds':
    case 'modalites_paiement_budget':
      if (!context.finance?.modalitePaiementFonds) return null;
      // CORRECTION : Utiliser le libellé exact de la modalité
      return getModaliteLabel(context.finance.modalitePaiementFonds);

    case 'modalite_paiement_travaux':
    case 'modalites_paiement_fonds':
      if (!context.finance?.modalitePaiementTravaux) return null;
      return getModaliteLabel(context.finance.modalitePaiementTravaux);

    case 'budget_previsionnel':
      if (context.finance?.budgetPrevisionnel === undefined) return null;
      return formatMontant(context.finance.budgetPrevisionnel);

    case 'fonds_travaux_annuel':
      if (context.finance?.fondsTravauxAnnuel === undefined) return null;
      return formatMontant(context.finance.fondsTravauxAnnuel);

    case 'dates_paiement':
    case 'dates_echeances_budget':
    case 'dates_echeances_fonds':
      if (!context.finance?.datesPaiement?.length) return null;
      return context.finance.datesPaiement
        .map(d => formatDateCourte(d))
        .join(', ');

    // ========================================
    // DATES
    // ========================================
    case 'date_du_jour':
      return formatDateLong(new Date());

    case 'annee_en_cours':
      return new Date().getFullYear().toString();

    // ========================================
    // RÉSOLUTION (contexte spécifique)
    // ========================================
    case 'numero_resolution':
      return context.resolution?.numero ?? null;

    case 'titre_resolution':
      return context.resolution?.titre ?? null;

    case 'article_resolution':
      return context.resolution?.article ?? null;

    default:
      return null;
  }
}

// ========================================
// FONCTIONS DE FORMATAGE
// ========================================

function formatAdresse(adresse: string, codePostal: string, ville: string): string {
  const parts = [adresse, `${codePostal} ${ville}`.trim()].filter(Boolean);
  return parts.join(', ');
}

function formatDateLong(date: Date): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

function formatDateCourte(date: Date): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return '';
  }
}

function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(montant);
}

function formatTypeAG(type: 'ordinaire' | 'extraordinaire' | 'mixte' | 'urgente'): string {
  switch (type) {
    case 'ordinaire':
      return 'Assemblée Générale Ordinaire';
    case 'extraordinaire':
      return 'Assemblée Générale Extraordinaire';
    case 'mixte':
      return 'Assemblée Générale Mixte (Ordinaire et Extraordinaire)';
    case 'urgente':
      return 'Assemblée Générale Urgente';
    default:
      return 'Assemblée Générale';
  }
}

/**
 * Obtient le libellé d'une modalité de paiement
 */
function getModaliteLabel(modalite: ModalitePaiement | string): string {
  // Si c'est déjà une clé connue
  if (modalite in LIBELLES_MODALITE_PAIEMENT) {
    return LIBELLES_MODALITE_PAIEMENT[modalite as ModalitePaiement];
  }

  // Mapping pour les valeurs legacy
  const legacyMapping: Record<string, string> = {
    'MENSUEL': 'Mensuel',
    'BIMESTRIEL': 'Bimestriel',
    'TRIMESTRIEL': 'Trimestriel',
    'SEMESTRIEL': 'Semestriel',
    'ANNUEL': 'Annuel',
    'AU_CHOIX_SYNDIC': 'Au choix du syndic',
    'PERSONNALISE': 'Personnalisé',
    // Minuscules
    'mensuel': 'Mensuel',
    'bimestriel': 'Bimestriel',
    'trimestriel': 'Trimestriel',
    'semestriel': 'Semestriel',
    'annuel': 'Annuel',
    'au_choix_syndic': 'Au choix du syndic',
    'personnalise': 'Personnalisé',
  };

  return legacyMapping[modalite] || modalite;
}

/**
 * Génère les dates d'échéance selon les modalités de paiement
 * Utilitaire pour pré-calculer les dates
 */
export function generateEcheancesDates(modalite: ModalitePaiement | string, exercice: string | number): string {
  const annee = typeof exercice === 'string' ? parseInt(exercice) : exercice;

  switch (modalite.toLowerCase()) {
    case 'trimestriel':
      return `1er janvier ${annee}, 1er avril ${annee}, 1er juillet ${annee}, 1er octobre ${annee}`;
    case 'semestriel':
      return `1er janvier ${annee}, 1er juillet ${annee}`;
    case 'mensuel':
      return `Le 1er de chaque mois de janvier à décembre ${annee}`;
    case 'annuel':
      return `1er janvier ${annee}`;
    case 'au_choix_syndic':
      return 'Selon décision du syndic';
    default:
      return '';
  }
}
