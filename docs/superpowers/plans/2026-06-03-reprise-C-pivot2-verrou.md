# Plan C — Alignement 471/472 (Pivot 2) + Verrou étape 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la finalisation d'onboarding (étape 8) **fiable et non bloquante sur la reprise** : `clean` est calculé par une **liste blanche** de vraies fautes comptables, le solde d'attente 471/472 devient un **avertissement persistant** (pas un blocage), le verrou lit **l'état réel en base** (plus la mémoire React) avec une **preuve positive** (budget validé ⇒ appels émis), et l'**arrêté des comptes en AG** est bloqué tant que 471/472 ≠ 0 — **côté app, AVANT** `activate_ag_decisions`, sans jamais toucher la boucle SQL ni `close_period`.

**Architecture :** purement TS/React côté application (aucune migration DB ; le socle DB est livré par le Plan A et le moteur par le Plan B). Trois zones modifiées :
1. `src/lib/onboarding/api.ts` — `auditOnboardingBooks` réécrit (liste blanche `clean` + `waitingBalance` séparé) + nouvelle helper `assertOnboardingResolvable`/`getValidatedBudgetCallProof` (preuve positive) + nouvelle helper `checkAgWaitingBalanceGuard` (garde AG).
2. `src/components/features/onboarding/steps/Step8Finalisation.tsx` + `src/app/(gestionnaire)/onboarding/[id]/page.tsx` — le verrou lit la base, applique la preuve positive, affiche l'avertissement 471/472 non bloquant, et ne redirige vers `/portefeuille` que si `clean` ET preuve OK.
3. `src/features/ag/pv/hooks/usePVPage.ts` — pré-validation 471/472 ≠ 0 **avant** l'appel `activate_ag_decisions`.

**Tech Stack :** Next.js 16 / React 19 / TypeScript 5 strict (jamais `any` dans le nouveau code, sauf le client untyped déjà existant), CSS Modules. Backend Supabase (projet cloud `iyfesbjnkpynmwlsmxnp`). Tests SQL = blocs `DO` auto-rollback joués via le MCP Supabase `execute_sql` ; tests TS = fonctions pures testées via un petit runner Node (pas de framework installé dans le repo → assertions `node`).

**Référence :** spec `docs/superpowers/specs/2026-06-03-reprise-soldes-onboarding-design.md` (§5 Pivot 2, §6 verrou, §7 garde AG, §8 I7) ; Plan A `docs/superpowers/plans/2026-06-03-reprise-A-socle-db.md` (socle DB déjà posé, **ne pas refaire**).

---

## Conventions d'exécution (lire avant de commencer)

- **Aucune `apply_migration` dans ce plan.** Plan C est app-only. Si une migration semble nécessaire, c'est qu'on déborde sur le Plan A/B → **stop**.
- **Lancer un test SQL** = coller le bloc `DO $$ … $$;` dans le MCP `execute_sql` (projet `iyfesbjnkpynmwlsmxnp`). Un test qui passe lève `ROLLBACK_TEST_OK` ; un test qui échoue lève `ASSERT FAIL …`. Les blocs sont **non destructifs** (rollback final). On les **range** dans `supabase/tests/` pour archive mais on ne les branche **pas** à la chaîne de migration.
- **Lancer un test TS** = `npx tsx <chemin>` (tsx est exécutable via npx sans installation). Sortie attendue indiquée par step.
- **Type check après CHAQUE modif de code** : `npm run build` (Next.js fait le `tsc`). Une tâche n'est terminée que si le build passe.
- **Pré-requis Plan A** : ce plan suppose que `set_opening_balance`/`get_opening_balance` (Plan B) ne sont **pas encore** câblés dans l'UI. Tant que le Plan B n'est pas livré, l'étape 8 appelle encore `postOnboardingOpeningBalances` (existant) — on **conserve** cet appel, on ne touche **que** l'audit/verrou. Le moteur sera substitué par le Plan B.
- **Pas de `any`** dans le code ajouté. Le client Supabase reste `createUntypedClient()` (dette existante, hors scope), mais toute donnée lue est **narrowée** explicitement.
- **Liste blanche bloquante (source unique, à réutiliser partout) :**
  ```
  BLOCKING_ISSUE_TYPES = { TOTAL_MISMATCH, OVER_ALLOCATED, OVER_PAID, SOURCE_ID_MISSING, CHAPEAU_450_POSTED }
  ```
  Exclus du `clean` (avertissements) : `LOT_GL_MISMATCH`, `CALL_VS_BUDGET_MISMATCH`, net 471/472 ≠ 0.

---

## Task 1 : `auditOnboardingBooks` — `clean` par liste blanche + `waitingBalance` séparé

**Files:**
- Modify: `src/lib/onboarding/api.ts` (interface `OnboardingAuditIssue` l.642-647 ; fonction `auditOnboardingBooks` l.649-674)
- Create: `src/lib/onboarding/audit-rules.ts` (logique pure de classification — testable sans réseau, < 60 lignes)
- Create: `src/lib/onboarding/__tests__/audit-rules.test.ts` (runner tsx)

**Pourquoi :** aujourd'hui `clean = issueList.length === 0 && |waitingBalance| < 0.01` (l.671) → un grand livre **vide** passe pour propre (0 issue, 0 attente) **et** la moindre reprise (471/472 ≠ 0) bloque l'étape. Le spec §6 impose une **liste blanche** de vraies fautes pour `clean`, et de remonter `waitingBalance` comme **avertissement séparé**. On isole la règle pure dans un module testable.

- [ ] **Step 1 : Write the failing test** — créer le module de test des règles pures.

Create `src/lib/onboarding/__tests__/audit-rules.test.ts` :

```ts
import assert from 'node:assert/strict';
import {
  BLOCKING_ISSUE_TYPES,
  hasBlockingIssue,
  splitAuditIssues,
} from '@/lib/onboarding/audit-rules';
import type { OnboardingAuditIssue } from '@/lib/onboarding/api';

function issue(issue_type: string): OnboardingAuditIssue {
  return { entity_type: 'x', issue_type, description: issue_type, difference: 0 };
}

// 1) La liste blanche contient exactement les 5 fautes bloquantes du spec §6.
assert.deepEqual(
  [...BLOCKING_ISSUE_TYPES].sort(),
  ['CHAPEAU_450_POSTED', 'OVER_ALLOCATED', 'OVER_PAID', 'SOURCE_ID_MISSING', 'TOTAL_MISMATCH'],
);

// 2) Une copro vide (0 issue) n'a PAS de faute bloquante (le blocage viendra de la preuve positive, Task 2).
assert.equal(hasBlockingIssue([]), false);

// 3) LOT_GL_MISMATCH d'origine reprise = NON bloquant (avertissement).
assert.equal(hasBlockingIssue([issue('LOT_GL_MISMATCH')]), false);

// 4) CALL_VS_BUDGET_MISMATCH = NON bloquant.
assert.equal(hasBlockingIssue([issue('CALL_VS_BUDGET_MISMATCH')]), false);

// 5) TOTAL_MISMATCH = bloquant.
assert.equal(hasBlockingIssue([issue('TOTAL_MISMATCH')]), true);

// 6) Un mélange : split sépare bloquants / avertissements.
const mixed = [issue('TOTAL_MISMATCH'), issue('LOT_GL_MISMATCH'), issue('SOURCE_ID_MISSING')];
const split = splitAuditIssues(mixed);
assert.equal(split.blocking.length, 2);
assert.equal(split.warnings.length, 1);
assert.equal(split.warnings[0].issue_type, 'LOT_GL_MISMATCH');

console.log('audit-rules.test OK');
```

