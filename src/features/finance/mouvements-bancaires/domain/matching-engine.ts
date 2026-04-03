import type {
  MouvementBancaireBase,
  SuggestionCategorie,
  SuggestionRapprochement,
  CategorieComptable,
  MatchingContext,
  RapprochementContext,
  InvoiceForMatching,
} from './types';
import {
  PLAN_COMPTABLE_ESSENTIEL,
  HEURISTIQUES_LIBELLE,
} from './constants';

// ============================================
// Helpers
// ============================================

function diffJours(dateA: string, dateB: string): number {
  return Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime()) / (1000 * 60 * 60 * 24);
}

function normaliser(texte: string): string {
  return texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ============================================
// Rule 1: Montant exact + date proche (factures Supabase)
// ============================================
function matchFactureMontantExact(
  mouvement: MouvementBancaireBase,
  pendingInvoices: InvoiceForMatching[]
): SuggestionCategorie | null {
  const montantAbs = Math.abs(mouvement.montant);

  for (const facture of pendingInvoices) {
    const ecart = Math.abs(facture.total_amount - montantAbs);
    if (ecart > 0.02) continue;

    const dateFacture = facture.due_date || facture.invoice_date;
    if (diffJours(mouvement.date, dateFacture) > 5) continue;

    // Trouver le compte comptable via le plan comptable
    const compte = facture.supplier_name
      ? PLAN_COMPTABLE_ESSENTIEL.find(c =>
          c.keywords.some(kw => normaliser(facture.supplier_name!).includes(kw))
        )
      : null;

    return {
      id: `sugg-inv-${facture.id}`,
      type: 'fournisseur',
      confiance: 'haute',
      raison: `Facture ${facture.invoice_number || facture.id} — montant exact (${ecart.toFixed(2)}€ d'écart)`,
      categorie: (compte?.categorie || 'charge') as CategorieComptable,
      compte: compte?.code || '',
      compteLabel: compte?.label || facture.label || '',
      entiteReference: {
        type: 'facture',
        id: facture.id,
        nom: facture.supplier_name || 'Fournisseur inconnu',
        montant: facture.total_amount,
      },
    };
  }

  return null;
}

// ============================================
// Rule 2: Pattern fournisseur Supabase + facture
// ============================================
function matchFournisseurSupabase(
  mouvement: MouvementBancaireBase,
  context: MatchingContext
): SuggestionCategorie | null {
  const libNorm = normaliser(mouvement.libelle);
  const montantAbs = Math.abs(mouvement.montant);

  for (const supplier of context.suppliers) {
    const supplierNorm = normaliser(supplier.name);
    // Le nom du fournisseur doit apparaitre dans le libelle
    if (!libNorm.includes(supplierNorm) && !supplierNorm.split(' ').some(w => w.length > 2 && libNorm.includes(w))) {
      continue;
    }

    // Chercher un compte comptable correspondant
    const compte = PLAN_COMPTABLE_ESSENTIEL.find(c =>
      c.keywords.some(kw => supplierNorm.includes(kw))
    );

    // Chercher une facture de ce fournisseur dans les factures en attente
    const factureMatch = context.pendingInvoices.find(
      f => f.supplier_id === supplier.id
        && Math.abs(f.total_amount - montantAbs) / montantAbs <= 0.05
    );

    if (factureMatch) {
      return {
        id: `sugg-fourn-${supplier.id}`,
        type: 'fournisseur',
        confiance: 'haute',
        raison: `Fournisseur ${supplier.name} détecté + facture ${factureMatch.invoice_number || factureMatch.id}`,
        categorie: (compte?.categorie || 'charge') as CategorieComptable,
        compte: compte?.code || '',
        compteLabel: compte?.label || '',
        entiteReference: {
          type: 'facture',
          id: factureMatch.id,
          nom: supplier.name,
          montant: factureMatch.total_amount,
        },
      };
    }

    // Fournisseur reconnu mais pas de facture associee
    return {
      id: `sugg-fourn-${supplier.id}`,
      type: 'fournisseur',
      confiance: 'moyenne',
      raison: `Fournisseur ${supplier.name} détecté dans le libellé`,
      categorie: (compte?.categorie || 'charge') as CategorieComptable,
      compte: compte?.code || '',
      compteLabel: compte?.label || '',
    };
  }

  return null;
}

// ============================================
// Rule 3: Heuristiques regex (fallback)
// ============================================
function matchHeuristiquesLibelle(
  mouvement: MouvementBancaireBase
): SuggestionCategorie | null {
  for (const heuristique of HEURISTIQUES_LIBELLE) {
    if (heuristique.pattern.test(mouvement.libelle)) {
      return {
        id: `sugg-heur-${heuristique.compte}`,
        type: 'libelle',
        confiance: 'basse',
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
// Rule 4: Récurrence (même montant + même jour ±3j)
// ============================================
function matchRecurrence(
  mouvement: MouvementBancaireBase,
  allMouvements: MouvementBancaireBase[]
): SuggestionCategorie | null {
  const montantAbs = Math.abs(mouvement.montant);
  const jourMois = new Date(mouvement.date).getDate();

  const similaires = allMouvements.filter(m => {
    if (m.id === mouvement.id) return false;
    if (!m.categorise || !m.compteComptable) return false;
    if (Math.abs(Math.abs(m.montant) - montantAbs) > 0.01) return false;
    const jourM = new Date(m.date).getDate();
    return Math.abs(jourM - jourMois) <= 3;
  });

  if (similaires.length === 0) return null;

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
// API publique — Catégorisation
// ============================================

export interface SuggestionCategorieResult {
  mouvement: MouvementBancaireBase;
  suggestion: SuggestionCategorie | null;
  preChecked: boolean;
}

/**
 * Genere des suggestions de categorisation pour une liste de mouvements non categorises.
 * Applique dans l'ordre : facture exacte (R1), fournisseur Supabase (R2), heuristiques (R3), recurrence (R4).
 */
export function genererSuggestionsBatch(
  mouvementsNonCategorises: MouvementBancaireBase[],
  context: MatchingContext
): SuggestionCategorieResult[] {
  return mouvementsNonCategorises.map(mouvement => {
    // Rule 1: Montant exact + date proche sur factures Supabase
    const suggFacture = matchFactureMontantExact(mouvement, context.pendingInvoices);
    if (suggFacture) {
      return { mouvement, suggestion: suggFacture, preChecked: true };
    }

    // Rule 2: Fournisseur Supabase + facture approchee
    const suggFournisseur = matchFournisseurSupabase(mouvement, context);
    if (suggFournisseur) {
      return {
        mouvement,
        suggestion: suggFournisseur,
        preChecked: suggFournisseur.confiance === 'haute',
      };
    }

    // Rule 3: Heuristiques regex (fallback basse confiance)
    const suggHeuristique = matchHeuristiquesLibelle(mouvement);
    if (suggHeuristique) {
      return { mouvement, suggestion: suggHeuristique, preChecked: false };
    }

    // Rule 4: Recurrence dans l'historique
    const suggRecurrence = matchRecurrence(mouvement, context.allMouvements);
    if (suggRecurrence) {
      return { mouvement, suggestion: suggRecurrence, preChecked: false };
    }

    // Pas de suggestion
    return { mouvement, suggestion: null, preChecked: false };
  });
}

// ============================================
// API publique — Rapprochement
// ============================================

export interface SuggestionRapprochementResult {
  mouvement: MouvementBancaireBase;
  suggestions: (SuggestionRapprochement & { preChecked: boolean })[];
}

/**
 * Genere des suggestions de rapprochement pour une liste de mouvements.
 * Sorties → factures en attente, Entrees → paiements non rapproches.
 */
export function genererRapprochementsBatch(
  mouvements: MouvementBancaireBase[],
  context: RapprochementContext
): SuggestionRapprochementResult[] {
  return mouvements.map(mouvement => {
    const montantAbs = Math.abs(mouvement.montant);
    const suggestions: (SuggestionRapprochement & { preChecked: boolean })[] = [];

    if (mouvement.montant < 0) {
      // Sorties → matcher avec factures en attente
      for (const facture of context.pendingInvoices) {
        const ecart = Math.abs(facture.total_amount - montantAbs);
        const ecartPct = montantAbs > 0 ? ecart / montantAbs : 0;
        if (ecartPct > 0.05) continue;

        const dateFacture = facture.due_date || facture.invoice_date;
        if (diffJours(mouvement.date, dateFacture) > 5) continue;

        const confiance = ecart < 0.02 ? 'haute' : 'moyenne';

        suggestions.push({
          targetType: 'supplier_payment',
          targetId: facture.id,
          label: `Facture ${facture.invoice_number || ''} — ${facture.supplier_name || 'Fournisseur'}`,
          montant: facture.total_amount,
          confiance,
          ecart,
          preChecked: confiance === 'haute',
        });
      }
    } else {
      // Entrees → matcher avec paiements non rapproches
      for (const payment of context.unmatchedPayments) {
        const ecart = Math.abs(payment.amount - montantAbs);
        const ecartPct = montantAbs > 0 ? ecart / montantAbs : 0;
        if (ecartPct > 0.05) continue;

        const confiance = ecart < 0.02 ? 'haute' : 'moyenne';

        suggestions.push({
          targetType: 'payment',
          targetId: payment.id,
          label: `Paiement ${payment.reference || payment.id} — ${payment.method}`,
          montant: payment.amount,
          confiance,
          ecart,
          preChecked: confiance === 'haute',
        });
      }
    }

    // Trier par confiance (haute d'abord) puis par ecart croissant
    suggestions.sort((a, b) => {
      const confOrd = { haute: 0, moyenne: 1, basse: 2 };
      const diffConf = confOrd[a.confiance] - confOrd[b.confiance];
      return diffConf !== 0 ? diffConf : a.ecart - b.ecart;
    });

    return { mouvement, suggestions };
  });
}
