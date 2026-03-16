# Rapprochement Bancaire — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte du module mouvements bancaires avec workflow unifié (Import → Catégorisation → Rapprochement → Clôture), moteur de matching 3 règles, et correction du bug filtre par compte.

**Architecture:** Restructuration du domain layer (types, plan comptable 15 comptes, matching engine), puis création de 6 nouveaux composants UI (WorkflowModeSwitcher, WorkflowSummaryBar, ImportTab, BatchCategorisation, SplitReconciliation, ClotureTab), refactor du hook principal pour gérer workflow state + filtre par accountId, et suppression du module rapprochement-bancaire obsolète.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules, Lucide React, clsx

**Spec:** `docs/superpowers/specs/2026-03-16-rapprochement-bancaire-design.md`

**Note:** Pas de framework de tests unitaires configuré (pas de Jest/Vitest). Vérification manuelle via dev server (`npm run dev` → localhost:3000). CSS suit le dark theme Finance avec couleurs hardcodées (#1a1d2e, #e2e8f0, etc.).

---

## Chunk 1: Domain Layer

### Task 1: Mise à jour des types

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/domain/types.ts`

- [ ] **Step 1: Ajouter accountId + nouveaux champs à MouvementBancaireBase**

```typescript
// Dans l'interface MouvementBancaireBase, ajouter après entiteLiee:
  accountId: string;
  importSource?: 'csv' | 'ofx' | 'cfonb' | 'manual';
  matchRule?: 'auto' | 'manual' | 'rule-based';
  statutRapprochement: StatutRapprochement;
  ecritureRapprocheeId?: string;
```

- [ ] **Step 2: Mettre à jour TypeImport**

```typescript
// Remplacer:
export type TypeImport = 'csv' | 'ofx' | 'qif';
// Par:
export type TypeImport = 'csv' | 'ofx' | 'cfonb' | 'manual';
```

- [ ] **Step 3: Ajouter les nouveaux types**

```typescript
export interface IReconciliationPeriod {
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

export interface ICompteComptable {
  code: string;
  label: string;
  categorie: 'charge' | 'produit';
  keywords: string[];
}

export type WorkflowMode = 'table' | 'workflow';
export type WorkflowTab = 'import' | 'categorisation' | 'rapprochement' | 'cloture';
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit 2>&1 | grep mouvements-bancaires`
Expected: Erreurs dans les fichiers qui utilisent MouvementBancaireBase sans accountId (attendu, on corrigera dans les tasks suivantes)

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/mouvements-bancaires/domain/types.ts
git commit -m "feat(mouvements): update types — accountId, statutRapprochement, plan comptable types"
```

---

### Task 2: Plan comptable essentiel + migration heuristiques

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/domain/constants.ts`

- [ ] **Step 1: Remplacer COMPTES_CHARGE et COMPTES_PRODUIT par le plan comptable essentiel**

```typescript
import type { ICompteComptable } from './types';

export const PLAN_COMPTABLE_ESSENTIEL: ICompteComptable[] = [
  { code: '601', label: 'Eau', categorie: 'charge', keywords: ['eau', 'veolia', 'lyonnaise', 'suez'] },
  { code: '602', label: 'Électricité', categorie: 'charge', keywords: ['edf', 'electricite', 'électricité', 'enedis'] },
  { code: '603', label: 'Chauffage', categorie: 'charge', keywords: ['gaz', 'engie', 'chauffage', 'fuel', 'fioul'] },
  { code: '611', label: 'Nettoyage', categorie: 'charge', keywords: ['nettoyage', 'ménage', 'propreté'] },
  { code: '614', label: 'Contrats maintenance', categorie: 'charge', keywords: ['otis', 'schindler', 'kone', 'ascenseur', 'maintenance'] },
  { code: '615', label: 'Réparations', categorie: 'charge', keywords: ['réparation', 'reparation', 'plombier', 'électricien', 'serrurier'] },
  { code: '616', label: 'Assurance', categorie: 'charge', keywords: ['axa', 'allianz', 'maif', 'assurance', 'prime'] },
  { code: '621', label: 'Honoraires syndic', categorie: 'charge', keywords: ['syndic', 'honoraires', 'gestion'] },
  { code: '623', label: 'Honoraires tiers', categorie: 'charge', keywords: ['avocat', 'notaire', 'expert', 'géomètre', 'architecte'] },
  { code: '662', label: 'Frais bancaires', categorie: 'charge', keywords: ['frais bancaires', 'commission', 'agios'] },
  { code: '671', label: 'Travaux votés AG', categorie: 'charge', keywords: ['travaux', 'rénovation', 'btp', 'chantier'] },
  { code: '701', label: 'Appels de fonds courants', categorie: 'produit', keywords: ['appel', 'fonds', 'charges', 'provision', 'cotisation'] },
  { code: '702', label: 'Appels de fonds travaux', categorie: 'produit', keywords: ['appel', 'travaux', 'fonds travaux'] },
  { code: '705', label: 'Fonds travaux ALUR', categorie: 'produit', keywords: ['alur', 'fonds travaux', 'épargne'] },
  { code: '714', label: 'Produits divers', categorie: 'produit', keywords: ['remboursement', 'avoir', 'divers', 'location'] },
];
```

- [ ] **Step 2: Mettre à jour FOURNISSEURS_CONNUS avec les nouveaux codes**

```typescript
export const FOURNISSEURS_CONNUS = [
  { nom: 'EDF', compte: '602', label: 'Électricité', motsClés: ['edf', 'electricite', 'électricité'] },
  { nom: 'VEOLIA', compte: '601', label: 'Eau', motsClés: ['veolia', 'eau'] },
  { nom: 'OTIS', compte: '614', label: 'Contrats maintenance', motsClés: ['otis', 'ascenseur'] },
  { nom: 'ENGIE', compte: '603', label: 'Chauffage', motsClés: ['engie', 'gaz'] },
  { nom: 'AXA', compte: '616', label: 'Assurance', motsClés: ['axa', 'assurance'] },
];
```

- [ ] **Step 3: Mettre à jour HEURISTIQUES_LIBELLE avec les nouveaux codes**

Remplacer les codes dans le tableau existant :
- `606` → `602` (pour EDF/électricité) ou `601` (pour Veolia/eau) ou `603` (pour gaz/engie)
- `605` → `671`
- `622` → `621`
- `758` → `714`
- `615` reste `615` (inchangé)
- `616` reste `616` (inchangé)
- `701` reste `701` (inchangé)

Mettre à jour chaque entrée du tableau `HEURISTIQUES_LIBELLE` en conséquence.

- [ ] **Step 4: Mettre à jour les mock data avec accountId**

Ajouter `accountId: '1'` (courant) sur tous les mouvements existants dans `MOCK_MOUVEMENTS_BASE`.
Ajouter `statutRapprochement: 'non_rapproche'` sur tous.

Créer un nouveau tableau `MOCK_MOUVEMENTS_TRAVAUX` avec 6 mouvements pour le compte travaux (accountId: '2') : appels fonds travaux, virements ALUR, etc.

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/mouvements-bancaires/domain/constants.ts
git commit -m "feat(mouvements): plan comptable essentiel 15 comptes + migration codes + mock data par compte"
```

---

### Task 3: Moteur de matching

**Files:**
- Create: `src/features/finance/mouvements-bancaires/domain/matching-engine.ts`

- [ ] **Step 1: Créer le fichier matching-engine.ts**

```typescript
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
  MOCK_APPELS_EN_ATTENTE,
  MOCK_FACTURES_EN_ATTENTE,
} from './constants';

// ============================================
// Règle 1: Montant exact + date proche (≤5j)
// ============================================
function matchMontantExactDateProche(
  mouvement: MouvementBancaireBase,
  ecritures: EcritureComptable[]
): SuggestionRapprochement[] {
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
        preChecked: suggFournisseur.type === 'fournisseur', // pré-coché si match fournisseur exact
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
```

- [ ] **Step 2: Exporter depuis domain/index.ts**

Ajouter dans `src/features/finance/mouvements-bancaires/domain/index.ts` :
```typescript
export { genererSuggestionsBatch, genererRapprochementsBatch } from './matching-engine';
export type { SuggestionCategorieResult, SuggestionRapprochementResult } from './matching-engine';
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/domain/matching-engine.ts src/features/finance/mouvements-bancaires/domain/index.ts
git commit -m "feat(mouvements): matching engine — 3 règles (montant+date, fournisseur, récurrence)"
```

---

### Task 4: Parseur CFONB120

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/domain/utils.ts` (ajouter en fin de fichier)

- [ ] **Step 1: Ajouter le parseur CFONB120**

Ajouter en fin de `utils.ts` :

```typescript
/**
 * Parse un fichier CFONB120 (format bancaire français, lignes fixes 120 chars).
 * Encodage attendu: Latin-1, converti en UTF-8.
 * Records parsés: type 04 (mouvements). Types 01/07 ignorés (header/footer).
 * Lignes malformées ignorées avec warning.
 */
export function parseCFONB120(content: string): {
  mouvements: MouvementBancaireBase[];
  warnings: string[];
} {
  const mouvements: MouvementBancaireBase[] = [];
  const warnings: string[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 120) {
      if (line.trim().length > 0) {
        warnings.push(`Ligne ${i + 1}: ignorée (${line.length} chars au lieu de 120)`);
      }
      continue;
    }

    const recordType = line.substring(0, 2);

    // Only parse type 04 (movement records)
    if (recordType !== '04') continue;

    try {
      const sens = line.substring(32, 33); // C = crédit, D = débit
      const montantStr = line.substring(33, 46).trim();
      const montantCentimes = parseInt(montantStr, 10);
      if (isNaN(montantCentimes)) {
        warnings.push(`Ligne ${i + 1}: montant invalide "${montantStr}"`);
        continue;
      }

      const montant = montantCentimes / 100;
      const dateStr = line.substring(46, 52); // JJMMAA
      const jour = dateStr.substring(0, 2);
      const mois = dateStr.substring(2, 4);
      const annee = dateStr.substring(4, 6);
      const date = `20${annee}-${mois}-${jour}`;

      const libelle = line.substring(52, 83).trim();
      const reference = line.substring(83, 120).trim();

      mouvements.push({
        id: `cfonb-${i}`,
        date,
        libelle,
        montant: sens === 'D' ? -montant : montant,
        type: sens === 'D' ? 'SORTIE' : 'ENTREE',
        categorise: false,
        accountId: '', // sera rempli par le composant ImportTab
        statutRapprochement: 'non_rapproche',
        importSource: 'cfonb',
      });
    } catch {
      warnings.push(`Ligne ${i + 1}: erreur de parsing`);
    }
  }

  return { mouvements, warnings };
}

/**
 * Détecte le format d'un fichier bancaire par son contenu.
 */
export function detecterFormatImport(content: string, filename: string): 'csv' | 'ofx' | 'cfonb' {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'ofx' || ext === 'qfx') return 'ofx';

  // CFONB: lignes de 120 chars exactement
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length > 0 && lines.every(l => l.length === 120 || l.length === 0)) {
    return 'cfonb';
  }

  return 'csv';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/mouvements-bancaires/domain/utils.ts
