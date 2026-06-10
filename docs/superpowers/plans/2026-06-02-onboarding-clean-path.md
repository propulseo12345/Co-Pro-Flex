# Onboarding « grand livre propre » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire en sorte que le parcours d'onboarding produise une copropriété au grand livre conforme (postage canonique sur 450-x avec lot_id + source_id), et le prouver par une copro de test propre dont `audit_finance_integrity` renvoie 0 écart.

**Architecture :** On remplace les `INSERT` bruts et créations de comptes « à la volée » du parcours TS par les RPC canoniques (`provision_copro_chart`, `post_budget_call_for_funds`, `create_ledger_transaction`). Le **postage est différé en fin de wizard** : Step6/Step7 ne font que **collecter** des données ; une **étape de finalisation** poste tout puis bloque tant que `audit_finance_integrity ≠ 0` ou que le compte d'attente 471/472 ≠ 0. La preuve = une fonction SQL `create_clean_test_copro_seeded` (structure synthétique + chart canonique + `seed_golden_loop`) auditée à 0, plus un smoke Playwright sur l'UI réparée.

**Tech Stack :** Next.js 16 / React 19 / TypeScript (front), Supabase / PostgreSQL (RPC SQL), Playwright (E2E). Pas de runner unitaire TS → la vérification par tâche = `npx tsc --noEmit` + `npm run build`, et les tests d'acceptation SQL (Track B) et Playwright (Track C).

**Décisions actées (spec `docs/superpowers/specs/2026-06-02-onboarding-clean-path-design.md`) :**
- Onboarding = appel direct `post_budget_call_for_funds` (sans AG).
- Reprise = contrepartie compte d'attente **471/472** (jamais 120), ventilée par nature+lot, soldée à 0 avant gel.
- Frontière temporelle = snapshot à la date d'entrée, n'appeler que les **échéances restantes**.
- Postage **en fin de wizard, après audit = 0**.

**Signatures RPC (vérifiées) :**
- `provision_copro_chart(p_copro_id uuid) → integer`
- `post_budget_call_for_funds(p_copro_id, p_period_id, p_budget_id, p_label text, p_trimester int, p_issue_date date, p_due_date date, p_fraction numeric=1.0, p_installment_index int=NULL, p_installment_count int=NULL) → jsonb`
- `resolve_lot_tiers_account(p_copro_id uuid, p_nature text) → uuid` (natures: current/works/advance/loan/alur)
- `create_ledger_transaction(p_copro_id, p_period_id, p_tx_date date, p_label text, p_source_type text, p_source_id uuid, p_entries jsonb, p_auto_post boolean) → jsonb` ; chaque entry = `{account_id, lot_id, direction, amount, entry_label}`
- `audit_finance_integrity(p_copro_id uuid) → SETOF` (colonnes: entity_type, entity_id, copro_id, issue_type, description, expected_amount, actual_amount, difference)

---

## File Structure

**Modifiés :**
- `src/lib/onboarding/api.ts` — supprimer les créations de comptes à la volée et le postage manuel ; ajouter les fonctions canoniques (`postOnboardingCalls`, `postOnboardingOpeningBalances`, `auditOnboardingBooks`, `finalizeOnboardingBooks`) ; `createCopropriete` appelle `provision_copro_chart`.
- `src/components/features/onboarding/steps/Step6AgAppels.tsx` — capture seule du plan d'appels (plus aucun INSERT).
- `src/components/features/onboarding/steps/Step7RepriseSoldes.tsx` — capture seule des soldes par lot×nature (plus aucun INSERT).
- `src/app/(gestionnaire)/onboarding/[id]/page.tsx` — orchestrateur : stocke plan d'appels + soldes, ajoute l'étape de finalisation.

**Créés :**
- `src/components/features/onboarding/steps/Step8Finalisation.tsx` — poste via les RPC, lance l'audit, bloque si écarts.
- `supabase/migrations/20260602190000_v1_5c_create_clean_test_copro.sql` — fixture propre + variante seedée.
- `e2e/onboarding-clean-path.spec.ts` — smoke E2E sur le parcours réparé.

**Supprimés (code mort après refactor) :** `generateCallsFromBudget`, `saveRepriseSoldes`, `SoldeInitialEntry` (remplacé), `GenerateCallsPayload` dans `api.ts`.

---

## Track A — Réparer le parcours TS

### Task A0 : `createCopropriete` provisionne le plan comptable canonique

**Files:**
- Modify: `src/lib/onboarding/api.ts:18-49`

- [ ] **Step 1 : Ajouter l'appel `provision_copro_chart` après la création copro**

Dans `createCopropriete`, juste après le bloc membership admin (avant le `return`), insérer :

```typescript
  // Provisionner le plan comptable canonique (82 comptes, 450-1..5, chapeau non-postable).
  // Idempotent côté SQL (ON CONFLICT DO NOTHING).
  if (data) {
    const { error: chartErr } = await supabase.rpc('provision_copro_chart', {
      p_copro_id: (data as { id: string }).id,
    });
    if (chartErr) {
      return { data: null, error: new Error(`Plan comptable non provisionné : ${chartErr.message}`) };
    }
  }
```

- [ ] **Step 2 : Type check**

Run: `npx tsc --noEmit`
Expected: PASS (aucune erreur).

- [ ] **Step 3 : Commit**

```bash
git add src/lib/onboarding/api.ts
git commit -m "feat(onboarding): provision_copro_chart à la création de la copro (A0)"
```

---

### Task A1 : `createOnboardingBudget` résout le compte de charge depuis le plan (plus de 600 ad hoc)

**Files:**
- Modify: `src/lib/onboarding/api.ts:293-360`

- [ ] **Step 1 : Remplacer la résolution du compte de charge**

