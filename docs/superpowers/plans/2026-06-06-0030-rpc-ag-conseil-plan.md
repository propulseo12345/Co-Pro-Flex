# 0030 `rpc_ag_conseil` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Écrire toutes les fonctions, triggers et vues du domaine gouvernance (AG + conseil syndical) sur les tables déjà posées par `0017`/`0018`, en faisant de l'AG le moteur d'auto-population qui incrémente l'état de la copro **toujours via le grand livre**.

**Architecture:** Un seul fichier `supabase/migrations/0030_rpc_ag_conseil.sql`, bâti en **3 paliers** avec une gate à chaque palier (palier 1 & 3 en `begin…rollback`, palier 2 à **commit réel**). Chaque fonction réutilise les routes canoniques finance (0025→0027) et les helpers d'autorisation (0023) ; aucune table créée ; aucun `EXCEPTION WHEN OTHERS` masquant.

**Tech Stack:** PostgreSQL 15 (Supabase), PL/pgSQL `SECURITY DEFINER set search_path = public`, harnais local Docker + `npx supabase db reset`, vitest (TS pur).

**Cadence (méthode projet, prime sur les micro-steps TDD du skill) :** par palier → workflow **ultracode** : 1 agent **auteur** du SQL + **2 relecteurs adversariaux** (lentille A = correction métier/compta, lentille B = sécurité/gardes/contraintes différées) → **synthèse** → écriture fichier → **harnais** (db reset + gate + vitest) → corriger → **1 seul commit quand tout est vert** (les 3 paliers dans le même fichier, commit final unique). Brief **inline** dans les scripts (réseau instable sur `args`).

---

## Décisions transverses (verrouillées — ne pas ré-arbitrer en implémentation)

**Enums (confirmés dans `0003`, ne rien créer) :**
- `vote_choice = 'for','against','abstention'` (enum **unique** ; `vote_direction`/`council_vote_choice` ABANDONNÉS — ne pas créer). Les colonnes `ag_votes.vote`, `ag_correspondence_vote_details.vote`, `council_votes.vote` sont toutes `vote_choice`.
- `majority_type = 'art24','art25','art25_1','art26','art26_1','unanimity'`.
- `resolution_status = 'draft','pending','voting','voted','approved','rejected','adjourned','withdrawn'` → `calculate_resolution_result` écrit uniquement `'approved'` ou `'rejected'`.
- `ag_action_type` = les 12 valeurs (toutes présentes) : `CREATE_BUDGET, CREATE_WORK_BUDGET, APPROVE_ACCOUNTS, SCHEDULE_BUDGET_PAYMENTS, CREATE_EXCEPTIONAL_CALL, SCHEDULE_ALUR_PAYMENTS, CREATE_ALUR_FUND, ELECT_COUNCIL, APPOINT_SYNDIC, MANAGE_CONTRACT, GRANT_QUITUS, DESIGNATE_BUREAU`.
- `council_role = 'president','secretary','treasurer','member','observer'`.
- `correspondence_form_status = 'pending','validated','integrated'`.

**Gardes (helpers 0023, à réutiliser tels quels) :** motif systématique
`if not public.is_service_call() and not <garde>(...) then raise exception 'forbidden: …' using errcode='42501'; end if;`
- **G-MGR** : `public.user_is_copro_manager(p_copro_id)`
- **G-DEF-RO** : `public.user_has_copro_access(p_copro_id)`
- **G-OWNER (membre CS)** : `public.is_council_member(p_copro_id, auth.uid())` (source unique du rôle conseil)
- **G-INTERNAL** : pas de garde d'accès (helpers appelés par des fonctions déjà gardées)
- Tout en `SECURITY DEFINER set search_path = public` ; `revoke execute … from public, anon;` puis `grant execute … to authenticated, service_role;`.

**Source des tantièmes (CRITIQUE — utilisé partout) :** il n'y a **pas** de colonne `tantiemes` sur `lots`. Les tantièmes = `repartition_key_lines.weight` de la **clé générale active** (`repartition_keys.category='general' and is_active=true`). Pour un copropriétaire, total = somme sur ses lots **actifs** (`lot_owners.end_date is null`) de `weight × (share_percent/100)` :
```sql
select coalesce(sum(rkl.weight * lo.share_percent / 100.0), 0)
from public.lot_owners lo
join public.repartition_keys rk on rk.copro_id = lo.copro_id and rk.category='general' and rk.is_active
join public.repartition_key_lines rkl on rkl.key_id = rk.id and rkl.lot_id = lo.lot_id
where lo.coproprietaire_id = :cop and lo.copro_id = :copro and lo.end_date is null;
```
- **Total syndicat** `total_tantiemes` = `sum(weight)` de la clé générale active.
- **Total copropriétaires** `total_owners` = `count(distinct coproprietaire_id)` des `lot_owners` actifs de la copro.