- [ ] **Step 2 : Run test to verify it fails** — le module n'existe pas encore.

```bash
npx tsx --tsconfig Co-Pro-Flex/tsconfig.json Co-Pro-Flex/src/lib/onboarding/__tests__/audit-rules.test.ts
```
Sortie attendue : échec de résolution du module (`Cannot find module '@/lib/onboarding/audit-rules'` ou erreur de chemin alias). Cela confirme que le test échoue avant l'implémentation.

> Note exécution : si l'alias `@/` n'est pas résolu par `tsx` seul, lancer avec `npx tsx` depuis le dossier `Co-Pro-Flex` après avoir ajouté `tsconfig-paths` : `node --import tsx --import tsconfig-paths/register src/lib/onboarding/__tests__/audit-rules.test.ts`. Si `tsconfig-paths` n'est pas dispo, remplacer temporairement l'import alias par un import relatif `../audit-rules` **uniquement dans le fichier de test** (le code de prod garde l'alias). L'objectif du step est de prouver l'échec puis le succès de la **logique**, pas la résolution d'alias.

- [ ] **Step 3 : Write minimal implementation** — créer le module de règles pures.

Create `src/lib/onboarding/audit-rules.ts` :

```ts
import type { OnboardingAuditIssue } from '@/lib/onboarding/api';

/**
 * Liste blanche des vraies fautes comptables qui CASSENT les livres (spec §6).
 * Seules ces anomalies rendent l'onboarding non finalisable. Tout le reste
 * (LOT_GL_MISMATCH, CALL_VS_BUDGET_MISMATCH, solde 471/472 ≠ 0) = avertissement.
 */
export const BLOCKING_ISSUE_TYPES: ReadonlySet<string> = new Set([
  'TOTAL_MISMATCH',
  'OVER_ALLOCATED',
  'OVER_PAID',
  'SOURCE_ID_MISSING',
  'CHAPEAU_450_POSTED',
]);

/** true si au moins une anomalie de la liste blanche est présente. */
export function hasBlockingIssue(issues: readonly OnboardingAuditIssue[]): boolean {
  return issues.some((i) => BLOCKING_ISSUE_TYPES.has(i.issue_type));
}

/** Sépare les anomalies en bloquantes (liste blanche) et avertissements (le reste). */
export function splitAuditIssues(issues: readonly OnboardingAuditIssue[]): {
  blocking: OnboardingAuditIssue[];
  warnings: OnboardingAuditIssue[];
} {
  const blocking: OnboardingAuditIssue[] = [];
  const warnings: OnboardingAuditIssue[] = [];
  for (const i of issues) {
    if (BLOCKING_ISSUE_TYPES.has(i.issue_type)) blocking.push(i);
    else warnings.push(i);
  }
  return { blocking, warnings };
}
```

- [ ] **Step 4 : Run test to verify it passes**

```bash
npx tsx Co-Pro-Flex/src/lib/onboarding/__tests__/audit-rules.test.ts
```
Sortie attendue : `audit-rules.test OK` (exit 0).

- [ ] **Step 5 : Modifier `auditOnboardingBooks`** — `clean` par liste blanche, `waitingBalance` séparé, retour enrichi.

Dans `src/lib/onboarding/api.ts`, remplacer la fin de fichier (l.640-674). D'abord l'import en tête de fichier — ajouter sous l'import existant (l.1) :

```ts
import { createClient } from '@/lib/supabase/client';
import { hasBlockingIssue, splitAuditIssues } from '@/lib/onboarding/audit-rules';
```

Puis remplacer le bloc `auditOnboardingBooks` (l.649-674) par :

```ts
export interface OnboardingAuditResult {
  /** clean = aucune faute de la liste blanche (spec §6). N'inclut PAS la preuve positive (cf. Step8). */
  clean: boolean;
  /** Anomalies bloquantes (liste blanche) — empêchent la finalisation. */
  blockingIssues: OnboardingAuditIssue[];
  /** Anomalies non bloquantes (LOT_GL_MISMATCH, CALL_VS_BUDGET_MISMATCH…) — affichées en avertissement. */
  warningIssues: OnboardingAuditIssue[];
  /** Solde net des comptes d'attente 471/472. ≠ 0 = avertissement persistant « reprise à terminer ». */
  waitingBalance: number;
}

export async function auditOnboardingBooks(
  coproId: string
): Promise<{ data: OnboardingAuditResult | null; error: Error | null }> {
  const supabase = createUntypedClient();

  // 1) Écarts d'intégrité du grand livre
  const { data: issues, error: issuesErr } = await supabase
    .rpc('audit_finance_integrity', { p_copro_id: coproId });
  if (issuesErr) return { data: null, error: new Error(issuesErr.message) };

  // 2) Solde net des comptes d'attente 471/472 (avertissement, jamais bloquant — spec §5/§6)
  const { data: waitEntries, error: waitErr } = await supabase
    .from('ledger_entries')
    .select('amount, direction, accounts!inner(code, copro_id)')
    .eq('accounts.copro_id', coproId)
    .in('accounts.code', ['471', '472']);
  if (waitErr) return { data: null, error: new Error(waitErr.message) };

  let waitingBalance = 0;
  for (const e of (waitEntries || []) as Array<{ amount: number; direction: string }>) {
    waitingBalance += e.direction === 'debit' ? Number(e.amount) : -Number(e.amount);
  }

  const issueList = (issues || []) as OnboardingAuditIssue[];
  const { blocking, warnings } = splitAuditIssues(issueList);

  // clean = AUCUNE faute de la liste blanche. Le 471/472 et les mismatches NE comptent PAS.
  const clean = !hasBlockingIssue(issueList);

  return {
    data: { clean, blockingIssues: blocking, warningIssues: warnings, waitingBalance },
    error: null,
  };
}
```

- [ ] **Step 6 : Type check**

```bash
cd Co-Pro-Flex && npm run build
```
Sortie attendue : build OK (exit 0). **Si erreur** : `Step8Finalisation.tsx` lit encore `audit.data!.issues` (champ supprimé) → c'est attendu, corrigé en Task 3. Pour isoler le type check de ce step, vérifier qu'aucune **autre** erreur que celles de `Step8Finalisation.tsx` n'apparaît. (On enchaîne Task 3 avant de revendiquer un build vert global.)

- [ ] **Step 7 : Commit**

```bash
git add Co-Pro-Flex/src/lib/onboarding/audit-rules.ts Co-Pro-Flex/src/lib/onboarding/__tests__/audit-rules.test.ts Co-Pro-Flex/src/lib/onboarding/api.ts
git commit -m "feat(onboarding): clean par liste blanche + waitingBalance separe (Pivot 2)"
```

---

## Task 2 : Preuve positive — budget validé ⇒ appels émis (lecture base réelle)

**Files:**
- Modify: `src/lib/onboarding/api.ts` (ajouter la helper en fin de section « VÉRIFICATION FINALE »)
- Create: `supabase/tests/20260603100000_positive_proof_test.sql` (archive ; joué via `execute_sql`)

**Pourquoi :** spec §6 + I7. Le verrou doit lire **l'état réel en base** (plus `callPlan` React). Règle : si un budget de la copro est **validé** (`status='validated'`) **et** que `callPlan.installments.length > 0` (un échéancier a bien été voulu) **mais** qu'**aucun** appel n'est **émis** (status ∉ `draft`/`cancelled`) pour ce budget → **bloquer**. Ne **pas** bloquer le cas « plan vide » (aucun échéancier voulu). La décision finale (plan vide ?) reste côté composant ; la helper se contente de compter en base.

- [ ] **Step 1 : Write the failing test (SQL)** — prouver qu'un budget validé sans appel émis est détectable, et qu'un budget avec appel émis ne l'est pas.

Create `supabase/tests/20260603100000_positive_proof_test.sql` :

```sql
-- Preuve positive (Plan C / Task 2) : un budget 'validated' SANS appel emis doit etre
-- detectable comme bloquant ; un budget avec un appel 'issued' ne l'est pas.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid;
  v_budget_orphelin uuid;
  v_calls_orphelin int;
  v_seeded jsonb; v_copro2 uuid;
  v_budget_ok uuid; v_calls_ok int;
BEGIN
  -- CAS A : copro propre NON seedee -> on cree un budget validated SANS appel
  v_copro := create_clean_test_copro('proof-A');
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  INSERT INTO budgets (copro_id, period_id, budget_type, name, status, version, validated_at)
  VALUES (v_copro, v_period, 'current', 'Budget validated sans appel', 'validated', 1, now())
  RETURNING id INTO v_budget_orphelin;

  SELECT count(*) INTO v_calls_orphelin
  FROM call_for_funds
  WHERE budget_id = v_budget_orphelin AND status NOT IN ('draft','cancelled');

  IF v_calls_orphelin <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : budget orphelin ne devrait avoir 0 appel emis (=%)', v_calls_orphelin;
  END IF;

  -- CAS B : copro seedee (boucle d'or) -> budget validated AVEC appels emis
  v_seeded := create_clean_test_copro_seeded('proof-B', 15000, 2);
  v_copro2 := (v_seeded->>'copro_id')::uuid;
  SELECT id INTO v_budget_ok FROM budgets WHERE copro_id = v_copro2 AND budget_type='current' ORDER BY created_at DESC LIMIT 1;
  SELECT count(*) INTO v_calls_ok
  FROM call_for_funds
  WHERE budget_id = v_budget_ok AND status NOT IN ('draft','cancelled');

  IF v_calls_ok < 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : budget seede devrait avoir >=1 appel emis (=%)', v_calls_ok;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 : Run test to verify it fails / behaves** — jouer via `execute_sql`.

Coller le bloc dans le MCP `execute_sql` (projet `iyfesbjnkpynmwlsmxnp`).
Sortie attendue : `ROLLBACK_TEST_OK`. (Ce test valide la **requête de comptage** sur laquelle s'appuie la helper TS ; il est vert dès maintenant car il ne dépend d'aucun code à écrire — c'est un test de **contrat de données**. S'il échoue avec `ASSERT FAIL`, c'est que le seed/le statut a changé → corriger la helper en conséquence avant de continuer.)

- [ ] **Step 3 : Write minimal implementation (TS helper)** — ajouter dans `src/lib/onboarding/api.ts`, juste après `auditOnboardingBooks`.

```ts
/**
 * Preuve positive (spec §6 / I7) : compte les appels RÉELLEMENT émis (status ∉ draft/cancelled)
 * pour le dernier budget 'validated' de la copro, lu EN BASE (pas la mémoire React).
 * Retour :
 *  - hasValidatedBudget : un budget 'validated' existe-t-il ?
 *  - issuedCallCount    : nombre d'appels émis rattachés à ce budget.
 * La DÉCISION de bloquer (plan vide vs plan non vide) est prise par l'appelant (Step8).
 */
export async function getValidatedBudgetCallProof(
  coproId: string
): Promise<{ data: { hasValidatedBudget: boolean; budgetId: string | null; issuedCallCount: number } | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data: budget, error: budgetErr } = await supabase
    .from('budgets')
    .select('id')
    .eq('copro_id', coproId)
    .eq('budget_type', 'current')
    .eq('status', 'validated')
    .order('validated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (budgetErr) return { data: null, error: new Error(budgetErr.message) };

  if (!budget) {
    return { data: { hasValidatedBudget: false, budgetId: null, issuedCallCount: 0 }, error: null };
  }

  const budgetId = (budget as { id: string }).id;
  const { count, error: callErr } = await supabase
    .from('call_for_funds')
    .select('id', { count: 'exact', head: true })
    .eq('budget_id', budgetId)
    .not('status', 'in', '(draft,cancelled)');
  if (callErr) return { data: null, error: new Error(callErr.message) };

  return {
    data: { hasValidatedBudget: true, budgetId, issuedCallCount: count ?? 0 },
    error: null,
  };
}
```

- [ ] **Step 4 : Run type check**

```bash
cd Co-Pro-Flex && npm run build
```
Sortie attendue : pas de **nouvelle** erreur due à cette helper (l'erreur résiduelle sur `Step8Finalisation.tsx` est levée en Task 3). La helper est pure ajout, ne casse rien.

- [ ] **Step 5 : Commit**

```bash
git add Co-Pro-Flex/src/lib/onboarding/api.ts Co-Pro-Flex/supabase/tests/20260603100000_positive_proof_test.sql
git commit -m "feat(onboarding): preuve positive budget valide => appels emis (lecture base, I7)"
```

---

## Task 3 : Verrou étape 8 — base réelle, preuve positive, 471/472 non bloquant

**Files:**
- Modify: `src/components/features/onboarding/steps/Step8Finalisation.tsx` (entièrement réécrit, < 200 lignes)
- Modify: `src/components/features/onboarding/steps/Step7RepriseSoldes.module.css` (ajouter une classe `warningMsg` pour l'avertissement jaune)
- Create: `src/components/features/onboarding/steps/__tests__/finalisation-rules.test.ts` (runner tsx — logique pure du verrou)
- Create: `src/components/features/onboarding/steps/finalisation-rules.ts` (décision de finalisation, pure & testable, < 50 lignes)

**Pourquoi :** spec §6. Aujourd'hui le composant : (a) lit `audit.data!.issues` (champ supprimé en Task 1) ; (b) bloque sur 471/472 ≠ 0 (l.80-85, à transformer en avertissement) ; (c) certifie « propre » un GL vide car aucune preuve positive. On extrait la **décision** dans une fonction pure testable, puis on la branche.

- [ ] **Step 1 : Write the failing test** — règle de finalisation pure.

Create `src/components/features/onboarding/steps/__tests__/finalisation-rules.test.ts` :

```ts
import assert from 'node:assert/strict';
import { computeFinalizationDecision } from '@/components/features/onboarding/steps/finalisation-rules';

// 1) Copro vide : pas de faute MAIS plan d'appels demandé (installments>0) et 0 appel émis -> bloque.
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: true,
    plannedInstallments: 4,
    hasValidatedBudget: true,
    issuedCallCount: 0,
  }),
  { canFinalize: false, reason: 'NO_ISSUED_CALL' },
);

