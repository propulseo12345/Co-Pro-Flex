# Plan A — Socle DB reprise (Pivots 3 + 1 + `source_type opening_onboarding`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser le socle base de données de la reprise de soldes, **non régressif**, qui débloque le moteur (Plan B) : régulariser l'enum `account_type`, isoler le solde par lot aux comptes 450/459, et introduire le `source_type` dédié `opening_onboarding` (avec exemption d'immutabilité et rétro‑compat) pour que la clôture ne détruise jamais la reprise.

**Architecture :** 3 migrations DB idempotentes + tests SQL en blocs `DO` auto‑rollback (joués via le MCP Supabase `execute_sql`). Aucune modification de `open_next_period` (il ignore `opening_onboarding` par construction). Le tout prouvé par : `db reset` (repro), non‑régression de la boucle d'or 22222222, et un test de cycle de vie reprise→clôture.

**Tech Stack :** PostgreSQL (Supabase, projet cloud `iyfesbjnkpynmwlsmxnp`), migrations SQL, MCP Supabase (`apply_migration`, `execute_sql`).

**Référence :** spec `docs/superpowers/specs/2026-06-03-reprise-soldes-onboarding-design.md` (§3.5, §5, §8, §10).

---

## Conventions d'exécution (lire avant de commencer)

- **GO explicite OBLIGATOIRE** avant chaque `apply_migration` sur `iyfesbjnkpynmwlsmxnp` (règle projet). Demander, attendre le « go ».
- **Lancer un test** = coller le bloc `DO $$ … $$;` dans le MCP `execute_sql` (projet `iyfesbjnkpynmwlsmxnp`). Les tests se terminent par une exception volontaire `ROLLBACK_TEST_OK` (succès) ou `ASSERT FAIL …` (échec) → **non destructifs**.
- **Lecture de l'échec attendu** : sur `execute_sql`, un test qui passe renvoie l'erreur `ROLLBACK_TEST_OK` ; un test qui échoue renvoie `ASSERT FAIL …`. Avant la migration, le test doit renvoyer `ASSERT FAIL` (TDD).
- Les fichiers de test sont rangés dans `supabase/tests/` **pour archive** ; ils ne sont **pas** branchés à la chaîne de migration (cf. spec I11) — on les exécute via `execute_sql`.
- `tsc`/`build` ne sont pas impactés par ce plan (DB‑only), mais lancer `npm run build` en fin de plan pour garantir la non‑régression des types générés si on régénère `src/types/supabase.ts`.

---

## Task 1 : Pivot 3 — régulariser l'enum `account_type` (`income`)

**Files:**
- Create: `supabase/migrations/20260603090000_v1_6_account_type_income.sql`
- Test: `supabase/tests/20260603090000_account_type_income_test.sql`

**Pourquoi :** le live possède `income` mais aucune migration ne l'ajoute (patché hors‑bande). Un `db reset` propre recrée l'enum sans `income` ; `provision_copro_chart` caste `'income'::account_type` à l'exécution → toute création de copro échoue. La valeur `revenue` (présente, inutilisée) est laissée comme alias mort (la retirer obligerait à recréer le type — YAGNI).