**Comptes (tous provisionnés par `provision_copro_chart`, identifiés par `accounts.code`) :** `701` (courant), `702` (travaux), `105` (ALUR), `110` (solde travaux), `120` (solde courant), `450-1..450-5`, `512`, `401`. **`post_budget_call_for_funds` gère déjà la contrepartie par nature** (`current→701`, `works→702`, `alur→105`) et le débiteur via `resolve_lot_tiers_account` (`alur→450-5`) — donc **CREATE_ALUR_FUND réutilise post_budget_call_for_funds**, aucune branche ALUR séparée.

**APPOINT_SYNDIC = no-op informatif** (décision USER 2026-06-06, cf. mémoire `syndic-mandate-deferred`) : `copros` n'a pas de colonnes syndic. `prepare_ag_decisions` émet la pending_action (`target_table='copros'`, `target_id` NULL) pour la traçabilité ; `activate_ag_decisions` la marque `'activated'` avec `result_data = {note:'informatif — mandat syndic différé post-finance'}`. **Modélisation du mandat syndic = migration de schéma dédiée APRÈS la phase finance.**

**MANAGE_CONTRACT = renouvellement par date de début (décision USER 2026-06-06) :** activer le contrat voté (`status='active'`) ; s'il existe un contrat actif **antérieur de même `domain_id`** dans la copro, le passer `status='expired'`, `end_date = <date de début du contrat voté>` (la date de début de la résolution est la bascule du renouvellement). Pas de résiliation aveugle ; pas de `terminated_at` (c'est une expiration par renouvellement, pas une rupture).

**`DESIGNATE_BUREAU` :** pas de pivot — non émis par `prepare_ag_decisions` (les noms président/secrétaire/scrutateurs vivent sur `ag_meetings`, renseignés en séance). **`GRANT_QUITUS` :** émis (`target_table='budgets'`, `target_id` NULL), `activate` = no-op informatif.

**Pièges à éviter (acquis des lots précédents) :**
- **Aucun `EXCEPTION WHEN OTHERS`** masquant ; errcodes explicites `42501` / `23514` / `23503`.
- **Contraintes différées — image figée** (cf. fix `tr_cff_ledger_required`, mémoire `deferred_constraint_trigger_stale_image`) : tout nouveau trigger `CONSTRAINT … DEFERRED` doit **re-quêter la ligne courante** (pas se fier à `new.*`) et exempter les lignes annulées.
- **Signatures front à respecter** (noms de params exacts, `src/types/supabase.ts`) : `p_ag_id`, `p_copro_id`, `p_resolution_id`, `p_payload`, `p_coproprietaire_id`, `p_vote`, `p_vote_source`, `p_decision_id`, `p_activate`. L'enum `p_vote` est typé `vote_choice` côté cible (le front régénérera ses types ; valeurs `for/against/abstention`).
- **`finalize_and_activate_ag(p_ag_id, p_activate boolean default true)`** = unique point d'entrée.

---

## File Structure

`supabase/migrations/0030_rpc_ag_conseil.sql` — sections dans l'ordre de dépendance :
```
-- SECTION 0 : commentaire d'en-tête (périmètre, dette front Phase 4 documentée, différés §8 spec)
-- SECTION 1 (Palier 1) : compute_majority_threshold, calculate_resolution_result, compute_decision_result,
--                        cast_vote, compute_ag_quorum, get_ag_live_results,
--                        create_ag_with_standard_resolutions, start_ag, close_ag, rpc_finalize_ag_session,
--                        archive_ag, check_convocation_delay, validate_ag_variables
-- SECTION 2 (Palier 1) : vues v_ag_resolution_vote_summary, v_ag_resolutions_results, v_ag_vote_stats_by_resolution
-- SECTION 3 (Palier 1) : triggers trg_ag_attendance_tantiemes, trg_ag_vote_requires_attendance,
--                        trg_ag_close_clear_drafts, enforce_copro_consistency (×7 tables)
-- SECTION 4 (Palier 2) : prepare_ag_decisions, generate_calls_from_ag_payload, activate_ag_decisions,
--                        finalize_and_activate_ag
-- SECTION 5 (Palier 3) : get_ag_wizard_state, save_ag_wizard_state, complete_ag_wizard_step, drafts CRUD,
--                        correspondance (register/save/get), envoi (save/get), bundles (convocation/pv/coproprietaires)
```
Un fichier ; 3 paliers ; **commit unique** quand les 3 gates passent.

