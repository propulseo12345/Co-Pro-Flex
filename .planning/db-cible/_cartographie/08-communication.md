# Domaine 08 — Communication / Messagerie / Mur / Événements / Mail

Cartographie LIVE (project `iyfesbjnkpynmwlsmxnp`, lecture seule) — date 2026-06-04.

## Périmètre confirmé

Tables du domaine **réellement présentes** (15 graines toutes existantes) :

| Table | Lignes | RLS activé | Policies | Verdict périmètre |
|---|---|---|---|---|
| `conversations` | 1 | non | 3 | GARDER (messagerie interne) |
| `conversation_members` | 2 | non | 3 | GARDER |
| `messages` | 5 | non | 4 | GARDER |
| `wall_posts` | 4 | non | 4 | GARDER (mur communautaire) |
| `wall_comments` | 3 | non | 4 | GARDER |
| `wall_likes` | 3 | non | 3 | GARDER |
| `events` | 2 | non | 4 | GARDER (agenda copro) |
| `mail_campaigns` | 2 | non | 4 | **DROP** (emailing de masse) |
| `mail_recipients` | 9 | non | 2 | **DROP** (dépend de campaigns) |
| `mail_folders` | 5 | non | 4 | À TRANCHER (voir verdict) |
| `mail_inbox` | 2 | non | 3 | **DROP** (réceptacle des campagnes) |
| `mail_templates` | 3 | non | 4 | **DROP** (templates campagnes) |
| `mails` | 0 | non | 0 | **DROP** (table morte) |
| `mail_labels_v2` | 0 | non | 0 | **DROP** (table morte) |
| `email_templates` | 6 | non | 2 | **HORS DOMAINE → domaine Relances/Impayés** |

**Réassignations (graines mal classées) :**
- `email_templates` n'est PAS de la communication interne : ses 6 lignes ont `copro_id` NULL (templates système globaux), elle est lue par `create_default_reminder_rules` (domaine relances d'impayés, codes type J+7/J+30/J+60). À cartographier avec le domaine **dunning/relances**, pas ici.
- `v_call_campaigns` (vu dans le scan) n'appartient PAS à ce domaine : c'est une vue d'**appels de fonds** (`call_for_funds`), homonymie « campaigns ». Ignorée.

**RLS : désactivé sur 15/15 tables** (cohérent avec la phase dev — mémoire `dev_phase_rls`). Des policies existent (héritées) mais ne s'appliquent pas tant que `relrowsecurity=false`. `mails` et `mail_labels_v2` n'ont **aucune** policy.

**Propriété des données : 100 % sur copro `AA-2024-00001`** — ni la boucle d'or `22222222`, ni l'immuable `11111111`. ⇒ **AUCUNE donnée de ce domaine n'est à migrer** (tout est jetable selon le cadre verrouillé).

---

## 1. STRUCTURE LIVE détaillée

### Bloc A — Messagerie interne (GARDER)

#### `conversations`
- `id` uuid PK (gen_random_uuid)
- `copro_id` uuid NOT NULL → copros(id) ON DELETE CASCADE
- `subject` text NULL
- `is_group` bool NOT NULL false
- `created_by` uuid NOT NULL → profiles(id)
- `last_message_at` timestamptz NULL · `last_message_preview` text NULL (dénormalisation pour la liste)
- `created_at`/`updated_at` timestamptz NOT NULL now()
- `is_archived` bool NOT NULL false
- Index : pk, `idx_conversations_copro(copro_id)`, `idx_conversations_last_message(copro_id, last_message_at DESC NULLS LAST)`
- Trigger : `trg_updated_at_conversations` (set_updated_at)
- Lue par vue `v_conversations_overview`

#### `conversation_members`
- `id` uuid PK · `copro_id` NOT NULL → copros CASCADE · `conversation_id` NOT NULL → conversations CASCADE · `user_id` NOT NULL → profiles(id)
- `last_read_at` timestamptz NULL · `unread_count` int NOT NULL 0 (compteur dénormalisé) · `is_admin` bool false · `is_muted` bool false · `left_at` timestamptz NULL · `joined_at` timestamptz NOT NULL now()
- `user_name` text NULL · `user_role` text NULL default 'copro' (**dénormalisation snapshot** depuis profiles)
- UNIQUE `uq_conversation_member(conversation_id, user_id)`
- Index : pk, uq, `idx_conversation_members_active(user_id, left_at) WHERE left_at IS NULL`, `_conversation`, `_user`

