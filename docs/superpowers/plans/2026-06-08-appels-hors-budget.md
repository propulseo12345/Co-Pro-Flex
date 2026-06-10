# Appels de fonds hors budget — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline) ou subagent-driven-development. Steps en checkbox (`- [ ]`).

**Goal:** Ajouter un mode « appel hors budget » (exceptionnel/travaux → 450-2/702 ; avance art.35 → 450-3/1031) et rebrancher le wizard appels-fonds sur le schéma cible, en réutilisant le cœur de ventilation existant.

**Architecture :** Migration `0037` — extraire un helper `_post_call_distribute` (ventilation lot×clé + écriture GL), réécrire `post_budget_call_for_funds` pour l'appeler (non-régression prouvée par boucle d'or 0029), ajouter `post_exceptional_call_for_funds`. Puis front (wizard 2 modes, api, edge) + régénération des types.

**Tech Stack :** Postgres/PLpgSQL (Supabase migrations), psql gates, Next.js/TS, vitest, tsc.

Réf : `docs/superpowers/specs/2026-06-08-appels-hors-budget-design.md`, `docs/claude/catalogue-finance.md`. Source ventilation à extraire : `supabase/migrations/0026_rpc_appels_paiements.sql:540-600`.

---

## Phase 1 — Backend (migration 0037)

### Task 1 : Helper `_post_call_distribute` + réécriture `post_budget_call_for_funds`

**Files:**
- Create: `supabase/migrations/0037_rpc_appels_hors_budget.sql`