- [ ] **Step 1 — Écrire le test (assertion : `income` présent dans l'enum)**

Create `supabase/tests/20260603090000_account_type_income_test.sql` :

```sql
DO $$
DECLARE v_has_income boolean;
BEGIN
  SELECT 'income' = ANY (enum_range(NULL::public.account_type)::text[]) INTO v_has_income;
  IF NOT v_has_income THEN
    RAISE EXCEPTION 'ASSERT FAIL : account_type ne contient pas income';
  END IF;
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test, vérifier l'état actuel**

Lancer le bloc via `execute_sql` sur `iyfesbjnkpynmwlsmxnp`.
Attendu **sur le live** : `ROLLBACK_TEST_OK` (income existe déjà en live). C'est normal — ce test protège surtout le **reset**. Noter : sur un environnement fraîchement reset (sans le patch hors‑bande), il renverrait `ASSERT FAIL`.

- [ ] **Step 3 — Écrire la migration**

Create `supabase/migrations/20260603090000_v1_6_account_type_income.sql` :

```sql
-- V1.6 — Régularise l'enum account_type : ajoute 'income' (présent en live, jamais
-- ajouté par migration -> un db reset propre échouait sur provision_copro_chart qui
-- caste 'income'). Idempotent. 'revenue' (inutilisé) laissé en alias mort.
-- NB : ADD VALUE IF NOT EXISTS est autorisé en transaction tant que la valeur n'est
-- pas UTILISÉE dans la même transaction (PG 12+). Ici on ne fait qu'ajouter.
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'income';
```

- [ ] **Step 4 — Appliquer la migration (GO requis)**

Demander le GO, puis `apply_migration` (name: `v1_6_account_type_income`, query = contenu du fichier).
Attendu : succès (no‑op sur le live, idempotent).

- [ ] **Step 5 — Rejouer le test**

Lancer le bloc de Step 1 via `execute_sql`.
Attendu : `ROLLBACK_TEST_OK`.

- [ ] **Step 6 — (Repro reset, si stack locale disponible)**

Si un `supabase` local est dispo : `supabase db reset` puis `execute_sql` local de `SELECT provision_copro_chart(gen_random_uuid())` (attendu : l'erreur métier « copropriété introuvable », **pas** une erreur d'enum). Sinon, noter dans le commit que le reset CI reste à vérifier.

- [ ] **Step 7 — Commit**

```bash
git add supabase/migrations/20260603090000_v1_6_account_type_income.sql supabase/tests/20260603090000_account_type_income_test.sql
git commit -m "fix(db): ajoute income a l'enum account_type (repro db reset)"
```

---

## Task 2 : Pivot 1 — solde par lot restreint aux 450/459 + vue « avance par lot »

**Files:**
- Create: `supabase/migrations/20260603091000_v1_6_lot_balance_45x_only.sql`
- Test: `supabase/tests/20260603091000_lot_balance_45x_test.sql`

**Pourquoi :** `v_lot_balance` agrège aujourd'hui **toute** écriture `WHERE lot_id IS NOT NULL` sans filtre de code. Quand le moteur (Plan B) postera l'avance **103 par lot**, elle polluerait le « solde du copropriétaire » (annuaire/AG/votes). On restreint `v_lot_balance` aux comptes `450%`/`459%` (la créance individualisée) et on expose le 103/lot via une vue dédiée. **Non régressif** : 0 écriture 103/105 par lot aujourd'hui (vérifié, dont 22222222).

- [ ] **Step 1 — Écrire le test (isolation 103 + non‑régression 450)**

Create `supabase/tests/20260603091000_lot_balance_45x_test.sql` :

```sql
DO $$
DECLARE
  v jsonb; v_copro uuid; v_lot uuid; v_period uuid;
  v_acc450 uuid; v_acc103 uuid; v_acc472 uuid;
  v_bal_before numeric; v_bal_after numeric; v_avance numeric;
BEGIN
  v := create_clean_test_copro_seeded('pivot1', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY ref LIMIT 1;
  SELECT id INTO v_acc450 FROM accounts WHERE copro_id = v_copro AND code = '450-1';
  SELECT id INTO v_acc103 FROM accounts WHERE copro_id = v_copro AND code = '103';
  SELECT id INTO v_acc472 FROM accounts WHERE copro_id = v_copro AND code = '472';

  -- solde lot AVANT (référence)
  SELECT COALESCE(balance,0) INTO v_bal_before FROM v_lot_balance WHERE lot_id = v_lot;

  -- poste une avance 103 PAR LOT (équilibrée par 472), via la route canonique
  PERFORM create_ledger_transaction(
    v_copro, v_period, CURRENT_DATE, 'TEST avance 103/lot', 'manual', v_period,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acc103, 'lot_id', v_lot, 'direction','credit','amount',300,'entry_label','avance'),
      jsonb_build_object('account_id', v_acc472, 'direction','debit','amount',300,'entry_label','contrepartie')
    ), true);

  -- solde lot APRÈS : doit être INCHANGÉ (le 103 est exclu de v_lot_balance)
  SELECT COALESCE(balance,0) INTO v_bal_after FROM v_lot_balance WHERE lot_id = v_lot;
  -- la vue dédiée doit, elle, refléter l'avance
  SELECT COALESCE(avance_balance,0) INTO v_avance FROM v_lot_avance WHERE lot_id = v_lot;

  IF abs(v_bal_after - v_bal_before) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_lot_balance pollue par 103 (avant=% apres=%)', v_bal_before, v_bal_after;
  END IF;
  IF abs(v_avance - 300) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_lot_avance ne reflete pas le 103 (=%)', v_avance;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test, vérifier qu'il échoue**

