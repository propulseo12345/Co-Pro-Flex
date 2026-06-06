# Spec design — Migration `0030_rpc_ag_conseil` (Phase 0, lot fonctions AG)

> Date : 2026-06-06 · Branche : `phase0-db-rebaseline` · Statut : design validé USER, à transformer en plan d'implémentation.
> Sources : blueprint `.planning/db-cible/04-ag-gouvernance.md`, `INVENTAIRE-FONCTIONS.md`, roadmap `docs/superpowers/plans/2026-06-05-lot-fonctions-roadmap.md`, audit métier `.planning/spec/ENTITIES_MAP/06-ag-votes.md`, atlas `.planning/atlas/front-01-ag.md`.

---

## 1. Objectif

Écrire **toutes les fonctions, triggers et vues** du domaine gouvernance (AG + conseil syndical) sur les tables **déjà posées** par `0017_ag_conseil.sql` et `0018_ag_notif_transitoire.sql`. 0030 ne crée **aucune table**. C'est le « lot fonctions » du domaine AG, à la suite des lots finance (0025→0029).

## 2. Principe directeur (verrouillé par le blueprint §0)

L'AG est le **moteur d'auto-population** : une résolution votée et approuvée incrémente automatiquement l'état de la copro **en passant TOUJOURS par le grand livre**. Un **seul chemin** :

```
finalize_and_activate_ag(ag_id)                 [orchestrateur — TOUT-OU-RIEN]
  ├─ calculate_resolution_result(res) × N       → fige status/voted_at/threshold_* + EXPOSE éligibilité passerelle
  ├─ prepare_ag_decisions(ag_id)                → écrit ag_pending_actions (1/résolution approuvée, target_table liste blanche)
  └─ activate_ag_decisions(ag_id)               → dispatch par action_type → POSTE le GL via 0026/0027
```

