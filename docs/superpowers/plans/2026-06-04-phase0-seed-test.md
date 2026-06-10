# Phase 0 — Seed COPRO-TEMPLATE + Vérification — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire de A→Z, **uniquement par les RPC canoniques** (aucun INSERT brut sur le grand livre), une COPRO-TEMPLATE propre qui remplace l'ex-boucle d'or `22222222` et l'ex-immuable `11111111`. Elle exerce TOUTE la boucle financière (à-nouveaux → budget AG → appels agrégés → encaissements FIFO → facture fournisseur → cotisation ALUR → clôture → affectation 110/120 → à-nouveau N+1) + une **mutation** légale (état daté 3 parties art.5 + opposition art.20 + ALUR figé au lot), sous un cabinet de référence, avec cloisonnement multi-cabinet vérifié. Cible d'audit = **0 écart**.

**Architecture:** Une **séquence idempotente de RPC** appliquée sur une **branche Supabase jetable** (MCP `create_branch` → `apply_migration`/`execute_sql` → vérif → `delete_branch`). Le seed est packagé en migrations SQL versionnées sous `Co-Pro-Flex/supabase/migrations/`, chaque migration enrobant un appel de fonction canonique (ou un bloc de seed référentiel). Pour CHAQUE tâche : la (les) fonction(s) appelée(s), des **données d'exemple concrètes** (« Résidence Les Tilleuls », 6 lots), et **une vérification** (DO-block `RAISE` SQL ou assertion vitest) — GL équilibré, 0 créance 45x sans `lot_id`, état daté cohérent en 3 parties, ALUR resté au lot, cloisonnement cabinet. La donnée naît conforme (équilibre, `is_postable`, `lot_id` sur 45x, période ouverte) : **rien à rattraper**.

**Tech Stack:** PostgreSQL (plpgsql `SECURITY DEFINER`), Supabase (branche jetable + MCP `create_branch`/`apply_migration`/`execute_sql`/`delete_branch`), grand livre `ledger_transactions`/`ledger_entries`, harnais vitest (`Co-Pro-Flex/tests/`).

---

## ⚠️ Garde-fous (lire avant de commencer)

- **A1 (verrou USER) : AUCUNE reprise du live.** Tout est construit A→Z par les posteurs canoniques. La base live `iyfesbjnkpynmwlsmxnp` est lecture seule, jamais source de lignes.
- **A2 (verrou USER) : `lot_id` NOT NULL sur TOUT `45%` postable**, sans liste blanche. La donnée naissant par RPC, l'invariant est respecté par construction — `trg_enforce_lot_id_on_45x` ne lèvera jamais ici.
- **Aucun INSERT brut sur le GL.** Tout passe par `create_ledger_transaction` / les posteurs (`post_budget_call_for_funds`, `post_owner_payment`, `validate_budget_expense`, `settle_mutation_opposition`…). Un INSERT direct sur `ledger_entries` est un échec de tâche.
- **GO UTILISATEUR** avant toute `apply_migration` sur le projet **prod** (`iyfesbjnkpynmwlsmxnp`). Phase 0 se construit et se teste **exclusivement sur branche jetable** ; la promotion attend le GO.
- **Lot-centric (verrou) :** le solde vit sur le LOT ; on change `lot_owners`, jamais de transfert personne→personne.
- **Multi-cabinet (verrou) :** le cloisonnement est centralisé dans `user_has_copro_access`/`user_is_copro_manager` (filtre `profiles.cabinet_id = copros.cabinet_id` + bypass `platform_admin`). Phase 0 le **prouve** (Task 19).

### Couverture des risques R1..R42 (REGISTRE-RISQUES)
Phase 0 ne corrige pas les 42 risques (ils relèvent des phases applicatives) mais **chacun est rattaché** ici à la tâche/phase qui le porte ou le neutralise, pour ne rien perdre :

- **Neutralisés par construction A1 (pas de reprise live) :** R4 (`DEFAULT_COPRO_ID 11111111` gelée — la template a un UUID neuf, plus de copro gelée), R17/R39 (`ensure_dev_membership`, `get_default_copro_id`, faux-morts emprunt/avances — non semés), R31/R32 (`dossiers`, `notaires`, `lot_accounts`, îles mortes — jamais créés sur la template).
- **Exercés / prouvés par le seed Phase 0 :** R5 (chaîne AG canonique `prepare→activate→generate_calls→post_budget_call_for_funds` = Task 9–10 ; bespoke jamais appelée), R6 (factures via `post_supplier_invoice`/`post_supplier_payment` post-as-you-go = Task 13), R10 (état daté réel depuis le GL = Task 16–17, neutralise le mock), R14 (modèle RPC-only, RLS ON+FORCE = Task 1 + 19), R26 (signatures canoniques 10-arg/8-arg uniquement = Task 10/13), R27 (`validate_budget_expense` repointée `tiers_id` = Task 13).
- **Garde-fous structurels validés Phase 0 :** R28 (`budget_payment_schedules` non câblée dans le seed — arbitrage USER reporté), R40 (`v_coproprietaires_overview` doublons = Task 6 vérif), R5/R13 ALUR canonique D450-5/C105 (Task 14, `create_alur_fund_from_ag` jamais appelée).
- **Vérifiés inertes/hors-scope Phase 0 (rattachés aux phases ultérieures, listés au §Acceptation) :** R1 (gate `/api/**`), R2/R3 (edges service_role), R7 (`cast_vote`), R8/R9/R11/R12/R15/R16/R18–R25/R29/R30/R33–R38/R41/R42. Phase 0 **n'introduit aucune régression** sur ces axes (aucun front/edge touché) et fournit la **donnée de référence saine** sur laquelle ils seront corrigés. Le mapping complet R1..R42 → phase est maintenu dans le tracker maître `.planning/PROGRESS_REFONTE.md`.

---

## Constantes du seed (UUID fixes pour idempotence et tests)

Déclarées une fois, réutilisées par toutes les migrations (via un schéma `seed` temporaire ou des littéraux). Les tests vitest les importent depuis `Co-Pro-Flex/tests/fixtures/template-ids.ts`.

