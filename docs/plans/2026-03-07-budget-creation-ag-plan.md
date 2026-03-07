# Budget AG — Enrichissement BudgetPoste (account_id + repartition_key_id)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrichir le type BudgetPoste avec account_id et repartition_key_id pour que la RPC create_budget_from_ag puisse inserer des budget_lines valides (NOT NULL constraints).

**Architecture:** Le syndic choisit un poste predefini a l'etape 1 -> le compte comptable et la cle de repartition sont pre-remplis automatiquement mais modifiables. Les postes enrichis sont serialises dans opening_notes.budgetPostes. A l'etape 9 (finalisation), on les recupere et on les passe a la RPC. Les APIs existantes listAccounts() et listRepartitionKeys() de src/lib/finance/api.ts alimentent les dropdowns.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules, Supabase RPCs

---

## Task 1: Enrichir le type BudgetPoste

**Files:**
- Modify: `src/features/ag/new/domain/types.ts:12-16`
- Modify: `src/features/ag/types/index.ts:71-75`

**Step 1: Modifier BudgetPoste dans new/domain/types.ts**

```typescript
export interface BudgetPoste {
  id: string;
  poste: string;
  montant: number;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  repartitionKeyId?: string;
  repartitionKeyName?: string;
}
```

Les champs sont optionnels pour backward compat (postes existants sans enrichissement).

**Step 2: Modifier BudgetPoste dans ag/types/index.ts**

Meme interface, copier a l'identique. (Ce fichier est importe par le BudgetSection de edit/).

**Step 3: Commit**

```bash
git add src/features/ag/new/domain/types.ts src/features/ag/types/index.ts
git commit -m "feat(ag): enrich BudgetPoste with accountId + repartitionKeyId"
```

---

## Task 2: Creer le mapping poste -> compte/cle

**Files:**
- Modify: `src/features/ag/new/domain/constants.ts`

**Step 1: Ajouter le mapping POSTE_ACCOUNT_MAPPING**

Ajouter apres POSTES_DEPENSES:

```typescript
/** Mapping poste predefini -> compte comptable + cle de repartition (pre-remplissage) */
export const POSTE_ACCOUNT_MAPPING: Record<string, { accountCode: string; accountName: string; repartitionKeyName: string }> = {
  'Eau': { accountCode: '605', accountName: 'Eau', repartitionKeyName: 'Eau froide' },
  'Assurance': { accountCode: '608', accountName: 'Assurances', repartitionKeyName: 'Charges generales' },
  'Electricite': { accountCode: '606', accountName: 'Electricite', repartitionKeyName: 'Charges generales' },
  'Entretien': { accountCode: '602', accountName: 'Entretien et reparations', repartitionKeyName: 'Charges generales' },
  'Nettoyage': { accountCode: '602', accountName: 'Entretien et reparations', repartitionKeyName: 'Charges generales' },
  'Ascenseur': { accountCode: '604', accountName: 'Ascenseur', repartitionKeyName: 'Ascenseur' },
  'Frais de gestion': { accountCode: '609', accountName: 'Honoraires syndic', repartitionKeyName: 'Charges generales' },
  'Honoraires': { accountCode: '609', accountName: 'Honoraires syndic', repartitionKeyName: 'Charges generales' },
  'Fournitures': { accountCode: '601', accountName: 'Achats - Fournitures', repartitionKeyName: 'Charges generales' },
};
```

**Step 2: Mettre a jour POSTES_DEPENSES pour correspondre au mapping**

Remplacer 'Electricite' par le bon accent si necessaire, et ajouter les entrees manquantes du design (Frais AG, Frais postaux). Garder 'Autre' en dernier.

```typescript
export const POSTES_DEPENSES = [
  'Eau',
  'Assurance',
  'Electricite',
  'Chauffage',
  'Entretien',
  'Nettoyage',
  'Gardiennage',
  'Ascenseur',
  'Eclairage',
  'Telesurveillance',
  'Travaux',
  'Maintenance',
  'Fournitures',
  'Frais de gestion',
  'Honoraires',
  'Frais AG',
  'Frais postaux et bancaires',
  'Autre',
];
```