Dans `createOnboardingBudget`, remplacer tout le bloc « Ensure a default expense account exists (code 6xx) » (≈ lignes 301-326) par une résolution **par catégorie** depuis le plan déjà provisionné, avec défaut explicite `628` :

```typescript
  // Résoudre le compte de charge par catégorie depuis le plan provisionné.
  // Map catégorie (code de ligne budget) -> compte de charge canonique.
  const CHARGE_ACCOUNT_BY_CATEGORY: Record<string, string> = {
    '601': '601', '602': '602', '604': '604', '605': '605',
    '606': '606', '611': '611', '614': '614', '615': '615',
    '616': '616', '621': '621', '622': '622', '623': '623', '628': '628',
  };

  const { data: chargeAccounts } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('copro_id', coproId)
    .like('code', '6%');
  const chargeByCode = new Map<string, string>();
  for (const a of (chargeAccounts || []) as Array<{ id: string; code: string }>) {
    chargeByCode.set(a.code, a.id);
  }

  // Défaut : 628 (charges diverses). Si absent du plan -> erreur explicite (plan non provisionné).
  const defaultChargeId = chargeByCode.get('628');
  if (!defaultChargeId) {
    return { data: null, error: new Error('Plan comptable incomplet : compte 628 absent. La copro a-t-elle été provisionnée (provision_copro_chart) ?') };
  }

  function resolveChargeAccount(category: string): { id: string; mappedToDefault: boolean } {
    const targetCode = CHARGE_ACCOUNT_BY_CATEGORY[category];
    const id = targetCode ? chargeByCode.get(targetCode) : undefined;
    if (id) return { id, mappedToDefault: false };
    return { id: defaultChargeId!, mappedToDefault: true };
  }
```

- [ ] **Step 2 : Utiliser le compte résolu par ligne + remonter un warning non-silencieux**

Remplacer la création des `budgetLines` (≈ lignes 343-356) par une résolution **par ligne** (chaque ligne a sa catégorie), en collectant les catégories tombées sur le défaut :

```typescript
  // Create budget lines (compte de charge résolu par catégorie, pas un 600 unique)
  const unmappedCategories: string[] = [];
  if (lines.length > 0) {
    const budgetLines = lines.map(l => {
      const { id: accountId, mappedToDefault } = resolveChargeAccount(l.category);
      if (mappedToDefault) unmappedCategories.push(l.category);
      return {
        copro_id: coproId,
        budget_id: budget.id,
        account_id: accountId,
        repartition_key_id: l.repartition_key_id,
        label: l.label.trim(),
        code: l.category,
        amount: l.amount,
        sort_order: l.sort_order,
      };
    });
    const { error: linesErr } = await supabase.from('budget_lines').insert(budgetLines);
    if (linesErr) return { data: null, error: new Error(linesErr.message) };
  }

  return {
    data: {
      budgetId: budget.id as string,
      unmappedCategories: [...new Set(unmappedCategories)],
    },
    error: null,
  };
```

- [ ] **Step 3 : Type check**

Run: `npx tsc --noEmit`
Expected: PASS. (Si un appelant lit `data.budgetId`, il continue de fonctionner ; `unmappedCategories` est additif.)

- [ ] **Step 4 : Commit**

```bash
git add src/lib/onboarding/api.ts
git commit -m "feat(onboarding): budget résout les comptes de charge depuis le plan, 628 non-silencieux (A1)"
```

---

### Task A2 : Nouvelle fonction `postOnboardingCalls` (appels via RPC canonique, échéances restantes)

**Files:**
- Modify: `src/lib/onboarding/api.ts` (ajouter la fonction ; supprimer `generateCallsFromBudget` et `GenerateCallsPayload`)

- [ ] **Step 1 : Ajouter le type du plan d'appels + la fonction de postage**