git commit -m "feat(mouvements): parseur CFONB120 + détection auto format import"
```

---

## Chunk 2: Bug Fix + Hook Refactor

### Task 5: Bug fix — filtre mouvements par compte

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts`

- [ ] **Step 1: Filtrer mouvementsBase par compteActif**

Après la ligne `const compteActuel = compteActif === 'courant' ? MOCK_COMPTE_COURANT : MOCK_COMPTE_TRAVAUX;`

Ajouter :
```typescript
// Filtrer les mouvements par compte actif
const mouvementsFiltresParCompte = useMemo(() => {
  return mouvementsBase.filter(m => m.accountId === compteActuel.id);
}, [mouvementsBase, compteActuel.id]);
```

Puis remplacer `mouvementsBase` par `mouvementsFiltresParCompte` dans le useMemo de `calculerSoldesAvecValidation` :
```typescript
const { mouvements, erreurs, soldeActuel } = useMemo(() => {
  return calculerSoldesAvecValidation(mouvementsFiltresParCompte, compteActuel.soldeInitial);
}, [mouvementsFiltresParCompte, compteActuel.soldeInitial]);
```

- [ ] **Step 2: Vérifier sur localhost:3000**

Run: ouvrir http://localhost:3000/finance/mouvements-bancaires et switcher CC ↔ FT.
Expected: Les mouvements changent (CC montre les siens, FT montre les siens), pas juste le solde.

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts
git commit -m "fix(mouvements): filtrer mouvements par accountId — bug CC/FT identiques corrigé"
```

---

### Task 6: Hook refactor — ajout workflow state

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts`