```
CABINET_DEMO     = '00000000-cab1-4000-8000-000000000001'  -- « Cabinet Démo »
CABINET_RIVAL    = '00000000-cab2-4000-8000-000000000002'  -- 2e cabinet (test cloisonnement)
COPRO_TEMPLATE   = '00000000-c0p0-4000-8000-000000000001'  -- « Résidence Les Tilleuls »
COPRO_RIVAL      = '00000000-c0p0-4000-8000-000000000002'  -- copro du cabinet rival
PERIOD_N         = '00000000-per0-4000-8000-00000000000N'  -- exercice courant (open)
PLATFORM_ADMIN   = '00000000-adm0-4000-8000-000000000001'  -- profil opérateur du seed
MGR_DEMO         = '00000000-mgr0-4000-8000-000000000001'  -- gestionnaire du Cabinet Démo
MGR_RIVAL        = '00000000-mgr0-4000-8000-000000000002'  -- gestionnaire du Cabinet Rival
Lots : A101, A102, A201, A202 (appart.) · B001 (commerce, SCI) · C001 (cave)
```

---

## File Structure

Migrations à créer dans `Co-Pro-Flex/supabase/migrations/` (préfixe `20260604200xxx_seed_*`) :

- `20260604200000_seed_00_global_refs.sql` — référentiels globaux (work_domain, email_templates, platform_admin).
- `20260604200100_seed_01_cabinet_copro.sql` — cabinet démo + copro + building.
- `20260604200200_seed_02_lots_keys.sql` — 6 lots + 4 clés de répartition (lignes de poids).
- `20260604200300_seed_03_owners.sql` — 5 coproprietaires + lot_owners + memberships + reminder rules.
- `20260604200400_seed_04_chart_period.sql` — `provision_copro_chart` + période N ouverte.
- `20260604200500_seed_05_opening_balance.sql` — `set_opening_balance` (à-nouveaux 45x avec lot_id).
- `20260604200600_seed_06_ag_budget.sql` — AG + `finalize_and_activate_ag` → appels agrégés.
- `20260604200700_seed_07_payments.sql` — `post_owner_payment` (FIFO cloisonné, 1-2 lots impayés).
- `20260604200800_seed_08_supplier.sql` — `post_supplier_invoice` + `post_supplier_payment` + `validate_budget_expense`.
- `20260604200900_seed_09_alur.sql` — AG ALUR → `generate_calls_from_ag_payload` (D450-5/C105) + encaissement.
- `20260604201000_seed_10_close_allocate.sql` — close/approve + `open_next_period` (split 110/120) + `regularize_period`.
- `20260604201100_seed_11_mutation.sql` — mutation A102 : état daté + opposition art.20 + validate + reconstitution avances.
- `20260604201200_seed_12_second_cabinet.sql` — cabinet/copro rival (cloisonnement).

Scripts d'acceptation (non migrés, lancés via MCP `execute_sql`) dans `Co-Pro-Flex/.planning/acceptance/phase0/` (un par tâche `accept_NN_*.sql`).

Harnais vitest dans `Co-Pro-Flex/tests/seed-template.spec.ts` + fixtures `Co-Pro-Flex/tests/fixtures/template-ids.ts`.

---

## Pré-vol (avant d'écrire la moindre migration)

Exécuter sur la **branche jetable** via MCP `execute_sql` et noter les résultats dans ce fichier — ils conditionnent les arguments exacts des RPC.

- [ ] **P0 — Créer la branche jetable**
  MCP `create_branch` (nom `phase0-seed`). Noter le `branch_id` / `project_ref` de la branche. **Tout le reste de Phase 0 s'exécute sur cette branche.**
  **Test :** `list_branches` renvoie la branche `phase0-seed` en `status='ACTIVE'`.

- [ ] **P1 — Signatures exactes des RPC canoniques à appeler**
  ```sql
  SELECT proname, pg_get_function_arguments(oid)
  FROM pg_proc
  WHERE proname IN ('provision_copro_chart','set_opening_balance','finalize_and_activate_ag',
    'post_budget_call_for_funds','post_owner_payment','post_supplier_invoice','post_supplier_payment',
    'validate_budget_expense','generate_calls_from_ag_payload','open_next_period','close_period',
    'approve_period','regularize_period','generate_etat_date_payload','create_etat_date_snapshot',
    'record_mutation_opposition','settle_mutation_opposition','validate_mutation','reconstitute_buyer_advances',
    'create_default_reminder_rules')
  ORDER BY proname;
  ```
  **Test :** chaque fonction listée existe avec sa signature. Reporter ici l'ordre exact des arguments (les migrations doivent appeler par signature réelle, jamais devinée).

- [ ] **P2 — Confirmer le trigger A2 élargi est en place**
  ```sql
  SELECT tgname FROM pg_trigger WHERE tgrelid = 'ledger_entries'::regclass
    AND tgname = 'trg_enforce_lot_id_on_45x';
  ```
  **Test :** 1 ligne. Sinon, le schéma cible n'est pas appliqué sur la branche → appliquer d'abord les migrations de structure (hors Phase 0).

- [ ] **P3 — Comptes ALUR présents dans le chart provisionné (105 réserve, 450-5)**
  Noté APRÈS Task 8 (provision_copro_chart). Placeholder ici : vérifier que `provision_copro_chart` crée bien `105`, `450-5`, `471`, `472`.

---

# Phase A — Référentiels globaux (V0)

## Task 1 — Seed des référentiels globaux + RLS ON
- [ ] Créer `20260604200000_seed_00_global_refs.sql`.
  - INSERT `work_domain` (~28 slugs, `ON CONFLICT DO NOTHING`) — FK consommée par tiers/contracts/logbook.
  - INSERT 6 `email_templates` système (`copro_id NULL`) : `ag_convocation`, `ag_relance`, `ag_pv_notification`, `payment_reminder_7`, `payment_reminder_30`, `payment_reminder_60` (obligatoires : `create_default_reminder_rules` en dépend).
  - INSERT 1 `profiles` `PLATFORM_ADMIN` (rôle transverse, `cabinet_id NULL`).
  - S'assurer que **RLS est ENABLE + FORCE** sur le noyau finance (vérif, pas de désactivation).
