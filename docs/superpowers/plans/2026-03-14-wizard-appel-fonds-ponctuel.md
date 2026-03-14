# Wizard Appel de Fonds Ponctuel — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-step wizard modal for creating ad-hoc fund calls (exceptional or budget complement) from the appels de fonds page.

**Architecture:** Modal wizard with 4 steps (Type, Amount, Schedule, Recap), orchestrated by a `useCreateCallWizard` hook. Each step is a standalone component. Submission calls the existing `createCall` Edge Function (1 or N times for multi-installment). Requires a DB migration to add `description` column.

**Tech Stack:** React 19, TypeScript, CSS Modules, Supabase Edge Functions, existing `createCall` API.

**Spec:** `docs/superpowers/specs/2026-03-14-wizard-appel-fonds-ponctuel-design.md`

---

## File Structure

```
src/features/finance/appels-fonds/
├── components/
│   └── CreateCallWizard/
│       ├── CreateCallWizard.tsx          # Modal shell + stepper + navigation
│       ├── CreateCallWizard.module.css   # All wizard styles
│       ├── StepType.tsx                  # Step 1: type + context
│       ├── StepAmount.tsx                # Step 2: amount + key selection
│       ├── StepSchedule.tsx              # Step 3: schedule mode + dates
│       ├── StepRecap.tsx                 # Step 4: recap + ventilation table
│       └── index.ts                     # Re-export
├── hooks/
│   └── useCreateCallWizard.ts           # Wizard state, validation, submission

supabase/migrations/
└── 20260314_call_for_funds_add_description.sql  # Migration: description column
```

**Existing files to modify:**
- `src/app/(dashboard)/finance/appels-fonds/page.tsx` — wire wizard open state
- `src/lib/finance/api.ts` — add `description` to `CreateCallPayload`
- `src/features/finance/appels-fonds/components/AppelsFondsHeader.tsx` — connect onGenerate
- `src/features/finance/appels-fonds/components/index.ts` — re-export wizard

---

## Chunk 1: DB Migration + API Update

### Task 1: Add `description` column to `call_for_funds`

**Files:**
- Create: `supabase/migrations/20260314_call_for_funds_add_description.sql`
- Modify: `src/lib/finance/api.ts`

- [ ] **Step 1: Write migration SQL**

```sql
-- 20260314_call_for_funds_add_description.sql
ALTER TABLE call_for_funds ADD COLUMN description TEXT NULL;
COMMENT ON COLUMN call_for_funds.description IS 'Optional description/motif for the fund call';
```

- [ ] **Step 2: Apply migration**

Run: `supabase db push` (or apply via Supabase dashboard)

- [ ] **Step 3: Update `CreateCallPayload` in `src/lib/finance/api.ts`**

Find the `CreateCallPayload` interface and add `description`:

```typescript
export interface CreateCallPayload {
  copro_id: string;
  period_id: string;
  repartition_key_id: string;
  label: string;
  trimester?: number;
  issue_date: string;
  due_date: string;
  total_amount: number;
  budget_id?: string;
  description?: string;  // NEW — motif/justification
}
```

- [ ] **Step 4: Update Edge Function `generate_call_for_funds`**

Add `description` to the insert payload in the Edge Function. Pass it through to the `call_for_funds` INSERT.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260314_call_for_funds_add_description.sql src/lib/finance/api.ts
git commit -m "feat(appels-fonds): add description column to call_for_funds"
```

---

## Chunk 2: Wizard Hook

### Task 2: Create `useCreateCallWizard` hook

**Files:**
- Create: `src/features/finance/appels-fonds/hooks/useCreateCallWizard.ts`

**Reference files:**
- `src/features/finance/appels-fonds/hooks/useRelance.ts` (hook pattern)
- `src/hooks/modules/useFinanceData.ts` (useCreateCall mutation)
- `src/lib/lots/api.ts` (listRepartitionKeys, listRepartitionKeyLines)

- [ ] **Step 1: Create the hook file with types and state**

```typescript
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useCreateCall } from '@/hooks/modules/useFinanceData';
import * as lotsApi from '@/lib/lots/api';
import type { RepartitionKeyWithTotals, RepartitionKeyLineDetailed } from '@/lib/lots/api';
import type { AccountingPeriod } from '@/lib/finance/api';

// ── Types ──

export type WizardStep = 1 | 2 | 3 | 4;
export type CallType = 'exceptional' | 'complement';
export type ScheduleMode = 'single' | 'multiple';
export type InstallmentCount = 2 | 3 | 4;

export interface Installment {
  dueDate: string;   // ISO date
  amount: number;
}

export interface WizardState {
  step: WizardStep;
  // Step 1
  callType: CallType | null;
  budgetId: string | null;
  label: string;
  description: string;
  // Step 2
  totalAmount: number;
  repartitionKeyId: string | null;
  // Step 3
  scheduleMode: ScheduleMode | null;
  singleDueDate: string;
  installmentCount: InstallmentCount;
  installments: Installment[];
}