// 2) Faute de la liste blanche -> bloque même si appels OK.
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: false,
    plannedInstallments: 4,
    hasValidatedBudget: true,
    issuedCallCount: 4,
  }),
  { canFinalize: false, reason: 'BLOCKING_ISSUE' },
);

// 3) Plan vide (aucun échéancier voulu) + pas de faute -> NE PAS bloquer sur les appels.
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: true,
    plannedInstallments: 0,
    hasValidatedBudget: true,
    issuedCallCount: 0,
  }),
  { canFinalize: true, reason: null },
);

// 4) Cas nominal : pas de faute + plan demandé + appels émis -> OK.
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: true,
    plannedInstallments: 2,
    hasValidatedBudget: true,
    issuedCallCount: 2,
  }),
  { canFinalize: true, reason: null },
);

// 5) Pas de budget validé du tout (ex. copro démarrée à zéro) + plan vide -> OK (rien à prouver).
assert.deepEqual(
  computeFinalizationDecision({
    cleanByWhitelist: true,
    plannedInstallments: 0,
    hasValidatedBudget: false,
    issuedCallCount: 0,
  }),
  { canFinalize: true, reason: null },
);

console.log('finalisation-rules.test OK');
```

- [ ] **Step 2 : Run test to verify it fails**

```bash
npx tsx Co-Pro-Flex/src/components/features/onboarding/steps/__tests__/finalisation-rules.test.ts
```
Sortie attendue : échec de résolution du module `finalisation-rules` (n'existe pas).

- [ ] **Step 3 : Write minimal implementation** — la règle pure.

Create `src/components/features/onboarding/steps/finalisation-rules.ts` :

```ts
export type FinalizationBlockReason = 'BLOCKING_ISSUE' | 'NO_ISSUED_CALL' | null;