Et ajouter les deux nouvelles entrees au mapping:
```typescript
  'Frais AG': { accountCode: '612', accountName: "Frais d'AG", repartitionKeyName: 'Charges generales' },
  'Frais postaux et bancaires': { accountCode: '611', accountName: 'Frais postaux et bancaires', repartitionKeyName: 'Charges generales' },
```

**Step 3: Commit**

```bash
git add src/features/ag/new/domain/constants.ts
git commit -m "feat(ag): add POSTE_ACCOUNT_MAPPING for auto-fill account/key"
```

---

## Task 3: Creer un hook useAccountsAndKeys pour charger comptes + cles

**Files:**
- Create: `src/features/ag/new/hooks/useAccountsAndKeys.ts`

**Step 1: Implementer le hook**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { listAccounts, listRepartitionKeys } from '@/lib/finance/api';

export interface AccountOption {
  id: string;
  code: string;
  name: string;
}

export interface RepartitionKeyOption {
  id: string;
  name: string;
}

export function useAccountsAndKeys() {
  const { currentCoproId: contextCoproId } = useCopro();
  const coproId = contextCoproId || '11111111-aaaa-bbbb-cccc-111111111111';

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [repartitionKeys, setRepartitionKeys] = useState<RepartitionKeyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [accResult, keyResult] = await Promise.all([
          listAccounts(coproId, 'expense'),
          listRepartitionKeys(coproId),
        ]);
        if (cancelled) return;
        if (accResult.data) setAccounts(accResult.data);
        if (keyResult.data) setRepartitionKeys(keyResult.data);
      } catch (err) {
        console.error('[useAccountsAndKeys] Error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [coproId]);

  const findAccountByCode = useCallback((code: string) => {
    return accounts.find(a => a.code === code) || null;
  }, [accounts]);

  const findKeyByName = useCallback((name: string) => {
    return repartitionKeys.find(k => k.name === name) || null;
  }, [repartitionKeys]);

  return { accounts, repartitionKeys, isLoading, findAccountByCode, findKeyByName };
}
```

**Step 2: Exporter depuis l'index**

Ajouter dans `src/features/ag/new/hooks/index.ts`:
```typescript
export { useAccountsAndKeys } from './useAccountsAndKeys';
```

**Step 3: Commit**

```bash
git add src/features/ag/new/hooks/useAccountsAndKeys.ts src/features/ag/new/hooks/index.ts
git commit -m "feat(ag): add useAccountsAndKeys hook for loading accounts + repartition keys"
```

---

## Task 4: Enrichir useBudgetPostes pour gerer account/key

**Files:**
- Modify: `src/features/ag/new/hooks/useBudgetPostes.ts`

**Step 1: Modifier handleAddPoste pour inclure les champs enrichis**

Ajouter un parametre optionnel `accountData` a l'interface:

```typescript
interface UseBudgetPostesProps {
  budgetPostes: BudgetPoste[];
  onPostesChange: (postes: BudgetPoste[]) => void;
  importBudgetFn?: (params: {
    exercice: number;
    source: BudgetImportSource;
    budgetId?: string | null;
  }) => Promise<BudgetPoste[]>;
  exercice?: number;
  /** Donnees comptables pour enrichir les postes ajoutes */
  resolveAccountData?: (posteName: string) => {
    accountId?: string;
    accountCode?: string;
    accountName?: string;
    repartitionKeyId?: string;
    repartitionKeyName?: string;
  } | null;
}
```

**Step 2: Dans handleAddPoste, appeler resolveAccountData**

```typescript
const handleAddPoste = useCallback(() => {
  if (!newPoste.poste.trim() || !newPoste.montant) return;
  const montant = parseFloat(newPoste.montant);
  if (isNaN(montant) || montant <= 0) return;

  const accountData = resolveAccountData?.(newPoste.poste.trim());

  const nouveauPoste: BudgetPoste = {
    id: Date.now().toString(),
    poste: newPoste.poste.trim(),
    montant,
    ...(accountData || {}),
  };

  onPostesChange([...budgetPostes, nouveauPoste]);
  setNewPoste({ poste: '', montant: '' });
  setShowCustomPoste(false);
}, [newPoste, budgetPostes, onPostesChange, resolveAccountData]);
```

**Step 3: Commit**

```bash
git add src/features/ag/new/hooks/useBudgetPostes.ts
git commit -m "feat(ag): useBudgetPostes resolves account data on add"
```

---

## Task 5: Enrichir useBudgetImport pour ramener account_id + repartition_key_id

**Files:**
- Modify: `src/features/ag/new/hooks/useBudgetImport.ts:127-131`

**Step 1: Modifier la conversion budgetLines -> BudgetPoste**

Remplacer le bloc de conversion (L127-131):

```typescript
const postes: BudgetPoste[] = budgetLines.map((line, index) => ({
  id: `import-${line.id}-${Date.now()}-${index}`,
  poste: line.label || line.code || `Poste ${index + 1}`,
  montant: Number(line.planned_amount) || 0,
  accountId: line.account_id || undefined,
  repartitionKeyId: line.repartition_key_id || undefined,
}));
```

Note: accountCode et accountName ne sont pas dans BudgetLineOverview.
Il faudra les resoudre cote UI (via useAccountsAndKeys) apres import, OU les ajouter a la query.

**Step 2: Enrichir la query pour ramener account code/name**

Verifier si `v_budget_lines_overview` contient deja account_code/name. Si oui, les mapper.
Sinon, ajouter un join ou les resoudre via useAccountsAndKeys cote appelant.

**Approche pragmatique:** Ajouter accountCode/accountName/repartitionKeyName en post-resolution dans useBudgetPostes ou dans le composant appelant, en utilisant les listes chargees par useAccountsAndKeys. Cela evite de modifier la vue SQL.

**Step 3: Commit**

```bash
git add src/features/ag/new/hooks/useBudgetImport.ts
git commit -m "feat(ag): import budget lines with account_id + repartition_key_id"
```

---

## Task 6: Modifier BudgetSection (etape 1) — ajouter dropdowns compte + cle

**Files:**
- Modify: `src/features/ag/components/edit/BudgetSection.tsx`
- Modify: `src/features/ag/new/components/BudgetSection.tsx` (si utilise dans new)

**Step 1: Ajouter les props pour accounts/keys**

```typescript
interface BudgetSectionProps {
  // ... props existantes ...
  accounts: Array<{ id: string; code: string; name: string }>;
  repartitionKeys: Array<{ id: string; name: string }>;
  onPosteAccountChange?: (posteId: string, accountId: string, accountCode: string, accountName: string) => void;
  onPosteKeyChange?: (posteId: string, keyId: string, keyName: string) => void;
}
```

**Step 2: Ajouter les dropdowns dans l'UI**

Sous le select poste + montant, ajouter une ligne avec 2 selects:

```tsx
{/* Sous l'input montant, dans addPosteForm */}
<div className={styles.accountRow}>
  <select className={styles.select} value={newPoste.accountId || ''} onChange={...}>
    <option value="">Compte comptable...</option>
    {accounts.map(a => (
      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
    ))}
  </select>
  <select className={styles.select} value={newPoste.repartitionKeyId || ''} onChange={...}>
    <option value="">Cle de repartition...</option>
    {repartitionKeys.map(k => (
      <option key={k.id} value={k.id}>{k.name}</option>
    ))}
  </select>
</div>
```

**Step 3: Dans la liste des postes, afficher compte + cle**

Ajouter deux colonnes dans le header: Compte | Cle
Et dans chaque ligne:
```tsx
<span className={styles.posteAccount}>{poste.accountCode || '-'}</span>
<span className={styles.posteKey}>{poste.repartitionKeyName || '-'}</span>
```

**Step 4: En mode edition, rendre compte + cle editables** (selects)

**Step 5: Ajouter les styles CSS necessaires**

Dans le CSS module de la page edit (ou creer un module dedie si necessaire):
```css
.accountRow { display: flex; gap: var(--spacing-2); margin-top: var(--spacing-1); }
.posteAccount, .posteKey { font-size: var(--font-size-xs); color: var(--color-text-muted); min-width: 80px; }
```

**Step 6: Commit**

```bash
git add src/features/ag/components/edit/BudgetSection.tsx
git commit -m "feat(ag): add account/key dropdowns to BudgetSection step 1"
```

---

## Task 7: Brancher useAccountsAndKeys dans la page edit

**Files:**
- Modify: `src/app/(dashboard)/ag/[id]/edit/page.tsx`
- Modify: `src/features/ag/hooks/useAgEditPage.ts`

**Step 1: Dans useAgEditPage, creer resolveAccountData**

Utiliser useAccountsAndKeys + POSTE_ACCOUNT_MAPPING pour creer la fonction de resolution:

```typescript
import { useAccountsAndKeys } from '@/features/ag/new/hooks/useAccountsAndKeys';
import { POSTE_ACCOUNT_MAPPING } from '@/features/ag/new/domain/constants';

// Dans le hook:
const { accounts, repartitionKeys, findAccountByCode, findKeyByName } = useAccountsAndKeys();

const resolveAccountData = useCallback((posteName: string) => {
  const mapping = POSTE_ACCOUNT_MAPPING[posteName];
  if (!mapping) return null;
  const account = findAccountByCode(mapping.accountCode);
  const key = findKeyByName(mapping.repartitionKeyName);
  return {
    accountId: account?.id,
    accountCode: mapping.accountCode,
    accountName: mapping.accountName,
    repartitionKeyId: key?.id,
    repartitionKeyName: mapping.repartitionKeyName,
  };
}, [findAccountByCode, findKeyByName]);
```

**Step 2: Passer accounts, repartitionKeys et resolveAccountData au BudgetSection**

**Step 3: Remplacer le mock BUDGET_PRECEDENT par le vrai import**

Le hook useBudgetImport est deja utilise dans la page new. Brancher le meme mecanisme dans useAgEditPage:
- Supprimer la constante BUDGET_PRECEDENT en dur (L93-105)
- Utiliser useBudgetImport().importBudget pour l'import N-1

**Step 4: Commit**

```bash
git add src/features/ag/hooks/useAgEditPage.ts src/app/(dashboard)/ag/[id]/edit/page.tsx
git commit -m "feat(ag): wire useAccountsAndKeys + real budget import in edit page"
```

---

## Task 8: Modifier BlocBudget (etape 9) pour utiliser les postes enrichis

**Files:**
- Modify: `src/features/ag/finalisation/components/BlocBudget.tsx`
- Modify: `src/features/ag/finalisation/components/BlocBudget.module.css`

**Step 1: Charger accounts + repartitionKeys au mount**

```typescript
import { useAccountsAndKeys } from '@/features/ag/new/hooks/useAccountsAndKeys';

// Dans le composant:
const { accounts, repartitionKeys } = useAccountsAndKeys();
```

**Step 2: Lire les postes enrichis depuis opening_notes**

Modifier l'init de useState<BlocPoste[]>. L'action.resolution.variables contient le montant global, mais les postes enrichis sont dans ag_meetings.opening_notes.budgetPostes.

Ajouter une prop `budgetPostes?: BudgetPoste[]` (venant de opening_notes, charge par la page finalisation) OU charger opening_notes directement.

Si opening_notes.budgetPostes existe et non vide: les utiliser.
Sinon fallback: montant global comme poste unique.

**Step 3: Modifier BlocPoste pour inclure account_id + repartition_key_id**

Dans `src/lib/ag/api/finalisation.api.ts`:

```typescript
export interface BlocPoste {
  label: string;
  amount: number;
  sort_order: number;
  account_id?: string;
  repartition_key_id?: string;
}
```

**Step 4: Afficher compte + cle dans chaque ligne**

Ajouter des selects ou labels pour account/key dans chaque posteItem.

**Step 5: Ajouter les styles CSS**

```css
.posteAccount { font-size: var(--font-size-xs); color: var(--color-text-muted); min-width: 60px; }
.posteKey { font-size: var(--font-size-xs); color: var(--color-text-muted); min-width: 80px; }
.accountSelect { padding: 2px 4px; font-size: var(--font-size-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); }
```

**Step 6: Commit**

```bash
git add src/features/ag/finalisation/components/BlocBudget.tsx src/features/ag/finalisation/components/BlocBudget.module.css src/lib/ag/api/finalisation.api.ts
git commit -m "feat(ag): BlocBudget reads enriched postes with account/key"
```

---

## Task 9: Modifier la RPC create_budget_from_ag

**Files:**
- Migration SQL via Supabase MCP

**Step 1: Modifier la RPC pour lire account_id + repartition_key_id depuis p_postes**

```sql
CREATE OR REPLACE FUNCTION create_budget_from_ag(
  p_ag_id UUID,
  p_exercice INT,
  p_postes JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_copro_id UUID;
  v_budget_id UUID;
  v_period_id UUID;
  v_poste JSONB;
  v_default_account_id UUID;
  v_default_key_id UUID;
BEGIN
  -- Recuperer copro_id
  SELECT copro_id INTO v_copro_id FROM ag_meetings WHERE id = p_ag_id;
  IF v_copro_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG not found');
  END IF;

  -- Recuperer ou creer la periode
  SELECT id INTO v_period_id FROM periods
    WHERE copro_id = v_copro_id AND year = p_exercice
    LIMIT 1;
  IF v_period_id IS NULL THEN
    INSERT INTO periods (copro_id, year, start_date, end_date, status)
    VALUES (v_copro_id, p_exercice, make_date(p_exercice, 1, 1), make_date(p_exercice, 12, 31), 'open')
    RETURNING id INTO v_period_id;
  END IF;

  -- Fallback account + key (pour postes sans enrichissement)
  SELECT id INTO v_default_account_id FROM accounts
    WHERE copro_id = v_copro_id AND code = '615' AND is_active = true LIMIT 1;
  SELECT id INTO v_default_key_id FROM repartition_keys
    WHERE copro_id = v_copro_id AND is_active = true
    ORDER BY name LIMIT 1;

  -- Creer le budget
  INSERT INTO budgets (copro_id, period_id, name, budget_type, status)
  VALUES (v_copro_id, v_period_id, 'Budget previsionnel ' || p_exercice, 'current', 'draft')
  RETURNING id INTO v_budget_id;

  -- Inserer les lignes
  FOR v_poste IN SELECT * FROM jsonb_array_elements(p_postes) LOOP
    INSERT INTO budget_lines (budget_id, copro_id, label, planned_amount, sort_order, account_id, repartition_key_id)
    VALUES (
      v_budget_id,
      v_copro_id,
      v_poste->>'label',
      (v_poste->>'amount')::NUMERIC,
      COALESCE((v_poste->>'sort_order')::INT, 0),
      COALESCE((v_poste->>'account_id')::UUID, v_default_account_id),
      COALESCE((v_poste->>'repartition_key_id')::UUID, v_default_key_id)
    );
  END LOOP;

  -- Marquer l'action comme activee
  UPDATE ag_pending_actions
    SET status = 'activated', activated_at = NOW()
    WHERE ag_id = p_ag_id AND action_type = 'CREATE_BUDGET';

  RETURN jsonb_build_object('success', true, 'budget_id', v_budget_id);
END;
$$;
```

Points cles:
- COALESCE sur account_id/repartition_key_id: si le poste n'a pas d'enrichissement, on utilise le compte 615 (Charges diverses) et la premiere cle active
- Cela garantit que budget_lines.account_id et repartition_key_id ne sont jamais NULL

**Step 2: Appliquer la migration**

Via Supabase MCP `apply_migration` ou `execute_sql`.

**Step 3: Commit le fichier migration si local**

```bash
git add supabase/migrations/
git commit -m "fix(db): create_budget_from_ag reads account_id + repartition_key_id from postes"
```

---

## Task 10: Modifier createBudgetFromAg cote client

**Files:**
- Modify: `src/lib/ag/api/finalisation.api.ts:32-46`

**Step 1: Passer account_id + repartition_key_id dans les postes**

Le type BlocPoste a deja ete enrichi en Task 8. Verifier que createBudgetFromAg passe bien les postes enrichis a la RPC:

```typescript
export async function createBudgetFromAg(
  agId: string,
  exercice: number,
  postes: BlocPoste[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('create_budget_from_ag', {
    p_ag_id: agId,
    p_exercice: exercice,
    p_postes: postes, // contient maintenant account_id + repartition_key_id
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}
```

Pas de changement de code necessaire si BlocPoste est deja enrichi — la serialisation JSON inclura les nouveaux champs automatiquement.

**Step 2: Commit**

```bash
git add src/lib/ag/api/finalisation.api.ts
git commit -m "feat(ag): createBudgetFromAg passes enriched postes to RPC"
```

---

## Task 11: Test integration end-to-end

**Files:** Aucun nouveau fichier

**Step 1: Verifier etape 1**

1. Ouvrir une AG en edition
2. Activer le budget
3. Selectionner un poste predefini (ex: "Assurance")
4. Verifier que le compte (608) et la cle (Charges generales) sont pre-remplis
5. Modifier le compte -> verifier que la modification est gardee
6. Sauvegarder l'AG
7. Recharger la page -> verifier que les postes enrichis sont restaures

**Step 2: Verifier l'import N-1**

1. Cliquer "Importer budget N-1"
2. Verifier que les postes importes ont account_id + repartition_key_id
3. Verifier l'affichage des codes compte et noms de cles

**Step 3: Verifier etape 9**

1. Aller en finalisation
2. Verifier que les postes de l'etape 1 sont affiches avec compte + cle
3. Modifier un poste (changer le compte)
4. Cliquer "Creer le budget"
5. Verifier en DB: `SELECT * FROM budget_lines WHERE budget_id = <new>` -> account_id et repartition_key_id NOT NULL

**Step 4: Verifier le fallback**

1. Creer une AG sans postes enrichis (opening_notes vide)
2. En finalisation, le poste unique "Budget global" doit apparaitre
3. Cliquer "Creer le budget" -> la RPC utilise le fallback (compte 615 + premiere cle)

**Step 5: Commit final**

```bash
git add -A
git commit -m "feat(ag): budget creation with account_id + repartition_key_id — complete"
```

---

## Resume des dependances entre tasks

```
Task 1 (types) ──> Task 2 (mapping) ──> Task 4 (useBudgetPostes)
                                    ├──> Task 5 (useBudgetImport)
Task 3 (useAccountsAndKeys) ───────┤
                                    ├──> Task 6 (BudgetSection UI)
                                    ├──> Task 7 (page edit wiring)
                                    └──> Task 8 (BlocBudget etape 9)

Task 8 ──> Task 9 (RPC SQL)
       ──> Task 10 (client API)

Task 1-10 ──> Task 11 (test E2E)
```

Tasks 1, 2, 3 peuvent etre faites en parallele.
Tasks 4, 5, 6 dependent de 1+2+3.
Tasks 7 depend de 3+4+6.
Tasks 8, 9, 10 dependent de 1+3.
Task 11 depend de tout.
