# AG Decision Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automate entity creation (budgets, call for funds, contracts, council members) from adopted AG resolutions, with draft at closure and activation at PV send.

**Architecture:** New `action_type` field on resolutions maps to automated actions. `ag_pending_actions` table tracks the two-step flow (pending -> activated). Bureau stores copro_ids for full contact info. Step 8 validates completeness before closure.

**Tech Stack:** Supabase (PostgreSQL functions, migrations), Next.js/React, CSS Modules, TypeScript

---

## Workstream A: Database & Backend (Agent 1)

### Task A1: Migration — action_type on ag_resolutions

**Files:**
- Create: Supabase migration via `apply_migration`

**Step 1: Apply migration**

```sql
ALTER TABLE ag_resolutions ADD COLUMN IF NOT EXISTS action_type TEXT;

COMMENT ON COLUMN ag_resolutions.action_type IS 'Automated action triggered when resolution is adopted. Values: APPROVE_ACCOUNTS, CREATE_BUDGET, SCHEDULE_BUDGET_PAYMENTS, CREATE_ALUR_FUND, SCHEDULE_ALUR_PAYMENTS, CREATE_WORK_BUDGET, CREATE_EXCEPTIONAL_CALL, APPOINT_SYNDIC, ELECT_COUNCIL, MANAGE_CONTRACT, DESIGNATE_BUREAU, GRANT_QUITUS';
```

**Step 2: Verify column exists**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'ag_resolutions' AND column_name = 'action_type';
```

---

### Task A2: Migration — copro_id columns on ag_meetings

**Step 1: Apply migration**

```sql
ALTER TABLE ag_meetings ADD COLUMN IF NOT EXISTS president_copro_id UUID REFERENCES coproprietaires(id);
ALTER TABLE ag_meetings ADD COLUMN IF NOT EXISTS secretary_copro_id UUID REFERENCES coproprietaires(id);
ALTER TABLE ag_meetings ADD COLUMN IF NOT EXISTS scrutineer1_copro_id UUID REFERENCES coproprietaires(id);
```

**Step 2: Verify columns exist**

---

### Task A3: Migration — ag_pending_actions table

**Step 1: Apply migration**

```sql
CREATE TABLE ag_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
  resolution_id UUID NOT NULL REFERENCES ag_resolutions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'failed')),
  error_message TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ag_pending_actions_ag_id ON ag_pending_actions(ag_id);
CREATE INDEX idx_ag_pending_actions_status ON ag_pending_actions(status);

-- RLS
ALTER TABLE ag_pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage pending actions" ON ag_pending_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ag_meetings am
      WHERE am.id = ag_pending_actions.ag_id
        AND user_is_copro_manager(am.copro_id)
    )
  );
