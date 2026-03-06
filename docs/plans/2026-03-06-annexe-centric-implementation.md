# Annexe-Centric Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the annexe SQL functions the standard reporting layer, feeding dashboard KPIs, budget/finance stats, and a new client-facing annexes page.

**Architecture:** Two-layer system — operational views (existing, untouched) for CRUD, annexe functions (fn_annexe_*) for all reporting/dashboards. A new fn_dashboard_kpis() aggregates annexe data. An AnnexeContext provides cached data across pages.

**Tech Stack:** Supabase SQL (PL/pgSQL), Next.js 16, React 19, TypeScript, CSS Modules

**Team:**
- **Chef** (coordinator): orchestrates phases, validates coherence between agents
- **Backend** (SQL expert): fn_dashboard_kpis, Supabase migration
- **Frontend** (React expert): hooks, components, pages, context
- **Corpo** (compliance expert): validates legal format, UX, data accuracy

---

## Phase 1: fn_dashboard_kpis + useAnnexeSummary + Dashboard Migration

### Task 1: Create fn_dashboard_kpis SQL function [Backend]

**Files:**
- Create: `supabase/migrations/20260306_fn_dashboard_kpis.sql`

**Step 1: Write the SQL function**

```sql
CREATE OR REPLACE FUNCTION fn_dashboard_kpis(
  p_copro_id uuid,
  p_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_annexe1 jsonb;
  v_annexe2 jsonb;
  v_annexe4 jsonb;
  v_result jsonb;
  v_budget_vote numeric := 0;
  v_budget_realise numeric := 0;
  v_travaux_en_cours numeric := 0;
  v_nb_travaux_ouverts integer := 0;
BEGIN
  -- Get annexe 1 data (tresorerie, provisions, creances, dettes)
  v_annexe1 := fn_annexe_1(p_copro_id, p_period_id);

  -- Get annexe 2 data (budget vote vs realise)
  v_annexe2 := fn_annexe_2(p_copro_id, p_period_id);

  -- Get annexe 4 data (travaux)
  v_annexe4 := fn_annexe_4(p_copro_id, p_period_id);

  -- Extract budget totals from annexe 2
  v_budget_vote := COALESCE(
    (v_annexe2->'total_charges'->>'ex_clos_budget')::numeric, 0
  );
  v_budget_realise := COALESCE(
    (v_annexe2->'total_charges'->>'ex_clos_realise')::numeric, 0
  );

  -- Count open works from annexe 4
  SELECT
    COALESCE(SUM((op->>'solde')::numeric), 0),
    COUNT(*)
  INTO v_travaux_en_cours, v_nb_travaux_ouverts
  FROM jsonb_array_elements(v_annexe4->'operations') AS op
  WHERE (op->>'solde')::numeric > 0;

  v_result := jsonb_build_object(
    'tresorerie', COALESCE((v_annexe1->'section_i'->'tresorerie'->>'total')::numeric, 0),
    'total_impayes', COALESCE((v_annexe1->'section_ii'->'creances'->>'total')::numeric, 0),
    'provisions_travaux', COALESCE((v_annexe1->'section_i'->'provisions'->>'total')::numeric, 0),
    'dettes', COALESCE((v_annexe1->'section_ii'->'dettes'->>'total')::numeric, 0),
    'budget_vote', v_budget_vote,
    'budget_realise', v_budget_realise,
    'budget_pct', CASE WHEN v_budget_vote > 0
      THEN ROUND(v_budget_realise / v_budget_vote * 100, 1)
      ELSE 0
    END,
    'travaux_en_cours', v_travaux_en_cours,
    'nb_travaux_ouverts', v_nb_travaux_ouverts
  );

  RETURN v_result;
END;
$$;
```

**Step 2: Deploy the migration**

Use Supabase MCP `apply_migration` with name `fn_dashboard_kpis` and the SQL above.

**Step 3: Test via execute_sql**

```sql
SELECT fn_dashboard_kpis(
  '<copro_id>'::uuid,
  '<period_id>'::uuid
);
```

