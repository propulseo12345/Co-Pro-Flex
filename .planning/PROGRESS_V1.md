# PROGRESS — V1 « Grand livre propre » (multi-sessions)

> Tracker vivant de l'implémentation V1. Snapshot court = `.planning/SESSION.md`. Audit/plan = `.planning/AUDIT_V1_GRAND_LIVRE.md`. Décisions durables = mémoire `v1_audit_reconciled`.
> Base live : `iyfesbjnkpynmwlsmxnp` (boucle d'or `22222222`, témoin immuable `11111111`). Tester sur copro jetable, jamais sur ces deux.

## Règles de travail (rappel)
- Migrations = fichier `supabase/migrations/` **+** `apply_migration` (OK utilisateur avant chaque apply).
- Aucun UPDATE/DELETE de tx postée (immutabilité verrouillée). Assainissement = écriture inverse datée via `create_ledger_transaction`.
- Tester le **chemin client réel sans trigger d'abord** ; trigger = filet en dernier.

## État des étapes

- [x] **Étape 0 — Filets d'intégrité** — `v_finance_integrity_issues` étendue (SOURCE_ID_MISSING=40, CHAPEAU_450_POSTED) + libellés FR front. Migration `20260602160000_v1_0_finance_integrity_source_id_chapeau450.sql`. Front `src/features/finance/diagnostic/helpers.ts` (type check OK).
- [x] **1.5-A — Routine canonique** — `provision_copro_chart(copro_id)` (82 comptes décret 2005-240, idempotente `ON CONFLICT (copro_id,code) DO NOTHING`, chapeau 450 `is_postable=false`) + colonne `accounts.is_postable` (DEFAULT true, sans enforcement). Migration `20260602170000_v1_5a_provision_copro_chart.sql`. Testée auto-rollback : 82 comptes, idempotence, `resolve_lot_tiers_account` OK.
- [x] **1.5-B — Backfill** — `provision_copro_chart` appelé sur 075c0249 (+74), fd415d71 (+80), 2e341146 (+78), a3403914 (+82). ⚠️ Fait via `execute_sql` direct, **pas de fichier migration** (à formaliser si besoin de reproductibilité).
- [x] **1.5-C (analyse) — Verdict sûreté** = **HYBRIDE**, séquence sûre (workflow `wjdpuejm6`).

### À FAIRE (séquence sûre, dans cet ordre)
- [~] **1.5-C1** — SUPERSEDÉ (2026-06-03). Plutôt que de fiabiliser le clone de `create_test_copro`, on a créé `create_clean_test_copro(_seeded)` (structure synthétique + `provision_copro_chart` + `seed_golden_loop`, ne clone PAS 22222222) — migr `20260602190000` (+ fix `subset`/`gs.idx`). Dépréciation de `create_test_copro` (clone) → backlog.
- [x] **1.5-C2** — FAIT (commit `320503f`) : `provision_copro_chart` branché dans `createCopropriete` ; `ensure` à la volée (450/701/120/600) retirés. Chemin onboarding réel testé sans trigger.
- [ ] **1.5-C3** — Trigger filet `AFTER INSERT ON copros → provision_copro_chart` : NON posé (le provision explicite en C2 suffit). Optionnel, laissé en backlog.
- [x] **1.5-D** — FAIT (commits `b240883`/`9acd55c`/`dc64be2`/`7b3ee15`/`6082834`) : appels via `post_budget_call_for_funds`, reprise via `create_ledger_transaction(opening_balance)` contrepartie 471/472 ventilée par nature+lot, postage différé en **Step8** avec gate `audit_finance_integrity=0`. Preuve : test d'acceptation B2 = 0 écart (appliqué sur live). Revue finale holistique = GO merge. `useBudget.ts` non touché (hors chemin onboarding).
- [ ] **1.5c** — Reclasser les soldes postés du chapeau 450 vers 450-1 par écriture DATÉE (cibles réelles : `075c0249` 299 €, `2e341146` 3560 €). Témoin 11111111 (+4218,50) et boucle d'or 22222222 (−635) = **laissés figés** (hors périmètre).
- [ ] **1.5a** — Neutraliser la draft `81d0f732` (boucle d'or, décision utilisateur en attente) + corriger le seed `20260125_niveau2d_ledger_seed.sql` (ligne 115 + INSERT sur chapeau 450) — vraie cause des artefacts.
- [ ] **1.4** — Enforcement `is_postable` : CONSTRAINT TRIGGER `BEFORE INSERT ON ledger_entries` (RAISE si compte `is_postable=false`) + backfill `is_postable=false` sur tous les chapeaux 450 dotés de 450-x (dont les 3 « Residence Test » restés `true` après backfill). À faire APRÈS reclassement des soldes chapeau (G5).
- [ ] **4.2b** — CONSTRAINT TRIGGER équilibre Σdébit=Σcrédit sur `ledger_transactions` (DEFERRABLE INITIALLY DEFERRED, `INSERT OR UPDATE`, si `status='posted'`, tol. 0,01). Piège : `check_transaction_balance` RETURNS TABLE → `SELECT is_balanced INTO`. Parallélisable.
- [ ] **4.x** — CHECK `source_id NOT NULL` en **NOT VALID seulement** (jamais VALIDATE : 40 tx historiques non assainissables, dont 18 sur témoin/boucle d'or). Exposer l'historique via la vue d'intégrité.
- [ ] **G2** — rien à faire (immutabilité déjà verrouillée).

## Corrections à reporter dans PLAN_CORRECTION_VALIDE.md
Voir `.planning/AUDIT_V1_GRAND_LIVRE.md §3` (40 tx pas 28, cr3 ≠ verrou équilibre, enforce_lot_id déjà `450%`, G2 déjà fait, témoin 11111111 aussi concerné, opening vs opening_balance).