`execute_sql` du bloc.
Attendu : `ASSERT FAIL : v_lot_balance pollue par 103 …` (la vue actuelle inclut le 103) **ou** une erreur « relation v_lot_avance does not exist » (la vue dédiée n'existe pas encore). Les deux confirment que le test échoue avant la migration.

- [ ] **Step 3 — Écrire la migration**

Create `supabase/migrations/20260603091000_v1_6_lot_balance_45x_only.sql` :

```sql
-- V1.6 — Pivot 1 : le solde par lot ne reflète QUE la créance individualisée (450%/459%).
-- Le 103/lot (avance, capital propre) ne doit pas gonfler le solde copropriétaire
-- (annuaire/AG/votes). Il est exposé via une vue dédiée v_lot_avance.
-- Non régressif : 0 écriture 103/105 par lot aujourd'hui.

CREATE OR REPLACE VIEW public.v_lot_balance AS
 SELECT e.copro_id, e.lot_id, l.ref AS lot_ref, l.type AS lot_type, l.tantiemes_generaux,
        lo.coproprietaire_id,
        COALESCE(CASE WHEN c.is_company THEN c.company_name
                      ELSE concat(c.first_name, ' ', c.last_name) END, 'Propriétaire inconnu') AS owner_name,
        c.email AS owner_email,
        sum(CASE WHEN e.direction = 'debit'  THEN e.amount ELSE 0 END) AS total_debit,
        sum(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS total_credit,
        sum(CASE WHEN e.direction = 'debit'  THEN e.amount ELSE 0 END)
          - sum(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END) AS balance,
        count(*) AS entry_count,
        max(t.tx_date) AS last_movement_date
   FROM ledger_entries e
     JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
     JOIN accounts a ON a.id = e.account_id
     JOIN lots l ON l.id = e.lot_id
     LEFT JOIN lot_owners lo ON lo.lot_id = e.lot_id AND lo.end_date IS NULL AND lo.is_primary = true
     LEFT JOIN coproprietaires c ON c.id = lo.coproprietaire_id
  WHERE e.lot_id IS NOT NULL
    AND (a.code LIKE '450%' OR a.code LIKE '459%')   -- Pivot 1 : créance individualisée uniquement
  GROUP BY e.copro_id, e.lot_id, l.ref, l.type, l.tantiemes_generaux,
           lo.coproprietaire_id, c.is_company, c.company_name, c.first_name, c.last_name, c.email;

-- Vue dédiée : avance (103) par lot. Convention : crédit = avance détenue pour le lot (positif).
CREATE OR REPLACE VIEW public.v_lot_avance AS
 SELECT e.copro_id, e.lot_id, l.ref AS lot_ref,
        sum(CASE WHEN e.direction = 'credit' THEN e.amount ELSE -e.amount END) AS avance_balance
   FROM ledger_entries e
     JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
     JOIN accounts a ON a.id = e.account_id
     JOIN lots l ON l.id = e.lot_id
  WHERE e.lot_id IS NOT NULL AND a.code LIKE '103%'
  GROUP BY e.copro_id, e.lot_id, l.ref;

COMMENT ON VIEW public.v_lot_balance IS
  'Solde par lot = créance individualisée (comptes 450%/459%) UNIQUEMENT. Les autres comptes à lot_id (ex. 103 avance) sont exclus et exposés ailleurs (v_lot_avance).';
```

- [ ] **Step 4 — Appliquer la migration (GO requis)**

GO, puis `apply_migration` (name: `v1_6_lot_balance_45x_only`).

> ⚠️ Si `CREATE OR REPLACE VIEW` échoue avec « cannot change name/type of view column » : la liste de colonnes/ordre doit rester identique à l'actuelle (vérifiée : identique ici). Si blocage, `DROP VIEW v_lot_balance CASCADE` puis recréer **et** recréer les vues dépendantes — à éviter ; privilégier le CREATE OR REPLACE.

- [ ] **Step 5 — Rejouer le test**

`execute_sql` du bloc de Step 1.
Attendu : `ROLLBACK_TEST_OK`.

- [ ] **Step 6 — Non‑régression solde affiché**

`execute_sql` :
```sql
SELECT count(*) AS nb_lots, round(sum(balance),2) AS total_creances
FROM v_lot_balance
WHERE copro_id = '22222222-2222-2222-2222-222222222222';
```
(Adapter l'UUID si besoin : `SELECT id FROM copros WHERE name ILIKE '%Clos Saint-Michel%'`.)
Attendu : mêmes nombres qu'avant la migration (aucun 103/lot historique → inchangé). Comparer au besoin avec une capture préalable.

- [ ] **Step 7 — Commit**

```bash
git add supabase/migrations/20260603091000_v1_6_lot_balance_45x_only.sql supabase/tests/20260603091000_lot_balance_45x_test.sql
git commit -m "fix(db): solde par lot restreint aux 450/459 + vue v_lot_avance (Pivot 1)"
```

---

## Task 3 : `source_type opening_onboarding` (contrainte + index + exemption + rétro‑compat)

**Files:**
- Create: `supabase/migrations/20260603092000_v1_6_opening_onboarding_source_type.sql`
- Test: `supabase/tests/20260603092000_opening_onboarding_lifecycle_test.sql`

**Pourquoi :** la reprise d'onboarding doit porter un `source_type` distinct du report inter‑exercices (`opening_balance`) pour que `open_next_period` ne la **supprime** pas à la clôture (cf. spec §3.5). On ajoute la valeur à la contrainte, un index unique partiel dédié, on étend `is_ledger_regen_exempt` (pour garder l'annule‑et‑repasse), et on re‑type les reprises d'onboarding **existantes** (discriminant : `period_id = source_id`).

- [ ] **Step 1 — Écrire le test (cycle de vie : la reprise survit à la clôture)**

Create `supabase/tests/20260603092000_opening_onboarding_lifecycle_test.sql` :

```sql
DO $$
DECLARE
  v jsonb; v_copro uuid; v_periodN uuid; v_lot uuid;
  v_acc450 uuid; v_acc472 uuid; v_tx jsonb; v_tx_id uuid;
  v_res jsonb; v_next uuid; v_survives int; v_carry450 numeric;
BEGIN
  v := create_clean_test_copro_seeded('lifecycle', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT id INTO v_periodN FROM accounting_periods WHERE copro_id = v_copro ORDER BY start_date LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY ref LIMIT 1;
  SELECT id INTO v_acc450 FROM accounts WHERE copro_id = v_copro AND code = '450-1';
  SELECT id INTO v_acc472 FROM accounts WHERE copro_id = v_copro AND code = '472';

  -- Reprise d'onboarding (source_type dédié), dans la période N
  v_tx := create_ledger_transaction(
    v_copro, v_periodN, CURRENT_DATE, 'Reprise onboarding TEST', 'opening_onboarding', v_periodN,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acc450, 'lot_id', v_lot, 'direction','debit','amount',500,'entry_label','solde ouverture'),
      jsonb_build_object('account_id', v_acc472, 'direction','credit','amount',500,'entry_label','attente')
    ), true);
  IF NOT coalesce((v_tx->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : creation reprise onboarding KO : %', v_tx;
  END IF;
  v_tx_id := (v_tx->>'tx_id')::uuid;

  -- Clôturer N puis ouvrir N+1
  PERFORM close_period(v_copro, v_periodN);
  v_res := open_next_period(v_copro, v_periodN);
  IF NOT coalesce((v_res->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : open_next_period KO : %', v_res;
  END IF;
  v_next := (v_res->>'next_period_id')::uuid;

  -- 1) la reprise d'onboarding NE doit PAS avoir été supprimée
  SELECT count(*) INTO v_survives FROM ledger_transactions WHERE id = v_tx_id;
  IF v_survives <> 1 THEN
    RAISE EXCEPTION 'ASSERT FAIL : la reprise onboarding a ete supprimee par open_next_period';
  END IF;

  -- 2) son solde 450/lot doit avoir ete reporte dans N+1 (report a-nouveau)
  SELECT round(COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2)
    INTO v_carry450
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.period_id=v_next AND e.account_id=v_acc450 AND e.lot_id=v_lot;
  IF v_carry450 < 499.99 THEN
    RAISE EXCEPTION 'ASSERT FAIL : solde ouverture 450/lot non reporte en N+1 (=%)', v_carry450;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test, vérifier qu'il échoue**

`execute_sql` du bloc.
Attendu : échec — soit `new row ... violates check constraint ledger_transactions_source_type_check` (la valeur `opening_onboarding` n'est pas encore autorisée), confirmant que le test échoue avant la migration.

- [ ] **Step 3 — Écrire la migration**

Create `supabase/migrations/20260603092000_v1_6_opening_onboarding_source_type.sql` :

```sql
-- V1.6 — source_type dédié 'opening_onboarding' pour la reprise de mandat.
-- Distinct de 'opening_balance' (report inter-exercices par open_next_period), pour
-- que la clôture ne supprime jamais la reprise d'onboarding. Cf. spec §3.5.

-- 1) Autoriser la nouvelle valeur (reprendre la liste live a l'identique + opening_onboarding)
ALTER TABLE public.ledger_transactions
  DROP CONSTRAINT IF EXISTS ledger_transactions_source_type_check;
ALTER TABLE public.ledger_transactions
  ADD CONSTRAINT ledger_transactions_source_type_check
  CHECK (
    source_type IS NULL OR source_type = ANY (ARRAY[
      'budget', 'budget_expense', 'call_for_funds', 'payment',
      'supplier_invoice', 'supplier_payment', 'bank_movement',
      'transfer', 'od', 'opening', 'closing', 'manual',
      'opening_balance', 'opening_onboarding'
    ])
  );

-- 2) Index unique partiel dédié (au plus 1 reprise d'onboarding par copro/période)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_tx_opening_onboarding
  ON public.ledger_transactions (copro_id, source_id)
  WHERE source_type = 'opening_onboarding';

-- 3) Étendre l'exemption d'immutabilité au nouveau source_type (garde l'annule-et-repasse)
CREATE OR REPLACE FUNCTION public.is_ledger_regen_exempt(
  p_source_type text, p_source_id uuid, p_posting_period_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT p_source_type IN ('opening_balance','closing','opening_onboarding')
     AND p_source_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM accounting_periods ap
                 WHERE ap.id = p_source_id AND ap.status <> 'approved')
     AND EXISTS (SELECT 1 FROM accounting_periods ap
                 WHERE ap.id = p_posting_period_id AND ap.status <> 'approved');
$$;

-- 4) Rétro-compat : re-typer les reprises d'onboarding EXISTANTES.
-- Discriminant : une reprise d'onboarding vit DANS sa période source (period_id = source_id),
-- alors qu'un report inter-exercices vit dans N+1 (period_id <> source_id).
-- Autorisé par l'exemption tant que la période n'est pas 'approved' (sinon ignorée : déjà figée).
UPDATE public.ledger_transactions t
   SET source_type = 'opening_onboarding'
 WHERE t.source_type = 'opening_balance'
   AND t.period_id = t.source_id
   AND EXISTS (SELECT 1 FROM accounting_periods ap
               WHERE ap.id = t.period_id AND ap.status <> 'approved');