Verify the JSONB has all 9 keys with numeric values.

**Step 4: Commit**

```bash
git add supabase/migrations/20260306_fn_dashboard_kpis.sql
git commit -m "feat: fn_dashboard_kpis aggregating annexe data for dashboard"
```

---

### Task 2: Create AnnexeKpis type and useAnnexeSummary hook [Frontend]

**Files:**
- Create: `src/hooks/modules/useAnnexeSummary.ts`
- Modify: `src/components/features/finance/Comptabilite/types.ts` (add AnnexeKpis type)

**Step 1: Add AnnexeKpis type to types.ts**

Add at end of `src/components/features/finance/Comptabilite/types.ts`:

```typescript
export interface AnnexeKpis {
  tresorerie: number;
  total_impayes: number;
  provisions_travaux: number;
  dettes: number;
  budget_vote: number;
  budget_realise: number;
  budget_pct: number;
  travaux_en_cours: number;
  nb_travaux_ouverts: number;
}
```

**Step 2: Create useAnnexeSummary hook**

Create `src/hooks/modules/useAnnexeSummary.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { getActiveAccountingPeriod } from '@/lib/finance/accounting-period';
import type { AnnexeKpis } from '@/components/features/finance/Comptabilite/types';

interface UseAnnexeSummaryResult {
  kpis: AnnexeKpis | null;
  periodId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAnnexeSummary(): UseAnnexeSummaryResult {
  const { currentCoproId, isLoading: coproLoading } = useCopro();

  const [kpis, setKpis] = useState<AnnexeKpis | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the active period
      const periodResult = await getActiveAccountingPeriod(currentCoproId);
      if (periodResult.error || !periodResult.data) {
        setError(periodResult.error || 'Aucune période comptable ouverte');
        setIsLoading(false);
        return;
      }

      setPeriodId(periodResult.data.id);

      // Call fn_dashboard_kpis
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)(
        'fn_dashboard_kpis',
        {
          p_copro_id: currentCoproId,
          p_period_id: periodResult.data.id,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
      } else {
        setKpis(data as unknown as AnnexeKpis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    if (!coproLoading) {
      refresh();
    }
  }, [coproLoading, refresh]);

  return { kpis, periodId, isLoading, error, refresh };
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v '__tests__'`
Expected: No errors from new files.

**Step 4: Commit**

```bash
git add src/hooks/modules/useAnnexeSummary.ts src/components/features/finance/Comptabilite/types.ts
git commit -m "feat: useAnnexeSummary hook with AnnexeKpis type"
```

---

### Task 3: Migrate dashboard to use annexe KPIs [Frontend]

**Files:**
- Modify: `src/features/dashboard/main/hooks/useDashboardMainPage.ts` (lines 27-32, 121-156)
- Modify: `src/hooks/modules/useDashboardData.ts` (lines 220-281)
- Modify: `src/lib/dashboard/api.ts` (lines 82-111, 184-205)

**Step 1: Add annexe KPIs to getDashboardData in api.ts**

In `src/lib/dashboard/api.ts`, add import and extend `getDashboardData()` to also call `fn_dashboard_kpis`:

```typescript
// Add to DashboardKpis interface (lines 17-25):
  budget_vote?: number;
  budget_realise?: number;
  budget_pct?: number;
  tresorerie?: number;
  provisions_travaux?: number;
  travaux_en_cours?: number;
  nb_travaux_ouverts?: number;
```

In `getDashboardData()` (line 184), after the existing parallel fetch, add a supplementary call to fn_dashboard_kpis that merges into kpis. This is done inside `getDashboardData`.

**Step 2: Update KpisData in useDashboardMainPage.ts**

In `src/features/dashboard/main/hooks/useDashboardMainPage.ts`, extend `KpisData` (lines 27-32):