---

## Task 1 — Palier 1 : Vote / session / conseil

**Files:** Modify (créer le fichier) `supabase/migrations/0030_rpc_ag_conseil.sql` (SECTION 0 → 3).

### Contrats de fonctions (l'auteur DOIT respecter exactement)

| Fonction | Signature | Garde | Règle / appels |
|---|---|---|---|
| `compute_majority_threshold` | `(p_majority majority_type, p_total_tantiemes numeric, p_present_tantiemes numeric, p_total_owners integer, p_present_owners integer) returns jsonb` **IMMUTABLE** | G-INTERNAL | Math pure (cf. table majorités) → `{threshold_tantiemes, threshold_voters, basis}` |
| `calculate_resolution_result` | `(p_resolution_id uuid) returns jsonb` | G-MGR | écrit `status`/`voted_at`/`threshold_tantiemes`/`threshold_voters` ; calcule éligibilité passerelle ; cf. ci-dessous |
| `compute_decision_result` | `(p_decision_id uuid) returns table(is_passed boolean, quorum_reached boolean, total_votes int, votes_for int, votes_against int, votes_abstention int)` | G-OWNER | majorité **simple** conseil |
| `cast_vote` | `(p_resolution_id uuid, p_coproprietaire_id uuid, p_vote vote_choice, p_vote_source vote_source default 'live') returns jsonb` | G-MGR | INSERT `ag_votes` (UNIQUE resolution×coprop), `tantiemes` dérivés clé générale ; sans `WHEN OTHERS` |
| `compute_ag_quorum` | `(p_ag_id uuid) returns table(attendees_count int, present_count int, proxy_count int, correspondence_count int, present_tantiemes numeric, total_tantiemes numeric, is_quorum_reached boolean, quorum_ratio numeric)` | G-DEF-RO | lit `ag_attendance` |
| `get_ag_live_results` | `(p_ag_id uuid) returns jsonb` | G-DEF-RO | agrège les votes par résolution (lit la vue `v_ag_resolution_vote_summary`) |
| `create_ag_with_standard_resolutions` | `(p_copro_id uuid, p_title text, p_meeting_date timestamptz, p_meeting_type ag_meeting_type default 'ordinary', p_location text default null) returns uuid` | G-MGR | crée `ag_meetings` + résolutions standard |
| `start_ag` | `(p_ag_id uuid, p_opening_notes text default null) returns jsonb` | G-MGR | `ag_status` → `'session_active'` |
| `close_ag` | `(p_ag_id uuid, p_closing_notes text default null) returns jsonb` | G-MGR | `ag_status` → `'closed'` |
| `rpc_finalize_ag_session` | `(p_ag_id uuid, p_closing_notes text default null) returns jsonb` | G-MGR | clôture + finalisation séance |
| `archive_ag` | `(p_ag_id uuid) returns jsonb` | G-MGR | `ag_status` → `'archived'` |
| `check_convocation_delay` | `(p_ag_id uuid) returns table(is_valid boolean, days_remaining int, minimum_delay int, meeting_date timestamptz, warning_message text)` | G-DEF-RO | délai légal 21 j |
| `validate_ag_variables` | `(p_ag_id uuid) returns jsonb` | G-DEF-RO | cohérence des `variables` des résolutions |

### `calculate_resolution_result` — math exacte (load-bearing, zéro ambiguïté)

Agrégats sur `ag_votes` de la résolution, `is_excluded=false` :
`for_t = Σ tantiemes(vote='for')`, `against_t = Σ tantiemes(vote='against')`, `for_n = count(distinct coproprietaire_id where vote='for')`.
Totaux copro : `total_t` (Σ weight clé générale), `total_owners` (cf. décisions transverses).