export interface VentilationLine {
  lotId: string;
  lotRef: string;
  weight: number;
  sharePct: number;
  amountDue: number;
}

interface UseCreateCallWizardProps {
  selectedPeriod: AccountingPeriod | null;
  onSuccess: () => void;
  onClose: () => void;
}

// ── Helpers ──

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function defaultDueDate(): string {
  return addDays(todayISO(), 30);
}

function buildDefaultInstallments(count: InstallmentCount, total: number): Installment[] {
  const perInstallment = Math.floor((total * 100) / count) / 100;
  const result: Installment[] = [];
  let remaining = total;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast ? Math.round(remaining * 100) / 100 : perInstallment;
    result.push({
      dueDate: addDays(todayISO(), 30 * (i + 1)),
      amount,
    });
    remaining -= amount;
  }
  return result;
}

// ── Initial state ──

const INITIAL_STATE: WizardState = {
  step: 1,
  callType: null,
  budgetId: null,
  label: '',
  description: '',
  totalAmount: 0,
  repartitionKeyId: null,
  scheduleMode: null,
  singleDueDate: defaultDueDate(),
  installmentCount: 2,
  installments: buildDefaultInstallments(2, 0),
};

// ── Hook ──

export function useCreateCallWizard({ selectedPeriod, onSuccess, onClose }: UseCreateCallWizardProps) {
  const { currentCoproId } = useCopro();
  const { mutate: createCall } = useCreateCall();

  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Repartition keys (loaded once) ──
  const [keys, setKeys] = useState<RepartitionKeyWithTotals[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  useEffect(() => {
    if (!currentCoproId) return;
    setKeysLoading(true);
    lotsApi.listRepartitionKeys(currentCoproId).then(result => {
      if (result.data) setKeys(result.data);
      setKeysLoading(false);
    });
  }, [currentCoproId]);

  // ── Key lines (loaded when key changes) ──
  const [keyLines, setKeyLines] = useState<RepartitionKeyLineDetailed[]>([]);
  const [keyLinesLoading, setKeyLinesLoading] = useState(false);

  useEffect(() => {
    if (!currentCoproId || !state.repartitionKeyId) {
      setKeyLines([]);
      return;
    }
    setKeyLinesLoading(true);
    lotsApi.listRepartitionKeyLines(currentCoproId, state.repartitionKeyId).then(result => {
      if (result.data) setKeyLines(result.data);
      setKeyLinesLoading(false);
    });
  }, [currentCoproId, state.repartitionKeyId]);

  // ── Selected key ──
  const selectedKey = useMemo(
    () => keys.find(k => k.id === state.repartitionKeyId) ?? null,
    [keys, state.repartitionKeyId],
  );

  // ── Ventilation calculation ──
  const ventilation = useMemo((): VentilationLine[] => {
    if (!selectedKey || keyLines.length === 0 || state.totalAmount <= 0) return [];

    const totalWeight = keyLines.reduce((sum, l) => sum + l.weight, 0);
    if (totalWeight === 0) return [];

    const lines = keyLines.map(line => ({
      lotId: line.lot_id,
      lotRef: line.lot_ref,
      weight: line.weight,
      sharePct: line.share_pct,
      amountDue: Math.round((state.totalAmount * line.weight / totalWeight) * 100) / 100,
    }));

    // Adjust last lot for rounding delta
    const totalCalculated = lines.reduce((sum, l) => sum + l.amountDue, 0);
    const delta = Math.round((state.totalAmount - totalCalculated) * 100) / 100;
    if (lines.length > 0 && delta !== 0) {
      lines[lines.length - 1].amountDue += delta;
    }

    return lines;
  }, [selectedKey, keyLines, state.totalAmount]);

  // ── Key preview stats ──
  const keyPreview = useMemo(() => {
    if (!selectedKey || ventilation.length === 0) return null;
    const amounts = ventilation.map(v => v.amountDue);
    return {
      lotsCount: ventilation.length,
      totalWeight: selectedKey.total_weight,
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
    };
  }, [selectedKey, ventilation]);

  // ── Step updaters ──

  const updateField = useCallback(<K extends keyof WizardState>(field: K, value: WizardState[K]) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const setCallType = useCallback((type: CallType) => {
    setState(prev => ({
      ...prev,
      callType: type,
      budgetId: type === 'exceptional' ? null : prev.budgetId,
    }));
  }, []);

  const setInstallmentCount = useCallback((count: InstallmentCount) => {
    setState(prev => ({
      ...prev,
      installmentCount: count,
      installments: buildDefaultInstallments(count, prev.totalAmount),
    }));
  }, []);

  const updateInstallment = useCallback((index: number, field: keyof Installment, value: string | number) => {
    setState(prev => {
      const updated = [...prev.installments];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, installments: updated };
    });
  }, []);

  // ── Validation per step ──

  const isStep1Valid = useMemo(() => {
    if (!state.callType) return false;
    if (state.callType === 'complement' && !state.budgetId) return false;
    if (!state.label.trim()) return false;
    return true;
  }, [state.callType, state.budgetId, state.label]);

  const isStep2Valid = useMemo(() => {
    return state.totalAmount > 0 && state.repartitionKeyId !== null;
  }, [state.totalAmount, state.repartitionKeyId]);

  const isStep3Valid = useMemo(() => {
    if (!state.scheduleMode) return false;
    if (state.scheduleMode === 'single') {
      return !!state.singleDueDate;
    }
    // Multiple: sum must match + dates strictly increasing
    const sum = state.installments.reduce((s, i) => s + i.amount, 0);
    const sumMatch = Math.abs(sum - state.totalAmount) <= 0.01;
    const allDates = state.installments.every(i => !!i.dueDate);
    const datesIncreasing = state.installments.every((inst, idx) =>
      idx === 0 || inst.dueDate > state.installments[idx - 1].dueDate
    );
    return sumMatch && allDates && datesIncreasing;
  }, [state.scheduleMode, state.singleDueDate, state.installments, state.totalAmount]);

  const canNext = useMemo(() => {
    switch (state.step) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      case 4: return true;
      default: return false;
    }
  }, [state.step, isStep1Valid, isStep2Valid, isStep3Valid]);

  // ── Navigation ──

  const goNext = useCallback(() => {
    if (state.step < 4 && canNext) {
      setState(prev => ({ ...prev, step: (prev.step + 1) as WizardStep }));
    }
  }, [state.step, canNext]);

  const goPrev = useCallback(() => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: (prev.step - 1) as WizardStep }));
    }
  }, [state.step]);

  // ── Recalc installments when totalAmount changes ──

  useEffect(() => {
    if (state.scheduleMode === 'multiple') {
      setState(prev => ({
        ...prev,
        installments: buildDefaultInstallments(prev.installmentCount, prev.totalAmount),
      }));
    }
  }, [state.totalAmount, state.scheduleMode]);

  // ── Submission ──

  const submit = useCallback(async () => {
    if (!currentCoproId || !selectedPeriod || !state.repartitionKeyId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const basePayload = {
      period_id: selectedPeriod.id,
      repartition_key_id: state.repartitionKeyId,
      trimester: undefined,
      issue_date: todayISO(),
      budget_id: state.budgetId ?? undefined,
      description: state.description || undefined,
    };

    try {
      if (state.scheduleMode === 'single') {
        const result = await createCall({
          ...basePayload,
          label: state.label,
          due_date: state.singleDueDate,
          total_amount: state.totalAmount,
        });
        if (result.error) throw new Error(result.error);
      } else {
        const total = state.installments.length;
        let created = 0;

        for (const [i, inst] of state.installments.entries()) {
          const result = await createCall({
            ...basePayload,
            label: `${state.label} — ${i + 1}/${total}`,
            due_date: inst.dueDate,
            total_amount: inst.amount,
          });
          if (result.error) {
            throw new Error(
              `Erreur sur l'appel ${i + 1}/${total}: ${result.error}. ${created}/${total} appels créés.`
            );
          }
          created++;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentCoproId, selectedPeriod, state, createCall, onSuccess, onClose]);

  // ── Has data (for close confirmation) ──
  const hasData = useMemo(() => {
    return !!(state.callType || state.label || state.totalAmount > 0);
  }, [state.callType, state.label, state.totalAmount]);

  return {
    state,
    // Data
    keys,
    keysLoading,
    keyLines,
    keyLinesLoading,
    selectedKey,
    keyPreview,
    ventilation,
    // Updaters
    updateField,
    setCallType,
    setInstallmentCount,
    updateInstallment,
    // Navigation
    canNext,
    goNext,
    goPrev,
    // Submission
    submit,
    isSubmitting,
    submitError,
    // Misc
    hasData,
  };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/appels-fonds/hooks/useCreateCallWizard.ts
git commit -m "feat(appels-fonds): add useCreateCallWizard hook"
```

---

## Chunk 3: Wizard Modal Shell + Stepper

### Task 3: Create `CreateCallWizard.tsx` and CSS

**Files:**
- Create: `src/features/finance/appels-fonds/components/CreateCallWizard/CreateCallWizard.tsx`
- Create: `src/features/finance/appels-fonds/components/CreateCallWizard/CreateCallWizard.module.css`
- Create: `src/features/finance/appels-fonds/components/CreateCallWizard/index.ts`

**Reference:** `src/features/finance/appels-fonds/components/RelanceModal.tsx` (modal pattern)

- [ ] **Step 1: Create `CreateCallWizard.module.css`**

```css
/* ── Overlay ── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 150ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ── Modal ── */
.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  width: 700px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

/* ── Header ── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-light);
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

.closeBtn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: color 150ms, background 150ms;
  display: flex;
  align-items: center;
}

.closeBtn:hover {
  color: var(--text-main);
  background: var(--bg-tertiary);
}

/* ── Stepper ── */
.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-light);
}

.stepItem {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stepDot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 200ms;
}

.stepDotPending {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  border: 1px solid var(--border);
}

.stepDotActive {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.stepDotDone {
  background: rgba(52, 211, 153, 0.2);
  color: var(--success);
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.stepLabel {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-tertiary);
  transition: color 200ms;
}

.stepLabelActive {
  color: var(--text-main);
}

.stepLine {
  width: 40px;
  height: 1px;
  background: var(--border);
  margin: 0 8px;
}

.stepLineDone {
  background: var(--success);
}

/* ── Body ── */
.body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* ── Footer ── */
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

.footerRight {
  display: flex;
  gap: 8px;
}

.btnPrev {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms;
}

.btnPrev:hover {
  color: var(--text-main);
  border-color: rgba(148, 163, 184, 0.3);
}

.btnNext {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms;
}

.btnNext:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btnNext:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ── Error ── */
.errorBar {
  padding: 10px 16px;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: 13px;
  margin-bottom: 16px;
}

/* ── Shared step styles ── */
.fieldGroup {
  margin-bottom: 20px;
}

.fieldLabel {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.fieldInput {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-main);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 150ms;
}

.fieldInput:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.fieldInput::placeholder {
  color: var(--text-tertiary);
}

.fieldTextarea {
  composes: fieldInput;
  resize: vertical;
  min-height: 64px;
}

.fieldSelect {
  composes: fieldInput;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

/* ── Radio cards ── */
.radioCards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.radioCard {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 150ms;
  text-align: left;
  font-family: inherit;
}

.radioCard:hover {
  border-color: rgba(148, 163, 184, 0.3);
}

.radioCardSelected {
  border-color: var(--primary);
  background: rgba(37, 99, 235, 0.06);
}

.radioCardIcon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--primary-light);
  color: var(--secondary);
}

.radioCardSelected .radioCardIcon {
  background: var(--primary);
  color: white;
}

.radioCardTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 2px;
}

.radioCardDesc {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ── Info box ── */
.infoBox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: var(--radius-lg);
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 12px;
}

.infoBoxWarning {
  composes: infoBox;
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.2);
}

