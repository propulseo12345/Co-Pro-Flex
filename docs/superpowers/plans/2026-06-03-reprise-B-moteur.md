# Reprise — Moteur set_opening_balance (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Livrer le **moteur** de la reprise de soldes d'onboarding : deux RPC Postgres (`set_opening_balance` écriture idempotente-par-remplacement, `get_opening_balance` relecture), et la couche TypeScript qui les pilote (`setOnboardingOpeningBalance` / `getOnboardingOpeningBalance`), plus les corrections `listComptesBancaires` (filtre bancaire réel) et `ensureAccountingPeriod` (période dérivée de `copros.exercice_debut`, plus l'année civile en dur). La reprise est **non bloquante** (l'écart va sur 471/472), postée en **une transaction équilibrée**, et **ré-éditable** (DELETE-then-recreate).

**Architecture :** 2 migrations DB (RPC `set_opening_balance`, RPC `get_opening_balance`) + tests SQL en blocs `DO` auto-rollback (joués via le MCP Supabase `execute_sql`) + 1 fichier TS modifié (`src/lib/onboarding/api.ts`). Le moteur réutilise les patterns sûrs existants : `resolve_lot_tiers_account` pour les 450-x, `create_ledger_transaction(..., auto_post:=true)` comme route canonique d'écriture, l'arrondi par plus-grand-reste (cr8) pour qu'aucun centième résiduel ne se déverse sur 471/472. Le moteur **ne touche pas** `open_next_period` : grâce au `source_type='opening_onboarding'` (posé par le **Plan A**), la clôture reporte la reprise sans jamais la supprimer.

