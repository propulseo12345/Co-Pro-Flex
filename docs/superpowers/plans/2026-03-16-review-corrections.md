# Review Corrections — CoProFlex Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger tous les problèmes identifiés lors de la première review complète du codebase (logique métier, UI/UX, architecture, nettoyage).

**Architecture:** 4 axes de correction indépendants, chacun committé séparément. Axe 1 (logique métier AG) est le plus critique car il touche à la conformité légale. Les axes 2-4 sont des améliorations de qualité.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules, Supabase

---

## Chunk 1: Logique Métier

### Task 1: Corriger les seuils de majorité Art. 26 et Art. 25-1

**Files:**
- Modify: `src/components/features/ag/Session/utils.ts:80-104`

- [ ] **Step 1: Fix Art. 25-1 tantièmes threshold (line 83)**

Replace line 83:
```typescript
// AVANT (bug: pas de floor+1)
const seuilTantiemes = (totalTantiemes * 2) / 3;

// APRÈS (correct: loi française)
const seuilTantiemes = Math.floor(totalTantiemes * 2 / 3) + 1;
```

- [ ] **Step 2: Fix Art. 26 tantièmes threshold (line 94)**

Replace line 94:
```typescript
// AVANT (bug: pas de floor+1)
const seuilTantiemesArt26 = (totalTantiemes * 2) / 3;

// APRÈS (correct: loi française)
const seuilTantiemesArt26 = Math.floor(totalTantiemes * 2 / 3) + 1;
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/features/ag/Session/utils.ts
git commit -m "fix(ag): corriger seuils majorité Art. 25-1 et Art. 26 (Math.floor + 1)"
```

---

### Task 2: Ajouter la passerelle Art. 26-1

**Files:**
- Modify: `src/components/features/ag/Session/types.ts:37-46` — ajouter les champs passerelle261
- Modify: `src/components/features/ag/Session/utils.ts:93-118` — ajouter passerelle261 au case ART_26 + case ART_26_1

- [ ] **Step 1: Étendre MajorityResult dans types.ts**

Ajouter après la ligne 45 (`}`) de `passerelle251Data`:
```typescript
export interface MajorityResult {
  adopted: boolean;
  reason: string;
  passerelle251Eligible?: boolean;
  passerelle251Data?: {
    pourTantiemes: number;
    totalTantiemes: number;
    seuilUntiers: number;
  };
  passerelle261Eligible?: boolean;
  passerelle261Data?: {
    pourTantiemes: number;
    totalTantiemes: number;
    seuilDemiTantiemes: number;
    coprosPour: number;
    totalCoproprietaires: number;
  };
}
```

- [ ] **Step 2: Ajouter la détection passerelle 26-1 dans le case ART_26**

Remplacer le case `ART_26` (lines 93-104) par:
```typescript
case 'ART_26': {
  const seuilTantiemesArt26 = Math.floor(totalTantiemes * 2 / 3) + 1;
  const coprosPourArt26 = resolutionVotes.filter(v => v.vote === 'POUR').length;
  const seuilCoprosArt26 = Math.floor(totalCoproprietaires / 2) + 1;
  const adoptedArt26 = coprosPourArt26 >= seuilCoprosArt26 && stats.pour >= seuilTantiemesArt26;

  // Passerelle 26-1: si échec mais au moins 1/2 des tantièmes
  const seuilDemiPourPasserelle261 = Math.floor(totalTantiemes / 2) + 1;
  const passerelle261Eligible = !adoptedArt26 && stats.pour >= seuilDemiPourPasserelle261;

  return {
    adopted: adoptedArt26,
    reason: adoptedArt26
      ? `Adoptée : ${coprosPourArt26} copropriétaires pour (seuil: ${seuilCoprosArt26}) ET ${stats.pour} tantièmes pour (seuil: ${seuilTantiemesArt26})`
      : `Rejetée : ${coprosPourArt26} copropriétaires pour (seuil requis: ${seuilCoprosArt26}) ET/OU ${stats.pour} tantièmes pour (seuil requis: ${seuilTantiemesArt26})`,
    passerelle261Eligible,
    passerelle261Data: passerelle261Eligible ? {
      pourTantiemes: stats.pour,
      totalTantiemes,
      seuilDemiTantiemes: seuilDemiPourPasserelle261,
      coprosPour: coprosPourArt26,
      totalCoproprietaires
    } : undefined
  };
}
```