export interface FinalizationInputs {
  /** Résultat de la liste blanche (Task 1) : true = aucune faute comptable. */
  cleanByWhitelist: boolean;
  /** Nombre d'échéances voulues par le syndic (callPlan.installments.length). 0 = aucun échéancier. */
  plannedInstallments: number;
  /** Un budget 'validated' existe-t-il en base ? */
  hasValidatedBudget: boolean;
  /** Nombre d'appels réellement émis pour ce budget (lecture base). */
  issuedCallCount: number;
}

/**
 * Décision de finalisation (spec §6 / I7), pure & testable.
 * - Bloque si une faute de la liste blanche est présente.
 * - Bloque si un échéancier était voulu (plannedInstallments>0) ET un budget validé existe
 *   ET aucun appel n'a été émis (faux positif évité : on ne bloque pas un plan vide).
 */
export function computeFinalizationDecision(
  i: FinalizationInputs
): { canFinalize: boolean; reason: FinalizationBlockReason } {
  if (!i.cleanByWhitelist) return { canFinalize: false, reason: 'BLOCKING_ISSUE' };

  const wantedSchedule = i.plannedInstallments > 0;
  if (wantedSchedule && i.hasValidatedBudget && i.issuedCallCount === 0) {
    return { canFinalize: false, reason: 'NO_ISSUED_CALL' };
  }
  return { canFinalize: true, reason: null };
}
```

- [ ] **Step 4 : Run test to verify it passes**

```bash
npx tsx Co-Pro-Flex/src/components/features/onboarding/steps/__tests__/finalisation-rules.test.ts
```
Sortie attendue : `finalisation-rules.test OK`.

- [ ] **Step 5 : Ajouter la classe CSS d'avertissement** — dans `src/components/features/onboarding/steps/Step7RepriseSoldes.module.css`, après le bloc `.errorMsg` (l.171-179) :

```css
.warningMsg {
  padding: 10px 16px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #fbbf24;
  font-size: 12px;
  margin-bottom: 16px;
  line-height: 1.6;
}

.warningMsg ul {
  margin: 6px 0 0;
  padding-left: 18px;
}
```

- [ ] **Step 6 : Réécrire `Step8Finalisation.tsx`** — verrou base réelle + preuve positive + 471/472 non bloquant.

Remplacer **tout** le contenu de `src/components/features/onboarding/steps/Step8Finalisation.tsx` par :

```tsx
'use client';