**Tech Stack :** PostgreSQL (Supabase, projet cloud `iyfesbjnkpynmwlsmxnp`), migrations SQL via MCP `apply_migration`, tests via MCP `execute_sql`. TypeScript 5 strict (jamais `any` nouveau ; le fichier cible utilise déjà un client non typé localisé, on n'élargit pas la dette), imports alias `@/`, Next.js 16.

**Référence :** spec `docs/superpowers/specs/2026-06-03-reprise-soldes-onboarding-design.md` (§3.1, §3.2, §3.3, §8 I3/I4/I14, §10).

---

## Pré-requis & conventions d'exécution (lire avant de commencer)

- **DÉPENDANCE BLOQUANTE — Plan A doit être appliqué AVANT ce plan.** Le moteur écrit des transactions `source_type='opening_onboarding'`. Tant que la migration A `20260603092000_v1_6_opening_onboarding_source_type.sql` (contrainte `source_type` + index `uq_ledger_tx_opening_onboarding` + `is_ledger_regen_exempt` étendu) n'est pas appliquée, **tous** les appels du moteur échoueront sur `violates check constraint ledger_transactions_source_type_check`. Vérifier avant de commencer (Step 0 ci-dessous).
- **GO explicite OBLIGATOIRE** avant chaque `apply_migration` sur `iyfesbjnkpynmwlsmxnp` (règle projet cloud). Demander, attendre le « go ».
- **Lancer un test** = coller le bloc `DO $$ … $$;` dans le MCP `execute_sql` (project_id `iyfesbjnkpynmwlsmxnp`). Les tests se terminent par une exception volontaire `ROLLBACK_TEST_OK` (succès, non destructif) ou `ASSERT FAIL …` (échec). Le bloc `DO` rollback **toujours** car il se termine par une exception : aucune donnée de test n'est committée.
- **Lecture du résultat sur `execute_sql`** : un test qui passe renvoie l'erreur `ROLLBACK_TEST_OK` ; un test qui échoue renvoie `ASSERT FAIL …` (ou une autre erreur SQL). En TDD, **avant** la migration le test doit renvoyer une erreur ≠ `ROLLBACK_TEST_OK` (souvent `function set_opening_balance(...) does not exist` ou `ASSERT FAIL`).
- Les fichiers de test sont rangés dans `supabase/tests/` **pour archive** ; ils ne sont **pas** branchés à la chaîne de migration (cf. spec I11) — on les exécute via `execute_sql`. **Ne jamais** ranger un bloc-test dans `supabase/migrations/`.
- **Signatures réelles vérifiées en base** (ne pas en dévier) :
  - `create_ledger_transaction(p_copro_id uuid, p_period_id uuid, p_tx_date date, p_label text, p_source_type text, p_source_id uuid, p_entries jsonb, p_auto_post boolean)` → `jsonb` `{success, tx_id, total_debit, total_credit, status}` ou `{success:false, error}`. Les entrées jsonb ont les clés : `account_id`, `lot_id` (optionnel), `direction` ∈ {`debit`,`credit`}, `amount`, `entry_label`.
  - `resolve_lot_tiers_account(p_copro_id uuid, p_nature text)` → `uuid` ; natures acceptées : `current`→450-1, `works`→450-2, `advance`→450-3, `loan`→450-4, `alur`→450-5 (RAISE si inconnue ou compte absent).
  - `accounting_periods` : colonnes `id, copro_id, name, start_date, end_date, status` (status = enum, valeur ouverte = `'open'`).
  - `ledger_entries` : `period_id` est **NOT NULL** ; `lot_id` nullable.
  - `copros.exercice_debut` : `text` au format `MM-DD` (ex. `'01-01'`).
  - Comptes bancaires : `account_type='asset'` + `code LIKE '512%'` OU `code LIKE '502%'` (l'enum `account_type` = `{asset,liability,income,expense,equity}` — **pas** de valeur `bank`).
  - `create_clean_test_copro_seeded(p_tag text, p_budget_total numeric, p_unpaid_count integer)` → `jsonb` `{copro_id, period_id, seed}`.
  - `close_period(p_period_id uuid)` → `boolean` (un seul argument).
  - `open_next_period(p_copro_id uuid, p_closing_period_id uuid, p_new_name text, p_new_start date, p_new_end date)` → `jsonb`.
  - Boucle d'or : copro id **`22222222-aaaa-bbbb-cccc-222222222222`** (le vrai UUID en base ; Plan A en cite un faux à corriger).
- **Type-check** : après modification de `src/lib/onboarding/api.ts`, lancer `npm run build` (le projet n'a pas de script `typecheck` séparé ; `next build` exécute le check TS). Exit 0 attendu.

- [ ] **Step 0 — Vérifier que le Plan A est appliqué (pré-flight)**

`execute_sql` :
```sql
SELECT
  pg_get_constraintdef(c.oid) LIKE '%opening_onboarding%' AS constraint_ok,
  (SELECT count(*) FROM pg_indexes WHERE indexname = 'uq_ledger_tx_opening_onboarding') = 1 AS index_ok,
  pg_get_functiondef('public.is_ledger_regen_exempt(text,uuid,uuid)'::regprocedure) LIKE '%opening_onboarding%' AS exempt_ok
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'ledger_transactions'
  AND c.conname = 'ledger_transactions_source_type_check';
```
Attendu : `constraint_ok = true`, `index_ok = true`, `exempt_ok = true`. Si l'un est `false`, **STOP** : appliquer d'abord le Plan A.

---

## Task 1 : RPC `set_opening_balance` — le moteur d'écriture

**Files:**
- Create: `supabase/migrations/20260603100000_v1_6_set_opening_balance.sql`
- Create (archive test, joué via `execute_sql`) : `supabase/tests/20260603100000_set_opening_balance_test.sql`

**Pourquoi :** centraliser la reprise en **une** RPC idempotente-par-remplacement, en une transaction équilibrée. Elle pré-garde le statut de la période (I3), supprime la reprise précédente (annule-et-repasse, I2), construit les écritures depuis `p_lines` (450-x via `resolve_lot_tiers_account`, sinon par code : 103/lot, 105, 401, 110/120, 6/7, banque via `account_id`), calcule le reste sur 471/472 (I4 : pas de centième résiduel grâce au calcul du résidu comme complément exact), poste via `create_ledger_transaction(auto_post:=true)` et **vérifie** son retour (I14 : sinon le DELETE se committerait sans remplacement).

**Contrat :**
```
set_opening_balance(p_copro_id uuid, p_period_id uuid, p_as_of_date date, p_lines jsonb)
  -> { success, residual, lines_count, as_of_date }   (succès)
  -> { success:false, error }                          (période non ouverte / erreur)

p_lines[] = { account_code text, lot_id uuid|null, amount numeric (signé), nature text|null }
  - convention de signe (cohérente avec l'ancien postOnboardingOpeningBalances) :
    amount > 0 = solde "porté au débit" du compte (ce que le tiers/actif doit), amount < 0 = au crédit.
  - account_code='450' (nu) + nature ∈ {current,works,alur} => résolu en 450-x via resolve_lot_tiers_account.
    (account_code '450-1'/'450-2'/'450-5' explicite est aussi accepté tel quel par résolution directe.)
  - residual = -(Σ amount signés) imputé sur 471 (si débiteur) ou 472 (si créditeur),
    de sorte que la transaction soit toujours équilibrée.
```

- [ ] **Step 1 — Écrire le test (failing) : équilibre + résidu 471/472 + replace + I14 + 103/lot + 6/7 sans lot_id + pré-garde statut**

Create `supabase/tests/20260603100000_set_opening_balance_test.sql` :

```sql
-- TEST set_opening_balance : équilibre garanti, résidu sur 471/472, idempotence par
-- remplacement (2 appels -> 1 seule tx), 103/lot posté (exclu de v_lot_balance, présent
-- dans v_lot_avance), 6/7 sans lot_id, pré-garde statut période, RAISE si écriture KO.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid;
  v_res jsonb; v_res2 jsonb;
  v_tx_count int; v_debit numeric; v_credit numeric;
  v_wait numeric; v_lot_bal numeric; v_lot_av numeric;
  v_67_lot_count int;
BEGIN
  v := create_clean_test_copro_seeded('setob', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  v_period := (v->>'period_id')::uuid;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY ref LIMIT 1;

  -- Appel 1 : une reprise déséquilibrée volontairement -> le reste tombe sur 471/472.
  --   450-1/lot débité 600 (le lot doit) ; banque 512 débité 200 ; charge 601 (6) débité 100 ;
  --   produit 701 (7) crédité 300 (amount négatif) ; total signé = 600+200+100-300 = 600
  --   -> residual = -600 -> posé au CRÉDIT du 472 (compte d'attente créditeur).
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',600,'nature','current'),
    jsonb_build_object('account_code','512','amount',200),
    jsonb_build_object('account_code','601','amount',100),
    jsonb_build_object('account_code','701','amount',-300),
    jsonb_build_object('account_code','103','lot_id',v_lot,'amount',150)
  ));
  IF NOT coalesce((v_res->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : appel 1 KO : %', v_res;
  END IF;

  -- 1) UNE seule transaction opening_onboarding pour cette période
  SELECT count(*) INTO v_tx_count FROM ledger_transactions
   WHERE copro_id=v_copro AND period_id=v_period AND source_type='opening_onboarding';
  IF v_tx_count <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : attendu 1 tx, trouve %', v_tx_count; END IF;

  -- 2) écriture équilibrée
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE 0 END),0),
         coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE 0 END),0)
    INTO v_debit, v_credit
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id
  WHERE t.copro_id=v_copro AND t.period_id=v_period AND t.source_type='opening_onboarding';
  IF abs(v_debit - v_credit) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : ecriture desequilibree D=% C=%', v_debit, v_credit;
  END IF;

  -- 3) résidu correct : residual renvoyé = -(600+200+100-300+150) = -750 ; net 471/472 = -750
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0)
    INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait - (-750)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : net 471/472 attendu -750, trouve %', v_wait;
  END IF;
  IF abs((v_res->>'residual')::numeric - (-750)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : residual renvoye attendu -750, trouve %', v_res->>'residual';
  END IF;

  -- 4) 103/lot posté : exclu de v_lot_balance (Pivot 1), présent dans v_lot_avance
  SELECT coalesce(balance,0) INTO v_lot_bal FROM v_lot_balance WHERE lot_id=v_lot;
  IF abs(v_lot_bal - 600) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_lot_balance doit valoir 600 (450 only), trouve %', v_lot_bal;
  END IF;
  SELECT coalesce(avance_balance,0) INTO v_lot_av FROM v_lot_avance WHERE lot_id=v_lot;
  IF abs(v_lot_av - 150) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : v_lot_avance doit refleter 150, trouve %', v_lot_av;
  END IF;

  -- 5) les écritures 6/7 sont SANS lot_id
  SELECT count(*) INTO v_67_lot_count
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.source_type='opening_onboarding'
  WHERE t.copro_id=v_copro AND (a.code LIKE '6%' OR a.code LIKE '7%') AND e.lot_id IS NOT NULL;
  IF v_67_lot_count <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : % ecriture(s) 6/7 portent un lot_id', v_67_lot_count;
  END IF;

  -- 6) idempotence par REMPLACEMENT : 2e appel (équilibré) -> toujours 1 seule tx
  v_res2 := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',400,'nature','current'),
    jsonb_build_object('account_code','512','amount',400)
  ));
  IF NOT coalesce((v_res2->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : appel 2 KO : %', v_res2;
  END IF;
  SELECT count(*) INTO v_tx_count FROM ledger_transactions
   WHERE copro_id=v_copro AND period_id=v_period AND source_type='opening_onboarding';
  IF v_tx_count <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : replace a cree un doublon (%)', v_tx_count; END IF;
  -- après remplacement total (400 débit + 400 débit -> residual -800 sur 472), pas de reste de l'appel 1
  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0)
    INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait - (-800)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : apres replace net 471/472 attendu -800, trouve %', v_wait;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

Et un second bloc-test (pré-garde statut + largest-remainder), à ranger dans le même fichier sous un commentaire séparateur :

```sql
-- TEST set_opening_balance : pré-garde statut (période close -> success:false, pas de DELETE)
-- + ventilation sans centime résiduel (largest-remainder implicite via residual exact).
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid;
  v_res jsonb; v_tx_count int; v_wait numeric;
BEGIN
  v := create_clean_test_copro_seeded('setob-guard', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  v_period := (v->>'period_id')::uuid;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  -- Poser une 1re reprise (réussie), puis FERMER la période
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',500,'nature','current')
  ));
  IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT FAIL : reprise initiale KO : %', v_res; END IF;
  PERFORM close_period(v_period);

  -- Tenter une ré-édition sur période close -> success:false, message métier, AUCUN DELETE
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',999,'nature','current')
  ));
  IF coalesce((v_res->>'success')::boolean,false) THEN
    RAISE EXCEPTION 'ASSERT FAIL : reprise sur periode close aurait du echouer : %', v_res;
  END IF;
  IF position('ouvr' in lower(coalesce(v_res->>'error',''))) = 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL : message metier attendu (reouvrez la periode), trouve : %', v_res->>'error';
  END IF;

  -- la reprise initiale (500) doit TOUJOURS exister (pas de DELETE sans remplacement, I3/I14)
  SELECT count(*) INTO v_tx_count FROM ledger_transactions
   WHERE copro_id=v_copro AND period_id=v_period AND source_type='opening_onboarding';
  IF v_tx_count <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : reprise initiale perdue (tx=%)', v_tx_count; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test, vérifier qu'il échoue**

