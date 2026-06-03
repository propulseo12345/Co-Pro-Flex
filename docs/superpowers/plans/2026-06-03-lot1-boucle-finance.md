# Lot 1 — Refermer la boucle financière (clôture AG → report → affectation) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire en sorte que l'approbation des comptes en AG referme réellement l'exercice : reclasser le chapeau 450, ventiler le résultat 110/120, ouvrir N+1 avec report des soldes, et affecter le résultat aux copropriétaires par quote-part.

**Architecture:** 4 migrations SQL incrémentales sur la base Supabase `iyfesbjnkpynmwlsmxnp`, dans l'ordre G5 non-négociable (reclassement → enforcement → report → affectation). Chaque migration est idempotente et accompagnée d'un script d'acceptation SQL (DO-block `RAISE`) exécuté sur une copro de test jetable (`create_test_copro_seeded`) puis vérifié sur la boucle d'or `22222222`. Aucune écriture par `UPDATE` (immutabilité GL) : tout passe par `create_ledger_transaction`.

**Tech Stack:** PostgreSQL (fonctions plpgsql `SECURITY DEFINER`), Supabase (migrations + MCP `execute_sql`/`apply_migration`), grand livre `ledger_transactions`/`ledger_entries`.

---

## ⚠️ Garde-fous (lire avant de commencer)

- **GO UTILISATEUR OBLIGATOIRE** avant toute `apply_migration` sur `iyfesbjnkpynmwlsmxnp` (règle projet). Ce plan se rédige et se teste sur copro jetable ; le push prod attend le GO explicite.
- **Ordre G5 non négociable** : reclassement chapeau → backfill `is_postable=false` → trigger d'enforcement → seulement APRÈS, `open_next_period`. Inverser casse le 1er report.
- **Ne jamais toucher la copro témoin `11111111`** (immutabilité ; 5 écritures chapeau 450 sans `lot_id` non assainissables).
- **Décision Q-1 actée (défaut)** : à l'approbation, on **ne bloque pas** si le 120 est débiteur (déficit). On poste l'affectation (D120/C450-1) ; le solde 450 résultant est apuré par l'appel T1 N+1 (cf. mémoire `affectation_resultat_copro`). Un blocage conditionnel pourra être ajouté plus tard.
- **Colonnes confirmées** (lues dans `20260601114000` + `20260602170000`) : `ledger_entries(tx_id, account_id, lot_id, copro_id, period_id, direction['debit'|'credit'], amount)` ; `accounts(id, copro_id, code, is_postable)` ; `accounting_periods(id, copro_id, name, start_date, end_date, status['open'|'closed'|'approved'], approved_at, approved_by)` ; `create_ledger_transaction(p_copro_id, p_period_id, p_date, p_label, p_source_type, p_source_id, p_entries jsonb, p_auto_post boolean)`.

---

## Pré-vol (vérifications avant d'écrire les migrations)

Exécuter ces requêtes via le MCP Supabase (`execute_sql`) et **noter les résultats dans ce fichier** avant de coder. Elles conditionnent le contenu exact des migrations.

- [ ] **P1 — Solde net du chapeau 450 sur la boucle d'or, par lot**

```sql
SELECT e.lot_id,
       round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) AS net
FROM ledger_entries e
JOIN ledger_transactions t ON t.id = e.tx_id AND t.status='posted'
JOIN accounts a ON a.id = e.account_id
WHERE a.copro_id = '22222222-aaaa-bbbb-cccc-222222222222' AND a.code = '450'
GROUP BY e.lot_id;
```
Attendu : si des lignes existent avec `lot_id` NON NULL → reclassables (Task 1). Si `lot_id` IS NULL → **NE PAS reclasser** (le trigger `trg_enforce_lot_id_on_45x` bloquerait le débit 450-1) ; documenter et exclure ces lignes.