- [ ] **Step 1: Ajouter les imports des nouveaux types et du matching engine**

```typescript
import type { WorkflowMode, WorkflowTab } from '../domain/types';
import { genererSuggestionsBatch, genererRapprochementsBatch } from '../domain/matching-engine';
import type { SuggestionCategorieResult, SuggestionRapprochementResult } from '../domain/matching-engine';
```

- [ ] **Step 2: Ajouter les états workflow dans le hook**

Après les states existants :
```typescript
// Workflow state
const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('table');
const [activeTab, setActiveTab] = useState<WorkflowTab>('categorisation');
```

- [ ] **Step 3: Ajouter les suggestions batch via useMemo**

```typescript
const suggestionsCategorisation = useMemo(() => {
  const nonCategorises = mouvements.filter(m => !m.categorise);
  return genererSuggestionsBatch(nonCategorises, mouvements);
}, [mouvements]);

const suggestionsRapprochementBatch = useMemo(() => {
  const aRapprocher = mouvements.filter(m => m.categorise && m.statutRapprochement !== 'rapproche');
  return genererRapprochementsBatch(aRapprocher, ecrituresComptables);
}, [mouvements, ecrituresComptables]);
```

- [ ] **Step 4: Ajouter les handlers batch**

```typescript
const handleBatchCategorise = useCallback(async (
  selections: Map<string, { compte: string; categorie: CategorieComptable }>
) => {
  setIsMutating(true);
  try {
    const promises = Array.from(selections.entries()).map(([mouvementId, { compte, categorie }]) =>
      reconcileMutation.mutateAsync({
        bank_movement_id: mouvementId,
        target_type: 'other',
        target_id: compte,
      })
    );
    await Promise.all(promises);
    // Mise à jour locale
    setMouvementsBase(prev => prev.map(m => {
      const sel = selections.get(m.id);
      if (!sel) return m;
      return { ...m, categorise: true, compteComptable: `${sel.compte} - ${sel.categorie}`, categorie: sel.categorie };
    }));
  } finally {
    setIsMutating(false);
  }
}, [reconcileMutation]);

const handleBatchRapprocher = useCallback(async (
  matches: Map<string, string> // mouvementId → ecritureId
) => {
  setIsMutating(true);
  try {
    const promises = Array.from(matches.entries()).map(([mouvementId, ecritureId]) =>
      reconcileMutation.mutateAsync({
        bank_movement_id: mouvementId,
        target_type: 'other',
        target_id: ecritureId,
      })
    );
    await Promise.all(promises);
    // Mise à jour locale
    setMouvementsBase(prev => prev.map(m => {
      const ecritureId = matches.get(m.id);
      if (!ecritureId) return m;
      return { ...m, statutRapprochement: 'rapproche' as const, ecritureRapprocheeId: ecritureId };
    }));
    setEcrituresComptables(prev => prev.map(ec => {
      const mouvementId = Array.from(matches.entries()).find(([, eId]) => eId === ec.id)?.[0];
      if (!mouvementId) return ec;
      return { ...ec, rapproche: true, mouvementRapproche: mouvementId };
    }));
  } finally {
    setIsMutating(false);
  }
}, [reconcileMutation]);
```

