# Domaine 04 — AG + Conseil syndical — SCHÉMA CIBLE (blueprint)

> Cible PROPRE du domaine gouvernance : assemblées générales + conseil syndical, **auto-population canonique uniquement** (la chaîne qui POSTE le grand livre).
> Cadre : redesign profond mais justifié — corrige les dettes du verdict (cartographie `_cartographie/04-ag-gouvernance.md` §3), préserve le cœur sain.
> Source des faits : live `iyfesbjnkpynmwlsmxnp` (lecture seule, 2026-06-04) + T1/T2/T3.
> Décisions utilisateur VERROUILLÉES appliquées : RLS partout + 3 rôles + bicéphale service_role ; AG = garder uniquement la chaîne GL, abandonner le bespoke ; conseil = majorité simple propre.

---

## 0. Principe directeur du domaine

L'AG est le **moteur d'auto-population** : une résolution votée et approuvée incrémente automatiquement l'état de la copro. Dans la cible, il n'existe **qu'UN SEUL chemin** :

```
finalize_and_activate_ag(ag_id)
   ├─ calculate_resolution_result(...)   → fige le résultat de chaque résolution (art.24/25/25-1/26/26-1/unanimité)
   ├─ prepare_ag_decisions(ag_id)        → écrit ag_pending_actions (1 par résolution approuvée à action_type)
   └─ activate_ag_decisions(ag_id)       → dispatch par action_type :
         ├─ CREATE_BUDGET / WORK_BUDGET  → validate_budget
         ├─ APPROVE_ACCOUNTS            → close_period → open_next_period (à-nouveau) → regularize_period (affectation 110/120) → approve_period   [ordre V4]
         ├─ SCHEDULE_* / EXCEPTIONAL    → generate_calls_from_ag_payload → post_budget_call_for_funds   (D450-x/lot · C701 — ROUTE GL CANONIQUE)
         ├─ CREATE_ALUR_FUND            → chaîne ALUR (D450-5 / C105, art.14-2)
         └─ ELECT_COUNCIL              → désactive l'ancien conseil + insère council_members
```