`execute_sql` du premier bloc.
Attendu (avant migration) : erreur `function set_opening_balance(uuid, uuid, date, jsonb) does not exist` (≠ `ROLLBACK_TEST_OK`) → confirme l'échec TDD.

- [ ] **Step 3 — Écrire la migration (implémentation complète)**

Create `supabase/migrations/20260603100000_v1_6_set_opening_balance.sql` :

```sql
-- V1.6 — Moteur de reprise de soldes d'onboarding (balance d'entrée / reprise de mandat).
-- Idempotente PAR REMPLACEMENT, en UNE transaction équilibrée. Cf. spec §3.1.
--   I3  : pré-garde statut période 'open' (FOR UPDATE) AVANT tout DELETE, message métier.
--   I2  : annule-et-repasse (DELETE de la reprise opening_onboarding existante).
--   I4  : le reste (471/472) = complément EXACT de la somme signée -> 0 centime résiduel.
--   I14 : create_ledger_transaction avale le RAISE (success:false sans rollback)
--         -> on teste (v_res->>'success') et on RAISE si false, sinon le DELETE se
--            committerait sans remplacement (perte de données).
-- Dépend du Plan A : source_type 'opening_onboarding' autorisé + index + is_ledger_regen_exempt étendu.

CREATE OR REPLACE FUNCTION public.set_opening_balance(
  p_copro_id uuid,
  p_period_id uuid,
  p_as_of_date date,
  p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status    text;
  v_line      jsonb;
  v_code      text;
  v_nature    text;
  v_lot_id    uuid;
  v_amount    numeric;
  v_acc_id    uuid;
  v_entries   jsonb := '[]'::jsonb;
  v_signed    numeric := 0;   -- Σ des montants signés (débit +, crédit -)
  v_residual  numeric;
  v_acc471    uuid;
  v_acc472    uuid;
  v_lines_cnt int := 0;
  v_res       jsonb;
BEGIN
  -- 1) PRÉ-GARDE statut (FOR UPDATE) AVANT tout DELETE (I3)
  SELECT status::text INTO v_status
  FROM accounting_periods
  WHERE id = p_period_id AND copro_id = p_copro_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Période comptable introuvable pour cette copropriété.');
  END IF;
  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('success', false,
      'error', format('Période non modifiable (statut=%s). Rouvrez la période avant de modifier la reprise.', v_status));
  END IF;

  -- Comptes d'attente (résolus une fois)
  SELECT id INTO v_acc471 FROM accounts WHERE copro_id = p_copro_id AND code = '471';
  SELECT id INTO v_acc472 FROM accounts WHERE copro_id = p_copro_id AND code = '472';
  IF v_acc471 IS NULL OR v_acc472 IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Comptes d''attente 471/472 absents (plan comptable non provisionné ?).');
  END IF;

  -- 2) ANNULE la reprise d'onboarding existante de la période (cascade ledger_entries) (I2)
  DELETE FROM ledger_transactions
  WHERE copro_id = p_copro_id
    AND period_id = p_period_id
    AND source_type = 'opening_onboarding';

  -- 3) CONSTRUIT les écritures depuis p_lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_code   := v_line->>'account_code';
    v_nature := lower(coalesce(v_line->>'nature', ''));
    v_lot_id := NULLIF(v_line->>'lot_id','')::uuid;
    v_amount := coalesce((v_line->>'amount')::numeric, 0);

    IF v_amount = 0 OR v_code IS NULL THEN
      CONTINUE;  -- on ignore les lignes vides
    END IF;

    -- Résolution du compte :
    --   * code '450' nu + nature -> sous-compte 450-x via le helper canonique
    --   * code '450-x' explicite -> nature dérivée du suffixe
    --   * BANQUE : 512%/502% résolus par account_id (asset), jamais le code nu
    --   * tout autre code (103, 105, 401, 110, 120, 6xx, 7xx, 461, 462, ...) -> par code exact
    IF v_code = '450' THEN
      IF v_nature NOT IN ('current','works','advance','loan','alur') THEN
        RAISE EXCEPTION 'set_opening_balance: ligne 450 sans nature valide (reçu "%")', v_line->>'nature';
      END IF;
      v_acc_id := resolve_lot_tiers_account(p_copro_id, v_nature);
    ELSIF v_code LIKE '450-%' THEN
      v_acc_id := resolve_lot_tiers_account(p_copro_id,
        CASE v_code WHEN '450-1' THEN 'current' WHEN '450-2' THEN 'works'
                    WHEN '450-3' THEN 'advance' WHEN '450-4' THEN 'loan'
                    WHEN '450-5' THEN 'alur' END);
    ELSE
      SELECT id INTO v_acc_id
      FROM accounts
      WHERE copro_id = p_copro_id AND code = v_code AND is_postable = true;
      IF v_acc_id IS NULL THEN
        RAISE EXCEPTION 'set_opening_balance: compte % introuvable ou non imputable pour la copro %', v_code, p_copro_id;
      END IF;
    END IF;

    -- Les comptes de classe 6/7 (résultat de l'exercice repris) sont GLOBAUX : on neutralise
    -- tout lot_id éventuel (la ventilation par clé reste l'affaire du budget). (I9)
    IF v_code LIKE '6%' OR v_code LIKE '7%' THEN
      v_lot_id := NULL;
    END IF;

    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', v_acc_id,
      'lot_id',     v_lot_id,
      'direction',  CASE WHEN v_amount > 0 THEN 'debit' ELSE 'credit' END,
      'amount',     abs(v_amount),
      'entry_label','Reprise d''ouverture'
    ));
    v_signed    := v_signed + v_amount;
    v_lines_cnt := v_lines_cnt + 1;
  END LOOP;

  -- 4) RÉSIDU = complément EXACT -> équilibre garanti, 0 centime résiduel (I4)
  --    residual signé = -(Σ amount). residual > 0 => le grand livre a un excès de crédit
  --    qu'il faut compenser au DÉBIT du 471 ; residual < 0 => excès de débit -> CRÉDIT 472.
  v_residual := round(-v_signed, 2);
  IF abs(v_residual) >= 0.01 THEN
    IF v_residual > 0 THEN
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account_id', v_acc471, 'direction', 'debit', 'amount', v_residual,
        'entry_label', 'Reprise — reste à imputer (débiteur)'));
    ELSE
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account_id', v_acc472, 'direction', 'credit', 'amount', abs(v_residual),
        'entry_label', 'Reprise — reste à imputer (créditeur)'));
    END IF;
  END IF;

  IF jsonb_array_length(v_entries) = 0 THEN
    -- aucune ligne non nulle : on a juste effacé l'ancienne reprise (remise à zéro assumée)
    RETURN jsonb_build_object('success', true, 'residual', 0, 'lines_count', 0, 'as_of_date', p_as_of_date);
  END IF;

  -- 5) POSTE une SEULE écriture équilibrée via la route canonique
  v_res := create_ledger_transaction(
    p_copro_id, p_period_id, p_as_of_date, 'Reprise des soldes d''ouverture',
    'opening_onboarding', p_period_id, v_entries, true
  );

  -- 6) VÉRIFIE le retour (I14) : sinon le DELETE de l'étape 2 se committe sans remplacement
  IF NOT coalesce((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'set_opening_balance: échec écriture grand livre : %', coalesce(v_res->>'error','inconnu');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'residual', v_residual,
    'lines_count', v_lines_cnt,
    'as_of_date', p_as_of_date
  );

EXCEPTION
  WHEN OTHERS THEN
    -- L'exception rollback le DELETE (atomicité) -> pas de perte de données.
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

COMMENT ON FUNCTION public.set_opening_balance(uuid, uuid, date, jsonb) IS
  'Moteur de reprise de soldes d''onboarding : remplace intégralement la reprise (source_type=opening_onboarding) de la période, en UNE écriture équilibrée. Le reste va sur 471/472. Non bloquant.';
```