- [ ] **P2 — Clé de répartition générale active (nécessaire pour l'affectation)**

```sql
SELECT id, name FROM repartition_keys
WHERE copro_id='22222222-aaaa-bbbb-cccc-222222222222' AND category='general' AND is_active=true;
```
Attendu : exactement 1 ligne. Sinon, `regularize_period` (Task 4) ne pourra pas calculer les quote-parts → résoudre avant.

- [ ] **P3 — État de la période 2026 (clôturable ?)**

```sql
SELECT id, name, start_date, end_date, status
FROM accounting_periods
WHERE copro_id='22222222-aaaa-bbbb-cccc-222222222222' ORDER BY start_date;
```
Attendu : la période 2026 en `status='open'`. Noter son `id` (= `PERIOD_2026`) pour les tests.

- [ ] **P4 — Lignes de poids de la clé générale (pour le prorata)**

```sql
SELECT lot_id, weight FROM repartition_key_lines
WHERE key_id = (SELECT id FROM repartition_keys
  WHERE copro_id='22222222-aaaa-bbbb-cccc-222222222222' AND category='general' AND is_active=true);
```
Attendu : une ligne par lot, `Σ weight` > 0. Confirme le dénominateur du prorata.

- [ ] **P5 — Définition live de `is_ledger_regen_exempt` (signature exacte avant de la réécrire)**

```sql
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'is_ledger_regen_exempt';
```
Attendu : signature + corps actuels. La migration 2d fera un `CREATE OR REPLACE` qui **garde exactement cette signature** et ajoute `'result_allocation'` à la liste (sinon `trg_ledger_tx_no_delete_posted`, qui l'appelle, casse au `DELETE` d'idempotence).

---

## File Structure

Migrations à créer dans `Co-Pro-Flex/supabase/migrations/` :

- `20260604089000_extend_source_type_check.sql` — **(prérequis BLOQUANT)** étend la CHECK `ledger_transactions.source_type` à `reclassification` + `result_allocation`.
- `20260604090000_v1_4a_provision_flat_copros.sql` — provisionne le plan tiers 450-x sur les copros plates.
- `20260604091000_v1_4b_reclass_chapeau450_goldenloop.sql` — reclasse le solde chapeau 450 → 450-1 par écriture inverse (boucle d'or uniquement).
- `20260604092000_v1_4c_backfill_enforce_is_postable.sql` — `is_postable=false` sur les chapeaux 450 + CONSTRAINT TRIGGER d'enforcement.
- `20260604093000_v2_open_next_period_split_110_120.sql` — `CREATE OR REPLACE open_next_period` ventilant 6/7 courant→120 et travaux→110.
- `20260604094000_v4_0_wire_open_next_period_in_ag.sql` — `CREATE OR REPLACE activate_ag_decisions` câblant close→open_next→approve→regularize.
- `20260604095000_v4_1_regularize_period_impl.sql` — `CREATE OR REPLACE regularize_period` (affectation 120→450-1 et 110→450-2 par quote-part).

Scripts d'acceptation (non migrés, lancés via MCP `execute_sql`) dans `Co-Pro-Flex/.planning/acceptance/lot1/` :

- `accept_2a_chapeau_clean.sql`, `accept_2b_split.sql`, `accept_2c_wiring.sql`, `accept_2d_affectation.sql`.

---

## Task 1 — Phase 2a : chapeau 450 propre + enforcement `is_postable`

**Files:**
- Create: `supabase/migrations/20260604089000_extend_source_type_check.sql`
- Create: `supabase/migrations/20260604090000_v1_4a_provision_flat_copros.sql`
- Create: `supabase/migrations/20260604091000_v1_4b_reclass_chapeau450_goldenloop.sql`
- Create: `supabase/migrations/20260604092000_v1_4c_backfill_enforce_is_postable.sql`
- Test: `.planning/acceptance/lot1/accept_2a_chapeau_clean.sql`

- [ ] **Step 1 : Écrire le script d'acceptation (échouera avant migration)**

`.planning/acceptance/lot1/accept_2a_chapeau_clean.sql` :
```sql
DO $$
DECLARE v_postable boolean; v_chapeau_net numeric;
BEGIN
  SELECT is_postable INTO v_postable FROM accounts
   WHERE copro_id='22222222-aaaa-bbbb-cccc-222222222222' AND code='450';
  IF v_postable IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'ECHEC 2a : chapeau 450 encore postable (is_postable=%).', v_postable;
  END IF;
  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2)
    INTO v_chapeau_net
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  JOIN accounts a ON a.id=e.account_id
  WHERE a.copro_id='22222222-aaaa-bbbb-cccc-222222222222' AND a.code='450' AND e.lot_id IS NOT NULL;
  IF v_chapeau_net <> 0 THEN
    RAISE EXCEPTION 'ECHEC 2a : solde chapeau 450 (lot_id non nul) = % (attendu 0).', v_chapeau_net;
  END IF;
  RAISE NOTICE 'OK 2a : chapeau non postable et soldé.';
END $$;
```

- [ ] **Step 2 : Lancer l'acceptation → doit échouer**

Run (MCP Supabase `execute_sql`, base prod en lecture) : exécuter `accept_2a_chapeau_clean.sql`.
Expected : `EXCEPTION ECHEC 2a` (chapeau encore postable). Confirme l'état initial.

- [ ] **Step 2b : Migration préalable — étendre la CHECK `source_type` (BLOQUANT)**

`20260604089000_extend_source_type_check.sql` :
```sql
ALTER TABLE public.ledger_transactions DROP CONSTRAINT IF EXISTS ledger_transactions_source_type_check;
ALTER TABLE public.ledger_transactions ADD CONSTRAINT ledger_transactions_source_type_check
  CHECK (source_type IS NULL OR source_type = ANY (ARRAY[
    'budget','budget_expense','call_for_funds','payment','supplier_invoice','supplier_payment',
    'bank_movement','transfer','od','opening','closing','manual','opening_balance','opening_onboarding',
    'reclassification','result_allocation']));
```
> Sans cette extension, l'INSERT de `create_ledger_transaction` avec `source_type='reclassification'` (Step 4) ou `'result_allocation'` (Task 4) lève une violation de CHECK. CHECK live confirmée dans `20260603092000_v1_6_opening_onboarding_source_type.sql`.

- [ ] **Step 3 : Migration 2a-a — provisionner les copros plates**

`20260604090000_v1_4a_provision_flat_copros.sql` :
```sql
-- Les copros plates n'ont qu'un chapeau 450 nu : leur poser le plan tiers 450-1..5 (idempotent)
-- avant tout enforcement is_postable, sinon elles deviennent inopérantes.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.id FROM copros c
           WHERE EXISTS (SELECT 1 FROM accounts a WHERE a.copro_id=c.id AND a.code='450')
             AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.copro_id=c.id AND a.code='450-1')
  LOOP
    PERFORM provision_copro_chart(r.id);
  END LOOP;
END $$;
```

- [ ] **Step 4 : Migration 2a-b — reclasser le chapeau de la boucle d'or**

`20260604091000_v1_4b_reclass_chapeau450_goldenloop.sql` (n'agit QUE sur `22222222`, jamais `11111111`, et seulement sur les lignes `lot_id` non nul confirmées au pré-vol P1) :
```sql
DO $$
DECLARE
  v_copro uuid := '22222222-aaaa-bbbb-cccc-222222222222';
  v_period uuid;
  v_entries jsonb := '[]'::jsonb;
  v_acct_450 uuid;
  v_acct_4501 uuid;
  r record;
BEGIN
  SELECT id INTO v_period FROM accounting_periods
   WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_acct_450  FROM accounts WHERE copro_id=v_copro AND code='450';
  SELECT id INTO v_acct_4501 FROM accounts WHERE copro_id=v_copro AND code='450-1';
  IF v_acct_450 IS NULL OR v_acct_4501 IS NULL THEN
    RAISE EXCEPTION 'Comptes 450/450-1 absents pour la boucle d''or';
  END IF;

  FOR r IN
    SELECT e.lot_id,
           round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) AS net
    FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
    JOIN accounts a ON a.id=e.account_id
    WHERE a.copro_id=v_copro AND a.code='450' AND e.lot_id IS NOT NULL
    GROUP BY e.lot_id
    HAVING round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) <> 0
  LOOP
    -- Vider le chapeau (contre-passation) ET reporter sur 450-1, même lot, même montant net.
    v_entries := v_entries
      || jsonb_build_object('account_id',v_acct_450,'lot_id',r.lot_id,
            'direction', CASE WHEN r.net>0 THEN 'credit' ELSE 'debit' END,'amount',abs(r.net),
            'entry_label','Neutralisation chapeau 450')
      || jsonb_build_object('account_id',v_acct_4501,'lot_id',r.lot_id,
            'direction', CASE WHEN r.net>0 THEN 'debit' ELSE 'credit' END,'amount',abs(r.net),
            'entry_label','Reclassement 450 -> 450-1');
  END LOOP;

  IF jsonb_array_length(v_entries) > 0 THEN
    PERFORM create_ledger_transaction(v_copro, v_period, CURRENT_DATE,
      'Reclassement soldes chapeau 450 -> 450-1', 'reclassification', NULL, v_entries, true);
  END IF;
END $$;
```
> Note : `create_ledger_transaction` attend `account_id` (UUID) dans `p_entries`, **pas** `account_code` → les UUID sont résolus en tête de bloc (corrigé). `source_type='reclassification'` est déjà autorisé par la migration préalable `20260604089000` (Step 2b).

- [ ] **Step 5 : Migration 2a-c — backfill + trigger d'enforcement**

`20260604092000_v1_4c_backfill_enforce_is_postable.sql` :
```sql
-- 1) Chapeau 450 non imputable SEULEMENT si (a) les 450-x existent ET (b) le chapeau est
--    déjà SOLDÉ (aucun solde posté résiduel). Garde auto-protectrice : exclut le témoin
--    11111111-aaaa-bbbb-cccc-111111111111 (5 écritures chapeau sans lot_id, 4218,50 € non
--    reclassables) et toute copro dont le chapeau n'a pas été reclassé. Confirmé au pré-vol.
UPDATE accounts SET is_postable=false
 WHERE code='450'
   AND EXISTS (SELECT 1 FROM accounts a2 WHERE a2.copro_id=accounts.copro_id AND a2.code LIKE '450-%')
   AND NOT EXISTS (
     SELECT 1 FROM ledger_entries e
     JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
     WHERE e.account_id = accounts.id
     GROUP BY e.account_id
     HAVING round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) <> 0
   );

-- 2) Enforcement : interdit toute écriture sur un compte is_postable=false.
CREATE OR REPLACE FUNCTION public.trg_enforce_is_postable() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE v_ok boolean; v_code text;
BEGIN
  SELECT is_postable, code INTO v_ok, v_code FROM accounts WHERE id = NEW.account_id;
  IF v_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Compte non imputable (is_postable=false) : %', v_code;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS enforce_is_postable ON public.ledger_entries;
CREATE CONSTRAINT TRIGGER enforce_is_postable
  AFTER INSERT OR UPDATE ON public.ledger_entries
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_is_postable();
```
> Le trigger est posé APRÈS le reclassement (Step 4) : à ce stade le chapeau ne porte plus de solde, donc aucune écriture résiduelle ne tente d'imputer le 450 nu.

- [ ] **Step 6 : Appliquer les 3 migrations (GO requis) puis relancer l'acceptation → doit passer**

Run (après GO) : `apply_migration` pour 2a-a, 2a-b, 2a-c, puis `execute_sql` de `accept_2a_chapeau_clean.sql`.
Expected : `NOTICE OK 2a`. Tester aussi qu'un INSERT volontaire sur le chapeau lève `Compte non imputable`.

- [ ] **Step 7 : Commit**

```bash
git add supabase/migrations/20260604089000_extend_source_type_check.sql \
        supabase/migrations/20260604090000_v1_4a_provision_flat_copros.sql \
        supabase/migrations/20260604091000_v1_4b_reclass_chapeau450_goldenloop.sql \
        supabase/migrations/20260604092000_v1_4c_backfill_enforce_is_postable.sql \
        .planning/acceptance/lot1/accept_2a_chapeau_clean.sql
git commit -m "feat(finance): reclasse le chapeau 450 et enforce is_postable (G5 phase 2a)"
```

---

## Task 2 — Phase 2b : ventiler 110/120 dans `open_next_period`

**Files:**
- Create: `supabase/migrations/20260604093000_v2_open_next_period_split_110_120.sql`
- Modify (référence): `supabase/migrations/20260601114000_wp5_2_open_next_period_hook.sql` (corps source)
- Test: `.planning/acceptance/lot1/accept_2b_split.sql`

- [ ] **Step 1 : Écrire l'acceptation (échouera avant migration)**

`.planning/acceptance/lot1/accept_2b_split.sql` — sur une copro de test seedée avec des charges travaux (671) ET courantes (601), après `open_next_period` : le 110 reçoit le net travaux, le 120 le net courant.
```sql
DO $$
DECLARE v_copro uuid; v_p uuid; v_n uuid; v_120 numeric; v_110 numeric;
BEGIN
  v_copro := create_test_copro_seeded('HARNESS-2b');           -- helper existant
  SELECT id INTO v_p FROM accounting_periods WHERE copro_id=v_copro AND status='open' LIMIT 1;
  -- seed : 1000 de charge courante (601) + 500 de charge travaux (671), provisions en face
  PERFORM seed_test_charges(v_copro, v_p, '601', 1000);        -- helper (à créer si absent, voir note)
  PERFORM seed_test_charges(v_copro, v_p, '671', 500);
  PERFORM close_period(v_p);
  PERFORM open_next_period(v_copro, v_p);
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' AND id<>v_p LIMIT 1;
  SELECT round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) INTO v_120
    FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
    WHERE e.copro_id=v_copro AND e.period_id=v_n AND a.code='120';
  SELECT round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) INTO v_110
    FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
    WHERE e.copro_id=v_copro AND e.period_id=v_n AND a.code='110';
  IF v_110 IS NULL OR abs(v_110) < 0.01 THEN
    RAISE EXCEPTION 'ECHEC 2b : le 110 (travaux) est vide, le travaux est encore dans le 120.';
  END IF;
  RAISE NOTICE 'OK 2b : 120=% 110=%', v_120, v_110;
END $$;
```
> Note : si `seed_test_charges` n'existe pas, le créer en amont (petit helper qui poste D6xx/C701|702 via `create_ledger_transaction`). Vérifier au pré-vol l'existence de `create_test_copro_seeded`.

- [ ] **Step 2 : Lancer l'acceptation → échoue**

Run : `execute_sql` de `accept_2b_split.sql`. Expected : `EXCEPTION ECHEC 2b` (110 vide).

- [ ] **Step 3 : Migration — `open_next_period` avec ventilation**

`20260604093000_v2_open_next_period_split_110_120.sql` : reprendre le corps de `20260601114000` à l'identique SAUF le bloc résultat (lignes 36-84). Remplacer le calcul unique `v_net67→120` par deux calculs.

Définition des comptes travaux/exceptionnels : codes `671,672,673,674,677,678,702,705,706`. Reste du 6/7 = courant.
```sql
-- (après la résolution de v_acct_120) résoudre aussi le 110
SELECT id INTO v_acct_110 FROM accounts WHERE copro_id=p_copro_id AND code='110';
IF v_acct_110 IS NULL THEN
  RETURN jsonb_build_object('success',false,'error','Compte 110 absent','copro_id',p_copro_id);
END IF;

-- net COURANT -> 120 (exclut les comptes travaux)
SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2)
  INTO v_net_courant
FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
JOIN accounts a ON a.id=e.account_id
WHERE e.copro_id=p_copro_id AND e.period_id=p_closing_period_id
  AND substr(a.code,1,1) IN ('6','7')
  AND a.code NOT IN ('671','672','673','674','677','678','702','705','706');

-- net TRAVAUX/EXCEPTIONNEL -> 110
SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2)
  INTO v_net_travaux
FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
JOIN accounts a ON a.id=e.account_id
WHERE e.copro_id=p_copro_id AND e.period_id=p_closing_period_id
  AND a.code IN ('671','672','673','674','677','678','702','705','706');

v_result_entry := '[]'::jsonb;
IF v_net_courant <> 0 THEN
  v_result_entry := v_result_entry || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct_120, 'lot_id', NULL,
    'direction', CASE WHEN v_net_courant<0 THEN 'credit' ELSE 'debit' END,
    'amount', abs(v_net_courant), 'entry_label', 'Résultat courant '||v_n.name));
END IF;
IF v_net_travaux <> 0 THEN
  v_result_entry := v_result_entry || jsonb_build_array(jsonb_build_object(
    'account_id', v_acct_110, 'lot_id', NULL,
    'direction', CASE WHEN v_net_travaux<0 THEN 'credit' ELSE 'debit' END,
    'amount', abs(v_net_travaux), 'entry_label', 'Résultat travaux '||v_n.name));
END IF;
```
Déclarer en tête : `v_acct_110 uuid; v_net_courant numeric; v_net_travaux numeric;`. Conserver le reste (carry classes 1/4/5, création N+1, `reverse_period_cutoff`) à l'identique. Mettre à jour le `RETURN` final : remplacer `result_net67`/`result_to_120` par `result_courant`/`result_travaux`.

- [ ] **Step 4 : Appliquer (GO) + relancer l'acceptation → passe**

Run : `apply_migration` 2b puis `execute_sql` `accept_2b_split.sql`. Expected : `NOTICE OK 2b` (110 non vide).

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/20260604093000_v2_open_next_period_split_110_120.sql \
        .planning/acceptance/lot1/accept_2b_split.sql
git commit -m "fix(finance): ventile le resultat courant->120 et travaux->110 dans open_next_period"
```

---

## Task 3 — Phase 2c : câbler `open_next_period` dans l'approbation AG

**Files:**
- Create: `supabase/migrations/20260604094000_v4_0_wire_open_next_period_in_ag.sql`
- Modify (référence): `supabase/migrations/20260601098000_wp5_1_fix_ag_approve_guard.sql` (corps source de `activate_ag_decisions`)
- Test: `.planning/acceptance/lot1/accept_2c_wiring.sql`

- [ ] **Step 1 : Acceptation (échoue avant)** — après `activate_ag_decisions` sur une AG d'approbation des comptes : N passe `approved`, N+1 existe en `open`, une tx `opening_balance` est postée en N+1.
```sql
DO $$
DECLARE v_copro uuid; v_p uuid; v_ag uuid; v_n uuid; v_st text; v_tx int;
BEGIN
  v_copro := create_test_copro_seeded('HARNESS-2c');
  SELECT id INTO v_p FROM accounting_periods WHERE copro_id=v_copro AND status='open' LIMIT 1;
  v_ag := seed_test_ag_approve_accounts(v_copro, v_p);          -- helper : AG + résolution APPROVE_ACCOUNTS + prepare
  PERFORM activate_ag_decisions(v_ag);
  SELECT status INTO v_st FROM accounting_periods WHERE id=v_p;
  IF v_st <> 'approved' THEN RAISE EXCEPTION 'ECHEC 2c : periode N non approuvee (%).', v_st; END IF;
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' AND id<>v_p LIMIT 1;
  IF v_n IS NULL THEN RAISE EXCEPTION 'ECHEC 2c : N+1 non ouverte.'; END IF;
  SELECT count(*) INTO v_tx FROM ledger_transactions
   WHERE copro_id=v_copro AND source_type='opening_balance' AND status='posted';
  IF v_tx < 1 THEN RAISE EXCEPTION 'ECHEC 2c : aucune reprise postee en N+1.'; END IF;
  RAISE NOTICE 'OK 2c : N approuvee, N+1 ouverte, reprise postee.';
END $$;
```

- [ ] **Step 2 : Lancer → échoue** (`open_next_period` pas encore câblé). Expected : `ECHEC 2c : N+1 non ouverte`.

- [ ] **Step 3 : Migration — `activate_ag_decisions` enrichie**

`20260604094000_v4_0_wire_open_next_period_in_ag.sql` : `CREATE OR REPLACE` reprenant `20260601098000`, branche `APPROVE_ACCOUNTS` modifiée ainsi (après `UPDATE budgets ... status='closed'`, AVANT `approve_period`) :
```sql
-- a) clôturer la période si elle est encore ouverte (no-op si déjà closed ; refus si approved)
IF (SELECT status FROM accounting_periods WHERE id=v_action.target_id) = 'approved' THEN
  RAISE EXCEPTION 'Periode deja approuvee : %', v_action.target_id;
ELSIF (SELECT status FROM accounting_periods WHERE id=v_action.target_id) = 'open' THEN
  PERFORM close_period(v_action.target_id);
END IF;

-- b) ouvrir N+1 avec report des soldes (110/120 inclus) AVANT d'approuver N
v_open := open_next_period(v_copro_id, v_action.target_id);
IF NOT coalesce((v_open->>'success')::boolean,false) THEN
  RAISE EXCEPTION 'Ouverture N+1 echouee : %', v_open->>'error';
END IF;

-- c) figer N
v_res := approve_period(v_action.target_id);
IF NOT coalesce((v_res->>'success')::boolean,false) THEN
  RAISE EXCEPTION 'Approbation periode echouee : %', v_res->>'error';