La couche **bespoke** (`create_budget_from_ag`, `generate_combined_calls_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `finish_ag_session`, `get_ag_pending_actions`, `mark_ag_action_activated`) qui écrivait l'état métier **sans jamais toucher le grand livre** est **abandonnée** (cf. §5). Le pivot `ag_pending_actions` reste le journal d'auto-population (idempotent via UNIQUE ag×resolution).

`ag_pending_actions.target_table` ne doit référencer QUE des tables canoniques **existantes** : `budgets`, `call_for_funds`, `council_members`, `accounting_periods`, `copros`, `contracts` (liste blanche du CHECK §1.6, alignée sur les cibles réelles de `prepare_ag_decisions` en live). Le bespoke abandonné pointait `ag_resolutions`, `appels_fonds`, `coproprietaires`, `syndics` (legacy/inexistants), **proscrits**. Conséquence sur la migration : les lignes `pending` legacy de l'immuable 11111111 portant ces `target_table` proscrits sont **filtrées à la reprise** pour ne pas violer le CHECK (règle déterministe + comptes réels en §6.1).

### 0.1 Arbitrage de propriété croisée — `planned_works` (liaison AG ↔ PPT) — **TRANCHÉ**

`planned_works` (plan pluriannuel de travaux) est **revendiquée** par deux blueprints : le domaine 07 (maintenance/PPT) la décrit (07 §1.10) et y pose des FK `ag_id → ag_meetings(id)` et `resolution_id → ag_resolutions(id)`, tandis que son arbitrage 07-A4 demande une **co-validation du domaine AG** « qui possède `ag_id`/`resolution_id` ». Décision tracée ici pour lever l'ambiguïté de propriété (règle : une table revendiquée par 2 domaines doit être arbitrée explicitement) :

- **Propriété : domaine 07 (maintenance/PPT).** `planned_works` est une table de **planification** (PPT), distincte de l'exécution (`service_orders`) et du vote/engagement (`budget_lines`). Le domaine 04 ne la définit PAS, ne la migre PAS, n'y applique PAS de RLS — tout cela relève de 07.
- **Rôle de 04 : fournisseur de cibles de FK uniquement.** Le domaine AG **expose** `ag_meetings(id)` et `ag_resolutions(id)` comme cibles stables ; il **accepte** que `planned_works` les référence en `ON DELETE SET NULL` (un PPT survit à la suppression de l'AG qui l'a voté). Aucune colonne, aucun trigger, aucune logique d'auto-population côté 04 ne dépend de `planned_works` : la chaîne canonique `finalize_and_activate_ag` (cf. §0) n'écrit JAMAIS dans `planned_works`.
- **Co-validation 07-A4 : accordée.** Cette note vaut accord du domaine AG sur les FK `ag_id`/`resolution_id` posées par 07 §1.10. Le sens de la liaison est **07 → 04** (la maintenance pointe l'AG), jamais l'inverse.

---

## 1. TABLES

Conventions communes : `id uuid PK default gen_random_uuid()`, `created_at timestamptz NOT NULL default now()`, `updated_at timestamptz NOT NULL default now()` (alimenté par le **trigger générique unique `set_updated_at()`**, cf. T1 §O / T2 §3.1). Toute table porteuse de `copro_id` reçoit le trigger d'intégrité `enforce_copro_consistency` (cf. §4) qui vérifie que `copro_id` est cohérent avec celui du parent (`ag_id → ag_meetings.copro_id`, etc.).

### 1.1 `ag_meetings` — séance d'AG (entité racine)

Dette corrigée : enum `ag_status` complété (`archived`), CHECK wizard réconcilié, `quorum_required` conservé.

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | | FK copros(id) ON DELETE CASCADE |
| title | text | NO | | |
| meeting_type | ag_meeting_type | NO | 'ordinary' | |
| meeting_date | timestamptz | NO | | |
| location | text | YES | | |
| convocation_date | timestamptz | YES | | sert à `check_convocation_delay` (délai légal 21 j) |
| status | ag_status | NO | 'draft' | 9 valeurs live conservées 1:1 + `archived` ajouté (cf. §2) |
| quorum_required | boolean | NO | true | |
| president_id | uuid | YES | | FK coproprietaires(id) ON DELETE SET NULL |
| president_name | text | YES | | dénormalisé bureau (snapshot nom au moment de l'AG) |
| secretary_id | uuid | YES | | FK profiles(id) ON DELETE SET NULL |
| secretary_name | text | YES | | |
| scrutineer1_id | uuid | YES | | FK coproprietaires(id) ON DELETE SET NULL |
| scrutineer1_name | text | YES | | |
| scrutineer2_id | uuid | YES | | FK coproprietaires(id) ON DELETE SET NULL |
| scrutineer2_name | text | YES | | |
| session_started_at | timestamptz | YES | | |
| session_ended_at | timestamptz | YES | | |
| opening_notes | text | YES | | |
| closing_notes | text | YES | | |
| incidents | text | YES | | |
| pv_document_id | uuid | YES | | FK documents(id) ON DELETE SET NULL |
| pv_generated_at | timestamptz | YES | | |
| pv_sent_at | timestamptz | YES | | |
| closed_at | timestamptz | YES | | |
| current_step | integer | YES | 1 | CHECK 1..9 |
| max_step_reached | integer | YES | 1 | **CHECK 1..9** (corrigé : était 1..8, incohérent) |
| step_data | jsonb | YES | '{}' | état wizard |
| wizard_mode | text | YES | 'guided' | CHECK ∈ (guided, expert) |
| remote_meeting_url | text | YES | | |
| remote_meeting_provider | text | YES | | |
| created_by | uuid | YES | | FK profiles(id) ON DELETE SET NULL |
| created_at / updated_at | timestamptz | NO | now() | |

- **PK** id. **FK** ci-dessus. **CHECK** : `current_step BETWEEN 1 AND 9`, `max_step_reached BETWEEN 1 AND 9`, `wizard_mode IN ('guided','expert')`.
- **Colonnes supprimées** : aucune nouvelle (la table était déjà mince) ; le bureau dénormalisé `*_name` est conservé (snapshot historique légal du PV, pas un doublon vivant).
- **Index** : pkey ; `(copro_id, meeting_date desc)` ; `(copro_id, status)` ; partiel `WHERE remote_meeting_url IS NOT NULL`. (On retire les index simples redondants `date` / `status` couverts par les composites.)
- **Triggers** : `set_updated_at` ; `trg_ag_close_clear_drafts` (AFTER UPDATE OF status → purge `ag_session_drafts`).

### 1.2 `ag_resolutions` — résolutions à voter

Dette corrigée : les **9 compteurs dénormalisés + `vote_details` jsonb** sont **SUPPRIMÉS** (dérivables par les vues `v_ag_*`, risque de désync — cf. verdict §3 défaut 3). On garde uniquement le **résultat figé légal** : `status` (approved/rejected) + `voted_at` + `threshold_*` (le seuil applicable, gardé pour traçabilité du calcul au moment du vote). `action_type` passe d'un `text` libre à l'enum cible `ag_action_type` (clé de l'auto-population).

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| ag_id | uuid | NO | | FK ag_meetings(id) ON DELETE CASCADE |
| copro_id | uuid | NO | | FK copros(id) ON DELETE CASCADE (cohérence via trigger) |
| resolution_number | integer | NO | | |
| title | text | NO | | |
| description | text | YES | | |
| resolution_type | resolution_type | NO | 'other' | |
| majority_type | majority_type | NO | 'art24' | art24/25/25_1/26/26_1/unanimity |
| action_type | ag_action_type | YES | | **enum cible** (était text) ; NULL = résolution sans auto-population |
| linked_budget_id | uuid | YES | | FK budgets(id) ON DELETE SET NULL |
| linked_work_budget_id | uuid | YES | | FK budgets(id) ON DELETE SET NULL |
| bridge_vote_id | uuid | YES | | FK ag_resolutions(id) auto-réf (passerelle 25-1/26-1) |
| is_bridgeable | boolean | YES | false | |
| variables | jsonb | YES | '{}' | templating résolution |
| is_customized | boolean | YES | false | |
| status | resolution_status | NO | 'draft' | résultat figé (approved/rejected) |
| threshold_tantiemes | numeric | YES | | seuil appliqué (trace du calcul) |
| threshold_voters | integer | YES | | seuil voix (art.26 double majorité) |
| voted_at | timestamptz | YES | | |
| created_at / updated_at | timestamptz | NO | now() | |

- **Colonnes SUPPRIMÉES** (8) : `tantiemes_for`, `tantiemes_against`, `tantiemes_abstention`, `voters_for`, `voters_against`, `voters_abstention`, `is_approved`, `vote_details`. → dérivées de `ag_votes` via `v_ag_resolution_vote_summary`. `is_approved` redondant avec `status` (approved).
- **PK** id. **UNIQUE** `(ag_id, resolution_number)`. **CHECK** : si `bridge_vote_id IS NOT NULL` alors `majority_type IN ('art25_1','art26_1')` (intégrité passerelle).
- **Index** : pkey ; **un seul** `(ag_id)` (on supprime le doublon `_ag` vs `_ag_id`) ; `(copro_id)` ; `(majority_type)` ; `(status)`.
- **Trigger** : `set_updated_at` ; `enforce_copro_consistency` (copro_id = ag.copro_id).

### 1.3 `ag_votes` — vote nominatif lot-pondéré

Dette corrigée : **un seul** UNIQUE (les 2 contraintes identiques + 2 index jumeaux → 1).

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| resolution_id | uuid | NO | | FK ag_resolutions(id) ON DELETE CASCADE |
| copro_id | uuid | NO | | FK copros(id) ON DELETE CASCADE |
| coproprietaire_id | uuid | NO | | FK coproprietaires(id) ON DELETE RESTRICT |
| vote | vote_choice | NO | | enum **unifié** (ex-`vote_direction`, cf. §2) |
| tantiemes | numeric | NO | | figé à la saisie depuis l'attendance (poids du votant) |
| vote_source | vote_source | NO | 'live' | live / correspondence |
| is_excluded | boolean | YES | false | conflit d'intérêt art.24-II |
| exclusion_reason | text | YES | | |
| created_at / updated_at | timestamptz | NO | now() | |

- **PK** id. **UNIQUE** `(resolution_id, coproprietaire_id)` — **un seul** (suppression du doublon `ag_votes_resolution_id_coproprietaire_id_key`). **CHECK** : `is_excluded = false OR exclusion_reason IS NOT NULL`.
- **Index** : pkey ; UNIQUE `(resolution_id, coproprietaire_id)` ; `(copro_id)`. (On retire les index simples `resolution`, `coproprietaire`, `vote` redondants/peu sélectifs.)
- **Triggers** : `set_updated_at` ; `trg_ag_vote_check` BEFORE INSERT → `trg_ag_vote_check_duplicate()` (rejette si le copro n'est pas dans `ag_attendance` — **renommé** `trg_ag_vote_requires_attendance` pour lever le nom trompeur) ; `enforce_copro_consistency`.

### 1.4 `ag_attendance` — présence / représentation (modèle UNIQUE du mandat)

Dette corrigée : **fusion** du mandat. `ag_pouvoirs` (table dédiée, vide) et `ag_attendance.represented_by_id` modélisaient deux fois la représentation. La cible garde **un seul modèle** porté par `ag_attendance` (présence + procuration + correspondance), enrichi des champs justificatif rapatriés de `ag_pouvoirs`. → `ag_pouvoirs` est **abandonnée** (cf. §6 arbitrage recommandé).

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| ag_id | uuid | NO | | FK ag_meetings(id) ON DELETE CASCADE |
| copro_id | uuid | NO | | FK copros(id) ON DELETE CASCADE |
| coproprietaire_id | uuid | NO | | FK coproprietaires(id) ON DELETE RESTRICT |
| lot_ids | uuid[] | NO | '{}' | lots représentés (source du calcul tantièmes) |
| tantiemes | numeric | NO | 0 | **calculé par trigger** depuis lot_ids (non saisi) |
| presence_type | attendance_type | NO | 'present' | present / proxy / correspondence |
| represented_by_id | uuid | YES | | FK coproprietaires(id) ON DELETE SET NULL (mandataire) |
| represented_by_name | text | YES | | snapshot |
| proxy_document_id | uuid | YES | | FK documents(id) ON DELETE SET NULL (justificatif du mandat) |
| proxy_signed_at | timestamptz | YES | | ex-ag_pouvoirs.signed_at |
| signed | boolean | NO | false | émargement feuille de présence |
| signed_at | timestamptz | YES | | |
| signature_data | text | YES | | |
| arrived_at | timestamptz | YES | | départs/arrivées en cours de séance |
| left_at | timestamptz | YES | | |
| created_at / updated_at | timestamptz | NO | now() | |

- **PK** id. **UNIQUE** `(ag_id, coproprietaire_id)`. **CHECK** : `presence_type <> 'proxy' OR represented_by_id IS NOT NULL` ; `represented_by_id <> coproprietaire_id` (on ne se représente pas soi-même — rapatrié de l'ancien CHECK `ag_pouvoirs`).
- **Index** : pkey ; UNIQUE `(ag_id, coproprietaire_id)` ; GIN `(lot_ids)` (recherche lots) ; `(copro_id)`.
- **Triggers** : `set_updated_at` ; `trg_ag_attendance_tantiemes` BEFORE INSERT/UPDATE OF lot_ids (recalcule `tantiemes`) ; `enforce_copro_consistency`.

### 1.5 `ag_correspondence_votes` + `ag_correspondence_vote_details` — vote par correspondance (loi 2019, art.17-1 A)

Dette corrigée sur l'en-tête : les **3 statuts/booléens qui se chevauchent** (`validated`/`status`/`reception_validated`/`integration_status`/`mode_reception`) sont remplacés par **un seul cycle** : `reception_method` (text contraint) + `status` (enum `correspondence_form_status`). On supprime `validated`, `validated_by`, `validated_at` (l'horodatage de validation passe par `status`+`updated_at`+`recorded_by`), `reception_validated`, `integration_status`, `mode_reception`, `total_tantiemes` (dérivable).

**`ag_correspondence_votes`** (en-tête, 1 par couple ag×copropriétaire) :

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() | |
| ag_id | uuid | NO | | FK ag_meetings ON DELETE CASCADE |
| copro_id | uuid | NO | | FK copros ON DELETE CASCADE |
| coproprietaire_id | uuid | NO | | FK coproprietaires |
| form_document_id | uuid | YES | | FK documents ON DELETE SET NULL (formulaire reçu) |
| reception_method | text | YES | 'postal' | CHECK ∈ (postal, email, hand_delivery) |
| received_at | timestamptz | YES | | |
| status | correspondence_form_status | NO | 'pending' | pending → validated → integrated (enum cible) |
| integrated_at | timestamptz | YES | | |
| notes | text | YES | | |
| recorded_by | uuid | YES | | FK profiles ON DELETE SET NULL |
| created_at / updated_at | timestamptz | NO | now() | |

- **UNIQUE** `(ag_id, coproprietaire_id)`. **Trigger** `set_updated_at` (table n'avait pas d'`updated_at` en live → **ajouté**), `enforce_copro_consistency`. **RLS ON** (était OFF — incohérent avec details ON).

**`ag_correspondence_vote_details`** (1 ligne par résolution) — inchangée, saine :

| colonne | type | null | note |
|---|---|---|---|
| id | uuid PK | NO | |
| correspondence_form_id | uuid | NO | FK ag_correspondence_votes ON DELETE CASCADE |
| resolution_id | uuid | NO | FK ag_resolutions ON DELETE CASCADE |
| copro_id | uuid | NO | FK copros ON DELETE CASCADE |
| coproprietaire_id | uuid | NO | FK coproprietaires |
| vote | vote_choice | NO | enum unifié |
| integrated_vote_id | uuid | YES | FK ag_votes (réinjection dans le dépouillement) |
| integrated_at | timestamptz | YES | |
| recorded_at | timestamptz | NO | default now() |
| recorded_by | uuid | YES | FK profiles |

- **UNIQUE** `(correspondence_form_id, resolution_id)`.

### 1.6 `ag_pending_actions` — PIVOT auto-population canonique (CONSERVÉ tel quel)

Table charnière de la chaîne `prepare → activate`. Structure saine, on **durcit** seulement le CHECK `target_table` et le `status`.

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid PK | NO | gen_random_uuid() | |
| ag_id | uuid | NO | | FK ag_meetings ON DELETE CASCADE |
| resolution_id | uuid | NO | | FK ag_resolutions ON DELETE CASCADE |
| action_type | ag_action_type | NO | | enum cible (était text) |
| target_table | text | NO | | CHECK ∈ (budgets, call_for_funds, council_members, accounting_periods, copros, contracts) — **liste blanche alignée sur les cibles RÉELLES de `prepare_ag_decisions` (live), plus de tables inexistantes** |
| target_id | uuid | YES | | |
| payload | jsonb | NO | '{}' | |
| status | text | NO | 'pending' | CHECK ∈ (pending, activated, failed) |
| error_message | text | YES | | |
| activated_at | timestamptz | YES | | |
| result_data | jsonb | YES | | |
| created_at | timestamptz | NO | now() | |

- **UNIQUE** `(ag_id, resolution_id)` → garantit l'idempotence de l'auto-population.

### 1.7 `ag_session_drafts` — brouillons UI du wizard (CONSERVÉ)

État applicatif transitoire (pas métier), purgé à la clôture. Structure inchangée. `draft_type` = enum `ag_draft_type`.

| colonne | type | null | note |
|---|---|---|---|
| id uuid PK / ag_id / copro_id / user_id | uuid | NO | FK ag_meetings, copros, profiles (toutes ON DELETE CASCADE) |
| draft_type | ag_draft_type | NO | |
| draft_data | jsonb | NO | default '{}' |
| version | integer | NO | default 1 |
| last_modified_at / created_at | timestamptz | NO | |

- **UNIQUE** `(ag_id, user_id, draft_type)`.

### 1.8 `ag_envoi_tracking` — suivi d'expédition convocation/PV (CONSERVÉ — messagerie LÉGALE)

C'est le canal d'envoi **réellement peuplé** (18 lignes) et câblé front/edge. Il **remplace** l'îlot fantôme `ag_notifications` + `ag_notification_events` + `ag_milestones` (cf. §6 arbitrage). On normalise `method`/`status` en enums cibles.

> ⚠️ **Dépendance bloquante sur `ag_milestones` (jalons wizard).** La fonction **conservée** `get_ag_wizard_state` lit encore `ag_milestones` (confirmé live). `ag_milestones` ne peut donc PAS être droppée mécaniquement : il faut d'abord **réécrire `get_ag_wizard_state`** pour lire les jalons depuis `ag_session_drafts`/`step_data` (cf. §5 RÉÉCRIRE). **Ordre imposé : réécrire la fonction → PUIS drop `ag_milestones`.** Idem pour `get/save_ag_milestone` (migrés vers `step_data`, cf. §7 arbitrage 2).
>
> 🔗 **Structure transitoire (`ag_notifications` + `ag_notification_events` + `ag_milestones`) — spec de survie complète + fenêtre transitoire consolidées au §6.2 de CE fichier** (ACL/RLS détaillées : AUTORISATION §5.2.1). Bien que le présent §1.8 (et §6, §7-2) marque ces tables « DROP séquencé », elles **survivent volontairement jusqu'à l'étape 3** de la séquence (refacto edge `email_webhook` vers `ag_envoi_tracking` + réécriture de `get_ag_wizard_state`, cf. §5). **NE PAS droper avant l'étape 3** : un drop prématuré d'`ag_milestones` casserait `get_ag_wizard_state` (qui la LIT, vérifié live) malgré la note d'ordre ci-dessus. La date de péremption (étape 3) et les conditions de survie font foi au §6.2.

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id uuid PK | NO | | |
| ag_id | uuid | NO | FK ag_meetings ON DELETE CASCADE |
| coproprietaire_id | uuid | YES | FK coproprietaires ON DELETE SET NULL (nullable OBLIGATOIRE : NOT NULL + SET NULL = contradiction, corrigé 2026-06-05) |
| method | notification_channel | NO | | enum cible (ex-CHECK text RECOMMANDE/…) cf. §2 |
| status | delivery_status | NO | 'queued' | enum unifié (cf. §2) |
| tracking_ref | text | YES | | n° AR/LRE |
| document_id | uuid | YES | FK documents ON DELETE SET NULL |
| error_message | text | YES | | |
| sent_at / delivered_at | timestamptz | YES | | |
| created_at / updated_at | timestamptz | YES | now() | |

### 1.9 Conseil syndical — `council_members` / `council_decisions` / `council_votes` / `council_documents`

Cœur sain (majorité simple propre). Dette principale corrigée : **les liaisons AG de `council_decisions` n'ont PAS de FK en live** (`linked_ag_id`/`linked_resolution_id` sont des uuid nus) → on **ajoute les FK** + on ajoute `copro_id` cohérence.

**`council_members`** :

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id uuid PK | NO | | |
| copro_id | uuid | NO | FK copros ON DELETE CASCADE |
| user_id | uuid | YES | FK profiles ON DELETE SET NULL |
| coproprietaire_id | uuid | YES | FK coproprietaires ON DELETE SET NULL |
| role | council_role | NO | 'member' | president/secretary/treasurer/member/observer |
| start_date | date | NO | CURRENT_DATE | |
| end_date | date | YES | | NULL = mandat en cours |
| is_active | boolean | NO | true | |
| created_at / updated_at | timestamptz | NO | now() | |

- **CHECK** `ck_council_member_identity` : `user_id IS NOT NULL OR coproprietaire_id IS NOT NULL` (identité souple). **UNIQUE** `(copro_id, coproprietaire_id, start_date)`. **Index partiel** `(copro_id) WHERE is_active` (lecture du conseil courant).

**`council_decisions`** :

| colonne | type | null | défaut | note |
|---|---|---|---|---|
| id uuid PK | NO | | |
| copro_id | uuid | NO | FK copros ON DELETE CASCADE |
| title | text | NO | | |
| description | text | YES | | |
| status | council_decision_status | NO | 'draft' | draft→submitted→approved/rejected→archived |
| created_by | uuid | NO | FK profiles ON DELETE RESTRICT |
| submitted_at / submitted_by | ts / uuid | YES | FK profiles |
| decided_at / decided_by | ts / uuid | YES | FK profiles |
| linked_ag_id | uuid | YES | **FK ag_meetings(id) ON DELETE SET NULL — AJOUTÉE** |
| linked_resolution_id | uuid | YES | **FK ag_resolutions(id) ON DELETE SET NULL — AJOUTÉE** |
| rejection_reason | text | YES | | |
| created_at / updated_at | timestamptz | NO | now() | |

**`council_votes`** (majorité simple) :

| colonne | type | null | note |
|---|---|---|---|
| id uuid PK | NO | |
| copro_id | uuid | NO | FK copros ON DELETE CASCADE |
| decision_id | uuid | NO | FK council_decisions ON DELETE CASCADE |
| council_member_id | uuid | NO | FK council_members ON DELETE CASCADE |
| vote | vote_choice | NO | enum unifié (ex-`council_vote_choice`, fusionné — for/against/abstention identiques) |
| comment | text | YES | |
| voted_at | timestamptz | NO | default now() |

- **UNIQUE** `(decision_id, council_member_id)`.

**`council_documents`** (GED conseil — vide mais câblée front+edge, **GARDÉE en faux-mort câblé**) :

> 🔀 **Arbitrage de propriété croisée — `council_documents` (04 ↔ 06) — TRANCHÉ.** La table est **revendiquée GARDÉE par 04** (ce §1.9) et **absorbée/DROP par 06** (`document_relations` + `confidentiality='council'`, 06 §1/§7-2). Règle : une table revendiquée par 2 domaines doit être arbitrée explicitement. **Décision : 04 reste propriétaire et la CONSERVE en faux-mort câblé**, parce qu'elle est réellement branchée (`useConseilSyndicalPage`, `lib/council/api`, edge `council-workflow` l.407 — T3 §B). On NE la droppe PAS mécaniquement. Le chemin d'absorption proposé par 06 reste la **cible visée**, mais conditionné à un **rebranchement front/edge prouvé** (les écrans conseil lisent `document_relations(entity_type='council')` + `confidentiality='council'` au lieu de `council_documents`) ; **tant que ce rebranchement n'est pas prouvé iso-comportement, la table vit dans le domaine 04**. 06 §7-2 est aligné sur cette décision (option « différer » retenue, pas « absorber maintenant »).

| colonne | type | null | note |
|---|---|---|---|
| id uuid PK | NO | |
| copro_id | uuid | NO | FK copros ON DELETE CASCADE |
| document_id | uuid | NO | FK documents ON DELETE CASCADE |
| visibility | content_visibility | NO | default 'council_only' |
| linked_type | council_doc_link_type | YES | contract/service_order/ag/invoice/budget/other |
| linked_id | uuid | YES | (polymorphe, pas de FK) |
| label / notes | text | YES | |
| created_by | uuid | NO | FK profiles ON DELETE RESTRICT |
| created_at | timestamptz | NO | default now() |

- **UNIQUE** `(copro_id, document_id)`.

---

## 2. ENUMS (catalogue rationalisé — référence, pas de redéfinition)

Le domaine consomme les enums cibles suivants (noms tels que tranchés dans le catalogue rationalisé T2 §1.2) :

| enum cible | rôle | changement vs live |
|---|---|---|
| `ag_meeting_type` | ordinary/extraordinary/mixed | inchangé |
| `ag_status` | 10 valeurs : `draft`, `convoked`, `in_progress`, `session_active`, `closed`, `pv_generated`, `pv_signed`, `pv_sent`, `finalized`, `archived` | **les 9 valeurs live conservées + `archived` AJOUTÉ** (manquait, faisait échouer `archive_ag`) — aucun remap des 9 existantes (liste alignée sur ENUMS.md §1.6, source unique) |
| `ag_draft_type` | types de brouillon wizard | inchangé |
| `attendance_type` | present/proxy/correspondence | inchangé |
| `majority_type` | art24/25/25_1/26/26_1/unanimity | inchangé (cœur sain) |
| `resolution_type` | budget/accounts/works/… | inchangé |
| `resolution_status` | draft→…→approved/rejected | inchangé |
| **`ag_action_type`** | **NOUVEL enum** : CREATE_BUDGET, APPROVE_ACCOUNTS, SCHEDULE_BUDGET_PAYMENTS, CREATE_ALUR_FUND, SCHEDULE_ALUR_PAYMENTS, CREATE_WORK_BUDGET, CREATE_EXCEPTIONAL_CALL, ELECT_COUNCIL, APPOINT_SYNDIC, MANAGE_CONTRACT, GRANT_QUITUS, DESIGNATE_BUREAU | remplace le `text` libre de `ag_resolutions.action_type` + `ag_pending_actions.action_type` |
| **`vote_choice`** | for/against/abstention | **FUSION** de `vote_direction` + `council_vote_choice` (identiques) — confirmé : les deux = {for,against,abstention} |
| `vote_source` | live/correspondence | inchangé |
| **`correspondence_form_status`** | pending/validated/integrated | **NOUVEL enum** : remplace les 5 statuts qui se chevauchaient sur l'en-tête correspondance |
| `notification_channel` | email/registered_email/postal/registered_postal/hand_delivery | remplace le CHECK text de `ag_envoi_tracking.method` |
| `delivery_status` | queued/sent/delivered/…/failed | enum unifié (fusion `delivery_status`/`mail_delivery_status`, cf. T2) pour `ag_envoi_tracking.status` |
| `council_role` | president/secretary/treasurer/member/observer | inchangé |
| `council_decision_status` | draft/submitted/approved/rejected/archived | inchangé |
| `council_doc_link_type` | contract/service_order/ag/invoice/budget/other | inchangé |
| `content_visibility` | all_members/council_only/managers_only | inchangé |

> Enums **abandonnés** dans le domaine : `council_vote_choice` (fusionné dans `vote_choice`), `ag_notification_type` + `mail_delivery_status` (île notifications fantôme droppée). `vote_direction` reste nommé `vote_choice` après fusion (un seul type pour AG + conseil).

---

## 3. RLS — politique par table (3 rôles + bypass service_role)

**Modèle** : RLS `ENABLE` + `FORCE` sur **toutes** les tables du domaine (gap n°1 du verdict : 12/17 avaient `relrowsecurity=false`). Rôles applicatifs : **platform_admin** (équipe CoProFlex, transverse, hors cabinet) / **gestionnaire** (de cabinet) / **copropriétaire** / **anon**. `service_role` **bypasse** la RLS (clé serveur, ON prod / OFF dev via le toggle `_rls_state_snapshot`, hors schéma métier).

> **Couche tenance cabinet (MULTI-CABINET) — centralisée dans les helpers.** Le cloisonnement par cabinet (`copros.cabinet_id` FK NOT NULL → `cabinets`) est porté **uniquement** par les helpers d'autorisation : `user_is_copro_manager`/`user_has_copro_access` n'accordent l'accès à une copro que si elle appartient au cabinet du gestionnaire (un `platform_admin` est transverse, tous cabinets). Les policies de domaine ci-dessous appellent ces helpers et **n'ont donc PAS à filtrer le cabinet** — aucune colonne `cabinet_id` n'est ajoutée aux tables AG/conseil (toutes rattachées via `copro_id`). Conséquence : la grille de policies reste inchangée, seul le périmètre des helpers évolue.

**Helpers de garde** (T1 §G, SECURITY DEFINER, conservés) :
- `user_is_copro_manager(copro_id)` → rôle gestionnaire.
- `user_has_copro_access(copro_id)` → membre de la copro (gestionnaire OU copropriétaire).
- `user_owns_any_lot_in_copro(copro_id)` → copropriétaire de la copro.
- `is_council_member(copro_id, user_id)` → **source UNIQUE du rôle conseil** (lit `council_members`). On **abandonne** `user_is_council_member` (lisait `memberships.role` — divergence tranchée, cf. §5).

**Plan de câblage `user_id`** : aujourd'hui `coproprietaires.user_id` est NULL → les policies copropriétaire ne renvoient rien (sécurité par défaut = fermé, acceptable). Le câblage se fait à l'onboarding portail (lier `auth.users` ↔ `coproprietaires.user_id`) ; les policies ci-dessous sont écrites pour fonctionner **dès que** ce lien existe, sans rework.

| table | gestionnaire | copropriétaire | anon | garde |
|---|---|---|---|---|
| `ag_meetings` | ALL si `user_is_copro_manager(copro_id)` | SELECT si `user_has_copro_access(copro_id)` AND `status <> 'draft'` | aucune | manager+access |
| `ag_resolutions` | ALL (manager) | SELECT (access, via AG publiée) | aucune | manager+access |
| `ag_votes` | ALL (manager) | SELECT de SES propres votes (`coproprietaire_id` lié à `auth.uid` via user_id) | aucune | manager + owner-self |
| `ag_attendance` | ALL (manager) | SELECT de SA ligne | aucune | manager + owner-self |
| `ag_correspondence_votes`(+details) | ALL (manager) | SELECT/INSERT de SON formulaire (portail vote correspondance) | aucune | manager + owner-self |
| `ag_pending_actions` | ALL (manager) | aucune (interne auto-population) | aucune | manager only |
| `ag_session_drafts` | ALL (manager) | aucune (UI gestionnaire) | aucune | owner du draft + manager |
| `ag_envoi_tracking` | ALL (manager) | SELECT de SES envois | aucune | manager + owner-self |
| `council_members` | ALL (manager) | SELECT (access — annuaire conseil visible) | aucune | manager+access |
| `council_decisions` | ALL (manager) | SELECT si `is_council_member(copro_id, auth.uid)` (visibilité conseil) | aucune | manager + council_member |
| `council_votes` | ALL (manager) | INSERT/SELECT si membre actif du conseil (`is_council_member`) | aucune | manager + council_member |
| `council_documents` | ALL (manager) | SELECT selon `visibility` (`can_view_content`) | aucune | manager + visibility |

> Règle transverse : **mutations / état daté = gestionnaire uniquement, jamais anon** (décision USER) — ne concerne pas directement ce domaine mais les helpers partagés respectent ce principe.

---

## 4. TRIGGERS conservés / ajoutés

| trigger | table | événement | rôle | statut |
|---|---|---|---|---|
| `set_updated_at` (générique unique) | toutes les tables à `updated_at` | BEFORE U | horodatage | **CONSOLIDÉ** (remplace `trg_ag_updated_at`, `update_ag_pouvoirs_updated_at`, les 2 doublons sur ag_pouvoirs, etc.) |
| `trg_ag_attendance_tantiemes` | ag_attendance | BEFORE I/U OF lot_ids | recalcule `tantiemes` depuis lot_ids (source unique des tantièmes présents) | GARDÉ |
| `trg_ag_vote_requires_attendance` (ex-`trg_ag_vote_check_duplicate`) | ag_votes | BEFORE I | rejette le vote si le copro n'est pas dans `ag_attendance` | GARDÉ (renommé) |
| `trg_ag_close_clear_drafts` | ag_meetings | AFTER U OF status | purge `ag_session_drafts` à la clôture | GARDÉ |
| **`enforce_copro_consistency`** | ag_resolutions, ag_votes, ag_attendance, ag_correspondence_*, council_* | BEFORE I/U | **NOUVEAU** : vérifie `copro_id` = celui du parent (ag/decision) ; comble l'absence de garde de cohérence copro multi-tables | AJOUTÉ |
| `trg_council_decision_majority` | (calcul applicatif, pas trigger) | — | la majorité simple reste calculée par `compute_decision_result` (pas de dénormalisation, cf. leçon ag_resolutions) | — |

> Supprimés : le 2e trigger updated_at de `ag_pouvoirs` (table abandonnée), `trg_notification_event_status` (île notifications droppée).

---

## 5. FONCTIONS du domaine — GARDER / RÉÉCRIRE / ABANDONNER

Cohérent avec T1 §C/D/E/F. Garde proposée selon convention T1 (G-MGR, G-DEF-RO, G-INTERNAL, G-SVC).

### GARDER (chaîne canonique GL — durcir gardes)
| fonction | disposition | garde |
|---|---|---|
| `calculate_resolution_result(resolution_id)` | GARDER (fige status, sans plus écrire les 8 compteurs supprimés → écrit seulement status/voted_at/threshold) | G-MGR |
| `prepare_ag_decisions(ag_id)` | **RÉÉCRIRE** (étape 1) — aligner les `target_table` émis sur la liste blanche §1.6 élargie + retirer le pivot `DESIGNATE_BUREAU` (cf. note ci-dessous) | G-MGR |
| `activate_ag_decisions(ag_id)` | GARDER (étape 2, dispatch) | G-MGR |
| `generate_calls_from_ag_payload(...)` | GARDER (étape 3 → post_budget_call_for_funds) | G-MGR |
| `finalize_and_activate_ag(ag_id, activate)` | GARDER (orchestrateur, point d'entrée unique) | G-MGR |

> ⚠️ **Note CHECK `target_table` cible — `prepare_ag_decisions` RÉÉCRITE pour cohérence avec le CHECK §1.6 (sinon il casse en PRODUCTION, pas qu'à la reprise).** `prepare_ag_decisions` est la fonction qui **ÉCRIT** `ag_pending_actions`. La version live (confirmée 2026-06-04) émet DÉJÀ correctement `ELECT_COUNCIL → council_members` (le ciblage `coproprietaires` est un artefact d'un bespoke historique, pas de cette fonction — cf. §6.1, reprise). En revanche elle émet aussi `APPROVE_ACCOUNTS → accounting_periods`, `APPOINT_SYNDIC → copros`, `MANAGE_CONTRACT → contracts`, `CREATE_ALUR_FUND/GRANT_QUITUS → budgets` : des cibles **canoniques et existantes**, mais qui débordaient la liste blanche d'origine `{budgets, call_for_funds, council_members}`. Le filtrage §6.1 ne protège QUE la migration de l'immuable 11111111 ; il ne corrige PAS la production future. **Décision : aligner le CHECK §1.6 sur les cibles réelles** plutôt que mutiler la fonction.
>
> **Spec cible de `prepare_ag_decisions` (RÉÉCRIRE)** — émettre exactement ces `target_table`, tous présents dans la liste blanche §1.6 :
> - **`ELECT_COUNCIL` → `council_members`** (déjà correct en live ; c'est la cible de la chaîne `ELECT_COUNCIL → council_members` du §0).
> - **`CREATE_BUDGET`/`CREATE_WORK_BUDGET`/`CREATE_ALUR_FUND`/`GRANT_QUITUS` → `budgets`**.
> - **`SCHEDULE_*`/`CREATE_EXCEPTIONAL_CALL`/`SCHEDULE_ALUR_PAYMENTS` → `call_for_funds`** (plus jamais `appels_fonds`, table inexistante en cible).
> - **`APPROVE_ACCOUNTS` → `accounting_periods`** (la période N visée, résolue à `prepare`, consommée par `activate` pour clôture/affectation 110/120).
> - **`APPOINT_SYNDIC` → `copros`** ; **`MANAGE_CONTRACT` → `contracts`**.
> - **`DESIGNATE_BUREAU` → NE PLUS émettre de pivot** (`NULL` en live, effet purement informatif sur le bureau dénormalisé `ag_meetings.*_name`).
> - **Interdiction absolue** : ne JAMAIS émettre `ag_resolutions`, `syndics`, `coproprietaires`, `appels_fonds` (legacy/inexistants). Tout nouveau besoin de cible passe d'abord par un élargissement explicite de la liste blanche §1.6.

### GARDER (gouvernance / vote / session / correspondance / envoi)
`compute_ag_quorum` (G-DEF-RO), `compute_majority_threshold` IMMUTABLE (G-INTERNAL), `create_ag_with_standard_resolutions` (G-MGR), `start_ag`/`close_ag`/`rpc_finalize_ag_session` (G-MGR), `archive_ag` (G-MGR — **fonctionne enfin** une fois `archived` dans l'enum), `get_ag_live_results`/`check_convocation_delay`/`validate_ag_variables` (G-DEF-RO), wizard `save_ag_wizard_state`/`complete_ag_wizard_step`/drafts (G-MGR) — ⚠️ **`get_ag_wizard_state` passe en RÉÉCRIRE** (lit `ag_milestones`, table DROP — cf. ci-dessous), pouvoirs **fusionnés dans attendance** (save/get/delete_ag_pouvoir → remplacés par les RPC attendance), correspondance `register_correspondence_*`/`get/save_votes_correspondance`/`get_correspondence_eligible_owners` (G-MGR/G-DEF-RO), envoi `save/get_ag_envoi_tracking`/`save/get_ag_envoi_choices` (G-MGR), bundles `rpc_get_ag_convocation_bundle`/`rpc_get_ag_pv_bundle`/`rpc_get_ag_coproprietaires` (G-DEF-RO/G-MGR).

### RÉÉCRIRE
| fonction | raison |
|---|---|
| `cast_vote(...)` | bug connu (mémoire `cast_vote bugué`) ; réécrire avec garde attendance + UNIQUE unique. G-MGR (séance). |
| `compute_decision_result(decision_id)` | forcer la **majorité simple** (for>against, quorum = moitié des membres actifs), distincte des art.24/25/26. G-OWNER (membre CS). |
| `calculate_resolution_result` | retirer l'écriture des 8 compteurs dénormalisés supprimés (cf. §1.2). |
| `get_ag_wizard_state(p_ag_id)` | **PRÉ-CONDITION DROP `ag_milestones` (§1.8, §6) : retirer la dépendance `ag_milestones` AVANT tout drop de la table.** Le code live `SELECT … FROM ag_milestones WHERE ag_id = …` (confirmé live, bloc `v_milestones`) ; une fois la table droppée, la fonction conservée échouerait (« relation inexistante »). **Réécriture** : lire les jalons depuis `ag_session_drafts` (clé `draft_type='milestones'`, agrégée comme les autres drafts) — à défaut depuis `ag_meetings.step_data` (jalons franchis du wizard) — au lieu de `ag_milestones`. Mettre aussi à jour la garde d'accès (`memberships` → helper RLS cible `user_has_copro_access`). G-MGR. **Ordre de migration imposé : réécrire `get_ag_wizard_state` → PUIS `DROP ag_milestones`** (jamais l'inverse). |

### ABANDONNER (couche bespoke + helpers — décision USER verrouillée, T3 §A4/A5)
`generate_combined_calls_from_ag` (DDL runtime + budget_id NULL + 0 GL), `create_budget_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `finish_ag_session` (target_table inexistants), `get_ag_pending_actions`, `mark_ag_action_activated`, `user_is_council_member` (divergence rôle CS → `is_council_member` est la source unique). Drop **après** rebranchement front prouvé iso-comportement sur HARNESS (`lib/ag/api/finalisation.api.ts`).

### Notifications fantômes (île abandonnée)
`create_ag_notification`, `mark_notification_sent/failed`, `get_ag_recipients`, `get_ag_sending_stats` → **abandonner** si arbitrage §6 confirme le drop d'`ag_notifications`. Le canal légal reste `ag_envoi_tracking`. ⚠️ `ag_notifications`/`events` sont écrits par l'edge `email_webhook` (faux mort) → drop **après** refacto webhook vers `ag_envoi_tracking`.

> 🔗 **Annotation pour l'inventaire des fonctions (T1 §E) — `create_ag_notification` / `mark_notification_sent` / `mark_notification_failed` : GARDÉ TRANSITOIRE → DROP à l'ÉTAPE 3 (cf. AUTORISATION §5.2.1).** Ces 3 fonctions écrivent l'île `ag_notifications`/`ag_notification_events` ; elles **ne sont PAS droppées immédiatement** mais survivent tant que l'edge `email_webhook` n'a pas été refacto vers `ag_envoi_tracking`. Date de péremption visible depuis l'inventaire : **étape 3 de la séquence transitoire** (AUTORISATION §5.2.1) = refacto `email_webhook` + réécriture `get_ag_wizard_state`. Tant que cette étape n'est pas franchie, ne PAS retirer ces fonctions ni droper les tables qu'elles alimentent (§1.8).

---

## 6. CARTE DE MIGRATION — boucle d'or `22222222` + immuables `11111111`

Périmètre confirmé live (cf. cartographie §5) : copros `11111111-…` (« Les Jardins d'Émeraude », immuable) et `22222222-…` (« Le Clos Saint-Michel », boucle d'or). Tout autre `copro_id` = test jetable, **non repris**.

| Table source | → cible | Transformation à la migration | Ne PAS reprendre |
|---|---|---|---|
| `ag_meetings` (11111111:10, 22222222:3) | `ag_meetings` | copie 1:1 ; `max_step_reached` borné à 9 si =8 ; **`status` cast 1:1 sur les 9 valeurs live (toutes conservées dans l'enum cible, aucun remap), `archived` simplement ajouté à l'enum** | — |
| `ag_resolutions` (11111111:46, 22222222:2) | `ag_resolutions` | **drop des 8 colonnes compteurs + vote_details** ; `action_type` text → cast `ag_action_type` (valeurs déjà conformes) | tantiemes_*/voters_*/is_approved/vote_details (recalculés par vue) |
| `ag_votes` (11111111:105, 22222222:10) | `ag_votes` | copie 1:1 ; **`tantiemes` historiques conservés** (ne pas recalculer depuis les lots actuels) ; `vote` cast `vote_direction`→`vote_choice` (même labels) | 2e contrainte UNIQUE (fusion) |
| `ag_attendance` | `ag_attendance` | copie ; `tantiemes` historiques conservés ; champs `proxy_*` de `ag_pouvoirs` rapatriés **si** ligne pouvoir existait (ici 0 → rien) | — |
| `ag_correspondence_votes`(+details) | idem | en-tête : mapper `validated/status/reception_validated/integration_status` → `status` (`integrated`>`validated`>`pending`) ; `mode_reception`→`reception_method` | validated_by/at, total_tantiemes |
| `ag_pending_actions` (11111111 immuable : **13 lignes** confirmées live) | `ag_pending_actions` | **copie FILTRÉE, NE PAS ré-exécuter `activate`** (état figé, immuabilité GL). **Règle de filtrage OBLIGATOIRE** (cf. §6.1) : n'insérer QUE les lignes dont `target_table ∈ {budgets, call_for_funds, council_members}` → **3 lignes reprises** (budgets:2, call_for_funds:1). Les autres violeraient le nouveau CHECK §1.6. | **10 lignes legacy écartées + loguées** : `ag_resolutions` (5), `appels_fonds` (3), `coproprietaires` (1), `syndics` (1) — artefacts du bespoke abandonné |
| `council_members` (11111111:4) | `council_members` | copie 1:1 | — |
| `council_decisions` (11111111:2) | `council_decisions` | copie ; `linked_ag_id`/`linked_resolution_id` deviennent de vraies FK (vérifier intégrité référentielle, sinon SET NULL) | liens orphelins → NULL |
| `council_votes` (11111111:2) | `council_votes` | copie ; `vote` → `vote_choice` ; **ajouter `copro_id`** (dérivé de la décision parent) | — |
| `ag_pouvoirs` (0) | — | **ABANDONNÉE** (fusion attendance) ; 0 ligne sur les 2 copros → aucune perte | toute la table |
| `ag_milestones`/`ag_notifications`/`ag_notification_events` (0) | — | non reprises (île fantôme). ⚠️ **`ag_milestones` : drop SÉQUENCÉ uniquement** — réécrire d'abord `get_ag_wizard_state` (lecture jalons → `ag_session_drafts`/`step_data`, cf. §5) avant `DROP`, sinon la fonction conservée casse | toutes |
| `council_documents` (0) | `council_documents` | structure reprise (câblée front/edge), 0 ligne | — |

**Dette legacy NON reprise** : compteurs dénormalisés, statuts de correspondance redondants, table `ag_pouvoirs`, île notifications, doublons d'index/contraintes, valeurs de status hors enum.

### 6.1 Filtrage de `ag_pending_actions` à la reprise (immuable 11111111)

**Problème tranché** : le nouveau CHECK `target_table ∈ {budgets, call_for_funds, council_members}` (§1.6) rejetterait à l'insertion certaines lignes `pending` héritées du bespoke abandonné (`finish_ag_session`, `elect_council_from_ag`, `create_alur_fund_from_ag`, `appoint_syndic`) qui pointaient des tables hors canonique. On ne peut donc PAS copier la table 1:1.

**État réel confirmé (live `iyfesbjnkpynmwlsmxnp`, 2026-06-04)** — copro `11111111-aaaa-bbbb-cccc-111111111111` (UUID réel, PAS la forme `11111111-1111-…`), **13 lignes** `ag_pending_actions` :

| target_table | n | repris ? | raison |
|---|---|---|---|
| `budgets` | 2 | ✅ OUI | canonique (CREATE_BUDGET) |
| `call_for_funds` | 1 | ✅ OUI | canonique (SCHEDULE_BUDGET_PAYMENTS) |
| `ag_resolutions` | 5 | ❌ NON | legacy (APPROVE_ACCOUNTS, DESIGNATE_BUREAU×3, GRANT_QUITUS) — table cible non autorisée |
| `appels_fonds` | 3 | ❌ NON | table inexistante en cible (CREATE_ALUR_FUND, SCHEDULE_ALUR_PAYMENTS, SCHEDULE_BUDGET_PAYMENTS) |
| `coproprietaires` | 1 | ❌ NON | ELECT_COUNCIL mal ciblé (devrait être `council_members`) |
| `syndics` | 1 | ❌ NON | APPOINT_SYNDIC, table hors périmètre canonique |
| **Total** | **13** | **3 repris / 10 écartés** | |

> Note : **aucune** ligne ne pointe déjà `council_members` (l'ELECT_COUNCIL historique du bespoke visait `coproprietaires`). La valeur `council_members` reste dans le CHECK pour l'auto-population CIBLE (chaîne `ELECT_COUNCIL → council_members`, désormais émise par `prepare_ag_decisions` réécrite), même si la reprise legacy n'en produit aucune.

### 6.2 Île notifications AG — FENÊTRE TRANSITOIRE (consolidée ici, DROP séquencé)

> Spec de survie auto-portée dans CE fichier (et non éclatée sur AUTORISATION) : ces 3 tables et leurs 3 fonctions **n'entrent PAS dans le schéma cible définitif** mais survivent jusqu'à l'étape 3 pour ne pas casser l'edge `email_webhook` (faux mort) et `useAGDelais`. AUTORISATION §5.2.1 (ACL/RLS détaillées) reste la référence ACL ; les conditions de survie et l'ordre de DROP ci-dessous font foi côté domaine 04.

**Pourquoi transitoire** : `create_ag_notification`, `mark_notification_sent`, `mark_notification_failed` sont GARDÉES (INVENTAIRE-FONCTIONS) ; règle « aucune fonction conservée sans table cible » ⇒ leurs tables doivent vivre tant que le rebranchement n'est pas prouvé. Le canal légal cible reste `ag_envoi_tracking` (§1.8).

**Séquence de DROP (impérative, jamais l'inverse)** :
1. **État transitoire** : `ag_notifications` + `ag_notification_events` ÉCRITES par l'edge `email_webhook` ; `ag_milestones` LUE par `useAGDelais` / `get_ag_wizard_state`. Les 3 tables vivent avec RLS ON (ENABLE prod / DISABLE dev), gestionnaire ALL via `user_is_copro_manager(copro_id)`.
2. **Pré-condition** : rebrancher `email_webhook` → `ag_envoi_tracking` ET `get_ag_wizard_state` / `get/save_ag_milestone` → `ag_session_drafts`/`step_data` (cf. §5 RÉÉCRIRE), prouvé iso-comportement sur HARNESS.
3. **Étape 3 (même lot)** : `DROP TABLE ag_notifications, ag_notification_events, ag_milestones` **+** `DROP FUNCTION create_ag_notification, mark_notification_sent, mark_notification_failed`. Le foyer transitoire disparaît alors entièrement.

**Schéma minimal de survie** (réduit au strict nécessaire pour que l'edge et `useAGDelais` n'échouent pas) :

| Table transitoire | Colonnes minimales | Écrit / lu par |
|---|---|---|
| `ag_notifications` | `id uuid PK`, `ag_id uuid FK→ag_meetings ON DELETE CASCADE`, `copro_id uuid FK→copros ON DELETE CASCADE`, `coproprietaire_id uuid FK→coproprietaires ON DELETE SET NULL`, `channel notification_channel`, `status delivery_status NOT NULL default 'queued'`, `provider_ref text`, `error_message text`, `sent_at/created_at timestamptz` | `create_ag_notification` (G-MGR) + `mark_notification_*` (G-SVC) ; edge `email_webhook` |
| `ag_notification_events` | `id uuid PK`, `notification_id uuid FK→ag_notifications ON DELETE CASCADE`, `copro_id uuid` (dénormalisé, cohérence via trigger), `event_type text`, `payload jsonb default '{}'`, `occurred_at/created_at timestamptz` | `mark_notification_sent/failed` + callback webhook (G-SVC) |
| `ag_milestones` | `id uuid PK`, `ag_id uuid FK→ag_meetings ON DELETE CASCADE`, `copro_id uuid FK→copros ON DELETE CASCADE`, `milestone_key text`, `due_date date`, `done boolean default false`, `created_at/updated_at timestamptz` | **lu** par `useAGDelais` / `get_ag_milestone` / `get_ag_wizard_state` ; écrit par `save_ag_milestone` (G-MGR) |

> ⚠️ `ag_milestones` est LUE par `get_ag_wizard_state` (vérifié live) : son DROP est **conditionné** à la réécriture préalable de cette fonction (§5). Ordre : réécrire `get_ag_wizard_state` → puis DROP. Un drop prématuré casserait la fonction conservée (« relation inexistante »).

**Règle de migration (déterministe)** : insérer uniquement les lignes satisfaisant le prédicat ci-dessous ; **écarter et LOGUER** (table d'audit de migration / NOTICE) chaque ligne rejetée — ne jamais tenter l'insert puis rattraper l'erreur du CHECK.

```sql
-- Reprise FILTRÉE de ag_pending_actions (immuable 11111111) — pas de ré-exécution d'activate
INSERT INTO ag_pending_actions (... colonnes cibles ...)
SELECT ...
FROM legacy.ag_pending_actions p
JOIN legacy.ag_meetings m ON m.id = p.ag_id
WHERE m.copro_id = '11111111-aaaa-bbbb-cccc-111111111111'
  AND p.target_table IN ('budgets','call_for_funds','council_members');  -- garde-fou CHECK §1.6
-- Les 10 lignes hors liste blanche sont loguées (target_table ∈ {ag_resolutions, appels_fonds, coproprietaires, syndics})
-- et NON migrées : ce sont des artefacts du bespoke abandonné, l'état métier final qu'elles
-- décrivaient est déjà figé dans le GL immuable (on ne re-déclenche pas activate_ag_decisions).
```

---

## 7. ARBITRAGES — TRANCHÉS (verrous USER appliqués)

1. **A10 : fusion `ag_pouvoirs` → `ag_attendance`, TRANCHÉ.** La table `ag_pouvoirs` (vide partout, double `ag_attendance.represented_by_id`) est abandonnée : `proxy_signed_at` + justificatif rapatriés sur `ag_attendance`, `save/get_ag_pouvoir` rebranchés sur les RPC attendance. Mandat unique, plus de coexistence de deux modèles.

2. **A11 : drop de l'île notifications (`ag_notifications` + `ag_notification_events` + `ag_milestones`), TRANCHÉ, séquencé.** Tables vides, mais `ag_notifications`/`events` sont écrits par l'edge `email_webhook` et `ag_milestones` lu par `useAGDelais`/RPC. Séquence verrouillée : refactorer `email_webhook` → écriture dans `ag_envoi_tracking`, migrer `get/save_ag_milestone` vers `step_data` du wizard (`get_ag_wizard_state`), **puis** drop. Pas de drop mécanique avant refacto front/edge.

3. **A19 : compteurs dénormalisés `ag_resolutions` supprimés, dérivés de vue, TRANCHÉ.** Le résultat se dérive de `ag_votes` via les vues `v_ag_resolution_vote_summary`/`v_ag_resolutions_results`/`v_ag_vote_stats_by_resolution` ; PDF du PV et front rebranchés sur la vue (bloc atomique fonction+vue+front). On garde `status`/`voted_at`/`threshold_*` (résultat légal figé).

4. **Source unique du rôle conseil `is_council_member`, TRANCHÉ (AUTORISATION §4).** Abandon de `user_is_council_member` (lecture `memberships.role`) au profit de `council_members` / `is_council_member` ; les policies RLS pointent toutes sur ce helper unique (cf. AUTORISATION §4 + ENUMS §1.4).

5. **A20 : `ag_votes.tantiemes` figés au vote, TRANCHÉ, pas de vote ventilé par lot.** Le vote est porté au niveau (résolution × copropriétaire) avec le poids agrégé figé au moment du vote, conforme au droit (on vote par personne avec son poids). La dimension lot reste dans `ag_attendance.lot_ids`. Aucune dimension lot fine sur le vote.
