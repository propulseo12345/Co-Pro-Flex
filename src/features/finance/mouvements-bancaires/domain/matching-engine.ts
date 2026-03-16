import type {
  MouvementBancaireBase,
  EcritureComptable,
  SuggestionCategorie,
  SuggestionRapprochement,
  CategorieComptable,
} from './types';
import {
  PLAN_COMPTABLE_ESSENTIEL,
  FOURNISSEURS_CONNUS,
  HEURISTIQUES_LIBELLE,
  MOCK_FACTURES_EN_ATTENTE,
} from './constants';

// ============================================
// Règle 1: Montant exact + date proche (≤5j)
// ============================================
function matchMontantExactDateProche(
  mouvement: MouvementBancaireBase,
  ecritures: EcritureComptable[]
): (SuggestionRapprochement & { preChecked: boolean })[] {
  const dateM = new Date(mouvement.date).getTime();
  const montantAbs = Math.abs(mouvement.montant);

  return ecritures
    .filter(ec => {
      if (ec.rapproche) return false;
      const montantEc = ec.debit > 0 ? ec.debit : ec.credit;
      const dateEc = new Date(ec.date).getTime();
      const diffJours = Math.abs(dateM - dateEc) / (1000 * 60 * 60 * 24);
      return Math.abs(montantAbs - montantEc) < 0.02 && diffJours <= 5;
    })
    .map(ec => ({
      ecritureId: ec.id,
      confiance: 'haute' as const,
      raison: `Montant exact + date à ${Math.round(Math.abs(dateM - new Date(ec.date).getTime()) / (1000 * 60 * 60 * 24))}j`,
      ecart: Math.abs(montantAbs - (ec.debit > 0 ? ec.debit : ec.credit)),
      preChecked: true,
    }));
}

// ============================================
// Règle 2: Pattern fournisseur + montant (≤5%)
// ============================================
function matchFournisseurMontant(
  mouvement: MouvementBancaireBase
): SuggestionCategorie | null {
  const libLower = mouvement.libelle.toLowerCase();
  const montantAbs = Math.abs(mouvement.montant);

  // Check fournisseurs connus
  for (const fournisseur of FOURNISSEURS_CONNUS) {
    if (fournisseur.motsClés.some(kw => libLower.includes(kw))) {
      const compte = PLAN_COMPTABLE_ESSENTIEL.find(c => c.code === fournisseur.compte);
      if (!compte) continue;

      // Check pending invoices for amount match
      const factureMatch = MOCK_FACTURES_EN_ATTENTE.find(
        f => f.fournisseur.toLowerCase() === fournisseur.nom.toLowerCase()
          && Math.abs(f.montant - montantAbs) / montantAbs <= 0.05
      );

      return {
        id: `sugg-fourn-${fournisseur.nom}`,
        type: 'fournisseur',
        confiance: 'haute',
        raison: `Fournisseur ${fournisseur.nom} détecté`,
        categorie: compte.categorie as CategorieComptable,
        compte: compte.code,
        compteLabel: compte.label,
        entiteReference: factureMatch ? {
          type: 'facture',
          id: factureMatch.id,
          nom: factureMatch.fournisseur,
          montant: factureMatch.montant,
        } : undefined,
      };
    }
  }

  // Fallback: heuristiques libellé
  for (const heuristique of HEURISTIQUES_LIBELLE) {
    if (heuristique.pattern.test(mouvement.libelle)) {
      return {
        id: `sugg-heur-${heuristique.compte}`,
        type: 'libelle',
        confiance: 'moyenne',
        raison: `Pattern libellé détecté`,
        categorie: heuristique.categorie,
        compte: heuristique.compte,
        compteLabel: heuristique.label,
      };
    }
  }

  return null;
}

// ============================================
// Règle 3: Récurrence (même montant + même jour ±3j)
// ============================================
function matchRecurrence(
  mouvement: MouvementBancaireBase,
  historique: MouvementBancaireBase[]
): SuggestionCategorie | null {
  const montantAbs = Math.abs(mouvement.montant);
  const jourMois = new Date(mouvement.date).getDate();

  const similaires = historique.filter(m => {
    if (m.id === mouvement.id) return false;
    if (!m.categorise || !m.compteComptable) return false;
    if (Math.abs(Math.abs(m.montant) - montantAbs) > 0.01) return false;
    const jourM = new Date(m.date).getDate();
    return Math.abs(jourM - jourMois) <= 3;
  });

  if (similaires.length === 0) return null;

  // Prendre le plus récent comme référence
  const reference = similaires.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  const compteCode = reference.compteComptable!.split(' ')[0];
  const compte = PLAN_COMPTABLE_ESSENTIEL.find(c => c.code === compteCode);

  return {
    id: `sugg-recur-${reference.id}`,
    type: 'historique',
    confiance: 'moyenne',
    raison: `Récurrence détectée (${similaires.length} occurences similaires)`,
    categorie: reference.categorie || '',
    compte: compteCode,
    compteLabel: compte?.label || reference.compteComptable || '',
  };
}

// ============================================
// API publique
// ============================================

export interface SuggestionCategorieResult {
  mouvement: MouvementBancaireBase;
  suggestion: SuggestionCategorie | null;
  preChecked: boolean;
}

export interface SuggestionRapprochementResult {
  mouvement: MouvementBancaireBase;
  suggestions: (SuggestionRapprochement & { preChecked: boolean })[];
}

/**
 * Génère des suggestions de catégorisation pour une liste de mouvements non catégorisés.
 * Applique les règles 2 (fournisseur) et 3 (récurrence) dans l'ordre.
 */
export function genererSuggestionsBatch(
  mouvementsNonCategorises: MouvementBancaireBase[],
  tousLesMouvements: MouvementBancaireBase[]
): SuggestionCategorieResult[] {
  return mouvementsNonCategorises.map(mouvement => {
    // Règle 2: fournisseur/heuristique
    const suggFournisseur = matchFournisseurMontant(mouvement);
    if (suggFournisseur) {
      return {
        mouvement,
        suggestion: suggFournisseur,
        preChecked: suggFournisseur.type === 'fournisseur',
      };
    }

    // Règle 3: récurrence
    const suggRecurrence = matchRecurrence(mouvement, tousLesMouvements);
    if (suggRecurrence) {
      return { mouvement, suggestion: suggRecurrence, preChecked: false };
    }

    // Pas de suggestion
    return { mouvement, suggestion: null, preChecked: false };
  });
}

/**
 * Génère des suggestions de rapprochement pour une liste de mouvements.
 * Applique la règle 1 (montant exact + date proche).
 */
export function genererRapprochementsBatch(
  mouvements: MouvementBancaireBase[],
  ecritures: EcritureComptable[]
): SuggestionRapprochementResult[] {
  return mouvements.map(mouvement => {
    const suggestions = matchMontantExactDateProche(mouvement, ecritures);
    return { mouvement, suggestions };
  });
}