- [ ] **Step 1 — Écrire le helper** `_post_call_distribute(p_copro_id uuid, p_period_id uuid, p_call_id uuid, p_debit_acct uuid, p_credit_acct uuid, p_key_amounts jsonb, p_label text) returns jsonb` : déplie `p_key_amounts` `[{key_id, target_amount}]`, insère `call_for_funds_lines` par (lot×clé) en arrondi cumulatif (copier la sous-requête 0026:543-574 en remplaçant `budget_by_key`/`target` par un `jsonb_to_recordset(p_key_amounts)`), construit les entrées GL (D `p_debit_acct`/lot agrégé ; C `p_credit_acct` total), `create_ledger_transaction(..., true)`, `update call_for_funds.ledger_tx_id`. SECURITY DEFINER, search_path public, revoke public/anon + grant authenticated/service_role.
- [ ] **Step 2 — Réécrire `post_budget_call_for_funds`** (CREATE OR REPLACE) : garder le calcul nature/contrepartie + `budget_by_key` × fraction/échéance + gardes clés ; insérer l'en-tête `call_for_funds` ; remplacer le bloc lignes+GL (0026:540-600) par un appel `_post_call_distribute(p_copro_id, p_period_id, v_call_id, v_debit_acct, v_credit_acct, <key_amounts depuis budget_by_key×fraction>, p_label)`. Retour inchangé.
- [ ] **Step 3 — Appliquer** : `npx --no-install supabase db reset` → attendre succès migrations.
  Vérif : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -tAc "select count(*) from supabase_migrations.schema_migrations"` = 37.
- [ ] **Step 4 — Non-régression budget (boucle d'or 0029)** : `docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres -f - < .planning/gate_0029.sql` (ou le harnais boucle d'or existant) → doit rester VERT (prouve `post_budget_call_for_funds` inchangée).
- [ ] **Step 5 — Commit** : `git add supabase/migrations/0037_rpc_appels_hors_budget.sql && git commit` (`refactor(db): 0037 extrait _post_call_distribute, post_budget inchangee`).

### Task 2 : `post_exceptional_call_for_funds`

**Files:**
- Modify: `supabase/migrations/0037_rpc_appels_hors_budget.sql`
- Create: `.planning/gate_0037.sql`

- [ ] **Step 1 — Gate RED** : écrire `gate_0037.sql` qui (a) seede `provision_demo_tenant()`, (b) appelle `post_exceptional_call_for_funds(copro, period, 'exceptional', <clé générale>, 1200.00, 'Ravalement', issue, due)` et vérifie : appel créé, écriture GL équilibrée, débit sur 450-2, crédit sur 702, Σ lignes = 1200 ; (c) idem `'advance'` → 450-3 / 1031 ; (d) montant ≤ 0 → erreur.
- [ ] **Step 2 — Lancer le gate → FAIL** : `... -f - < .planning/gate_0037.sql` → échoue (fonction inexistante).
- [ ] **Step 3 — Implémenter** `post_exceptional_call_for_funds(...)` dans 0037 : map `p_kind`→(nature, code contrepartie) ; gardes (`p_amount>0`, clé complète) ; résout débit/crédit ; insère en-tête `call_for_funds` (budget_id null, repartition_key_id=p_key, total=p_amount, status 'issued') ; appelle `_post_call_distribute(..., jsonb_build_array(jsonb_build_object('key_id',p_key,'target_amount',p_amount)), p_label)`. revoke/grant. CREATE OR REPLACE.
- [ ] **Step 4 — db reset + gate → PASS** : `npx --no-install supabase db reset` puis `... -f - < .planning/gate_0037.sql` → « GATE 0037 OK ».
- [ ] **Step 5 — Commit** : `feat(db): post_exceptional_call_for_funds (appels hors budget 702/1031)`.

## Phase 2 — Front

### Task 3 : API `lib/finance/api.ts`

**Files:**
- Modify: `src/lib/finance/api.ts` (createCall → split), `src/hooks/modules/useFinanceData.ts:389`, `src/features/finance/appels-fonds/hooks/*`

- [ ] **Step 1** — Remplacer `createCall`/`CreateCallPayload` par : `createExceptionalCall(payload: ExceptionalCallPayload)` → `rpc('post_exceptional_call_for_funds', {...})` ; et `createBudgetCall(payload)` → `rpc('post_budget_call_for_funds', {...})` (boucle échéances côté wizard). Supprimer toute référence à `post_call_for_funds`.
- [ ] **Step 2** — `tsc --noEmit` → corriger les appelants (useFinanceData, useCreateCallWizard, useAppelsFondsActions).
- [ ] **Step 3** — Commit `feat(finance): api appels budget/hors-budget sur RPC cibles`.

### Task 4 : Wizard 2 modes

**Files:**
- Modify: `src/features/finance/appels-fonds/hooks/useCreateCallWizard.ts` + composants du wizard

- [ ] **Step 1** — Ajouter `mode: 'budget' | 'hors_budget'` au state. Mode budget : sélection budget + échéancier → `createBudgetCall` par échéance. Mode hors budget : `kind` (exceptionnel/travaux | avance) + clé + montant + due_date → `createExceptionalCall`. Retirer la saisie « montant libre » du chemin budget.
- [ ] **Step 2** — `tsc --noEmit` 0 + `npm test` (78+) verts.
- [ ] **Step 3** — Commit `feat(finance): wizard appels 2 modes (budget / hors budget)`.

### Task 5 : Edge + types

**Files:**
- Modify: `supabase/functions/generate_call_for_funds/index.ts`, `src/types/supabase.ts`

- [ ] **Step 1** — Rebrancher l'edge sur la/les RPC cibles (ou la déprécier si le front appelle les RPC directement — décider en lisant ses appelants).
- [ ] **Step 2** — Régénérer les types : `npx --no-install supabase gen types typescript --local > src/types/supabase.ts` (retire `post_call_for_funds` stale, ajoute `post_exceptional_call_for_funds`). `tsc --noEmit` 0.
- [ ] **Step 3** — Commit `chore(finance): edge generate_call_for_funds + regen types`.

## Vérification finale
- `db reset` 0001→0037 propre · boucle d'or 0029 verte · gate_0037 vert · vitest verts · tsc 0.