| `majority_type` | Règle d'adoption (`approved` si vrai) | Éligibilité passerelle exposée (si `rejected`) |
|---|---|---|
| `art24` | `for_t > against_t` (voix exprimées, abstentions exclues) | — |
| `art25` | `for_t >= floor(total_t/2) + 1` | `bridge_eligible = (for_t >= ceil(total_t/3.0))` → 2nd vote à **art24** (art.25-1) |
| `art25_1` | évaluée à la règle **art24** (`for_t > against_t`) | — (c'est déjà le 2nd vote) |
| `art26` | `for_t >= floor(2*total_t/3) + 1` **ET** `for_n > floor(total_owners/2)` | `bridge_eligible = (for_t >= floor(total_t/2))` → 2nd vote à **art25** (art.26-1) |
| `art26_1` | évaluée à la règle **art25** | — |
| `unanimity` | `for_t = total_t` **ET** `against_t = 0` | — |

Effets : `update ag_resolutions set status = case when <adopté> then 'approved' else 'rejected' end, voted_at = now(), threshold_tantiemes = <seuil calculé>, threshold_voters = <seuil voix art26 ou null>, is_bridgeable = <bridge_eligible>`. **Retour** : `jsonb_build_object('success',true,'resolution_id',…,'status',…,'for_t',…,'against_t',…,'total_t',…,'bridge_eligible',…,'bridge_target_majority', case majority_type when 'art25' then 'art24' when 'art26' then 'art25' else null end)`. **Pas d'orchestration auto du 2nd vote** (décision §3.3 : informatif).

### `cast_vote` — corps attendu
Dérive `copro_id` + `tantiemes` du votant (clé générale, formule ci-dessus), `insert into ag_votes(resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)` ; le trigger `trg_ag_vote_requires_attendance` rejette un vote `'live'` sans présence ; l'UNIQUE `(resolution_id, coproprietaire_id)` bloque le doublon (laisser remonter `23505`, ne pas l'avaler).

### Vues (remplacent les 8 compteurs dénormalisés supprimés)
- `v_ag_resolution_vote_summary` : par `resolution_id` → `votes_for/against/abstention` (counts), `tantiemes_for/against/abstention`, `total_expressed`.
- `v_ag_resolutions_results` : jointe à `ag_resolutions` → `status`, `threshold_*`, `is_bridgeable` + agrégats de la vue précédente.
- `v_ag_vote_stats_by_resolution` : ratios (% pour/contre/abstention sur exprimés et sur total). Toutes `with (security_invoker = true)`.

