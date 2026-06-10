# Audit de drift — fonctions SQL live vs migrations

> 2026-06-04, lecture seule. Méthode : comparaison du **corps source** (`pg_proc.prosrc`) au corps de la **dernière** migration définissant chaque fonction, après normalisation **identique des deux côtés** (retrait commentaires `/* */` et `--`, retrait des espaces, minuscules, md5). Comparaison déterministe (node), validée par 3 spot-checks.

## Résultat global (161 fonctions définies en migration)

| Catégorie | Nombre | Sens |
|---|---|---|
| ✅ **Logique identique** | 118 | migration = live (le fichier est fiable) |
| ⚠️ **Drift pur** | 25 | en live, **absentes de toute migration** (déployées à la main) |
| 🟠 **Divergence de logique** | 36 | présentes des deux côtés mais **corps ≠** (live patché sans MAJ du fichier) |
| 🪦 **Fichier mort** | 7 | dans une migration mais **droppées du live** (un replay les recréerait à tort) |

**Conclusion : les fichiers de migration ne sont PAS une source de vérité fiable.** Au total **61 fonctions** (25 + 36) sont désynchronisées : un *replay* des migrations sur une base neuve ne reproduirait **pas** le live — et certaines versions-fichier échoueraient même (ex. `compute_majority_threshold` sans ses casts de type).

## Spot-checks (preuves que la méthode est juste)

- `post_owner_payment` → **identique** (validé).
- `user_is_lot_owner_or_manager` → flaggé au début, en fait **commentaires seuls** → reclassé identique après retrait des commentaires.
- `compute_majority_threshold` → **divergent réel mais bénin** : logique des majorités identique, seuls des casts `::INT`/`::TEXT` ajoutés en live. → montre que les 36 sont un **mélange cosmétique/comportemental** à trier un par un.

## Les 25 — drift pur (à figer en Phase 1, recopie du live)

`archive_ag`, `calculate_budget_projection`, `can_access_document` (CASSÉE → drop), `compute_repartition_shares`, `create_budget_from_ag` (AG bespoke), `create_document_version`, `delete_service_order`, `elect_council_from_ag` (AG bespoke), `finish_ag_session`, `fn_annexe_1`, `fn_annexe_1_detail_copros`, `fn_annexe_3`, `fn_annexe_4`, `fn_annexe_5`, `generate_combined_calls_from_ag` (AG bespoke), `generate_etat_date_payload`, `get_ag_pending_actions` (AG bespoke), `get_period_for_date`, `get_votes_correspondance`, `mark_ag_action_activated` (AG bespoke), `save_votes_correspondance`, `start_ag`, `submit_budget`, `validate_ag_variables`, `validate_budget`.

## Les 36 — divergences de logique (à trier puis re-figer du live)

`calculate_document_expiration`, `cancel_stale_reminders`, `cast_vote`, `check_convocation_delay`, `close_ag`, `compute_ag_quorum`, `compute_majority_threshold` (bénin — casts), `create_ag_notification`, `create_ag_with_standard_resolutions`, `create_default_reminder_rules`, `create_document_system_folders`, `create_etat_date_snapshot`, `delete_ag_draft`, `enforce_lot_id_on_45x`, `generate_campaign_recipients`, `get_ag_all_session_drafts`, `get_ag_envoi_choices`, `get_ag_milestones`, `get_ag_recipients`, `get_ag_session_draft`, `open_next_period`, `post_period_cutoff`, `provision_copro_chart`, `register_correspondence_form_votes`, `register_correspondence_vote`, `reverse_period_cutoff`, `rpc_get_ag_coproprietaires`, `rpc_get_ag_pv_bundle`, `save_ag_envoi_choices`, `save_ag_milestone`, `save_ag_session_draft`, `save_ag_wizard_state`, `seed_golden_loop`, `upsert_mutation_step`, `validate_call_for_funds_total`, `validate_mutation`.