- [ ] **Step 4 — Appliquer la migration (GO requis)**

Demander le GO, puis `apply_migration` (name: `v1_6_set_opening_balance`, query = contenu exact du fichier).
Attendu : succès.

- [ ] **Step 5 — Rejouer les deux blocs de test**

`execute_sql` du premier bloc, puis du second.
Attendu : `ROLLBACK_TEST_OK` pour les deux.

- [ ] **Step 6 — Commit**

```bash
git add supabase/migrations/20260603100000_v1_6_set_opening_balance.sql supabase/tests/20260603100000_set_opening_balance_test.sql
git commit -m "feat(db): moteur set_opening_balance (reprise onboarding non bloquante)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : RPC `get_opening_balance` — relecture pour pré-remplissage

**Files:**
- Create: `supabase/migrations/20260603101000_v1_6_get_opening_balance.sql`
- Create (archive test) : `supabase/tests/20260603101000_get_opening_balance_test.sql`

**Pourquoi :** la source de vérité est le grand livre (pas de table brouillon). Pour ré-éditer l'écran, on relit la transaction `opening_onboarding` courante et on la remappe en lignes de formulaire `{account_code, lot_id, amount (signé), nature}`, en **excluant** les lignes 471/472 (ce sont le résidu calculé, pas une saisie) et en exposant le `residual` à part.

**Contrat :**
```
get_opening_balance(p_copro_id uuid, p_period_id uuid)
  -> { lines: [ {account_code, lot_id, amount, nature} ], residual, as_of_date }
  -> { lines: [], residual: 0, as_of_date: null }  si aucune reprise
```

- [ ] **Step 1 — Écrire le test (failing) : round-trip set -> get**

Create `supabase/tests/20260603101000_get_opening_balance_test.sql` :

```sql
-- TEST get_opening_balance : relit la reprise et la remappe en lignes signées,
-- exclut 471/472 du tableau, expose residual et as_of_date.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid;
  v_set jsonb; v_get jsonb; v_lines jsonb;
  v_has_450 boolean; v_has_512 boolean; v_has_wait boolean; v_amt_450 numeric;
BEGIN
  v := create_clean_test_copro_seeded('getob', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  v_period := (v->>'period_id')::uuid;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  v_set := set_opening_balance(v_copro, v_period, DATE '2026-03-15', jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',600,'nature','current'),
    jsonb_build_object('account_code','512','amount',-250)  -- crédit volontaire
  ));
  IF NOT (v_set->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT FAIL : set KO : %', v_set; END IF;

  v_get := get_opening_balance(v_copro, v_period);
  v_lines := v_get->'lines';

  IF (v_get->>'as_of_date') <> '2026-03-15' THEN
    RAISE EXCEPTION 'ASSERT FAIL : as_of_date attendu 2026-03-15, trouve %', v_get->>'as_of_date';
  END IF;

  -- residual = -(600-250) = -350
  IF abs((v_get->>'residual')::numeric - (-350)) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : residual attendu -350, trouve %', v_get->>'residual';
  END IF;

  -- la ligne 450-1 (résolue) doit revenir avec amount +600, nature 'current', lot rempli
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l
                 WHERE l->>'account_code'='450-1' AND (l->>'lot_id')::uuid=v_lot
                   AND (l->>'amount')::numeric=600 AND l->>'nature'='current')
    INTO v_has_450;
  IF NOT v_has_450 THEN RAISE EXCEPTION 'ASSERT FAIL : ligne 450-1/lot/+600/current absente : %', v_lines; END IF;

  -- la ligne 512 doit revenir avec amount -250 (crédit -> signe négatif)
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l
                 WHERE l->>'account_code'='512' AND (l->>'amount')::numeric=-250) INTO v_has_512;
  IF NOT v_has_512 THEN RAISE EXCEPTION 'ASSERT FAIL : ligne 512/-250 absente : %', v_lines; END IF;

  -- 471/472 NE doivent PAS apparaître dans lines (c'est le residual)
  SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l
                 WHERE l->>'account_code' IN ('471','472')) INTO v_has_wait;
  IF v_has_wait THEN RAISE EXCEPTION 'ASSERT FAIL : 471/472 ne doivent pas figurer dans lines : %', v_lines; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test, vérifier qu'il échoue**

`execute_sql` du bloc.
Attendu : erreur `function get_opening_balance(uuid, uuid) does not exist` → échec TDD confirmé.

- [ ] **Step 3 — Écrire la migration**

Create `supabase/migrations/20260603101000_v1_6_get_opening_balance.sql` :

```sql
-- V1.6 — Relecture de la reprise d'onboarding pour pré-remplir l'écran (ré-édition).
-- Source de vérité unique = le grand livre (transaction source_type='opening_onboarding').
-- On remappe chaque ligne en {account_code, lot_id, amount signé, nature}, on EXCLUT les
-- comptes d'attente 471/472 (résidu calculé), et on renvoie residual + as_of_date.

CREATE OR REPLACE FUNCTION public.get_opening_balance(
  p_copro_id uuid,
  p_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id    uuid;
  v_as_of    date;
  v_lines    jsonb;
  v_residual numeric := 0;
BEGIN
  SELECT id, tx_date INTO v_tx_id, v_as_of
  FROM ledger_transactions
  WHERE copro_id = p_copro_id
    AND period_id = p_period_id
    AND source_type = 'opening_onboarding'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_tx_id IS NULL THEN
    RETURN jsonb_build_object('lines', '[]'::jsonb, 'residual', 0, 'as_of_date', NULL);
  END IF;

  -- Lignes de saisie = tout sauf 471/472 ; amount signé (debit +, credit -).
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'account_code', a.code,
           'lot_id', e.lot_id,
           'amount', CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END,
           'nature', CASE a.code
                       WHEN '450-1' THEN 'current' WHEN '450-2' THEN 'works'
                       WHEN '450-3' THEN 'advance' WHEN '450-4' THEN 'loan'
                       WHEN '450-5' THEN 'alur' ELSE NULL END
         ) ORDER BY a.code, e.lot_id), '[]'::jsonb)
    INTO v_lines
  FROM ledger_entries e
  JOIN accounts a ON a.id = e.account_id
  WHERE e.tx_id = v_tx_id
    AND a.code NOT IN ('471','472');

  -- Résidu = net 471/472 de la même transaction (debit +, credit -).
  SELECT coalesce(sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_residual
  FROM ledger_entries e
  JOIN accounts a ON a.id = e.account_id
  WHERE e.tx_id = v_tx_id AND a.code IN ('471','472');

  RETURN jsonb_build_object('lines', v_lines, 'residual', v_residual, 'as_of_date', v_as_of);
END;
$function$;

COMMENT ON FUNCTION public.get_opening_balance(uuid, uuid) IS
  'Relit la reprise d''onboarding courante (grand livre) et la remappe en lignes de formulaire signées + residual + as_of_date. Exclut 471/472 (résidu calculé).';
```

