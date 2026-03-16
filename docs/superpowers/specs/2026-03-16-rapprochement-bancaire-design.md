# Rapprochement Bancaire — Design Spec

**Date:** 2026-03-16
**Cible:** Syndic professionnel (50+ copropriétés)
**Branche:** v2

---

## Résumé

Refonte du module mouvements bancaires avec workflow unifié en 4 étapes : Import → Catégorisation → Rapprochement → Clôture. Toutes les actions passent par validation explicite du gestionnaire (pas d'auto-match sans clic). Sidebar unifiée déjà implémentée.

---

## Architecture

### Structure fichiers

```
src/features/finance/mouvements-bancaires/
├── domain/
│   ├── types.ts              # Ajout: accountId, ReconciliationPeriod, CompteComptable
│   ├── constants.ts           # Plan comptable 15 comptes, heuristiques, parseur CFONB
│   ├── utils.ts               # Utilitaires existants (calcul solde, alertes, parse CSV)
│   └── matching-engine.ts     # Moteur de suggestions (3 règles)
├── components/
│   ├── AccountPills.tsx           # Existant (inchangé)
│   ├── AlertBanners.tsx           # Existant (inchangé)
│   ├── MovementFilters.tsx        # Existant (inchangé)
│   ├── UnifiedMovementsTable.tsx  # Existant (vue table)
│   ├── WorkflowModeSwitcher.tsx   # NOUVEAU — toggle Vue table / Workflow
│   ├── WorkflowSummaryBar.tsx     # NOUVEAU — stats (non-cat, non-rappr, écart, progression)
│   ├── BatchCategorisation.tsx    # NOUVEAU — onglet catégorisation batch
│   ├── SplitReconciliation.tsx    # NOUVEAU — onglet rapprochement
│   ├── ImportTab.tsx              # NOUVEAU — onglet import (CSV/OFX/CFONB)
│   ├── ClotureTab.tsx             # NOUVEAU — onglet clôture mensuelle
│   └── index.ts
├── hooks/
│   └── useMouvementsBancairesPage.ts  # Refactor: filtre par accountId, workflow state
└── index.ts
```

### Composants supprimés (mouvements-bancaires)

- `CategorisationModal` → remplacé par `BatchCategorisation`
- `RapprochementSlideOver` → remplacé par `SplitReconciliation`
- `ImportModal` → remplacé par `ImportTab`
- `NewMovementsNotification` → conservé (toast indépendant)
- `EntityDetailModal` → conservé (modal info entité liée)

### Module rapprochement-bancaire — supprimé

Le module `src/features/finance/rapprochement-bancaire/` est **entièrement remplacé** par les onglets Rapprochement et Clôture du workflow unifié. Fichiers à supprimer :

- `domain/types.ts` (SessionRapprochement, LigneRapprochement) → remplacé par ReconciliationPeriod
- `domain/constants.ts`
- `components/` (RapprochementTable, CertificationModal, SessionBanner, ImportModal)
- `hooks/useRapprochementBancairePage.ts`
- Route page associée si existante

---

## Data Model

### Modifications sur MouvementBancaireBase

```typescript
interface MouvementBancaireBase {
  // ... existant ...
  accountId: string;                                    // Rattachement au compte (CC ou FT)
  importSource?: 'csv' | 'ofx' | 'cfonb' | 'manual';  // Source d'import
  matchRule?: 'auto' | 'manual' | 'rule-based';        // Comment le match a été fait
  statutRapprochement: StatutRapprochement;             // 'rapproche' | 'non_rapproche' | 'en_attente'
  ecritureRapprocheeId?: string;                        // ID écriture comptable matchée
}
```

### Migration plan comptable

Les codes existants (605, 606, 758, 768) sont remplacés par le plan comptable essentiel.
Les mouvements déjà catégorisés avec les anciens codes sont **re-mappés** lors de la migration :

| Ancien code | Nouveau code |
|------------|-------------|
| 605 (Travaux) | 671 (Travaux votés AG) |
| 606 (Eau et électricité) | 601 (Eau) ou 602 (Électricité) selon keyword |
| 622 (Syndic) | 621 (Honoraires syndic) |
| 758 (Produits divers) | 714 (Produits divers) |
| 768 (Autres produits) | 714 (Produits divers) |

Les heuristiques dans `HEURISTIQUES_LIBELLE` sont mises à jour pour référencer les nouveaux codes.
Le type `TypeImport` est mis à jour : `'csv' | 'ofx' | 'cfonb' | 'manual'` (ajout `cfonb`, suppression `qif`).

### Nouveau — Période de rapprochement

```typescript
interface ReconciliationPeriod {
  id: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  statementBalance: number;
  computedBalance: number;
  variance: number;
  status: 'draft' | 'in_progress' | 'reconciled' | 'validated';
  validatedAt?: string;
}
```

### Nouveau — Plan comptable

```typescript
interface CompteComptable {
  code: string;
  label: string;
  categorie: 'charge' | 'produit';
  keywords: string[];
}
```

### Plan comptable essentiel — 15 comptes

| Code | Libellé | Type |
|------|---------|------|
| 601 | Eau | Charge |
| 602 | Électricité | Charge |
| 603 | Chauffage | Charge |
| 611 | Nettoyage | Charge |
| 614 | Contrats maintenance | Charge |
| 615 | Réparations | Charge |
| 616 | Assurance | Charge |
| 621 | Honoraires syndic | Charge |
| 623 | Honoraires tiers | Charge |
| 662 | Frais bancaires | Charge |
| 671 | Travaux votés AG | Charge |
| 701 | Appels de fonds courants | Produit |
| 702 | Appels de fonds travaux | Produit |
| 705 | Fonds travaux ALUR | Produit |
| 714 | Produits divers | Produit |

---

## Moteur de matching

3 règles évaluées dans l'ordre, toutes avec validation manuelle obligatoire :

### Règle 1 — Montant exact + date proche

- Montant identique ±0,01€ + date ≤ 5 jours
- Suggestion pré-cochée dans le batch
- Ex: -189,00€ le 12/03 ↔ FAC-OTIS-2025-03 de 189,00€ du 10/03

### Règle 2 — Pattern fournisseur + montant

- Keyword libellé match fournisseur connu + montant ≤ 5% écart
- Suggestion proposée avec alternatives
- Ex: "PRLV EDF" → fournisseur EDF → compte 602

### Règle 3 — Récurrence détectée

- Même montant + même contrepartie + même jour du mois (±3j)
- Suggestion basée sur catégorisation précédente
- Ex: -892,40€ le 9 de chaque mois → AXA Assurance → 616

### Principes

- Aucun mouvement catégorisé ou rapproché sans action explicite du gestionnaire
- Pas de badges de confiance dans l'UI
- Suggestions triées par pertinence (le moteur utilise les règles en interne)
- Pré-coché = le moteur est sûr (règle 1), proposé = suggestion (règles 2/3), dropdown = pas de suggestion

---

## Workflow — 4 onglets

### Mode switcher

Toggle en haut de page : **Vue table** (consultation) / **Workflow** (traitement).
La vue table reste l'existant (UnifiedMovementsTable). Le mode workflow affiche les 4 onglets.

### Barre résumé (toujours visible en mode workflow)

- Non catégorisés (nombre + montant)
- Non rapprochés (nombre)
- Suggestions prêtes (nombre)
- Écart soldes (montant)
- Progression mensuelle (barre %)

### Onglet 1 — Import

- Drop zone drag & drop (CSV, OFX, CFONB120)
- Parsing côté client avec preview avant confirmation
- Détection automatique du format par extension/contenu
- Historique des imports (fichier, date, nb mouvements, statut)
- Chaque mouvement importé reçoit le `accountId` du compte actif

### Onglet 2 — Catégorisation

- Table batch : tous les non-catégorisés du mois
- Suggestions pré-remplies (règles 1/2/3) sans badge confiance
- Pré-coché si règle 1, proposé sinon
- Dropdown manuel pour les sans-suggestion (plan comptable 15 comptes)
- Bouton "Appliquer X suggestions" — rien ne passe sans ce clic
- Filtres : tous / non-catégorisés / auto-suggérés

### Onglet 3 — Rapprochement

- Table : mouvement bancaire ↔ écriture comptable suggérée
- Chaque ligne montre montant mouvement, écriture suggérée, écart
- Dropdown pour sélection manuelle si pas de suggestion
- Écart résiduel calculé en temps réel
- Bouton "Valider X rapprochements"
- Bouton "Créer écriture" pour les mouvements sans correspondance comptable

### Onglet 4 — Clôture

- Cards par mois (3 derniers mois)
- Checklist : nb catégorisés, nb rapprochés, écart
- Clôturable si 100% catégorisé + 100% rapproché + écart 0€
- Bouton clôturer verrouille le mois
- Lien "Traiter les X restants →" redirige vers l'onglet concerné

---

## Bug fix inclus

### Mouvements non filtrés par compte

**Problème:** Les mêmes mouvements s'affichent sur CC et FT, seul le solde initial change.
**Cause:** Pas de champ `accountId` sur les mouvements, pas de filtre dans le hook.
**Fix:** Ajout `accountId` sur chaque mouvement, filtre `mouvementsBase.filter(m => m.accountId === compteActif)` avant calcul des soldes. Mock data séparées par compte.

---

## Parseur CFONB120

Nouveau parseur pour le format standard bancaire français :
- Format lignes fixes 120 caractères
- Encodage attendu : Latin-1 (ISO 8859-1), converti en UTF-8 à l'import
- Records parsés : type 04 (mouvements), type 01/07 (header/footer) pour vérification solde
- Extraction : date, montant, libellé, référence, sens (débit/crédit)
- Détection auto à l'import par analyse du contenu (lignes de 120 chars exactement)
- Lignes malformées : ignorées avec warning affiché dans la preview d'import

---

## Gestion d'état

### État partagé (tous les onglets)

Géré par `useMouvementsBancairesPage` (refactoré) :
- `mouvementsBase` — liste brute filtrée par `accountId`
- `mouvements` — avec soldes calculés
- `ecrituresComptables` — écritures du grand livre
- `compteActif` — CC ou FT
- `workflowMode` — 'table' | 'workflow'
- `activeTab` — 'import' | 'categorisation' | 'rapprochement' | 'cloture'

### État local par onglet

- **Import** : `importFile`, `importType`, `parsedPreview`, `isImporting`
- **Catégorisation** : `selectedIds` (Set), `manualOverrides` (Map)
- **Rapprochement** : `selectedMatchIds` (Set), `manualMatches` (Map)
- **Clôture** : aucun état local (lecture seule)

### Flux inter-onglets

- Import → confirmation → mouvements ajoutés à `mouvementsBase` → moteur de suggestions tourne → résultats visibles dans onglet Catégorisation
- Catégorisation → "Appliquer" → mouvements marqués `categorise: true` → deviennent éligibles au rapprochement
- Rapprochement → "Valider" → `statutRapprochement: 'rapproche'` → progression clôture se met à jour
- Le moteur de suggestions tourne à chaque changement de `mouvementsBase` (useMemo)

### Mutations Supabase

Les mutations batch utilisent les hooks existants (`useReconcileBankMovement`) appelés séquentiellement avec `Promise.all`. Pas de nouveau endpoint batch pour la v1 — acceptable car un syndic traite ~50 mouvements max par batch mensuel.

---

## Hors périmètre (v2)

- Connexion bancaire directe (API Bridge/Powens)
- Plan comptable configurable (ajout/masquage de comptes)
- Matching N:1 / 1:N (dépôts groupés, paiements partiels)
- Règles personnalisables ("mémoriser cette catégorisation")
- Audit trail des actions de rapprochement
- Export PDF pour le Conseil Syndical
- Gestion multi-copropriétés dans le workflow

---

## Dépendances

- Sidebar unifiée : **déjà implémentée** (UnifiedSidebar)
- Supabase : hooks existants (useBankMovements, useReconcileBankMovement, useImportBankMovement)
- Écritures comptables : actuellement local state, à connecter Supabase