- **Fonctions appelées :** aucune (seed référentiel pur, `ON CONFLICT` = idempotent).
- **Données d'exemple :** templates avec `code` exact attendu par `create_default_reminder_rules` (ex. `payment_reminder_7`).
- **Vérification (SQL) :** `accept_01_global_refs.sql`
  ```sql
  DO $$
  BEGIN
    IF (SELECT count(*) FROM email_templates WHERE copro_id IS NULL
        AND code IN ('ag_convocation','ag_relance','ag_pv_notification',
        'payment_reminder_7','payment_reminder_30','payment_reminder_60')) <> 6
      THEN RAISE EXCEPTION 'P0-T1: 6 templates système attendus'; END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-adm0-4000-8000-000000000001')
      THEN RAISE EXCEPTION 'P0-T1: platform_admin manquant'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): référentiels globaux (work_domain, email_templates, platform_admin)` — *(neutralise R4 : plus de DEFAULT_COPRO_ID)*

---

# Phase B — Cabinet + socle copro (domaine 01)

## Task 2 — Cabinet Démo (tenant racine)
- [ ] Créer `20260604200100_seed_01_cabinet_copro.sql` (partie cabinet).
  - INSERT `cabinets` `CABINET_DEMO` : `name='Cabinet Démo'`, `siret='90000000100017'`, `email='contact@cabinet-demo.fr'`, `city='Lyon'`, `is_active=true`. `ON CONFLICT (id) DO NOTHING`.
  - INSERT/UPDATE `profiles` `MGR_DEMO` (`cabinet_id = CABINET_DEMO`, rôle gestionnaire).