- [ ] **Step 3: Ajouter le case ART_26_1**

Ajouter avant le case `UNANIMITE`:
```typescript
case 'ART_26_1': {
  // Second vote à la majorité de l'article 25 (majorité absolue)
  const seuilArt25 = Math.floor(totalTantiemes / 2) + 1;
  const adopted261 = stats.pour >= seuilArt25;
  return {
    adopted: adopted261,
    reason: adopted261
      ? `Adoptée (passerelle 26-1) : ${stats.pour} tantièmes pour (seuil: ${seuilArt25})`
      : `Rejetée (passerelle 26-1) : ${stats.pour} tantièmes pour (seuil requis: ${seuilArt25})`
  };
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/features/ag/Session/types.ts src/components/features/ag/Session/utils.ts
git commit -m "feat(ag): ajouter passerelle Art. 26-1 dans checkMajority"
```

---

### Task 3: Ajouter la phase relance J+90 (contentieux)

**Files:**
- Modify: `src/features/finance/appels-fonds/services/relance-templates.ts:1-104`

- [ ] **Step 1: Ajouter 'contentieux' au type RelancePhaseConfig**

Remplacer la ligne 4:
```typescript
// AVANT
type: 'amiable' | 'formelle' | 'mise_en_demeure';

// APRÈS
type: 'amiable' | 'formelle' | 'mise_en_demeure' | 'contentieux';
```

- [ ] **Step 2: Ajouter la 4ème phase dans RELANCE_PHASES**

Après la ligne 12 (mise_en_demeure), ajouter:
```typescript
{ phase: 4, label: 'Contentieux', type: 'contentieux', delayDays: 90, defaultChannel: 'courrier' },
```

- [ ] **Step 3: Ajouter le template contentieux dans generateRelanceContent**

Ajouter un nouveau case avant la fermeture du switch (après le case `mise_en_demeure`):
```typescript
case 'contentieux':
  return `${vars.copropriete}
${vars.syndic}

LETTRE RECOMMANDEE AVEC ACCUSE DE RECEPTION

${vars.coproprietaire}
Lot ${vars.lot}

Le ${vars.date}

Objet : Engagement de procedure de recouvrement — Article 19 de la loi du 10 juillet 1965

Madame, Monsieur,

Malgre notre mise en demeure du ${vars.echeance} restee sans effet, nous vous informons que le conseil syndical a autorise l'engagement d'une procedure de recouvrement judiciaire pour la somme de ${vars.montant} correspondant aux charges impayees de votre lot ${vars.lot} au titre de l'appel "${vars.appel}".

Cette somme est en retard de ${vars.joursRetard} jours.

Conformement a l'article 19 de la loi n° 65-557 du 10 juillet 1965, l'ensemble des frais de procedure, y compris les honoraires d'avocat, seront a votre charge exclusive.

Cette lettre constitue le dernier avis avant transmission du dossier a notre conseil juridique.

Cordialement,
${vars.syndic}`;
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/appels-fonds/services/relance-templates.ts
git commit -m "feat(finance): ajouter phase relance J+90 contentieux"
```

---

### Task 4: Corriger les IDs non-uniques dans echeancier.ts

**Files:**
- Modify: `src/lib/utils/echeancier.ts:18,33,49,66,94`

- [ ] **Step 1: Remplacer tous les `Date.now()` par des IDs uniques**

Remplacer chaque occurrence de `'ech-' + Date.now()` par un pattern avec `crypto.randomUUID()`:

Ligne 18:
```typescript
id: crypto.randomUUID(),
```

Ligne 33:
```typescript
id: crypto.randomUUID(),
```

Ligne 49:
```typescript
id: crypto.randomUUID(),
```

