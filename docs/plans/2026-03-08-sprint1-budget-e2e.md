# Sprint 1 — Budget E2E

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rendre le flux budget post-AG fonctionnel E2E : creation AG avec postes > session > vote > finalisation > budget cree en DB avec postes enrichis.

**Architecture:** 3 fixes independants (opening_notes, RPC generate_calls, test E2E) puis validation manuelle via l'UI.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Supabase RPCs, PostgreSQL

---

## Task 1: Fix opening_notes NULL a la creation

**Probleme:** `useAgDraftAutoCreate` cree un ag_meetings sans `opening_notes`. Si l'utilisateur ne modifie rien sur l'etape 1 et passe a l'etape 2, opening_notes reste NULL. La finalisation ne trouve pas les postes budgetaires.

**Files:**
- Modify: `src/hooks/modules/useAgDraftEdit.ts:396-410`

**Step 1: Ajouter opening_notes dans l'insert de useAgDraftAutoCreate**

Dans la fonction `useAgDraftAutoCreate`, modifier l'objet `newDraft` pour inclure les metadata initiales :

```typescript
const newDraft = {
  copro_id: currentCoproId,
  title: `AG ${new Date().toLocaleDateString('fr-FR')}`,
  meeting_type: 'ordinary',
  meeting_date: getDefaultMeetingDate(),
  status: 'draft',
  opening_notes: serializeMetadata(INITIAL_FORM_DATA),
};
```

La fonction `serializeMetadata` et la constante `INITIAL_FORM_DATA` sont deja definies dans le meme fichier.

**Step 2: Ajouter flush() avant navigation dans useAgNewPage**

- Modify: `src/features/ag/new/hooks/useAgNewPage.ts:180-222`

Dans `handleSubmit`, ajouter un appel explicite a `save()` avant la navigation :

```typescript
// Ajouter dans la destructuration de useAgDraftEdit :
const { ..., save } = useAgDraftEdit(draftId);

// Dans handleSubmit, juste avant router.push :
await save();
router.push(`/ag/${draftId}/agenda`);
```

Cela garantit que meme si aucun champ n'a ete modifie, l'etat courant du formulaire est persiste avant de naviguer.

**Step 3: Verifier le build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build OK, aucune erreur TypeScript

**Step 4: Commit**

```bash
git add src/hooks/modules/useAgDraftEdit.ts src/features/ag/new/hooks/useAgNewPage.ts
git commit -m "fix(ag): persist opening_notes at draft creation + flush before navigation"
```

---

## Task 2: Fix RPC generate_calls_from_ag_payload

**Probleme:** La RPC fait `SELECT id, total_amount, period_id FROM budgets` mais la table `budgets` n'a pas de colonne `total_amount`. Le total doit etre calcule depuis `SUM(budget_lines.amount)`.

**Erreur constatee:** `SCHEDULE_BUDGET_PAYMENTS` et `SCHEDULE_ALUR_PAYMENTS` echouent avec `"column total_amount does not exist"`.

**Step 1: Corriger la RPC via migration Supabase**

Remplacer la ligne :
```sql
SELECT id, total_amount, period_id INTO v_budget_id, v_total, v_period_id
FROM budgets
WHERE source_ag_id = p_ag_id
  AND copro_id = p_copro_id
  AND status IN ('draft_from_ag', 'validated')
ORDER BY created_at DESC
LIMIT 1;
```

Par :
```sql
SELECT b.id, COALESCE(SUM(bl.amount), 0), b.period_id
INTO v_budget_id, v_total, v_period_id
FROM budgets b
LEFT JOIN budget_lines bl ON bl.budget_id = b.id
WHERE b.source_ag_id = p_ag_id
  AND b.copro_id = p_copro_id
  AND b.status IN ('draft_from_ag', 'validated')
GROUP BY b.id, b.period_id
ORDER BY b.created_at DESC
LIMIT 1;
```

Appliquer via Supabase MCP `apply_migration` ou `execute_sql`.

**Step 2: Tester la RPC corrigee**