- **Fonctions appelées :** aucune (racine de tenance, INSERT direct autorisé — `cabinets` n'est pas du comptable).
- **Vérification (SQL) :** `accept_02_cabinet.sql`
  ```sql
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM cabinets WHERE id='00000000-cab1-4000-8000-000000000001' AND is_active)
      THEN RAISE EXCEPTION 'P0-T2: cabinet démo absent'; END IF;
    IF (SELECT cabinet_id FROM profiles WHERE id='00000000-mgr0-4000-8000-000000000001')
       <> '00000000-cab1-4000-8000-000000000001'
      THEN RAISE EXCEPTION 'P0-T2: gestionnaire non rattaché au cabinet'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): cabinet démo + gestionnaire rattaché`

## Task 3 — Copro « Résidence Les Tilleuls » + building
- [ ] Compléter `20260604200100_seed_01_cabinet_copro.sql`.
  - INSERT `copros` `COPRO_TEMPLATE` : `cabinet_id = CABINET_DEMO` (FK NOT NULL), `name='Résidence Les Tilleuls'`, `address='12 rue des Tilleuls'`, `city='Lyon'`, `postal_code='69003'`, `exercice_debut=1`.
  - INSERT 1 `buildings` (`name='Bâtiment A'`, `copro_id=COPRO_TEMPLATE`).
- **Fonctions appelées :** aucune (socle copro).
- **Vérification (SQL) :**
  ```sql
  DO $$ BEGIN
    IF (SELECT cabinet_id FROM copros WHERE id='00000000-c0p0-4000-8000-000000000001')
       <> '00000000-cab1-4000-8000-000000000001'
      THEN RAISE EXCEPTION 'P0-T3: copro non rattachée au cabinet démo'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): copro Résidence Les Tilleuls (cabinet démo)`

## Task 4 — 6 lots
- [ ] Créer `20260604200200_seed_02_lots_keys.sql` (partie lots).
  - INSERT `lots` : `A101`,`A102`,`A201`,`A202` (appartements), `B001` (commerce), `C001` (cave), tous `copro_id=COPRO_TEMPLATE`, `building_id=Bâtiment A`. **Aucune colonne `tantiemes_*`** (supprimée — quotes-parts portées par les clés).
- **Fonctions appelées :** aucune.
- **Vérification (SQL) :** 6 lots, aucun avec colonne tantième.
  ```sql
  DO $$ BEGIN
    IF (SELECT count(*) FROM lots WHERE copro_id='00000000-c0p0-4000-8000-000000000001') <> 6
      THEN RAISE EXCEPTION 'P0-T4: 6 lots attendus'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): 6 lots de la template`

## Task 5 — 4 clés de répartition + lignes de poids (Σ bouclant)
- [ ] Compléter `20260604200200_seed_02_lots_keys.sql`.
  - INSERT `repartition_keys` (`is_active=true`, `repartition_key_is_complete=true`) :
    - **Générale** (`category='general'`) — tous les lots, Σ weight = 1000.
    - **Ascenseur** (`category='special'`) — A201,A202,B001, Σ = 1000.
    - **Eau froide** (`category='special'`) — A101,A102,A201,A202, Σ = 1000.
    - **ALUR** (`category='alur'`, art.14-2) — quotes-parts générales, Σ = 1000.
  - INSERT `repartition_key_lines` (`weight`) : Générale = A101:180, A102:180, A201:200, A202:200, B001:200, C001:40 (Σ=1000). ALUR identique. Ascenseur = A201:340, A202:340, B001:320. Eau froide = A101:250×4.
- **Fonctions appelées :** `repartition_key_is_complete` (invariant, vérif post-insert).
- **Vérification (SQL) :** `accept_05_keys.sql` — chaque clé somme à son total et est complète.
  ```sql
  DO $$
  DECLARE k record;
  BEGIN
    FOR k IN SELECT id, name FROM repartition_keys WHERE copro_id='00000000-c0p0-4000-8000-000000000001'
    LOOP
      IF (SELECT sum(weight) FROM repartition_key_lines WHERE key_id=k.id) <> 1000
        THEN RAISE EXCEPTION 'P0-T5: clé % ne somme pas à 1000', k.name; END IF;
      IF NOT repartition_key_is_complete(k.id)
        THEN RAISE EXCEPTION 'P0-T5: clé % incomplète', k.name; END IF;
    END LOOP;
  END $$;
  ```
- **Commit :** `chore(seed): 4 clés de répartition (générale, ascenseur, eau, ALUR)`

## Task 6 — 5 coproprietaires + lot_owners + memberships + reminder rules
- [ ] Créer `20260604200300_seed_03_owners.sql`.
  - INSERT 5 `coproprietaires` : 4 personnes physiques + 1 **SCI** (personne morale) propriétaire du commerce B001. Un copropriétaire possède **2 lots** (ex. A101+A202).
  - INSERT `lot_owners` : 1 **primaire actif** par lot (`is_primary=true`, `end_date NULL`, `share=100`).
  - INSERT `memberships` (gestionnaire ↔ copro) ; `coproprietaires.user_id` reste NULL (portail différé).
  - Appeler `create_default_reminder_rules(COPRO_TEMPLATE)` (relances J+15/30/60, lit `email_templates`).
- **Fonctions appelées :** `create_default_reminder_rules`.
- **Données d'exemple :** SCI = `name='SCI Le Commerce'`, `is_company=true`.
- **Vérification (SQL) :** `accept_06_owners.sql` — 1 primaire actif/lot ; `v_coproprietaires_overview` ne renvoie pas de doublon (garde-fou R40).
  ```sql
  DO $$ BEGIN
    IF EXISTS (
      SELECT lot_id FROM lot_owners WHERE copro_id='00000000-c0p0-4000-8000-000000000001'
        AND is_primary AND end_date IS NULL GROUP BY lot_id HAVING count(*) > 1)
      THEN RAISE EXCEPTION 'P0-T6: >1 primaire actif sur un lot'; END IF;
    IF (SELECT count(DISTINCT coproprietaire_id) FROM lot_owners
        WHERE copro_id='00000000-c0p0-4000-8000-000000000001' AND end_date IS NULL) <> 5
      THEN RAISE EXCEPTION 'P0-T6: 5 copropriétaires attendus'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): 5 copropriétaires + lot_owners + relances` — *(garde-fou R40)*

## Task 7 — Plan comptable canonique
- [ ] Créer `20260604200400_seed_04_chart_period.sql` (partie chart).
  - Appeler `provision_copro_chart(COPRO_TEMPLATE)` → crée 450-1 courant, 450-2 travaux, 450-3 avance, 450-5 ALUR (`nature` posée), **105** réserve ALUR, 512 banque, 401 fournisseurs, 6x charges, 7x produits, 110/120 report, **471/472** comptes d'attente reprise de mandat. `450` parent `is_postable=false`.
- **Fonctions appelées :** `provision_copro_chart`.
- **Vérification (SQL) :** `accept_07_chart.sql` — comptes clés présents, `450` parent non postable, natures 45x posées.
  ```sql
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE copro_id='00000000-c0p0-4000-8000-000000000001'
        AND code='450' AND is_postable=false)
      THEN RAISE EXCEPTION 'P0-T7: 450 parent doit être is_postable=false'; END IF;
    IF (SELECT count(*) FROM accounts WHERE copro_id='00000000-c0p0-4000-8000-000000000001'
        AND code IN ('450-1','450-2','450-3','450-5','105','512','401','110','120','471','472')) < 11
      THEN RAISE EXCEPTION 'P0-T7: comptes canoniques manquants'; END IF;
    IF EXISTS (SELECT 1 FROM accounts WHERE copro_id='00000000-c0p0-4000-8000-000000000001'
        AND code LIKE '450-%' AND nature IS NULL)
      THEN RAISE EXCEPTION 'P0-T7: nature 45x non posée'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): provision_copro_chart (plan comptable canonique)`

## Task 8 — Exercice N ouvert
- [ ] Compléter `20260604200400_seed_04_chart_period.sql`.
  - INSERT `accounting_periods` `PERIOD_N` : `name='Exercice 2026'`, `start_date='2026-01-01'`, `end_date='2026-12-31'`, `status='open'`.
- **Fonctions appelées :** aucune (la contrainte `UNIQUE (copro_id) WHERE status='open'` garantit l'unicité).
- **Vérification (SQL) :** exactement 1 période ouverte.
  ```sql
  DO $$ BEGIN
    IF (SELECT count(*) FROM accounting_periods WHERE copro_id='00000000-c0p0-4000-8000-000000000001'
        AND status='open') <> 1
      THEN RAISE EXCEPTION 'P0-T8: 1 seule période ouverte attendue'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): exercice 2026 ouvert`

---

# Phase C — À-nouveaux d'ouverture propres (A2)

## Task 9 — Reprise de mandat (à-nouveaux 45x avec lot_id)
- [ ] Créer `20260604200500_seed_05_opening_balance.sql`.
  - Appeler `set_opening_balance(COPRO_TEMPLATE, PERIOD_N, as_of='2026-01-01', lines=[...])` : chaque ligne 45x porte un **`lot_id`**, contrepartie **471/472**, `source_type='opening_onboarding'`. Ex. : A101 léger débit 450-1 (120,00 €), A202 en avance 450-3 (−80,00 €), B001 (SCI) 450-1 (250,00 €). Solde initial réaliste, non bloquant.
- **Fonctions appelées :** `set_opening_balance` (→ `create_ledger_transaction` en interne).
- **Vérification (SQL) :** `accept_09_opening.sql` — GL équilibré, 0 ligne 45x sans lot_id, contrepartie 471/472.
  ```sql
  DO $$
  DECLARE v_d numeric; v_c numeric; v_orphan int;
  BEGIN
    SELECT coalesce(sum(amount) FILTER (WHERE direction='debit'),0),
           coalesce(sum(amount) FILTER (WHERE direction='credit'),0)
    INTO v_d, v_c
    FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id
    WHERE e.copro_id='00000000-c0p0-4000-8000-000000000001' AND t.status='posted';
    IF v_d <> v_c THEN RAISE EXCEPTION 'P0-T9: GL déséquilibré D=% C=%', v_d, v_c; END IF;
    SELECT count(*) INTO v_orphan FROM ledger_entries e
      JOIN accounts a ON a.id=e.account_id
      WHERE e.copro_id='00000000-c0p0-4000-8000-000000000001'
        AND a.code LIKE '45%' AND a.is_postable AND e.lot_id IS NULL;
    IF v_orphan > 0 THEN RAISE EXCEPTION 'P0-T9: % créance 45x sans lot_id', v_orphan; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): à-nouveaux d'ouverture (set_opening_balance, lot-centric)` — *(prouve A2)*

---

# Phase D — Boucle financière de l'exercice N

## Task 10 — AG budget → appels de fonds agrégés
- [ ] Créer `20260604200600_seed_06_ag_budget.sql`.
  - Créer `ag_meetings` (ordinaire) + `ag_attendance` (tantièmes figés) + `ag_resolutions` (`CREATE_BUDGET` 24 000 € + `SCHEDULE_BUDGET_PAYMENTS` trimestriel) + `ag_votes` (adopté).
  - Appeler **`finalize_and_activate_ag(ag_id, true)`** → budget validé + **appels agrégés** via la chaîne canonique `prepare_ag_decisions → activate_ag_decisions → generate_calls_from_ag_payload → post_budget_call_for_funds` (10-args, 1 ligne par lot×clé, **D450-1/lot · C701**).
- **Fonctions appelées :** `finalize_and_activate_ag` (orchestrateur) → `post_budget_call_for_funds` (10-arg). **JAMAIS** `create_budget_from_ag`/`generate_combined_calls_from_ag` (bespoke abandonnée).
- **Vérification (SQL) :** `accept_10_calls.sql` — GL toujours équilibré ; total appelé T1 = 6 000 € (24 000/4) ; chaque ligne 450-1 a un lot_id ; C701 = Σ D450-1.
  ```sql
  DO $$
  DECLARE v_d701 numeric; v_c701 numeric; v_sum450 numeric;
  BEGIN
    SELECT coalesce(sum(amount) FILTER (WHERE a.code='701' AND direction='credit'),0)
    INTO v_c701 FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
      JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
      AND t.source_type='call_for_funds'
    WHERE e.copro_id='00000000-c0p0-4000-8000-000000000001';
    SELECT coalesce(sum(amount) FILTER (WHERE a.code='450-1' AND direction='debit'),0)
    INTO v_sum450 FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
      JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
      AND t.source_type='call_for_funds'
    WHERE e.copro_id='00000000-c0p0-4000-8000-000000000001';
    IF round(v_c701,2) <> round(v_sum450,2)
      THEN RAISE EXCEPTION 'P0-T10: C701 (%) <> Σ D450-1 (%)', v_c701, v_sum450; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): AG budget → appels agrégés (chaîne canonique)` — *(exerce R5)*

## Task 11 — Encaissements FIFO cloisonnés (1-2 lots laissés impayés)
- [ ] Créer `20260604200700_seed_07_payments.sql`.
  - Pour les lots payeurs (A101, A201, A202, B001), appeler **`post_owner_payment(COPRO_TEMPLATE, PERIOD_N, lot, montant, date, …, call_line_ids)`** → **D512/C450-1**, imputation **FIFO cloisonnée par nature** (courant ≠ travaux ≠ ALUR). **Laisser A102 et C001 impayés** pour exercer les relances.
- **Fonctions appelées :** `post_owner_payment` → `allocate_payment` (FIFO par nature).
- **Données d'exemple :** A101 paie 1 080 € (= sa part T1), A201 paie 1 200 €, etc. A102/C001 = 0.
- **Vérification (SQL) :** `accept_11_payments.sql` — GL équilibré ; A102 et C001 toujours débiteurs sur `v_unpaid_lots` ; FIFO n'a imputé que des lignes de même nature.
  ```sql
  DO $$ BEGIN
    IF (SELECT count(*) FROM v_unpaid_lots WHERE copro_id='00000000-c0p0-4000-8000-000000000001') < 2
      THEN RAISE EXCEPTION 'P0-T11: au moins 2 lots impayés attendus (relances)'; END IF;
    -- pas de mismatch relevé/GL
    IF EXISTS (SELECT 1 FROM v_lot_vs_gl_mismatch WHERE copro_id='00000000-c0p0-4000-8000-000000000001')
      THEN RAISE EXCEPTION 'P0-T11: écart relevé d''appel vs GL'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): encaissements FIFO cloisonnés + 2 lots impayés`

## Task 12 — Facture fournisseur (engagement → réalisé → payé)
- [ ] Créer `20260604200800_seed_08_supplier.sql`.
  - Créer 1 `tiers` (`is_supplier=true`, `name='Ascenseurs Otis SA'`, `iban`).
  - Appeler **`post_supplier_invoice(...)`** (mono-poste, **D6xx/C401**, FK `tiers_id`) puis **`post_supplier_payment(...)`** (8-arg idempotent, **D401/C512**).
  - Créer 1 `budget_expense` `validated` et appeler **`validate_budget_expense(...)`** (réalisé D6xx/C401, écrit `ledger_tx_id`, résout le nom via `tiers.name`).
- **Fonctions appelées :** `post_supplier_invoice`, `post_supplier_payment` (8-arg), `validate_budget_expense`. **JAMAIS** la 7-arg de `post_supplier_payment`.
- **Données d'exemple :** facture 1 800 € TTC, compte de charge 615 (entretien ascenseur).
- **Vérification (SQL) :** `accept_12_supplier.sql` — GL équilibré ; `budget_expenses.ledger_tx_id` non NULL ; 401 soldé après paiement.
  ```sql
  DO $$
  DECLARE v401 numeric;
  BEGIN
    IF EXISTS (SELECT 1 FROM budget_expenses WHERE copro_id='00000000-c0p0-4000-8000-000000000001'
        AND status='validated' AND ledger_tx_id IS NULL)
      THEN RAISE EXCEPTION 'P0-T12: dépense validée sans ledger_tx_id'; END IF;
    SELECT coalesce(sum(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) INTO v401
    FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
      JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
    WHERE e.copro_id='00000000-c0p0-4000-8000-000000000001' AND a.code='401';
    IF v401 <> 0 THEN RAISE EXCEPTION 'P0-T12: 401 non soldé (%)', v401; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): facture fournisseur post-as-you-go (D6xx/C401, D401/C512)` — *(exerce R6/R27)*

## Task 13 — Cotisation ALUR (art.14-2) D450-5/C105
- [ ] Créer `20260604200900_seed_09_alur.sql`.
  - Créer une résolution ALUR votée + `finalize_and_activate_ag(ag_alur, true)` → **`generate_calls_from_ag_payload(... budget_type='alur')`** ⇒ appel sur la **clé ALUR**, **D450-5/lot · C105** (réserve art.14-2 II, **PAS 701**).
  - Encaissement ALUR via `post_owner_payment(...)` → **D512/C450-5**.
- **Fonctions appelées :** `finalize_and_activate_ag` → `generate_calls_from_ag_payload` (maillon ALUR) → `post_budget_call_for_funds`. **`create_alur_fund_from_ag` JAMAIS appelée** (abandonnée, pas d'appel bespoke hors-GL).
- **Données d'exemple :** cotisation ALUR = MAX(2,5 % PPT ; 5 % budget) ≈ 1 200 €.
- **Vérification (SQL) :** `accept_13_alur.sql` — la contrepartie de l'appel ALUR est **105**, jamais 701 ; chaque D450-5 a un lot_id.
  ```sql
  DO $$
  DECLARE v_c105 numeric; v_bad701 numeric;
  BEGIN
    SELECT coalesce(sum(amount),0) INTO v_c105 FROM ledger_entries e
      JOIN accounts a ON a.id=e.account_id
      JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted' AND t.source_type='call_for_funds'
    WHERE e.copro_id='00000000-c0p0-4000-8000-000000000001' AND a.code='105' AND e.direction='credit';
    IF v_c105 <= 0 THEN RAISE EXCEPTION 'P0-T13: cotisation ALUR pas créditée en 105'; END IF;
    SELECT count(*) INTO v_bad701 FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
      WHERE e.copro_id='00000000-c0p0-4000-8000-000000000001' AND a.code='450-5' AND e.lot_id IS NULL;
    IF v_bad701 > 0 THEN RAISE EXCEPTION 'P0-T13: 450-5 sans lot_id'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): cotisation ALUR canonique (D450-5/C105)` — *(exerce R5/R13 ALUR)*

---

# Phase E — Clôture + affectation + à-nouveau

## Task 14 — Clôture N + ouverture N+1 (split 110/120) + affectation
- [ ] Créer `20260604201000_seed_10_close_allocate.sql`.
  - `close_period(COPRO_TEMPLATE, PERIOD_N)` puis `approve_period(...)`.
  - **`open_next_period(COPRO_TEMPLATE, PERIOD_N, …)`** → ouvre N+1, reporte les soldes, **split 110/120** (110 travaux, 120 courant), à-nouveaux N+1 par quote-part.
  - **`regularize_period(COPRO_TEMPLATE, PERIOD_N)`** → affectation du résultat daté à l'AG : **D120/C450-1** (courant) **ET D110/C450-2** (travaux) par quote-part. Appelle `assert_result_allocation_split` en fin (rollback si non ventilé).
- **Fonctions appelées :** `close_period`, `approve_period`, `open_next_period`, `regularize_period` (→ `assert_result_allocation_split`).
- **Vérification (SQL) :** `accept_14_close.sql` — `v_result_allocation_split` renvoie 0 ligne (invariant 110/120 respecté) ; N+1 ouverte ; report présent.
  ```sql
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM v_result_allocation_split
        WHERE copro_id='00000000-c0p0-4000-8000-000000000001')
      THEN RAISE EXCEPTION 'P0-T14: invariant 110/120 violé (split non conforme)'; END IF;
    IF (SELECT count(*) FROM accounting_periods WHERE copro_id='00000000-c0p0-4000-8000-000000000001'
        AND status='open') <> 1
      THEN RAISE EXCEPTION 'P0-T14: une seule période ouverte (N+1) attendue'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): clôture N + open_next_period (split 110/120) + affectation` — *(garde-fou ventilation, neutralise bug live « tout sur 120 »)*

---

# Phase F — Mutation (état daté + opposition art.20)

## Task 15 — Créer la mutation (vente A102)
- [ ] Créer `20260604201100_seed_11_mutation.sql` (partie mutation).
  - Créer 1 `tiers` notaire (`is_notary=true`, `name='Maître Durand'`, `office_name='Étude Durand'`).
  - INSERT `mutations` : `lot_id=A102`, `mutation_type='sale'`, `seller_owner_id` (propriétaire actuel d'A102), `notaire_id` (tiers notaire), `buyer_owner_id=NULL`. Le trigger `tr_mutation_init_steps` seede les 6 steps.
- **Fonctions appelées :** trigger `initialize_mutation_steps` (auto).
- **Vérification (SQL) :** 6 steps seedés (demande=completed, reste pending).
  ```sql
  DO $$ BEGIN
    IF (SELECT count(*) FROM mutation_steps ms JOIN mutations m ON m.id=ms.mutation_id
        WHERE m.copro_id='00000000-c0p0-4000-8000-000000000001') <> 6
      THEN RAISE EXCEPTION 'P0-T15: 6 steps de mutation attendus'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): mutation vente A102 (notaire = tiers is_notary)`

## Task 16 — État daté 3 parties (art.5) figé depuis le GL
- [ ] Compléter `20260604201100_seed_11_mutation.sql`.
  - Appeler `generate_etat_date_payload(COPRO_TEMPLATE, mutation_id, 'final', effective_date='2026-09-30')` puis `create_etat_date_snapshot(...)` (`pre` puis `final`) → snapshot **figé depuis le GL** à `effective_date`, payload avec **P1 sommes dues vendeur**, **P2 quote-part**, **P3 charge acquéreur**.
- **Fonctions appelées :** `generate_etat_date_payload`, `create_etat_date_snapshot`.
- **Vérification (SQL) :** `accept_16_etat_date.sql` — les 3 clés de payload présentes (CHECK `ck_etat_date_payload_parts`) ; P1 = solde 450 exigible du LOT à effective_date ; snapshot immuable.
  ```sql
  DO $$
  DECLARE p jsonb;
  BEGIN
    SELECT payload INTO p FROM etat_date_snapshots
      WHERE copro_id='00000000-c0p0-4000-8000-000000000001' AND snapshot_type='final' LIMIT 1;
    IF NOT (p ? 'partie_1_sommes_dues_vendeur' AND p ? 'partie_2_dues_par_syndicat'
            AND p ? 'partie_3_charge_acquereur')
      THEN RAISE EXCEPTION 'P0-T16: état daté incomplet (3 parties art.5 requises)'; END IF;
  END $$;
  ```
  Test d'immutabilité : un `UPDATE etat_date_snapshots SET effective_date=...` doit **RAISE** (trigger `tr_etat_date_immutable`).
- **Commit :** `chore(seed): état daté 3 parties figé depuis le GL` — *(exerce R10 — état daté réel)*

## Task 17 — Opposition art.20 (montant + causes) + encaissement notaire
- [ ] Compléter `20260604201100_seed_11_mutation.sql`.
  - `record_mutation_opposition(mutation_id, avis_date='2026-09-15', causes)` → fige `amount_opposed` = P1, `opposition_deadline = avis+15j`, status→`opposed`.
  - `settle_mutation_opposition(opposition_id, payment_date='2026-10-10', amount)` → **D512/C450-x** (`source_type='mutation'`) **apurant le 450 exigible du LOT**. **Fonds ALUR (105/450-5) NON touchés.**
- **Fonctions appelées :** `record_mutation_opposition`, `settle_mutation_opposition`.
- **Vérification (SQL) :** `accept_17_opposition.sql` — deadline = avis+15j ; après règlement, le 450 exigible courant du lot A102 = 0 ; le **450-5 (ALUR) du lot A102 est inchangé**.
  ```sql
  DO $$
  DECLARE v_alur_before numeric; v_alur_after numeric; v_deadline date; v_avis date;
  BEGIN
    SELECT avis_mutation_date, opposition_deadline INTO v_avis, v_deadline
      FROM mutation_oppositions WHERE copro_id='00000000-c0p0-4000-8000-000000000001' LIMIT 1;
    IF v_deadline <> v_avis + 15 THEN RAISE EXCEPTION 'P0-T17: deadline art.20 <> avis+15j'; END IF;
    -- ALUR du lot A102 inchangé : aucune écriture source_type='mutation' ne touche 450-5
    IF EXISTS (SELECT 1 FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
        JOIN ledger_transactions t ON t.id=e.tx_id AND t.source_type='mutation'
        WHERE e.copro_id='00000000-c0p0-4000-8000-000000000001' AND a.code='450-5')
      THEN RAISE EXCEPTION 'P0-T17: la mutation a touché le fonds ALUR (interdit)'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): opposition art.20 + encaissement notaire (apure le 450 du lot)`

## Task 18 — Validation mutation (bascule lot_owners) + reconstitution avances
- [ ] Compléter `20260604201100_seed_11_mutation.sql`.
  - Créer le coproprietaire acquéreur. `validate_mutation(mutation_id, signature_date, effective_date, buyer_owner_id)` → bascule `lot_owners` (clôt le vendeur, ouvre l'acquéreur à `effective_date`), **le solde reste sur le lot**, ALUR inchangé, step `cloture_compte=completed`.
  - `reconstitute_buyer_advances(mutation_id, amount, payment_date)` → **D512/C450-3** (avances reconstituées par l'acquéreur).
- **Fonctions appelées :** `validate_mutation`, `reconstitute_buyer_advances`.
- **Vérification (SQL) :** `accept_18_validate.sql` — A102 a un nouveau primaire actif (l'acquéreur), l'ancien `lot_owners` est clôturé à effective_date, **aucune écriture `source_type='mutation'` de transfert personne→personne** ; GL toujours équilibré.
  ```sql
  DO $$ BEGIN
    IF (SELECT count(*) FROM lot_owners lo JOIN lots l ON l.id=lo.lot_id
        WHERE l.copro_id='00000000-c0p0-4000-8000-000000000001' AND l.reference='A102'
        AND lo.is_primary AND lo.end_date IS NULL) <> 1
      THEN RAISE EXCEPTION 'P0-T18: A102 doit avoir exactement 1 primaire actif (acquéreur)'; END IF;
  END $$;
  ```
- **Commit :** `chore(seed): validate_mutation (bascule lot_owners, solde reste au lot)`

---

# Phase G — Second cabinet (cloisonnement multi-cabinet)

## Task 19 — Cabinet rival + vérif cloisonnement RLS
- [ ] Créer `20260604201200_seed_12_second_cabinet.sql`.
  - INSERT `cabinets` `CABINET_RIVAL` + `profiles` `MGR_RIVAL` (`cabinet_id=CABINET_RIVAL`) + `copros` `COPRO_RIVAL` (`cabinet_id=CABINET_RIVAL`).
- **Fonctions appelées :** aucune (socle tenance) ; vérif via `user_has_copro_access`/`user_is_copro_manager`.
- **Vérification (SQL) :** `accept_19_cloisonnement.sql` — le gestionnaire rival ne voit **pas** la COPRO-TEMPLATE ; le gestionnaire démo ne voit pas la copro rivale ; `platform_admin` voit les deux.
  ```sql
  -- simuler le contexte rôle via les helpers (set local role + jwt claims, ou test direct des helpers)
  DO $$ BEGIN
    -- MGR_RIVAL ne doit pas être manager de la template
    IF user_is_copro_manager('00000000-c0p0-4000-8000-000000000001',
                             '00000000-mgr0-4000-8000-000000000002')
      THEN RAISE EXCEPTION 'P0-T19: FUITE inter-cabinet — rival manage la template'; END IF;
    -- MGR_DEMO est bien manager de la template
    IF NOT user_is_copro_manager('00000000-c0p0-4000-8000-000000000001',
                                 '00000000-mgr0-4000-8000-000000000001')
      THEN RAISE EXCEPTION 'P0-T19: MGR_DEMO devrait manager la template'; END IF;
  END $$;
  ```
  *(Adapter la signature de `user_is_copro_manager` au résultat P1 — certains helpers lisent `auth.uid()` ; dans ce cas exécuter via `set_config('request.jwt.claims', ...)` pour simuler chaque rôle.)*
- **Commit :** `chore(seed): 2e cabinet + preuve de cloisonnement RLS` — *(prouve R14 RLS cloisonnée ; rattache le périmètre de R1/R2/R3 aux phases edges/API)*

---

# Phase H — Harnais de non-régression (boucle d'or sur la template)

## Task 20 — Fixtures + spec vitest globale
- [ ] Créer `Co-Pro-Flex/tests/fixtures/template-ids.ts` (export typé des UUID constantes ci-dessus, **pas de `any`**).
- [ ] Créer `Co-Pro-Flex/tests/seed-template.spec.ts` : exécute l'audit global + rejoue les invariants clés contre la branche jetable (via client Supabase de test pointant la branche).
- **Vérification (vitest) :** la suite passe en vert (équivalent boucle d'or). Assertions :
  ```ts
  it('audit_finance_integrity = 0 écart', async () => {
    const { data } = await db.rpc('audit_finance_integrity', { p_copro_id: COPRO_TEMPLATE });
    expect(data?.length ?? 0).toBe(0);
  });
  it('GL équilibré (Σ débit = Σ crédit)', async () => { /* SELECT comme accept_09 */ });
  it('0 créance 45x postable sans lot_id', async () => { /* SELECT comme accept_09 */ });
  it('v_result_allocation_split = 0 ligne (invariant 110/120)', async () => { /* … */ });
  it('v_lot_vs_gl_mismatch = 0 ligne (relevé réconcilié au GL)', async () => { /* … */ });
  it('état daté final a ses 3 parties art.5', async () => { /* … */ });
  it('mutation ne touche pas le 450-5 ALUR du lot', async () => { /* … */ });
  it('cloisonnement: rival ne manage pas la template', async () => { /* … */ });
  ```
- **Commit :** `test(seed): harnais de non-régression COPRO-TEMPLATE (boucle d'or)`

## Task 21 — Rejouer le seed (preuve d'idempotence) + nettoyage branche
- [ ] Réappliquer la **totalité** des migrations `seed_*` sur une **2e branche fraîche** → tous les `accept_*.sql` repassent (`ON CONFLICT`/idempotence) avec **0 écart** (copro fraîche = pas d'artefact historique, contrairement à l'ex-boucle d'or +0,16/−423/+30).
- [ ] `delete_branch` des branches jetables après validation.
- **Vérification :** `audit_finance_integrity(COPRO_TEMPLATE)` = 0 écart sur la 2e branche **sans aucune correction manuelle**.
- **Commit :** `test(seed): idempotence + 0 écart sur rejeu (boucle bouclée par le canonique)`

---

## Checklist de critères d'acceptation Phase 0

- [ ] **C1 — GL équilibré** : Σ débits = Σ crédits sur toute la template (Task 9,10,12,14,18,20).
- [ ] **C2 — A2 sans exception** : 0 ligne `45%` postable sans `lot_id` ; aucune écriture sur le `450` parent (`is_postable=false`) (Task 7,9,13).
- [ ] **C3 — Audit = 0 écart** : `audit_finance_integrity(COPRO_TEMPLATE)` renvoie 0 ligne, **et au rejeu** sur branche fraîche (Task 20,21).
- [ ] **C4 — RPC-only** : aucune écriture GL par INSERT brut ; tout passe par les posteurs canoniques ; bespoke (`create_budget_from_ag`, `create_alur_fund_from_ag`, `generate_combined_calls_from_ag`) **jamais appelée** (Task 10,13).
- [ ] **C5 — Clés bouclantes** : Σ weight = total sur les 4 clés ; `repartition_key_is_complete=true` ; 1 primaire actif/lot (Task 5,6).
- [ ] **C6 — Relances déclenchables** : 1-2 lots impayés ; `v_lot_vs_gl_mismatch` = 0 (relevé réconcilié au GL) (Task 11).
- [ ] **C7 — ALUR en réserve** : cotisation ALUR créditée en **105** (jamais 701) ; D450-5 avec lot_id (Task 13).
- [ ] **C8 — Affectation ventilée** : report N+1 splitté 110/120 ; `v_result_allocation_split` = 0 ligne (Task 14).
- [ ] **C9 — État daté légal** : snapshots `pre`+`final` présents, immuables, 3 parties art.5 (Task 16).
- [ ] **C10 — Opposition art.20** : deadline = avis+15j ; encaissement apure le 450 exigible du lot ; **fonds ALUR du lot inchangé** (Task 17).
- [ ] **C11 — Lot-centric mutation** : `lot_owners` bascule sans transfert personne→personne ; le solde reste sur le lot (Task 18).
- [ ] **C12 — Cloisonnement multi-cabinet** : un 2e cabinet ne voit pas la COPRO-TEMPLATE ; `platform_admin` transverse (Task 19).
- [ ] **C13 — Registre des risques** : R1..R42 tous rattachés (§Couverture des risques) ; aucun risque introduit par Phase 0 ; mapping reporté dans `.planning/PROGRESS_REFONTE.md`.
- [ ] **C14 — Harnais vert** : `Co-Pro-Flex/tests/seed-template.spec.ts` passe ; `tsc --noEmit` sans `any` (Task 20).