Ligne 66:
```typescript
id: crypto.randomUUID(),
```

Ligne 94:
```typescript
id: crypto.randomUUID(),
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/echeancier.ts
git commit -m "fix(finance): utiliser crypto.randomUUID() pour IDs échéancier uniques"
```

---

## Chunk 2: UI/UX

### Task 5: Fix Modal.tsx — useId() pour aria-labelledby unique

**Files:**
- Modify: `src/shared/ui/Modal/Modal.tsx:3,79,85`

- [ ] **Step 1: Ajouter useId à l'import React**

Ligne 3:
```typescript
// AVANT
import { useEffect, useCallback, useRef, ReactNode } from 'react';

// APRÈS
import { useEffect, useCallback, useRef, useId, ReactNode } from 'react';
```

- [ ] **Step 2: Utiliser useId dans le composant**

Après la ligne 35 (`const previousActiveElement = ...`), ajouter:
```typescript
const titleId = useId();
```

- [ ] **Step 3: Remplacer le hardcoded 'modal-title'**

Ligne 79:
```typescript
// AVANT
aria-labelledby={title ? 'modal-title' : undefined}

// APRÈS
aria-labelledby={title ? titleId : undefined}
```

Ligne 85:
```typescript
// AVANT
<h2 id="modal-title" className={styles.title}>

// APRÈS
<h2 id={titleId} className={styles.title}>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/Modal/Modal.tsx
git commit -m "fix(ui): useId() pour aria-labelledby unique dans Modal"
```

---

### Task 6: Validation CreateBudgetModal — empêcher soumission vide

**Files:**
- Modify: `src/components/features/finance/Budget/modals/CreateBudgetModal.tsx:608-616`

- [ ] **Step 1: Ajouter disabled sur le bouton submit travaux**

Trouver le bouton de soumission travaux (vers ligne 609-616) et ajouter `disabled`:
```typescript
<button
  type="button"
  onClick={handleSubmitTravaux}
  className={styles.submitButton}
  disabled={!typeTravaux || !budgetName || montantTotal <= 0}
>
  Créer le budget travaux
</button>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/features/finance/Budget/modals/CreateBudgetModal.tsx
git commit -m "fix(ui): désactiver bouton submit si champs requis vides (CreateBudgetModal)"
```

---

### Task 7: Dark mode TravauxDetailModal — CSS variables

**Files:**
- Modify: `src/components/features/finance/Budget/modals/TravauxDetailModal.module.css`

- [ ] **Step 1: Remplacer les hex hardcodés par des CSS variables**

Remplacements principaux dans tout le fichier:
```css
/* Backgrounds */
#161822  → var(--color-surface)
#1a1d2e  → var(--color-surface-elevated)
#1e2235  → var(--color-surface-hover)
#252a3a  → var(--color-border)

/* Text */
#e2e8f0  → var(--color-text-primary)
#94a3b8  → var(--color-text-secondary)
#64748b  → var(--color-text-tertiary)
#cbd5e1  → var(--color-text-secondary)

/* Borders */
rgba(148, 163, 184, 0.1)  → var(--color-border)
rgba(148, 163, 184, 0.15) → var(--color-border)

/* Status colors (garder les variables existantes) */
#22c55e / #16a34a → var(--color-success)
#f59e0b / #d97706 → var(--color-warning)
#3b82f6           → var(--color-primary-600)
#ef4444           → var(--color-error)
```

Note: ce fichier fait 730 lignes — faire un search-and-replace systématique.

- [ ] **Step 2: Vérification visuelle**

