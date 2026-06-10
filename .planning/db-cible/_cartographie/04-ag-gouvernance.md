# Cartographie domaine 04 — Assemblées générales + Conseil syndical

Live CoProFlex (Supabase `iyfesbjnkpynmwlsmxnp`), lecture seule. Date relevé : 2026-06-04.
Auteur : agent cartographe domaine AG/gouvernance.

**Périmètre** : 17 tables, 4 vues, 54+ fonctions. Auto-population CANONIQUE uniquement.

---

## 0. Vue d'ensemble & inventaire

| Table | Lignes (réel) | Cols | RLS activé | Policies | Verdict |
|---|---|---|---|---|---|
| ag_meetings | 20 | 35 | **NON** | 5 | wizard surdimensionné |
| ag_resolutions | 60 | 29 | **NON** | 3 | dénormalisé (compteurs) |
| ag_votes | 165 | 11 | **NON** | 5 | OK (doublons d'index/contrainte) |
| ag_attendance | 43 | 17 | **NON** | 3 | OK |
| ag_pouvoirs | 0 | 12 | oui | 2 | OK (vide) |
| ag_correspondence_votes | 1 | 17 | **NON** | 3 | redondant (form + détails) |
| ag_correspondence_vote_details | 14 | 11 | oui | 2 | OK |
| ag_pending_actions | 27 | 12 | oui | 1 | pivot canonique — OK |
| ag_session_drafts | 22 | 9 | **NON** | 5 | OK (état UI) |
| ag_envoi_tracking | 18 | 12 | oui | 1 | messagerie convoc — OK |
| ag_milestones | 0 | 6 | oui | 3 | jamais peuplé |
| ag_notifications | 0 | 24 | **NON** | 4 | gros, jamais peuplé |
| ag_notification_events | 0 | 8 | **NON** | 2 | jamais peuplé |
| council_members | 4 | 10 | **NON** | 4 | OK |
| council_votes | 2 | 7 | **NON** | 3 | OK (majorité simple propre) |
| council_decisions | 2 | 15 | **NON** | 4 | OK |
| council_documents | 0 | 10 | **NON** | 3 | jamais peuplé |

**Vues** : `v_ag_resolution_vote_summary`, `v_ag_resolutions_results`, `v_ag_vote_stats_by_resolution`, `v_ag_votes_detailed`.

**ALERTE TRANSVERSE RLS** : 12 des 17 tables ont des policies DÉFINIES mais `relrowsecurity=false` → **les policies ne sont PAS appliquées**. Cohérent avec la phase dev (RLS OFF volontaire), mais c'est le gap n°1 à fermer pour la prod (décision utilisateur : RLS activé partout). `relforcerowsecurity=false` partout aussi (service_role contournera, attendu).

---

## 1. STRUCTURE LIVE — par table

### ag_meetings (20 lignes) — séance d'AG (entité racine)
PK `id`. FK : `copro_id→copros` (CASCADE), `created_by/secretary_id→profiles`, `president_id/scrutineer1_id/scrutineer2_id→coproprietaires`, `pv_document_id→documents`.
Colonnes notables : `meeting_type` (ag_meeting_type), `meeting_date`, `convocation_date`, `status` (ag_status : draft→convoked→in_progress→session_active→closed→pv_generated→pv_signed→pv_sent→finalized + `archived` utilisé par `archive_ag` mais **absent de l'enum** → voir défauts), bureau (president/secretary/scrutineer × id+name), session_started/ended_at, opening/closing_notes, incidents, pv_document_id, pv_generated_at, pv_sent_at, closed_at.
Colonnes wizard : `current_step` (CHECK 1..9), `max_step_reached` (CHECK 1..8 — **incohérent** avec current_step 1..9), `step_data` jsonb, `wizard_mode` (guided|expert). `remote_meeting_url/provider`.
CHECK : current_step 1..9, max_step_reached 1..8, wizard_mode∈{guided,expert}.
Index : pkey + copro, (copro,date desc), (copro,status), date, status, partiel `has_remote`.
Triggers : `trg_ag_meetings_updated` (updated_at), `trg_ag_close_clear_drafts` (AFTER UPDATE OF status → purge ag_session_drafts).
RLS OFF, 5 policies (manager INSERT/UPDATE/DELETE/SELECT + members SELECT si status≠draft).

### ag_resolutions (60 lignes) — résolutions à voter
PK `id`. UNIQUE `(ag_id, resolution_number)`. FK : `ag_id→ag_meetings` (CASCADE), `copro_id→copros`, `linked_budget_id/linked_work_budget_id→budgets`, `bridge_vote_id→ag_resolutions` (auto-réf passerelle art.25-1/26-1).
Colonnes : `resolution_type` (resolution_type), `majority_type` (majority_type : art24/25/25_1/26/26_1/unanimity), `status` (resolution_status), **compteurs dénormalisés** `tantiemes_for/against/abstention` + `voters_for/against/abstention` + `threshold_tantiemes/voters` + `is_approved` + `vote_details` jsonb (recopie du calcul), `is_bridgeable`, `voted_at`. `variables` jsonb + `is_customized` (templating résolution), `action_type` text (clé d'auto-population : CREATE_BUDGET, APPROVE_ACCOUNTS, SCHEDULE_BUDGET_PAYMENTS, CREATE_ALUR_FUND, SCHEDULE_ALUR_PAYMENTS, CREATE_WORK_BUDGET, CREATE_EXCEPTIONAL_CALL, ELECT_COUNCIL, APPOINT_SYNDIC, MANAGE_CONTRACT, GRANT_QUITUS, DESIGNATE_BUREAU).
Index : pkey, ag (×2 doublon : `idx_ag_resolutions_ag` + `idx_ag_resolutions_ag_id`), copro, majority, status, expression `has_variables`.
Trigger : `trg_ag_resolutions_updated`.
RLS OFF, 3 policies.

### ag_votes (165 lignes) — vote nominatif (lot-pondéré)
PK `id`. **DEUX contraintes UNIQUE identiques** `(resolution_id, coproprietaire_id)` : `ag_votes_resolution_coproprietaire_unique` + `ag_votes_resolution_id_coproprietaire_id_key` (+ 2 index identiques) → doublon pur.
FK : `resolution_id→ag_resolutions` (CASCADE), `copro_id→copros`, `coproprietaire_id→coproprietaires`.
Colonnes : `vote` (vote_direction for/against/abstention), `tantiemes` (numeric — figé à la saisie depuis l'attendance), `vote_source` (live|correspondence), `is_excluded`+`exclusion_reason` (conflit d'intérêts art.24-II). 
Index doublons : resolution (×2), copro, coproprietaire, vote.
Trigger : `trg_ag_vote_check` BEFORE INSERT → `trg_ag_vote_check_duplicate()` (rejette si le copro n'est pas dans ag_attendance ; nom trompeur, ne vérifie PAS le doublon — c'est la contrainte UNIQUE qui le fait).
**Note lot-centric** : la pondération est portée par `tantiemes` au niveau (résolution × copropriétaire), PAS par lot. Conforme au vote (on vote par personne avec son poids), mais l'attendance porte `lot_ids[]` + `tantiemes` agrégés → pas de dimension lot fine dans le vote.

### ag_attendance (43 lignes) — présence/représentation/correspondance
PK `id`. UNIQUE `(ag_id, coproprietaire_id)`. FK : ag_id (CASCADE), copro_id (CASCADE), coproprietaire_id, represented_by_id→coproprietaires, proxy_document_id→documents.
Colonnes : `lot_ids` uuid[], `tantiemes` (calculé par trigger), `presence_type` (present|proxy|correspondence), `represented_by_id/name`, `proxy_document_id`, `signed`+`signed_at`+`signature_data`, `arrived_at`/`left_at` (départs en cours de séance).
Trigger : `trg_ag_attendance_tantiemes` BEFORE INSERT/UPDATE OF lot_ids → recalcule `tantiemes` depuis lot_ids ; `trg_ag_attendance_updated`.

### ag_pouvoirs (0 ligne) — mandats de représentation
PK. UNIQUE `(ag_id, mandant_id)` (un copro = un seul mandant par AG). CHECK `mandant_id <> mandataire_id`. FK mandant/mandataire→coproprietaires (CASCADE). Justificatif (filename/path/size/uploaded_at). 2 triggers updated_at REDONDANTS (`ag_pouvoirs_updated_at`→update_ag_pouvoirs_updated_at ET `trg_ag_pouvoirs_updated`→trg_ag_updated_at). RLS ON. **Vide** mais structure saine (chevauche `ag_attendance.represented_by_id` — voir doublons).

### ag_correspondence_votes (1 ligne) + ag_correspondence_vote_details (14 lignes)
Formulaire de vote par correspondance (loi 2019, art.17-1 A). `votes` = en-tête (1 par couple ag×copro), `details` = 1 ligne par résolution (UNIQUE form×resolution), `vote` vote_direction, `integrated_vote_id→ag_votes` (réinjection dans le dépouillement). `votes` a 17 cols dont beaucoup de statuts redondants : `validated`+`validated_by/at`, `status` text, `reception_validated`, `integration_status` text, `mode_reception` text → **3 booléens/statuts qui se chevauchent**. RLS : details ON, votes OFF (incohérent).

### ag_pending_actions (27 lignes) — PIVOT auto-population canonique
PK. UNIQUE `(ag_id, resolution_id)` (`ux_ag_pending_actions_ag_resolution`). CHECK status∈{pending,activated,failed}. FK ag_id+resolution_id (CASCADE). Colonnes : `action_type`, `target_table`, `target_id`, `payload` jsonb, `status`, `error_message`, `activated_at`, `result_data` jsonb. RLS ON (1 policy ALL managers). **C'est la table charnière de la chaîne canonique** prepare→activate. À CONSERVER.

### ag_session_drafts (22 lignes) — brouillons UI du wizard live
PK. UNIQUE `(ag_id, user_id, draft_type)`. `draft_type` enum ag_draft_type (11 valeurs). `draft_data` jsonb + `version`. Purgé à la clôture (trigger). État applicatif transitoire, pas métier. RLS OFF + 5 policies (owner CRUD + manager ALL).

### ag_envoi_tracking (18 lignes) — suivi d'expédition convocation/PV
PK. CHECK method∈{RECOMMANDE,LETTRE_SIMPLE,AVIS_ELECTRONIQUE,EMAIL,REMISE_MAIN_PROPRE}, status∈{queued,sent,delivered,error}. FK ag_id (CASCADE), coproprietaire_id (SET NULL). RLS ON. C'est la messagerie LÉGALE de convocation (≠ campagnes emailing de masse à dropper) → CONSERVER.

### ag_milestones (0) / ag_notifications (0) / ag_notification_events (0) — TOUS VIDES
- `ag_milestones` : jalons du wizard (UNIQUE ag×milestone_type). Jamais peuplé.
- `ag_notifications` : 24 colonnes (recipient_email/name, notification_type convocation/relance/pv/reminder, channel, delivery_status 8 valeurs, provider Resend, opened_at, error_*, metadata). Infra emailing transactionnel jamais utilisée.
- `ag_notification_events` : webhook events (delivered/opened/bounced) avec trigger `trg_notification_event_status` qui répercute sur `ag_notifications.delivery_status`. Jamais utilisé.
→ Triple couche notifications/events vs `ag_envoi_tracking` qui, lui, EST peuplé : **redondance** (voir §4).

### council_members (4) / council_votes (2) / council_decisions (2) / council_documents (0)
- **council_members** : PK, CHECK `user_id IS NOT NULL OR coproprietaire_id IS NOT NULL` (identité souple), UNIQUE `(copro_id, coproprietaire_id, start_date)`. `role` council_role (president/secretary/treasurer/member/observer), start/end_date, is_active. FK user_id→profiles, coproprietaire_id→coproprietaires. Trigger updated_at.
- **council_decisions** : statut workflow (draft→submitted→approved/rejected→archived), created_by/submitted_by/decided_by→profiles, `linked_ag_id`/`linked_resolution_id` (rattachement AG), rejection_reason. Trigger updated_at.
- **council_votes** : UNIQUE `(decision_id, council_member_id)`, vote council_vote_choice (for/against/abstention), comment. FK decision_id+council_member_id (CASCADE).
- **council_documents** : UNIQUE `(copro_id, document_id)`, `visibility` content_visibility (all_members/council_only/managers_only), `linked_type` council_doc_link_type, created_by. **Vide**.
RLS OFF sur les 4 (policies définies, dont `council_votes_insert` qui vérifie member actif).

---

## 2. CONTRAT FONCTIONNEL

### 2A. CHAÎNE CANONIQUE (POSTE le GL) — À CONSERVER
1. **`calculate_resolution_result(resolution_id)`** SEC DEFINER — lit ag_votes (non exclus), ag_attendance, compute_ag_quorum, compute_majority_threshold ; ÉCRIT les compteurs dénormalisés sur ag_resolutions + status approved/rejected. Implémente art.24/25/25-1/26/26-1/unanimité + passerelles.
2. **`prepare_ag_decisions(ag_id)`** SEC DEFINER — lit ag_resolutions approuvées avec action_type ; ÉCRIT ag_pending_actions (1 par résolution, UNIQUE) ; pour CREATE_BUDGET/WORK_BUDGET crée/relie budgets en `draft_from_ag` ; résout period_id pour APPROVE_ACCOUNTS.
3. **`activate_ag_decisions(ag_id)`** SEC DEFINER — boucle ag_pending_actions pending ; dispatch par action_type : valide budgets, APPROVE_ACCOUNTS → close_period+open_next_period+regularize_period+approve_period (ordre V4 : à-nouveau AVANT affectation), SCHEDULE_*/CREATE_EXCEPTIONAL_CALL → `generate_calls_from_ag_payload`, ELECT_COUNCIL désactive l'ancien conseil. Marque activated.
4. **`generate_calls_from_ag_payload(copro,ag,resolution,payload)`** SEC DEFINER — résout le budget source_ag_id, calcule nb d'appels (trimestriel/semestriel/annuel), boucle et appelle **`post_budget_call_for_funds(...)`** = **route GL canonique** (D450-x/lot · C701). Garde-fou : ne re-crée pas si call_for_funds existe déjà.
5. **`finalize_and_activate_ag(ag_id, activate)`** SEC DEFINER — ORCHESTRATEUR : calculate (toutes résolutions) → prepare (si pas déjà) → status='finalized' → activate. C'est le point d'entrée propre de bout en bout.

### 2B. Lecture / wizard / saisie (support, à conserver/simplifier)
`compute_ag_quorum`, `compute_majority_threshold` (IMMUTABLE, art.24/25/26 propres), `cast_vote` (live, vérifie attendance + doublon), `get_ag_live_results`, `get_ag_wizard_state`/`save_ag_wizard_state`, `complete_ag_wizard_step`, `save_ag_session_draft`/`get_ag_session_draft`/`get_ag_all_session_drafts`/`clear_ag_session_drafts`/`delete_ag_draft`, `save_ag_milestone`/`get_ag_milestones`, `save/get_ag_pouvoir(s)`/`delete_ag_pouvoir`/`update_ag_pouvoir_justificatif`, `register_correspondence_vote`/`register_correspondence_form_votes`/`get_votes_correspondance`/`save_votes_correspondance`/`get_correspondence_eligible_owners`, `create_ag_with_standard_resolutions`, `start_ag`, `validate_ag_variables`, `check_convocation_delay`, `rpc_get_ag_convocation_bundle`/`rpc_get_ag_pv_bundle`/`rpc_get_ag_coproprietaires`, `archive_ag`, `rpc_finalize_ag_session`/`finish_ag_session`.
Notifications/envoi : `create_ag_notification`, `mark_notification_sent`/`failed`, `get_ag_recipients`/`get_ag_sending_stats`, `get_ag_envoi_choices`/`save_ag_envoi_choices`/`get_ag_envoi_tracking`/`save_ag_envoi_tracking`.
Conseil : `compute_decision_result` (majorité SIMPLE propre : for>against, quorum=moitié des membres actifs), `is_council_member` (lit council_members), `is_council_president`, `user_is_council_member` (lit memberships.role !).

### 2C. COUCHE BESPOKE (ne POSTE PAS le GL) — À ABANDONNER (décision utilisateur)
- **`create_budget_from_ag(ag, exercice, postes)`** — crée budget `validated` + budget_lines en direct, marque l'action activated. Court-circuite prepare/activate, aucune écriture GL.
- **`generate_combined_calls_from_ag(ag, nb)`** — **`ALTER TABLE call_for_funds_lines DISABLE TRIGGER` à l'intérieur de la fonction** (DDL runtime !), écrit call_for_funds avec `budget_id=NULL`, répartit à la main par clé, AUCUN GL. Path bug-ridden.
- **`create_alur_fund_from_ag(ag, montant, modalites)`** — crée budget ALUR `validated` direct, pas d'écriture 450-5/105.
- **`elect_council_from_ag(ag, membres)`** — gère council_members en direct (doublonne le dispatch ELECT_COUNCIL d'activate_ag_decisions).
- **`finish_ag_session(ag)`** — 3e voie de création d'ag_pending_actions, avec `target_table` pointant des tables **inexistantes** (`appels_fonds`, `syndics`) — code mort/faux.
- **`get_ag_pending_actions`, `mark_ag_action_activated`, `get_ag_envoi_*` (doublons)** : helpers de la couche bespoke.

---

## 3. VERDICT QUALITÉ : **À REPENSER** (cœur sain, périphérie en dette)

**Raison principale** : le domaine porte DEUX implémentations parallèles et concurrentes de l'auto-population AG→état copro. La chaîne canonique (`finalize_and_activate_ag` → prepare → activate → generate_calls_from_ag_payload → post_budget_call_for_funds) est **correcte, en partie double, lot-centric et ordonnée V4**. La couche bespoke (`create_budget_from_ag`, `generate_combined_calls_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `finish_ag_session`) **écrit l'état métier sans jamais toucher le grand livre** et contient des anti-patterns graves. Tant que les deux coexistent, le modèle copie le mauvais exemple (cf. règle « finir les migrations »).

### Défauts concrets (preuves)
1. **GL contournable** : `generate_combined_calls_from_ag` désactive un trigger de validation par DDL runtime et pose `budget_id=NULL` ; aucune écriture comptable. Viole « chaque opération génère une écriture » + immuabilité.
2. **Triple chemin de pending_actions** : `prepare_ag_decisions` (canonique, target_table correct) vs `finish_ag_session` (target_table `appels_fonds`/`syndics` inexistants) → faux. À supprimer.
3. **Dénormalisation lourde sur ag_resolutions** : 9 compteurs + vote_details jsonb recopiés depuis ag_votes par `calculate_resolution_result`. Dérivable par vue (les 4 vues `v_ag_*` le font déjà). Risque de désync.
4. **Doublons d'objets** : ag_votes a 2 contraintes UNIQUE + 2 index identiques ; ag_resolutions/attendance/pouvoirs/votes ont des index `_ag` ET `_ag_id` jumeaux ; ag_pouvoirs a 2 triggers updated_at.
5. **Enum incomplet** : `archive_ag` écrit `status='archived'` mais `archived` n'est PAS dans l'enum `ag_status` → l'appel échoue en l'état (cast invalide).
6. **CHECK incohérents wizard** : current_step 1..9 mais max_step_reached 1..8.
7. **Deux notions de « membre du conseil » divergentes** : `is_council_member` (table council_members) ≠ `user_is_council_member` (memberships.role membre_cs). Les policies RLS utilisent `is_council_member` ; ambiguïté à trancher (source unique du rôle CS).
8. **Couche notifications fantôme** : ag_notifications (24 col) + ag_notification_events + ag_milestones = 0 ligne, alors qu'ag_envoi_tracking (18 lignes) couvre déjà l'envoi légal. Sur-ingénierie non utilisée.
9. **Statuts redondants** sur ag_correspondence_votes (validated/status/reception_validated/integration_status se chevauchent).
10. **RLS non appliqué** sur 12/17 tables (policies présentes, relrowsecurity=false) — gap prod.
11. **Chevauchement représentation** : ag_pouvoirs (vide) vs ag_attendance.represented_by_id/proxy_document_id (utilisé) → deux modèles du mandat.

### Ce qui est BIEN FAIT (à garder tel quel dans la cible)
- Majorités AG (`compute_majority_threshold` IMMUTABLE) : art.24/25/25-1/26/26-1/unanimité + passerelles, descriptions correctes.
- Conseil syndical en **majorité simple propre** (`compute_decision_result` : for>against, quorum = moitié membres actifs) — distinct des majorités AG. Conforme à la décision utilisateur.
- ag_pending_actions comme journal d'auto-population (idempotent via UNIQUE ag×resolution).
- FK CASCADE cohérentes, attendance avec tantièmes calculés par trigger, exclusion de vote (conflit d'intérêt) modélisée.

---

## 4. CANDIDATS MORTS / DOUBLONS (à confirmer par l'agent transverse)

**Tables jamais peuplées (0 ligne)** : `ag_milestones`, `ag_notifications`, `ag_notification_events`, `council_documents`, `ag_pouvoirs`.
→ `ag_notifications`/`ag_notification_events`/`ag_milestones` : candidats DROP (redondants avec ag_envoi_tracking, sur-ingénierie). `ag_pouvoirs` et `council_documents` : vides mais sémantiquement nécessaires (mandats, GED conseil) → CONSERVER dans la cible, à fusionner pour pouvoirs avec attendance.

**Fonctions à DROP (bespoke, ne postent pas le GL)** : `create_budget_from_ag`, `generate_combined_calls_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `finish_ag_session`, `get_ag_pending_actions`, `mark_ag_action_activated`, `archive_ag` (statut hors enum). À confirmer : usages front résiduels.

**Objets DB dupliqués à fusionner** :
- ag_votes : supprimer 1 des 2 UNIQUE `(resolution_id,coproprietaire_id)` + 1 des 2 index ; idem index `_ag`/`_ag_id` sur attendance/resolutions/pouvoirs/votes.
- ag_pouvoirs : 1 seul trigger updated_at.
- Représentation : fusionner ag_pouvoirs ↔ ag_attendance (un seul modèle de mandat).

**À trancher** : `is_council_member` vs `user_is_council_member` (source unique du rôle conseil).

---

## 5. MIGRATION — données à reprendre (copros 22222222 + 11111111 uniquement)

Décompte live :
| Table | copro 11111111 (immuable) | copro 22222222 (boucle d'or) |
|---|---|---|
| ag_meetings | 10 | 3 |
| ag_resolutions | 46 | 2 |
| ag_votes | 105 | 10 |
| council_members | 4 | 0 |
| council_decisions | 2 | 0 |
| council_votes | 2 | 0 |

À reprendre pour ces 2 copros : `ag_meetings` + enfants (`ag_resolutions`, `ag_votes`, `ag_attendance`, `ag_correspondence_vote[_details]`, `ag_pending_actions` pour tracer l'auto-population déjà activée), et pour 11111111 le conseil (`council_members`/`decisions`/`votes`). Le reste (autres copro_id : a71786d2, b87f2500, e00b8146, e1fc700e, fe96e927, 075c0249, 1feca864) = données de test jetables, **pas de migration**.

**Points de vigilance migration** :
- Recalculer les compteurs dénormalisés d'ag_resolutions plutôt que les copier (ou les rendre dérivés via vue dans la cible).
- ag_pending_actions de 11111111 doivent rester cohérents avec l'état déjà figé (immuabilité GL) — reprendre tel quel, ne pas ré-exécuter activate.
- `tantiemes` figés dans ag_votes/ag_attendance : conserver les valeurs historiques (ne pas recalculer depuis les lots actuels).