import { useState, useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import {
  postOnboardingCalls,
  postOnboardingOpeningBalances,
  auditOnboardingBooks,
  getValidatedBudgetCallProof,
  type OnboardingCallPlan,
  type SoldeOpeningEntry,
  type OnboardingAuditIssue,
} from '@/lib/onboarding/api';
import { computeFinalizationDecision } from './finalisation-rules';
import styles from './Step7RepriseSoldes.module.css';

interface Step8Props {
  coproId: string;
  periodId: string;
  budgetId: string | null;
  callPlan: OnboardingCallPlan | null;
  openingEntries: SoldeOpeningEntry[];
  onFinalized: () => void;
  onBack: () => void;
}

function formatEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function Step8Finalisation({
  coproId, periodId, budgetId, callPlan, openingEntries, onFinalized, onBack,
}: Step8Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockingIssues, setBlockingIssues] = useState<OnboardingAuditIssue[] | null>(null);
  const [warningIssues, setWarningIssues] = useState<OnboardingAuditIssue[]>([]);
  const [waitingBalance, setWaitingBalance] = useState<number | null>(null);
  const [callBlocked, setCallBlocked] = useState(false);

  const handleFinalize = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setBlockingIssues(null);
    setCallBlocked(false);

    // 1) Poster les appels (échéances restantes voulues)
    if (callPlan && budgetId && callPlan.installments.length > 0) {
      const r = await postOnboardingCalls(coproId, periodId, budgetId, callPlan);
      if (r.error) { setError(r.error.message); setIsRunning(false); return; }
    }

    // 2) Poster la reprise des soldes (NB: remplacé par set_opening_balance au Plan B)
    if (openingEntries.length > 0) {
      const r = await postOnboardingOpeningBalances(coproId, periodId, openingEntries);
      if (r.error) { setError(r.error.message); setIsRunning(false); return; }
    }

    // 3) Auditer EN BASE (liste blanche) + preuve positive (appels émis), en parallèle
    const [audit, proof] = await Promise.all([
      auditOnboardingBooks(coproId),
      getValidatedBudgetCallProof(coproId),
    ]);
    setIsRunning(false);

    if (audit.error) { setError(audit.error.message); return; }
    if (proof.error) { setError(proof.error.message); return; }

    setBlockingIssues(audit.data!.blockingIssues);
    setWarningIssues(audit.data!.warningIssues);
    setWaitingBalance(audit.data!.waitingBalance);

    // 4) Décision : liste blanche + preuve positive (plan vide jamais bloqué)
    const decision = computeFinalizationDecision({
      cleanByWhitelist: audit.data!.clean,
      plannedInstallments: callPlan?.installments.length ?? 0,
      hasValidatedBudget: proof.data!.hasValidatedBudget,
      issuedCallCount: proof.data!.issuedCallCount,
    });

    if (decision.reason === 'NO_ISSUED_CALL') setCallBlocked(true);

    // 471/472 ≠ 0 = avertissement, JAMAIS bloquant : on finalise quand même si la décision le permet.
    if (decision.canFinalize) onFinalized();
  }, [coproId, periodId, budgetId, callPlan, openingEntries, onFinalized]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Finalisation"
        description="On enregistre les écritures comptables, puis on vérifie que le grand livre est cohérent avant de terminer."
      />

      {error && <div className={styles.errorMsg}>{error}</div>}

      {blockingIssues && blockingIssues.length > 0 && (
        <div className={styles.errorMsg}>
          <strong>{blockingIssues.length} faute(s) comptable(s) — finalisation bloquée :</strong>
          <ul>
            {blockingIssues.map((i, idx) => (
              <li key={idx}>{i.issue_type} — {i.description}</li>
            ))}
          </ul>
        </div>
      )}

      {callBlocked && (
        <div className={styles.errorMsg}>
          Un échéancier d&apos;appels a été préparé mais aucun appel n&apos;a été émis pour le budget validé.
          Revenez à l&apos;étape « AG &amp; Appels » pour émettre les appels avant de finaliser.
        </div>
      )}

      {warningIssues.length > 0 && (
        <div className={styles.warningMsg}>
          <strong>{warningIssues.length} point(s) d&apos;attention (non bloquant) :</strong>
          <ul>
            {warningIssues.map((i, idx) => (
              <li key={idx}>{i.issue_type} — {i.description}</li>
            ))}
          </ul>
        </div>
      )}

      {waitingBalance !== null && Math.abs(waitingBalance) >= 0.01 && (
        <div className={styles.warningMsg}>
          Reprise à terminer : {formatEur(waitingBalance)} restent à imputer (compte d&apos;attente 471/472).
          Vous pouvez finaliser maintenant ; une alerte vous rappellera de compléter la reprise plus tard.
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack} disabled={isRunning}>Retour</button>
        <button className={styles.btnFinish} onClick={handleFinalize} disabled={isRunning}>
          {isRunning ? 'Vérification...' : 'Enregistrer et vérifier'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7 : Run type check (build vert global attendu maintenant)**

```bash
cd Co-Pro-Flex && npm run build
```
Sortie attendue : build OK (exit 0). Le champ `issues` n'est plus référencé ; `audit.data!.blockingIssues/warningIssues/clean` correspondent au nouveau type `OnboardingAuditResult`.

- [ ] **Step 8 : Vérifier la redirection conditionnelle dans `page.tsx`** — la redirection `/portefeuille` ne doit se produire **que** sur succès. Lire `src/app/(gestionnaire)/onboarding/[id]/page.tsx` (l.83-86) :

```tsx
const handleFinalize = useCallback(async () => {
  await finishOnboarding();
  router.push('/portefeuille');
}, [finishOnboarding, router]);
```
`handleFinalize` est passé en `onFinalized` (l.184), or `Step8` n'appelle `onFinalized()` **que** si `decision.canFinalize` (Step 6). Donc la redirection est déjà conditionnée par la décision. **Aucune modification de `page.tsx` requise** — confirmer par lecture, ne rien éditer.

- [ ] **Step 9 : Preuve E2E manuelle (copro vide non certifiée)** — via Playwright MCP, ou à défaut noter le scénario à exécuter :
  1. Lancer l'app (`npm run dev`), créer une copro vide, aller jusqu'à l'étape 8 en ayant préparé un échéancier (≥1 installment) à l'étape 6 **sans émettre** d'appel.
  2. Cliquer « Enregistrer et vérifier » → attendre le message « aucun appel n'a été émis » et **rester** sur l'étape 8 (pas de redirection).
  Sortie attendue : pas de navigation vers `/portefeuille`, message de blocage `callBlocked` affiché.

- [ ] **Step 10 : Commit**

```bash
git add Co-Pro-Flex/src/components/features/onboarding/steps/finalisation-rules.ts Co-Pro-Flex/src/components/features/onboarding/steps/__tests__/finalisation-rules.test.ts Co-Pro-Flex/src/components/features/onboarding/steps/Step8Finalisation.tsx Co-Pro-Flex/src/components/features/onboarding/steps/Step7RepriseSoldes.module.css
git commit -m "feat(onboarding): verrou etape 8 base reelle + preuve positive + 471/472 non bloquant"
```

---

## Task 4 : Pré-validation AG — bloquer l'arrêté si 471/472 ≠ 0 (côté app, avant `activate_ag_decisions`)

**Files:**
- Modify: `src/lib/onboarding/api.ts` (ajouter `checkAgWaitingBalanceGuard`)
- Modify: `src/features/ag/pv/hooks/usePVPage.ts` (dans `handleSendSignatureRequests`, AVANT l'appel `activate_ag_decisions` l.673-676)
- Create: `src/lib/onboarding/__tests__/ag-guard-rules.test.ts` (runner tsx — règle pure)
- Create: `src/lib/onboarding/ag-guard-rules.ts` (règle pure : faut-il bloquer l'arrêté ?)
- Create: `supabase/tests/20260603101000_ag_guard_waiting_balance_test.sql` (archive ; `execute_sql`)

**Pourquoi :** spec §5 Pivot 2 + §7. La garde dure « 471/472 ≠ 0 ⇒ pas d'arrêté des comptes » doit vivre **côté orchestrateur AVANT** `activate_ag_decisions` — **jamais** un `RAISE` dans la boucle SQL (qui annulerait toute l'AG) et **jamais** dans `close_period`. Le call-site exact est `handleSendSignatureRequests` dans `usePVPage.ts` (l.674 : `supabase.rpc('activate_ag_decisions', { p_ag_id: agId })`). La garde ne doit s'appliquer **que** si l'AG comporte une résolution d'arrêté/approbation des comptes (une AG qui ne fait que voter un budget ne doit pas être bloquée par une reprise inachevée).

- [ ] **Step 1 : Write the failing test (règle pure)** — la garde ne bloque que si arrêté des comptes ET 471/472 ≠ 0.

Create `src/lib/onboarding/__tests__/ag-guard-rules.test.ts` :

```ts
import assert from 'node:assert/strict';
import { shouldBlockAccountClosure } from '@/lib/onboarding/ag-guard-rules';

// 1) Arrêté des comptes demandé + 471/472 != 0 -> bloque.
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 150 }), true);
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: -0.5 }), true);

// 2) Arrêté des comptes demandé + 471/472 == 0 (tolérance) -> ne bloque pas.
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 0 }), false);
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: true, waitingBalance: 0.005 }), false);

// 3) Pas d'arrêté des comptes dans l'AG -> jamais bloqué, même si 471/472 != 0.
assert.equal(shouldBlockAccountClosure({ hasAccountClosure: false, waitingBalance: 999 }), false);

console.log('ag-guard-rules.test OK');
```

- [ ] **Step 2 : Run test to verify it fails**

```bash
npx tsx Co-Pro-Flex/src/lib/onboarding/__tests__/ag-guard-rules.test.ts
```
Sortie attendue : échec de résolution du module `ag-guard-rules`.

- [ ] **Step 3 : Write minimal implementation (règle pure + lecture base)**.

Create `src/lib/onboarding/ag-guard-rules.ts` :

```ts
/**
 * Garde « arrêté des comptes » (spec §5 Pivot 2 / §7), pure & testable.
 * On bloque l'arrêté des comptes en AG si, ET SEULEMENT SI :
 *  - l'AG comporte effectivement une résolution d'arrêté/approbation des comptes, ET
 *  - le solde net des comptes d'attente 471/472 est non nul (reprise inachevée).
 * Tolérance d'arrondi : |waitingBalance| < 0,01 = considéré soldé.
 */
export function shouldBlockAccountClosure(i: {
  hasAccountClosure: boolean;
  waitingBalance: number;
}): boolean {
  return i.hasAccountClosure && Math.abs(i.waitingBalance) >= 0.01;
}
```

Ajouter ensuite la helper de lecture base dans `src/lib/onboarding/api.ts`, après `getValidatedBudgetCallProof` :

```ts
/**
 * Garde de pré-validation AG (spec §7) : appelée AVANT activate_ag_decisions.
 * Détecte si l'AG `agId` comporte une action APPROVE_ACCOUNTS en attente (arrêté des
 * comptes) et calcule le solde net 471/472 de la copro. La décision finale de bloquer
 * est prise par shouldBlockAccountClosure (règle pure).
 */
export async function checkAgWaitingBalanceGuard(
  agId: string,
  coproId: string
): Promise<{ data: { hasAccountClosure: boolean; waitingBalance: number } | null; error: Error | null }> {
  const supabase = createUntypedClient();

  // 1) L'AG comporte-t-elle un arrêté des comptes en attente d'activation ?
  const { count: closureCount, error: actErr } = await supabase
    .from('ag_pending_actions')
    .select('id', { count: 'exact', head: true })
    .eq('ag_id', agId)
    .eq('action_type', 'APPROVE_ACCOUNTS')
    .eq('status', 'pending');
  if (actErr) return { data: null, error: new Error(actErr.message) };

  // 2) Solde net 471/472 de la copro
  const { data: waitEntries, error: waitErr } = await supabase
    .from('ledger_entries')
    .select('amount, direction, accounts!inner(code, copro_id)')
    .eq('accounts.copro_id', coproId)
    .in('accounts.code', ['471', '472']);
  if (waitErr) return { data: null, error: new Error(waitErr.message) };

  let waitingBalance = 0;
  for (const e of (waitEntries || []) as Array<{ amount: number; direction: string }>) {
    waitingBalance += e.direction === 'debit' ? Number(e.amount) : -Number(e.amount);
  }

  return {
    data: { hasAccountClosure: (closureCount ?? 0) > 0, waitingBalance },
    error: null,
  };
}
```

- [ ] **Step 4 : Run test to verify it passes**

```bash
npx tsx Co-Pro-Flex/src/lib/onboarding/__tests__/ag-guard-rules.test.ts
```
Sortie attendue : `ag-guard-rules.test OK`.

- [ ] **Step 5 : Brancher la garde dans `usePVPage.ts` AVANT `activate_ag_decisions`.**

Dans `src/features/ag/pv/hooks/usePVPage.ts`, ajouter l'import (sous la ligne 18 `import { updateAgCurrentStep } from '@/lib/ag/api';`) :

```ts
import { checkAgWaitingBalanceGuard } from '@/lib/onboarding/api';
import { shouldBlockAccountClosure } from '@/lib/onboarding/ag-guard-rules';
```

Puis, dans `handleSendSignatureRequests`, **juste avant** le bloc `// Activate AG decisions` (l.670, avant `let activationFailed = false;`), insérer :

```tsx
    // Pré-validation AG (spec §7) : si l'AG arrête les comptes et que la reprise n'est pas
    // terminée (471/472 ≠ 0), on REFUSE d'activer les décisions AVANT activate_ag_decisions
    // (jamais un RAISE dans la boucle SQL qui annulerait toute l'AG).
    if (currentCoproId) {
      const guard = await checkAgWaitingBalanceGuard(agId, currentCoproId);
      if (guard.error) {
        logger.error('PV: garde 471/472 échouée', { agId, message: guard.error.message });
        alert(`Vérification préalable impossible : ${guard.error.message}`);
        return;
      }
      if (guard.data && shouldBlockAccountClosure(guard.data)) {
        const wb = guard.data.waitingBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
        alert(
          "Impossible d'arrêter les comptes : la reprise des soldes n'est pas terminée.\n\n" +
            `Compte d'attente 471/472 non soldé : ${wb}.\n\n` +
            'Complétez la reprise (banque, réserves, report) pour ramener ce solde à 0, puis relancez la validation des signatures.'
        );
        return;
      }
    }