La couche **bespoke** (`create_budget_from_ag`, `generate_combined_calls_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `finish_ag_session`, `get_ag_pending_actions`, `mark_ag_action_activated`, `user_is_council_member`) qui écrivait l'état métier **sans toucher le GL** est **ABANDONNÉE** (ne jamais créer). `is_council_member` est la **source unique** du rôle conseil.

## 3. Décisions de cadrage (session 2026-06-06)

1. **Atomicité `activate_ag_decisions` = TOUT-OU-RIEN.** Si une seule action de la chaîne échoue → `RAISE` global → rollback complet. Aucun `EXCEPTION WHEN OTHERS` par action. Justification : le GL est source unique, un état partiellement activé (budget validé sans appels) est pire qu'un échec propre rejouable (idempotence via UNIQUE `(ag_id, resolution_id)`).
2. **APPOINT_SYNDIC / MANAGE_CONTRACT = logique DB complète.** `activate_ag_decisions` met à jour `copros` (syndic courant) et `contracts` (activation) en base — pas de no-op délégué au front.
3. **Passerelles art.25-1/26-1 = informatives dans 0030** (calcul d'éligibilité exposé, PAS d'orchestration auto du 2nd vote — voir §8). Décision étayée par recherche (données : 0 passerelle / 0 pouvoir / 1 formulaire correspondance en réel ; droit : le 2nd vote immédiat est une obligation légale ELAN, mais reste une action de séance pilotable par le gestionnaire).
4. **Frontière dur/souple.** On **BLOQUE** ce qui corrompt l'argent ou l'intégrité du vote (GL déséquilibré, activation partielle, double vote, vote sans présence). On **PRÉVIENT sans bloquer** les finesses de scrutin non encore automatisées (passerelle). On **DIFFÈRE** le reste (§8).
5. **Structure migration = approche C** : un seul fichier `0030_rpc_ag_conseil.sql` (un commit quand vert, pas de re-numérotation aval), **bâti en 3 paliers** avec une gate à chaque palier.

## 4. Périmètre par palier

### Palier 1 — Vote / session / conseil (cœur scrutin)

| Fonction | Disposition | Garde |
|---|---|---|
| `compute_majority_threshold(majority_type, total_tantiemes, present_tantiemes, total_owners, present_owners)` | GARDER (IMMUTABLE) | G-INTERNAL |
| `cast_vote(...)` | **RÉÉCRIRE** : `vote_choice`, garde présence (trigger) + UNIQUE, sans `WHEN OTHERS` | G-MGR |
| `calculate_resolution_result(resolution_id)` | **RÉÉCRIRE** : écrit *seulement* `status`/`voted_at`/`threshold_*` ; **art.24 sur voix exprimées** (for>against, abstentions exclues) ; **calcule éligibilité passerelle** (1/3 pour 25-1, 1/2+1/3 pour 26-1 → majorité du 2nd vote) ; sans `WHEN OTHERS` | G-MGR |
| `compute_ag_quorum(ag_id)` | GARDER | G-DEF-RO |
| `get_ag_live_results(ag_id)` | GARDER | G-DEF-RO |
| `compute_decision_result(decision_id)` | **RÉÉCRIRE** : **majorité simple** conseil (for>against, quorum = moitié des membres actifs), distincte des art.24/25/26 | G-OWNER (membre CS) |
| `create_ag_with_standard_resolutions(...)`, `start_ag`, `close_ag`, `rpc_finalize_ag_session`, `archive_ag` | GARDER | G-MGR |
| `check_convocation_delay(ag_id)`, `validate_ag_variables(...)` | GARDER | G-DEF-RO |

**Vues** (remplacent les 8 compteurs dénormalisés supprimés de `ag_resolutions`) : `v_ag_resolution_vote_summary`, `v_ag_resolutions_results`, `v_ag_vote_stats_by_resolution`. Le front + le PDF du PV liront ces vues (bloc atomique fonction+vue, arbitrage A19).

**Triggers** : `trg_ag_attendance_tantiemes` (BEFORE I/U OF lot_ids → recalcule `tantiemes`), `trg_ag_vote_requires_attendance` (ex-`trg_ag_vote_check_duplicate`, BEFORE I → rejette vote sans présence), `trg_ag_close_clear_drafts` (AFTER U OF status → purge `ag_session_drafts`), `enforce_copro_consistency` (BEFORE I/U sur `ag_resolutions`, `ag_votes`, `ag_attendance`, `ag_correspondence_votes`, `ag_correspondence_vote_details`, `council_decisions`, `council_votes`).

**Gate palier 1** (`begin…rollback`) : double vote même copro → UNIQUE refusé · vote sans présence → refusé · seuils art.24/25/26/unanimité corrects sur cas montés · vues `v_ag_*` cohérentes avec les votes · éligibilité passerelle exposée sur un cas 25-1 monté.

### Palier 2 — Chaîne auto-population AG→GL (cœur, TOUT-OU-RIEN)

| Fonction | Disposition | Garde |
|---|---|---|
| `prepare_ag_decisions(ag_id)` | **RÉÉCRIRE** : lit `status='approved'` (plus `is_approved`, colonne supprimée) ; émet la liste blanche `target_table` §1.6 ; `DESIGNATE_BUREAU` = pas de pivot ; résout `accounting_periods` pour `APPROVE_ACCOUNTS` | G-MGR |
| `activate_ag_decisions(ag_id)` | **RÉÉCRIRE — TOUT-OU-RIEN** (RAISE global, pas de `WHEN OTHERS`) | G-MGR |
| `generate_calls_from_ag_payload(copro_id, ag_id, resolution_id, payload)` | **RÉÉCRIRE** : `post_budget_call_for_funds` **10-args** (plus l'ancien mono-clé `post_call_for_funds`), idempotency `ag-res-Tn`, maillon **ALUR D450-5/C105** | G-MGR |
| `finalize_and_activate_ag(ag_id, activate boolean default true)` | GARDER (orchestrateur, point d'entrée unique) | G-MGR |

**Dispatch `activate_ag_decisions`** (par `action_type`) :
- `CREATE_BUDGET` / `CREATE_WORK_BUDGET` → `validate_budget(budget_id)` [0026]
- `APPROVE_ACCOUNTS` → `close_period` → `open_next_period` → `regularize_period` → `approve_period` (ordre V4) [0027]
- `SCHEDULE_BUDGET_PAYMENTS` / `SCHEDULE_ALUR_PAYMENTS` / `CREATE_EXCEPTIONAL_CALL` → `generate_calls_from_ag_payload` → `post_budget_call_for_funds` [0026 → 0025]
- `CREATE_ALUR_FUND` → budget ALUR validé puis appel ALUR (D450-5/C105)
- `ELECT_COUNCIL` → désactive l'ancien conseil (`is_active=false`, `end_date`) **+ INSÈRE** les membres élus (payload §7)
- `APPOINT_SYNDIC` → met à jour `copros` (syndic courant) — **logique DB** (payload §7)
- `MANAGE_CONTRACT` → active le contrat lié dans `contracts` — **logique DB** (payload §7)
- `GRANT_QUITUS` / `DESIGNATE_BUREAU` → no-op métier (informatif)

**Gate palier 2 — à COMMIT RÉEL** (pas `begin…rollback`, pour éprouver les contraintes différées comme le piège `tr_cff_ledger_required`) : monter un AG complet (budget courant voté + `APPROVE_ACCOUNTS` + `SCHEDULE_BUDGET_PAYMENTS` + `CREATE_ALUR_FUND` + `ELECT_COUNCIL` + `APPOINT_SYNDIC` + `MANAGE_CONTRACT`) → `finalize_and_activate_ag` **committé** → budgets validés, appels postés, **`audit_finance_integrity = 0`**, GL D=C, conseil inséré, syndic/contrat à jour. **Test tout-ou-rien** : injecter un échec (clé de répartition incomplète) → **rollback complet vérifié** (aucun budget validé, aucun appel, aucun membre inséré).

### Palier 3 — Wizard / correspondance / envoi / bundles / pouvoirs

- `get_ag_wizard_state(ag_id)` **RÉÉCRIRE** : lire les jalons depuis `ag_session_drafts` (`draft_type='milestones'`) ou `ag_meetings.step_data` — **plus de dépendance `ag_milestones`** (pré-condition du drop séquencé, §8) ; garde via helper `user_has_copro_access`.
- Wizard : `save_ag_wizard_state`, `complete_ag_wizard_step`, drafts (`save/get/delete_ag_draft`, `get_ag_all_session_drafts`, `clear_ag_session_drafts`) — GARDER (G-MGR).
- Correspondance : `register_correspondence_vote(_form_votes)`, `save/get_votes_correspondance`, `get_correspondence_eligible_owners` — GARDER (G-MGR/G-DEF-RO).
- Envoi : `save/get_ag_envoi_tracking`, `save/get_ag_envoi_choices` — GARDER (G-MGR).
- Bundles : `rpc_get_ag_convocation_bundle`, `rpc_get_ag_pv_bundle`, `rpc_get_ag_coproprietaires` — GARDER (G-DEF-RO/G-MGR).
- Pouvoirs : `save/get/delete_ag_pouvoir`, `update_ag_pouvoir_justificatif` → **FUSIONNÉS** dans les RPC `ag_attendance` (`proxy_signed_at`/`proxy_document_id`/`represented_by_id`). Table `ag_pouvoirs` abandonnée.

**Gate palier 3** (`begin…rollback`) : `get_ag_wizard_state` fonctionne **sans** `ag_milestones` · un formulaire de correspondance validé s'intègre en `ag_votes` (`integrated_vote_id`) · bundles convocation/PV renvoient les données attendues.

## 5. Décisions transverses

- **Gardes** G-MGR (gestionnaire) / G-DEF-RO (lecture) / G-INTERNAL / G-OWNER (membre CS), conventions T1. `SECURITY DEFINER set search_path=public`.
- **RLS** : différée en `0034` (lot revoke-rls-seed). 0030 pose les fonctions, pas les policies.
- **Pas de `EXCEPTION WHEN OTHERS` masquant** nulle part : les erreurs remontent (errcodes explicites `42501`/`23514`/`23503`).
- **Enums** : `vote_choice` (for/against/abstention, fusion vote_direction+council_vote_choice), `ag_action_type` (enum cible), `correspondence_form_status`, `notification_channel`, `delivery_status` — tous déjà posés en 0003.

## 6. Dépendances (à appeler, ne pas réécrire)

- **0025** : `create_ledger_transaction` (indirect via 0026), `resolve_lot_tiers_account`.
- **0026** : `post_budget_call_for_funds` (10-args), `validate_budget`.
- **0027** : `close_period`, `open_next_period`, `regularize_period`, `approve_period`.
- **Signatures front à respecter** (src/types/supabase.ts) : `activate_ag_decisions(p_ag_id)→Json`, `finalize_and_activate_ag(p_ag_id, p_activate?)→Json`, `generate_calls_from_ag_payload(p_copro_id, p_ag_id, p_resolution_id, p_payload)`, `compute_ag_quorum(p_ag_id)`, `cast_vote` (via edge `ag_cast_vote`), `get_ag_wizard_state(p_ag_id)`, `register_correspondence_form_votes`, `save_votes_correspondance`, `get_ag_live_results`, `check_convocation_delay`, `rpc_get_ag_coproprietaires/_convocation_bundle/_pv_bundle`.

## 7. Formats de payload à figer dans le plan

À confirmer en lisant les schémas réels (`0007/0008 copros`, `0021 contracts`, `0017 council_members`) ; intention :
- `ELECT_COUNCIL` : `variables.council_members = [{coproprietaire_id uuid, role council_role}, …]`. Garde : chaque `coproprietaire_id` doit être un copropriétaire **actif** de la copro, sinon RAISE (→ rollback).
- `APPOINT_SYNDIC` : `variables.syndic = {…}` → champs syndic de `copros` (à mapper sur les colonnes réelles). Garde sur l'existence.
- `MANAGE_CONTRACT` : `variables.contract_id` → `contracts.status='active'` (+ éventuelle terminaison de l'ancien contrat de même catégorie — à arbitrer au plan).
- `APPROVE_ACCOUNTS` : `variables.{date_debut,date_fin}` → résolution du `accounting_periods.id` cible à `prepare`. Garde : si période introuvable → RAISE à `prepare` (pas un `approve_period(NULL)` silencieux).

## 8. Hors-périmètre (différé — TODO en commentaire de migration + suivi)

- **Plafond pouvoirs art.22** (3 délégations, sauf ≤10% des voix) : garde au moment du vote/présence. 0 pouvoir en données. → lot « conformité vote » ultérieur.
- **Neutralisation correspondance art.17-1 A** (votant « pour » d'une résolution amendée = défaillant) : exige une colonne `is_amended` **hors** des tables 0017 figées. 0 cas en données. → différé.
- **Orchestration auto de la passerelle** 25-1/26-1 (re-création/rebascule du 2nd vote) : 0030 calcule l'éligibilité et **alerte** ; le lancement reste une action gestionnaire (même AG = légal). → différé.
- **Drop séquencé** `ag_milestones` + île notifications (`ag_notifications`/`ag_notification_events`) et fonctions `create_ag_notification`/`mark_notification_*` : **étape 3** (après refacto edge `email_webhook` → `ag_envoi_tracking` ET réécriture `get_ag_wizard_state`, déjà au palier 3). 0030 NE droppe PAS ces tables.
- **Dette front Phase 4** : `src/lib/ag/api/finalisation.api.ts` (+ `useFinalisationPage/Data`) appelle encore le bespoke abandonné → renverra 42883 après reset. Acceptée, **documentée** dans l'en-tête de 0030, non bloquante pour 0030.
- **Notifications transitoires** (`create_ag_notification`, `mark_notification_*`, `get_ag_recipients`, `get_ag_sending_stats`) : restent en migration **0033** (`notif-ag-transitoire`), pas dans 0030.

## 9. Critères d'acceptation

- Les 3 gates de palier passent (palier 1 & 3 en `begin…rollback`, palier 2 à **commit réel**).
- **Boucle d'or AG** : un AG type auto-peuple le GL → `audit_finance_integrity = 0`, GL D=C, à **commit réel**, idempotent (re-`finalize` = no-op via UNIQUE).
- `supabase db reset` rejoue 0001→0030 sans erreur.
- **vitest 75/75** inchangé (tests TS purs, sans DB).
- Cadence : workflow auteur → 2 relecteurs adversariaux → synthèse, par palier ; **1 commit quand tout est vert**.

## 10. Risques / points ouverts pour le plan

- Mapping exact des colonnes `copros` (syndic) et `contracts` (activation) pour APPOINT_SYNDIC/MANAGE_CONTRACT — **lire les schémas réels au plan**.
- Ordre V4 dans `activate_ag_decisions` pour `APPROVE_ACCOUNTS` : confirmer que `close_period` est appelé seulement si la période est `open` (idempotence).
- `generate_calls_from_ag_payload` : confirmer la résolution du `budget_id` (via `budgets.source_ag_id` + `budget_type`) et la clé de répartition à passer à `post_budget_call_for_funds`.
- Vérifier qu'aucune fonction de 0030 ne reproduit le piège **image figée** des contraintes différées (cf. fix `tr_cff_ledger_required`) — re-quêter l'état courant si un trigger contrainte différé est ajouté.
- Réseau instable sur agents longs : brief **inline** dans les scripts de workflow (jamais via `args`).
