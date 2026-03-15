# Échéancier prestataire — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un échéancier de paiement prestataire (acomptes) aux budgets travaux, avec templates, retenue de garantie, et lien documents/OS.

**Architecture:** Migration Supabase (table + colonne) → API layer (CRUD payment schedules) → Constants (templates) → Hook (mutations + queries) → UI (CreateBudgetModal section échéancier + TravauxDetailModal 3 onglets refondus).

**Tech Stack:** Supabase (PostgreSQL), Next.js 16, React 19, TypeScript 5, CSS Modules

**Spec:** `docs/superpowers/specs/2026-03-15-echeancier-prestataire-design.md`

---

## Fichiers à créer/modifier

| Action | Fichier | Responsabilité |
|--------|---------|---------------|
| Create | `supabase/migrations/20260315_budget_payment_schedules.sql` | Table + enum + RLS + trigger + colonne documents.budget_id |
| Create | `src/lib/constants/payment-schedule-templates.ts` | Templates d'échéancier + type TS |
| Create | `src/lib/budget/payment-schedules.api.ts` | CRUD Supabase pour budget_payment_schedules |
| Modify | `src/components/features/finance/Budget/types.ts` | Nouveaux types PaymentPhase, PaymentScheduleConfig |
| Create | `src/hooks/modules/usePaymentSchedule.ts` | Hook queries + mutations échéancier |
| Modify | `src/hooks/modules/useBudget.ts` | Appeler création échéancier après createBudget |
| Create | `src/components/features/finance/Budget/PaymentSchedulePreview.tsx` | Tableau aperçu dans CreateBudgetModal |
| Create | `src/components/features/finance/Budget/PaymentSchedulePreview.module.css` | Styles aperçu |
| Modify | `src/components/features/finance/Budget/modals/CreateBudgetModal.tsx` | Section échéancier dans le form travaux |
| Modify | `src/components/features/finance/Budget/modals/TravauxDetailModal.tsx` | 3 onglets (Échéancier/Documents/Historique) |
| Modify | `src/components/features/finance/Budget/modals/TravauxDetailModal.module.css` | Styles tableau échéancier + docs |

---

## Task 1 : Migration Supabase

**Files:**
- Create: `supabase/migrations/20260315_budget_payment_schedules.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- =============================================================================
-- Budget Payment Schedules — Échéancier prestataire
-- =============================================================================

-- 1. Enum status
DO $$ BEGIN
  CREATE TYPE payment_phase_status AS ENUM ('pending', 'awaiting_invoice', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table
CREATE TABLE IF NOT EXISTS budget_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  label TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  status payment_phase_status NOT NULL DEFAULT 'pending',
  paid_date DATE,
  invoice_ref TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  is_retention BOOLEAN NOT NULL DEFAULT false,
  retention_release_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_budget_phase UNIQUE (budget_id, phase_number)
);

-- 3. Indexes
CREATE INDEX idx_budget_payment_schedules_budget ON budget_payment_schedules(budget_id);
CREATE INDEX idx_budget_payment_schedules_copro ON budget_payment_schedules(copro_id);

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION update_budget_payment_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_budget_payment_schedules_updated_at
  BEFORE UPDATE ON budget_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION update_budget_payment_schedules_updated_at();

-- 5. RLS
ALTER TABLE budget_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedules_select" ON budget_payment_schedules
  FOR SELECT USING (
    copro_id IN (
      SELECT copro_id FROM memberships
      WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
    )
  );

CREATE POLICY "payment_schedules_insert" ON budget_payment_schedules
  FOR INSERT WITH CHECK (
    copro_id IN (
      SELECT copro_id FROM memberships
      WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
        AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "payment_schedules_update" ON budget_payment_schedules
  FOR UPDATE USING (
    copro_id IN (
      SELECT copro_id FROM memberships
      WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
        AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "payment_schedules_delete" ON budget_payment_schedules
  FOR DELETE USING (
    copro_id IN (
      SELECT copro_id FROM memberships
      WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
        AND role IN ('manager', 'admin')
    )
  );

-- 6. Ajout budget_id sur documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_budget ON documents(budget_id);
```

- [ ] **Step 2: Appliquer la migration via Supabase MCP**