```typescript
export interface KpisData {
  current_balance: number;
  unpaid_total: number;
  next_ag_date: string | null;
  next_ag_id: string | null;
  // New annexe-sourced KPIs
  budget_vote: number;
  budget_realise: number;
  budget_pct: number;
  tresorerie: number;
  provisions_travaux: number;
  travaux_en_cours: number;
  nb_travaux_ouverts: number;
}
```

**Step 3: Verify the dashboard page still renders**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds. Dashboard page uses extended KPIs.

**Step 4: Commit**

```bash
git add src/lib/dashboard/api.ts src/features/dashboard/main/hooks/useDashboardMainPage.ts src/hooks/modules/useDashboardData.ts
git commit -m "feat: dashboard KPIs sourced from annexe functions"
```

---

### Task 4: Validate dashboard KPI coherence [Corpo]

**Validation checklist:**
- [ ] `tresorerie` from fn_dashboard_kpis matches what fn_annexe_1 section_i.tresorerie.total returns
- [ ] `budget_pct` = budget_realise / budget_vote * 100, consistent with annexe 2 totals
- [ ] `total_impayes` matches annexe 1 section_ii.creances.total
- [ ] `provisions_travaux` matches annexe 1 section_i.provisions.total
- [ ] `travaux_en_cours` sums only operations with solde > 0 from annexe 4
- [ ] No data shown if no open accounting period (graceful empty state)

**How to validate:**

```sql
-- Run these and compare results
SELECT fn_dashboard_kpis('<copro_id>', '<period_id>');
SELECT fn_annexe_1('<copro_id>', '<period_id>');
SELECT fn_annexe_2('<copro_id>', '<period_id>');
SELECT fn_annexe_4('<copro_id>', '<period_id>');
```

Verify numbers match across all 4 outputs.

---

## Phase 2: Budget & Finance Stats Banners

### Task 5: Create BudgetAnnexeStats component [Frontend]

**Files:**
- Create: `src/components/features/finance/Budget/BudgetAnnexeStats.tsx`
- Create: `src/components/features/finance/Budget/BudgetAnnexeStats.module.css`

**Step 1: Create the component**

```typescript
'use client';

import { useAnnexeSummary } from '@/hooks/modules/useAnnexeSummary';
import styles from './BudgetAnnexeStats.module.css';

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export function BudgetAnnexeStats() {
  const { kpis, isLoading, error } = useAnnexeSummary();

  if (isLoading || error || !kpis) return null;

  const ecart = kpis.budget_vote - kpis.budget_realise;

  return (
    <div className={styles.banner}>
      <div className={styles.stat}>
        <span className={styles.label}>Budget vote</span>
        <span className={styles.value}>{formatEuro(kpis.budget_vote)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Realise</span>
        <span className={styles.value}>{formatEuro(kpis.budget_realise)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Consommation</span>
        <span className={styles.value}>{kpis.budget_pct}%</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Ecart</span>
        <span className={`${styles.value} ${ecart >= 0 ? styles.positive : styles.negative}`}>
          {ecart >= 0 ? '+' : ''}{formatEuro(ecart)}
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Create CSS module**

```css
/* BudgetAnnexeStats.module.css */
.banner {
  display: flex;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-4);
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.value {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text);
}