Run SQL sur Supabase :
```sql
-- Reset les actions failed pour re-tester
UPDATE ag_pending_actions
SET status = 'pending', error_message = NULL
WHERE ag_id = '97903758-da07-4583-b01c-ac0e36af592b'
  AND status = 'failed';
```

Puis appeler `activate_ag_decisions` pour verifier que les appels de fonds se creent.

**Step 3: Commit migration**

```bash
git commit -m "fix(db): generate_calls_from_ag_payload — compute total from budget_lines"
```

---

## Task 3: Test E2E budget creation via SQL

**But:** Valider que `create_budget_from_ag` cree correctement un budget avec des postes enrichis (account_id + repartition_key_id).

**Step 1: Creer un AG de test avec opening_notes peuplees**

```sql
-- Inserer une AG de test
INSERT INTO ag_meetings (copro_id, title, meeting_type, meeting_date, status, opening_notes)
VALUES (
  '11111111-aaaa-bbbb-cccc-111111111111',
  'AG Test Budget E2E',
  'ordinary',
  NOW() + INTERVAL '30 days',
  'draft',
  '{"budget":true,"budgetExercice":"2027","budgetPostes":[{"id":"1","poste":"Eau","montant":5000},{"id":"2","poste":"Assurance","montant":8000},{"id":"3","poste":"Ascenseur","montant":3500}]}'
)
RETURNING id;
```

Noter le UUID retourne pour les etapes suivantes.

**Step 2: Appeler create_budget_from_ag avec postes enrichis**

Utiliser les vrais account_id et repartition_key_id de la copro :

```sql
-- D'abord trouver les IDs des comptes et cles
SELECT id, code, name FROM accounts
WHERE copro_id = '11111111-aaaa-bbbb-cccc-111111111111' AND is_active = true
ORDER BY code;

SELECT id, name FROM repartition_keys
WHERE copro_id = '11111111-aaaa-bbbb-cccc-111111111111' AND is_active = true;
```

Puis appeler la RPC avec les postes enrichis :

```sql
SELECT create_budget_from_ag(
  '<AG_ID>',
  2027,
  '[
    {"label":"Eau","amount":5000,"sort_order":0,"account_id":"<ACCOUNT_605>","repartition_key_id":"<KEY_EAU>"},
    {"label":"Assurance","amount":8000,"sort_order":1,"account_id":"<ACCOUNT_608>","repartition_key_id":"<KEY_GENERALE>"},
    {"label":"Ascenseur","amount":3500,"sort_order":2,"account_id":"<ACCOUNT_604>","repartition_key_id":"<KEY_ASCENSEUR>"}
  ]'::jsonb
);
```

**Step 3: Verifier le resultat**

```sql
-- Verifier le budget cree
SELECT id, name, status, source_ag_id FROM budgets WHERE source_ag_id = '<AG_ID>';

-- Verifier les budget_lines avec comptes et cles
SELECT bl.label, bl.amount, bl.sort_order, a.code as account_code, rk.name as key_name
FROM budget_lines bl
LEFT JOIN accounts a ON a.id = bl.account_id
LEFT JOIN repartition_keys rk ON rk.id = bl.repartition_key_id
WHERE bl.budget_id = '<BUDGET_ID>'
ORDER BY bl.sort_order;
```

Expected: 3 lignes avec les bons comptes et cles de repartition.

**Step 4: Nettoyer les donnees de test**

```sql
DELETE FROM budgets WHERE source_ag_id = '<AG_ID>';
DELETE FROM ag_meetings WHERE id = '<AG_ID>';
```

---

## Task 4: Verifier BlocBudget UI avec opening_notes

**But:** S'assurer que le composant BlocBudget charge bien les postes depuis opening_notes et les affiche correctement.

**Step 1: Verifier le code existant**

- Lire: `src/features/ag/finalisation/components/BlocBudget.tsx:40-78`

Le composant charge deja `opening_notes` et mappe les postes vers `BlocPoste[]`. Verifier que le mapping `accountId -> account_id` et `repartitionKeyId -> repartition_key_id` est correct (ligne 58-63).

**Step 2: Verifier le build final**

Run: `npx next build 2>&1 | tail -5`
Expected: Build OK

**Step 3: Commit final + push**

```bash
git push origin main
```
