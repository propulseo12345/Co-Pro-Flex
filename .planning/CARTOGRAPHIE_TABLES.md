# CARTOGRAPHIE DES TABLES — CoProFlex (base `iyfesbjnkpynmwlsmxnp`)

> **Lecture seule. Aucune modification appliquée.** Produit le 2026-06-02 par un workflow de 13 agents (cartographie par domaine + critique adversariale), sur la base live + les 121 fichiers `supabase/migrations/` + `src/`.
> **Comptages vérifiés** (re-contrôlés en direct après le workflow) : 87 tables, 81 vues, 0 vue matérialisée, 185 fonctions, **72/87 tables RLS off** (volontaire phase dev). Les volumes de lignes ci-dessous sont les comptages exacts `COUNT(*)` confirmés.
> ⚠️ **Fiabilité** : les sous-agents n'ont pas tous pu interroger le MCP Supabase ; un agent a produit un « recompte » faux (documents=10, lots=18…) — **ignoré**, les vrais comptages sont stables et vérifiés. Les verdicts reposent sur le Grep des fichiers (fiable) + les comptages pré-collectés.

---

## 0. Légende des rôles

| Rôle | Sens |
|---|---|
| **canonical** | table vivante et utilisée (la bonne pour ce concept) |
| **legacy** | remplacée par une autre, vestige à déprécier |
| **dead-suspect** | candidate à suppression (0 usage front + DB) |
| **seed-only** | remplie uniquement par le seed, jamais par l'app |
| **future-unused** | structure prête, feature pas encore branchée (≠ morte) |
| **utility** | technique/dev (hors métier) |

---

## 1. À SUPPRIMER / TRANCHER EN PRIORITÉ (le plus actionnable)

