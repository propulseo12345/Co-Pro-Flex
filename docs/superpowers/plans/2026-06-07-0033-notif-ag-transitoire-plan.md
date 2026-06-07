# 0033 notif-ag-transitoire — Plan (cible-pure)

> Île **transitoire** (tables 0018 `ag_notifications` / `ag_notification_events` / `ag_milestones`, à DROPER à l'étape 3, jamais en Phase 0). 0033 = lot fonctions. Scoping `wf_861f5eba-682`.

**Décision d'archi (USER 2026-06-07) : CIBLE-PURE.** Les edges vivants (`ag_send_convocations`, `email_webhook`) parlent à l'ANCIEN schéma (colonnes `notification_type`/`document_id`/`error_code`/`provider_message_id`/`event_timestamp`/`raw_data`/`ip_address`/`user_agent` supprimées ou renommées par 0018). `email_webhook` fait de l'accès table direct **incompatible** avec le cible → iso-comportement impossible. Donc 0033 est calé sur les **colonnes 0018**, et la réécriture des edges (`→ ag_envoi_tracking`) reste l'**étape 3 différée**. On NE ressuscite PAS les colonnes supprimées (anti « deux schémas »).

**Conventions** : RPC = SECURITY DEFINER + `set search_path=public` + REVOKE public,anon + GRANT authenticated,service_role ; trigger fn = REVOKE public,anon,authenticated ; reader = STABLE + garde `user_has_copro_access` ; un seul `%` ; cast enum ; errcodes 42501/23514/23503. Helpers 0023. Aucune table/enum/RLS. `-- TRANSITOIRE` sur chaque objet.

## Objets (5) — ordre de déclaration
1. `tr_ag_notif_event_copro_consistency()` + `trg_ag_notif_event_copro_consistency` (BEFORE I/U `ag_notification_events`) — re-quête `ag_notifications.copro_id` via `NEW.notification_id` ; `copro_id` NULL → auto-rempli ; divergent → 23514 ; parent absent → 23503. **Fonction DÉDIÉE** (ne PAS réutiliser `enforce_copro_consistency` 0030 : son `else` rendrait le check tautologique = no-op). BEFORE row-level (seul un BEFORE peut écrire `NEW.copro_id`).
2. `create_ag_notification(p_ag_id, p_coproprietaire_id default null, p_channel default null, p_provider_ref default null) → uuid` — `copro_id` **dérivé** de `ag_meetings` (jamais saisi), status `'queued'`. G-MGR (garde après résolution du copro).
3. `mark_notification_sent(p_notification_id, p_provider_ref default null, p_event_payload default '{}') → void` — UPDATE status `'sent'` + sent_at + provider_ref(coalesce) RETURNING copro_id ; NOT FOUND → 23503 ; INSERT event `'sent'`. Garde **is_service_call()** stricte (G-SVC), ACL uniforme (authenticated+service_role).
4. `mark_notification_failed(p_notification_id, p_error_message default null, p_event_payload default '{}') → void` — symétrique, status `'failed'` + error_message ; event `'failed'`. G-SVC strict.
5. `get_ag_recipients(p_ag_id, p_notification_type default null, p_only_missing default false) → table` — destinataires = coproprietaires **actifs** (≥1 lot_owners end_date NULL) de la copro de l'AG, avec email ; `p_only_missing` exclut ceux déjà dans `ag_notifications` pour cette AG ; `p_notification_type` accepté mais **ignoré** (pas de colonne type en cible — param conservé pour compat appel front/edge). G-DEF-RO (user_has_copro_access), STABLE. Retour : `coproprietaire_id, copro_id, full_name, email, is_company, already_notified`.

**Exclus** : `get_ag_sending_stats` (aucun appel front/edge). À vérifier hors 0033 : `check_convocation_delay` (appelé par le front — possiblement déjà en 0030).

## Gate (begin/rollback)
1. fixture : `create_test_copro_seeded` + 1 `ag_meetings` (copro) ; coproprietaires actifs présents (seed).
2. `create_ag_notification(ag)` service_role → uuid, ligne status `'queued'`, copro_id = celui de l'AG ; AG inexistante → 23503 ; authenticated non-gestionnaire → 42501.
3. `mark_notification_sent(notif)` service_role → status `'sent'` + sent_at + 1 event `'sent'` copro_id cohérent ; authenticated → 42501 (G-SVC) ; notif inexistante → 23503.
4. `mark_notification_failed(notif,'err')` → status `'failed'` + error_message + event `'failed'`.
5. trigger : INSERT event copro_id NULL → auto-rempli ; copro_id autre copro → 23514 ; notification_id inexistant → 23503.
6. `get_ag_recipients(ag)` → liste les coproprietaires actifs ; `p_only_missing=true` après une notif → exclut le notifié.
7. db reset 0001→0033 propre ; vitest 75/75 ; 0 doublon (grep enforce_copro_consistency/get_ag_recipients non redéfinis ailleurs).