```

> Placement : ce bloc s'intercale entre la validation des signatures (qui précède) et `let activationFailed = false;`. Il `return` tôt → ni activation, ni passage du PV en « signé », exactement comme la branche `activationFailed`.

- [ ] **Step 6 : Write the failing/contract test (SQL)** — prouver que la donnée de garde est lisible (action APPROVE_ACCOUNTS pending + solde 471/472).

Create `supabase/tests/20260603101000_ag_guard_waiting_balance_test.sql` :

```sql
-- Garde pre-validation AG (Plan C / Task 4) : detecter APPROVE_ACCOUNTS pending + 471/472 net.
DO $$
DECLARE
  v_copro uuid; v_period uuid; v_ag uuid;
  v_acc471 uuid; v_acc472 uuid; v_acc450 uuid; v_lot uuid;
  v_tx jsonb; v_wait numeric; v_has_closure int;
BEGIN
  v_copro := create_clean_test_copro('ag-guard');
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_acc471 FROM accounts WHERE copro_id=v_copro AND code='471';
  SELECT id INTO v_acc472 FROM accounts WHERE copro_id=v_copro AND code='472';
  SELECT id INTO v_acc450 FROM accounts WHERE copro_id=v_copro AND code='450-1';
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  -- Reprise incomplete : 450/lot debite, contrepartie 472 -> 471/472 net != 0
  v_tx := create_ledger_transaction(
    v_copro, v_period, CURRENT_DATE, 'Reprise incomplete TEST', 'manual', v_period,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acc450, 'lot_id', v_lot, 'direction','debit','amount',200,'entry_label','du'),
      jsonb_build_object('account_id', v_acc472, 'direction','credit','amount',200,'entry_label','attente')
    ), true);
  IF NOT coalesce((v_tx->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : creation reprise KO : %', v_tx;
  END IF;

  -- Solde net 471/472 (debit - credit) attendu = -200 (472 credite)
  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0)
    INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait) < 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : 471/472 devrait etre != 0 (=%)', v_wait;
  END IF;

  -- Creer une AG avec une action APPROVE_ACCOUNTS pending
  INSERT INTO ag_meetings (copro_id, type, date, title, status)
  VALUES (v_copro, 'ORDINAIRE', CURRENT_DATE, 'AG arrete TEST', 'draft')
  RETURNING id INTO v_ag;
  INSERT INTO ag_pending_actions (ag_id, action_type, status, payload, created_at)
  VALUES (v_ag, 'APPROVE_ACCOUNTS', 'pending', '{}'::jsonb, now());

  SELECT count(*) INTO v_has_closure
  FROM ag_pending_actions
  WHERE ag_id=v_ag AND action_type='APPROVE_ACCOUNTS' AND status='pending';
  IF v_has_closure <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : action APPROVE_ACCOUNTS pending introuvable (=%)', v_has_closure;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