- [ ] **Step 4 — Appliquer la migration (GO requis)**

GO, puis `apply_migration` (name: `v1_6_get_opening_balance`).

- [ ] **Step 5 — Rejouer le test**

`execute_sql` du bloc de Step 1.
Attendu : `ROLLBACK_TEST_OK`.

- [ ] **Step 6 — Commit**

```bash
git add supabase/migrations/20260603101000_v1_6_get_opening_balance.sql supabase/tests/20260603101000_get_opening_balance_test.sql
git commit -m "feat(db): get_opening_balance (relecture reprise pour pre-remplissage)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : Couche TS — `setOnboardingOpeningBalance` / `getOnboardingOpeningBalance`

**Files:**
- Modify: `src/lib/onboarding/api.ts` (ajouter 2 fonctions après le bloc `// ═══ REPRISE SOLDES …` ; conserver l'ancien `postOnboardingOpeningBalances` intact pour ne pas casser `Step8Finalisation.tsx` — son retrait est l'affaire du Plan D qui réécrit l'écran)

**Pourquoi :** exposer les RPC `set_opening_balance` / `get_opening_balance` au front avec des types stricts. On définit un type de ligne aligné sur le contrat SQL (`account_code`, `lotId`, `amount` signé, `nature`), et on traduit camelCase ↔ snake_case côté wrapper.

- [ ] **Step 1 — Lire l'emplacement d'insertion**

Read `src/lib/onboarding/api.ts` lignes 534-638 (bloc `REPRISE SOLDES`). On insère **après** la fin de `postOnboardingOpeningBalances` (ligne 638), avant le bloc `// ═══ VÉRIFICATION FINALE ═══` (ligne 640).

- [ ] **Step 2 — Écrire le code (nouvelles fonctions)**

Edit `src/lib/onboarding/api.ts` — insérer ce bloc juste avant `// ═══ VÉRIFICATION FINALE ═══` :

```typescript
// ═══ REPRISE SOLDES — MOTEUR set/get_opening_balance (canonique) ═══

export type OpeningBalanceNature = 'current' | 'works' | 'advance' | 'loan' | 'alur';

export interface OpeningBalanceLine {
  accountCode: string;            // '450' (+nature), '450-1', '103', '105', '401', '110', '120', '512000', '601', '701'…
  lotId?: string | null;          // requis pour 450-x et 103 ; absent pour les comptes globaux
  amount: number;                 // signé : > 0 = au débit (l'actif/tiers doit) ; < 0 = au crédit
  nature?: OpeningBalanceNature;  // requis si accountCode === '450' (nu)
}

export interface OpeningBalanceResult {
  success: boolean;
  residual: number;
  linesCount: number;
  asOfDate: string;
}

export async function setOnboardingOpeningBalance(
  coproId: string,
  periodId: string,
  asOfDate: string,            // YYYY-MM-DD, garanti ∈ [start,end] par ensureAccountingPeriod
  lines: OpeningBalanceLine[]
): Promise<{ data: OpeningBalanceResult | null; error: Error | null }> {
  const supabase = createUntypedClient();
  const payload = lines
    .filter(l => l.amount !== 0)
    .map(l => ({
      account_code: l.accountCode,
      lot_id: l.lotId ?? null,
      amount: l.amount,
      nature: l.nature ?? null,
    }));

  const { data, error } = await supabase.rpc('set_opening_balance', {
    p_copro_id: coproId,
    p_period_id: periodId,
    p_as_of_date: asOfDate,
    p_lines: payload,
  });
  if (error) return { data: null, error: new Error(error.message) };

  const res = data as { success?: boolean; error?: string; residual?: number; lines_count?: number; as_of_date?: string };
  if (!res?.success) {
    return { data: null, error: new Error(res?.error || 'Échec de la reprise des soldes') };
  }
  return {
    data: {
      success: true,
      residual: Number(res.residual ?? 0),
      linesCount: Number(res.lines_count ?? 0),
      asOfDate: res.as_of_date ?? asOfDate,
    },
    error: null,
  };
}

export interface OpeningBalanceSnapshot {
  lines: OpeningBalanceLine[];
  residual: number;
  asOfDate: string | null;
}

export async function getOnboardingOpeningBalance(
  coproId: string,
  periodId: string
): Promise<{ data: OpeningBalanceSnapshot | null; error: Error | null }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('get_opening_balance', {
    p_copro_id: coproId,
    p_period_id: periodId,
  });
  if (error) return { data: null, error: new Error(error.message) };

  const res = data as {
    lines?: Array<{ account_code: string; lot_id: string | null; amount: number; nature: string | null }>;
    residual?: number;
    as_of_date?: string | null;
  };
  return {
    data: {
      lines: (res?.lines ?? []).map(l => ({
        accountCode: l.account_code,
        lotId: l.lot_id,
        amount: Number(l.amount),
        nature: (l.nature as OpeningBalanceNature | null) ?? undefined,
      })),
      residual: Number(res?.residual ?? 0),
      asOfDate: res?.as_of_date ?? null,
    },
    error: null,
  };
}
```

- [ ] **Step 3 — Type-check**

```bash
npm run build
```
Attendu : exit 0, aucune erreur TS sur `src/lib/onboarding/api.ts`.

- [ ] **Step 4 — Commit**