Run: `mcp__claude_ai_Supabase__apply_migration` avec le SQL ci-dessus.

- [ ] **Step 3: Vérifier la table créée**

Run: `mcp__claude_ai_Supabase__execute_sql` :
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'budget_payment_schedules' ORDER BY ordinal_position;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260315_budget_payment_schedules.sql
git commit -m "feat(db): add budget_payment_schedules table + documents.budget_id"
```

---

## Task 2 : Constantes templates (frontend)

**Files:**
- Create: `src/lib/constants/payment-schedule-templates.ts`

- [ ] **Step 1: Créer le fichier constantes**

```typescript
/**
 * Templates d'échéancier de paiement prestataire
 * pour les budgets travaux en copropriété.
 */

export type PaymentScheduleTemplate =
  | 'unique'
  | 'fifty_fifty'
  | 'classic'
  | 'quarterly'
  | 'custom';

export interface SchedulePhaseTemplate {
  label: string;
  percentage: number;
}

export interface ScheduleTemplateConfig {
  id: PaymentScheduleTemplate;
  label: string;
  description: string;
  phases: SchedulePhaseTemplate[];
}

export const PAYMENT_SCHEDULE_TEMPLATES: ScheduleTemplateConfig[] = [
  {
    id: 'unique',
    label: 'Paiement unique',
    description: '100% à la réception',
    phases: [
      { label: 'Paiement intégral', percentage: 100 },
    ],
  },
  {
    id: 'fifty_fifty',
    label: 'Deux versements',
    description: '50% / 50%',
    phases: [
      { label: 'Acompte à la commande', percentage: 50 },
      { label: 'Solde à la réception', percentage: 50 },
    ],
  },
  {
    id: 'classic',
    label: 'Classique 4 phases',
    description: '30% / 30% / 30% / 10%',
    phases: [
      { label: 'Signature du contrat', percentage: 30 },
      { label: 'Démarrage des travaux', percentage: 30 },
      { label: 'Avancement mi-parcours', percentage: 30 },
      { label: 'Solde à la réception', percentage: 10 },
    ],
  },
  {
    id: 'quarterly',
    label: 'Quarts égaux',
    description: '25% / 25% / 25% / 25%',
    phases: [
      { label: 'Signature du contrat', percentage: 25 },
      { label: 'Démarrage des travaux', percentage: 25 },
      { label: 'Avancement mi-parcours', percentage: 25 },
      { label: 'Solde à la réception', percentage: 25 },
    ],
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    description: 'Définir librement les phases',
    phases: [],
  },
];

export const RETENTION_PERCENTAGE = 5;
export const RETENTION_DURATION_MONTHS = 12;

/**
 * Applique la retenue de garantie : réduit la dernière phase de 5pp
 * et ajoute une phase retenue.
 */
export function applyRetention(phases: SchedulePhaseTemplate[]): SchedulePhaseTemplate[] {
  if (phases.length === 0) return phases;

  const result = phases.map((p, i) => {
    if (i === phases.length - 1) {
      return { ...p, percentage: p.percentage - RETENTION_PERCENTAGE };
    }
    return { ...p };
  });

  result.push({
    label: 'Retenue de garantie',
    percentage: RETENTION_PERCENTAGE,
  });

  return result;
}

/**
 * Calcule les montants à partir des % et du total.
 */
export function computeAmounts(
  phases: SchedulePhaseTemplate[],
  totalAmount: number
): { label: string; percentage: number; amount: number }[] {
  return phases.map((p) => ({
    label: p.label,
    percentage: p.percentage,
    amount: Math.round((p.percentage / 100) * totalAmount * 100) / 100,
  }));
}