Ajouter (remplace l'ancien bloc CALLS FOR FUNDS) :

```typescript
// ═══ CALLS FOR FUNDS (postage canonique, fin de wizard) ═══

export interface OnboardingCallPlan {
  schedule: 'annuel' | 'semestriel' | 'trimestriel';
  alreadyDone: number;        // échéances déjà émises avant l'entrée dans l'outil
  installments: Array<{       // uniquement les échéances RESTANTES
    index: number;            // 1-based, position dans l'exercice
    label: string;
    issueDate: string;        // YYYY-MM-DD
    dueDate: string;          // YYYY-MM-DD
  }>;
}

export async function postOnboardingCalls(
  coproId: string,
  periodId: string,
  budgetId: string,
  plan: OnboardingCallPlan
) {
  const supabase = createUntypedClient();
  const count = plan.schedule === 'annuel' ? 1 : plan.schedule === 'semestriel' ? 2 : 4;

  // Idempotence : si des appels non annulés existent déjà pour ce budget, ne pas reposter
  // (re-clic de finalisation après échec partiel).
  const { data: existing } = await supabase
    .from('call_for_funds')
    .select('id')
    .eq('budget_id', budgetId)
    .neq('status', 'cancelled')
    .limit(1);
  if (existing && existing.length > 0) {
    return { data: { posted: 0, skipped: true }, error: null };
  }

  for (const inst of plan.installments) {
    const { data, error } = await supabase.rpc('post_budget_call_for_funds', {
      p_copro_id: coproId,
      p_period_id: periodId,
      p_budget_id: budgetId,
      p_label: inst.label,
      p_trimester: inst.index,
      p_issue_date: inst.issueDate,
      p_due_date: inst.dueDate,
      p_fraction: 1.0,
      p_installment_index: inst.index,
      p_installment_count: count,
    });
    if (error) {
      return { data: null, error: new Error(`Appel ${inst.label} : ${error.message}`) };
    }
    if (data && (data as { success?: boolean }).success === false) {
      return { data: null, error: new Error(`Appel ${inst.label} : ${(data as { error?: string }).error || 'échec RPC'}`) };
    }
  }

  // Marquer le budget validé
  const { error: budErr } = await supabase
    .from('budgets')
    .update({ status: 'validated', validated_at: new Date().toISOString() })
    .eq('id', budgetId);
  if (budErr) return { data: null, error: new Error(budErr.message) };

  return { data: { posted: plan.installments.length }, error: null };
}
```

- [ ] **Step 2 : Supprimer l'ancien `generateCallsFromBudget` et `GenerateCallsPayload`**

Supprimer intégralement la fonction `generateCallsFromBudget` (ancien bloc ≈ lignes 362-547) et l'interface `GenerateCallsPayload`.

- [ ] **Step 3 : Type check**

Run: `npx tsc --noEmit`
Expected: échoue tant que `Step6AgAppels.tsx` référence l'ancienne logique → corrigé en Task A5. Si tu exécutes A2→A5 d'affilée, valide le type check après A5.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/onboarding/api.ts
git commit -m "feat(onboarding): postOnboardingCalls via post_budget_call_for_funds (A2)"
```

---

### Task A3 : Nouvelle fonction `postOnboardingOpeningBalances` (reprise canonique, 471/472)

**Files:**
- Modify: `src/lib/onboarding/api.ts` (ajouter ; supprimer `saveRepriseSoldes` et `SoldeInitialEntry`)

- [ ] **Step 1 : Ajouter le type d'entrée par lot×nature + la fonction**

```typescript
// ═══ REPRISE SOLDES (postage canonique, fin de wizard) ═══

export type SoldeNature = 'current' | 'works' | 'alur';

export interface SoldeOpeningEntry {
  lotId: string;
  nature: SoldeNature;   // 450-1 (current), 450-2 (works), 450-5 (alur)
  amount: number;        // > 0 = le lot doit ; < 0 = avoir
}

export async function postOnboardingOpeningBalances(
  coproId: string,
  periodId: string,
  entries: SoldeOpeningEntry[]
) {
  const supabase = createUntypedClient();
  const nonZero = entries.filter(e => e.amount !== 0);
  if (nonZero.length === 0) return { data: { count: 0 }, error: null };

  // Idempotence : si une reprise d'ouverture existe déjà pour cette période, ne pas reposter.
  const { data: existingTx } = await supabase
    .from('ledger_transactions')
    .select('id')
    .eq('copro_id', coproId)
    .eq('period_id', periodId)
    .eq('source_type', 'opening_balance')
    .limit(1);
  if (existingTx && existingTx.length > 0) {
    return { data: { count: 0, skipped: true }, error: null };
  }

  // Résoudre les sous-comptes 450-x par nature présente
  const naturesUsed = [...new Set(nonZero.map(e => e.nature))];
  const tiersAccount: Record<string, string> = {};
  for (const nature of naturesUsed) {
    const { data, error } = await supabase.rpc('resolve_lot_tiers_account', {
      p_copro_id: coproId,
      p_nature: nature,
    });
    if (error || !data) {
      return { data: null, error: new Error(`Compte 450 nature '${nature}' introuvable : ${error?.message || 'plan non provisionné'}`) };
    }
    tiersAccount[nature] = data as string;
  }

  // Comptes d'attente 471 (débiteur) / 472 (créditeur)
  const { data: waitAcc } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('copro_id', coproId)
    .in('code', ['471', '472']);
  const waitById = new Map<string, string>();
  for (const a of (waitAcc || []) as Array<{ id: string; code: string }>) waitById.set(a.code, a.id);
  const acc471 = waitById.get('471');
  const acc472 = waitById.get('472');
  if (!acc471 || !acc472) {
    return { data: null, error: new Error('Comptes d\'attente 471/472 absents (plan non provisionné ?)') };
  }

  // Construire les écritures : D/C 450-x/lot, contrepartie en compte d'attente
  type Entry = { account_id: string; lot_id?: string; direction: 'debit' | 'credit'; amount: number; entry_label: string };
  const ledgerEntries: Entry[] = [];
  let totalDebit = 0;  // somme des soldes dus (450 débité)
  let totalCredit = 0; // somme des avoirs (450 crédité)

  for (const e of nonZero) {
    const acc = tiersAccount[e.nature];
    if (e.amount > 0) {
      ledgerEntries.push({ account_id: acc, lot_id: e.lotId, direction: 'debit', amount: e.amount, entry_label: 'Solde d\'ouverture — dû' });
      totalDebit += e.amount;
    } else {
      ledgerEntries.push({ account_id: acc, lot_id: e.lotId, direction: 'credit', amount: Math.abs(e.amount), entry_label: 'Solde d\'ouverture — avoir' });
      totalCredit += Math.abs(e.amount);
    }
  }

  // Contrepartie en compte d'attente (à solder avant gel)
  if (totalDebit > 0) {
    ledgerEntries.push({ account_id: acc472, direction: 'credit', amount: totalDebit, entry_label: 'Attente reprise — contrepartie débits' });
  }
  if (totalCredit > 0) {
    ledgerEntries.push({ account_id: acc471, direction: 'debit', amount: totalCredit, entry_label: 'Attente reprise — contrepartie crédits' });
  }

  // Une SEULE transaction atomique, auto-postée (équilibre garanti par construction)
  const { data, error } = await supabase.rpc('create_ledger_transaction', {
    p_copro_id: coproId,
    p_period_id: periodId,
    p_tx_date: new Date().toISOString().split('T')[0],
    p_label: 'Reprise des soldes d\'ouverture',
    p_source_type: 'opening_balance',
    p_source_id: periodId,
    p_entries: ledgerEntries,
    p_auto_post: true,
  });
  if (error) return { data: null, error: new Error(error.message) };
  if (data && (data as { success?: boolean }).success === false) {
    return { data: null, error: new Error((data as { error?: string }).error || 'échec reprise') };
  }

  return { data: { count: nonZero.length }, error: null };
}
```

- [ ] **Step 2 : Supprimer `saveRepriseSoldes` et `SoldeInitialEntry`**

Supprimer intégralement l'ancienne fonction `saveRepriseSoldes` (≈ lignes 577-709), son interface `SoldeInitialEntry`, et le bloc `ensureAccountingPeriod`-adjacent inutilisé s'il n'est référencé que par elle (vérifier : `ensureAccountingPeriod` reste utilisé par l'orchestrateur → **ne pas** le supprimer).

- [ ] **Step 3 : Type check**

Run: `npx tsc --noEmit`
Expected: échoue tant que `Step7RepriseSoldes.tsx` référence `saveRepriseSoldes`/`SoldeInitialEntry` → corrigé en Task A6.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/onboarding/api.ts
git commit -m "feat(onboarding): postOnboardingOpeningBalances via create_ledger_transaction + 471/472 (A3)"
```

---

### Task A4 : Fonction d'audit d'onboarding (audit=0 + compte d'attente=0)

**Files:**
- Modify: `src/lib/onboarding/api.ts` (ajouter)

- [ ] **Step 1 : Ajouter `auditOnboardingBooks`**

```typescript
// ═══ VÉRIFICATION FINALE ═══

export interface OnboardingAuditIssue {
  entity_type: string;
  issue_type: string;
  description: string;
  difference: number | null;
}

export async function auditOnboardingBooks(coproId: string) {
  const supabase = createUntypedClient();

  // 1) Écarts d'intégrité du grand livre
  const { data: issues, error: issuesErr } = await supabase
    .rpc('audit_finance_integrity', { p_copro_id: coproId });
  if (issuesErr) return { data: null, error: new Error(issuesErr.message) };

  // 2) Solde net des comptes d'attente 471/472 (doit être 0 avant gel)
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
  const clean = issueList.length === 0 && Math.abs(waitingBalance) < 0.01;

  return { data: { clean, issues: issueList, waitingBalance }, error: null };
}
```

- [ ] **Step 2 : Type check + commit**

Run: `npx tsc --noEmit` (Expected: PASS)

```bash
git add src/lib/onboarding/api.ts
git commit -m "feat(onboarding): auditOnboardingBooks (audit=0 + 471/472=0) (A4)"
```

---

### Task A5 : Step6 — capture seule du plan d'appels (plus aucun INSERT)

**Files:**
- Modify: `src/components/features/onboarding/steps/Step6AgAppels.tsx`

- [ ] **Step 1 : Remplacer la signature `onComplete` pour remonter le plan**

Modifier l'interface :

```typescript
import type { OnboardingCallPlan } from '@/lib/onboarding/api';

interface Step6Props {
  coproId: string;
  budgetId: string | null;
  periodId: string;
  onComplete: (plan: OnboardingCallPlan | null) => void;
  onBack: () => void;
}
```

- [ ] **Step 2 : Remplacer `handleCreate` par une capture (aucune écriture DB)**

Remplacer toute la fonction `handleCreate` (lignes 122-268) par :

```typescript
  // Capture seule : on remonte le plan, le postage se fait à la finalisation.
  const handleConfirm = useCallback(() => {
    if (!budgetId) { onComplete(null); return; }
    const plan: OnboardingCallPlan = {
      schedule,
      alreadyDone,
      installments: callPreviews.map(p => ({
        index: p.trimester,
        label: p.label,
        issueDate: p.issueDate,
        dueDate: p.dueDate,
      })),
    };
    onComplete(plan);
  }, [budgetId, schedule, alreadyDone, callPreviews, onComplete]);
```

- [ ] **Step 3 : Adapter la phase « done » et le footer**

Supprimer la phase `'done'` (lignes 399-444) et l'état `createdCalls`. Dans le footer, remplacer le bouton « Créer N appels » (phase preview) par un bouton qui appelle `handleConfirm` :

```tsx
        {budgetId && phase === 'preview' && (
          <button className={styles.btnNext} onClick={handleConfirm}>
            Valider ces {callPreviews.length} appel{callPreviews.length > 1 ? 's' : ''}
          </button>
        )}
```

Et le cas `remaining === 0` (config) : `onClick={() => onComplete(null)}`. Le cas `!budgetId` : `onClick={() => onComplete(null)}`. Retirer `isSaving`, `setCreatedCalls`, `createClient` et les imports devenus inutiles.

- [ ] **Step 4 : Type check + commit**

Run: `npx tsc --noEmit` (Expected: PASS si A2 fait ; sinon corriger l'orchestrateur en A7)

```bash
git add src/components/features/onboarding/steps/Step6AgAppels.tsx
git commit -m "refactor(onboarding): Step6 capture le plan d'appels sans poster (A5)"
```

---

### Task A6 : Step7 — capture des soldes par lot×nature (plus aucun INSERT)

**Files:**
- Modify: `src/components/features/onboarding/steps/Step7RepriseSoldes.tsx`

- [ ] **Step 1 : Nouvelle signature + capture de 3 natures par lot**

```typescript
import type { SoldeOpeningEntry, SoldeNature } from '@/lib/onboarding/api';

interface Step7Props {
  coproId: string;
  periodId: string;
  onComplete: (entries: SoldeOpeningEntry[]) => void;
  onBack: () => void;
}
```

- [ ] **Step 2 : Remplacer l'état `soldes` (string par lot) par un état par (lot, nature)**

```typescript
  // clé = `${lotId}:${nature}`
  const [soldes, setSoldes] = useState<Record<string, string>>({});
  const NATURES: { key: SoldeNature; label: string }[] = [
    { key: 'current', label: 'Courant' },
    { key: 'works', label: 'Travaux' },
    { key: 'alur', label: 'Fonds ALUR' },
  ];

  const handleSoldeChange = useCallback((lotId: string, nature: SoldeNature, value: string) => {
    setSoldes(prev => ({ ...prev, [`${lotId}:${nature}`]: value }));
  }, []);
```

- [ ] **Step 3 : Remplacer `handleSave` (qui appelait `saveRepriseSoldes`) par une capture**

```typescript
  const handleConfirm = useCallback(() => {
    const entries: SoldeOpeningEntry[] = [];
    for (const lot of lots) {
      for (const n of NATURES) {
        const amount = parseFloat(soldes[`${lot.id}:${n.key}`] || '0') || 0;
        if (amount !== 0) entries.push({ lotId: lot.id, nature: n.key, amount });
      }
    }
    onComplete(entries);
  }, [lots, soldes, onComplete]);
```

- [ ] **Step 4 : Adapter le tableau (une colonne de saisie par nature) et le footer**

Remplacer la colonne unique « Solde initial » par 3 colonnes (Courant / Travaux / Fonds ALUR), chaque cellule rendant un `<input>` lié à `soldes[`${lot.id}:${n.key}`]` via `handleSoldeChange(lot.id, n.key, e.target.value)`. Supprimer l'état `success` et `saveRepriseSoldes`. Le bouton final : `onClick={handleConfirm}` (libellé « Valider les soldes »), le bouton « Passer » : `onClick={() => onComplete([])}`.

- [ ] **Step 5 : Type check + commit**

Run: `npx tsc --noEmit` (Expected: PASS si A3 fait)

```bash
git add src/components/features/onboarding/steps/Step7RepriseSoldes.tsx
git commit -m "refactor(onboarding): Step7 capture les soldes par lot×nature sans poster (A6)"
```

---

### Task A7 : Step8 Finalisation — poste tout, audite, bloque si écart

**Files:**
- Create: `src/components/features/onboarding/steps/Step8Finalisation.tsx`
- Create: `src/components/features/onboarding/steps/Step8Finalisation.module.css` (réutiliser les classes de Step7 module ou styles minimaux)

- [ ] **Step 1 : Créer le composant de finalisation**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import {
  postOnboardingCalls,
  postOnboardingOpeningBalances,
  auditOnboardingBooks,
  type OnboardingCallPlan,
  type SoldeOpeningEntry,
  type OnboardingAuditIssue,
} from '@/lib/onboarding/api';
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

export function Step8Finalisation({ coproId, periodId, budgetId, callPlan, openingEntries, onFinalized, onBack }: Step8Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<OnboardingAuditIssue[] | null>(null);
  const [waitingBalance, setWaitingBalance] = useState<number | null>(null);

  const handleFinalize = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setIssues(null);

    // 1) Poster les appels (échéances restantes)
    if (callPlan && budgetId && callPlan.installments.length > 0) {
      const r = await postOnboardingCalls(coproId, periodId, budgetId, callPlan);
      if (r.error) { setError(r.error.message); setIsRunning(false); return; }
    }

    // 2) Poster la reprise des soldes
    if (openingEntries.length > 0) {
      const r = await postOnboardingOpeningBalances(coproId, periodId, openingEntries);
      if (r.error) { setError(r.error.message); setIsRunning(false); return; }
    }

    // 3) Auditer (audit=0 ET compte d'attente=0)
    const audit = await auditOnboardingBooks(coproId);
    setIsRunning(false);
    if (audit.error) { setError(audit.error.message); return; }

    setIssues(audit.data!.issues);
    setWaitingBalance(audit.data!.waitingBalance);

    if (audit.data!.clean) {
      onFinalized();
    }
  }, [coproId, periodId, budgetId, callPlan, openingEntries, onFinalized]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Finalisation"
        description="On enregistre les écritures comptables, puis on vérifie que le grand livre est cohérent avant de terminer."
      />

      {error && <div className={styles.errorMsg}>{error}</div>}

      {issues && issues.length > 0 && (
        <div className={styles.errorMsg}>
          <strong>{issues.length} écart(s) d'intégrité — finalisation bloquée :</strong>
          <ul>
            {issues.map((i, idx) => (
              <li key={idx}>{i.issue_type} — {i.description}</li>
            ))}
          </ul>
        </div>
      )}
      {waitingBalance !== null && Math.abs(waitingBalance) >= 0.01 && (
        <div className={styles.errorMsg}>
          Compte d'attente (471/472) non soldé : {waitingBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}.
          Complétez la reprise (banque, réserves) pour le ramener à 0.
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

- [ ] **Step 2 : CSS minimal (si Step7 module ne suffit pas, créer le module)**

Réutiliser `Step7RepriseSoldes.module.css` (classes `container`, `errorMsg`, `footer`, `btnBack`, `btnFinish`). Si une classe manque, l'ajouter au module Step7.

- [ ] **Step 3 : Type check + commit**

Run: `npx tsc --noEmit` (Expected: PASS)

```bash
git add src/components/features/onboarding/steps/Step8Finalisation.tsx
git commit -m "feat(onboarding): Step8 finalisation — poste + audit=0 bloquant (A7)"
```

---

### Task A8 : Orchestrateur — stocke plan+soldes, branche la finalisation

**Files:**
- Modify: `src/app/(gestionnaire)/onboarding/[id]/page.tsx`

- [ ] **Step 1 : Ajouter l'état partagé et l'import Step8**

Après les états `budgetId`/`periodId` (ligne 35), ajouter :

```typescript
  const [callPlan, setCallPlan] = useState<import('@/lib/onboarding/api').OnboardingCallPlan | null>(null);
  const [openingEntries, setOpeningEntries] = useState<import('@/lib/onboarding/api').SoldeOpeningEntry[]>([]);
```

Et l'import :

```typescript
import { Step8Finalisation } from '@/components/features/onboarding/steps/Step8Finalisation';
```

- [ ] **Step 2 : Brancher Step6 (capture) → step 7**

Remplacer le bloc Step6 (lignes 151-161) :

```tsx
        {periodId && maxStepReached >= 6 && (
          <div style={{ display: currentStep === 6 ? undefined : 'none' }}>
            <Step6AgAppels
              coproId={coproId}
              budgetId={budgetId}
              periodId={periodId}
              onComplete={(plan) => { setCallPlan(plan); completeStep(6); }}
              onBack={() => goToStep(5)}
            />
          </div>
        )}
```

- [ ] **Step 3 : Brancher Step7 (capture) → step 8**

Remplacer le bloc Step7 (lignes 162-171) : `onComplete` ne finalise plus, il capture et avance vers l'étape 8 :

```tsx
        {periodId && maxStepReached >= 7 && (
          <div style={{ display: currentStep === 7 ? undefined : 'none' }}>
            <Step7RepriseSoldes
              coproId={coproId}
              periodId={periodId}
              onComplete={(entries) => { setOpeningEntries(entries); completeStep(7); }}
              onBack={() => goToStep(6)}
            />
          </div>
        )}
        {periodId && maxStepReached >= 8 && (
          <div style={{ display: currentStep === 8 ? undefined : 'none' }}>
            <Step8Finalisation
              coproId={coproId}
              periodId={periodId}
              budgetId={budgetId}
              callPlan={callPlan}
              openingEntries={openingEntries}
              onFinalized={handleStep7Complete}
              onBack={() => goToStep(7)}
            />
          </div>
        )}
```

- [ ] **Step 4 : Étendre le wizard à 8 étapes**

Dans `src/hooks/modules/useOnboarding.ts`, ajouter l'étape 8 au tableau `ONBOARDING_STEPS` :

```typescript
export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 1, label: 'Copropriété' },
  { id: 2, label: 'Copropriétaires' },
  { id: 3, label: 'Lots & Clés' },
  { id: 4, label: 'Comptes bancaires' },
  { id: 5, label: 'Budget' },
  { id: 6, label: 'AG & Appels' },
  { id: 7, label: 'Reprise soldes' },
  { id: 8, label: 'Finalisation' },
];
```

`completeStep`, `goToStep` et `isLastStep` sont déjà génériques (ils s'appuient sur `ONBOARDING_STEPS.length`) : `completeStep(7)` avance désormais vers 8, et la finalisation n'appelle PAS `completeStep(8)` — c'est `Step8.onFinalized` → `handleStep7Complete` (déjà = `finishOnboarding()` + `router.push('/portefeuille')`) qui termine. Aucune autre modification du hook nécessaire.

- [ ] **Step 5 : Type check + build + commit**

Run: `npx tsc --noEmit` (Expected: PASS) puis `npm run build` (Expected: build OK)

```bash
git add src/app/(gestionnaire)/onboarding/[id]/page.tsx src/hooks/modules/useOnboarding.ts src/components/features/onboarding/OnboardingStepper/*
git commit -m "feat(onboarding): orchestrateur — étape 8 finalisation, postage différé (A8)"
```

---

## Track B — Fixture propre + test d'acceptation SQL

### Task B1 : Migration `create_clean_test_copro` (structure synthétique + chart canonique)

**Files:**
- Create: `supabase/migrations/20260602190000_v1_5c_create_clean_test_copro.sql`

- [ ] **Step 1 : Écrire la migration (structure synthétique, NE clone PAS 22222222)**

```sql
-- ============================================================
-- V1.5-C — Fixture de test PROPRE (née du chemin canonique)
-- create_clean_test_copro : copro fraîche + provision_copro_chart
--   + structure synthétique (4 lots, 3 copropriétaires, 3 clés).
-- create_clean_test_copro_seeded : + seed_golden_loop.
-- Ne part PAS de la boucle d'or 22222222 (pas de scories).
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_clean_test_copro(p_tag text DEFAULT 'clean')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new    uuid := gen_random_uuid();
  v_period uuid := gen_random_uuid();
  v_year   int  := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_key_gen uuid := gen_random_uuid();
  v_key_eau uuid := gen_random_uuid();
  v_key_asc uuid := gen_random_uuid();
  v_lot_ids uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_co_ids  uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  i int;
BEGIN
  -- 1) Copro fraîche
  INSERT INTO copros (id, name, address, city, postal_code, buildings_count, lots_count, total_tantiemes, exercice_debut)
  VALUES (v_new, 'CLEAN '||substr(v_new::text,1,8)||' ('||p_tag||')', '1 rue du Test', 'Paris', '75001', 1, 4, 1000, '01-01');

  -- 2) Plan comptable CANONIQUE (la routine prod)
  PERFORM provision_copro_chart(v_new);

  -- 3) Copropriétaires (le 1er possède 2 lots)
  INSERT INTO coproprietaires (id, copro_id, is_company, first_name, last_name, email, is_resident) VALUES
    (v_co_ids[1], v_new, false, 'Alice',  'Martin',  'alice@test.fr',  true),
    (v_co_ids[2], v_new, false, 'Bruno',  'Durand',  'bruno@test.fr',  true),
    (v_co_ids[3], v_new, false, 'Chloé',  'Bernard', 'chloe@test.fr',  false);

  -- 4) Lots (250 tantièmes chacun = 1000)
  INSERT INTO lots (id, copro_id, ref, type, floor, tantiemes_generaux) VALUES
    (v_lot_ids[1], v_new, 'A101', 'appartement', 1, 250),
    (v_lot_ids[2], v_new, 'A102', 'appartement', 1, 250),
    (v_lot_ids[3], v_new, 'A201', 'appartement', 2, 250),
    (v_lot_ids[4], v_new, 'A202', 'appartement', 2, 250);

  -- 5) lot_owners (lot1+lot2 -> Alice ; lot3 -> Bruno ; lot4 -> Chloé), primaires
  INSERT INTO lot_owners (id, lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date) VALUES
    (gen_random_uuid(), v_lot_ids[1], v_co_ids[1], v_new, 100, true, make_date(v_year,1,1)),
    (gen_random_uuid(), v_lot_ids[2], v_co_ids[1], v_new, 100, true, make_date(v_year,1,1)),
    (gen_random_uuid(), v_lot_ids[3], v_co_ids[2], v_new, 100, true, make_date(v_year,1,1)),
    (gen_random_uuid(), v_lot_ids[4], v_co_ids[3], v_new, 100, true, make_date(v_year,1,1));

  -- 6) Clés : générale (tous lots) + eau (lot1,2) + ascenseur (lot3,4) — created_at décalé pour ordre déterministe
  INSERT INTO repartition_keys (id, copro_id, name, basis, is_active, coverage_mode, category, created_at) VALUES
    (v_key_gen, v_new, 'Clé générale',   'tantiemes', true, 'all_lots', 'general', now() - interval '3 min'),
    (v_key_eau, v_new, 'Clé eau',        'custom',    true, 'custom',   'special', now() - interval '2 min'),
    (v_key_asc, v_new, 'Clé ascenseur',  'custom',    true, 'custom',   'special', now() - interval '1 min');

  -- 7) key_lines : générale = tantièmes sur 4 lots ; eau = lot1,2 ; ascenseur = lot3,4
  INSERT INTO repartition_key_lines (id, key_id, copro_id, lot_id, weight)
  SELECT gen_random_uuid(), v_key_gen, v_new, v_lot_ids[i], 250 FROM generate_series(1,4) i;
  INSERT INTO repartition_key_lines (id, key_id, copro_id, lot_id, weight) VALUES
    (gen_random_uuid(), v_key_eau, v_new, v_lot_ids[1], 50),
    (gen_random_uuid(), v_key_eau, v_new, v_lot_ids[2], 50);
  INSERT INTO repartition_key_lines (id, key_id, copro_id, lot_id, weight) VALUES
    (gen_random_uuid(), v_key_asc, v_new, v_lot_ids[3], 50),
    (gen_random_uuid(), v_key_asc, v_new, v_lot_ids[4], 50);

  -- 8) Fournisseur + exercice ouvert
  INSERT INTO suppliers (id, copro_id, name, contact, is_active)
  VALUES (gen_random_uuid(), v_new, 'Prestataire Démo', '{}'::jsonb, true);
  INSERT INTO accounting_periods (id, copro_id, name, start_date, end_date, status)
  VALUES (v_period, v_new, 'Exercice '||v_year, make_date(v_year,1,1), make_date(v_year,12,31), 'open');

  RAISE NOTICE 'CLEAN copro % (period %) prête.', v_new, v_period;
  RETURN v_new;
END;
$function$;

COMMENT ON FUNCTION public.create_clean_test_copro(text) IS
  'Fixture de test PROPRE : copro fraîche + provision_copro_chart + structure synthétique (4 lots, 3 copros, 3 clés). Ne clone pas 22222222.';
```

- [ ] **Step 2 : Vérifier les colonnes réelles avant apply**

Run (MCP Supabase `execute_sql`, lecture seule) : comparer les colonnes utilisées (copros, coproprietaires, lots, lot_owners, repartition_keys, repartition_key_lines, suppliers, accounting_periods) avec `create_test_copro` existant (`supabase/migrations/20260602098000_review_fix_special_key_determinism.sql:226-308`).
Expected : mêmes colonnes ; ajuster la migration si une colonne diffère.

- [ ] **Step 3 : Variante seedée**

Ajouter dans la même migration :

```sql
CREATE OR REPLACE FUNCTION public.create_clean_test_copro_seeded(
  p_tag text DEFAULT 'clean',
  p_budget_total numeric DEFAULT 15000,
  p_unpaid_count integer DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_copro  uuid;
  v_period uuid;
  v_seed   jsonb;
BEGIN
  v_copro := create_clean_test_copro(p_tag);
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  v_seed := seed_golden_loop(v_copro, v_period, p_budget_total, p_unpaid_count);
  RETURN jsonb_build_object('copro_id', v_copro, 'period_id', v_period, 'seed', v_seed);
END;
$function$;

COMMENT ON FUNCTION public.create_clean_test_copro_seeded(text, numeric, integer) IS
  'create_clean_test_copro + seed_golden_loop (boucle financière canonique). Renvoie {copro_id, period_id, seed}.';
```

- [ ] **Step 4 : Appliquer la migration (OK utilisateur requis)**

Demander le go, puis `apply_migration` (MCP Supabase, projet `iyfesbjnkpynmwlsmxnp`) avec le contenu du fichier.

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/20260602190000_v1_5c_create_clean_test_copro.sql
git commit -m "feat(test): create_clean_test_copro(_seeded) — fixture propre canonique (B1)"
```

---

### Task B2 : Test d'acceptation SQL — `audit_finance_integrity = 0`

**Files:**
- Create: `supabase/migrations/20260602191000_v1_5c_test_clean_copro_audit.sql` (test auto-rollback)

- [ ] **Step 1 : Écrire un test SQL qui crée une copro propre seedée et exige 0 écart**

```sql
-- Test d'acceptation (auto-rollback) : la copro née du chemin canonique = 0 écart.
DO $$
DECLARE
  v_res     jsonb;
  v_copro   uuid;
  v_issues  int;
  v_wait    numeric;
BEGIN
  v_res := create_clean_test_copro_seeded('acceptance', 15000, 2);
  v_copro := (v_res->>'copro_id')::uuid;

  SELECT count(*) INTO v_issues FROM audit_finance_integrity(v_copro);

  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0)
    INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  WHERE a.copro_id = v_copro AND a.code IN ('471','472');

  IF v_issues <> 0 THEN
    RAISE EXCEPTION 'ACCEPTANCE FAIL : % écart(s) d''intégrité sur la copro propre %', v_issues, v_copro;
  END IF;
  IF abs(v_wait) >= 0.01 THEN
    RAISE EXCEPTION 'ACCEPTANCE FAIL : compte d''attente 471/472 = % (attendu 0)', v_wait;
  END IF;

  RAISE NOTICE 'ACCEPTANCE OK : copro propre % — 0 écart, attente=0.', v_copro;
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';  -- rollback volontaire (test non destructif)
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'ROLLBACK_TEST_OK' THEN
      RAISE NOTICE 'Test terminé (rollback).';
    ELSE
      RAISE;
    END IF;
END $$;
```

- [ ] **Step 2 : Exécuter le test (lecture/rollback, OK utilisateur)**

Run (MCP `execute_sql`) : le bloc ci-dessus. Expected : `NOTICE ACCEPTANCE OK` puis `NOTICE Test terminé (rollback)`. Si `ACCEPTANCE FAIL`, lister `SELECT * FROM audit_finance_integrity(copro)` et corriger Track A/seed avant de continuer.

- [ ] **Step 3 : Commit (le fichier sert de test reproductible, non appliqué en prod)**

```bash
git add supabase/migrations/20260602191000_v1_5c_test_clean_copro_audit.sql
git commit -m "test(finance): acceptation SQL — copro propre = 0 écart (B2)"
```

---

## Track C — Smoke Playwright (vrai chemin UI)

### Task C1 : E2E onboarding réparé → audit = 0

**Files:**
- Create: `e2e/onboarding-clean-path.spec.ts`

- [ ] **Step 1 : Lire un spec existant pour le pattern d'auth/login**

Read: `e2e/ag-workflow.spec.ts` (réutiliser son helper de connexion + sa façon d'accéder à Supabase pour les assertions DB).

- [ ] **Step 2 : Écrire le smoke (parcours minimal + assertion audit=0)**

```typescript
import { test, expect } from '@playwright/test';
// Réutiliser le helper de login + client Supabase de ag-workflow.spec.ts (à factoriser dans e2e/helpers si besoin).

test('onboarding réparé : la copro née du wizard a 0 écart d\'intégrité', async ({ page }) => {
  // 1) Login (helper existant)
  // 2) Créer la copro (Step 1) : /onboarding/create -> remplir nom/adresse/ville/CP -> valider
  // 3) Step 2 : ajouter 2 copropriétaires
  // 4) Step 3 : créer 2 lots (250/250 tantièmes) + 1 clé générale ; assigner propriétaires
  // 5) Step 4 : passer (ou créer un compte 512)
  // 6) Step 5 : budget (1 ligne sur la clé générale, ex. 4000 €)
  // 7) Step 6 : fréquence annuel, 0 déjà émis, date AG -> valider le plan
  // 8) Step 7 : saisir un solde courant non nul sur 1 lot (ex. 120 €) -> valider
  // 9) Step 8 : « Enregistrer et vérifier » -> attendre la redirection /portefeuille (preuve audit=0)
  await expect(page).toHaveURL(/\/portefeuille/, { timeout: 30000 });

  // 10) Assertion DB directe : audit_finance_integrity(copro) = 0 ligne
  //    (récupérer le coproId via le client Supabase admin du helper, puis rpc audit_finance_integrity)
});
```

- [ ] **Step 3 : Lancer le smoke**

Run: `npx playwright test e2e/onboarding-clean-path.spec.ts`
Expected: PASS (redirection /portefeuille + 0 écart). Si échec, lire la console + `audit_finance_integrity`.

- [ ] **Step 4 : Commit**

```bash
git add e2e/onboarding-clean-path.spec.ts
git commit -m "test(e2e): smoke onboarding réparé — audit=0 (C1)"
```

---

## Vérification finale (DoD)

- [ ] `npx tsc --noEmit` PASS.
- [ ] `npm run build` PASS.
- [ ] Test SQL B2 : `ACCEPTANCE OK`.
- [ ] Smoke C1 : vert.
- [ ] `grep` : plus aucun INSERT direct sur `ledger_transactions`/`ledger_entries` ni création de compte `450/701/600/120` à la volée dans `src/lib/onboarding/` ni dans les steps.
- [ ] Mettre à jour `.planning/PROGRESS_V1.md` (1.5-C2 + 1.5-D faits) et la mémoire si une décision durable a émergé.

## Notes / limites connues
- `audit_finance_integrity` ne détecte **pas** un mauvais compte de charge (628 vs 615) : l'angle mort est documenté ; le warning `unmappedCategories` (A1) le compense partiellement côté UI.
- TVA : hors scope de cette tranche.
- Le compte d'attente 471/472 reste l'aiguillon : tant qu'il n'est pas soldé (banque/réserves saisies), la finalisation est bloquée — c'est voulu (converge vers le bilan complet).