> ⚠️ `enforce_lot_id_on_45x`, `open_next_period`, `post_period_cutoff`, `reverse_period_cutoff`, `provision_copro_chart`, `seed_golden_loop`, `validate_call_for_funds_total` touchent la **finance/grand livre** → triage prioritaire (vérifier qu'aucune ne cache un changement comptable).

## Les 7 — fichiers morts (CREATE en migration, absentes du live)

`generate_ag_document_path`, `get_latest_ag_document`, `register_ag_document`, `remove_ag_milestone`, `trg_ag_documents_create_ged_entry`, `trg_documents_updated_at`, `update_forum_topic_stats`. → retirer leur `CREATE` du repo (ou ajouter un `DROP`) pour que replay == live.

## Triage des 36 divergences (review multi-agents, 2026-06-04)

Diff live vs fichier pour chacune (commentaires/espaces/casts ignorés). Résultat : **6 cosmétiques, 5 bénignes, 23 comportementales**. Mais le live n'est pas toujours la bonne version → 3 bacs.

### ✅ Finance : RAS bloquant
Les **fonctions finance récentes sont cosmétiques identiques** au fichier : `open_next_period`, `post_period_cutoff`, `reverse_period_cutoff`, `provision_copro_chart`, `enforce_lot_id_on_45x`, `seed_golden_loop`. La boucle finance n'a **pas** dérivé. Piège contre-intuitif levé : `validate_call_for_funds_total` → c'est le **LIVE qui est correct** (trigger AFTER, le fichier re-compterait NEW/OLD = fausses violations). `create_etat_date_snapshot` et `rpc_get_ag_pv_bundle` → fichier réfère des colonnes inexistantes (planterait) → **live correct**.

### 🐛 2 vraies trouvailles (au-delà de la dérive)
1. **`cast_vote` est BUGUÉ en live** : c'est une version **pré-feature « vote par correspondance »** ; le live bloque à tort les votes par correspondance hors AG en cours. **Le FICHIER est correct** → à ré-appliquer (enrichit le contrat, ne casse aucun appelant).
2. **9 régressions de sécurité en live** : des gardes d'accès (`user_has_copro_access`, `user_is_copro_manager`, `auth.uid()`) ont été **retirées** sur des fonctions `SECURITY DEFINER` → lecture inter-copro de brouillons/PII possible. Cohérent avec « RLS off en phase dev » (mémoire), mais c'est une **dette sécurité/RGPD à tracer** avant prod : `get_ag_all_session_drafts`, `get_ag_envoi_choices`, `get_ag_milestones`, `get_ag_session_draft`, `rpc_get_ag_coproprietaires`, `save_ag_envoi_choices`, `save_ag_milestone`, `save_ag_session_draft`, `save_ag_wizard_state`.

### Plan en 3 bacs

**BAC 1 — figer le live tel quel, en confiance (18)** : 6 cosmétiques + 5 bénignes + 7 comportementales où le live est clairement correct (`calculate_document_expiration`, `create_ag_with_standard_resolutions` [retour uuid, le fichier jsonb casserait l'edge], `create_etat_date_snapshot`, `get_ag_recipients`, `register_correspondence_vote` [insère les tantièmes — hotfix], `rpc_get_ag_pv_bundle`, `upsert_mutation_step`). ⚠️ pièges DDL : `close_ag` (1→2 args), `get_ag_all_session_drafts` (type OUT enum→text) = `DROP`+`CREATE`, pas `CREATE OR REPLACE`. Réinjecter `SECURITY DEFINER`/`search_path` que `pg_get_functiondef` omet parfois.

**BAC 2 — inspecter avant de figer (7)** : `generate_campaign_recipients` (figer live MAIS réintroduire la branche `custom`), `register_correspondence_form_votes` (vérifier `status` vs `integration_status` lu par `v_ag_correspondence_status`), `validate_mutation` (valider le pipeline de statuts + ancrage `p_signature_date`), `delete_ag_draft` (le **fichier** est la version aboutie ; le live est sommaire → décision produit), `close_ag` (confirmer DROP surcharge), `get_ag_session_draft`/`get_ag_all_session_drafts` (garder le retour `text`).

**BAC 3 — bug/régression à corriger AVANT de figer (1 + 9)** : `cast_vote` → ré-appliquer le fichier. Les 9 régressions sécurité → **décision** : tracer la divergence (assumer dev) OU restaurer les gardes (gratuit quand signature identique, ferme un trou PII).

## Conséquence sur la Phase 1 (figer le drift)

Le périmètre passe de « 25 fonctions » à **61 à re-synchroniser** (recopie du live) + 7 fichiers morts à nettoyer. Options d'approche à trancher :
1. **Migration de sync exhaustive** : recopier le live des 61 dans UNE migration datée (zéro comportement, base reproductible).
2. **Re-baseline par dump** : régénérer le schéma/fonctions depuis un `pg_dump --schema-only` du live comme nouvelle base de référence.
3. **Triage d'abord** : revoir les 36 diffs (séparer cosmétique vs comportemental) avant de figer, pour ne pas graver un éventuel bug.