END IF;

-- d) affecter le résultat (stub encore en Task 3 ; implémenté en Task 4)
PERFORM regularize_period(v_copro_id, v_action.target_id);
```
Déclarer `v_open jsonb;`. Enrichir le `result_data` de l'action avec `v_open` (traçabilité). Conserver le reste de la fonction (autres branches, marquage `status='activated'`).

- [ ] **Step 4 : Appliquer (GO) + relancer → passe.** Expected : `NOTICE OK 2c`. Test d'idempotence : relancer `activate_ag_decisions(v_ag)` → 0 action pending, aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations/20260604094000_v4_0_wire_open_next_period_in_ag.sql \
        .planning/acceptance/lot1/accept_2c_wiring.sql
git commit -m "feat(finance): cable open_next_period dans l approbation des comptes AG (V4.0)"
```

---

## Task 4 — Phase 2d : implémenter `regularize_period` (affectation du résultat, WP5.3)

**Files:**
- Create: `supabase/migrations/20260604095000_v4_1_regularize_period_impl.sql`
- Modify (référence): `supabase/migrations/20260601094000_wp5_1_period_functions.sql` (stub source)
- Test: `.planning/acceptance/lot1/accept_2d_affectation.sql`

- [ ] **Step 1 : Acceptation (échoue avant)** — après affectation, le 120 de N+1 est soldé (≈0) et les 450-1 par lot ont reçu le résultat, écriture équilibrée.
```sql
DO $$
DECLARE v_copro uuid; v_p uuid; v_n uuid; v_ag uuid; v_120 numeric; v_alloc numeric;
BEGIN
  v_copro := create_test_copro_seeded('HARNESS-2d');
  SELECT id INTO v_p FROM accounting_periods WHERE copro_id=v_copro AND status='open' LIMIT 1;
  PERFORM seed_test_charges(v_copro, v_p, '601', 1200);  -- déficit courant volontaire
  v_ag := seed_test_ag_approve_accounts(v_copro, v_p);
  PERFORM activate_ag_decisions(v_ag);                   -- déclenche close->open->approve->regularize
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' AND id<>v_p LIMIT 1;
  SELECT round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) INTO v_120
    FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
    WHERE e.copro_id=v_copro AND e.period_id=v_n AND a.code='120';
  IF abs(coalesce(v_120,0)) >= 0.01 THEN
    RAISE EXCEPTION 'ECHEC 2d : 120 non solde apres affectation (=%).', v_120;
  END IF;
  SELECT count(*) INTO v_alloc FROM ledger_transactions
   WHERE copro_id=v_copro AND source_type='result_allocation' AND status='posted';
  IF v_alloc < 1 THEN RAISE EXCEPTION 'ECHEC 2d : aucune ecriture d affectation.'; END IF;
  RAISE NOTICE 'OK 2d : resultat affecte, 120 solde.';
END $$;
```