.positive { color: var(--color-success); }
.negative { color: var(--color-error); }
```

**Step 3: Integrate into budget page**

In `src/app/(dashboard)/finance/budget-current/page.tsx`, add:
```typescript
import { BudgetAnnexeStats } from '@/components/features/finance/Budget/BudgetAnnexeStats';
```
Place `<BudgetAnnexeStats />` at the top of the page return, before existing content.

**Step 4: Commit**

```bash
git add src/components/features/finance/Budget/BudgetAnnexeStats.tsx src/components/features/finance/Budget/BudgetAnnexeStats.module.css src/app/(dashboard)/finance/budget-current/page.tsx
git commit -m "feat: BudgetAnnexeStats banner with annexe-sourced data"
```

---

### Task 6: Create FinanceAnnexeStats component [Frontend]

**Files:**
- Create: `src/components/features/finance/FinanceAnnexeStats.tsx`
- Create: `src/components/features/finance/FinanceAnnexeStats.module.css`
- Modify: `src/app/(dashboard)/finance/page.tsx`

**Step 1: Create the component**

Same pattern as BudgetAnnexeStats but showing:
- Tresorerie (kpis.tresorerie)
- Creances (kpis.total_impayes)
- Provisions (kpis.provisions_travaux)
- Dettes (kpis.dettes)

**Step 2: Create CSS module**

Same structure as BudgetAnnexeStats.module.css.

**Step 3: Integrate into finance page**

In `src/app/(dashboard)/finance/page.tsx`, add `<FinanceAnnexeStats />` after the header (line 96), before the alerts section.

**Step 4: Commit**

```bash
git add src/components/features/finance/FinanceAnnexeStats.tsx src/components/features/finance/FinanceAnnexeStats.module.css src/app/(dashboard)/finance/page.tsx
git commit -m "feat: FinanceAnnexeStats banner with annexe-sourced data"
```

---

### Task 7: Validate stats coherence [Corpo]

**Validation checklist:**
- [ ] BudgetAnnexeStats shows same budget_vote/realise as annexe 2 totals
- [ ] FinanceAnnexeStats tresorerie matches annexe 1 section_i.tresorerie.total
- [ ] All banners gracefully hide when no data (isLoading/error/null -> return null)
- [ ] Numbers format correctly in French locale (space as thousands separator, comma as decimal)
- [ ] Banner doesn't break existing page layout

---

## Phase 3: Documents/Annexes Page (Client Space)

### Task 8: Create Documents/Annexes page with simplified view [Frontend]

**Files:**
- Create: `src/app/(dashboard)/documents/annexes/page.tsx`
- Create: `src/app/(dashboard)/documents/annexes/annexes.module.css`
- Modify: `src/app/(dashboard)/documents/page.tsx` (add Annexes link)

**Step 1: Add Annexes section to documents landing page**

In `src/app/(dashboard)/documents/page.tsx`, add to the `sections` array:

```typescript
{
    title: 'Annexes comptables',
    description: 'Annexes reglementaires (Decret 2005-240)',
    icon: ClipboardList, // import from lucide-react
    href: '/documents/annexes'
}
```

**Step 2: Create the annexes page**

Create `src/app/(dashboard)/documents/annexes/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useAnnexeSummary } from '@/hooks/modules/useAnnexeSummary';
import { useAnnexeData } from '@/hooks/modules/useAnnexeData';
import { useCopro } from '@/providers/CoproContext';
import {
  Annexe1Table,
  Annexe1DetailCoprosTable,
  Annexe2Table,
  Annexe3Table,
  Annexe4Table,
  Annexe5Table,
} from '@/components/features/finance/Comptabilite';
import styles from './annexes.module.css';

type ViewMode = 'simplified' | 'legal';