COMMENT ON INDEX public.uq_ledger_tx_opening_onboarding IS
  'Au plus une reprise de mandat (opening_onboarding) par copro/période. Distinct du report inter-exercices (opening_balance).';
```

- [ ] **Step 4 — Appliquer la migration (GO requis)**

GO, puis `apply_migration` (name: `v1_6_opening_onboarding_source_type`).

- [ ] **Step 5 — Rejouer le test de cycle de vie**

`execute_sql` du bloc de Step 1.
Attendu : `ROLLBACK_TEST_OK` (la reprise survit à la clôture **et** son 450/lot est reporté en N+1).

- [ ] **Step 6 — Vérifier la rétro‑compat (copros déjà onboardées, périodes ouvertes)**

`execute_sql` :
```sql
SELECT count(*) AS reprises_onboarding_existantes
FROM ledger_transactions
WHERE source_type = 'opening_onboarding';
```
Attendu : ≥ 0 (le nombre de reprises d'onboarding historiques re‑typées ; 0 si aucune copro n'avait encore de reprise). Vérifier qu'aucune reste en `opening_balance` avec `period_id = source_id` sur une période ouverte :
```sql
SELECT count(*) AS restantes_a_retyper
FROM ledger_transactions t
WHERE t.source_type='opening_balance' AND t.period_id=t.source_id
  AND EXISTS (SELECT 1 FROM accounting_periods ap WHERE ap.id=t.period_id AND ap.status<>'approved');