```

---

### Task A4: SQL function — prepare_ag_decisions

**Step 1: Create function**

This function is called at AG closure. It:
1. Reads all adopted resolutions with an action_type
2. Validates all required variables are filled
3. Creates draft entities in target tables
4. Creates rows in ag_pending_actions

```sql
CREATE OR REPLACE FUNCTION prepare_ag_decisions(p_ag_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resolution RECORD;
  v_actions_created INT := 0;
  v_missing_vars JSONB := '[]'::jsonb;
  v_action_id UUID;
  v_target_id UUID;
  v_copro_id UUID;
  v_vars JSONB;
BEGIN
  -- Get copro_id from AG
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;

  FOR v_resolution IN
    SELECT id, title, action_type, variables, is_approved
    FROM ag_resolutions
    WHERE ag_id = p_ag_id
      AND is_approved = true
      AND action_type IS NOT NULL
    ORDER BY resolution_number
  LOOP
    v_vars := COALESCE(v_resolution.variables, '{}'::jsonb);

    -- Check required variables based on action_type
    -- (validation logic per action_type)

    CASE v_resolution.action_type

    WHEN 'CREATE_BUDGET' THEN
      INSERT INTO budgets (copro_id, label, type, fiscal_year_start, fiscal_year_end, total_amount, status, source_ag_id)
      VALUES (
        v_copro_id,
        'Budget previsionnel ' || COALESCE(v_vars->>'date_debut', ''),
        'previsionnel',
        (v_vars->>'date_debut')::DATE,
        (v_vars->>'date_fin')::DATE,
        REPLACE(REPLACE(v_vars->>'montant', ' ', ''), ',', '.')::NUMERIC,
        'draft_from_ag',
        p_ag_id
      )
      RETURNING id INTO v_target_id;

      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, target_id, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'CREATE_BUDGET', 'budgets', v_target_id, v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'APPROVE_ACCOUNTS' THEN
      -- Mark fiscal year as approved
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'APPROVE_ACCOUNTS', 'budgets', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'SCHEDULE_BUDGET_PAYMENTS' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'SCHEDULE_BUDGET_PAYMENTS', 'call_for_funds', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'CREATE_ALUR_FUND' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'CREATE_ALUR_FUND', 'budgets', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'SCHEDULE_ALUR_PAYMENTS' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'SCHEDULE_ALUR_PAYMENTS', 'call_for_funds', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'CREATE_WORK_BUDGET' THEN
      INSERT INTO budgets (copro_id, label, type, total_amount, status, source_ag_id)
      VALUES (
        v_copro_id,
        'Travaux - ' || COALESCE(v_vars->>'description_travaux', v_resolution.title),
        'travaux',
        REPLACE(REPLACE(COALESCE(v_vars->>'montant', '0'), ' ', ''), ',', '.')::NUMERIC,
        'draft_from_ag',
        p_ag_id
      )
      RETURNING id INTO v_target_id;

      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, target_id, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'CREATE_WORK_BUDGET', 'budgets', v_target_id, v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'CREATE_EXCEPTIONAL_CALL' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'CREATE_EXCEPTIONAL_CALL', 'call_for_funds', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'APPOINT_SYNDIC' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'APPOINT_SYNDIC', 'coproprietes', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'ELECT_COUNCIL' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'ELECT_COUNCIL', 'council_members', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'MANAGE_CONTRACT' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'MANAGE_CONTRACT', 'contracts', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    WHEN 'DESIGNATE_BUREAU' THEN
      -- Already handled via copro_id sync in session
      NULL;

    WHEN 'GRANT_QUITUS' THEN
      INSERT INTO ag_pending_actions (ag_id, resolution_id, action_type, target_table, payload, status)
      VALUES (p_ag_id, v_resolution.id, 'GRANT_QUITUS', 'budgets', v_vars, 'pending');
      v_actions_created := v_actions_created + 1;

    ELSE
      NULL; -- Unknown action_type, skip
    END CASE;

  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'actions_created', v_actions_created
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

---

### Task A5: SQL function — activate_ag_decisions

Called when PV is sent. Activates all pending actions.

```sql
CREATE OR REPLACE FUNCTION activate_ag_decisions(p_ag_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action RECORD;
  v_activated INT := 0;
  v_failed INT := 0;
  v_copro_id UUID;
BEGIN
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;

  FOR v_action IN
    SELECT * FROM ag_pending_actions
    WHERE ag_id = p_ag_id AND status = 'pending'
    ORDER BY created_at
  LOOP
    BEGIN
      CASE v_action.action_type

      WHEN 'CREATE_BUDGET', 'CREATE_WORK_BUDGET' THEN
        UPDATE budgets SET status = 'active' WHERE id = v_action.target_id;

      WHEN 'APPROVE_ACCOUNTS' THEN
        UPDATE budgets
        SET status = 'closed'
        WHERE copro_id = v_copro_id
          AND fiscal_year_start = (v_action.payload->>'date_debut')::DATE
          AND fiscal_year_end = (v_action.payload->>'date_fin')::DATE;

      WHEN 'SCHEDULE_BUDGET_PAYMENTS', 'SCHEDULE_ALUR_PAYMENTS', 'CREATE_EXCEPTIONAL_CALL' THEN
        -- Generate call_for_funds entries based on payload schedule
        PERFORM generate_calls_from_ag_payload(v_copro_id, p_ag_id, v_action.resolution_id, v_action.payload);

      WHEN 'CREATE_ALUR_FUND' THEN
        IF v_action.target_id IS NOT NULL THEN
          UPDATE budgets SET status = 'active' WHERE id = v_action.target_id;
        END IF;

      WHEN 'APPOINT_SYNDIC' THEN
        UPDATE coproprietes SET
          syndic_name = v_action.payload->>'nom_syndic',
          updated_at = now()
        WHERE id = v_copro_id;

      WHEN 'ELECT_COUNCIL' THEN
        -- Deactivate old members, activate new ones
        UPDATE council_members SET status = 'inactive', end_date = now()
        WHERE copro_id = v_copro_id AND status = 'active';
        -- New members created from payload

      WHEN 'MANAGE_CONTRACT' THEN
        IF v_action.target_id IS NOT NULL THEN
          UPDATE contracts SET status = 'active' WHERE id = v_action.target_id;
        END IF;

      WHEN 'GRANT_QUITUS' THEN
        -- Mark quitus granted on the fiscal year
        NULL;

      ELSE
        NULL;
      END CASE;

      UPDATE ag_pending_actions
      SET status = 'activated', activated_at = now()
      WHERE id = v_action.id;
      v_activated := v_activated + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE ag_pending_actions
      SET status = 'failed', error_message = SQLERRM
      WHERE id = v_action.id;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'activated', v_activated,
    'failed', v_failed
  );
END;
$$;
```

---

### Task A6: Migration — add source_ag_id to budgets + status draft_from_ag

```sql
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS source_ag_id UUID REFERENCES ag_meetings(id);
-- Ensure status can accept 'draft_from_ag'
-- Check existing constraint on budgets.status and update if needed
```

---

### Task A7: SQL function — validate_ag_variables

Called before closure to check all adopted resolutions have complete variables.

```sql
CREATE OR REPLACE FUNCTION validate_ag_variables(p_ag_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_resolution RECORD;
  v_missing JSONB := '[]'::jsonb;
  v_vars JSONB;
  v_required TEXT[];
  v_var TEXT;
BEGIN
  FOR v_resolution IN
    SELECT id, title, action_type, variables
    FROM ag_resolutions
    WHERE ag_id = p_ag_id
      AND is_approved = true
      AND action_type IS NOT NULL
    ORDER BY resolution_number
  LOOP
    v_vars := COALESCE(v_resolution.variables, '{}'::jsonb);

    -- Determine required variables per action_type
    CASE v_resolution.action_type
      WHEN 'CREATE_BUDGET', 'APPROVE_ACCOUNTS' THEN v_required := ARRAY['montant', 'date_debut', 'date_fin'];
      WHEN 'SCHEDULE_BUDGET_PAYMENTS' THEN v_required := ARRAY['modalites_paiement_budget'];
      WHEN 'CREATE_ALUR_FUND' THEN v_required := ARRAY['montant', 'pourcentage'];
      WHEN 'SCHEDULE_ALUR_PAYMENTS' THEN v_required := ARRAY['modalites_paiement'];
      WHEN 'CREATE_WORK_BUDGET' THEN v_required := ARRAY['montant'];
      WHEN 'CREATE_EXCEPTIONAL_CALL' THEN v_required := ARRAY['montant'];
      WHEN 'APPOINT_SYNDIC' THEN v_required := ARRAY['nom_syndic', 'date_debut', 'date_fin'];
      WHEN 'GRANT_QUITUS' THEN v_required := ARRAY['date_debut', 'date_fin'];
      ELSE v_required := ARRAY[]::TEXT[];
    END CASE;

    FOREACH v_var IN ARRAY v_required
    LOOP
      IF v_vars->>v_var IS NULL OR TRIM(v_vars->>v_var) = '' THEN
        v_missing := v_missing || jsonb_build_object(
          'resolution_id', v_resolution.id,
          'resolution_title', v_resolution.title,
          'action_type', v_resolution.action_type,
          'variable', v_var
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_missing) = 0,
    'missing', v_missing
  );
END;
$$;
```

---

## Workstream B: Session AG — Templates & Bureau Sync (Agent 2)

### Task B1: Add action_type to resolution templates

**Files:**
- Modify: `src/lib/constants/resolutions.ts`

**Step 1:** Add `action_type` field to `ResolutionTemplate` interface:

```typescript
export interface ResolutionTemplate {
    // ... existing fields
    action_type?: string;  // AG Decision Engine action
}
```

**Step 2:** Add `action_type` to each relevant template in the RESOLUTIONS array. Map by titre:

| titre contains | action_type |
|---|---|
| "Approbation des comptes" | APPROVE_ACCOUNTS |
| "Approbation du budget previsionnel" | CREATE_BUDGET |
| "Calendrier de financement du budget" | SCHEDULE_BUDGET_PAYMENTS |
| "fonds de travaux" + "ALUR" | CREATE_ALUR_FUND |
| "Calendrier de financement du fonds" | SCHEDULE_ALUR_PAYMENTS |
| "Vote de travaux" | CREATE_WORK_BUDGET |
| "Appel de fonds exceptionnel" | CREATE_EXCEPTIONAL_CALL |
| "Nomination du syndic" / "Renouvellement du mandat" | APPOINT_SYNDIC |
| "Election des membres titulaires du conseil" | ELECT_COUNCIL |
| "Souscription d'un contrat" / "Renouvellement d'un contrat" / "Resiliation d'un contrat" | MANAGE_CONTRACT |
| "Election du president de seance" / "Designation du secretaire" / "Designation du scrutateur" | DESIGNATE_BUREAU |
| "Quitus au syndic" | GRANT_QUITUS |

**Step 3: Commit**

```bash
git add src/lib/constants/resolutions.ts
git commit -m "feat(ag): add action_type to resolution templates"
```

---

### Task B2: Propagate action_type when creating resolutions in Supabase

**Files:**
- Modify: Edge function `ag_add_resolution` (or the frontend code that inserts resolutions)
- Check: `src/features/ag/resolutions-new/hooks/useNewResolutionPage.ts`

**Step 1:** When a resolution is added to an AG (from template), include `action_type` in the INSERT to `ag_resolutions`.

**Step 2:** Verify by creating a test AG and checking that `action_type` is populated.

---

### Task B3: Sync bureau copro_ids from session dropdowns

**Files:**
- Modify: `src/features/ag/session/hooks/useAgSessionPage.ts`
- Modify: `src/features/ag/designation/hooks/useDesignationRolesPage.ts`
- Modify: `src/components/features/ag/VariableEditor/VariableEditor.tsx`

**Step 1:** When a designation resolution variable is saved (president, secretaire, scrutateur), extract the copro_id from the selection (not just the name string).

Currently `VariableEditor` receives `coproprietaires` prop. When a copro is selected for a designation variable, the `onChange` callback should pass `"copro_id:UUID|Prenom NOM"` format (or a structured object).

**Step 2:** In `useAgSessionPage.handleSaveVariable`, detect designation variables and sync copro_id + name to `ag_meetings`:

```typescript
// After saving the variable, if this is a designation resolution
if (current?.action_type === 'DESIGNATE_BUREAU') {
  const variableName = editing.name; // e.g. "nom_president"
  const [coproId, displayName] = editing.value.split('|');

  const updateData: Record<string, string> = {};
  if (variableName.includes('president')) {
    updateData.president_copro_id = coproId;
    updateData.president_name = displayName;
  } else if (variableName.includes('secretaire')) {
    updateData.secretary_copro_id = coproId;
    updateData.secretary_name = displayName;
  } else if (variableName.includes('scrutateur')) {
    updateData.scrutineer1_copro_id = coproId;
    updateData.scrutineer1_name = displayName;
  }

  await supabase.from('ag_meetings').update(updateData).eq('id', agId);
}
```

**Step 3:** Update `handleAutoFillFromAG` in `usePVPage.ts` to join on copro_id for full contact info:

```typescript
const { data: meeting } = await supabase
  .from('ag_meetings')
  .select(`
    president_copro_id, president_name,
    secretary_copro_id, secretary_name,
    scrutineer1_copro_id, scrutineer1_name
  `)
  .eq('id', agId)
  .single();

// For each role with a copro_id, fetch full info
if (meeting?.president_copro_id) {
  const { data: copro } = await supabase
    .from('coproprietaires')
    .select('prenom, nom, email, telephone')
    .eq('id', meeting.president_copro_id)
    .single();
  // Use copro data to fill signataire
}
```

**Step 4: Commit**

---

## Workstream C: Etape 8 — Cloture UI (Agent 3)

### Task C1: Create the closure recap component

**Files:**
- Create: `src/components/features/ag/Closure/ClosureRecap.tsx`
- Create: `src/components/features/ag/Closure/ClosureRecap.module.css`
- Create: `src/components/features/ag/Closure/ClosureVariableInline.tsx`

**Step 1:** Build `ClosureRecap` component that:
1. Calls `validate_ag_variables(agId)` on mount
2. Displays list of adopted resolutions with action_type
3. Shows status icon per resolution (complete / missing vars)
4. For missing vars, renders `ClosureVariableInline` (compact inline editor)
5. Disables "Cloturer l'AG" button while any vars are missing

```typescript
interface ClosureRecapProps {
  agId: string;
  onClose: () => void; // Called when closure is confirmed
}

export function ClosureRecap({ agId, onClose }: ClosureRecapProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    loadValidation();
  }, [agId]);

  const loadValidation = async () => {
    const { data } = await supabase.rpc('validate_ag_variables', { p_ag_id: agId });
    setValidation(data);
  };

  const handleUpdateVariable = async (resolutionId: string, varName: string, value: string) => {
    await supabase
      .from('ag_resolutions')
      .update({ variables: { ...currentVars, [varName]: value } })
      .eq('id', resolutionId);
    await loadValidation(); // Re-validate
  };

  const handleClose = async () => {
    setIsClosing(true);
    // 1. Prepare decisions (create drafts)
    await supabase.rpc('prepare_ag_decisions', { p_ag_id: agId });
    // 2. Close the AG
    await closeAg({ agId });
    onClose();
  };

  const allValid = validation?.valid === true;

  return (
    <div className={styles.container}>
      <h2>Recapitulatif des decisions</h2>
      {validation?.missing?.map(item => (
        <ClosureVariableInline
          key={`${item.resolution_id}-${item.variable}`}
          resolutionTitle={item.resolution_title}
          variableName={item.variable}
          onSave={(value) => handleUpdateVariable(item.resolution_id, item.variable, value)}
        />
      ))}
      <button disabled={!allValid || isClosing} onClick={handleClose}>
        Cloturer l AG
      </button>
    </div>
  );
}
```

**Step 2:** Style with CSS Modules (dark mode compatible).

**Step 3: Commit**

---

### Task C2: Integrate ClosureRecap into the AG workflow

**Files:**
- Modify: `src/app/(dashboard)/ag/[id]/checklist/page.tsx` (or wherever step 8 lives)
- Check: `src/lib/constants/ag-workflow.ts` for step configuration

**Step 1:** Add `ClosureRecap` as the main content of step 8 (Cloture).

**Step 2:** Wire up the close handler to navigate to PV page after closure.

**Step 3: Commit**

---

## Workstream D: PV Activation + Dashboard (Agent 4)

### Task D1: Trigger activation at PV send

**Files:**
- Modify: `src/features/ag/pv/hooks/usePVPage.ts`

**Step 1:** In `handleSendSignatureRequests`, after validating signatures, call activation:

```typescript
const handleSendSignatureRequests = async () => {
  // ... existing signature validation ...

  // Activate AG decisions
  const { data: activationResult } = await supabase.rpc('activate_ag_decisions', {
    p_ag_id: agId
  });

  if (activationResult?.failed > 0) {
    alert(`Attention : ${activationResult.failed} action(s) en erreur. Verifiez le recapitulatif.`);
  }

  // ... existing code (save draft, set signed, etc.) ...
};
```

**Step 2: Commit**

---

### Task D2: Dashboard — AG archives section

**Files:**
- Modify: `src/app/(dashboard)/ag/dashboard/page.tsx`
- Modify or check: `src/features/ag/dashboard-page/hooks/useAgDashboardPage.ts`
- Create: `src/components/features/ag/Dashboard/AGArchivesList.tsx`
- Create: `src/components/features/ag/Dashboard/AGArchivesList.module.css`

**Step 1:** In `useAgDashboardPage`, add query for closed AGs with their pending_actions stats:

```typescript
const { data: closedAGs } = await supabase
  .from('ag_meetings')
  .select(`
    id, title, session_ended_at, copro_id,
    ag_pending_actions(status)
  `)
  .eq('status', 'closed')
  .order('session_ended_at', { ascending: false });
```

**Step 2:** Create `AGArchivesList` component showing:
- AG date + title
- Resolution count (adopted)
- Actions status: X activated, Y pending, Z failed
- Link to PV
- Links to created entities (budgets, etc.)

**Step 3:** Add tab navigation "AG en cours" / "AG passees" in the dashboard page.

**Step 4: Commit**

---

### Task D3: Show activation recap after PV send

**Files:**
- Create: `src/components/features/ag/PV/ActivationRecap.tsx`
- Create: `src/components/features/ag/PV/ActivationRecap.module.css`
- Modify: `src/features/ag/pv/hooks/usePVPage.ts`

**Step 1:** After `activate_ag_decisions`, show a modal/section with the results:

```typescript
interface ActivationRecapProps {
  agId: string;
  result: { activated: number; failed: number };
  onClose: () => void;
}
```

Display: "X actions activees" with green checkmarks, "Y en erreur" with red alerts and error messages from `ag_pending_actions`.

**Step 2: Commit**

---

## Execution Order & Dependencies

```
A1 (action_type column) ──┐
A2 (copro_id columns) ────┤
A3 (pending_actions table)─┤
A6 (source_ag_id budget) ──┼── All migrations first (can be parallel)
                           │
A7 (validate function) ────┤── Depends on A1, A3
A4 (prepare function) ─────┤── Depends on A1, A3, A6
A5 (activate function) ────┘── Depends on A3

B1 (templates action_type) ── Independent
B2 (propagate on insert) ──── Depends on A1, B1
B3 (bureau copro_id sync) ─── Depends on A2

C1 (closure recap UI) ──────── Depends on A7
C2 (integrate step 8) ──────── Depends on C1

D1 (activation at PV) ──────── Depends on A5
D2 (dashboard archives) ────── Depends on A3
D3 (activation recap) ──────── Depends on D1
```

## Agent Assignment

| Agent | Workstream | Tasks |
|---|---|---|
| Agent 1 | DB & Backend | A1, A2, A3, A6, A7, A4, A5 |
| Agent 2 | Templates & Bureau | B1, B2, B3 |
| Agent 3 | Cloture UI | C1, C2 |
| Agent 4 | PV Activation + Dashboard | D1, D2, D3 |

**Agents 1-2 demarrent en parallele. Agents 3-4 demarrent des que les migrations/fonctions sont en place.**