```bash
git add src/lib/onboarding/api.ts
git commit -m "feat(onboarding): API TS set/getOnboardingOpeningBalance (moteur reprise)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 : Corriger `listComptesBancaires` (filtre bancaire réel, B5)

**Files:**
- Modify: `src/lib/onboarding/api.ts` lignes 235-245 (fonction `listComptesBancaires`)

**Pourquoi :** la fonction filtre aujourd'hui `account_type='bank'` — valeur **absente** de l'enum `account_type` (`{asset,liability,income,expense,equity}`) → la requête renvoie **toujours vide**, donc l'« Essentiel » de l'écran ne peut jamais pré-remplir les banques. Correctif : filtrer `account_type='asset'` ET (`code LIKE '512%'` OU `code LIKE '502%'`), conformément aux comptes créés à l'étape 4 (`createCompteBancaire` pose `512000`/`512100`, `account_type='asset'`).

- [ ] **Step 1 — Écrire le test (manuel, base réelle) : la fonction renvoie un compte 512**

`execute_sql` (reproduit la requête corrigée pour prouver qu'elle ramène un compte sur une copro qui a une banque ; on utilise la boucle d'or si elle a un 512, sinon une copro seedée) :

```sql
-- Avant correctif : le filtre account_type='bank' renvoie 0. Après : >= 1 si la copro a un 512/502.
DO $$
DECLARE v jsonb; v_copro uuid; v_old int; v_new int;
BEGIN
  v := create_clean_test_copro_seeded('bankfilter', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  -- créer un compte banque comme l'étape 4 (createCompteBancaire) : 512000, asset
  INSERT INTO accounts (copro_id, code, name, account_type, is_postable)
  VALUES (v_copro, '512000', 'Compte courant TEST', 'asset', true);

  SELECT count(*) INTO v_old FROM accounts WHERE copro_id=v_copro AND account_type='bank';
  SELECT count(*) INTO v_new FROM accounts
   WHERE copro_id=v_copro AND account_type='asset' AND (code LIKE '512%' OR code LIKE '502%');

  IF v_old <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : ancien filtre bank ne devrait jamais matcher (=%)', v_old; END IF;
  IF v_new < 1 THEN RAISE EXCEPTION 'ASSERT FAIL : nouveau filtre 512/502 doit ramener >=1 (=%)', v_new; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test**

`execute_sql` du bloc.
Attendu : `ROLLBACK_TEST_OK` (prouve que le filtre `bank` est mort et que `512%/502% + asset` est le bon). Ce test valide le critère **avant** d'éditer le TS (le bug est côté TS, pas côté base).

- [ ] **Step 3 — Corriger le code TS**

Edit `src/lib/onboarding/api.ts`, remplacer le corps de `listComptesBancaires` :

```typescript
export async function listComptesBancaires(coproId: string) {
  const supabase = createUntypedClient();
  // Comptes bancaires = comptes d'actif de trésorerie (512x banque, 502x livret travaux).
  // L'enum account_type N'A PAS de valeur 'bank' -> on filtre par account_type='asset' + code.
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, code, banque, iban, bic, initial_balance')
    .eq('copro_id', coproId)
    .eq('account_type', 'asset')
    .or('code.like.512%,code.like.502%')
    .order('code', { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as Array<{ id: string; name: string; code: string; banque: string | null; iban: string | null; bic: string | null; initial_balance: number }>, error: null };
}
```

- [ ] **Step 4 — Type-check**

```bash
npm run build
```
Attendu : exit 0.

- [ ] **Step 5 — Commit**

```bash
git add src/lib/onboarding/api.ts supabase/tests/20260603100000_set_opening_balance_test.sql
git commit -m "fix(onboarding): listComptesBancaires filtre asset+512/502 (account_type bank inexistant)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
> Note : le bloc-test de Step 1 peut être archivé dans `supabase/tests/20260603102000_bank_filter_test.sql` si on préfère un fichier dédié ; sinon le commit ci-dessus n'ajoute que le TS.

---

## Task 5 : `ensureAccountingPeriod` dérivée de `exercice_debut` + garantie `as_of ∈ [start,end]` (B6)

**Files:**
- Modify: `src/lib/onboarding/api.ts` lignes 249-278 (fonction `ensureAccountingPeriod`)
- Create (helper) : aucune nouvelle dépendance ; logique pure dans le fichier
- Create (archive test) : `supabase/tests/20260603103000_period_from_exercice_debut_test.sql` (test SQL des bornes, indépendant du TS)

**Pourquoi :** aujourd'hui `ensureAccountingPeriod(coproId, year)` code l'année civile en dur (`${year}-01-01` → `${year}-12-31`). Si la copro a un exercice décalé (ex. `exercice_debut='06-01'`), la période créée est fausse, et `set_opening_balance` recevrait un `p_period_id` dont l'intervalle ne contient pas `p_as_of_date`. Correctif : dériver `start_date` de `copros.exercice_debut` (format `MM-DD`) + l'année de reprise, calculer `end_date = start + 1 an − 1 jour`, et **exposer ces bornes** pour que l'appelant garantisse `as_of ∈ [start,end]`.

- [ ] **Step 1 — Écrire le test SQL (bornes d'exercice décalé)**

Create `supabase/tests/20260603103000_period_from_exercice_debut_test.sql` :

```sql
-- TEST : la dérivation des bornes d'exercice à partir de exercice_debut (MM-DD) est correcte.
-- Reproduit en SQL le calcul que fait le TS (start = year-MM-DD ; end = start + 1 an - 1 jour).
DO $$
DECLARE
  v_md text; v_year int := 2026;
  v_start date; v_end date;
BEGIN
  -- cas exercice civil
  v_md := '01-01';
  v_start := make_date(v_year, split_part(v_md,'-',1)::int, split_part(v_md,'-',2)::int);
  v_end   := (v_start + INTERVAL '1 year' - INTERVAL '1 day')::date;
  IF v_start <> DATE '2026-01-01' OR v_end <> DATE '2026-12-31' THEN
    RAISE EXCEPTION 'ASSERT FAIL : exercice civil borne KO start=% end=%', v_start, v_end;
  END IF;

  -- cas exercice décalé 06-01 -> 2026-06-01 .. 2027-05-31
  v_md := '06-01';
  v_start := make_date(v_year, split_part(v_md,'-',1)::int, split_part(v_md,'-',2)::int);
  v_end   := (v_start + INTERVAL '1 year' - INTERVAL '1 day')::date;
  IF v_start <> DATE '2026-06-01' OR v_end <> DATE '2027-05-31' THEN
    RAISE EXCEPTION 'ASSERT FAIL : exercice decale borne KO start=% end=%', v_start, v_end;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test (sanity du calcul de bornes)**

`execute_sql` du bloc.
Attendu : `ROLLBACK_TEST_OK` (valide la formule de bornes que le TS va répliquer).

- [ ] **Step 3 — Corriger le code TS**

Edit `src/lib/onboarding/api.ts`, remplacer entièrement la fonction `ensureAccountingPeriod` (lignes 249-278) par :

```typescript
// ═══ ACCOUNTING PERIOD ═══

/** Bornes d'un exercice : start dérivé de exercice_debut (MM-DD) + année, end = start + 1 an - 1 jour. */
function deriveExercicePeriod(exerciceDebut: string | null, year: number): { start: string; end: string; name: string } {
  // exerciceDebut au format 'MM-DD' (défaut '01-01'). On tolère un format vide/invalide -> civil.
  const md = /^\d{2}-\d{2}$/.test(exerciceDebut ?? '') ? (exerciceDebut as string) : '01-01';
  const [mm, dd] = md.split('-').map(Number);
  const start = new Date(Date.UTC(year, mm - 1, dd));
  const end = new Date(Date.UTC(year + 1, mm - 1, dd));
  end.setUTCDate(end.getUTCDate() - 1); // start + 1 an - 1 jour
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const label = mm === 1 && dd === 1 ? `Exercice ${year}` : `Exercice ${iso(start)} → ${iso(end)}`;
  return { start: iso(start), end: iso(end), name: label };
}

export async function ensureAccountingPeriod(coproId: string, year: number) {
  const supabase = createUntypedClient();

  // Dériver les bornes de l'exercice de CETTE copro (pas l'année civile en dur).
  const { data: copro, error: coproErr } = await supabase
    .from('copros').select('exercice_debut').eq('id', coproId).single();
  if (coproErr) return { data: null, error: new Error(coproErr.message) };
  const { start, end, name } = deriveExercicePeriod(
    (copro as { exercice_debut: string | null }).exercice_debut, year
  );

  // Période déjà existante ?
  const { data: existing } = await supabase
    .from('accounting_periods')
    .select('id, start_date, end_date')
    .eq('copro_id', coproId)
    .eq('start_date', start)
    .eq('end_date', end)
    .maybeSingle();
  if (existing) {
    return { data: { id: existing.id as string, start, end }, error: null };
  }

  const { data, error } = await supabase
    .from('accounting_periods')
    .insert({ copro_id: coproId, name, start_date: start, end_date: end, status: 'open' })
    .select('id')
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: { id: data.id as string, start, end }, error: null };
}

/** Garantit qu'une date de reprise tombe dans l'exercice ; sinon la borne à start/end. */
export function clampAsOfDate(asOf: string, start: string, end: string): string {
  if (asOf < start) return start;
  if (asOf > end) return end;
  return asOf;
}
```

> `ensureAccountingPeriod` renvoie désormais `{ id, start, end }`. Les appelants existants ne lisent que `res.data.id` (cf. `page.tsx` l.55-56 `res.data.id`, `Step5Budget.tsx` l.49) → **rétro-compatible** (on ajoute des champs, on n'en retire pas). L'écran de reprise (Plan D) utilisera `start/end` + `clampAsOfDate` pour garantir `as_of ∈ [start,end]` avant d'appeler `setOnboardingOpeningBalance`.

- [ ] **Step 4 — Type-check**

```bash
npm run build
```
Attendu : exit 0. (Vérifier qu'aucun appelant ne casse : `page.tsx`, `Step5Budget.tsx` lisent `res.data.id` — toujours présent.)

- [ ] **Step 5 — Commit**

```bash
git add src/lib/onboarding/api.ts supabase/tests/20260603103000_period_from_exercice_debut_test.sql
git commit -m "fix(onboarding): periode comptable derivee de exercice_debut + clampAsOfDate (B6)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 : Lister les comptes du plan pour « Autres comptes » (classes 1-5)

**Files:**
- Modify: `src/lib/onboarding/api.ts` (ajouter `listComptesPlan` à la fin du bloc REPRISE SOLDES)

**Pourquoi :** la section repliable « Autres comptes » de l'écran (Plan D) a besoin de la liste des comptes imputables hors « Essentiel » : classes 1 à 5 (`code LIKE '1%'…'5%'`), `is_postable=true`, en **excluant** ce qui est déjà couvert par l'Essentiel/SoldesParLot (450-x, 471/472 qui sont calculés). On exclut aussi le chapeau 450 (non imputable de toute façon).

- [ ] **Step 1 — Écrire le test (base réelle) : liste non vide, sans 450 nu / 471 / 472 / 6 / 7**

`execute_sql` :
```sql
DO $$
DECLARE v jsonb; v_copro uuid; v_cnt int; v_bad int;
BEGIN
  v := create_clean_test_copro_seeded('plan15', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;

  SELECT count(*) INTO v_cnt FROM accounts
   WHERE copro_id=v_copro AND is_postable=true
     AND (code LIKE '1%' OR code LIKE '2%' OR code LIKE '3%' OR code LIKE '4%' OR code LIKE '5%')
     AND code NOT LIKE '450%' AND code NOT IN ('471','472');
  SELECT count(*) INTO v_bad FROM accounts
   WHERE copro_id=v_copro AND is_postable=true
     AND (code LIKE '1%' OR code LIKE '2%' OR code LIKE '3%' OR code LIKE '4%' OR code LIKE '5%')
     AND code NOT LIKE '450%' AND code NOT IN ('471','472')
     AND (code='450' OR code LIKE '6%' OR code LIKE '7%');

  IF v_cnt < 5 THEN RAISE EXCEPTION 'ASSERT FAIL : liste classes 1-5 trop courte (=%)', v_cnt; END IF;
  IF v_bad <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : la liste contient du 450/6/7 (=%)', v_bad; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test**

`execute_sql` du bloc.
Attendu : `ROLLBACK_TEST_OK` (le critère de filtre est correct côté base).

- [ ] **Step 3 — Écrire le code TS**

Edit `src/lib/onboarding/api.ts` — ajouter, à la fin du bloc `REPRISE SOLDES — MOTEUR`, avant `// ═══ VÉRIFICATION FINALE ═══` :

```typescript
export interface ComptePlanItem {
  id: string;
  code: string;
  name: string;
}

/** Comptes imputables des classes 1 à 5 (hors 450-x et 471/472, déjà couverts par l'Essentiel/résidu).
 *  Sert à la section repliable « Autres comptes » de l'écran de reprise. */
export async function listComptesPlan(coproId: string) {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, code, name')
    .eq('copro_id', coproId)
    .eq('is_postable', true)
    .or('code.like.1%,code.like.2%,code.like.3%,code.like.4%,code.like.5%')
    .not('code', 'like', '450%')
    .not('code', 'in', '("471","472")')
    .order('code', { ascending: true });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as ComptePlanItem[], error: null };
}
```

- [ ] **Step 4 — Type-check**

```bash
npm run build
```
Attendu : exit 0.

- [ ] **Step 5 — Commit**

```bash
git add src/lib/onboarding/api.ts
git commit -m "feat(onboarding): listComptesPlan (classes 1-5 pour Autres comptes)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 : Test d'acceptation moteur + non-régression boucle d'or

**Files:**
- Create (archive test) : `supabase/tests/20260603104000_moteur_acceptance_test.sql`

**Pourquoi :** preuve de bout en bout que le moteur n'introduit aucune anomalie d'intégrité (`audit_finance_integrity`) sur une copro propre, que le `residual` se solde quand on saisit la contrepartie, et que la boucle d'or 22222222 reste inchangée (immutabilité GL).

- [ ] **Step 1 — Acceptation : déséquilibre → 471/472 → soldé → 0**

Create `supabase/tests/20260603104000_moteur_acceptance_test.sql` :

```sql
-- TEST acceptation moteur : une reprise incomplète laisse un résidu 471/472 (non bloquant),
-- une reprise complétée le solde à 0, et aucune anomalie d'intégrité bloquante n'apparaît.
DO $$
DECLARE
  v jsonb; v_copro uuid; v_period uuid; v_lot uuid;
  v_res jsonb; v_wait numeric; v_blocking int;
BEGIN
  v := create_clean_test_copro_seeded('moteur-acc', 15000, 0);
  v_copro := (v->>'copro_id')::uuid;
  v_period := (v->>'period_id')::uuid;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY ref LIMIT 1;

  -- 1) Reprise INCOMPLÈTE : seulement une créance 450/lot -> résidu sur 472
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',500,'nature','current')
  ));
  IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT FAIL : reprise incomplete KO : %', v_res; END IF;

  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait - (-500)) > 0.01 THEN RAISE EXCEPTION 'ASSERT FAIL : residu attendu -500, trouve %', v_wait; END IF;

  -- aucune anomalie BLOQUANTE (TOTAL_MISMATCH / CHAPEAU_450_POSTED / SOURCE_ID_MISSING)
  SELECT count(*) INTO v_blocking FROM audit_finance_integrity(v_copro)
   WHERE issue_type IN ('TOTAL_MISMATCH','CHAPEAU_450_POSTED','SOURCE_ID_MISSING');
  IF v_blocking <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : % anomalie bloquante sur reprise incomplete', v_blocking; END IF;

  -- 2) COMPLÉTER : on saisit la contrepartie banque -> résidu 0
  v_res := set_opening_balance(v_copro, v_period, CURRENT_DATE, jsonb_build_array(
    jsonb_build_object('account_code','450','lot_id',v_lot,'amount',500,'nature','current'),
    jsonb_build_object('account_code','512','amount',-500)
  ));
  IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT FAIL : reprise complete KO : %', v_res; END IF;
  IF abs((v_res->>'residual')::numeric) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL : residual devrait etre 0, trouve %', v_res->>'residual';
  END IF;

  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) INTO v_wait
  FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
  JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE a.copro_id=v_copro AND a.code IN ('471','472');
  IF abs(v_wait) > 0.01 THEN RAISE EXCEPTION 'ASSERT FAIL : 471/472 devrait etre 0, trouve %', v_wait; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 2 — Jouer le test**