#### `messages`
- `id` uuid PK · `copro_id` NOT NULL → copros CASCADE · `conversation_id` NOT NULL → conversations CASCADE · `author_id` NOT NULL → profiles(id)
- `content` text NOT NULL · `attachment_id` uuid NULL → documents(id) · `attachments` jsonb default '[]' (**doublon** avec attachment_id) · `read_by` uuid[] NOT NULL '{}' · `reply_to_id` uuid NULL → messages(id) SET NULL
- `sender_name` text NULL (snapshot) · `message_type` text NOT NULL 'text' (**pas d'enum/CHECK**) · `edited_at` timestamptz NULL · `is_edited` bool NOT NULL false (**redondant avec edited_at**) · `created_at` now()
- Index : pk, `idx_messages_author`, `_conversation`, `_created(conversation_id, created_at DESC)`
- Triggers : `trg_conversation_last_message` (AFTER INSERT → update_conversation_last_message), `trg_updated_at_messages`
- ⚠️ `messages` a un trigger `BEFORE UPDATE ... set_updated_at` mais la table **n'a pas de colonne `updated_at`** (elle a `edited_at`). Risque d'erreur runtime sur UPDATE → à vérifier (drift probable).

### Bloc B — Mur communautaire (GARDER)

#### `wall_posts`
- `id` uuid PK · `copro_id` NOT NULL CASCADE · `author_id` NOT NULL → profiles
- `title` text NOT NULL · `content` text NOT NULL · `category` enum `wall_post_category` NOT NULL 'information' (information/urgent/question/event/other) · `visibility` enum `content_visibility` NOT NULL 'all_members' (all_members/council_only/managers_only)
- `is_pinned` bool false · `pinned_at` · `pinned_by` → profiles · `is_locked` bool false
- `attachment_id` uuid NULL → documents · `tags` text[] '{}'
- `likes_count` int 0 · `comments_count` int 0 (compteurs dénormalisés, maintenus par triggers)
- `author_name` text NULL · `author_role` text NULL 'copro' (**snapshot redondant** : `v_wall_feed` recalcule author_role à la volée)
- Index : pk, `_author`, `_copro`, `_created(copro_id,created_at DESC)`, `_pinned(copro_id,is_pinned,created_at DESC)`, `_visibility(copro_id,visibility)`
- Trigger : `trg_updated_at_wall_posts`
- Lue par `v_wall_feed`

#### `wall_comments`
- `id` PK · `copro_id` CASCADE · `post_id` NOT NULL → wall_posts CASCADE · `author_id` → profiles · `content` NOT NULL · `parent_comment_id` uuid NULL → wall_comments(id) CASCADE (fil de réponses) · `author_name` text NULL (snapshot) · created/updated
- Triggers : `trg_wall_comments_count` (AFTER INS/DEL → update_wall_post_comments_count), `trg_updated_at_wall_comments`

#### `wall_likes`
- `id` PK · `copro_id` CASCADE · `post_id` NOT NULL → wall_posts CASCADE · `user_id` NOT NULL → profiles · created_at
- UNIQUE `uq_wall_like(post_id, user_id)`
- Trigger : `trg_wall_likes_count` (AFTER INS/DEL → update_wall_post_likes_count)

### Bloc C — Événements / agenda (GARDER)

#### `events`
- `id` PK · `copro_id` NOT NULL CASCADE · `title` NOT NULL · `description` NULL · `event_type` enum `event_type` NOT NULL 'autre' (ag/reunion_cs/travaux/intervention/fete/autre) · `location` NULL
- `starts_at` NOT NULL · `ends_at` NULL · `all_day` bool false · CHECK `ck_event_dates (ends_at IS NULL OR ends_at >= starts_at)`
- `visibility` enum content_visibility 'all_members'
- `linked_ag_id` uuid NULL · `linked_service_order_id` uuid NULL (**liens sans contrainte FK** — pas de REFERENCES vers ag_meetings / service_orders)
- `created_by` → profiles · created/updated · trigger set_updated_at
- Index : pk, `_copro`, `_dates(copro_id,starts_at)`, `_type(copro_id,event_type)`
- Lue par `v_events_overview`

### Bloc D — Mail/Emailing de masse (DROP)

#### `mail_campaigns` (DROP)
23 colonnes : subject/body/preview_text, `template_id`→mail_templates SET NULL, `recipient_type` enum mail_recipient_type (all/council/by_building/by_floor/custom), `recipient_filter` jsonb, `attachment_ids` uuid[], `status` enum mail_campaign_status (draft/scheduled/sending/sent/failed/cancelled), scheduled_at/sent_at, **8 compteurs analytics** (total_recipients, sent/delivered/opened/clicked/bounced/failed_count), `folder_id`→mail_folders, created_by. Trigger set_updated_at. Vue `v_mail_campaigns_overview` (calcule open_rate/click_rate).

#### `mail_recipients` (DROP)
17 colonnes : campaign_id→mail_campaigns CASCADE, `coproprietaire_id`→coproprietaires SET NULL, email/name/variables jsonb, `delivery_status` enum mail_delivery_status, 6 timestamps de tracking (sent/delivered/opened/clicked/bounced/failed_at), error_message, message_id. UNIQUE(campaign_id,email). Trigger `trg_mail_recipients_stats` → update_mail_campaign_stats.

#### `mail_inbox` (DROP)
21 colonnes : réceptacle des réponses aux campagnes (original_campaign_id, original_recipient_id), from_email/name, subject/body/body_html, attachment_ids[], flags is_read/starred/archived/deleted, folder_id, owner_id→profiles, message_id/in_reply_to (threading email). Vue `v_mail_inbox_overview`.

#### `mail_templates` (DROP)
name/subject/body/category/variables jsonb/is_system/created_by. Référencé par mail_campaigns.template_id.

#### `mail_folders` (À TRANCHER)
Arborescence Boîte/Envoyés/Brouillons/Archivés/Corbeille par user. Créé par `create_mail_system_folders`. UNIQUE(user_id,name). **Lié uniquement à l'écosystème campagnes/inbox → tombe avec le DROP.**

#### `mails` (DROP — TABLE MORTE)
25 colonnes (boîte mail complète : to/cc jsonb, thread_id, resend_id, label_ids[], in_reply_to self-FK). **0 ligne, 0 policy, RLS off, référencée par aucune fonction ni vue.** Tentative de « vraie messagerie email » jamais branchée. CHECK status in (draft/sent/received).

#### `mail_labels_v2` (DROP — TABLE MORTE)
copro_id/owner_id/name/color/sort_order. **0 ligne, 0 policy, aucune référence.** Le suffixe `_v2` + zéro usage = vestige de migration (déjà signalée morte dans la mémoire `v1_audit_reconciled`).

---

## 2. CONTRAT FONCTIONNEL (garde-fou schéma cible)

Toutes en `SET search_path=public`.

| Fonction | Args | Sécurité | Lit | Écrit |
|---|---|---|---|---|
| `is_conversation_member` | (conv_id, user_id=auth.uid()) → bool | DEFINER, STABLE | conversation_members (left_at IS NULL) | — |
| `mark_conversation_read` | (conv_id) → void | DEFINER | auth.uid() | UPDATE conversation_members(last_read_at,unread_count=0) ; UPDATE messages(read_by append) où author≠moi |
| `update_conversation_last_message` | trigger | INVOKER | NEW.* | UPDATE conversations(last_message_at,last_message_preview,updated_at) ; UPDATE conversation_members(unread_count+1) sauf auteur |
| `update_wall_post_comments_count` | trigger | INVOKER | — | UPDATE wall_posts.comments_count ±1 (GREATEST 0) |
| `update_wall_post_likes_count` | trigger | INVOKER | — | UPDATE wall_posts.likes_count ±1 (GREATEST 0) |
| `create_mail_system_folders` *(DROP avec le bloc mail)* | (copro_id,user_id) → void | DEFINER | — | INSERT 5 mail_folders ON CONFLICT DO NOTHING |
| `generate_campaign_recipients` *(DROP)* | (campaign_id) → int | DEFINER | mail_campaigns, coproprietaires, council_members, profiles | DELETE+INSERT mail_recipients ; UPDATE mail_campaigns.total_recipients |
| `update_mail_campaign_stats` *(DROP)* | trigger | INVOKER | mail_recipients agrégés | UPDATE mail_campaigns (6 compteurs) |

**Contrat à honorer dans la cible (hors DROP) :**
1. Compteurs dénormalisés `unread_count`, `likes_count`, `comments_count` maintenus par triggers — à reconduire OU à dériver en vue (choix d'archi à acter ; cohérent avec le principe « finance dérivée », mais ici non-financier donc dénormalisation tolérable pour la perf de feed).
2. `mark_conversation_read` mute `messages.read_by` (uuid[]) ET `conversation_members` — double source de l'« lu ». À simplifier.
3. `generate_campaign_recipients` + `update_mail_campaign_stats` disparaissent avec le bloc mail.

**Vues du domaine :** `v_conversations_overview`, `v_conversation_messages`, `v_wall_feed`, `v_events_overview` (à garder, repointer sur le schéma cible) ; `v_mail_campaigns_overview`, `v_mail_inbox_overview` (DROP). Toutes utilisent `auth.uid()` (is_mine / is_liked_by_me / my_unread_count) → dépendent du modèle session-user.

---

## 3. VERDICT QUALITÉ : **À REPENSER** (partiellement)

Le **noyau garde (messagerie + mur + events) est plutôt BIEN FAIT** : FK propres + CASCADE cohérent, index pertinents (couvrants pour les feeds), enums métier corrects, CHECK de dates sur events, UNIQUE sur like et membre. Mais le domaine dans son ensemble est **À REPENSER** pour 5 raisons concrètes :

1. **Triple couche mail morte/redondante** : trois implémentations superposées du même besoin — `mail_campaigns/recipients/inbox` (emailing masse, à DROP par décision), `mails` (boîte email générique, 0 ligne, morte) et `mail_labels_v2` (0 ligne, morte). Cas-école du « deux/trois patterns qui coexistent » (anti-pattern mémoire `cleanup_doublons_audit`). Après DROP des campagnes, il ne reste **rien** de mail à garder.

2. **Dénormalisation snapshot non contrainte** : `messages.sender_name`, `conversation_members.user_name/user_role`, `wall_posts.author_name/author_role`, `wall_comments.author_name` copient des champs de `profiles` sans trigger de synchro → divergence garantie. Pire, `v_wall_feed` **recalcule** `author_role` à la volée (via user_is_copro_manager/is_council_*) en ignorant la colonne stockée → la colonne `wall_posts.author_role` est de facto **morte/trompeuse**.

3. **Redondances de colonnes** : `messages.attachment_id` (FK) **et** `messages.attachments` (jsonb) ; `messages.edited_at` **et** `messages.is_edited` (booléen dérivable de edited_at IS NOT NULL).

4. **Contraintes manquantes** : `events.linked_ag_id` et `linked_service_order_id` sans FK (intégrité référentielle absente vers ag_meetings/service_orders) ; `messages.message_type` text libre sans enum/CHECK ; trigger `set_updated_at` posé sur `messages` alors que la table n'a pas de colonne `updated_at` (drift / bug latent sur UPDATE).

5. **RLS absente** (0/15 activées) alors que le cadre prod exige RLS partout + 3 rôles. Acceptable en dev mais c'est un chantier entier pour la cible : les vues s'appuient déjà sur `auth.uid()`, la logique de visibilité (`content_visibility`, `is_conversation_member`) existe — il faut la matérialiser en policies.

---

## 4. CANDIDATS MORTS / DOUBLONS (à confirmer par l'agent transverse)

| Objet | Raison | Confiance |
|---|---|---|
| `mails` (table) | 0 ligne, 0 policy, RLS off, **référencée par aucune fonction/vue** | TRÈS HAUTE → DROP |
| `mail_labels_v2` (table) | 0 ligne, 0 policy, suffixe `_v2`, aucune référence ; déjà flaggée dans `v1_audit_reconciled` | TRÈS HAUTE → DROP |
| `mail_campaigns` + `mail_recipients` + `mail_inbox` + `mail_templates` + `mail_folders` | Emailing de masse — **DROP par décision utilisateur verrouillée** | DÉCIDÉ |
| `create_mail_system_folders`, `generate_campaign_recipients`, `update_mail_campaign_stats` + trigger `trg_mail_recipients_stats` | Tombent avec le bloc mail | HAUTE |
| Vues `v_mail_campaigns_overview`, `v_mail_inbox_overview` | Idem | HAUTE |
| Colonne `wall_posts.author_role` | Ignorée par `v_wall_feed` qui la recalcule → trompeuse | MOYENNE (vérifier usage front) |
| Colonne `messages.attachments` (jsonb) | Doublon de `attachment_id` | MOYENNE |
| Colonne `messages.is_edited` | Dérivable de `edited_at` | MOYENNE |
| Trigger `trg_updated_at_messages` | Cible une colonne `updated_at` inexistante sur `messages` | À VÉRIFIER (bug) |
| `email_templates` | **Hors domaine** — appartient aux relances ; ne pas DROP ici | RÉASSIGNER |

---

## 5. MIGRATION

**Aucune reprise de données pour ce domaine.** Vérifié : 100 % des lignes (messages, wall_*, events, conversations, mail_*) appartiennent à la copro `AA-2024-00001`, qui n'est **ni 22222222 (boucle d'or) ni 11111111 (immuable)**. Selon le cadre verrouillé, ces données sont jetables → on repart de zéro sur le schéma cible.

`email_templates` : 6 lignes `copro_id = NULL` (templates système globaux de relance) — à traiter dans la migration du **domaine relances/impayés**, pas ici.

**Ce qui doit être reconduit dans la cible (structure, pas données) :**
- Tables `conversations` / `conversation_members` / `messages` (messagerie interne lot-agnostique, par profil) + triggers de compteur/last_message + fonctions `is_conversation_member` / `mark_conversation_read`.
- Tables `wall_posts` / `wall_comments` / `wall_likes` + triggers de comptage + vue `v_wall_feed` (avec auth role dérivé).
- Table `events` + vue `v_events_overview` ; **ajouter les FK** `linked_ag_id`→ag_meetings, `linked_service_order_id`→service_orders.
- Nettoyer au passage : supprimer colonnes redondantes (attachments jsonb, is_edited, author_role snapshot), poser enum/CHECK sur message_type, corriger le trigger updated_at de messages, activer RLS + policies (3 rôles).