export default function AnnexesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('simplified');
  const { kpis, periodId, isLoading, error } = useAnnexeSummary();
  const { currentCoproId, currentCopro } = useCopro();

  // Legal view: load full annexe data on demand
  const isLegal = viewMode === 'legal';
  const coproId = isLegal ? currentCoproId : null;
  const pId = isLegal ? periodId : null;

  const annexe1 = useAnnexeData(coproId, pId, 1);
  const annexe1Detail = useAnnexeData(coproId, pId, '1_detail');
  const annexe2 = useAnnexeData(coproId, pId, 2);
  const annexe3 = useAnnexeData(coproId, pId, 3);
  const annexe4 = useAnnexeData(coproId, pId, 4);
  const annexe5 = useAnnexeData(coproId, pId, 5);

  if (isLoading) {
    return <div className={styles.container}><p>Chargement...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  }

  const coproName = currentCopro?.name || 'Copropriete';
  const exercice = kpis ? String(new Date().getFullYear()) : '';

  // Period labels for annexes 2 & 3
  const year = new Date().getFullYear();
  const periodLabels = {
    exPrecedent: `${year - 1}`,
    exClosBudget: `${year}`,
    exClosRealise: `${year}`,
    bpEnCours: `${year + 1}`,
    bpAVoter: `${year + 2}`,
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Annexes comptables</h1>
        <p className={styles.subtitle}>Decret n 2005-240 - Documents obligatoires</p>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${viewMode === 'simplified' ? styles.tabActive : ''}`}
            onClick={() => setViewMode('simplified')}
          >
            Vue simplifiee
          </button>
          <button
            className={`${styles.tab} ${viewMode === 'legal' ? styles.tabActive : ''}`}
            onClick={() => setViewMode('legal')}
          >
            Documents officiels
          </button>
        </div>
      </div>

      {viewMode === 'simplified' && kpis && (
        <SimplifiedView kpis={kpis} />
      )}

      {viewMode === 'legal' && (
        <LegalView
          annexe1={annexe1} annexe1Detail={annexe1Detail}
          annexe2={annexe2} annexe3={annexe3}
          annexe4={annexe4} annexe5={annexe5}
          coproName={coproName} exercice={exercice}
          periodLabels={periodLabels}
        />
      )}
    </div>
  );
}
```

The `SimplifiedView` renders KPI cards (tresorerie, budget %, travaux, impayes).
The `LegalView` renders the existing Annexe1-5Table components.

Both are internal components in the same file to keep it simple.

**Step 3: Create CSS module**

Style the cards grid, tabs, header, following the existing `documents.module.css` patterns.

**Step 4: Commit**

```bash
git add src/app/(dashboard)/documents/annexes/ src/app/(dashboard)/documents/page.tsx
git commit -m "feat: Documents/Annexes page with simplified and legal views"
```

---

### Task 9: Validate annexes page [Corpo]

**Validation checklist:**
- [ ] Simplified view shows same numbers as dashboard KPIs
- [ ] Legal view renders all 5 annexes with correct headers per Decret 2005-240
- [ ] Annexe 1: Section I (tresorerie + provisions) + Section II (creances | dettes) side-by-side
- [ ] Annexe 2: 5 legal columns (ex precedent, ex clos budget, ex clos realise, BP en cours, BP a voter)
- [ ] Annexe 3: Grouped by cle de repartition
- [ ] Annexe 4: 4 columns (depenses votees, realisees, provisions appelees, solde)
- [ ] Annexe 5: A-F columns for unclosed works
- [ ] Tab switching works without re-fetching simplified data
- [ ] Legal data only loads when "Documents officiels" tab is clicked
- [ ] Page accessible from Documents landing page

---

## Phase 4: Invalidation & Wiring

### Task 10: Create AnnexeContext for cross-page cache [Frontend]

**Files:**
- Create: `src/providers/AnnexeContext.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` (wrap with provider)
- Modify: `src/hooks/modules/useAnnexeSummary.ts` (use context instead of local state)

**Step 1: Create AnnexeContext**

```typescript
'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { getActiveAccountingPeriod } from '@/lib/finance/accounting-period';
import type { AnnexeKpis } from '@/components/features/finance/Comptabilite/types';

interface AnnexeContextValue {
  kpis: AnnexeKpis | null;
  periodId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AnnexeContext = createContext<AnnexeContextValue | undefined>(undefined);

export function AnnexeProvider({ children }: { children: React.ReactNode }) {
  // Move the fetch logic from useAnnexeSummary here
  // Same implementation but shared via context
  const { currentCoproId, isLoading: coproLoading } = useCopro();
  const [kpis, setKpis] = useState<AnnexeKpis | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const periodResult = await getActiveAccountingPeriod(currentCoproId);
      if (periodResult.error || !periodResult.data) {
        setError(periodResult.error || 'Aucune periode ouverte');
        setIsLoading(false);
        return;
      }
      setPeriodId(periodResult.data.id);
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)(
        'fn_dashboard_kpis',
        { p_copro_id: currentCoproId, p_period_id: periodResult.data.id }
      );
      if (rpcError) { setError(rpcError.message); }
      else { setKpis(data as unknown as AnnexeKpis); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    if (!coproLoading) refresh();
  }, [coproLoading, refresh]);

  return (
    <AnnexeContext.Provider value={{ kpis, periodId, isLoading, error, refresh }}>
      {children}
    </AnnexeContext.Provider>
  );
}

export function useAnnexeContext(): AnnexeContextValue {
  const ctx = useContext(AnnexeContext);
  if (!ctx) throw new Error('useAnnexeContext must be used within AnnexeProvider');
  return ctx;
}
```

**Step 2: Wrap layout with AnnexeProvider**

In `src/app/(dashboard)/layout.tsx`, add `<AnnexeProvider>` inside the existing `<CoproProvider>`.

**Step 3: Update useAnnexeSummary to use context**

Replace `src/hooks/modules/useAnnexeSummary.ts` to simply re-export useAnnexeContext:

```typescript
export { useAnnexeContext as useAnnexeSummary } from '@/providers/AnnexeContext';
```

**Step 4: Commit**

```bash
git add src/providers/AnnexeContext.tsx src/app/(dashboard)/layout.tsx src/hooks/modules/useAnnexeSummary.ts
git commit -m "feat: AnnexeContext for cross-page KPI cache"
```

---

### Task 11: Wire mutation refresh [Frontend]

**Files:**
- Modify: `src/hooks/modules/useBudgetMutations.ts` (add refresh callback)
- Modify: `src/hooks/modules/useFinanceData.ts` (add refresh callback)

**Step 1: Add refresh after budget mutations**

In `useBudgetMutations.ts`, after each successful mutation, call `useAnnexeContext().refresh()`.

Pattern:
```typescript
import { useAnnexeContext } from '@/providers/AnnexeContext';

// Inside hook:
const { refresh: refreshAnnexes } = useAnnexeContext();

// After successful mutation:
await refreshAnnexes();
```

**Step 2: Add refresh after finance mutations**

Same pattern in `useFinanceData.ts` for payment recording, invoice validation, etc.

**Step 3: Verify no circular dependencies**

Run: `npx tsc --noEmit 2>&1 | grep -v '__tests__'`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/hooks/modules/useBudgetMutations.ts src/hooks/modules/useFinanceData.ts
git commit -m "feat: auto-refresh annexe KPIs after financial mutations"
```

---

### Task 12: Final coherence validation [Corpo]

**End-to-end validation:**
- [ ] Dashboard KPIs match budget page stats match finance page stats
- [ ] Documents/Annexes simplified view matches dashboard KPIs
- [ ] Documents/Annexes legal view matches comptabilite page annexe tabs
- [ ] After a simulated mutation, refresh updates all pages
- [ ] No hardcoded/mock values remain in the reporting pipeline
- [ ] Performance: fn_dashboard_kpis returns in < 500ms
- [ ] Error states are handled gracefully on all pages
- [ ] Zero regression: existing CRUD pages work unchanged

---

## Summary

| Task | Owner | Files | Depends On |
|------|-------|-------|------------|
| 1. fn_dashboard_kpis SQL | Backend | migration SQL | - |
| 2. useAnnexeSummary hook | Frontend | hook + types | Task 1 |
| 3. Dashboard migration | Frontend | 3 files | Task 2 |
| 4. Dashboard validation | Corpo | - | Task 3 |
| 5. BudgetAnnexeStats | Frontend | component + CSS + page | Task 2 |
| 6. FinanceAnnexeStats | Frontend | component + CSS + page | Task 2 |
| 7. Stats validation | Corpo | - | Tasks 5, 6 |
| 8. Documents/Annexes page | Frontend | page + CSS | Task 2 |
| 9. Annexes page validation | Corpo | - | Task 8 |
| 10. AnnexeContext | Frontend | provider + layout + hook | Tasks 3, 5, 6, 8 |
| 11. Mutation wiring | Frontend | 2 hooks | Task 10 |
| 12. Final validation | Corpo | - | Task 11 |
