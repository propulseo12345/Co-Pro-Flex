# Lot Fonctions — Roadmap de découpage (Phase 0 « fonctions »)

> **Niveau 1 — DÉCOUPAGE.** Ce document fixe le découpage en migrations, l'ordre, les
> dépendances et le critère de test de chaque palier. Le **code** de chaque fonction vient
> au **niveau 2** : un plan tâche-par-tâche par migration, produit au moment de l'exécution.
>
> **Cadence d'exécution = identique aux migrations 0001→0022** (trio d'agents adversariaux +
> harnais déterministe). Voir §« Cadence d'exécution ».

**Goal :** poser, sur le schéma de tables propre (`0001→0022`), toutes les fonctions
PL/pgSQL, triggers, RPC métier, RLS centralisée, vues et seed qui ont été **différés**
pendant la phase « schéma pur » — en rendant la **boucle financière testable de bout en
bout au plus tôt** (palier `0025`).

**Architecture :** 9 migrations `0023→0031`, frontières par **dépendance** (helpers →
triggers d'intégrité GL → RPC finance → autres domaines → RLS/seed). Chaque migration est un
**palier testable** (harnais `db reset` + détecteur cascade + vitest) et reste vert avant
tout commit. Reconstruction **propre** : on écrit directement la cible, on ne crée **jamais**
les objets abandonnés.

**Tech stack :** Supabase / PostgreSQL, PL/pgSQL, migrations numérotées (CLI Supabase,
numérotation purement numérique), `vitest`, harnais déterministe maison.

---

## Décisions actées (2026-06-05)

1. **Découpage adopté** : 9 migrations finance-first (`0023→0031`), boucle d'or verte dès `0025`.
   (Verdict d'un workflow 3 architectes + juge adversarial : vertical-par-domaine 15/20 >
   vague-finance-first 13/20 > couches-horizontales 11/20 → hybride retenu.)
2. **Île notifications AG** : **gardée TRANSITOIRE** (migration `0029`, gardes G-MGR/G-SVC).
   Drop différé en **Phase 3**, après refacto de l'edge `email_webhook` → `ag_envoi_tracking`.
3. **Portail copropriétaire** : câblage **niveau base en Phase 0** (`profiles.cabinet_id` des
   gestionnaires via RPC `service_role` + `link_coproprietaire_account` posée et **testée au
   harnais**), couche **applicative** (écran invitation gestionnaire, onboarding copro réel,
   edge) **différée en Phase 3**. Raison : le palier RLS `0030` exige déjà le `cabinet_id` du
   gestionnaire de démo pour tester le cloisonnement (helpers *fail-closed*).

---

## Principe de reconstruction propre (≠ migration in-place)

La base `0001→0022` est la **cible neuve**. Les enums sont **déjà** aux bonnes valeurs en
`0003` (`membership_role = {gestionnaire, coproprietaire, platform_admin}`,
`document_category` contient `courrier` pas `correspondance`, `document_visibility` /
`content_visibility` existent). **Conséquence** : la plupart des « 7 ordres critiques » de
l'INVENTAIRE (réécrire X *puis* droper Y) **tombent** — ils visaient la base live. Ici :

- On **n'crée jamais** les objets abandonnés (Q.1→Q.7) : bespoke AG, surcharges doublons,
  `post_call_for_funds` mono-clé, `user_is_council_member`, table `document_access`,
  `can_access_document`, campagnes mail, artefacts dev.
- On **écrit directement** la cible (ex. `user_can_view_document` lit `documents.visibility`
  et appelle `is_council_member` dès `0023` ; `create_document_system_folders` utilise
  `courrier` dès l'écriture).
- Les seuls « ordres » qui subsistent sont **intra-domaine** (ex. déclarer
  `assert_result_allocation_split` avant `regularize_period` dans `0025`) et le **transitoire**
  AG `0029` (drop en Phase 3).

---

## Cadence d'exécution par migration (les « 3 checks » + harnais)

Identique à `0001→0022`. **Aucun commit** sans palier vert + 0 bug cascade.

```
1. Agent AUTEUR      → écrit la migration SQL (blueprint db-cible §4/§5 + INVENTAIRE-FONCTIONS)
2. 2 RELECTEURS adversariaux (lentilles distinctes, en parallèle) :
     • conformité   : contrats/colonnes/FK/gardes vs blueprint + INVENTAIRE (rien d'oublié,
                      rien d'inventé, dispositions GARDER/RÉÉCRIRE/AJOUTER respectées)
     • qualité/sécu : cascade (ON DELETE), bug %%→%, search_path='', REVOKE anon/public,
                      GRANT ciblé, immutabilité GL, garde in-function des 5 fonctions §5.3
3. SYNTHÈSE          → migration corrigée
4. HARNAIS déterministe :
     • supabase db reset (rejoue 0001→migration courante)
     • détecteur cascade  : confdeltype in ('n','d') AND attnotnull  DOIT = 0
     • vitest             : ≥ 75/75 (ne jamais régresser)
     • test gate métier de la migration (cf. tableau)
   → vert + 0 cascade AVANT commit ; conventions pk_/uq_/ck_/idx_ ; 1 commit par migration
```

Référence vibe-library (gap « re-baseline depuis blueprint », cadence subagent) : confirmée
utile **à la carte** pour cette cadence — voir mémoire `[[vibe-library]]`.

---

## Vue d'ensemble — 9 migrations

| # | Migration | Dépend de | Palier de test (résumé) |
|---|---|---|---|
| 0023 | `authz-helpers` | 0022 | helpers créés, refus cross-cabinet, `anon` révoqué |
| 0024 | `triggers-integrite-GL` | 0023 | écriture GL illégale → RAISE ; vitest vert |
| 0025 | `rpc-finance-core` | 0024 | 🎯 **BOUCLE D'OR** : `audit_finance_integrity = 0 écart` |
| 0026 | `rpc-ag-conseil` | 0025 | AG votée → appels postés au GL ; 0 écart |
| 0027 | `rpc-ged-mutations` | 0026 | mutation change `lot_owners`, ne poste pas le 450 |
| 0028 | `rpc-maintenance-comm` | 0027 | OS → carnet ; compteurs mur OK |
| 0029 | `notif-ag-transitoire` | 0026 | gardes G-MGR/G-SVC correctes (transitoire) |
| 0030 | `revoke-rls-seed` | 0025-0029 | 🎯 **ACCEPTATION PHASE 0** : cloisonnement + 0 écart |
| 0031 | `vues-transverses` | 0030 | vues présentes, doublons R40 = 0 |

---

## Détail par migration

### 0023 — `authz-helpers` — helpers d'autorisation complets
**Objets (CREATE OR REPLACE, tous `SECURITY DEFINER STABLE`, `search_path=public`, `REVOKE anon/public`) :**
- **Nouveaux** : `is_service_call()` ; `user_is_platform_admin()` (A13) ; `link_coproprietaire_account(p_invite_token)` (DEFINER, garde `email JWT = email invité`, câble `coproprietaires.user_id` + INSERT `memberships`).
- **Réécrits** : `user_has_copro_access(p_copro_id)` et `user_is_copro_manager(p_copro_id)` (filtre cabinet **inline** `profiles.cabinet_id = copros.cabinet_id` + bypass `platform_admin`) ; `user_can_view_document(p_document_id)` (A4 : lit `documents.visibility`, appelle `is_council_member(copro, auth.uid())`).
- **Gardés** : `user_is_lot_owner`, `user_is_lot_owner_in_copro`, `user_is_lot_owner_or_manager`, `user_owns_any_lot_in_copro`, `get_user_lot_ids`, `is_council_member` (source unique CS, lit `council_members`), `is_council_president`, `is_conversation_member`, `can_view_content`.
- **Reconstruction propre** : `user_is_council_member` (memberships) et `document_access` ne sont **jamais** créés. Enum déjà bon (rien à rationaliser).

**Test gate :** `pg_proc` → les helpers présents ; `has_function_privilege('anon', …)` = false ; scénario : gestionnaire cabinet A → `user_is_copro_manager(copro_A)`=true, `(copro_B)`=false ; `user_can_view_document` sur doc `visibility='conseil'` : membre CS=true, sinon false.

### 0024 — `triggers-integrite-GL` — filet d'intégrité AVANT tout posteur
**Objets (G-TRIG : `REVOKE EXECUTE FROM public, anon, authenticated`) :**
- GL : `trg_ledger_tx_immutable`, `trg_ledger_tx_no_delete_posted`, `trg_ledger_entry_immutable`, `trg_ledger_entry_no_insert_posted`, `trg_ledger_entry_consistency`, `trg_enforce_is_postable`, `enforce_lot_id_on_45x` (A2, élargi à toute nature `45%`, sans liste blanche), `check_transaction_balance` (AFTER, DEFERRED, Σdébit=Σcrédit).
- Période : contrainte déclarative `UNIQUE(copro_id) WHERE status='open'` (remplace `check_single_open_period`).
- Cohérence inter-copro : `enforce_copro_consistency` + ~15 `tr_*_copro_consistency` (lots, lot_owners, coproprietaires, memberships, call_for_funds(+lines), payments, supplier_invoices, ag_meetings, ag_resolutions, mutations, documents, service_orders, contracts, messages).
- Auth : `handle_new_user` (auth.users → profiles).

**Test gate :** INSERT `ledger_entries` compte `45x` + `lot_id NULL` → RAISE ; UPDATE d'une `ledger_transaction` → RAISE ; 2 périodes `open` même copro → violation UNIQUE ; ligne fille `copro_id` divergent → RAISE ; vitest 75/75.

### 0025 — `rpc-finance-core` — 🎯 boucle d'or testable
**Objets (faithful à INVENTAIRE §A/§B/§G/§H + §M finance) :**
- **GL** : `create_ledger_transaction`, `post_ledger_transaction` (RÉÉCRIRE : retirer `WHEN OTHERS` masquant ; garde G-MGR+G-SVC) ; `resolve_lot_tiers_account`, `is_ledger_regen_exempt`, `get_period_for_date` (G-INTERNAL) ; `provision_copro_chart` (G-MGR).
- **Appels/budgets** : `post_budget_call_for_funds` (10-args, G-MGR), `recalculate_all_call_statuses`/`update_call_status`, `compute_repartition_shares`, `repartition_key_is_complete`, `submit_budget`/`validate_budget`, `validate_budget_expense` (RÉÉCRIRE : nom via `tiers.id`, fallback `label`).
- **Paiements** : `post_owner_payment` (G-MGR + branche svc), `allocate_payment` (INVOKER, G-INTERNAL non exposée, REVOKE anon), `post_supplier_invoice` (adapter `tiers_id`), `post_supplier_payment` (8-args), `get_supplier_invoice_paid_amount`, `refresh_bank_movement_status`.
- **Périodes/cut-off/affectation** : `open_next_period`/`close_period`/`approve_period`/`reopen_period`, `post_period_cutoff`/`reverse_period_cutoff`/`cutoff_entry_pair`, `set_opening_balance`/`get_opening_balance`, `assert_result_allocation_split` (NOUVEAU, **déclaré avant** `regularize_period`), `regularize_period` (RÉÉCRIRE : D120/C450-1 **et** D110/C450-2 par quote-part + assert).
- **Dérivés** : `get_owner_statement` (G-MIXTE), `fn_dashboard_kpis`, `calculate_budget_projection`, `audit_finance_integrity`, `fn_annexe_1..5` (corriger libellés annexes 3/4/5).
- **Triggers finance** : `trg_call_line_status_sync` (fusion), `trg_cff_ledger_required` (DEFERRED), `validate_call_for_funds_total`, `validate_payment_allocation`, `validate_supplier_invoice_total`, `validate_supplier_payment`, `update_supplier_invoice_status_after_payment`, `check_*_integrity`.
- **Relances** : `get_pending_reminders_to_send` (RÉÉCRIRE : `lot_owners`+`coproprietaires`, consomme `v_unpaid_by_lot`), `create_payment_reminder`, `mark_reminder_sent/failed`, `cancel_stale_reminders`, `is_reminders_paused`, seeds `create_default_reminder_rules/settings`.
- **Vues GL (créées AVANT le harnais, même fichier)** : `v_trial_balance`, `v_owner_statement_by_lot`, `v_owner_statement_by_person`, `v_unpaid_by_lot`, `v_payments_overview`, `v_bank_movements_overview`.
- **Harnais (G-SVC)** : `create_test_copro(_seeded)`, `create_clean_test_copro(_seeded)`, `seed_golden_loop`.

**Test gate (PALIER FINANCE-FIRST) :** sur harnais — `provision_copro_chart` → comptes ; `open_next_period` ; `post_budget_call_for_funds` (D450-x/lot + C701, balance OK) ; `post_owner_payment` ; `post_supplier_invoice` ; `regularize_period` (110/120 ventilé) ; **`create_test_copro_seeded()` → `audit_finance_integrity = 0 écart`** ; `v_trial_balance` Σdébit=Σcrédit ; `anon` ne peut pas `post_owner_payment` ; vitest 75/75.

### 0026 — `rpc-ag-conseil` — chaîne AG→GL + vote + conseil
**Objets :** `prepare_ag_decisions` (RÉÉCRIRE target_table), `generate_calls_from_ag_payload` (RÉÉCRIRE + ALUR D450-5/C105), `activate_ag_decisions`, `finalize_and_activate_ag`, `cast_vote` (RÉÉCRIRE bug), `calculate_resolution_result` (RÉÉCRIRE, sans compteurs dénormalisés), `compute_ag_quorum`, `compute_majority_threshold` (IMMUTABLE), `create_ag_with_standard_resolutions`, `start_ag/close_ag/rpc_finalize_ag_session`, `archive_ag`, `get_ag_live_results/check_convocation_delay/validate_ag_variables`, wizard (`complete_ag_wizard_step`, `save_ag_wizard_state`, `get_ag_wizard_state` RÉÉCRIRE→`ag_session_drafts/step_data`), drafts, correspondance, envoi, bundles, `compute_decision_result` CS (majorité simple). **Reconstruction propre** : bespoke AG (Q.2) jamais créé.

**Test gate :** `finalize_and_activate_ag` → `ag_pending_actions` (target_table canonique) ; `activate_ag_decisions` → budgets + appels postés au GL, `audit_finance_integrity = 0` ; `cast_vote` x2 même lot → violation UNIQUE ; vitest 75/75.

### 0027 — `rpc-ged-mutations` — GED + mutations/état daté
**Objets :** `create_document_system_folders` (RÉÉCRIRE → `courrier`), `create_document_version` (modèle pointeur), `generate_document_path` (4-args), triggers GED (`calculate_document_expiration`, `update_document_search_text`, `prevent_protected_document_deletion`) ; mutations : `validate_mutation` (A3 : change `lot_owners`, ne poste pas le 450), `upsert_mutation_step` (+ `completed_by`), `generate_etat_date_payload`, `create_etat_date_snapshot`, `initialize_mutation_steps` (trigger). Vues `v_document_versions`, `v_mutation_detail`. **Reconstruction propre** : `document_access`, `can_access_document`, `generate_document_path` 3-args jamais créés.

**Test gate :** `create_document_system_folders` → dossiers `courrier` ; `user_can_view_document` (doc `conseil`) membre CS=true / sinon false ; `validate_mutation` → `lot_owners` vendeur clôturé / acquéreur ouvert, **0** écriture GL sur 450 ; vitest 75/75.

### 0028 — `rpc-maintenance-comm` — maintenance/tiers + communication
**Objets :** maintenance : `update_service_order_status`, `is_valid_service_order_transition` (IMMUTABLE), `create_logbook_from_service_order` (RÉÉCRIRE `tiers_id`/`title`), `delete_service_order` (RÉÉCRIRE : retirer le bloc `budget_payment_schedules`, table conservée A8), `generate_service_order_number` (RÉÉCRIRE : séquence par copro), `update_provider_stats` (RÉÉCRIRE → `tiers`), `update_contract_status_auto`, `get_supplier_invoice_paid_amount` ; communication : `is_conversation_member`, `mark_conversation_read`, triggers `update_conversation_last_message`, `update_wall_post_comments_count`, `update_wall_post_likes_count`.

**Test gate :** `delete_service_order` → `budget_payment_schedules` inchangée ; `create_logbook_from_service_order` → `tiers_id` + `title` ; 2 OS → numéros distincts (séquence) ; finalisation OS → `tiers.interventions_count` incrémenté ; INSERT message → `last_message_preview` MAJ ; vitest 75/75.

### 0029 — `notif-ag-transitoire` — île notifications AG (transitoire, isolée)
**Objets (5 fonctions, commentaire `-- TRANSITOIRE : DROP Phase 3`) :** `create_ag_notification` (G-MGR), `mark_notification_sent` (G-SVC strict), `mark_notification_failed` (G-SVC strict), `get_ag_recipients` (G-DEF-RO), `get_ag_sending_stats` (G-DEF-RO). Tables cibles déjà posées en `0018`.

**Test gate :** `mark_notification_sent` non exécutable par `authenticated`, exécutable par `service_role` ; `create_ag_notification` OK en gestionnaire ; 5 fonctions présentes ; vitest 75/75.

### 0030 — `revoke-rls-seed` — 🎯 acceptation Phase 0
**Objets :**
- **REVOKE ciblé** (liste explicite, **pas** de boucle `pg_proc` générique) — filet de rattrapage sur les RPC créées en `0025-0029` ; GRANT ciblé `authenticated`/`service_role`.
- **RLS** (DO block idempotent selon `app.environment`) : ENABLE prod / DISABLE dev sur les 79 tables + transitoires AG ; `FORCE` sur `ledger_transactions`, `ledger_entries`, `accounting_periods`, `accounts`, `payment_allocations`. Policies 3 rôles (SELECT `user_has_copro_access`, ALL/UPDATE `user_is_copro_manager`, SELECT own, ALL `user_is_platform_admin` sur `cabinets`).
- **Câblage portail (Phase 0, décision 3)** : RPC `service_role` pour pré-câbler `profiles.cabinet_id` des gestionnaires de démo + vérifier chaque copro a son `cabinet_id`.
- **Seed global** : `work_domain`, 6 `email_templates`, 1 `platform_admin`.
- **COPRO-TEMPLATE** (séquence de RPC canoniques rejouable, remplace la boucle d'or 22222222, A1) : cabinet réf + gestionnaire démo (cabinet_id câblé) → `provision_copro_chart` → période 2026 → `set_opening_balance` → `post_budget_call_for_funds` → `post_owner_payment` → facture+paiement fournisseur → cut-off → close→approve → `regularize_period` → période 2027 (à-nouveau) → 1 mutation.

**Test gate (ACCEPTATION PHASE 0) :** prod — `relrowsecurity`/`relforcerowsecurity` GL = t/t ; gestionnaire cabinet A ne voit pas copros cabinet B ; gestionnaire cabinet B → `create_ledger_transaction(copro_A)` RAISE 42501, `service_role` OK ; `anon` ne peut pas `post_owner_payment` ; **COPRO-TEMPLATE : `audit_finance_integrity = 0 écart`**, 0 ligne `45x` sans `lot_id` ; `pg_policies` > 20 ; vitest 75/75.

### 0031 — `vues-transverses` — vues dérivées + ménage
**Objets :** `v_coproprietaires_overview` (R40 : pas de doublon, GROUP BY + filtre `is_primary`), `v_lot_vs_gl_mismatch`, `v_owner_statement_by_lot_detail`, `v_alur_fund_summary`/`v_alur_transfers_history` (si pas déjà créées). **Reconstruction propre** : `v_account_balances` et `v_mail_*` jamais créées.

**Test gate :** vues attendues présentes ; vues mortes absentes ; `v_coproprietaires_overview` 0 doublon (R40) ; vitest 75/75.

---

## Self-review (couverture vs INVENTAIRE)

- **126 GARDER / 20 RÉÉCRIRE / 10 AJOUTER** réparties : helpers (0023), triggers intégrité (0024),
  finance (0025), AG/conseil (0026), GED/mutations (0027), maintenance/comm (0028), notif transitoire (0029).
- **27 ABANDONNER** : non créées (reconstruction propre) — aucune migration de drop nécessaire.
- **RLS + vues + seed** : 0030/0031. **5 fonctions dangereuses (§5.3)** : gardes posées dans leur
  corps en 0025/0026, RLS+FORCE en 0030.
- **Ordres résiduels** honorés : `assert_result_allocation_split` avant `regularize_period` (0025) ;
  transitoire AG drop en Phase 3 (0029) ; câblage `cabinet_id` avant test RLS (0030).

## Prochaine action

Plan **niveau 2** de `0023 — authz-helpers` (tâche-par-tâche), produit via la cadence 3 checks.