### Triggers
- `trg_ag_attendance_tantiemes` **BEFORE INSERT OR UPDATE OF lot_ids ON ag_attendance** : recalcule `new.tantiemes` = Σ weight clé générale des `new.lot_ids` (× share_percent si indivision — sommer `repartition_key_lines.weight` des lots, sans double compter ; pour la présence on prend le poids **du lot** présent, pas par personne → Σ `weight` des lots de `lot_ids`).
- `trg_ag_vote_requires_attendance` **BEFORE INSERT ON ag_votes** (ex-`trg_ag_vote_check_duplicate`) : si `vote_source='live'`, rejette (`23514`) s'il n'existe pas de `ag_attendance` du votant pour l'AG de la résolution avec `presence_type in ('present','proxy')`.
- `trg_ag_close_clear_drafts` **AFTER UPDATE OF status ON ag_meetings** : si `new.status` ∈ états clos → `delete from ag_session_drafts where ag_id = new.id`.
- `enforce_copro_consistency` **BEFORE INSERT OR UPDATE** sur `ag_resolutions, ag_votes, ag_attendance, ag_correspondence_votes, ag_correspondence_vote_details, council_decisions, council_votes` : vérifie que `copro_id` de la ligne = `copro_id` du parent (cohérence intra-copro) ; **re-quêter le parent** (pas d'image figée).

### Steps
- [ ] **Step 1.1 — Authoring workflow.** Lancer un workflow ultracode (script brief inline) : agent auteur produit SECTION 0→3 du SQL ; 2 relecteurs adversariaux (lentille compta/majorités vs lentille gardes/triggers/contraintes) ; synthèse. Récupérer le SQL de la synthèse.
- [ ] **Step 1.2 — Écrire le fichier.** Écrire `supabase/migrations/0030_rpc_ag_conseil.sql` (SECTION 0→3) via PowerShell `[IO.File]::WriteAllText` (gère les `\n`, vérifier entités HTML `&gt;`/`&lt;`).
- [ ] **Step 1.3 — Vérification manuelle.** Relire chaque colonne vs tables réelles (`0017`/`0018`) et chaque enum vs `0003` ; confirmer 0 doublon avec l'existant.
- [ ] **Step 1.4 — Harnais.** Run : `cd Co-Pro-Flex; npx --no-install supabase db reset` (rejoue 0001→0030).
  Expected : reset OK, 0 erreur.
- [ ] **Step 1.5 — Gate palier 1 (`begin…rollback`).** Monter via `docker exec supabase_db_Co-Pro-Flex psql …` (contexte service_role : `select set_config('request.jwt.claims','{"role":"service_role"}',true);`) un AG avec présences + votes, puis vérifier :
  - double vote même copropriétaire → **UNIQUE refusé** (`23505`).
  - vote `live` sans présence → **refusé** (`23514`).
  - seuils art.24 / art.25 / art.26 / unanimité corrects sur cas montés (1 cas adopté + 1 rejeté par article).
  - éligibilité passerelle exposée sur un cas art.25 rejeté mais `for_t >= ceil(total_t/3)` (`bridge_eligible=true`, `bridge_target_majority='art24'`).
  - vues `v_ag_*` cohérentes avec les votes insérés.
  Expected : toutes les assertions vraies, puis `rollback`.
- [ ] **Step 1.6 — vitest.** Run : `npx vitest run`. Expected : **75/75**.

---

## Task 2 — Palier 2 : Chaîne auto-population AG→GL (TOUT-OU-RIEN)

**Files:** Modify `supabase/migrations/0030_rpc_ag_conseil.sql` (SECTION 4).

### Contrats

| Fonction | Signature | Garde |
|---|---|---|
| `prepare_ag_decisions` | `(p_ag_id uuid) returns jsonb` | G-MGR |
| `generate_calls_from_ag_payload` | `(p_ag_id uuid, p_copro_id uuid, p_resolution_id uuid, p_payload jsonb) returns jsonb` | G-MGR |
| `activate_ag_decisions` | `(p_ag_id uuid) returns jsonb` | G-MGR |
| `finalize_and_activate_ag` | `(p_ag_id uuid, p_activate boolean default true) returns jsonb` | G-MGR |

### `prepare_ag_decisions` — pivot
Pour chaque `ag_resolutions` de l'AG avec `status='approved'` ET `action_type is not null` ET `action_type <> 'DESIGNATE_BUREAU'` : `insert into ag_pending_actions(ag_id, resolution_id, action_type, target_table, target_id, payload, status)` avec mapping `target_table` :

| action_type | target_table | payload (depuis `ag_resolutions.variables`) |
|---|---|---|
| CREATE_BUDGET, GRANT_QUITUS | `budgets` | variables |
| CREATE_WORK_BUDGET, CREATE_ALUR_FUND | `budgets` | variables |
| APPROVE_ACCOUNTS | `accounting_periods` | `{date_debut,date_fin}` |
| SCHEDULE_BUDGET_PAYMENTS, CREATE_EXCEPTIONAL_CALL, SCHEDULE_ALUR_PAYMENTS | `call_for_funds` | variables (mode/échéances) |
| ELECT_COUNCIL | `council_members` | `{council_members:[{coproprietaire_id,role}]}` |
| APPOINT_SYNDIC | `copros` | variables (informatif) |
| MANAGE_CONTRACT | `contracts` | `{contract_id, start_date}` |

Idempotence : `on conflict (ag_id, resolution_id) do nothing`. Pour `APPROVE_ACCOUNTS`, résoudre `target_id` = `accounting_periods.id` couvrant `date_debut..date_fin` (`raise 23503` si introuvable — pas d'`approve_period(NULL)` silencieux). Retour : `{success, prepared:<n>}`.

### `activate_ag_decisions` — dispatch TOUT-OU-RIEN
Boucle sur `ag_pending_actions where ag_id=p_ag_id and status='pending'` (les `'activated'` sont sautées → idempotence re-finalize). **Aucun `EXCEPTION WHEN OTHERS`** : toute erreur d'une action `RAISE` et fait rollback de tout. Dispatch par `action_type` :

- `CREATE_BUDGET` / `CREATE_WORK_BUDGET` → `validate_budget(<budget_id>)` (budget résolu via `ag_resolutions.linked_budget_id`/`linked_work_budget_id`, sinon `budgets where source_ag_id=p_ag_id and budget_type=<current|works>`).
- `CREATE_ALUR_FUND` → `validate_budget(<budget alur>)` puis `generate_calls_from_ag_payload` (l'appel ALUR poste D450-5/C105 via `post_budget_call_for_funds`).
- `APPROVE_ACCOUNTS` → **ordre V4** sur `target_id` (= période N), idempotent (n'appeler `close_period` que si `status='open'`) :
  `close_period(N)` → `open_next_period(p_copro_id, N)` → `regularize_period(p_copro_id, N)` → `approve_period(N)`.
- `SCHEDULE_BUDGET_PAYMENTS` / `CREATE_EXCEPTIONAL_CALL` / `SCHEDULE_ALUR_PAYMENTS` → `generate_calls_from_ag_payload(p_ag_id, p_copro_id, resolution_id, payload)`.
- `ELECT_COUNCIL` → désactiver l'ancien conseil (`update council_members set is_active=false, end_date=current_date where copro_id=p_copro_id and is_active`) **puis** insérer les élus du payload (`council_members(copro_id, coproprietaire_id, role, start_date, is_active)`). Garde : chaque `coproprietaire_id` doit être copropriétaire **actif** de la copro, sinon `raise 23514` (→ rollback).
- `APPOINT_SYNDIC` → **no-op informatif** : marquer `activated`, `result_data = {note:'informatif — mandat syndic différé'}`.
- `MANAGE_CONTRACT` → `update contracts set status='active' where id=<contract_id>` ; puis renouvellement : `update contracts set status='expired', end_date=<payload.start_date> where copro_id=p_copro_id and domain_id=(select domain_id from contracts where id=<contract_id>) and id<>contract_id and status='active' and start_date < <payload.start_date>`.
- `GRANT_QUITUS` → no-op informatif.

Chaque action traitée : `update ag_pending_actions set status='activated', activated_at=now(), result_data=<jsonb> where id=…`. Retour : `{success, activated:<n>, details:[…]}`.

### `generate_calls_from_ag_payload` — appels depuis payload
Résout le budget (selon `action_type`/`budget_type`), lit le mode d'échéancier du payload (`UNIQUE/SEMESTRIEL/TRIMESTRIEL/PERSONNALISE`), et **boucle `post_budget_call_for_funds`** une fois par échéance avec `p_installment_index`/`p_installment_count` (ou `p_fraction`) ; `p_label = 'AG rés.'||resolution_number||' — T'||n` ; `p_trimester = n`. Idempotence : sauter une échéance si un `call_for_funds` de même `(budget_id, label)` existe déjà. Retour : `{success, calls:[{call_id, ledger_tx_id, total_amount}]}`. (Aucune branche ALUR : `post_budget_call_for_funds` gère `105` nativement.)

### `finalize_and_activate_ag` — orchestrateur (point d'entrée unique)
```
1. for each résolution de l'AG : calculate_resolution_result(res.id)
2. prepare_ag_decisions(p_ag_id)
3. if p_activate then activate_ag_decisions(p_ag_id)
```
Le tout dans le corps d'**une** fonction = une transaction → atomicité naturelle. Retour : `{success, resolutions:<n>, prepared:<n>, activated:<n>}`.

### Steps
- [ ] **Step 2.1 — Authoring workflow** (ultracode, brief inline) : SECTION 4. Lentille A = ordre V4 + idempotence + ventilation ; lentille B = tout-ou-rien (aucun `WHEN OTHERS`), gardes coproprietaire actif, contraintes différées (re-quête).
- [ ] **Step 2.2 — Écrire** la SECTION 4 dans le fichier.
- [ ] **Step 2.3 — Vérif manuelle** : signatures = `src/types/supabase.ts` (noms params) ; appels canoniques = signatures réelles 0025/0026/0027.
- [ ] **Step 2.4 — Harnais** : `npx --no-install supabase db reset`. Expected : OK.
- [ ] **Step 2.5 — Gate palier 2 À COMMIT RÉEL** (pas `begin…rollback`, pour éprouver les contraintes différées). Sur une copro de test seedée (`select create_test_copro_seeded();`) en contexte service_role : monter un AG complet (budget courant voté + `APPROVE_ACCOUNTS` + `SCHEDULE_BUDGET_PAYMENTS` + `CREATE_ALUR_FUND` + `ELECT_COUNCIL` + `APPOINT_SYNDIC` + `MANAGE_CONTRACT`), `select finalize_and_activate_ag(:ag_id);` **committé**, puis vérifier :
  - budgets validés (`status='validated'`), appels postés (`call_for_funds.ledger_tx_id not null`),
  - **`select * from audit_finance_integrity(:copro)` = 0 écart**, GL D=C,
  - conseil inséré (anciens `is_active=false`, élus `is_active=true`), contrat voté `active` + ancien même domaine `expired` à la bonne date,
  - re-`finalize_and_activate_ag` = no-op (pending_actions déjà `activated`).
  Expected : toutes vraies, **données persistées** (commit).
- [ ] **Step 2.6 — Gate tout-ou-rien** : sur une 2ᵉ copro de test, monter un AG dont une résolution a une **clé de répartition incomplète** ; `finalize_and_activate_ag` doit **RAISE** → vérifier (nouvelle session psql) **aucun** budget validé, **aucun** appel, **aucun** membre inséré (rollback complet prouvé).
- [ ] **Step 2.7 — vitest** : `npx vitest run` → **75/75**.

---

## Task 3 — Palier 3 : Wizard / correspondance / envoi / bundles / pouvoirs

**Files:** Modify `supabase/migrations/0030_rpc_ag_conseil.sql` (SECTION 5).

### Contrats
| Fonction | Signature | Garde | Note |
|---|---|---|---|
| `get_ag_wizard_state` | `(p_ag_id uuid) returns jsonb` | G-MGR | lire les jalons depuis `ag_session_drafts(draft_type='milestones')` ou `ag_meetings.step_data` — **plus de dépendance `ag_milestones`** (pré-condition du drop séquencé) |
| `save_ag_wizard_state` | `(p_ag_id uuid, p_current_step int, p_step_data jsonb default null, p_wizard_mode text default null) returns jsonb` | G-MGR | maj `ag_meetings.current_step/max_step_reached/step_data` |
| `complete_ag_wizard_step` | `(p_ag_id uuid, p_step int, p_next_step int default null) returns jsonb` | G-MGR | avance le wizard |
| drafts CRUD | `save_ag_draft`/`get_ag_draft`/`delete_ag_draft`/`get_ag_all_session_drafts`/`clear_ag_session_drafts` | G-MGR | sur `ag_session_drafts` |
| `register_correspondence_form_votes` | `(p_ag_id uuid, p_coproprietaire_id uuid, p_votes jsonb, p_mode_reception text default 'postal') returns jsonb` | G-MGR | crée `ag_correspondence_votes` + `_details` |
| `save_votes_correspondance` | `(p_ag_id uuid, p_coproprietaire_id uuid, p_votes jsonb, p_status text default 'pending') returns jsonb` | G-MGR | état formulaire |
| `get_votes_correspondance` / `get_correspondence_eligible_owners` | `(p_ag_id uuid) returns jsonb` | G-DEF-RO | |
| envoi | `save_ag_envoi_tracking`/`get_ag_envoi_tracking` | G-MGR | sur `ag_envoi_tracking` |
| bundles | `rpc_get_ag_convocation_bundle`/`rpc_get_ag_pv_bundle` `(p_ag_id uuid) returns jsonb` ; `rpc_get_ag_coproprietaires(p_ag_id uuid) returns table(...)` | G-DEF-RO/G-MGR | `display_name = case when is_company then company_name else first_name||' '||last_name end` ; tantièmes via clé générale |

**Pouvoirs** : pas de table `ag_pouvoirs` (abandonnée) — les pouvoirs vivent sur `ag_attendance` (`presence_type='proxy'`, `represented_by_id`, `proxy_signed_at`, `proxy_document_id`). Pas de RPC `*_pouvoir` séparé.
**L'intégration d'un formulaire de correspondance** crée un `ag_votes` (`vote_source='correspondence'`) et renseigne `ag_correspondence_vote_details.integrated_vote_id`.

### Steps
- [ ] **Step 3.1 — Authoring workflow** (ultracode, brief inline) : SECTION 5.
- [ ] **Step 3.2 — Écrire** la SECTION 5.
- [ ] **Step 3.3 — Vérif manuelle** : aucune référence à `ag_milestones` ni `ag_pouvoirs` ; `display_name`/tantièmes corrects.
- [ ] **Step 3.4 — Harnais** : `npx --no-install supabase db reset`. Expected : OK.
- [ ] **Step 3.5 — Gate palier 3 (`begin…rollback`)** :
  - `get_ag_wizard_state` fonctionne **sans** `ag_milestones` (renvoie l'état depuis drafts/step_data).
  - un formulaire de correspondance validé s'intègre en `ag_votes` (`integrated_vote_id` renseigné).
  - `rpc_get_ag_convocation_bundle` / `rpc_get_ag_pv_bundle` / `rpc_get_ag_coproprietaires` renvoient les données attendues (display_name + tantièmes corrects).
- [ ] **Step 3.6 — vitest** : `npx vitest run` → **75/75**.

---

## Task 4 — Clôture

- [ ] **Step 4.1 — Gate global** : `npx --no-install supabase db reset` rejoue **0001→0030** sans erreur ; `create_test_copro_seeded()` → `audit_finance_integrity=0`.
- [ ] **Step 4.2 — Boucle d'or AG (commit réel)** : un AG type auto-peuple le GL → `audit_finance_integrity=0`, GL D=C, idempotent.
- [ ] **Step 4.3 — Commit unique** :
```bash
git add supabase/migrations/0030_rpc_ag_conseil.sql
git commit -m "feat(db): 0030 rpc ag + conseil (auto-population AG->GL tout-ou-rien)"
```
- [ ] **Step 4.4 — Mettre à jour** `.planning/PROGRESS_lot-fonctions.md` (0030 → livré + hash) et `.planning/SESSION.md`.

---

## Différés (TODO en commentaire d'en-tête de 0030 + suivi) — ne PAS implémenter

- Plafond pouvoirs **art.22** (3 délégations, sauf ≤10 % des voix) → lot « conformité vote ».
- Neutralisation correspondance **art.17-1 A** (colonne `is_amended` absente) → différé.
- **Orchestration auto** de la passerelle 25-1/26-1 → 0030 calcule l'éligibilité et alerte seulement.
- **Drop séquencé** `ag_milestones` + île notifications (`ag_notifications`/`ag_notification_events`) → étape 3 ultérieure (après refacto edge `email_webhook`). 0030 NE droppe PAS ces tables.
- **Notifications transitoires** (`create_ag_notification`, `mark_notification_*`, …) → migration **0033** `notif-ag-transitoire`.
- **Dette front Phase 4** : `src/lib/ag/api/finalisation.api.ts` (+ `useFinalisationPage/Data`) appelle encore le bespoke abandonné → 42883 après reset. **Acceptée, documentée** dans l'en-tête de 0030, non bloquante.
- **APPOINT_SYNDIC** : modélisation du mandat syndic → migration de schéma dédiée **après la phase finance** (mémoire `syndic-mandate-deferred`).

---

## Self-Review (couverture spec → plan)

- §3 Décisions de cadrage : activate tout-ou-rien (Task 2, Step 2.6) ✓ ; APPOINT_SYNDIC/MANAGE_CONTRACT logique DB (Task 2 dispatch, ajustés par décisions USER) ✓ ; passerelle informative (`calculate_resolution_result`) ✓ ; frontière dur/souple ✓ ; approche C un fichier 3 paliers ✓.
- §4 Périmètre par palier : toutes les fonctions/triggers/vues des 3 paliers listées avec signatures ✓.
- §5 Décisions transverses (gardes, RLS différée 0034, pas de `WHEN OTHERS`, enums) ✓.
- §6 Dépendances (appels 0025/0026/0027, signatures front) ✓.
- §7 Payloads (ELECT_COUNCIL, APPOINT_SYNDIC, MANAGE_CONTRACT, APPROVE_ACCOUNTS) ✓.
- §8 Hors-périmètre → section Différés ✓.
- §9 Critères d'acceptation : 3 gates + boucle d'or AG commit réel + db reset + vitest 75/75 + cadence workflow ✓ (Tasks 1–4).
- §10 Risques : mapping `copros`/`contracts` (résolu : copros no-op, contracts renewal) ✓ ; ordre V4 + idempotence close_period ✓ ; résolution `budget_id` ✓ ; piège image figée contraintes différées ✓ ; brief inline ✓.
- Cohérence des noms : `calculate_resolution_result`, `prepare_ag_decisions`, `activate_ag_decisions`, `generate_calls_from_ag_payload`, `finalize_and_activate_ag`, `compute_majority_threshold` — identiques entre Décisions transverses, Tasks et signatures front.
