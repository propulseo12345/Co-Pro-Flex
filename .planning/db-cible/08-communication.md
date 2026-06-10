# Domaine 08 — Communication : Messagerie interne / Mur communautaire / Événements — SCHÉMA CIBLE (blueprint)

> Conception cible PROPRE — project `iyfesbjnkpynmwlsmxnp` — 2026-06-04 (lecture seule)
> Statut : redesign ciblé. On GARDE le noyau « plutôt bien fait » (FK + CASCADE cohérents, index couvrants pour les feeds, enums métier, CHECK de dates, UNIQUE like/membre) et on corrige les dettes du verdict « À REPENSER ».
> **Décision USER verrouillée : GARDER messagerie interne + mur ; DROP campagnes** (tout le bloc `mail_*`). Ce blueprint ne couvre QUE le périmètre gardé.
> Cadre verrouillé : RLS partout + gardes in-function ; 3 rôles (gestionnaire / copropriétaire / anon) ; bicéphale session-user vs service_role.
> IDs réels copros : boucle d'or `22222222-aaaa-bbbb-cccc-222222222222`, immuable `11111111-aaaa-bbbb-cccc-111111111111`.

---

## 0. Faits live qui tranchent le design (vérifiés en lecture seule)

**Aucune donnée à migrer.** Vérifié (cartographie §5) : 100 % des lignes du domaine (conversations, conversation_members, messages, wall_*, events) appartiennent à la copro **`AA-2024-00001`**, qui n'est **ni 22222222 (boucle d'or) ni 11111111 (immuable)**. Selon le cadre verrouillé, ces données sont **jetables** → ce blueprint est une création de **structure seulement, 0 ligne à reprendre**.

| Constat live | Conséquence design |
|---|---|
| `messages.message_type` = `text` libre `'text'` (aucun enum/CHECK) | → **enum `message_type` NOUVEAU** (voir §2). |
| `messages` porte un trigger `set_updated_at` mais **n'a pas de colonne `updated_at`** (elle a `edited_at`) | bug latent sur UPDATE → **trigger corrigé** : `messages` n'a pas d'`updated_at`, on retire ce trigger (voir §4). |
| `messages.attachment_id` (FK) **et** `messages.attachments` (jsonb) | doublon → **`attachments` jsonb SUPPRIMÉE** (on garde la FK). |
| `messages.edited_at` **et** `messages.is_edited` (booléen) | `is_edited` dérivable de `edited_at IS NOT NULL` → **`is_edited` SUPPRIMÉE**. |
| `messages.sender_name`, `conversation_members.user_name/user_role`, `wall_posts.author_name/author_role`, `wall_comments.author_name` (snapshots de `profiles`) | dénormalisation non synchronisée. `v_wall_feed` **recalcule** `author_role` à la volée → la colonne stockée est trompeuse → **`wall_posts.author_role` SUPPRIMÉE** ; les autres snapshots `*_name` retirés au profit d'une jointure `profiles` (voir §1). |
| `events.linked_ag_id` / `linked_service_order_id` **sans FK** | intégrité référentielle absente → **vraies FK posées** vers `ag_meetings` / `service_orders` (manquantes en live). |
| `conversation_members` : pas de colonne `updated_at` | table d'appartenance pure, OK — pas de `set_updated_at`. |
| RLS **OFF sur 15/15** tables (phase dev) | cible prod : RLS ON + FORCE + 3 rôles (voir §3). |