```
Attendu : `0`.

- [ ] **Step 7 — Commit**

```bash
git add supabase/migrations/20260603092000_v1_6_opening_onboarding_source_type.sql supabase/tests/20260603092000_opening_onboarding_lifecycle_test.sql
git commit -m "feat(db): source_type opening_onboarding (index + exemption + retro-compat)"
```

---

## Task 4 : Acceptation socle — non‑régression boucle d'or + acceptation existante

**Files:**
- Test: `supabase/tests/20260603093000_socle_acceptance_test.sql` (archive ; joué via `execute_sql`)

**Pourquoi :** garantir que les 3 migrations n'ont rien cassé : la boucle d'or 22222222 et l'acceptation `create_clean_test_copro_seeded` restent à **0 écart**.

- [ ] **Step 1 — Acceptation copro propre = 0 écart**

`execute_sql` :
```sql
DO $$
DECLARE v jsonb; v_copro uuid; v_issues int; v_wait numeric;
BEGIN
  v := create_clean_test_copro_seeded('socle-acc', 15000, 2);
  v_copro := (v->>'copro_id')::uuid;
  SELECT count(*) INTO v_issues FROM audit_finance_integrity(v_copro);
  SELECT COALESCE(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  RAISE EXCEPTION 'PROOF issues=% wait=%', v_issues, v_wait;
END $$;
```
Attendu : `PROOF issues=0 wait=0`.

- [ ] **Step 2 — Non‑régression boucle d'or 22222222**

`execute_sql` :
```sql
SELECT count(*) AS ecarts_attendus_g3
FROM audit_finance_integrity('22222222-2222-2222-2222-222222222222');
```
Attendu : le **même** nombre d'anomalies qu'avant le plan (cadre G3 : artefacts historiques connus). Comparer à la valeur de référence notée avant Task 1. **Aucune nouvelle anomalie** ne doit apparaître du fait des migrations.

- [ ] **Step 3 — Build (types)**

Si `src/types/supabase.ts` est régénéré (nouvelle valeur d'enum / vue) :
```bash
npm run build
```
Attendu : exit 0.

- [ ] **Step 4 — Commit (archive test)**

```bash
git add supabase/tests/20260603093000_socle_acceptance_test.sql
git commit -m "test(db): acceptation socle reprise (0 ecart + non-regression boucle d'or)"
```

---

## Self-Review (rempli)

**1. Couverture spec :** Pivot 3 → Task 1 ✓ ; Pivot 1 (v_lot_balance 450/459 + vue avance) → Task 2 ✓ ; `source_type opening_onboarding` + index + `is_ledger_regen_exempt` + rétro‑compat (I16) → Task 3 ✓ ; cycle de vie reprise→clôture (I1) → Task 3 Step 1 ✓ ; non‑régression boucle d'or + acceptation → Task 4 ✓. Hors périmètre de ce plan (B/C/D) : moteur `set_opening_balance`, période/`exercice_debut` (B6), `listComptesBancaires` (B5), Pivot 2 / verrou, écran, alerte, I5/I6/I7 — couverts par Plans B‑D.

**2. Placeholders :** aucun « TBD/TODO » ; tout le SQL est complet (migrations + tests).

**3. Cohérence des types :** `is_ledger_regen_exempt(text, uuid, uuid)` repris à l'identique + valeur ajoutée ; contrainte `source_type` reprise à l'identique (13 valeurs) + `opening_onboarding` ; colonnes de `v_lot_balance` inchangées (CREATE OR REPLACE sûr) ; `create_ledger_transaction(copro, period, date, label, source_type, source_id, entries, auto_post)` utilisé conformément à la signature live.

**Dépendances :** Task 2 et Task 3 utilisent `create_clean_test_copro_seeded`, `create_ledger_transaction`, `close_period`, `open_next_period` (tous présents en base). Task 1 doit précéder toute création de copro sur un env reset.

---

## Suite

Plans **B** (moteur `set_opening_balance`/`get_opening_balance` + période `exercice_debut` + `listComptesBancaires`), **C** (Pivot 2 + verrou étape 8), **D** (écran `RepriseSoldes` + wizard post‑as‑you‑go + alerte) — à écrire après validation/exécution du Plan A.