export function getTemplateById(id: PaymentScheduleTemplate): ScheduleTemplateConfig | undefined {
  return PAYMENT_SCHEDULE_TEMPLATES.find((t) => t.id === id);
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `npx tsc --noEmit 2>&1 | grep payment-schedule`
Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants/payment-schedule-templates.ts
git commit -m "feat(constants): add payment schedule templates + retention logic"
```

---

## Task 3 : API layer payment schedules

**Files:**
- Create: `src/lib/budget/payment-schedules.api.ts`

- [ ] **Step 1: Créer l'API CRUD**

```typescript
/**
 * API Supabase pour budget_payment_schedules
 * Pattern : views pour lecture, tables directes pour écriture
 */
import { createClient } from '@/lib/supabase/client';

const createUntypedClient = () => createClient() as any;

// ---------- Types DB ----------

export interface PaymentScheduleRow {
  id: string;
  copro_id: string;
  budget_id: string;
  phase_number: number;
  label: string;
  percentage: number;
  amount: number;
  due_date: string | null;
  status: 'pending' | 'awaiting_invoice' | 'paid';
  paid_date: string | null;
  invoice_ref: string | null;
  document_id: string | null;
  service_order_id: string | null;
  is_retention: boolean;
  retention_release_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePhaseInput {
  copro_id: string;
  budget_id: string;
  phase_number: number;
  label: string;
  percentage: number;
  amount: number;
  due_date?: string;
  is_retention?: boolean;
  retention_release_date?: string;
}

// ---------- Queries ----------

export async function listPaymentSchedules(budgetId: string): Promise<PaymentScheduleRow[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('budget_payment_schedules')
    .select('*')
    .eq('budget_id', budgetId)
    .order('phase_number', { ascending: true });

  if (error) throw new Error(`Failed to list payment schedules: ${error.message}`);
  return (data || []) as PaymentScheduleRow[];
}

// ---------- Mutations ----------

export async function createPaymentPhases(phases: CreatePhaseInput[]): Promise<string[]> {
  if (phases.length === 0) return [];
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('budget_payment_schedules')
    .insert(phases)
    .select('id');

  if (error) throw new Error(`Failed to create payment phases: ${error.message}`);
  return (data || []).map((d: { id: string }) => d.id);
}

export async function updatePaymentPhase(
  phaseId: string,
  updates: Partial<Pick<PaymentScheduleRow,
    'label' | 'percentage' | 'amount' | 'due_date' | 'status' |
    'paid_date' | 'invoice_ref' | 'document_id' | 'service_order_id' |
    'notes' | 'retention_release_date'
  >>
): Promise<boolean> {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('budget_payment_schedules')
    .update(updates)
    .eq('id', phaseId);

  if (error) throw new Error(`Failed to update payment phase: ${error.message}`);
  return true;
}

export async function deletePaymentPhase(phaseId: string): Promise<boolean> {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('budget_payment_schedules')
    .delete()
    .eq('id', phaseId);

  if (error) throw new Error(`Failed to delete payment phase: ${error.message}`);
  return true;
}

export async function deleteAllPhasesForBudget(budgetId: string): Promise<boolean> {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('budget_payment_schedules')
    .delete()
    .eq('budget_id', budgetId);

  if (error) throw new Error(`Failed to delete all phases: ${error.message}`);
  return true;
}

export async function markPhasePaid(
  phaseId: string,
  paidDate: string,
  invoiceRef?: string,
  documentId?: string
): Promise<boolean> {
  return updatePaymentPhase(phaseId, {
    status: 'paid',
    paid_date: paidDate,
    invoice_ref: invoiceRef || null,
    document_id: documentId || null,
  });
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `npx tsc --noEmit 2>&1 | grep payment-schedules`
Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add src/lib/budget/payment-schedules.api.ts
git commit -m "feat(api): add CRUD for budget_payment_schedules"
```

---

## Task 4 : Types frontend

**Files:**
- Modify: `src/components/features/finance/Budget/types.ts`

- [ ] **Step 1: Ajouter les types PaymentPhase et PaymentScheduleConfig**

Ajouter en fin de fichier (avant les utilitaires existants) :

```typescript
// =============================================
// Types pour l'échéancier de paiement prestataire
// =============================================

export type PaymentPhaseStatus = 'pending' | 'awaiting_invoice' | 'paid';

export interface PaymentPhase {
  id: string;
  budgetId: string;
  phaseNumber: number;
  label: string;
  percentage: number;
  amount: number;
  dueDate?: string;
  status: PaymentPhaseStatus;
  paidDate?: string;
  invoiceRef?: string;
  documentId?: string;
  serviceOrderId?: string;
  isRetention: boolean;
  retentionReleaseDate?: string;
  notes?: string;
}

export interface PaymentScheduleConfig {
  templateId: string;
  withRetention: boolean;
  phases: {
    label: string;
    percentage: number;
    dueDate?: string;
  }[];
}
```

- [ ] **Step 2: Ajouter le champ `paymentScheduleConfig` à `NouveauBudgetForm`**

Dans l'interface `NouveauBudgetForm`, ajouter :

```typescript
  paymentScheduleConfig?: PaymentScheduleConfig;
```

- [ ] **Step 3: Vérifier compilation**

Run: `npx tsc --noEmit 2>&1 | grep "types.ts"`
Expected: aucune erreur

- [ ] **Step 4: Commit**

```bash
git add src/components/features/finance/Budget/types.ts
git commit -m "feat(types): add PaymentPhase + PaymentScheduleConfig types"
```

---

## Task 5 : Hook usePaymentSchedule

**Files:**
- Create: `src/hooks/modules/usePaymentSchedule.ts`

- [ ] **Step 1: Créer le hook**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as scheduleApi from '@/lib/budget/payment-schedules.api';
import type { PaymentScheduleRow } from '@/lib/budget/payment-schedules.api';
import type { PaymentPhase } from '@/components/features/finance/Budget/types';

function mapRowToPhase(row: PaymentScheduleRow): PaymentPhase {
  return {
    id: row.id,
    budgetId: row.budget_id,
    phaseNumber: row.phase_number,
    label: row.label,
    percentage: row.percentage,
    amount: row.amount,
    dueDate: row.due_date || undefined,
    status: row.status,
    paidDate: row.paid_date || undefined,
    invoiceRef: row.invoice_ref || undefined,
    documentId: row.document_id || undefined,
    serviceOrderId: row.service_order_id || undefined,
    isRetention: row.is_retention,
    retentionReleaseDate: row.retention_release_date || undefined,
    notes: row.notes || undefined,
  };
}

export function usePaymentSchedule(budgetId: string | null) {
  const { currentCoproId } = useCopro();
  const [phases, setPhases] = useState<PaymentPhase[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPhases = useCallback(async () => {
    if (!budgetId) return;
    setIsLoading(true);
    try {
      const rows = await scheduleApi.listPaymentSchedules(budgetId);
      setPhases(rows.map(mapRowToPhase));
    } catch (err) {
      console.warn('Erreur chargement échéancier:', err);
    } finally {
      setIsLoading(false);
    }
  }, [budgetId]);

  const createSchedule = useCallback(async (
    targetBudgetId: string,
    config: { label: string; percentage: number; amount: number; dueDate?: string; isRetention?: boolean; retentionReleaseDate?: string }[]
  ): Promise<boolean> => {
    if (!currentCoproId) return false;
    try {
      const inputs = config.map((phase, i) => ({
        copro_id: currentCoproId,
        budget_id: targetBudgetId,
        phase_number: i + 1,
        label: phase.label,
        percentage: phase.percentage,
        amount: phase.amount,
        due_date: phase.dueDate,
        is_retention: phase.isRetention || false,
        retention_release_date: phase.retentionReleaseDate,
      }));
      await scheduleApi.createPaymentPhases(inputs);
      await loadPhases();
      return true;
    } catch (err) {
      console.warn('Erreur création échéancier:', err);
      return false;
    }
  }, [currentCoproId, loadPhases]);

  const markPaid = useCallback(async (
    phaseId: string,
    paidDate: string,
    invoiceRef?: string,
    documentId?: string
  ): Promise<boolean> => {
    try {
      await scheduleApi.markPhasePaid(phaseId, paidDate, invoiceRef, documentId);
      await loadPhases();
      return true;
    } catch (err) {
      console.warn('Erreur marquage payé:', err);
      return false;
    }
  }, [loadPhases]);

  const updatePhase = useCallback(async (
    phaseId: string,
    updates: Parameters<typeof scheduleApi.updatePaymentPhase>[1]
  ): Promise<boolean> => {
    try {
      await scheduleApi.updatePaymentPhase(phaseId, updates);
      await loadPhases();
      return true;
    } catch (err) {
      console.warn('Erreur mise à jour phase:', err);
      return false;
    }
  }, [loadPhases]);

  const totalPaid = phases
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalAmount = phases.reduce((sum, p) => sum + p.amount, 0);

  return {
    phases,
    isLoading,
    totalPaid,
    totalAmount,
    remaining: totalAmount - totalPaid,
    loadPhases,
    createSchedule,
    markPaid,
    updatePhase,
  };
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `npx tsc --noEmit 2>&1 | grep usePaymentSchedule`
Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add src/hooks/modules/usePaymentSchedule.ts
git commit -m "feat(hook): add usePaymentSchedule for CRUD payment phases"
```

---

## Task 6 : Composant PaymentSchedulePreview

**Files:**
- Create: `src/components/features/finance/Budget/PaymentSchedulePreview.tsx`
- Create: `src/components/features/finance/Budget/PaymentSchedulePreview.module.css`

- [ ] **Step 1: Créer le CSS module**

Dark theme Qonto, tableau compact (design option B validé) :

```css
/* Voir fichier complet — reprend le design validé en brainstorm */
.container { /* wrapper */ }
.header { /* titre + template selector */ }
.table { /* grille 6 colonnes */ }
.tableHeader { /* en-tête gris */ }
.row { /* ligne phase */ }
.rowRetention { /* fond orange subtil */ }
.phaseNum { /* numéro coloré */ }
.inputInline { /* input éditable inline */ }
.summary { /* résumé payé/reste/total */ }
.progressBar { /* barre de progression */ }
```

Le CSS reprend les tokens du dark theme : `#161822`, `#1a1d2e`, `rgba(148,163,184,0.08)`, etc.

- [ ] **Step 2: Créer le composant**

Le composant `PaymentSchedulePreview` :
- Reçoit `totalAmount`, `templateId`, `withRetention`, `onPhasesChange`
- Affiche le tableau compact avec phases éditables (label, date)
- % éditable uniquement si template = 'custom'
- Montants calculés automatiquement
- Retenue de garantie affichée avec icône cadenas et fond orange
- Barre résumé en bas

- [ ] **Step 3: Vérifier compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur sur les nouveaux fichiers

- [ ] **Step 4: Commit**

```bash
git add src/components/features/finance/Budget/PaymentSchedulePreview.tsx
git add src/components/features/finance/Budget/PaymentSchedulePreview.module.css
git commit -m "feat(ui): add PaymentSchedulePreview component (compact table)"
```

---

## Task 7 : Intégration CreateBudgetModal

**Files:**
- Modify: `src/components/features/finance/Budget/modals/CreateBudgetModal.tsx`

- [ ] **Step 1: Ajouter les imports et état**

Imports :
```typescript
import { PAYMENT_SCHEDULE_TEMPLATES, applyRetention, computeAmounts } from '@/lib/constants/payment-schedule-templates';
import type { PaymentScheduleTemplate } from '@/lib/constants/payment-schedule-templates';
import { PaymentSchedulePreview } from '../PaymentSchedulePreview';
import type { PaymentScheduleConfig } from '../types';
```

Nouveaux states :
```typescript
const [scheduleTemplate, setScheduleTemplate] = useState<PaymentScheduleTemplate>('classic');
const [withRetention, setWithRetention] = useState(false);
const [customPhases, setCustomPhases] = useState<{label:string;percentage:number;dueDate?:string}[]>([]);
```

- [ ] **Step 2: Ajouter la section échéancier dans le JSX travaux**

Après la section "Devis (optionnel)", ajouter :
- Dropdown template (5 options)
- Checkbox retenue de garantie 5%
- `<PaymentSchedulePreview>` avec les phases calculées

- [ ] **Step 3: Modifier `handleSubmitTravaux`**

Ajouter `paymentScheduleConfig` au form soumis :
```typescript
const form: NouveauBudgetForm = {
  // ... champs existants ...
  paymentScheduleConfig: {
    templateId: scheduleTemplate,
    withRetention,
    phases: computedPhases.map(p => ({
      label: p.label,
      percentage: p.percentage,
      dueDate: p.dueDate,
    })),
  },
};
```

- [ ] **Step 4: Vérifier compilation + test visuel**

Run: `npx tsc --noEmit`
Ouvrir http://localhost:3000 → Finance → Budgets → Créer → Travaux → vérifier la section échéancier

- [ ] **Step 5: Commit**

```bash
git add src/components/features/finance/Budget/modals/CreateBudgetModal.tsx
git commit -m "feat(ui): add payment schedule section in CreateBudgetModal"
```

---

## Task 8 : Création échéancier après budget (useBudget)

**Files:**
- Modify: `src/hooks/modules/useBudget.ts`

- [ ] **Step 1: Importer l'API et les utilitaires**

```typescript
import * as scheduleApi from '@/lib/budget/payment-schedules.api';
import { computeAmounts, applyRetention, RETENTION_PERCENTAGE, RETENTION_DURATION_MONTHS } from '@/lib/constants/payment-schedule-templates';
```

- [ ] **Step 2: Ajouter la création échéancier dans handleCreateBudget**

Après l'étape d'upload des devis (step 3 actuel), avant le refresh :

```typescript
// 4. Create payment schedule if configured
if (form.paymentScheduleConfig && form.paymentScheduleConfig.phases.length > 0) {
  try {
    let phases = form.paymentScheduleConfig.phases.map(p => ({
      label: p.label,
      percentage: p.percentage,
    }));

    if (form.paymentScheduleConfig.withRetention) {
      phases = applyRetention(phases);
    }

    const phasesWithAmounts = computeAmounts(phases, form.montantTotal);

    // Compute retention release date (last non-retention due_date + 12 months)
    const lastDueDate = form.paymentScheduleConfig.phases
      .filter(p => p.dueDate)
      .map(p => p.dueDate!)
      .sort()
      .pop();

    const inputs = phasesWithAmounts.map((p, i) => {
      const isRetention = p.label === 'Retenue de garantie';
      let retentionReleaseDate: string | undefined;
      if (isRetention && lastDueDate) {
        const d = new Date(lastDueDate);
        d.setMonth(d.getMonth() + RETENTION_DURATION_MONTHS);
        retentionReleaseDate = d.toISOString().split('T')[0];
      }
      return {
        copro_id: currentCoproId,
        budget_id: id,
        phase_number: i + 1,
        label: p.label,
        percentage: p.percentage,
        amount: p.amount,
        due_date: form.paymentScheduleConfig!.phases[i]?.dueDate,
        is_retention: isRetention,
        retention_release_date: retentionReleaseDate,
      };
    });

    await scheduleApi.createPaymentPhases(inputs);
  } catch (schedErr) {
    console.warn('Erreur création échéancier:', schedErr);
  }
}
```

- [ ] **Step 3: Modifier l'upload devis pour ajouter budget_id**

Dans la boucle d'upload devis, ajouter `tags: ['budget-travaux', id]` → déjà fait. Mais il faut aussi setter `budget_id` sur le document. Modifier l'appel `uploadDocument` pour passer le budget_id (nécessite une mise à jour post-upload) :

```typescript
const doc = await uploadDocument(devis.file, currentCoproId, 'devis', {
  sourceModule: 'finance',
  title: devis.nom,
  description: `Devis ${devis.montant.toLocaleString('fr-FR')} € — ${form.nom || 'Budget travaux'}`,
  year: form.annee,
  tags: ['budget-travaux', id],
});
// Set budget_id on the uploaded document
if (doc?.id) {
  const supabase = createUntypedClient();
  await supabase.from('documents').update({ budget_id: id }).eq('id', doc.id);
}
```

- [ ] **Step 4: Vérifier compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/modules/useBudget.ts
git commit -m "feat(hook): create payment schedule + link devis to budget on creation"
```

---

## Task 9 : Refonte TravauxDetailModal (3 onglets)

**Files:**
- Modify: `src/components/features/finance/Budget/modals/TravauxDetailModal.tsx`
- Modify: `src/components/features/finance/Budget/modals/TravauxDetailModal.module.css`

- [ ] **Step 1: Mettre à jour le type DetailTab**

```typescript
type DetailTab = 'echeancier' | 'documents' | 'historique';
```

Note : impacte aussi le parent qui passe `activeTab`. Mettre à jour le type dans `BudgetsModals.tsx` et le state initial.

- [ ] **Step 2: Ajouter les imports**

```typescript
import { usePaymentSchedule } from '@/hooks/modules/usePaymentSchedule';
import { useEffect } from 'react';
```

- [ ] **Step 3: Ajouter le hook dans le composant**

```typescript
const {
  phases, isLoading, totalPaid, totalAmount, remaining,
  loadPhases, markPaid, updatePhase,
} = usePaymentSchedule(travaux.id);

useEffect(() => { loadPhases(); }, [loadPhases]);
```

- [ ] **Step 4: Remplacer les onglets**

3 onglets : Échéancier, Documents, Historique. Supprimer Prestataires et Étapes.

- [ ] **Step 5: Implémenter l'onglet Échéancier**

Tableau compact (design validé option B) avec :
- Grille 7 colonnes (#, Phase, %, Montant, Date, Statut, Actions)
- Ligne retenue avec fond orange
- Résumé Payé / Reste / Total + barre progression
- Action "Marquer payé" par phase

- [ ] **Step 6: Implémenter l'onglet Documents**

Query documents liés au budget via `budget_id` :
```typescript
const [budgetDocs, setBudgetDocs] = useState<Document[]>([]);
// Charger via: supabase.from('documents').select('*').eq('budget_id', travaux.id)
```

Affichage en cards (même design que l'onglet Documents actuel).

- [ ] **Step 7: Implémenter l'onglet Historique**

Construit à la volée depuis :
- `budgets.created_at` → événement "Budget créé"
- Phases avec `status === 'paid'` → événements "Acompte N payé"
- Documents → événements "Document ajouté"

Trié par date décroissante, même timeline que le design existant.

- [ ] **Step 8: Ajouter les styles CSS manquants**

Dans `TravauxDetailModal.module.css`, ajouter :
- `.scheduleTable`, `.scheduleRow`, `.scheduleHeader` (grille compact)
- `.rowRetention` (fond orange)
- `.summaryBar` (payé/reste/total)
- `.progressTrack`, `.progressFill` (barre)
- `.actionBtn`, `.actionMenu` (dropdown actions)

- [ ] **Step 9: Mettre à jour le parent (BudgetsModals + useBudget)**

Dans `BudgetsModals.tsx` et `useBudget.ts`, changer le type `DetailTab` pour correspondre aux 3 nouveaux onglets. Valeur par défaut : `'echeancier'`.

- [ ] **Step 10: Vérifier compilation + test visuel**

Run: `npx tsc --noEmit`
Ouvrir http://localhost:3000 → Finance → Budgets → cliquer sur un budget travaux → vérifier les 3 onglets

- [ ] **Step 11: Commit**

```bash
git add src/components/features/finance/Budget/modals/TravauxDetailModal.tsx
git add src/components/features/finance/Budget/modals/TravauxDetailModal.module.css
git add src/features/finance/budgets/list/components/BudgetsModals.tsx
git add src/hooks/modules/useBudget.ts
git commit -m "feat(ui): refonte TravauxDetailModal — 3 onglets (échéancier/docs/historique)"
```

---

## Task 10 : Test E2E manuel + fix

- [ ] **Step 1: Créer un budget travaux avec échéancier**

1. Finance → Budgets → Créer → Travaux
2. Remplir : nom, montant 100 000 €, template "Classique 4 phases", cocher retenue
3. Vérifier l'aperçu (5 lignes : 30/30/30/5/5)
4. Ajouter un devis PDF
5. Créer

- [ ] **Step 2: Vérifier la modale détail**

1. Cliquer sur le budget créé
2. Onglet Échéancier : 5 phases affichées, statut "À venir", résumé 0/100 000 €
3. Onglet Documents : le devis PDF uploadé apparaît
4. Onglet Historique : "Budget créé le ..."

- [ ] **Step 3: Tester le marquage payé**

1. Phase 1 → Actions → Marquer payé
2. Vérifier : statut passe à "Payé", résumé mis à jour (30 000 / 100 000 €)

- [ ] **Step 4: Vérifier en DB**

```sql
SELECT phase_number, label, percentage, amount, status
FROM budget_payment_schedules
WHERE budget_id = '<id>'
ORDER BY phase_number;
```

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(budget-travaux): échéancier prestataire complet (templates + retenue + 3 onglets)"
```