- [ ] **Step 2 : Lancer → échoue** (regularize_period est un stub). Expected : `ECHEC 2d : 120 non solde`.

- [ ] **Step 3 : Migration — `regularize_period` réelle**

`20260604095000_v4_1_regularize_period_impl.sql` (le `source_type='result_allocation'` est déjà autorisé par la migration préalable `20260604089000`) :
```sql
CREATE OR REPLACE FUNCTION public.regularize_period(p_copro_id uuid, p_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_next uuid; v_next_start date; v_ag_date date := CURRENT_DATE;
  v_key uuid; v_total_w numeric; v_solde_120 numeric; v_entries jsonb := '[]'::jsonb;
  v_acct_120 uuid; v_acct_4501 uuid; v_running numeric := 0; v_alloc numeric; r record; v_lines int := 0;
BEGIN
  -- 1) N+1 (cible de l'affectation) = période ouverte qui suit p_period_id
  SELECT id, start_date INTO v_next, v_next_start FROM accounting_periods
   WHERE copro_id=p_copro_id
     AND start_date > (SELECT end_date FROM accounting_periods WHERE id=p_period_id)
   ORDER BY start_date LIMIT 1;
  IF v_next IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','N+1 introuvable pour affectation');
  END IF;

  -- 2) idempotence : retirer une affectation antérieure si N+1 pas encore approuvée
  IF (SELECT status FROM accounting_periods WHERE id=v_next) <> 'approved' THEN
    DELETE FROM ledger_transactions
     WHERE copro_id=p_copro_id AND source_type='result_allocation' AND source_id=p_period_id;
  END IF;

  -- 3) solde net du 120 en N+1 (tel que reporté par open_next_period)
  SELECT id INTO v_acct_120 FROM accounts WHERE copro_id=p_copro_id AND code='120';
  SELECT id INTO v_acct_4501 FROM accounts WHERE copro_id=p_copro_id AND code='450-1';
  IF v_acct_4501 IS NULL THEN RAISE EXCEPTION 'Compte 450-1 absent (copro %)', p_copro_id; END IF;
  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2)
    INTO v_solde_120
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  JOIN accounts a ON a.id=e.account_id
  WHERE e.copro_id=p_copro_id AND e.period_id=v_next AND a.code='120';

  IF v_solde_120 = 0 THEN
    RETURN jsonb_build_object('success',true,'skipped','solde 120 nul','next_period_id',v_next);
  END IF;

  -- 4) clé générale active + poids
  SELECT id INTO v_key FROM repartition_keys
   WHERE copro_id=p_copro_id AND category='general' AND is_active=true LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Cle de repartition generale active introuvable (copro %)', p_copro_id;
  END IF;
  SELECT sum(weight) INTO v_total_w FROM repartition_key_lines WHERE key_id=v_key;
  IF coalesce(v_total_w,0) <= 0 THEN
    RAISE EXCEPTION 'Somme des poids de la cle generale nulle (copro %)', p_copro_id;
  END IF;

  -- 5) contre-passation du 120 (montant total) + ventilation 450-1 par lot (reste télescopé)
  v_entries := v_entries || jsonb_build_object(
    'account_id', v_acct_120, 'lot_id', NULL,
    'direction', CASE WHEN v_solde_120 > 0 THEN 'credit' ELSE 'debit' END,
    'amount', abs(v_solde_120), 'entry_label', 'Affectation du resultat courant');

  FOR r IN SELECT lot_id, weight FROM repartition_key_lines WHERE key_id=v_key ORDER BY lot_id LOOP
    v_lines := v_lines + 1;
    -- arrondi télescopé : dernière ligne = reste pour garantir Σ = v_solde_120
    IF v_lines = (SELECT count(*) FROM repartition_key_lines WHERE key_id=v_key) THEN
      v_alloc := round(abs(v_solde_120),2) - v_running;
    ELSE
      v_alloc := round(abs(v_solde_120) * r.weight / v_total_w, 2);
      v_running := v_running + v_alloc;
    END IF;
    IF v_alloc <> 0 THEN
      v_entries := v_entries || jsonb_build_object(
        'account_id', v_acct_4501, 'lot_id', r.lot_id,
        'direction', CASE WHEN v_solde_120 > 0 THEN 'debit' ELSE 'credit' END,
        'amount', v_alloc, 'entry_label', 'Affectation resultat au lot');
    END IF;
  END LOOP;

  PERFORM create_ledger_transaction(p_copro_id, v_next, v_ag_date,
    'Affectation du resultat courant '||p_period_id, 'result_allocation', p_period_id, v_entries, true);

  RETURN jsonb_build_object('success',true,'allocated',abs(v_solde_120),
    'next_period_id',v_next,'lines',v_lines);
END $fn$;
```
> Notes : (a) ✅ corrigé dans le corps : `account_id` (UUID `v_acct_4501`) résolu en amont, jamais `account_code`. (b) **Le 110 (travaux) n'est PAS affecté ici** : il reste en attente jusqu'à la clôture de l'opération (feature distincte, hors Lot 1) — conforme décret 2005-240. (c) `v_ag_date` : à ce stade `CURRENT_DATE` ; brancher la vraie date d'AG (`ag_meetings.meeting_date`) plus tard. (d) **OBLIGATOIRE dans cette migration**, après la fonction : `CREATE OR REPLACE FUNCTION is_ledger_regen_exempt(...)` en **conservant la signature exacte lue au pré-vol P5**, ajoutant `'result_allocation'` à la liste autorisée + garde `status <> 'approved'` ; sinon le `DELETE` d'idempotence (étape 2) est rejeté par `trg_ledger_tx_no_delete_posted`.