- [ ] **Step 5: Exporter les nouveaux states et handlers**

Ajouter dans l'objet retourné du hook :
```typescript
  // Workflow
  workflowMode,
  setWorkflowMode,
  activeTab,
  setActiveTab,
  suggestionsCategorisation,
  suggestionsRapprochementBatch,
  handleBatchCategorise,
  handleBatchRapprocher,
```

- [ ] **Step 6: Commit**

```bash
git add src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts
git commit -m "feat(mouvements): hook refactor — workflow state, batch handlers, suggestions engine"
```

---

## Chunk 3: Composants UI — Mode Switcher + Summary Bar

### Task 7: WorkflowModeSwitcher

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/WorkflowModeSwitcher.tsx`
- Create: `src/features/finance/mouvements-bancaires/components/WorkflowModeSwitcher.module.css`

- [ ] **Step 1: Créer le composant**

```typescript
'use client';

import clsx from 'clsx';
import { Table, Zap } from 'lucide-react';
import type { WorkflowMode } from '../domain/types';
import styles from './WorkflowModeSwitcher.module.css';

interface WorkflowModeSwitcherProps {
  mode: WorkflowMode;
  onModeChange: (mode: WorkflowMode) => void;
  pendingCount: number;
}

export function WorkflowModeSwitcher({ mode, onModeChange, pendingCount }: WorkflowModeSwitcherProps) {
  return (
    <div className={styles.switcher}>
      <button
        className={clsx(styles.btn, mode === 'table' && styles.active)}
        onClick={() => onModeChange('table')}
      >
        <Table size={14} />
        Vue table
      </button>
      <button
        className={clsx(styles.btn, mode === 'workflow' && styles.active)}
        onClick={() => onModeChange('workflow')}
      >
        <Zap size={14} />
        Workflow
        {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Créer le CSS module**

Créer le fichier CSS avec le design dark theme (toggle pills, fond #111827, actif #1e293b).

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/WorkflowModeSwitcher*
git commit -m "feat(mouvements): WorkflowModeSwitcher component"
```

---

### Task 8: WorkflowSummaryBar

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/WorkflowSummaryBar.tsx`
- Create: `src/features/finance/mouvements-bancaires/components/WorkflowSummaryBar.module.css`

- [ ] **Step 1: Créer le composant**

Props :
```typescript
interface WorkflowSummaryBarProps {
  nonCategorises: { total: number; montantTotal: number };
  nonRapproches: number;
  suggestionsPretes: number;
  ecartSoldes: number;
  progressionMensuelle: number; // 0-100
}
```

Affiche une barre horizontale avec 5 stats + barre de progression.
Design : fond #111827, border #1e293b, border-radius 10px, stats en flex.

- [ ] **Step 2: Créer le CSS module**

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/WorkflowSummaryBar*
git commit -m "feat(mouvements): WorkflowSummaryBar component"
```

---

### Task 9: Workflow Tabs Container

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/WorkflowTabs.tsx`
- Create: `src/features/finance/mouvements-bancaires/components/WorkflowTabs.module.css`

- [ ] **Step 1: Créer le composant**

Onglets : Import, Catégorisation, Rapprochement, Clôture.
Chaque onglet affiche un count.
Le composant rend les children (le contenu de l'onglet actif est géré par le parent/page).

```typescript
interface WorkflowTabsProps {
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
  counts: {
    import: number;
    categorisation: number;
    rapprochement: number;
    cloture: number;
  };
}
```

- [ ] **Step 2: CSS module avec design onglets**

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/WorkflowTabs*
git commit -m "feat(mouvements): WorkflowTabs component"
```

---

## Chunk 4: Composants UI — Les 4 onglets

### Task 10: ImportTab

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/ImportTab.tsx`
- Create: `src/features/finance/mouvements-bancaires/components/ImportTab.module.css`

- [ ] **Step 1: Créer le composant**

- Drop zone drag & drop avec gestion onDragOver/onDrop
- Badges formats supportés (CSV, OFX, CFONB)
- Preview table des mouvements parsés avant confirmation
- Bouton "Confirmer l'import"
- Liste historique des imports (données statiques pour v1)
- Utilise `parseCSVBancaire`, `parseCFONB120`, `detecterFormatImport` de `domain/utils.ts`

- [ ] **Step 2: CSS module**

- [ ] **Step 3: Vérifier sur localhost**

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/ImportTab*
git commit -m "feat(mouvements): ImportTab — drop zone CSV/OFX/CFONB + preview + historique"
```

---

### Task 11: BatchCategorisation

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/BatchCategorisation.tsx`
- Create: `src/features/finance/mouvements-bancaires/components/BatchCategorisation.module.css`

- [ ] **Step 1: Créer le composant**

- Table batch : checkbox, date, libellé, montant, suggestion compte, entité détectée, statut
- Suggestions pré-remplies depuis `suggestionsCategorisation`
- pré-coché si `preChecked === true`
- Dropdown `PLAN_COMPTABLE_ESSENTIEL` pour les sans-suggestion
- Barre d'action en bas : "X sélectionnés" + bouton "Appliquer X suggestions"
- Filtres : tous / non-catégorisés / auto-suggérés

Props :
```typescript
interface BatchCategorisationProps {
  suggestions: SuggestionCategorieResult[];
  onApply: (selections: Map<string, { compte: string; categorie: CategorieComptable }>) => void;
  isMutating: boolean;
}
```

- [ ] **Step 2: CSS module**

- [ ] **Step 3: Vérifier sur localhost**

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/BatchCategorisation*
git commit -m "feat(mouvements): BatchCategorisation — batch table + suggestions + apply"
```

---

### Task 12: SplitReconciliation

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/SplitReconciliation.tsx`
- Create: `src/features/finance/mouvements-bancaires/components/SplitReconciliation.module.css`

- [ ] **Step 1: Créer le composant**

- Table : mouvement ↔ écriture suggérée avec flèche ⟷
- Chaque ligne : checkbox, date, libellé mouvement, montant, ↔, écriture suggérée (compte + pièce + montant), écart
- Dropdown pour sélection manuelle si pas de suggestion (liste écritures non rapprochées)
- Écart résiduel en temps réel en bas
- Bouton "Valider X rapprochements"
- Bouton "Créer écriture" (placeholder pour v1)

Props :
```typescript
interface SplitReconciliationProps {
  suggestions: SuggestionRapprochementResult[];
  ecritures: EcritureComptable[];
  onApply: (matches: Map<string, string>) => void;
  isMutating: boolean;
  ecartSoldes: number;
}
```

- [ ] **Step 2: CSS module**

- [ ] **Step 3: Vérifier sur localhost**

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/SplitReconciliation*
git commit -m "feat(mouvements): SplitReconciliation — batch matching mouvement ↔ écriture"
```

---

### Task 13: ClotureTab

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/ClotureTab.tsx`
- Create: `src/features/finance/mouvements-bancaires/components/ClotureTab.module.css`

- [ ] **Step 1: Créer le composant**

- Grid 3 colonnes : cards des 3 derniers mois
- Chaque card : nom du mois, checklist (catégorisés X/Y, rapprochés X/Y, écart), statut (clôturé / prêt / bloqué)
- Bouton "Clôturer" actif si tout OK (100% cat + 100% rappr + écart 0)
- Lien "Traiter les X restants →" qui appelle `onTabChange('categorisation')` ou `onTabChange('rapprochement')`

Props :
```typescript
interface ClotureTabProps {
  mouvements: MouvementBancaire[];
  ecritures: EcritureComptable[];
  onTabChange: (tab: WorkflowTab) => void;
}
```

- [ ] **Step 2: CSS module**

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/ClotureTab*
git commit -m "feat(mouvements): ClotureTab — cards mensuelles + checklist clôture"
```

---

## Chunk 5: Intégration page + nettoyage

### Task 14: Mise à jour components/index.ts

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/components/index.ts`

- [ ] **Step 1: Mettre à jour le barrel export**

```typescript
// Existants conservés
export { AccountPills } from './AccountPills';
export { AlertBanners } from './AlertBanners';
export { MovementFilters } from './MovementFilters';
export { UnifiedMovementsTable } from './UnifiedMovementsTable';
export { EntityDetailModal } from './EntityDetailModal';
export { NewMovementsNotification } from './NewMovementsNotification';

// Nouveaux
export { WorkflowModeSwitcher } from './WorkflowModeSwitcher';
export { WorkflowSummaryBar } from './WorkflowSummaryBar';
export { WorkflowTabs } from './WorkflowTabs';
export { ImportTab } from './ImportTab';
export { BatchCategorisation } from './BatchCategorisation';
export { SplitReconciliation } from './SplitReconciliation';
export { ClotureTab } from './ClotureTab';
```

Supprimer les exports de `CategorisationModal`, `RapprochementSlideOver`, `ImportModal`.

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/index.ts
git commit -m "chore(mouvements): update barrel exports — nouveaux composants, suppression obsolètes"
```

---

### Task 15: Intégration dans la page

**Files:**
- Modify: `src/app/(dashboard)/finance/mouvements-bancaires/page.tsx`

- [ ] **Step 1: Ajouter le WorkflowModeSwitcher après les filtres**

- [ ] **Step 2: Conditionner l'affichage**

```
Si workflowMode === 'table':
  → Afficher UnifiedMovementsTable (existant)

Si workflowMode === 'workflow':
  → Afficher WorkflowSummaryBar
  → Afficher WorkflowTabs
  → Selon activeTab:
    → 'import': ImportTab
    → 'categorisation': BatchCategorisation
    → 'rapprochement': SplitReconciliation
    → 'cloture': ClotureTab
```

- [ ] **Step 3: Brancher les props de chaque composant sur le hook**

- [ ] **Step 4: Vérifier tout le flow sur localhost**

Run: http://localhost:3000/finance/mouvements-bancaires
- Toggle Vue table / Workflow
- Naviguer entre les 4 onglets
- Tester catégorisation batch
- Tester rapprochement
- Vérifier clôture

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/finance/mouvements-bancaires/page.tsx
git commit -m "feat(mouvements): intégration workflow unifié dans la page — 4 onglets"
```

---

### Task 16: Suppression composants obsolètes

**Files:**
- Delete: `src/features/finance/mouvements-bancaires/components/CategorisationModal.tsx`
- Delete: `src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.tsx`
- Delete: `src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.module.css`
- Delete: `src/features/finance/mouvements-bancaires/components/ImportModal.tsx`

- [ ] **Step 1: Supprimer les fichiers**

```bash
rm src/features/finance/mouvements-bancaires/components/CategorisationModal.tsx
rm src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.tsx
rm src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.module.css
rm src/features/finance/mouvements-bancaires/components/ImportModal.tsx
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit 2>&1 | grep -i "cannot find\|not found"`
Expected: Aucune erreur liée à ces fichiers (les imports ont déjà été nettoyés dans task 14)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(mouvements): suppression CategorisationModal, RapprochementSlideOver, ImportModal"
```

---

### Task 17: Suppression module rapprochement-bancaire

**Files:**
- Delete: `src/features/finance/rapprochement-bancaire/` (tout le dossier)
- Delete: `src/app/(dashboard)/finance/rapprochement-bancaire/page.tsx`

- [ ] **Step 1: Supprimer le dossier feature**

```bash
rm -rf src/features/finance/rapprochement-bancaire/
```

- [ ] **Step 2: Supprimer la route page**

```bash
rm -rf src/app/(dashboard)/finance/rapprochement-bancaire/
```

- [ ] **Step 3: Chercher et nettoyer les références**

```bash
grep -r "rapprochement-bancaire" src/ --include="*.ts" --include="*.tsx" -l
```

Pour chaque fichier trouvé, supprimer l'import/référence ou rediriger vers le module mouvements-bancaires.

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 5: Vérifier sur localhost**

Run: http://localhost:3000/finance/mouvements-bancaires — tout fonctionne sans le module rapprochement-bancaire.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: suppression module rapprochement-bancaire — remplacé par workflow unifié mouvements"
```

---

## Résumé

| Chunk | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-4 | Domain layer (types, plan comptable, matching engine, CFONB) |
| 2 | 5-6 | Bug fix filtre compte + hook refactor workflow |
| 3 | 7-9 | UI: mode switcher, summary bar, tabs container |
| 4 | 10-13 | UI: 4 onglets (Import, Catégorisation, Rapprochement, Clôture) |
| 5 | 14-17 | Intégration page + nettoyage composants/module obsolètes |

**17 tasks, ~50 steps, ~15 commits.**