| Table | Lignes | Verdict | Action |
|---|---:|---|---|
| **`lot_accounts`** | 21 | **legacy — vestige du modèle compte-par-lot ABANDONNÉ** | `DROP` après grep edge functions, puis régénérer `supabase.ts`. 0 FK entrante, 0 `.from()` front (hors types générés), 0 RPC/vue/trigger. Remplacé par `accounts(450-x)` + dimension `ledger_entries.lot_id`. |
| **`mail_labels_v2`** | 0 | **dead-suspect — refonte communication avortée** | `DROP`. Seule table `_v2` réellement créée (les `wall_*_v2`/`mail_folders_v2` annoncées par un agent **n'existent pas** en base). |
| **`document_versions`** | 0 | **legacy — versioning bicéphale** | Le versioning réel est porté par `documents.version/parent_document_id/is_current_version` ; le service front est 100 % mock. `DROP` **ou** basculer le versioning dessus — pas les deux. |
| **`ag_notification_events`** | 0 | **chaîne morte** | Dépend de `ag_notifications` (vide, jamais écrite). À supprimer avec elle si le tracking reste sur `ag_envoi_tracking`. |
| Système campagnes : **`mail_inbox`** (2), `mail_campaigns` (2), `mail_recipients` (9), `mail_folders` (5), `mail_templates` (3) | — | **legacy orphelin** | Lus seulement par `lib/mail/api.ts → useMailData`, **consommé par aucune page**. `mail_inbox` doublonne `mails`. Déprécier l'ensemble (garder `email_templates`, branché finance). |
| **`_rls_state_snapshot`** | 69 | **utility dev** | Outillage de bascule RLS. Retirer au go-live, hors baseline prod. |

> **Doublon métier à relier (pas à fusionner)** : `suppliers` (facturation 401) vs `providers` (maintenance, 35 cols). Axes distincts, mais contact/SIRET/IBAN dupliqués **sans aucune FK**. → ajouter `providers.supplier_id` (FK nullable), `suppliers` = source unique du contact/IBAN.

---

## 2. Domaine — Structure & tenancy & plan comptable

| Table | Lignes | RLS | Rôle | Note |
|---|---:|:--:|---|---|
| `copros` | 9 | off | canonical | Tenant racine ; FK `copro_id` partout (76 FK entrantes). |
| `memberships` | 12 | off | canonical | user↔copro + rôle. |
| `profiles` | 5 | off | canonical | Compte de connexion (auth.users). |
| `buildings` | 3 | off | **seed-only** | Dimension réelle (FK lots/OS) mais **jamais administrée par l'UI** (feature multi-bâtiment non branchée). |
| `lots` | 48 | off | canonical | Unité de gestion lot-centric. |
| `lot_owners` | 48 | off | canonical | Junction datée lot↔copro (mutations). |
| `coproprietaires` | 43 | off | canonical | Personne phys/morale (`user_id` optionnel). |
| `repartition_keys` | 23 | off | canonical | Clés art.10. |
| `repartition_key_lines` | 161 | off | canonical | Poids par lot ; **source unique cible** des tantièmes. |
| `lot_accounts` | 21 | off | **legacy** | ⛔ Vestige compte-par-lot (cf. §1). |
| `accounts` | 491 | off | canonical | Plan comptable ; chapeau 450 + 450-1..5. |
| `accounting_periods` | 16 | off | canonical | Exercices open/closed/approved. |

**Points chauds :**
- **Triple expression `user↔copro`** : `profiles` (connexion) + `memberships.role` (droits) + `coproprietaires.user_id` (patrimoine). Distinction légitime mais 3 points de désync possibles — vigilance pour l'invitation/portail copropriétaire.
- **Redondance de poids (majeur)** : `lots.tantiemes_generaux/escalier/ascenseur/chauffage` **non synchronisés** avec `repartition_key_lines.weight`. Cible = `repartition_key_lines` ; `lots.tantiemes_*` → vue/cache via trigger. `repartition_key_lines` n'a **pas de CHECK de somme** → totaux aberrants observés (124, 1029, 1473) et clés `all_lots` incomplètes ventilées silencieusement.
- **Vestige d'état** : `accounting_periods.status='locked'` (modèle de verrou abandonné WP5.2) encore présent dans le type front — aligner sur `open/closed/approved`.
- **Dette de reproductibilité** : `copros/memberships/profiles/buildings/lots/lot_owners/coproprietaires` n'ont **aucun `CREATE TABLE` dans le dépôt** (socle créé hors-repo) → générer une baseline `pg_dump` schema-only.

---

## 3. Domaine — Finance / Grand livre / Appels / Paiements

| Table | Lignes | RLS | Rôle | Note |
|---|---:|:--:|---|---|
| `ledger_transactions` | 94 | off | canonical | En-tête, immuable après posting. |
| `ledger_entries` | 316 | off | canonical | Lignes D/C, dimension `lot_id` sur 45x. |
| `budgets` | 20 | off | canonical | courant/travaux/ALUR. |
| `budget_lines` | 75 | off | canonical | Prévu (compte + clé). |
| `budget_expenses` | 8 | off | canonical | Engagé/réalisé (D6xx/C401). |
| `budget_payment_schedules` | 0 | **on** | **future-unused** | Branchée front, 0 ligne ; **RLS pattern divergent** (`memberships` au lieu de `user_has_copro_access`). |
| `call_for_funds` | 39 | off | canonical | Appels art.14-1. |
| `call_for_funds_lines` | 505 | off | canonical | Détail par lot, support FIFO. |
| `payments` | 22 | off | canonical | Paiements copro (lot-centric, idempotence cr5). |
| `payment_allocations` | 86 | off | canonical | Ventilation FIFO (gérée par `allocate_payment` seul). |
| `bank_movements` | 6 | off | canonical | Mouvements bruts (KPI trésorerie). |
| `bank_matches` | 0 | off | **future-unused** | Rapprochement jamais branché ; `refresh_bank_movement_status` orpheline ; FK polymorphe non contrainte. |
| `supplier_invoices` | 10 | off | canonical | Factures (brouillon→posted, D6xx/C401). |
| `supplier_invoice_lines` | 6 | off | canonical | Ventilation par compte 6xx + clé. |
| `supplier_payments` | 5 | off | canonical | D401/C512. |
| `suppliers` | 5 | off | canonical | Fournisseurs 401 (cf. doublon métier `providers`, §1). |
| `providers` | 13 | off | canonical | Prestataires maintenance (cf. §1). |

**Points chauds :**
- **Double chemin d'écriture du grand livre (majeur)** : RPC durcies (cr3, cr5) **ET** INSERT directs `ledger_transactions/ledger_entries/call_for_funds` depuis le front (`onboarding/api.ts`, `Step6AgAppels.tsx`). Le front peut **contourner les gardes RPC** → interdire les INSERT directs, router 100 % par RPC.
- **Double saisie de dépense fournisseur (majeur)** : `validate_budget_expense` **et** `post_supplier_invoice` écrivent tous deux D6xx/C401 → risque de **double comptabilisation** de la même charge si les deux flux visent le même réalisé (via `budget_line_id`). Trancher un flux unique.
- `budgets/budget_lines` également **sans `CREATE TABLE` tracké** (niveau2c hors-repo).

---

## 4. Domaine — ALUR / Emprunts / Trésorerie / Contentieux / Cut-off / PPT

| Table | Lignes | RLS | Rôle | Note |
|---|---:|:--:|---|---|
| `alur_transfers` | 0 | on | canonical | Écrite par `useALURData`, 0 ligne. **Aucune écriture GL** (pas de `posting_tx_id`). |
| `collective_loans` | 1 | on | seed-only | Lecture seule, hors GL. |
| `collective_loan_shares` | 6 | on | seed-only | Quote-part figée en montant (≠ clé de répartition). |
| `treasury_advances` | 12 | on | seed-only | `owner_id` redondant avec `lot_owners`. |
| `legal_proceedings` | 1 | on | **future-unused** | Front 100 % mock (`MOCK_LITIGES`). Trancher vs `dossiers` avant câblage. |
| `period_cutoff_items` | 5 | off | canonical | Cut-off 408/486 (WP5.2), **piloté par RPC, pas d'UI**. |
| `planned_works` | 0 | on | **future-unused** | PPT art.14-2 ; FK `ag_id`/`resolution_id` manquantes (UUID nus). |

**Point chaud (majeur) — Finance hors grand livre** : emprunts, avances et transferts ALUR portent des montants qui **ne génèrent aucune écriture en partie double** et n'apparaissent dans aucun sous-compte 45x → contredit la compta d'engagement (GL = source légale) et la règle ALUR (D450-5/C105). **Données non auditables.** Décider du rattachement GL. Les 4 tables n'ont aussi **aucune migration de création** (hors-repo).

---

## 5. Domaine — Assemblées générales (AG)

| Table | Lignes | RLS | Rôle | Note |
|---|---:|:--:|---|---|
| `ag_meetings` | 17 | off | canonical | Table pivot ; porte aussi `step_data/current_step` (wizard). |
| `ag_resolutions` | 54 | off | canonical | `linked_budget_id`/`linked_work_budget_id` = vestiges (liaison réelle via `source_ag_id`+`ag_pending_actions`). |
| `ag_votes` | 135 | off | canonical | Source unique des votes. |
| `ag_attendance` | 28 | off | canonical | `lot_ids[]` dénormalisé (pas de FK). |
| `ag_pouvoirs` | 0 | on | **future-unused** | Branchée RPC, 0 ligne ; colonnes `*_tantiemes` mortes. |
| `ag_correspondence_votes` | 1 | off | canonical | Colonne `status` redondante avec `integration_status`. |
| `ag_correspondence_vote_details` | 14 | **on** | canonical | RLS on alors que la mère est off (incohérence). |
| `ag_notifications` | 0 | off | **future-unused** | ⚠️ Doublon avec `ag_envoi_tracking` (cf. ci-dessous). |
| `ag_notification_events` | 0 | off | **dead-suspect** | Chaîne morte (cf. §1). |
| `ag_envoi_tracking` | 18 | on | canonical | **Système réellement utilisé** ; FK `document_id` manquante. |
| `ag_pending_actions` | 21 | on | canonical | Cœur du pilier AG→données copro ; **pas de `CREATE TABLE` tracké**. |
| `ag_session_drafts` | 22 | off | canonical | Brouillons session serveur. |
| `ag_milestones` | 0 | on | **future-unused** | Jalons, 0 ligne. |

**Points chauds :**
- **Deux systèmes de tracking d'envoi en doublon** (à fusionner) : `ag_notifications`(+`_events`) riche mais **vide/jamais écrit** vs `ag_envoi_tracking` plat et **réellement utilisé** (18 lignes). Trancher : garder `ag_envoi_tracking` (+ FK `document_id` + conservation 10 ans) et `DROP ag_notifications`+`ag_notification_events`, **ou** rebrancher l'écriture sur `ag_notifications`.
- **Trois stockages d'état d'avancement AG** : `ag_session_drafts` (canonique) / `ag_meetings.step_data` (inline) / `ag_milestones` (vide). Chevauchement conceptuel.
- **Doublon de procuration** : `ag_pouvoirs` (justificatif) vs `ag_attendance.represented_by_id/proxy_document_id` (effet quorum) — non reliées par FK.
- **Fonction dupliquée** : `clear_ag_session_drafts` définie **2 fois** avec sémantiques divergentes (RETURNS INTEGER toute-l'AG vs RETURNS JSONB par-user) — la 2e écrase la 1re → purge ambiguë.

---

## 6. Domaine — GED / Documents / Assurance

| Table | Lignes | RLS | Rôle | Note |
|---|---:|:--:|---|---|
| `documents` | 51 | off | canonical | Pivot GED (40 cols). |
| `document_folders` | 56 | off | canonical | Arborescence (dont dossiers système). |
| `document_links` | 29 | off | canonical | Liens polymorphes (type non contraint). |
| `document_access` | 0 | off | **future-unused** | Partage fin branché, 0 ligne. |
| `document_versions` | 0 | off | **dead-suspect** | Versioning bicéphale (cf. §1). |
| `council_documents` | 0 | off | **future-unused** | Jonction doc↔CS (≠ stockage concurrent). |
| `technical_documents` | 0 | off | **future-unused** | Carnet d'entretien art.18 (référence `documents`). |
| `insurance_policies` | 0 | **on** | **future-unused** | Extension de `contracts` (assurance). |

**Points chauds :**
- **Double taxonomie de type** sur `documents` : `document_type` (enum, base) **et** `category` (enum, utilisé par triggers + vues stats). Unifier.
- **Vues communication cassées (majeur)** : `v_council_documents_overview` et `v_conversation_messages` joignent `doc.nom/doc.type/doc.fichier_url/doc.fichier_taille` — **colonnes inexistantes** (le réel = `name/storage_path/file_size`). Vestige d'un schéma FR antérieur, à réaligner.
- **Redondance de visibilité CS** : `documents.confidentiality='council'` recouvre `council_documents.content_visibility='council_only'` → choisir un seul mécanisme.
- ⚠️ **Nuance adversariale** : un agent a annoncé un « bug latent » (`documents.lot_id/coproprietaire_id` manquants cassant `user_can_view_document`). **Le critique a vérifié : ces colonnes EXISTENT bien en live** → pas un bug bloquant, juste une dette de traçabilité (définition hors migrations).

---

## 7. Domaine — Communication / Mail / Messagerie / Mur / Conseil / Événements

| Table | Lignes | RLS | Rôle | Note |
|---|---:|:--:|---|---|
| `mails` | 0 | off | canonical | Boîte Resend unifiée (page `/communication/mail`), 0 ligne. |
| `mail_inbox` | 2 | off | **legacy** | Doublon de `mails` (cf. §1). |
| `mail_campaigns` | 2 | off | **legacy** | Système campagnes orphelin. |
| `mail_folders` | 5 | off | **legacy/seed** | idem. |
| `mail_labels_v2` | 0 | off | **dead-suspect** | Refonte avortée (cf. §1). |
| `mail_recipients` | 9 | off | **legacy** | idem campagnes. |
| `mail_templates` | 3 | off | **legacy** | Doublon de **nommage** avec `email_templates` (périmètres distincts). |
| `email_templates` | 6 | off | canonical | Modèles de relances impayés (FK `payment_reminder_rules`). |
| `conversations` | 1 | off | canonical | Messagerie privée. |
| `conversation_members` | 2 | off | canonical | — |
| `messages` | 5 | off | canonical | Chat privé (≠ `mails`). |
| `wall_posts` | 4 | off | canonical | Mur (doublon no-op `wall_posts_v2` **inexistant** en base). |
| `wall_comments` | 3 | off | canonical | — |
| `wall_likes` | 3 | off | canonical | — |
| `events` | 2 | off | **future-unused** | Agenda non câblé (seule réf = couche orpheline). |
| `council_members` | 4 | off | canonical | CS art.21 (doublon FR `membres_conseil_syndical` **imaginaire** — n'existe pas en base). |
| `council_decisions` | 2 | off | canonical | Liens AG souples (FK manquantes). |
| `council_votes` | 2 | off | **future-unused** | Mécanique de vote CS prête, sans écran. |

**Points chauds :**
- **Refonte communication avortée = cause racine** : `20260330_communication_refonte.sql` (CREATE TABLE IF NOT EXISTS) n'a pris effet que pour les tables brand-new `_v2` → en base, **seule `mail_labels_v2` existe** (les `wall_*_v2`/`mail_folders_v2` n'ont jamais été créées). Deux patterns SQL coexistent pour `conversations/messages/wall_*`.
- **Trois systèmes de mail** : `mails` (canonique Resend) / système campagnes (orphelin) / `email_templates` (relances). L'envoi de masse est déjà couvert par `ag_notifications` + `payment_reminders`.
- **Couche data-layer orpheline** : `lib/communication/api.ts` + `useCommunicationData` (lit les vues `v_*`) **branchée par aucune page** → supprimer ou rebrancher. C'est la seule chose qui référence `events`.

---

## 8. Domaine — Maintenance / Mutations / Relances / Divers

| Table | Lignes | RLS | Rôle | Note |
|---|---:|:--:|---|---|
| `contracts` | 12 | off | canonical | FK `ag_id`/`resolution_id` manquantes. |
| `service_orders` | 2 | off | canonical | FK AG manquantes ; dates `*_at` redondantes avec events. |
| `service_order_events` | 7 | off | canonical | Journal de transitions (peu lu). |
| `logbook_entries` | 4 | off | canonical | Carnet art.18 (FK circulaire avec `service_orders`). |
| `mutations` | 1 | off | canonical | Ventes art.20 (lot-centric). |
| `mutation_steps` | 0 | off | canonical | Workflow mutation, 0 ligne (peu rodé). |
| `etat_date_snapshots` | 2 | off | canonical | États datés figés ; `document_id` non peuplé. |
| `payment_reminders` | 3 | **on** | canonical | UNIQUE douteuse + `owner_id` via `lots.owner_id` (cf. ci-dessous). |
| `payment_reminder_rules` | 27 | **on** | canonical | Paliers J+7/J+30/J+60. **Pas un doublon** de `reminder_settings`. |
| `reminder_settings` | 9 | **on** | canonical | Interrupteur pause global par copro (PK=copro_id). |
| `dossiers` | 12 | **on** | **dead-suspect (drift)** | **Aucune migration** ; front la requête en `any` avec fallback « table absente ». À régulariser. |
| `_rls_state_snapshot` | 69 | off | **utility** | Outillage dev (cf. §1). |

**Points chauds :**
- **`payment_reminders.owner_id` via `lots.owner_id`** : `get_pending_reminders_to_send` fait `LEFT JOIN coproprietaires ON c.id = l.owner_id` — or **`lots.owner_id` n'existe pas** (vérifié). Fonction probablement cassée **et** contredit le modèle lot-centric (propriétaire courant via `lot_owners`). À corriger.
- **`UNIQUE(lot_id, delay_level, status)`** sur `payment_reminders` : inclure `status` autorise plusieurs relances actives par niveau → index partiel `WHERE status IN ('pending','sent')`.
- **`dossiers`** : drift de schéma (créée hors-repo) ; trancher si un litige (`legal_proceedings`) est un type de `dossier` avant de câbler le contentieux.

---

## 9. Problèmes de logique transverses (synthèse critique)

| Sévérité | Problème | Tables |
|:--:|---|---|
| **majeur** | Double chemin d'écriture GL (RPC durcies vs INSERT directs front) | `ledger_transactions`, `ledger_entries`, `call_for_funds` |
| **majeur** | Double comptabilisation possible d'une charge (dépense budgétaire vs facture) | `budget_expenses`, `supplier_invoices` |
| **majeur** | Double source de vérité des poids (non synchronisée, sans CHECK) | `lots.tantiemes_*` vs `repartition_key_lines` |
| **majeur** | Finance hors grand livre (montants sans écriture partie double) | `alur_transfers`, `collective_loans`, `treasury_advances` |
| **majeur** | FK manquantes vers AG/résolutions (UUID nus) | `contracts`, `service_orders`, `planned_works`, `events`, `council_decisions` |
| **majeur** | `lots.owner_id` inexistant utilisé par `get_pending_reminders_to_send` | `payment_reminders` |
| **majeur** | Vues GED joignant des colonnes FR inexistantes | `v_council_documents_overview`, `v_conversation_messages` |
| **majeur** | Drift de schéma : table en prod sans migration | `dossiers` (+ socle structure, budgets, `ag_pending_actions`) |
| mineur | `UNIQUE(...,status)` autorisant plusieurs relances actives | `payment_reminders` |
| mineur | Fonction `clear_ag_session_drafts` dupliquée (sémantiques divergentes) | — |
| mineur | Incohérence RLS mère/fille + colonne `status` redondante | `ag_correspondence_votes` / `_details` |
| mineur | FK polymorphe non contrainte | `bank_matches` |

---

## 10. RLS & go-live portail copropriétaire

72/87 tables RLS **off** (volontaire dev, non compté comme défaut). 15 déjà **on** : `ag_correspondence_vote_details`, `ag_envoi_tracking`, `ag_milestones`, `ag_pending_actions`, `ag_pouvoirs`, `alur_transfers`, `budget_payment_schedules`, `collective_loans`, `collective_loan_shares`, `dossiers`, `insurance_policies`, `legal_proceedings`, `planned_works`, `technical_documents`, `treasury_advances`.

**Critiques à réactiver/auditer en priorité au go-live** : (1) `documents`/`document_access`/`document_links` ; (2) `ledger_entries`/`ledger_transactions`/`call_for_funds_lines`/`payments`/`payment_allocations` (un copro ne voit que ses lots) ; (3) `coproprietaires`/`lots`/`lot_owners`/`memberships`/`profiles` (cloisonnement tenant) ; (4) `ag_votes`/`ag_attendance`/`ag_pouvoirs` (secret du vote) ; (5) `messages`/`conversations`/`wall_*`.

**Incohérences de pattern à harmoniser** : `budget_payment_schedules` (policies sur `memberships`) vs reste finance (`user_has_copro_access`/`user_is_copro_manager`) ; mère `ag_correspondence_votes` (off) vs fille (on).

---

## 11. Dette de reproductibilité du schéma (transverse)

Tables **présentes en base mais sans `CREATE TABLE` dans `supabase/migrations/`** (créées hors-repo via UI/CLI) → un replay des migrations ne les recréerait pas :
`copros`, `memberships`, `profiles`, `buildings`, `lots`, `lot_owners`, `coproprietaires`, `budgets`, `budget_lines`, `repartition_keys`, `ag_pending_actions`, `dossiers`, `collective_loans`, `collective_loan_shares`, `treasury_advances`, `legal_proceedings`.

**Recommandation** : générer une migration **baseline** (`pg_dump --schema-only`) pour resynchroniser dépôt ↔ base avant tout reset/replay.

---

## 12. Écarts/erreurs de l'audit lui-même (transparence)

- **Comptages de lignes** : un agent a annoncé un « recompte live » faux (documents=10, lots=18, accounting_periods=8…). **Re-vérifié en direct : faux** — les vrais comptages sont stables (documents=51, lots=48, accounting_periods=16…). Probablement parce que les sous-agents n'ont pas tous pu atteindre le MCP. **Les comptages de ce document sont les corrects.**
- **`wall_posts_v2`/`wall_comments_v2`/`wall_likes_v2`/`mail_folders_v2`** : annoncées « à supprimer » par l'agent communication → **n'existent pas** en base (seule `mail_labels_v2` existe). Confirmé par l'inventaire maître.
- **`membres_conseil_syndical`** (doublon FR du CS) : **n'existe pas** en base. Doublon imaginaire — retirer du backlog.