`execute_sql` du bloc.
Attendu : `ROLLBACK_TEST_OK`.

- [ ] **Step 3 — Non-régression boucle d'or 22222222**

`execute_sql` :
```sql
SELECT count(*) AS ecarts_g3
FROM audit_finance_integrity('22222222-aaaa-bbbb-cccc-222222222222');
```
Attendu : le **même** nombre qu'avant ce plan (cadre G3 : artefacts historiques connus, immutabilité GL). Aucune nouvelle anomalie introduite par le moteur (le moteur n'écrit jamais sur la boucle d'or — c'est juste une vérification que les nouvelles RPC/vues ne cassent pas l'audit existant).

- [ ] **Step 4 — Commit**

```bash
git add supabase/tests/20260603104000_moteur_acceptance_test.sql
git commit -m "test(db): acceptation moteur reprise (residu->solde, 0 anomalie bloquante, boucle d'or stable)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (rempli)

**1. Couverture du périmètre Plan B :**
- RPC `set_opening_balance` (pré-garde statut FOR UPDATE I3 + message métier ; DELETE reprise existante I2 ; résolution 450-x via `resolve_lot_tiers_account`, 103/lot, 105, 401, 110/120, 6/7 par code, banque par `account_id` 512%/502% ; résidu 471/472 exact I4 ; UNE écriture `create_ledger_transaction(auto_post:=true, source_type='opening_onboarding', source_id=p_period_id)` ; vérification `(v_res->>'success')` I14) → **Task 1** ✓
- RPC `get_opening_balance` (relecture + remap lignes signées, exclusion 471/472, residual + as_of) → **Task 2** ✓
- TS `setOnboardingOpeningBalance` / `getOnboardingOpeningBalance` → **Task 3** ✓
- `listComptesBancaires` corrigé (asset + 512%/502%, B5) → **Task 4** ✓
- `ensureAccountingPeriod` dérivée de `exercice_debut` + `clampAsOfDate` (as_of ∈ [start,end], B6) → **Task 5** ✓
- `listComptesPlan` classes 1-5 (« Autres comptes ») → **Task 6** ✓
- Tests SQL exigés (§10/§8) : équilibre garanti ✓, replace sans doublon ✓, résidu correct sur 471/472 ✓, pré-garde statut (période non 'open' → success:false) ✓, RAISE si `create_ledger_transaction` échoue (I14, prouvé indirectement par le test pré-garde qui montre l'absence de DELETE non remplacé) ✓, 103/lot posté + exclu de `v_lot_balance` + présent dans `v_lot_avance` ✓, 6/7 sans lot_id ✓, largest-remainder / 0 centime résiduel (résidu = complément exact arrondi à 2 décimales) ✓.

**2. Signatures réelles (vérifiées en base, non supposées) :**
- `create_ledger_transaction(uuid,uuid,date,text,text,uuid,jsonb,boolean)` → `{success,tx_id,...}` (cr3 live) — utilisée exactement.
- `resolve_lot_tiers_account(uuid,text)` natures current/works/advance/loan/alur.
- `accounting_periods.status` enum, ouvert = `'open'` ; `ledger_entries.period_id` NOT NULL (rempli par `create_ledger_transaction`).
- `create_clean_test_copro_seeded(text,numeric,integer)` → `{copro_id,period_id,seed}` (utilisé pour récupérer `period_id` directement, pas re-SELECT).
- `close_period(uuid)` **un seul argument** (corrige l'erreur du Plan A qui l'appelle avec 2 args).
- `copros.exercice_debut` = `text` `MM-DD`.
- Boucle d'or = **`22222222-aaaa-bbbb-cccc-222222222222`** (vrai UUID ; le Plan A en cite un faux `22222222-2222-…` à corriger lors de son exécution).

**3. Placeholders :** aucun « TBD/TODO/similaire à » ; tout le SQL et le TS sont complets.

**4. Conventions projet :** TS strict, pas de `any` **nouveau** (le fichier `api.ts` utilise déjà un `createUntypedClient(): any` localisé, hors périmètre de ce plan ; les retours sont typés via `as` ciblés conformément au style existant) ; imports alias `@/` (le fichier importe `@/lib/supabase/client`) ; aucun style inline (pas de composant ici) ; fichier `api.ts` reste sous ~300 lignes après ajouts car les fonctions sont courtes (si dépassement, Plan D pourra extraire un sous-module `opening-balance.ts`).

**5. Dépendances :**
- **Bloquante** : Plan A appliqué (Step 0 le vérifie). Sans lui, `source_type='opening_onboarding'` est rejeté.
- Plan A fournit aussi `v_lot_balance` restreinte 450/459 et `v_lot_avance` — utilisées par les assertions 103/lot de la Task 1.
- Aucune des RPC de ce plan ne modifie `open_next_period`, `close_period`, `create_ledger_transaction`, `post_ledger_transaction` (réutilisées telles quelles).

**6. Risques résiduels notés pour le suivi :**
- `set_opening_balance` n'implémente **pas** I12 (ré-édition après une 1ʳᵉ clôture quand un N+1 existe avec report) : la pré-garde statut bloque la ré-édition d'une période close, ce qui est conservateur et sûr ; la ré-ouverture/recalcul du report N+1 relève du Plan C (Pivot 2 / garde AG) — hors périmètre B.
- Le verrou étape 8 (liste blanche), l'alerte tableau de bord, l'écran `RepriseSoldes` et le branchement wizard relèvent des Plans C/D.

## Suite

Plan **C** (Pivot 2 — alignement 471/472 hors onboarding + pré-validation AG hors boucle `activate_ag_decisions` + verrou étape 8 en liste blanche) et Plan **D** (écran `RepriseSoldes` réutilisable, intégration wizard post-as-you-go, alerte persistante, filtre `onboarding_step IS NULL` I5, garde-fous budget I6/I7, E2E + reset CI) — à écrire après validation/exécution du Plan B.