> **Hors blueprint (DROP par décision USER — bloc CAMPAGNES uniquement)** : `mail_campaigns`, `mail_recipients`, `mail_inbox`, `mail_templates`, `mail_folders`, `mail_labels_v2`, et leurs fonctions (`create_mail_system_folders`, `generate_campaign_recipients`, `update_mail_campaign_stats`) / vues (`v_mail_campaigns_overview`, `v_mail_inbox_overview`). `email_templates` (modèles d'e-mail système : relances **et** AG) = **traitée dans le domaine 03 §1.11** (foyer propriétaire des relances). Elle y est définie/reprise comme table de référence globale ; elle n'est PAS orpheline.
>
> **⚠️ Décision explicite sur `mails` (TRANCHÉE — distincte du bloc campagnes) :** la table `mails` n'est **PAS** droppée. Vérifié en live (lecture seule, 2026-06-04) : `mails` est une **boîte email transactionnelle Resend** (colonnes `from_email`/`to_emails`/`cc_emails`/`resend_id`/`thread_id`/`in_reply_to`/`label_ids`/`body_html`…), 0 ligne mais **réellement câblée au front** : `useMailbox.ts` (8 requêtes), `app/api/mail/send/route.ts` (l.57), `app/api/mail/inbound/route.ts` (l.46), `communication/page.tsx` (l.51-62), `communication/mail/page.tsx`. Le verdict T3-B la classe explicitement **« mails = messagerie interne (gardée), vide mais câblée. À ne pas confondre avec l'île campagnes (A3) »**. La droper sec (amalgamée aux campagnes) casserait silencieusement `useMailbox` + les routes API mail à la re-baseline. → `mails` est donc reprise comme **8ᵉ table du domaine** (voir §1.8), distincte du mur, de la messagerie interne `conversations`/`messages` (feature séparée, `useMessagerie.ts`) et de l'île campagnes. C'est l'unique point de décision sur `mails` : tout le reste du bloc `mail_*` (campagnes) reste droppé.

---

## 1. TABLES CIBLES

Le domaine cible = **8 tables**, en 4 blocs :
- **Messagerie interne** : `conversations`, `conversation_members`, `messages`.
- **Mur communautaire** : `wall_posts`, `wall_comments`, `wall_likes`.
- **Agenda** : `events`.
- **Boîte email transactionnelle (Resend)** : `mails`.

Enums référencés par nom depuis le catalogue rationalisé (T2). `message_type` est NOUVEAU (voir §2).

### 1.1 `conversations` (fil de messagerie interne)

```
conversations
  id                    uuid        NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id              uuid        NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  subject               text        NULL
  is_group              bool        NOT NULL DEFAULT false
  created_by            uuid        NOT NULL                            -- FK profiles(id) ON DELETE RESTRICT
  -- dénormalisation pour la liste (reconduite : perf de feed, non-financier)
  last_message_at       timestamptz NULL
  last_message_preview  text        NULL
  is_archived           bool        NOT NULL DEFAULT false
  created_at            timestamptz NOT NULL DEFAULT now()
  updated_at            timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **FK** `copro_id`→copros CASCADE ; `created_by`→profiles RESTRICT (auteur du fil, ne disparaît pas en silence).
- **Index** : pkey ; `(copro_id)` ; `(copro_id, last_message_at DESC NULLS LAST)` (tri liste de fils).
- **Triggers** : `set_updated_at` (consolidé) ; mise à jour de `last_message_at`/`last_message_preview` par `update_conversation_last_message` (déclenché AFTER INSERT sur `messages`, voir §4).
- Lue par `v_conversations_overview` (repointée).

### 1.2 `conversation_members` (appartenance + lu/non-lu dénormalisé)

Snapshots `user_name`/`user_role` **SUPPRIMÉS** (divergence garantie ; le nom/rôle se joint depuis `profiles`/`memberships` à la lecture).

```
conversation_members
  id               uuid        NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id         uuid        NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  conversation_id  uuid        NOT NULL                            -- FK conversations(id) ON DELETE CASCADE
  user_id          uuid        NOT NULL                            -- FK profiles(id) ON DELETE CASCADE
  last_read_at     timestamptz NULL
  unread_count     int4        NOT NULL DEFAULT 0                  -- compteur dénormalisé (maintenu par trigger)
  is_admin         bool        NOT NULL DEFAULT false             -- admin du fil (renomme/ajoute des membres)
  is_muted         bool        NOT NULL DEFAULT false
  left_at          timestamptz NULL                               -- NULL = membre actif
  joined_at        timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **FK** copro CASCADE ; conversation CASCADE ; `user_id`→profiles CASCADE.
- **UNIQUE** `uq_conversation_member (conversation_id, user_id)` (un user = une appartenance par fil).
- **CHECK** `ck_unread_count CHECK (unread_count >= 0)`.
- **Index** : pkey ; unique ; `(conversation_id)` ; `(user_id)` ; partiel `(user_id, conversation_id) WHERE left_at IS NULL` (membres actifs, requête chaude de la messagerie).
- **Trigger intégrité copro** `trg_member_copro_consistency` : `conversations.copro_id = copro_id` (interdit de rattacher un membre à un fil d'une autre copro).
- Pas de `set_updated_at` (table d'appartenance, pas de colonne `updated_at`).

### 1.3 `messages` (corps du fil — nettoyée)

Colonnes retirées vs live : `attachments` (jsonb, doublon de `attachment_id`), `is_edited` (dérivable de `edited_at`), `sender_name` (snapshot non synchronisé). `message_type` passe de `text` libre à **enum**.

```
messages
  id               uuid        NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id         uuid        NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  conversation_id  uuid        NOT NULL                            -- FK conversations(id) ON DELETE CASCADE
  author_id        uuid        NOT NULL                            -- FK profiles(id) ON DELETE RESTRICT
  content          text        NOT NULL
  message_type     message_type NOT NULL DEFAULT 'text'           -- ENUM NOUVEAU (voir §2)
  attachment_id    uuid        NULL                                -- FK documents(id) ON DELETE SET NULL (un seul mécanisme de PJ)
  reply_to_id      uuid        NULL                                -- FK messages(id) ON DELETE SET NULL (fil de réponse)
  read_by          uuid[]      NOT NULL DEFAULT '{}'::uuid[]       -- lecteurs (voir note "lu" §5)
  edited_at        timestamptz NULL                                -- NULL = jamais édité (is_edited dérivé)
  created_at       timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **FK** copro CASCADE ; conversation CASCADE ; `author_id`→profiles RESTRICT ; `attachment_id`→documents SET NULL ; `reply_to_id`→messages(id) SET NULL (self).
- **Pas de colonne `updated_at`** → **pas de trigger `set_updated_at`** (corrige le bug latent live : le trigger live ciblait une colonne inexistante). L'édition est tracée par `edited_at` (posé applicativement / par la RPC d'édition).
- **Trigger intégrité copro** `trg_message_copro_consistency` : `conversations.copro_id = copro_id`.
- **Trigger** `trg_conversation_last_message` (AFTER INSERT → `update_conversation_last_message`, §4).
- **Index** : pkey ; `(conversation_id, created_at DESC)` (pagination du fil) ; `(author_id)` ; partiel `(conversation_id) WHERE attachment_id IS NOT NULL` (galerie PJ).

> Note « lu » : le live double la source (`messages.read_by` uuid[] **et** `conversation_members.unread_count`/`last_read_at`). Cible : **`conversation_members.last_read_at` est la source de vérité du « lu »** (un message est lu si `created_at <= membre.last_read_at`) ; `read_by` est conservé comme accusé-de-lecture fin (qui exactement a lu), maintenu par `mark_conversation_read`. `unread_count` reste un compteur dénormalisé de perf. Voir §5.

### 1.4 `wall_posts` (mur communautaire — snapshot author_role retiré)

`author_role` **SUPPRIMÉE** (recalculée par `v_wall_feed` → colonne morte/trompeuse). `author_name` retiré au profit de la jointure `profiles`.

```
wall_posts
  id              uuid        NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id        uuid        NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  author_id       uuid        NOT NULL                            -- FK profiles(id) ON DELETE RESTRICT
  title           text        NOT NULL
  content         text        NOT NULL
  category        wall_post_category   NOT NULL DEFAULT 'information'   -- information/urgent/question/event/other
  visibility      content_visibility   NOT NULL DEFAULT 'all_members'  -- all_members/council_only/managers_only
  is_pinned       bool        NOT NULL DEFAULT false
  pinned_at       timestamptz NULL
  pinned_by       uuid        NULL                                -- FK profiles(id) ON DELETE SET NULL
  is_locked       bool        NOT NULL DEFAULT false             -- fil verrouillé (plus de commentaire)
  attachment_id   uuid        NULL                                -- FK documents(id) ON DELETE SET NULL
  tags            text[]      NOT NULL DEFAULT '{}'::text[]
  -- compteurs dénormalisés (maintenus par triggers)
  likes_count     int4        NOT NULL DEFAULT 0
  comments_count  int4        NOT NULL DEFAULT 0
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **FK** copro CASCADE ; `author_id`→profiles RESTRICT ; `pinned_by`→profiles SET NULL ; `attachment_id`→documents SET NULL.
- **CHECK** `ck_wall_counts CHECK (likes_count >= 0 AND comments_count >= 0)` ; `ck_pinned CHECK (is_pinned = false OR pinned_at IS NOT NULL)` (cohérence épinglage).
- **Index** : pkey ; `(copro_id, created_at DESC)` ; `(copro_id, is_pinned, created_at DESC)` (feed épinglés-en-tête) ; `(copro_id, visibility)` ; `(author_id)` ; GIN `tags`.
- **Trigger** `set_updated_at` (consolidé).
- Lue par `v_wall_feed` (qui dérive le rôle auteur à la volée — ce qui est désormais la **seule** source du rôle).

### 1.5 `wall_comments` (fil de commentaires)

`author_name` retiré (jointure `profiles`).

```
wall_comments
  id                 uuid        NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id           uuid        NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  post_id            uuid        NOT NULL                            -- FK wall_posts(id) ON DELETE CASCADE
  author_id          uuid        NOT NULL                            -- FK profiles(id) ON DELETE RESTRICT
  content            text        NOT NULL
  parent_comment_id  uuid        NULL                                -- FK wall_comments(id) ON DELETE CASCADE (self, fil de réponses)
  created_at         timestamptz NOT NULL DEFAULT now()
  updated_at         timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **FK** copro CASCADE ; `post_id`→wall_posts CASCADE ; `author_id`→profiles RESTRICT ; `parent_comment_id`→wall_comments(id) CASCADE (self).
- **CHECK** `ck_no_self_parent CHECK (parent_comment_id IS DISTINCT FROM id)`.
- **Trigger intégrité copro** `trg_comment_copro_consistency` : `wall_posts.copro_id = copro_id`.
- **Trigger** `trg_wall_comments_count` (AFTER INSERT/DELETE → `update_wall_post_comments_count`, §4) ; `set_updated_at`.
- **Index** : pkey ; `(post_id, created_at)` ; `(parent_comment_id) WHERE parent_comment_id IS NOT NULL`.

### 1.6 `wall_likes` (réactions)

```
wall_likes
  id          uuid        NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id    uuid        NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  post_id     uuid        NOT NULL                            -- FK wall_posts(id) ON DELETE CASCADE
  user_id     uuid        NOT NULL                            -- FK profiles(id) ON DELETE CASCADE
  created_at  timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **UNIQUE** `uq_wall_like (post_id, user_id)` (un like par user par post).
- **FK** copro CASCADE ; `post_id`→wall_posts CASCADE ; `user_id`→profiles CASCADE.
- **Trigger intégrité copro** `trg_like_copro_consistency` : `wall_posts.copro_id = copro_id`.
- **Trigger** `trg_wall_likes_count` (AFTER INSERT/DELETE → `update_wall_post_likes_count`, §4).
- **Index** : pkey ; unique ; `(post_id)`.

### 1.7 `events` (agenda copro — FK liens posées)

Les colonnes `linked_ag_id` / `linked_service_order_id` deviennent de **vraies FK** (absentes en live).

```
events
  id                       uuid        NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id                 uuid        NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  title                    text        NOT NULL
  description              text        NULL
  event_type               event_type  NOT NULL DEFAULT 'autre'           -- ag/reunion_cs/travaux/intervention/fete/autre
  location                 text        NULL
  starts_at                timestamptz NOT NULL
  ends_at                  timestamptz NULL
  all_day                  bool        NOT NULL DEFAULT false
  visibility               content_visibility NOT NULL DEFAULT 'all_members'
  linked_ag_id             uuid        NULL                                -- FK ag_meetings(id) ON DELETE SET NULL  (NOUVELLE FK)
  linked_service_order_id  uuid        NULL                                -- FK service_orders(id) ON DELETE SET NULL  (NOUVELLE FK)
  created_by               uuid        NOT NULL                            -- FK profiles(id) ON DELETE RESTRICT
  created_at               timestamptz NOT NULL DEFAULT now()
  updated_at               timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **FK** copro CASCADE ; **`linked_ag_id`→ag_meetings(id) ON DELETE SET NULL** (NOUVEAU) ; **`linked_service_order_id`→service_orders(id) ON DELETE SET NULL** (NOUVEAU) ; `created_by`→profiles RESTRICT.
- **CHECK** `ck_event_dates CHECK (ends_at IS NULL OR ends_at >= starts_at)`.
- **Trigger intégrité copro** `trg_event_copro_consistency` : si `linked_ag_id` non-null → `ag_meetings.copro_id = copro_id` ; si `linked_service_order_id` non-null → `service_orders.copro_id = copro_id` (verrou anti-fuite inter-copro, cohérent avec le domaine 07).
- **Trigger** `set_updated_at` (consolidé).
- **Index** : pkey ; `(copro_id, starts_at)` (calendrier) ; `(copro_id, event_type)`.
- Lue par `v_events_overview` (repointée).

### 1.8 `mails` (boîte email transactionnelle Resend — GARDÉE, câblée front)

Table reprise **telle quelle** (structure live conservée) : c'est la boîte email externe (envoi/réception via Resend) câblée à `useMailbox.ts` et aux routes `app/api/mail/{send,inbound}`. **Distincte** de la messagerie interne `conversations`/`messages` (feature `useMessagerie.ts`) et du bloc campagnes droppé. FK live déjà saines (vérifiées) : `copro_id`→copros CASCADE, `in_reply_to`→mails self, `owner_id`→profiles. On corrige seulement la règle de suppression de `owner_id` (live = `NO ACTION` → cible = `RESTRICT`, l'agent ne disparaît pas en silence) et on ajoute le verrou d'intégrité copro `in_reply_to` (anti-fuite inter-copro). `attachments` reste **jsonb** ici (métadonnées Resend brutes, pas une FK `documents` — différence assumée vs `messages`).

```
mails
  id            uuid        NOT NULL DEFAULT gen_random_uuid()   -- PK
  copro_id      uuid        NOT NULL                            -- FK copros(id) ON DELETE CASCADE
  owner_id      uuid        NOT NULL                            -- FK profiles(id) ON DELETE RESTRICT (propriétaire de la boîte / agent)
  from_email    text        NOT NULL
  from_name     text        NOT NULL
  to_emails     jsonb       NOT NULL                            -- destinataires
  cc_emails     jsonb       NULL
  subject       text        NOT NULL
  body          text        NOT NULL
  body_html     text        NULL
  attachments   jsonb       NULL                                -- métadonnées Resend (PJ), jsonb assumé (≠ messages.attachment_id)
  status        text        NOT NULL                            -- draft/sent/received/failed… (text libre côté Resend, pas d'enum cible)
  is_read       bool        NOT NULL DEFAULT false
  is_starred    bool        NOT NULL DEFAULT false
  is_archived   bool        NOT NULL DEFAULT false
  is_deleted    bool        NOT NULL DEFAULT false              -- soft-delete (corbeille)
  label_ids     text[]      NULL                                -- libellés (text[], plus de table mail_labels_v2 — droppée)
  in_reply_to   uuid        NULL                                -- FK mails(id) ON DELETE SET NULL (self, fil de réponse)
  thread_id     uuid        NULL                                -- regroupement de fil (pas de FK : id de thread Resend)
  resend_id     text        NULL                                -- id externe Resend
  sent_at       timestamptz NULL
  received_at   timestamptz NULL
  deleted_at    timestamptz NULL
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()
```

- **PK** `id`. **FK** `copro_id`→copros CASCADE ; `owner_id`→profiles **RESTRICT** (était `NO ACTION` en live → durci) ; `in_reply_to`→mails(id) SET NULL (self).
- **Trigger intégrité copro** `trg_mail_copro_consistency` : si `in_reply_to` non-null → `mails(in_reply_to).copro_id = copro_id` (interdit de répondre à un mail d'une autre copro).
- **Trigger** `set_updated_at` (consolidé — `mails` porte bien `updated_at`).
- **Index** : pkey ; `(copro_id, owner_id, created_at DESC)` (liste de boîte par agent) ; `(copro_id) WHERE is_deleted = false` (boîte active) ; `(thread_id) WHERE thread_id IS NOT NULL` (regroupement de fil) ; `(resend_id) WHERE resend_id IS NOT NULL` (rapprochement webhook entrant).
- Lue par `useMailbox.ts` (8 requêtes) ; écrite par `app/api/mail/send/route.ts` (l.57) et `app/api/mail/inbound/route.ts` (l.46) ; affichée par `communication/page.tsx` (l.51-62) et `communication/mail/page.tsx`.

---

## 2. ENUMS (catalogue rationalisé — référencés, pas redéfinis)

Réutilisés tels quels (T2) : `wall_post_category` (`information/urgent/question/event/other`), `content_visibility` (`all_members/council_only/managers_only`), `event_type` (`ag/reunion_cs/travaux/intervention/fete/autre`).

**ENUM NOUVEAU à créer (remplace le `text` libre de `messages.message_type`) :**
- **`message_type`** : `text`, `file`, `system`. (`text` = message ordinaire ; `file` = message portant une pièce jointe `attachment_id` ; `system` = message de service automatique « X a rejoint la conversation », « fil archivé »…). Corrige le drift de typage (`message_type` était `text` libre sans CHECK).

> Note : la valeur `event` de `wall_post_category` recoupe le domaine `events` mais reste une **catégorie de post** (annonce d'événement sur le mur), pas un doublon de la table `events` ; conservée.

---

## 3. RLS — policies par table (3 rôles + bypass service_role)

**Constat live** : RLS **OFF sur 15/15** tables (phase dev, mémoire `dev_phase_rls`). Des policies existent (héritées) mais sont inertes. Cible prod : **RLS ON + FORCE** sur les 8 tables gardées.

**Helpers (AUTORISATION §4, gardés) :** `user_is_copro_manager(copro_id)` (gestionnaire), `user_has_copro_access(copro_id)` (membre copro), **`is_conversation_member(conversation_id, user_id)`** (cité conservé en AUTORISATION §4 — sa table `conversation_members` est définie ici, §1.2 : la dette « helper sans table cible » est comblée), **`is_council_member(copro_id, auth.uid())`** (pour `content_visibility='council_only'`). NB : l'ancien `user_is_council_member(copro_id)` (qui lisait `memberships.role`) est **ABANDONNÉ** au profit de `is_council_member(copro_id, user_id)` qui lit la table `council_members` (décision transverse AUTORISATION §4 + 04 §3/§5).

**Câblage préalable (dette identité, AUTORISATION §3) :** `coproprietaires.user_id` est NULL aujourd'hui → la branche copropriétaire est inerte tant que le mapping `auth.uid()` → `profiles`/`coproprietaires` n'est pas câblé. En attendant, seules les policies gestionnaire/service_role sont effectives ; aucune fuite (anon/copro tombent sur `false`).

**Principe transverse de visibilité.** La colonne `content_visibility` (mur + events) borne la lecture :
- `all_members` → tout membre de la copro (`user_has_copro_access`).
- `council_only` → gestionnaire OU membre du conseil (`is_council_member(copro_id, auth.uid())`).
- `managers_only` → gestionnaire uniquement.

| Table | SELECT | INSERT | UPDATE / DELETE | anon |
|---|---|---|---|---|
| **conversations** | `is_conversation_member(id, auth.uid())` | gestionnaire OU membre copro (ouvrir un fil) : `user_has_copro_access(copro_id)` | UPDATE : membre admin du fil (`is_admin`) OU `user_is_copro_manager` ; DELETE : gestionnaire | DENY |
| **conversation_members** | membre du même fil : `is_conversation_member(conversation_id, auth.uid())` | admin du fil OU gestionnaire (ajout de membre) ; self-insert à la création du fil par le créateur | UPDATE : soi-même (`user_id = auth.uid()`, pour `last_read_at`/`is_muted`) OU admin ; DELETE/`left_at` : soi OU admin | DENY |
| **messages** | `is_conversation_member(conversation_id, auth.uid())` | membre actif du fil : `is_conversation_member(...)` AND `author_id = auth.uid()` | UPDATE : auteur seul (édition `content`/`edited_at`) ; DELETE : auteur OU gestionnaire | DENY |
| **wall_posts** | visibilité (cf. principe) : `all_members`→access, `council_only`→CS/mgr, `managers_only`→mgr | membre copro : `user_has_copro_access(copro_id)` AND `author_id = auth.uid()` | UPDATE : auteur (hors épingle) OU gestionnaire ; épingle/`is_locked`/DELETE : gestionnaire | DENY |
| **wall_comments** | hérite de la visibilité du post (via `post_id`) | membre copro AND `author_id = auth.uid()` AND post `is_locked = false` | UPDATE : auteur ; DELETE : auteur OU gestionnaire | DENY |
| **wall_likes** | hérite de la visibilité du post | membre copro AND `user_id = auth.uid()` | DELETE : soi-même (`user_id = auth.uid()`) ; pas d'UPDATE | DENY |
| **events** | visibilité (cf. principe), comme `wall_posts` | gestionnaire only : `user_is_copro_manager(copro_id)` | gestionnaire only | DENY |
| **mails** | gestionnaire (`user_is_copro_manager(copro_id)`) OU propriétaire de la boîte : `owner_id = auth.uid()` | gestionnaire OU `owner_id = auth.uid()` ; webhook entrant via `service_role` (route `mail/inbound`) | gestionnaire OU `owner_id = auth.uid()` (lu/épinglé/archivé/soft-delete) | DENY |

`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` sur les 8 tables (corrige : 8/8 désactivées en live). En dev, le toggle `_rls_state_snapshot` (hors schéma métier) gère le OFF.

`service_role` : toutes tables → policy `USING (true) WITH CHECK (true)` réservée au rôle `service_role` (bypass explicite, branche du bicéphale). Indispensable pour `mails` : la route `app/api/mail/inbound` écrit les mails entrants Resend côté serveur (pas de session user) via `service_role`. `anon` = **aucun accès** sur tout le domaine (aucune surface publique messagerie/mur/boîte email).

---

## 4. TRIGGERS conservés / corrigés / nouveaux

**Conservés (réécrits si besoin pour le schéma cible) :**
- `update_conversation_last_message` (AFTER INSERT `messages`) → met à jour `conversations.last_message_at` + `last_message_preview` + `updated_at`, et incrémente `conversation_members.unread_count` pour tous les membres actifs **sauf l'auteur**. **Conservé.**
- `update_wall_post_comments_count` (AFTER INSERT/DELETE `wall_comments`) → `wall_posts.comments_count ± 1` (GREATEST 0). **Conservé.**
- `update_wall_post_likes_count` (AFTER INSERT/DELETE `wall_likes`) → `wall_posts.likes_count ± 1` (GREATEST 0). **Conservé.**
- `set_updated_at` **consolidé** (1 seule fonction) sur les tables porteuses d'`updated_at` : `conversations`, `wall_posts`, `wall_comments`, `events`, `mails`.

**Corrigé (dette / bug latent) :**
- Trigger `set_updated_at` sur **`messages`** → **SUPPRIMÉ**. `messages` n'a pas de colonne `updated_at` (elle a `edited_at`) ; le trigger live ciblait une colonne inexistante = erreur runtime potentielle sur UPDATE. L'édition est tracée par `edited_at`, posé par la RPC/applicatif, pas par `set_updated_at`.

**Nouveaux (comblent les dettes d'intégrité copro, manquantes au live) :**
- `trg_member_copro_consistency` (conversation_members) — `conversations.copro_id = copro_id`.
- `trg_message_copro_consistency` (messages) — `conversations.copro_id = copro_id`.
- `trg_comment_copro_consistency` (wall_comments) — `wall_posts.copro_id = copro_id`.
- `trg_like_copro_consistency` (wall_likes) — `wall_posts.copro_id = copro_id`.
- `trg_event_copro_consistency` (events) — `linked_ag_id`/`linked_service_order_id` (quand non-null) ∈ même copro.
- `trg_mail_copro_consistency` (mails) — `in_reply_to` (quand non-null) ∈ même copro (le mail parent doit appartenir à la même copro).

---

## 5. FONCTIONS du domaine — disposition

Toutes en `SET search_path = public`. Conformes à la liste GARDÉE par T1 §J.

| Fonction | Disposition | Garde cible (AUTORISATION) | Note |
|---|---|---|---|
| `is_conversation_member(conv_id, user_id = auth.uid())` → bool | **GARDER** | G-INTERNAL (DEFINER nécessaire RLS), `REVOKE anon` | Lit `conversation_members WHERE left_at IS NULL`. Helper canonique de la messagerie, branché en RLS (§3). Sa table cible est définie §1.2 (dette comblée). |
| `mark_conversation_read(conv_id)` → void | **GARDER (simplifier)** | G-OWNER (`is_conversation_member`), `REVOKE anon`, `GRANT authenticated` | UPDATE `conversation_members(last_read_at = now(), unread_count = 0)` pour `auth.uid()` ; append `auth.uid()` dans `messages.read_by` des messages du fil non encore lus. **Source de vérité du « lu » = `last_read_at`** ; `read_by` = accusé fin (qui a lu). |
| `update_conversation_last_message()` (trigger) | **GARDER** | G-TRIG (`REVOKE PUBLIC, anon, authenticated`) | AFTER INSERT messages. Maintient `conversations.last_*` + `conversation_members.unread_count`. |
| `update_wall_post_comments_count()` (trigger) | **GARDER** | G-TRIG | AFTER INSERT/DELETE wall_comments. |
| `update_wall_post_likes_count()` (trigger) | **GARDER** | G-TRIG | AFTER INSERT/DELETE wall_likes. |

**Transverse domaine** : toute RPC d'écriture (`mark_conversation_read` + futures `post_message`, `create_conversation`, `toggle_wall_like`…) hérite du patron deny-by-default : `REVOKE EXECUTE FROM anon, public`, `GRANT authenticated` (+ `service_role` si appel machine), garde in-function (`is_conversation_member` / `user_has_copro_access` / `user_is_copro_manager` selon le cas). Aucune fonction de campagne (`create_mail_system_folders`, `generate_campaign_recipients`, `update_mail_campaign_stats`) n'est reconduite (DROP avec le bloc mail).

**Vues du domaine** (gardées, repointées sur le schéma cible) : `v_conversations_overview`, `v_conversation_messages`, `v_wall_feed` (dérive le rôle auteur à la volée — désormais l'unique source du rôle, la colonne `author_role` étant supprimée), `v_events_overview`. Toutes s'appuient sur `auth.uid()` (`is_mine` / `is_liked_by_me` / `my_unread_count`). Les vues `v_mail_*` ne sont PAS reconduites.

---

## 6. CARTE DE MIGRATION (boucle d'or 22222222 + immuable 11111111)

**Aucune donnée à reprendre pour ce domaine.** Les lignes live des 7 tables messagerie/mur/agenda (conversations, conversation_members, messages, wall_posts, wall_comments, wall_likes, events) sont rattachées à la copro **`AA-2024-00001`**, hors périmètre de migration (≠ 22222222, ≠ 11111111). `mails` = **0 ligne** en live (boîte email câblée mais jamais alimentée). Cadre verrouillé ⇒ données jetables → **structure cible créée, 0 ligne migrée** (mails compris).

**Ce qui est créé en structure (pas en données) :**
- 8 tables (§1) avec FK + CASCADE, UNIQUE (membre, like), CHECK (dates events, compteurs ≥ 0, self-parent), index couvrants pour les feeds + la boîte email (`mails`, §1.8).
- Enum `message_type` (§2).
- Triggers de compteur / last_message + 6 triggers d'intégrité copro (dont `trg_mail_copro_consistency`) + `set_updated_at` consolidé (§4, sur `mails` inclus) ; **retrait** du `set_updated_at` sur `messages`.
- RLS ON + FORCE + policies 3 rôles + branche `service_role` (§3) — y compris sur `mails` (gestionnaire/owner/anon-deny + `service_role` pour le webhook entrant).
- Fonctions gardées (§5) avec gardes deny-by-default.

**Ce qu'on NE reprend PAS (dette legacy nettoyée) :**
- Colonnes snapshot non synchronisées : `messages.sender_name`, `conversation_members.user_name`/`user_role`, `wall_posts.author_name`/`author_role`, `wall_comments.author_name`.
- Doublons : `messages.attachments` (jsonb), `messages.is_edited`.
- Trigger `set_updated_at` sur `messages` (colonne cible inexistante).
- Le bloc **campagnes** `mail_*` (`mail_campaigns`, `mail_recipients`, `mail_inbox`, `mail_templates`, `mail_folders`, `mail_labels_v2`) + fonctions/vues associées (DROP par décision USER). **`mails` NON concernée** : gardée comme 8ᵉ table (§1.8, boîte email transactionnelle Resend câblée au front).