Ouvrir l'app, naviguer vers un budget travaux, ouvrir la modale détail.
Vérifier en light mode ET dark mode que les couleurs sont cohérentes.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/features/finance/Budget/modals/TravauxDetailModal.module.css
git commit -m "fix(ui): dark mode TravauxDetailModal — CSS variables au lieu de hex hardcodés"
```

---

## Chunk 3: Architecture (cleanup)

### Task 8: Supprimer les console.log en production

**Files:**
- Modify: ~26 fichiers (voir liste ci-dessous)

Fichiers prioritaires (hooks, services, providers):
- `src/features/ag/hooks/useAgAgendaPage.ts` (18 occurrences)
- `src/lib/ag/api/utils.ts` (7)
- `src/lib/ag/api/votes.api.ts` (2)
- `src/lib/ag/api/resolutions.api.ts` (4)
- `src/lib/services/electronic-signature.service.ts` (11)
- `src/lib/services/pv-generation.service.ts` (5)
- `src/lib/services/pv-distribution.service.ts` (6)
- `src/lib/services/ag-session-persistence.service.ts`
- `src/providers/VentesProvider.tsx` (2)
- `src/app/(dashboard)/finance/unpaid/page.tsx`

- [ ] **Step 1: Supprimer tous les console.log par batch**

Pour chaque fichier: supprimer les lignes `console.log(...)` et `console.warn(...)` de debug.
Conserver uniquement les `console.error(...)` dans les catch blocks (erreurs réelles).

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: supprimer 85+ console.log de production"
```

---

### Task 9: Remplacer `any` par les vrais types (5 fichiers budget)

**Files:**
- Modify: `src/features/finance/budgets/list/components/FonctionnementTab.tsx`
- Modify: `src/features/finance/budgets/list/components/TravauxTab.tsx`
- Modify: `src/features/finance/budgets/list/components/ALURTab.tsx`
- Modify: `src/features/finance/budgets/list/components/BudgetsModals.tsx`
- Modify: `src/app/(dashboard)/ag/[id]/minutes/page.tsx`

- [ ] **Step 1: Identifier les types existants**

Vérifier les types disponibles dans:
- `@/types/models/finance.ts` → `Budget`, `BudgetTravaux`, `PosteBudget`, `AppelFonds`
- `@/components/features/finance/Budget/types` → types locaux budget
- `@/components/features/ag/Session/types` → `Resolution`

- [ ] **Step 2: Remplacer `any` dans chaque fichier**

Pour chaque fichier, remplacer `any` par le type approprié. Exemples:
- `budgets: any[]` → `budgets: Budget[]`
- `budgetsTravaux: any[]` → `budgetsTravaux: BudgetTravaux[]`
- `postesBudget: any[]` → `postesBudget: PosteBudget[]`
- `totals: any` → `totals: BudgetTotals`
- `fondsALUR: any` → `fondsALUR: FondsALUR`
- `(budget: any)` → `(budget: Budget)`
- `useState<any[]>` → `useState<Resolution[]>`

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Possible type errors — corriger les incompatibilités révélées

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(types): remplacer any par types stricts dans composants budget/AG"
```

---

### Task 10: Supprimer code mort et routes dupliquées

**Files:**
- Delete: `src/app/(dashboard)/assemblees/` (doublon de `/ag`)
- Delete: `src/hooks/modules/useCoproprietairesPage.legacy.ts`

- [ ] **Step 1: Vérifier qu'aucun import ne référence ces fichiers**

Run:
```bash
grep -r "assemblees" src/ --include="*.ts" --include="*.tsx" -l
grep -r "useCoproprietairesPage.legacy" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: Aucun résultat (ou seulement le fichier lui-même)

- [ ] **Step 2: Supprimer les fichiers**

```bash
rm -rf src/app/\(dashboard\)/assemblees/
rm src/hooks/modules/useCoproprietairesPage.legacy.ts
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: supprimer page assemblees (doublon ag/) et hook legacy"
```

---

## Chunk 4: Vérification finale

### Task 11: Build complet et vérification

- [ ] **Step 1: Build complet**

Run: `npm run build`
Expected: Build successful, no TypeScript errors

- [ ] **Step 2: Vérification rapide des pages principales**

Run: `npm run dev`
Naviguer vers:
- `/ag` — vérifier que la page s'affiche
- `/finance/budgets` — ouvrir modale création, vérifier validation
- `/finance/budgets` — ouvrir modale détail travaux, vérifier dark/light mode

- [ ] **Step 3: Commit final si ajustements**

```bash
git add -A
git commit -m "fix: ajustements post-review"
```