> ⚠️ Avant de jouer ce test, **vérifier les colonnes réelles** de `ag_meetings` et `ag_pending_actions` via `list_tables` (MCP Supabase) — les colonnes `type/date/title/status` (ag_meetings) et `action_type/status/payload` (ag_pending_actions) sont supposées d'après `activate_ag_decisions`. Si un INSERT échoue sur une colonne `NOT NULL` manquante (ex. `resolution_id`), ajouter la valeur minimale requise. Le test reste auto-rollback.

- [ ] **Step 7 : Run SQL test via `execute_sql`**

Coller le bloc dans le MCP `execute_sql` (projet `iyfesbjnkpynmwlsmxnp`).
Sortie attendue : `ROLLBACK_TEST_OK`. Si `ASSERT FAIL` sur un INSERT → corriger les colonnes (Step 6 note), rejouer.

- [ ] **Step 8 : Type check global**

```bash
cd Co-Pro-Flex && npm run build
```
Sortie attendue : build OK (exit 0).

- [ ] **Step 9 : Commit**

```bash
git add Co-Pro-Flex/src/lib/onboarding/ag-guard-rules.ts Co-Pro-Flex/src/lib/onboarding/__tests__/ag-guard-rules.test.ts Co-Pro-Flex/src/lib/onboarding/api.ts Co-Pro-Flex/src/features/ag/pv/hooks/usePVPage.ts Co-Pro-Flex/supabase/tests/20260603101000_ag_guard_waiting_balance_test.sql
git commit -m "feat(ag): pre-validation arrete des comptes si 471/472 != 0 (avant activate_ag_decisions)"
```

---

## Task 5 : Tests d'acceptation bout-en-bout du verrou (4 scénarios spec §10)

**Files:**
- Create: `supabase/tests/20260603102000_lock_acceptance_test.sql` (archive ; `execute_sql`)

**Pourquoi :** spec §10 « Verrou » : prouver en base les 4 scénarios — (a) copro **vide** non certifiée (clean=true par liste blanche mais bloquée par preuve positive) ; (b) `LOT_GL_MISMATCH` d'origine reprise **non bloquant** (clean=true) ; (c) 471/472 ≠ 0 → avertissement non bloquant ; (d) pré-validation AG bloque l'arrêté si 471/472 ≠ 0. Ces tests valident les **contrats de données** sur lesquels reposent les règles pures TS déjà testées.

- [ ] **Step 1 : Write the acceptance test (SQL)** — 4 assertions consolidées.

Create `supabase/tests/20260603102000_lock_acceptance_test.sql` :

