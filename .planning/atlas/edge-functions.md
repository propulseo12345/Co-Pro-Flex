# Atlas — Fonctions Edge (Supabase / Deno)

Inventaire des **25** fonctions sous `supabase/functions/`. Audit sécurité centré sur la cloison inter-cabinet.

## Légende clé Supabase
- **ANON+JWT** : client créé avec `SUPABASE_ANON_KEY` + forward de l'`Authorization` de l'utilisateur → **RLS active**, l'utilisateur n'agit qu'avec ses droits. Sûr par défaut.
- **SERVICE_ROLE** : client créé avec `SUPABASE_SERVICE_ROLE_KEY` → **bypass RLS total**. Le forward du header JWT est alors **cosmétique** (la clé service prime). Tout contrôle d'appartenance doit être refait **en code** ou dans la RPC (`auth.uid()`/`user_is_copro_manager`). Sinon = fuite inter-cabinet.

## Verdict global sécurité
- **service_role + déclencheur HUMAIN sans re-contrôle d'appartenance = FUITE** : voir tableau, colonne Verdict en MAJUSCULES.
- service_role légitime : `email_webhook` (webhook, pas d'auth user), `run_payment_reminders` (cron système).

---

## Tableau

| Edge | Déclencheur | Clé | RPC / tables | Verdict sécurité |
|---|---|---|---|---|
| `ag_create` | Humain (front) | ANON+JWT | `create_ag_with_standard_resolutions` ; `copros`, `ag_meetings`, `ag_resolutions` | OK — RLS active |
| `ag_add_resolution` | Humain (front) | ANON+JWT | `ag_meetings`, `ag_resolutions` | OK — RLS active (vérif ag+copro) |
| `ag_start_session` | Humain (front) | ANON+JWT | `user_is_copro_manager` ; `ag_meetings`, `ag_resolutions` | OK — re-check manager explicite |
| `ag_close` | Humain (front) | ANON+JWT | `close_ag`, `compute_ag_quorum` ; `ag_meetings`, `ag_resolutions`, `ag_attendance` | OK — RLS active |
| `ag_cast_vote` | Humain (front) | ANON+JWT | `cast_vote` ; `ag_votes`, `ag_resolutions` | OK — RLS active |
| `ag_register_attendance` | Humain (front) | ANON+JWT | `ag_meetings`, `coproprietaires`, `ag_attendance`, `lot_owners` | OK — RLS active |
| `ag_send_convocations` | Humain (front) | ANON+JWT | `get_ag_recipients`, `create_ag_notification`, `mark_notification_*` ; `ag_meetings`, `copros`, `ag_documents`, `email_templates` ; Resend + Storage `ged` | OK — RLS active ; envoie emails |
| `ag_send_relance` | Humain (front) | ANON+JWT | `create_ag_notification`, `mark_notification_*` ; `ag_meetings`, `copros`, `coproprietaires`, `email_templates` ; Resend | OK — RLS active |
| `ag_generate_document` | Humain (front) | **ANON+JWT** (lecture) + SERVICE (storage seul) | `compute_ag_quorum`, `register_ag_document` ; `copros`, `ag_meetings`, `ag_resolutions`, vues attendance ; Storage `ged` | OK — données lues sous RLS ; service_role limité au upload/signed-url |
| `ag-get-live-results` | Humain (front, GET) | **SERVICE_ROLE** | `get_ag_live_results` (NON security definer) | **FUITE — service_role, aucun re-check ; lit les résultats de vote de N'IMPORTE QUELLE copro via `?ag_id=`** |
| `ag-register-correspondence-vote` | Humain (front) | **SERVICE_ROLE** | `register_correspondence_form_votes` (**SECURITY DEFINER, sans `auth.uid()`**) | **FUITE CRITIQUE — service_role + RPC sans garde : tout user authentifié peut injecter des votes par correspondance sur l'AG d'un autre cabinet** |
| `ag-correspondence-eligible` | Humain (front, GET) | **SERVICE_ROLE** | `get_correspondence_eligible_owners` (NON security definer) | **FUITE — service_role, aucun re-check ; énumère les copropriétaires éligibles de toute copro** |
| `maintenance-workflow` | Humain (front) | **SERVICE_ROLE** | `update_service_order_status` (a sa garde), `generate_service_order_number`, `create_logbook_from_service_order` ; `service_orders`, `service_order_events`, `supplier_invoices`, `providers`, vues | **FUITE — service_role + seulement `auth.getUser()`, AUCUN re-check d'appartenance copro. `create-order`/`link-invoice`/`cancel-order`/`send-email` écrivent en direct sur `service_orders` de n'importe quelle copro** |
| `council-workflow` | Humain (front) | **SERVICE_ROLE** | `compute_decision_result` ; `council_members`, `council_decisions`, `council_votes`, `council_documents`, `profiles` | OK (atténué) — chaque handler re-vérifie `council_members`(copro_id,user_id,is_active) ; bornage par appartenance CS présent. À surveiller mais pas fuite ouverte |
| `communication-workflow` | Humain (front) | **SERVICE_ROLE** | `user_has_copro_access`, `is_council_member`, `user_is_copro_manager`, `can_view_content`, `mark_conversation_read` ; `wall_posts/comments/likes`, `events`, `conversations`, `messages`, `conversation_members` | OK (atténué) — re-checks d'accès via RPC `user_has_copro_access`/`user_is_copro_manager` dans chaque handler. **Risque résiduel : `handleSendMessage`/`leave`/`markRead` ne re-valident QUE l'appartenance à la conversation, pas la copro — acceptable** |
| `get_document_url` | Humain (front) | **ANON+JWT** (accès) + SERVICE (signed-url seul) | `documents`, `memberships`, `document_access`, `document_access_logs` | OK — contrôle d'accès complet en code (copro match + rôle + confidentialité) avant le service_role |
| `generate_owner_statement` | Humain (front) | ANON+JWT | `get_owner_statement` | OK — RLS active |
| `create_supplier_invoice` | Humain (front) | ANON+JWT | `post_supplier_invoice` ; charges 6xx / 401 | OK — RLS active ; RPC canonique grand livre |
| `pay_supplier_invoice` | Humain (front) | ANON+JWT | `post_supplier_payment` ; 401 / 512 | OK — RLS active |
| `generate_call_for_funds` | Humain (front) | ANON+JWT | `post_call_for_funds` ; 450-x / 701/702/105 | OK — refus explicite du service_role (commentaire), JWT exigé |
| `record_payment` | Humain (front) | ANON+JWT | `post_owner_payment` ; 512 / 450-x | OK — RLS active |
| `send_manual_payment_reminder` | Humain (front) | ANON+JWT | `create_payment_reminder`, `mark_reminder_*` ; `v_unpaid_by_lot`, `copros`, `payment_reminders`, `email_templates`, `lots` | OK — RLS active ; envoie email Resend |
| `run_payment_reminders` | **Système (cron)** + fallback humain | SERVICE_ROLE (cron) sinon ANON+JWT | `cancel_stale_reminders`, `get_pending_reminders_to_send`, `create_payment_reminder`, `mark_reminder_*` ; `reminder_settings`, `copros` | OK — service_role légitime (cron) ; en appel manuel retombe sur ANON+JWT |
| `send-convocation-email` | Humain (front) | **Aucun client Supabase** (relais email pur) | — (Resend uniquement, PDF base64 en entrée) | OK — pas d'accès DB ; auth header non vérifié mais aucune donnée copro touchée |
| `email_webhook` | **Webhook entrant (Resend)** | SERVICE_ROLE | `ag_notifications`, `ag_notification_events`, `coproprietaires` | OK — service_role légitime (pas d'auth user) ; signature HMAC vérifiée si secret présent (**actuellement non bloquante en dev**) |

---

## Synthèse fuites inter-cabinet (service_role + humain sans re-contrôle)

**4 fonctions à corriger** (par gravité) :

1. **`ag-register-correspondence-vote`** — CRITIQUE. service_role + RPC `register_correspondence_form_votes` SECURITY DEFINER **sans `auth.uid()`** → écriture de votes sur l'AG de tout cabinet. Intégrité juridique de l'AG en jeu.
2. **`maintenance-workflow`** — service_role, seulement `auth.getUser()`, aucun `user_is_copro_manager`/vérif cabinet. Création/modif/annulation d'ordres de service sur toute copro.
3. **`ag-get-live-results`** — service_role, lit `get_ag_live_results` (RLS bypassée) → résultats de vote de toute copro via `?ag_id=`.
4. **`ag-correspondence-eligible`** — service_role, énumération des copropriétaires éligibles de toute copro via `?ag_id=`.

**Atténués mais à surveiller** (service_role MAIS re-check d'appartenance présent dans chaque handler) : `council-workflow` (vérif `council_members`), `communication-workflow` (vérif `user_has_copro_access`/`user_is_copro_manager`). À durcir mais pas de fuite ouverte aujourd'hui.

**Correctif type** : soit repasser ces edges en **ANON+JWT** (le plus simple, RLS fait le travail comme les 14 autres edges AG/finance), soit conserver service_role mais ajouter en tête de handler `user_is_copro_manager(p_copro_id)` / vérif `memberships` ET poser un `auth.uid()` dans la RPC SECURITY DEFINER.