- [ ] **Step 4 : Appliquer (GO) + relancer → passe.** Expected : `NOTICE OK 2d` (120 soldé). Test idempotence : relancer `regularize_period` → pas de doublon.

- [ ] **Step 5 : Acceptation finale sur la BOUCLE D'OR + non-régression**

Run :
1. `accept_2a/2b/2c/2d` sur copros jetables → tous `OK`.
2. Sur `22222222` : clôturer 2026, approuver via une AG de test, vérifier 2027 `open`, 120 soldé, et **boucle d'or 12 écritures historiques inchangées** (snapshot).
3. `npm run test` (vitest) → 0 régression. `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add supabase/migrations/20260604095000_v4_1_regularize_period_impl.sql \
        .planning/acceptance/lot1/accept_2d_affectation.sql
git commit -m "feat(finance): implemente regularize_period (affectation 120->450-1 par quote-part, WP5.3)"
```

---

## Self-Review (à cocher avant exécution)

- [ ] **Couverture spec** : 2a (chapeau/is_postable) ✓, H-2 split 110/120 ✓ (Task 2), V4.0 câblage ✓ (Task 3), H-1/WP5.3 affectation ✓ (Task 4). V2 (route appel unique) et V3 (FIFO cloisonné) = **hors de ce plan** (plan séparé, bloc 1bis).
- [ ] **Pas de placeholder** : SQL complet à chaque step ; seuls les helpers de test (`seed_test_charges`, `seed_test_ag_approve_accounts`) sont à confirmer/créer au pré-vol — les lister comme Task 0 si absents.
- [ ] **Cohérence des noms** : `tx_id`, `account_id`, `period_id`, `source_type`, `create_ledger_transaction(...)`, `is_postable`, comptes `120/110/450-1/671-678/702/705/706` cohérents entre tasks.
- [ ] **G5** : Task 1 (reclass+enforce) strictement AVANT Task 2/3 (open_next_period). Respecté.
- [ ] **Décisions ouvertes restantes** : date d'AG réelle dans l'affectation (amélioration), blocage si déficit (Q-1, défaut = ne pas bloquer), 110 affecté à la clôture d'opération (feature séparée). Aucune ne bloque ce plan.

---

## Dépendances de test à confirmer au pré-vol (Task 0 si absent)

- `create_test_copro_seeded(text)` — existe (mémoire `test_harness_throwaway_copro`). Confirmer la signature.
- `seed_test_charges(copro, period, code, montant)` — **probablement à créer** (poste D6xx / C701|702 via `create_ledger_transaction`).
- `seed_test_ag_approve_accounts(copro, period)` — **à créer** : crée une AG + résolution `action_type='APPROVE_ACCOUNTS'` + `prepare_ag_decisions`, renvoie l'`ag_id`.
- `close_period`, `open_next_period`, `approve_period`, `activate_ag_decisions`, `regularize_period`, `create_ledger_transaction`, `provision_copro_chart` — existent (vérifiés par la recon).