```sql
-- Acceptation verrou onboarding (Plan C) : 4 scenarios spec §10.
DO $$
DECLARE
  -- (a) copro vide : budget validated sans appel emis
  vA uuid; vA_period uuid; vA_budget uuid; vA_calls int; vA_blocking int;
  -- (b) LOT_GL_MISMATCH d'origine reprise (non bloquant)
  vB jsonb; vB_copro uuid; vB_blocking int; vB_total int;
  -- (c) + (d) 471/472 != 0
  vC uuid; vC_period uuid; vC_acc450 uuid; vC_acc472 uuid; vC_lot uuid; vC_tx jsonb; vC_wait numeric;
  vC_ag uuid; vC_should_block boolean;
  v_blocking_types text[] := ARRAY['TOTAL_MISMATCH','OVER_ALLOCATED','OVER_PAID','SOURCE_ID_MISSING','CHAPEAU_450_POSTED'];
BEGIN
  -- ===== (a) Copro VIDE : aucune faute liste blanche MAIS preuve positive bloque =====
  vA := create_clean_test_copro('acc-empty');
  SELECT id INTO vA_period FROM accounting_periods WHERE copro_id=vA AND status='open' ORDER BY start_date DESC LIMIT 1;
  INSERT INTO budgets (copro_id, period_id, budget_type, name, status, version, validated_at)
  VALUES (vA, vA_period, 'current', 'Budget sans appel', 'validated', 1, now())
  RETURNING id INTO vA_budget;

  SELECT count(*) INTO vA_blocking
  FROM audit_finance_integrity(vA) WHERE issue_type = ANY(v_blocking_types);
  SELECT count(*) INTO vA_calls
  FROM call_for_funds WHERE budget_id=vA_budget AND status NOT IN ('draft','cancelled');

  -- clean liste blanche = true (0 faute) MAIS 0 appel emis sur budget validated -> non finalisable
  IF vA_blocking <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (a) : copro vide ne devrait avoir 0 faute liste blanche (=%)', vA_blocking;
  END IF;
  IF vA_calls <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (a) : budget vide devrait avoir 0 appel emis (=%)', vA_calls;
  END IF;
  -- (la decision "non finalisable" = clean ET 0 appel emis sur budget validated -> testee en TS finalisation-rules)

  -- ===== (b) LOT_GL_MISMATCH d'origine reprise = NON bloquant =====
  vB := create_clean_test_copro_seeded('acc-lotgl', 15000, 2);
  vB_copro := (vB->>'copro_id')::uuid;
  SELECT count(*) INTO vB_blocking
  FROM audit_finance_integrity(vB_copro) WHERE issue_type = ANY(v_blocking_types);
  SELECT count(*) INTO vB_total
  FROM audit_finance_integrity(vB_copro);
  -- aucune faute de la liste blanche (les eventuels mismatches sont hors liste)
  IF vB_blocking <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (b) : copro seedee ne doit avoir AUCUNE faute liste blanche (=% / total %)', vB_blocking, vB_total;
  END IF;

  -- ===== (c) 471/472 != 0 = avertissement (pas dans la liste blanche) =====
  vC := create_clean_test_copro('acc-wait');
  SELECT id INTO vC_period FROM accounting_periods WHERE copro_id=vC AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO vC_acc450 FROM accounts WHERE copro_id=vC AND code='450-1';
  SELECT id INTO vC_acc472 FROM accounts WHERE copro_id=vC AND code='472';
  SELECT id INTO vC_lot FROM lots WHERE copro_id=vC ORDER BY ref LIMIT 1;
  vC_tx := create_ledger_transaction(
    vC, vC_period, CURRENT_DATE, 'Reprise incomplete', 'manual', vC_period,
    jsonb_build_array(
      jsonb_build_object('account_id', vC_acc450, 'lot_id', vC_lot, 'direction','debit','amount',350,'entry_label','du'),
      jsonb_build_object('account_id', vC_acc472, 'direction','credit','amount',350,'entry_label','attente')
    ), true);
  IF NOT coalesce((vC_tx->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL (c) : creation reprise KO : %', vC_tx;
  END IF;

  SELECT count(*) INTO vA_blocking  -- reutilisation var int
  FROM audit_finance_integrity(vC) WHERE issue_type = ANY(v_blocking_types);
  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO vC_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id=vC AND a.code IN ('471','472');

  IF vA_blocking <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (c) : 471/472 != 0 ne doit PAS creer de faute liste blanche (=%)', vA_blocking;
  END IF;
  IF abs(vC_wait) < 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (c) : waitingBalance devrait etre != 0 (=%)', vC_wait;
  END IF;

  -- ===== (d) pre-validation AG bloque l'arrete si 471/472 != 0 =====
  INSERT INTO ag_meetings (copro_id, type, date, title, status)
  VALUES (vC, 'ORDINAIRE', CURRENT_DATE, 'AG arrete', 'draft')
  RETURNING id INTO vC_ag;
  INSERT INTO ag_pending_actions (ag_id, action_type, status, payload, created_at)
  VALUES (vC_ag, 'APPROVE_ACCOUNTS', 'pending', '{}'::jsonb, now());

  -- reproduit shouldBlockAccountClosure : APPROVE_ACCOUNTS pending ET |wait| >= 0.01
  vC_should_block := EXISTS (
    SELECT 1 FROM ag_pending_actions
    WHERE ag_id=vC_ag AND action_type='APPROVE_ACCOUNTS' AND status='pending'
  ) AND abs(vC_wait) >= 0.01;

  IF NOT vC_should_block THEN
    RAISE EXCEPTION 'ASSERT FAIL (d) : l''arrete des comptes devrait etre bloque (wait=%)', vC_wait;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 : Run SQL test via `execute_sql`**

Coller le bloc dans le MCP `execute_sql`.
Sortie attendue : `ROLLBACK_TEST_OK`. Si `ASSERT FAIL (b)` avec un compte de fautes liste blanche > 0 → c'est une vraie régression du seed (à investiguer, ne pas masquer). Si INSERT `ag_meetings`/`ag_pending_actions` échoue sur colonne manquante → ajuster d'après `list_tables` (cf. Task 4 Step 6 note).

- [ ] **Step 3 : Re-run tous les tests TS purs (non-régression)**

```bash
npx tsx Co-Pro-Flex/src/lib/onboarding/__tests__/audit-rules.test.ts
npx tsx Co-Pro-Flex/src/components/features/onboarding/steps/__tests__/finalisation-rules.test.ts
npx tsx Co-Pro-Flex/src/lib/onboarding/__tests__/ag-guard-rules.test.ts
```
Sortie attendue : les 3 lignes `… OK`.

- [ ] **Step 4 : Build final**

```bash
cd Co-Pro-Flex && npm run build
```
Sortie attendue : exit 0.

- [ ] **Step 5 : Commit**

```bash
git add Co-Pro-Flex/supabase/tests/20260603102000_lock_acceptance_test.sql
git commit -m "test(onboarding): acceptation verrou 4 scenarios (vide/lotgl/471-472/arrete AG)"
```

---

## Self-Review (rempli)

**1. Couverture du périmètre Plan C :**
- (1) `auditOnboardingBooks` liste blanche + `waitingBalance` séparé, `LOT_GL_MISMATCH`/`CALL_VS_BUDGET_MISMATCH` exclus → **Task 1** (règle pure `audit-rules.ts` + réécriture fonction). ✓
- (2) Verrou `Step8Finalisation.tsx`/`page.tsx`/`useOnboarding.ts` : lecture base réelle (audit RPC + `getValidatedBudgetCallProof`), preuve positive (installments>0 ⇒ ≥1 appel émis), 471/472 avertissement, redirection conditionnée par `onFinalized()` → **Task 2 + Task 3**. `page.tsx` confirmé sans modif (Task 3 Step 8 : `onFinalized` n'est appelé que si `canFinalize`). `useOnboarding.ts` confirmé sans modif (l'état d'avancement lit déjà `getOnboardingState` en base ; le verrou de finalisation ne dépend pas de la mémoire React mais des helpers base). ✓
- (3) Pré-validation AG côté app **avant** `activate_ag_decisions`, jamais de `RAISE` dans la boucle SQL ni `close_period` → **Task 4** (call-site exact identifié : `usePVPage.ts` `handleSendSignatureRequests`, l.673-676). Aucune migration SQL touchée. ✓
- (4) Tests : copro vide non certifiée (a), `LOT_GL_MISMATCH` non bloquant (b), 471/472 ≠ 0 avertissement (c), garde AG bloque l'arrêté (d) → **Task 5** + tests purs Tasks 1-4. ✓

**2. Placeholders :** aucun « TBD/TODO ». Tout le code TS et SQL est complet.

**3. Cohérence des types (signatures réelles vérifiées) :**
- `auditOnboardingBooks` : type de retour changé en `OnboardingAuditResult` (champs `clean`, `blockingIssues`, `warningIssues`, `waitingBalance`). Seul appelant = `Step8Finalisation.tsx`, réécrit en Task 3.
- `OnboardingAuditIssue` (l.642) conservé : `{ entity_type, issue_type, description, difference }` — `description` est bien exposé par `audit_finance_integrity` (migration `20260602185000`).
- `getValidatedBudgetCallProof` / `checkAgWaitingBalanceGuard` : nouvelles, aucun appelant cassé.
- `usePVPage.ts` : `currentCoproId` disponible via `useCopro()` (l.84) ; `logger`, `agId`, `createUntypedClient` déjà importés.
- `call_for_funds.status` ∈ {`draft,issued,partially_paid,paid,cancelled`} (enum vérifié) → un appel émis = `NOT IN ('draft','cancelled')`. `post_budget_call_for_funds` insère `status='issued'` (vérifié migration `20260531190000` l.135).
- `budgets.status` ∈ {…,`validated`,…} (enum vérifié) ; `budget_type` ∈ {`current,works,alur`}.
- Règles pures (`hasBlockingIssue`, `splitAuditIssues`, `computeFinalizationDecision`, `shouldBlockAccountClosure`) : 100 % testées par runner tsx, sans `any`.

**4. Conventions projet :** imports alias `@/` partout dans le code de prod ; pas de style inline (classe CSS `warningMsg` ajoutée au module existant) ; `Step8Finalisation.tsx` < 200 lignes ; logique extraite en modules purs < 60 lignes ; nommage FR métier ; pas de `any` ajouté (le `createUntypedClient` existant est conservé tel quel, dette hors scope, données narrowées explicitement).

**Dépendances entre tasks :** Task 1 avant Task 3 (type `OnboardingAuditResult`) ; Task 2 avant Task 3 (helper `getValidatedBudgetCallProof`) ; Task 4 indépendante (peut être faite en parallèle de 1-3) ; Task 5 après 1-4. Le build n'est globalement vert qu'à la fin de Task 3 (Task 1 Step 6 le signale explicitement).

**Hors scope (Plans A/B/D) :** socle DB (enum/vues/`source_type`) = Plan A ; moteur `set_opening_balance`/`get_opening_balance`, période `exercice_debut`, `listComptesBancaires` = Plan B ; écran `RepriseSoldes` + wizard post-as-you-go + alerte tableau de bord persistante = Plan D. Plan C **conserve** l'appel existant `postOnboardingOpeningBalances` dans Step8 (sera remplacé par le moteur du Plan B) et ne touche ni `activate_ag_decisions` ni `close_period`.