/* ── Schedule table ── */
.scheduleTable {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.scheduleTable th {
  text-align: left;
  padding: 8px 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}

.scheduleTable td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-light);
}

.scheduleTable input {
  width: 100%;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}

.scheduleTable input:focus {
  border-color: var(--primary);
}

.sumIndicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
}

.sumOk {
  background: rgba(52, 211, 153, 0.15);
  color: var(--success);
}

.sumError {
  background: rgba(248, 113, 113, 0.15);
  color: var(--danger);
}

/* ── Recap ── */
.recapCard {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 20px;
}

.recapRow {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.recapLabel {
  color: var(--text-secondary);
}

.recapValue {
  font-weight: 600;
  color: var(--text-main);
}

.ventilationTable {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

.ventilationTable th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}

.ventilationTable td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-main);
}

.ventilationTable tfoot td {
  font-weight: 700;
  border-top: 2px solid var(--border);
  border-bottom: none;
}

.ventilationScroll {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

/* ── Inline radio buttons ── */
.inlineRadios {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px;
}

.inlineRadio {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
  transition: all 150ms;
}

.inlineRadio:hover {
  color: var(--text-main);
}

.inlineRadioActive {
  background: var(--primary-light);
  color: var(--primary);
}

/* ── Confirm dialog ── */
.confirmOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 210;
}

.confirmDialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  max-width: 400px;
  text-align: center;
}

.confirmTitle {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.confirmText {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.confirmActions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
```

- [ ] **Step 2: Create `CreateCallWizard.tsx`**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import type { AccountingPeriod } from '@/lib/finance/api';
import { useCreateCallWizard } from '../../hooks/useCreateCallWizard';
import { StepType } from './StepType';
import { StepAmount } from './StepAmount';
import { StepSchedule } from './StepSchedule';
import { StepRecap } from './StepRecap';
import styles from './CreateCallWizard.module.css';

interface CreateCallWizardProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: AccountingPeriod | null;
  onSuccess: () => void;
  budgets: { id: string; label: string; total_amount: number; budget_type: string }[];
}

const STEPS = [
  { num: 1, label: 'Type' },
  { num: 2, label: 'Montant' },
  { num: 3, label: 'Échéancier' },
  { num: 4, label: 'Récap' },
] as const;

export function CreateCallWizard({ isOpen, onClose, selectedPeriod, onSuccess, budgets }: CreateCallWizardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const wizard = useCreateCallWizard({ selectedPeriod, onSuccess, onClose });

  const handleClose = useCallback(() => {
    if (wizard.hasData) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [wizard.hasData, onClose]);

  const confirmClose = useCallback(() => {
    setShowConfirm(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Nouvel appel de fonds</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((s, i) => (
            <div key={s.num} className={styles.stepItem}>
              {i > 0 && (
                <div className={clsx(
                  styles.stepLine,
                  wizard.state.step > s.num && styles.stepLineDone,
                )} />
              )}
              <div className={clsx(
                styles.stepDot,
                wizard.state.step === s.num && styles.stepDotActive,
                wizard.state.step > s.num && styles.stepDotDone,
                wizard.state.step < s.num && styles.stepDotPending,
              )}>
                {wizard.state.step > s.num ? <Check size={14} /> : s.num}
              </div>
              <span className={clsx(
                styles.stepLabel,
                wizard.state.step === s.num && styles.stepLabelActive,
              )}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {wizard.submitError && (
            <div className={styles.errorBar}>{wizard.submitError}</div>
          )}

          {wizard.state.step === 1 && (
            <StepType
              state={wizard.state}
              budgets={budgets}
              setCallType={wizard.setCallType}
              updateField={wizard.updateField}
            />
          )}

          {wizard.state.step === 2 && (
            <StepAmount
              state={wizard.state}
              keys={wizard.keys}
              keysLoading={wizard.keysLoading}
              keyPreview={wizard.keyPreview}
              updateField={wizard.updateField}
            />
          )}

          {wizard.state.step === 3 && (
            <StepSchedule
              state={wizard.state}
              updateField={wizard.updateField}
              setInstallmentCount={wizard.setInstallmentCount}
              updateInstallment={wizard.updateInstallment}
            />
          )}

          {wizard.state.step === 4 && (
            <StepRecap
              state={wizard.state}
              selectedKey={wizard.selectedKey}
              ventilation={wizard.ventilation}
              budgets={budgets}
            />
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div>
            {wizard.state.step > 1 && (
              <button className={styles.btnPrev} onClick={wizard.goPrev}>
                <ChevronLeft size={14} /> Précédent
              </button>
            )}
          </div>
          <div className={styles.footerRight}>
            {wizard.state.step < 4 ? (
              <button
                className={styles.btnNext}
                disabled={!wizard.canNext}
                onClick={wizard.goNext}
              >
                Suivant <ChevronRight size={14} />
              </button>
            ) : (
              <button
                className={styles.btnNext}
                disabled={wizard.isSubmitting}
                onClick={wizard.submit}
              >
                {wizard.isSubmitting ? 'Création...' : 'Créer en brouillon'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm close dialog */}
      {showConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Annuler la création ?</div>
            <div className={styles.confirmText}>Les données saisies seront perdues.</div>
            <div className={styles.confirmActions}>
              <button className={styles.btnPrev} onClick={() => setShowConfirm(false)}>Continuer</button>
              <button className={styles.btnNext} onClick={confirmClose}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `index.ts`**

```typescript
export { CreateCallWizard } from './CreateCallWizard';
```

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/appels-fonds/components/CreateCallWizard/
git commit -m "feat(appels-fonds): add CreateCallWizard modal shell + stepper + CSS"
```

---

## Chunk 4: Step Components

### Task 4: Create `StepType.tsx`

**Files:**
- Create: `src/features/finance/appels-fonds/components/CreateCallWizard/StepType.tsx`

- [ ] **Step 1: Create StepType**

```typescript
'use client';

import { AlertTriangle, FileText } from 'lucide-react';
import clsx from 'clsx';
import type { WizardState, CallType } from '../../hooks/useCreateCallWizard';
import styles from './CreateCallWizard.module.css';

interface StepTypeProps {
  state: WizardState;
  budgets: { id: string; label: string; total_amount: number; budget_type: string }[];
  setCallType: (type: CallType) => void;
  updateField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function StepType({ state, budgets, setCallType, updateField }: StepTypeProps) {
  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Type d'appel</label>
        <div className={styles.radioCards}>
          <button
            className={clsx(styles.radioCard, state.callType === 'exceptional' && styles.radioCardSelected)}
            onClick={() => setCallType('exceptional')}
          >
            <div className={styles.radioCardIcon}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Exceptionnel</div>
              <div className={styles.radioCardDesc}>Dépense imprévue, hors budget voté</div>
            </div>
          </button>
          <button
            className={clsx(styles.radioCard, state.callType === 'complement' && styles.radioCardSelected)}
            onClick={() => setCallType('complement')}
          >
            <div className={styles.radioCardIcon}>
              <FileText size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Complément budget</div>
              <div className={styles.radioCardDesc}>Complément sur un budget existant</div>
            </div>
          </button>
        </div>
      </div>

      {state.callType === 'complement' && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Budget rattaché</label>
          {budgets.length === 0 ? (
            <div className={styles.infoBox}>
              Aucun budget pour cet exercice. Choisissez "Exceptionnel" ou créez un budget.
            </div>
          ) : (
            <select
              className={styles.fieldSelect}
              value={state.budgetId ?? ''}
              onChange={e => updateField('budgetId', e.target.value || null)}
            >
              <option value="">Sélectionner un budget...</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>
                  {b.label} — {formatEuros(b.total_amount)} ({b.budget_type})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Libellé</label>
        <input
          className={styles.fieldInput}
          type="text"
          maxLength={100}
          placeholder="Ex: Réparation fuite toiture"
          value={state.label}
          onChange={e => updateField('label', e.target.value)}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Motif / Description (optionnel)</label>
        <textarea
          className={styles.fieldTextarea}
          rows={3}
          placeholder="Contexte ou justification de l'appel"
          value={state.description}
          onChange={e => updateField('description', e.target.value)}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/components/CreateCallWizard/StepType.tsx
git commit -m "feat(appels-fonds): add StepType component"
```

### Task 5: Create `StepAmount.tsx`

**Files:**
- Create: `src/features/finance/appels-fonds/components/CreateCallWizard/StepAmount.tsx`

- [ ] **Step 1: Create StepAmount**

```typescript
'use client';

import { Info } from 'lucide-react';
import type { WizardState } from '../../hooks/useCreateCallWizard';
import type { RepartitionKeyWithTotals } from '@/lib/lots/api';
import styles from './CreateCallWizard.module.css';

interface StepAmountProps {
  state: WizardState;
  keys: RepartitionKeyWithTotals[];
  keysLoading: boolean;
  keyPreview: { lotsCount: number; totalWeight: number; minAmount: number; maxAmount: number } | null;
  updateField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export function StepAmount({ state, keys, keysLoading, keyPreview, updateField }: StepAmountProps) {
  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Montant total (€)</label>
        <input
          className={styles.fieldInput}
          type="number"
          min={0}
          step={0.01}
          placeholder="12 500"
          value={state.totalAmount || ''}
          onChange={e => updateField('totalAmount', parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Clé de répartition</label>
        {keysLoading ? (
          <div className={styles.fieldInput} style={{ color: 'var(--text-tertiary)' }}>Chargement des clés...</div>
        ) : keys.length === 0 ? (
          <div className={styles.infoBox}>
            Aucune clé de répartition active. Créez-en une depuis les paramètres.
          </div>
        ) : (
          <select
            className={styles.fieldSelect}
            value={state.repartitionKeyId ?? ''}
            onChange={e => updateField('repartitionKeyId', e.target.value || null)}
          >
            <option value="">Sélectionner une clé...</option>
            {keys.filter(k => k.is_active).map(k => (
              <option key={k.id} value={k.id}>
                {k.name} — {k.lots_with_weight_count} lots
              </option>
            ))}
          </select>
        )}
      </div>

      {keyPreview && (
        <div className={styles.infoBox}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>{keyPreview.lotsCount} lots</strong> concernés · Total tantièmes : {keyPreview.totalWeight}
            <br />
            Montant par lot : {formatEuros(keyPreview.minAmount)} — {formatEuros(keyPreview.maxAmount)}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/components/CreateCallWizard/StepAmount.tsx
git commit -m "feat(appels-fonds): add StepAmount component"
```

### Task 6: Create `StepSchedule.tsx`

**Files:**
- Create: `src/features/finance/appels-fonds/components/CreateCallWizard/StepSchedule.tsx`

- [ ] **Step 1: Create StepSchedule**

```typescript
'use client';

import { Calendar, CalendarRange, Check, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { WizardState, ScheduleMode, InstallmentCount, Installment } from '../../hooks/useCreateCallWizard';
import styles from './CreateCallWizard.module.css';

interface StepScheduleProps {
  state: WizardState;
  updateField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
  setInstallmentCount: (count: InstallmentCount) => void;
  updateInstallment: (index: number, field: keyof Installment, value: string | number) => void;
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export function StepSchedule({ state, updateField, setInstallmentCount, updateInstallment }: StepScheduleProps) {
  const sum = state.installments.reduce((s, i) => s + i.amount, 0);
  const sumMatch = Math.abs(sum - state.totalAmount) <= 0.01;
  const datesOk = state.installments.every((inst, idx) =>
    idx === 0 || inst.dueDate > state.installments[idx - 1].dueDate
  );

  return (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Mode de paiement</label>
        <div className={styles.radioCards}>
          <button
            className={clsx(styles.radioCard, state.scheduleMode === 'single' && styles.radioCardSelected)}
            onClick={() => updateField('scheduleMode', 'single' as ScheduleMode)}
          >
            <div className={styles.radioCardIcon}>
              <Calendar size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Paiement unique</div>
              <div className={styles.radioCardDesc}>Une seule échéance</div>
            </div>
          </button>
          <button
            className={clsx(styles.radioCard, state.scheduleMode === 'multiple' && styles.radioCardSelected)}
            onClick={() => updateField('scheduleMode', 'multiple' as ScheduleMode)}
          >
            <div className={styles.radioCardIcon}>
              <CalendarRange size={18} />
            </div>
            <div>
              <div className={styles.radioCardTitle}>Échéancier multiple</div>
              <div className={styles.radioCardDesc}>Plusieurs appels étalés</div>
            </div>
          </button>
        </div>
      </div>

      {state.scheduleMode === 'single' && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Date d'échéance</label>
          <input
            className={styles.fieldInput}
            type="date"
            value={state.singleDueDate}
            onChange={e => updateField('singleDueDate', e.target.value)}
          />
        </div>
      )}

      {state.scheduleMode === 'multiple' && (
        <>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Nombre d'appels</label>
            <div className={styles.inlineRadios}>
              {([2, 3, 4] as InstallmentCount[]).map(n => (
                <button
                  key={n}
                  className={clsx(styles.inlineRadio, state.installmentCount === n && styles.inlineRadioActive)}
                  onClick={() => setInstallmentCount(n)}
                >
                  {n} appels
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Échéances</label>
            <table className={styles.scheduleTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date échéance</th>
                  <th>Montant</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {state.installments.map((inst, i) => {
                  const pct = state.totalAmount > 0
                    ? Math.round((inst.amount / state.totalAmount) * 100)
                    : 0;
                  return (
                    <tr key={i}>
                      <td>{i + 1}/{state.installments.length}</td>
                      <td>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={e => updateInstallment(i, 'dueDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={inst.amount || ''}
                          onChange={e => updateInstallment(i, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>{pct} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={clsx(styles.sumIndicator, sumMatch ? styles.sumOk : styles.sumError)}>
              {sumMatch ? <Check size={12} /> : <AlertTriangle size={12} />}
              Total : {formatEuros(sum)} / {formatEuros(state.totalAmount)}
            </div>

            {!datesOk && (
              <div className={styles.infoBoxWarning} style={{ marginTop: 8 }}>
                <AlertTriangle size={14} />
                Les dates doivent être strictement croissantes.
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/components/CreateCallWizard/StepSchedule.tsx
git commit -m "feat(appels-fonds): add StepSchedule component"
```

### Task 7: Create `StepRecap.tsx`

**Files:**
- Create: `src/features/finance/appels-fonds/components/CreateCallWizard/StepRecap.tsx`

- [ ] **Step 1: Create StepRecap**

```typescript
'use client';

import { Info } from 'lucide-react';
import type { WizardState, VentilationLine } from '../../hooks/useCreateCallWizard';
import type { RepartitionKeyWithTotals } from '@/lib/lots/api';
import styles from './CreateCallWizard.module.css';

interface StepRecapProps {
  state: WizardState;
  selectedKey: RepartitionKeyWithTotals | null;
  ventilation: VentilationLine[];
  budgets: { id: string; label: string; total_amount: number; budget_type: string }[];
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function StepRecap({ state, selectedKey, ventilation, budgets }: StepRecapProps) {
  const budgetName = state.budgetId
    ? budgets.find(b => b.id === state.budgetId)?.label ?? '—'
    : null;

  const scheduleLabel = state.scheduleMode === 'single'
    ? `Paiement unique — ${formatDate(state.singleDueDate)}`
    : `${state.installments.length} appels : ${state.installments.map(i => formatDate(i.dueDate)).join(', ')}`;

  const totalVentilation = ventilation.reduce((s, v) => s + v.amountDue, 0);

  return (
    <>
      {/* Summary card */}
      <div className={styles.recapCard}>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Type</span>
          <span className={styles.recapValue}>
            {state.callType === 'exceptional' ? 'Exceptionnel' : `Complément budget — ${budgetName}`}
          </span>
        </div>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Libellé</span>
          <span className={styles.recapValue}>{state.label}</span>
        </div>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Montant total</span>
          <span className={styles.recapValue}>{formatEuros(state.totalAmount)}</span>
        </div>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Clé de répartition</span>
          <span className={styles.recapValue}>{selectedKey?.name ?? '—'}</span>
        </div>
        <div className={styles.recapRow}>
          <span className={styles.recapLabel}>Échéancier</span>
          <span className={styles.recapValue}>{scheduleLabel}</span>
        </div>
        {state.description && (
          <div className={styles.recapRow}>
            <span className={styles.recapLabel}>Motif</span>
            <span className={styles.recapValue} style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
              {state.description}
            </span>
          </div>
        )}
      </div>

      {/* Ventilation table */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Ventilation par lot</label>
        <div className={styles.ventilationScroll}>
          <table className={styles.ventilationTable}>
            <thead>
              <tr>
                <th>Lot</th>
                <th>Tantièmes</th>
                <th>Quote-part</th>
                <th style={{ textAlign: 'right' }}>Montant dû</th>
              </tr>
            </thead>
            <tbody>
              {ventilation.map(v => (
                <tr key={v.lotId}>
                  <td>{v.lotRef}</td>
                  <td>{v.weight} / {selectedKey?.total_weight ?? 0}</td>
                  <td>{v.sharePct.toFixed(2)} %</td>
                  <td style={{ textAlign: 'right' }}>{formatEuros(v.amountDue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total</td>
                <td style={{ textAlign: 'right' }}>{formatEuros(totalVentilation)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Multi-installment warning */}
      {state.scheduleMode === 'multiple' && (
        <div className={styles.infoBox}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>{state.installments.length} appels en brouillon</strong> seront créés.
            Vous pourrez les émettre individuellement depuis la page détail.
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/components/CreateCallWizard/StepRecap.tsx
git commit -m "feat(appels-fonds): add StepRecap component"
```

---

## Chunk 5: Wire Wizard Into Page

### Task 8: Connect wizard to appels de fonds page

**Files:**
- Modify: `src/app/(dashboard)/finance/appels-fonds/page.tsx`
- Modify: `src/features/finance/appels-fonds/components/AppelsFondsHeader.tsx`
- Modify: `src/features/finance/appels-fonds/components/index.ts`

- [ ] **Step 1: Export wizard from components index**

In `src/features/finance/appels-fonds/components/index.ts`, add:

```typescript
export { CreateCallWizard } from './CreateCallWizard';
```

- [ ] **Step 2: Add wizard state to page**

In `src/app/(dashboard)/finance/appels-fonds/page.tsx`:

1. Import `CreateCallWizard` and add state:
```typescript
import { CreateCallWizard } from '@/features/finance/appels-fonds/components';
import { useState } from 'react';
```

2. Inside the component, add:
```typescript
const [wizardOpen, setWizardOpen] = useState(false);
```

3. Replace `onGenerate={() => {/* TODO */}}` with:
```typescript
onGenerate={() => setWizardOpen(true)}
```

4. Add wizard component before closing `</div>`:
```typescript
<CreateCallWizard
  isOpen={wizardOpen}
  onClose={() => setWizardOpen(false)}
  selectedPeriod={selectedPeriod}
  onSuccess={() => {/* React Query invalidation handled by useCreateCall */}}
  budgets={[]}  // TODO: wire budgets from useAppelsFondsPage or dedicated query
/>
```

- [ ] **Step 3: Disable button when no period selected**

In `AppelsFondsHeader.tsx`, add `disabled` prop to the "Générer les appels" button when no period is selected:

```typescript
<button
  className={styles.btnPrimary}
  onClick={onGenerate}
  disabled={!selectedPeriod}
>
```

- [ ] **Step 4: Verify the app compiles**

Run: `npx next build 2>&1 | tail -20` or `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/finance/appels-fonds/page.tsx src/features/finance/appels-fonds/components/index.ts src/features/finance/appels-fonds/components/AppelsFondsHeader.tsx
git commit -m "feat(appels-fonds): wire CreateCallWizard to page"
```

### Task 9: Wire budgets data

**Files:**
- Modify: `src/features/finance/appels-fonds/hooks/useAppelsFondsPage.ts`
- Modify: `src/app/(dashboard)/finance/appels-fonds/page.tsx`

- [ ] **Step 1: Expose budgets from useAppelsFondsPage**

Check if `useAppelsFondsPage` already loads budgets. If not, add a query to `listBudgets(coproId, periodId)` and return the budgets array from the hook. Map them to `{ id, label, total_amount, budget_type }`.

- [ ] **Step 2: Pass budgets to wizard**

In `page.tsx`, destructure `budgets` from `useAppelsFondsPage()` and pass to `<CreateCallWizard budgets={budgets} />`.

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/appels-fonds/hooks/useAppelsFondsPage.ts src/app/(dashboard)/finance/appels-fonds/page.tsx
git commit -m "feat(appels-fonds): pass budgets data to wizard"
```

---

## Chunk 6: Manual Test & Polish

### Task 10: Manual testing checklist

- [ ] Open the appels de fonds page
- [ ] Click "Générer les appels" — wizard modal opens
- [ ] Step 1: Select "Exceptionnel", type a label → Suivant enabled
- [ ] Step 1: Select "Complément budget" → budget dropdown appears
- [ ] Step 2: Enter amount, select key → preview shows lots count + min/max
- [ ] Step 3: Select "Paiement unique" → date picker shows
- [ ] Step 3: Select "Échéancier multiple" → count selector + table shows
- [ ] Step 3: Adjust amounts → sum indicator updates (green/red)
- [ ] Step 4: Recap shows all info + ventilation table
- [ ] Step 4: Click "Créer en brouillon" → call created, modal closes, page refreshes
- [ ] Test multi-installment → N calls created with suffixed labels
- [ ] Test close confirmation when data entered
- [ ] Test with no repartition keys → info message shown

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat(appels-fonds): complete CreateCallWizard implementation"
```
