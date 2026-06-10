# Domaine 03 — Budgets / Appels de fonds / ALUR / Impayés — **SCHÉMA CIBLE (blueprint)**

> Conçu 2026-06-04. Forme idéale (PAS une photo du live). Cadre verrouillé par décisions USER.
> Source des faits : cartographie `_cartographie/03-budgets-appels-impayes.md` + T1/T2/T3 + **vérifications live lecture seule** (project `iyfesbjnkpynmwlsmxnp`).
> **PAS de reprise du live (décision A1, verrou USER)** : COPRO-TEMPLATE propre construite de A à Z via la chaîne canonique, qui remplace l'ex-boucle d'or 22222222 et l'ex-immuable 11111111. Le schéma fait foi, pas l'historique. Voir §6.
> **Articulation forte avec le domaine 02 (grand livre)** : ce domaine PRODUIT les gestes métier (budget voté, appel émis, dépense réalisée, relance) qui se traduisent en écritures via les posteurs canoniques de 02. Le GL reste la **source unique** ; ce domaine ne fait jamais autorité sur un solde.

---

## 0. Principe directeur du domaine

Le **cœur appel de fonds** (`budgets` / `budget_lines` / `call_for_funds` / `call_for_funds_lines`) est **BIEN FAIT** : lot-centric, agrégé multi-clés, contraintes d'intégrité fortes, chaîne canonique qui poste le grand livre. On **NETTOIE et DURCIT**, on ne réécrit pas le noyau. La périphérie (surcharges, triggers concurrents, index dupliqué, FK `auth.users`) est élaguée. (`alur_transfers` ET `budget_payment_schedules` semblaient mortes mais sont des **faux-morts câblés** — conservées, voir §1.9 / §1.10.)

Flux canonique (le SEUL chemin conservé) :

```
  AG approuvée
     │  prepare_ag_decisions → activate_ag_decisions  (domaine 04)
     ▼
  validate_budget(budget_id)            → budgets.status='validated' (1 seul validé par copro×période×type)
     │
     ▼
  generate_calls_from_ag_payload(...)   → découpe annuel/semestriel/trimestriel
     │  délègue en boucle à ▼
  post_budget_call_for_funds(10 args)   → INSERT call_for_funds (status 'issued') + call_for_funds_lines (1/lot×clé, weight_snapshot figé)
     │                                     → create_ledger_transaction('call_for_funds') : D450-x/lot AGRÉGÉ · C701/702/105 total
     │                                     → UPDATE call_for_funds.ledger_tx_id           (domaine 02)
     ▼
  encaissement : post_owner_payment → allocate_payment (FIFO cloisonné par nature)
     │  AFTER : trg_allocation_update_line met à jour call_for_funds_lines.amount_paid
     │  trigger statut ligne → trigger statut en-tête
     ▼
  impayés : get_pending_reminders_to_send → create_payment_reminder → mark_reminder_sent/failed
```

Règle d'or réaffirmée : `call_for_funds_lines` n'est **PAS** la source du solde copropriétaire (c'est le GL). C'est un **intrant** (montant appelé, montant imputé) qui pilote relances et statuts d'appel ; le solde se dérive du GL (450-x/lot) côté domaine 02.

---

## 1. TABLES (schéma cible)

Conventions communes (alignées domaines 02/04) :
- `id uuid PK DEFAULT gen_random_uuid()`.
- `copro_id uuid NOT NULL → copros(id)` — **ON DELETE CASCADE conservé** ici (contrairement au GL en RESTRICT) : budgets/appels sont des objets de gestion rattachés à la copro, pas le grand livre légal. Le GL (domaine 02) garde RESTRICT.
- Horodatage `created_at` / `updated_at` via le **trigger générique unique `set_updated_at()`** (T2 §3.1).
- Index `copro_id` systématique (filtrage RLS).

| Table cible | Rôle | Décision |
|---|---|---|
| `budgets` | Budget annuel par (copro, période, type, version) | **REPRISE + durcissement** |
| `budget_lines` | Ligne = compte de charge × clé de répartition | **REPRISE** |
| `budget_expenses` | **Table maître** du cycle de dépense (engagement → réalisé D6xx/C401 → payé) | **REPRISE + CHECK montant** |
| `call_for_funds` | En-tête d'appel agrégé multi-clés | **REPRISE** |
| `call_for_funds_lines` | Quote-part lot×clé (cœur lot-centric) | **REPRISE + dédup index + fusion triggers** |
| `payment_reminder_rules` | Règles de relance (paliers J+N) | **REPRISE + FK→profiles** |
| `payment_reminders` | Instance de relance émise | **REPRISE + FK→profiles** |
| `email_templates` | Modèles d'e-mail système (relances + AG) | **REPRISE telle quelle** (table de référence GLOBALE, foyer ICI) — voir §1.11 |
| `reminder_settings` | Pause des relances (singleton/copro) | **REPRISE telle quelle** |
| `budget_payment_schedules` | Échéancier paiement travaux | **CONSERVÉE** (faux-mort câblé : `usePaymentSchedule.ts` + `TravauxDetailModal.tsx` + 2 pages dashboard) — voir §1.9 / §7-A4 |
| `alur_transfers` | Transfert fonds ALUR | **CONSERVÉE** (faux-mort câblé : 2 vues + hook front) — voir §1.10 / §7-A5 |

### 1.1 `budgets` — budget annuel (cœur)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros CASCADE |
| period_id | uuid | NO | — | FK accounting_periods **RESTRICT** (on ne supprime pas une période budgétée) |
| budget_type | `budget_type` | NO | — | current / works / alur |
| status | `budget_status` | NO | 'draft' | **enum rationalisé — voir §2** |
| version | int | NO | 1 | |
| name | text | YES | — | |
| notes | text | YES | — | |
| source_ag_id | uuid | YES | — | FK ag_meetings (traçabilité auto-population) |
| created_by | uuid | YES | — | FK profiles SET NULL |
| validated_by | uuid | YES | — | FK profiles SET NULL |
| validated_at | timestamptz | YES | — | |

- **UNIQUE** `budgets_copro_period_type_version_unique (copro_id, period_id, budget_type, version)` — conservée.
- **NOUVEAU UNIQUE partiel** `(copro_id, period_id, budget_type) WHERE status='validated'` — matérialise en contrainte déclarative l'invariant « un seul budget validé par copro×période×type » aujourd'hui vérifié seulement applicativement dans `validate_budget`. Plus robuste qu'un check en fonction.
- Index : `(copro_id)`, unique, `(copro_id, period_id, budget_type, status)`, `(period_id, status)`.
- Triggers : `set_updated_at`. (aucun trigger métier — le workflow vit dans les fonctions `submit_budget`/`validate_budget`.)

### 1.2 `budget_lines` — ligne budgétaire (compte × clé)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| budget_id | uuid | NO | — | FK budgets CASCADE |
| copro_id | uuid | NO | — | FK copros CASCADE |
| account_id | uuid | NO | — | FK accounts **RESTRICT** (compte de charge classe 6) |
| repartition_key_id | uuid | NO | — | FK repartition_keys **RESTRICT** |
| label | text | NO | — | |
| amount | numeric(14,2) | NO | — | CHECK `>= 0` |
| code | text | YES | — | |
| sort_order | int | YES | 0 | |

- Pas d'UNIQUE (plusieurs lignes possibles sur même compte×clé volontaire).
- Index : `(budget_id)`, `(account_id)`, `(copro_id)`.
- Trigger : `set_updated_at` ; **`check_budget_line_copro_consistency`** (BEFORE I/U) — garde-fou : `copro_id` de la ligne = celui du budget parent. **CONSERVÉ** (cf. T1, déjà référencé par domaine 02 §4).

### 1.3 `budget_expenses` — dépense (table MAÎTRE du cycle d'engagement)

> **Domaine propriétaire = 03 (ICI) — SOURCE UNIQUE de la définition.** Cette table est la **table maître** du suivi de dépense ; le domaine 02 ne la **redéfinit plus** (sa §1.14 est une simple RÉFÉRENCE « voir 03 », sans colonnes). Arbitrage FK tranché en faveur de l'argument 02 : une dépense reliée au grand livre (`ledger_tx_id`) **ne se supprime pas** par cascade depuis la copro ou le budget → `copro_id`/`budget_line_id` en **RESTRICT** (pas CASCADE).

**Requalifiée en ENGAGEMENT** (mémoire `compta_engage_realise` : « budget_expenses à requalifier en engagement »). Elle porte le **cycle complet de la dépense en 4 paliers** :

| palier | sémantique | trace |
|---|---|---|
| **voté** | montant inscrit au budget (référence) | `budget_lines.amount` (extra-comptable) |
| **engagé** | commande/devis engagé sur la ligne — réservation budgétaire **extra-comptable** (pas encore une charge) | `budget_expenses.status='draft'/'pending_validation'` (engagement) |
| **réalisé** | charge constatée (droit constaté art.14-3) = **écriture GL classe 6** **D[compte charge de la ligne] / C401** posée par `validate_budget_expense` ; cut-off 408/486 si la période est fermée | `budget_expenses.status='validated'` + `ledger_tx_id` renseigné (immuable) |
| **payé** | règlement du fournisseur **D401/C512** | chaîne `supplier_payments` (domaine 02/07) |

> Le statut `expense_status {draft, pending_validation, validated, rejected}` matérialise la montée engagé→réalisé ; le palier « réalisé » est l'unique moment où la dépense **entre au grand livre** (avant, c'est de l'engagement extra-comptable). Cette table est donc l'aboutissement métier consommé par le posteur `validate_budget_expense` du domaine 02.

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros **RESTRICT** (dépense reliée au GL, on ne la supprime pas en cascade — arbitrage tranché côté 02) |
| budget_id | uuid | NO | — | FK budgets **RESTRICT** |
| budget_line_id | uuid | NO | — | FK budget_lines **RESTRICT** |
| label | text | NO | — | |
| amount | numeric(14,2) | NO | — | **NOUVEAU CHECK `> 0`** (manquant en live — corrige dette §3.8 carto) |
| montant_ht | numeric(14,2) | YES | — | métadonnée facture |
| taux_tva | numeric(5,2) | YES | — | (TVA non récup, mémoire `facture_fournisseur_model`) |
| tx_date | date | NO | CURRENT_DATE | date de réalisation |
| status | `expense_status` | NO | 'draft' | draft/pending_validation/validated/rejected |
| tiers_id | uuid | YES | — | **FK `tiers`** (ex-`fournisseur` texte libre, repointé sur l'entité fusionnée du domaine 02 §1.12) |
| piece_jointe | uuid | YES | — | FK documents SET NULL (justificatif) |
| ledger_tx_id | uuid | YES | — | FK ledger_transactions (lien écriture, idempotence) |
| validated_by | uuid | YES | — | FK profiles |
| validated_at | timestamptz | YES | — | |
| rejection_comment | text | YES | — | |

- Index : `(budget_id)`, `(copro_id, tx_date)`, `(budget_line_id)`, `(status)`.
- Trigger : `set_updated_at`.
- **Note migration** : `fournisseur` (texte libre) → `tiers_id` via résolution/création à la volée de tiers (cohérent fusion suppliers+providers). Si non résoluble, conserver le libellé dans `label`.

### 1.4 `call_for_funds` — en-tête d'appel agrégé (pivot)

1 appel = 1 (copro, période, label, date) ; multi-clés porté par les lignes.

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros CASCADE |
| period_id | uuid | NO | — | FK accounting_periods |
| budget_id | uuid | YES | — | FK budgets (source du calcul) |
| repartition_key_id | uuid | YES | — | **TOUJOURS NULL** (appel multi-clés ; la clé vit sur la ligne). Conservé nullable pour compat, jamais peuplé. |
| label | text | NO | — | |
| issue_date | date | NO | — | |
| due_date | date | NO | — | |
| trimester | int | YES | — | CHECK `1..4` |
| total_amount | numeric(14,2) | NO | — | CHECK `> 0` |
| status | `call_for_funds_status` | NO | 'draft' | draft/issued/partially_paid/paid/cancelled |
| ledger_tx_id | uuid | YES | — | FK ledger_transactions (lien écriture) |
| issued_at | timestamptz | YES | — | |
| description | text | YES | — | |
| created_by | uuid | YES | — | FK profiles |

- **UNIQUE** `uq_call_for_funds_idempotent (copro_id, period_id, label, issue_date)` — idempotence, conservée.
- Index : `(copro_id, period_id)`, `(due_date)`, `(copro_id, status)`.
- **Invariant intégrité** (constraint trigger DEFERRED, voir §4) : appel `status<>'draft'` ⇒ `ledger_tx_id IS NOT NULL`. **NOUVEAU** : matérialise « chaque opération génère une écriture ». La copro-template (§6) naissant via les posteurs canoniques (qui renseignent `ledger_tx_id`), aucun appel orphelin n'existe — l'invariant passe par construction. Les appels orphelins live (artefacts de `generate_combined_calls_from_ag`, fonction abandonnée) ne sont **pas repris** (A1).

### 1.5 `call_for_funds_lines` — quote-part lot×clé (CŒUR lot-centric)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| call_id | uuid | NO | — | FK call_for_funds CASCADE |
| copro_id | uuid | NO | — | FK copros CASCADE |
| lot_id | uuid | NO | — | FK lots — **lot-centric (NOT NULL)** |
| repartition_key_id | uuid | YES | — | clé appliquée |
| amount_due | numeric(14,2) | NO | — | CHECK `>= 0` |
| amount_paid | numeric(14,2) | NO | 0 | CHECK `>= 0` |
| status | `call_line_status` | NO | 'unpaid' | unpaid/partial/paid |
| weight_snapshot | numeric | YES | — | **tantièmes figés à l'émission — REPRENDRE TEL QUEL, ne jamais recalculer** |

- **UNIQUE** `uq_call_line_lot_key (call_id, lot_id, repartition_key_id)`.
- **CHECK** `ck_call_line_amounts (amount_paid <= amount_due)` — excellent garde-fou, conservé.
- **Index dédupliqué** : le live a `idx_call_for_funds_lines_call_id` **ET** `idx_call_lines_call` sur `(call_id)` → **on n'en garde qu'UN** (`idx_cff_lines_call`). Plus : `(copro_id, call_id)`, `(lot_id)`, `(lot_id, status)`, `(status)`.
- **Triggers : FUSION des 2 triggers de statut concurrents** (voir §4) — aujourd'hui `update_call_line_status` (BEFORE) + `trg_update_call_status_from_lines` (AFTER) tournent tous deux sur `amount_paid`, logique éclatée. Cible : **un seul** trigger AFTER cohérent (`trg_call_line_status_sync`). Plus `trg_validate_call_total` (constraint DEFERRED, conservé).

### 1.6 `payment_reminder_rules` — règles de relance (paliers J+N)

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | NO | — | FK copros CASCADE |
| delay_days | int | NO | — | CHECK `> 0` (palier J+N) |
| channel | `notification_channel` | NO | 'email' | email/registered_email/postal/registered_postal/hand_delivery |
| template_id | uuid | YES | — | FK `email_templates` **ON DELETE SET NULL** (table définie ICI §1.11 ; live = NO ACTION, durci en SET NULL pour ne pas bloquer la purge d'un modèle) |
| label | text | YES | — | |
| is_active | bool | NO | true | |
| created_by | uuid | YES | — | **FK profiles** (ex-`auth.users` — corrige l'incohérence d'identité §3.4 carto) |

- **UNIQUE** `uq_payment_reminder_rules_copro_delay (copro_id, delay_days)`.
- Seedé à la création de copro par `create_default_reminder_rules` (3 paliers, cf. business-rules J+15/J+30/J+60/J+90).
- Trigger : `set_updated_at`.

### 1.7 `payment_reminders` — instance de relance émise

| col notable | type | null | note |
|---|---|---|---|
| id | uuid | NO | PK |
| copro_id | uuid | NO | FK copros CASCADE |
| lot_id | uuid | NO | FK lots — **lot-centric** |
| owner_id | uuid | YES | FK coproprietaires — **snapshot du destinataire** (dénormalisé pour l'historique d'envoi ; le solde reste dérivé du lot) |
| reminder_rule_id | uuid | YES | FK payment_reminder_rules |
| call_id / call_line_id | uuid | YES | FK call_for_funds / call_for_funds_lines (rattachement appel relancé) |
| unpaid_amount | numeric(14,2) | NO | CHECK `> 0` |
| oldest_due_date | date | YES | |
| days_overdue | int | YES | CHECK `>= 0` |
| delay_level | int | YES | palier atteint |
| status | `reminder_status` | NO | pending/sent/failed/stale/skipped |
| delivery_status | `delivery_status` | YES | suivi acheminement (enum fusionné, ENUMS.md §1.2) |
| recipient_email / recipient_name | text | YES | snapshot |
| provider_message_id | text | YES | id fournisseur d'envoi |
| scheduled_at / sent_at / cancelled_at | timestamptz | YES | |
| cancelled_reason / content | text | YES | |
| created_by | uuid | YES | **FK profiles** (ex-`auth.users` — corrigé) |

- **UNIQUE** `uq_payment_reminders_lot_delay_active (lot_id, delay_level, status)` — empêche double relance même palier.
- Index partiels : `(scheduled_at) WHERE status='pending'`, `(call_line_id) WHERE call_line_id IS NOT NULL`.
- Trigger : `set_updated_at`.

### 1.8 `reminder_settings` — pause des relances (singleton/copro)

| col | type | null | défaut | note |
|---|---|---|---|---|
| copro_id | uuid | NO | — | **PK = copro_id** (singleton) + FK copros CASCADE |
| is_paused | bool | NO | false | |
| paused_until | date | YES | — | |
| pause_reason | text | YES | — | |

- Index partiel `(copro_id) WHERE is_paused`. Seedé par `create_default_reminder_settings`. Trigger `set_updated_at`. **REPRISE telle quelle.**

### 1.9 `budget_payment_schedules` — échéancier paiement travaux (FAUX-MORT CÂBLÉ — CONSERVÉE)

0 ligne, 0 fonction métier (seul son trigger `updated_at` la touche). **MAIS câblée front, confirmé par l'USER** : `usePaymentSchedule.ts` → `TravauxDetailModal.tsx`, monté sur **2 pages dashboard** (Budget/Travaux). 0 ligne ≠ table morte → **DROP ANNULÉ (ex-A8).**

**Reclassée en faux-mort câblé** (même traitement que `alur_transfers` / `bank_matches` / `mutation_steps`) : **CONSERVÉE** dans le schéma cible (structure + RLS), 0 ligne. La table porte l'échéancier de phases de paiement travaux (acomptes, retenue de garantie) ; la feature affiche/édite ces échéances depuis le modal travaux. RLS prod : `ALL user_is_copro_manager` (gestionnaire), `SELECT user_has_copro_access` (info travaux de la copro), `anon` ✗.

> **`delete_service_order` (domaine 07 §5) — INCHANGÉE.** Comme la table est conservée, cette fonction n'a **plus** à être réécrite : son `UPDATE budget_payment_schedules SET service_order_id = NULL WHERE service_order_id = p_order_id` (détache l'OS supprimé, ne purge pas l'échéancier) reste **valide et nécessaire**. La note de séquençage DROP est annulée.

### 1.10 `alur_transfers` — transfert/affectation du fonds ALUR (FAUX-MORT CÂBLÉ — CONSERVÉE)

0 ligne, et **0 référence dans une FONCTION** (vérifié live) — MAIS **2 vues en dépendent** (`v_alur_fund_summary`, `v_alur_transfers_history`) et le **front la consomme** (`useALURData.ts` l.286, cf. T3-B). L'affirmation initiale « 0 référence dans TOUTE fonction » était **trompeuse** : elle masquait ces dépendances vues + hook. Un DROP mécanique **casserait les 2 vues + le hook ALUR**.

**Reclassée en faux-mort câblé** (même traitement que `bank_matches` / `mutation_steps`) : **CONSERVÉE**, avec RLS activé (`user_is_copro_manager`) + alignement sur la règle d'or « chaque opération génère une écriture » : un transfert ALUR **devra poster une écriture GL canonique** (D105 → 6xx / virement inter-fonds via `create_ledger_transaction`) le jour où la feature est réellement câblée. Tant que la table reste à 0 ligne, aucune écriture rétroactive n'est due.

> **Si DROP malgré tout retenu par l'USER** (arbitrage §7-A5) : séquencer **APRÈS** (1) rebranchement de `useALURData.ts` sur une autre source et (2) réécriture/DROP des vues `v_alur_fund_summary` ET `v_alur_transfers_history`. Jamais de DROP sec. Le domaine 05 (mutations) la déclarait « rattachée Finance, non redéfinie ici » : l'arbitrage se tranche ICI.

### 1.11 `email_templates` — modèles d'e-mail système (TABLE DE RÉFÉRENCE GLOBALE — foyer ICI)

> **Foyer tranché : domaine 03.** C'est le domaine propriétaire des relances, et c'est lui qui consomme la table (FK `payment_reminder_rules.template_id` réelle + seed `create_default_reminder_rules` qui LIT cette table). Le domaine 08 la déclarait « hors domaine, non traitée » → **orpheline** : à la re-baseline la FK aurait cassé (relation inexistante) et le seed des relances de toute nouvelle copro aurait échoué (`SELECT ... FROM email_templates` sur une table absente). On lui donne un foyer ici.
>
> **NATURE RÉELLE (vérifiée live, corrige l'hypothèse du critique).** Ce **n'est PAS** une table par copro : les 6 lignes ont **`copro_id IS NULL`** — ce sont des **modèles système globaux** identifiés par `code` (`ag_convocation`, `ag_relance`, `ag_pv_notification`, `payment_reminder_7/30/60`). La structure live **n'a ni `channel` ni `is_system`** (le canal vit sur la **règle** `payment_reminder_rules.channel`, pas sur le modèle). On reprend donc la table **telle quelle**, sans inventer de colonnes.

| col | type | null | défaut | note |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK |
| copro_id | uuid | YES | — | FK copros CASCADE — **nullable** : `NULL` = modèle système global (cas des 6 lignes live) ; non-null = surcharge propre à une copro (réservé, non utilisé aujourd'hui) |
| code | text | NO | — | identifiant logique stable (`payment_reminder_7`, `ag_convocation`…) ; clé lue par `create_default_reminder_rules` |
| name | text | NO | — | libellé lisible |
| description | text | YES | — | |
| subject | text | NO | — | objet de l'e-mail |
| body_html | text | NO | — | corps HTML |
| body_text | text | YES | — | corps texte (fallback) |
| available_variables | jsonb | NO | '[]'::jsonb | variables interpolables (`{{lot}}`, `{{montant}}`…) |
| is_active | bool | NO | true | |
| is_default | bool | NO | false | modèle système livré par défaut |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

- **UNIQUE** `uq_email_templates_code_scope (code, copro_id)` — un seul modèle par (code, portée) ; `copro_id NULL` garde l'unicité du jeu système (partial unique `(code) WHERE copro_id IS NULL` pour fiabiliser le `SELECT ... LIMIT 1` du seed).
- Index : `(copro_id)`, `(code)`.
- Trigger : `set_updated_at`.
- **RLS** (cible prod, OFF en dev comme le reste) : table de **référence partagée** → **SELECT pour tout `authenticated`** (les modèles système doivent être lisibles par le seed/les relances de toute copro) ; **écriture (INSERT/UPDATE/DELETE) restreinte au `service_role`** (modèles système, non éditables par un gestionnaire). Pas de filtre `user_is_copro_manager` ici : ce serait incohérent avec des lignes `copro_id NULL` lues globalement. Le jour où des surcharges par copro (`copro_id` non-null) seront ouvertes en self-service, ajouter une policy `ALL user_is_copro_manager(copro_id) WHERE copro_id IS NOT NULL`.
- **Référencée par** : `payment_reminder_rules.template_id` (FK SET NULL, §1.6) ; lue par `create_default_reminder_rules` (seed, §4–§5) via `code`.

---

## 2. ENUMS (référence — détail dans ENUMS.md)

Réutilisés tels quels : `budget_type` {current, works, alur}, `expense_status` {draft, pending_validation, validated, rejected}, `notification_channel` (5 val.), `reminder_status` {pending, sent, failed, stale, skipped}.

**Enum fusionné** (ENUMS.md §1.2) : `delivery_status` (union normalisée, remplace `mail_delivery_status`) — porté par `payment_reminders.delivery_status`.

**Harmonisation des statuts d'appel** (dette §3.5 carto — vocabulaire divergent `partial` vs `partially_paid`) :
- `call_for_funds_status` : `draft, issued, partially_paid, paid, cancelled` (en-tête) — **conservé**.
- `call_line_status` : `unpaid, partial, paid` (ligne) — **conservé**.
- Les deux restent distincts (granularité différente : la ligne n'a pas de notion `issued`/`cancelled`). Le mapping ligne→en-tête est porté par `trg_call_line_status_sync` (§4). **Non fusionnés** (sémantiques distinctes), mais le **mapping est documenté et figé** : ligne `unpaid`→en-tête `issued`, ligne `partial`→`partially_paid`, toutes lignes `paid`→`paid`.

**`budget_status` — TRANCHÉ ICI** (laissé ouvert par ENUMS.md §4 « hors périmètre de cette passe »).
Live = `{draft, draft_from_ag, pending_approval, submitted, validated, rejected, closed}` — 7 valeurs dont 4 quasi-synonymes au stade « pas encore validé ». Décision cible : **réduire à 5 valeurs** alignées sur le workflow réel des fonctions (`submit_budget` : draft→submitted ; `validate_budget` : draft/submitted→validated) :

| Cible | Rôle | Legacy mappé |
|---|---|---|
| `draft` | brouillon (saisie manuelle OU issu d'AG) | `draft` + `draft_from_ag` |
| `submitted` | soumis pour validation | `submitted` + `pending_approval` |
| `validated` | budget actif (1 seul/copro×période×type) | `validated` |
| `rejected` | refusé | `rejected` |
| `closed` | exercice clôturé (budget historisé) | `closed` |

> `draft_from_ag` → `draft` : la provenance AG est déjà tracée par `source_ag_id`, pas besoin d'un statut dédié. `pending_approval` → `submitted` : doublon de « en attente de validation ».

---

## 3. RLS — 3 rôles + bypass service_role

État cible : **RLS ACTIVÉ partout** (aujourd'hui OFF sur 8/10 tables, volontaire en dev). Bicéphale : `service_role` bypass total (ON prod / OFF dev) ; sinon session-user filtré par helpers du domaine 02 §3 (`user_has_copro_access`, `user_is_copro_manager`, `user_is_lot_owner_in_copro`).

Plan `coproprietaires.user_id` : tant que NULL, les policies copropriétaire sont **définies mais inertes** (renvoient faux). Câblage à l'invitation portail (domaine onboarding).

| table | gestionnaire | copropriétaire | anon |
|---|---|---|---|
| budgets | ALL `user_is_copro_manager` | SELECT `user_has_copro_access` (budget voté = info copro) | ✗ |
| budget_lines | ALL `user_is_copro_manager` | SELECT `user_has_copro_access` | ✗ |
| budget_expenses | INSERT/UPDATE `user_is_copro_manager` ; **DELETE `user_is_copro_manager AND status='draft'`** | SELECT `user_has_copro_access` | ✗ |
| call_for_funds | ALL `user_is_copro_manager` ; **DELETE `… AND status='draft'`** | SELECT `user_has_copro_access AND EXISTS(ligne sur un de ses lots)` | ✗ |
| call_for_funds_lines | ALL `user_is_copro_manager` | SELECT `user_is_lot_owner_in_copro(copro_id, lot_id)` (SES lots) | ✗ |
| payment_reminder_rules | ALL `user_is_copro_manager` | ✗ | ✗ |
| payment_reminders | ALL `user_is_copro_manager` | SELECT `user_is_lot_owner_in_copro(copro_id, lot_id)` (SES relances) | ✗ |
| reminder_settings | ALL `user_is_copro_manager` | ✗ | ✗ |
| alur_transfers | ALL `user_is_copro_manager` | SELECT `user_has_copro_access` (info fonds ALUR de la copro) | ✗ |
| budget_payment_schedules | ALL `user_is_copro_manager` | SELECT `user_has_copro_access` (info travaux de la copro) | ✗ |
| email_templates | SELECT tout `authenticated` ; écriture `service_role` **seulement** (table de référence système, §1.11) | SELECT (modèles système globaux) | ✗ |

- **anon = aucun accès** (corrige le verdict T1 exposition anon).
- Écriture **uniquement gestionnaire** ; copropriétaire en lecture sur SES lots (appels, lignes, relances) + budgets votés. **Exception `email_templates`** : table de référence système, lue par tout `authenticated`, écrite uniquement par `service_role` (cf. §1.11).
- DELETE borné `status='draft'` conservé sur `call_for_funds` et `budget_expenses` (on n'efface pas un objet comptabilisé).

---

## 4. TRIGGERS (socle d'intégrité — disposition)

| table | trigger cible | rôle | disposition |
|---|---|---|---|
| call_for_funds_lines | **`trg_call_line_status_sync`** (AFTER I/U/D) | **FUSION** des 2 triggers concurrents : (1) fixe `line.status` selon amount_paid/due, (2) propage à l'en-tête via `update_call_status(call_id)` | **FUSIONNER** `update_call_line_status` (BEFORE) + `trg_update_call_status_from_lines` (AFTER) → un seul AFTER. Supprime la double maintenance (dette §3.2 carto). |
| call_for_funds_lines | `trg_validate_call_total` (CONSTRAINT DEFERRED) | invariant Σ(amount_due lignes) == `total_amount` en-tête (tolérance 0,01) | **GARDER** (excellent) |
| call_for_funds | **`trg_cff_ledger_required`** (CONSTRAINT DEFERRED) | **NOUVEAU** : `status<>'draft' ⇒ ledger_tx_id NOT NULL` | **AJOUTER** (force « chaque opération = écriture ») |
| budget_lines | `check_budget_line_copro_consistency` (BEFORE I/U) | cohérence copro_id ligne = budget | **GARDER** |
| toutes | `set_updated_at` | horodatage | **GARDER (1 seule fonction)** |
| payments / payment_allocations | `trg_allocation_update_line` (AFTER) | met à jour `call_for_funds_lines.amount_paid` après imputation | **GARDER** (vit côté domaine 02, déclenche la chaîne de statuts ici) |

> Triggers seed à la création de copro (domaine onboarding mais cités ici) : `create_default_reminder_rules`, `create_default_reminder_settings`. **GARDÉS.**

---

## 5. FONCTIONS du domaine — GARDER / RÉÉCRIRE / ABANDONNER

Garde par défaut = **G-MGR** (`REVOKE EXECUTE FROM anon; GRANT authenticated; IF NOT user_is_copro_manager(p_copro_id) THEN RAISE`). Lecture/reporting = **G-DEF-RO**.

### GARDER (chaîne canonique)
| fonction | garde | note |
|---|---|---|
| `post_budget_call_for_funds` (**10 args**) | G-MGR | route canonique ; répartition « plus grand reste » (total exact au centime) ; D450-x/lot agrégé · C701/702/105. **Surcharge 8-args ABANDONNÉE.** |
| `generate_calls_from_ag_payload` | G-MGR | découpe annuel/semestriel/trimestriel, délègue à la 10-args ; idempotent |
| `validate_budget` | G-MGR | draft/submitted→validated ; vérifie période ouverte + unicité validé (désormais aussi garantie par UNIQUE partiel §1.1) |
| `submit_budget` | G-MGR | draft→submitted ; ≥1 ligne + clés complètes |
| `validate_budget_expense` | G-MGR | réalisé→validated ; poste D[charge]/C401 ; cut-off 408 si période fermée ; idempotent (ledger_tx_id) ; FK→`tiers` |
| `calculate_budget_projection` | G-DEF-RO | budget vs réalisé (reporting) |
| `recalculate_all_call_statuses` / `update_call_status` / `check_call_total_integrity` | G-MGR / G-INTERNAL | recalc/contrôle statuts |
| `get_pending_reminders_to_send` | G-DEF-RO | lots à relancer (depuis `v_unpaid_by_lot` + règles) |
| `create_payment_reminder` | G-MGR | INSERT payment_reminders |
| `mark_reminder_sent` / `mark_reminder_failed` | G-MGR | transitions statut + provider_message_id |
| `cancel_stale_reminders` | G-MGR | lots soldés → status 'stale' |
| `is_reminders_paused` | G-DEF-RO | lit reminder_settings |
| `create_default_reminder_rules` / `create_default_reminder_settings` | trigger seed | à la création de copro. `create_default_reminder_rules` **LIT `email_templates`** (§1.11) par `code` (`payment_reminder_7/30/60`) pour câbler `template_id` → la table DOIT exister et être seedée avant toute création de copro. |

> Frontière domaine 02 (citées, définies là-bas) : `post_owner_payment`, `allocate_payment` (imputation FIFO cloisonnée par nature, NE poste pas le GL), `create_ledger_transaction`. La chaîne d'imputation met à jour `amount_paid` des lignes d'appel via `trg_allocation_update_line`.

### RÉÉCRIRE
| fonction | raison |
|---|---|
| ~~surcharge `post_budget_call_for_funds` 8-args~~ → fondue | garder UNIQUEMENT la 10-args (la 8-args perd des centimes : arrondi par ligne ≠ total en-tête, risque de déclencher `validate_call_for_funds_total`) |
| chaîne ALUR | la **création** du fonds ALUR doit poster **D450-5 / C105** (art.14-2 II, mémoire `alur_fonds_travaux_accounting`) via la chaîne canonique, **pas** en bespoke. Intégrer comme maillon de `generate_calls_from_ag_payload` (budget_type='alur' ⇒ crédit 105). |
| `post_call_for_funds` (mono-clé) | supplanté par l'agrégé ; rebrancher l'edge `generate_call_for_funds` AVANT abandon — voir §7-A3 |

### ABANDONNER (verrouillé, non repris)
- **`generate_combined_calls_from_ag`** — ne poste PAS le GL ; **source probable des 6 appels `issued` orphelins** (ledger_tx_id NULL). DROP.
- **`create_budget_from_ag`** — crée budget+lignes sans écriture, écrit `ag_pending_actions` ; doublon non-canonique de prepare→activate. ABANDONNÉ.
- **`create_alur_fund_from_ag`** — crée le budget ALUR sans écriture D450-5/C105 ; remplacé par le maillon canonique ci-dessus.
- Surcharge legacy `post_budget_call_for_funds` 8-args.

---

## 6. COPRO-TEMPLATE PROPRE — PAS de reprise du live (décision A1, verrou USER)

**Décision A1 (USER, verrouillée)** : on **ne migre AUCUNE donnée du live** sur ce domaine. L'ex-boucle d'or 22222222 et l'ex-immuable 11111111 sont **remplacées** par une **COPRO-TEMPLATE construite de A à Z** via la chaîne canonique. **Le schéma fait foi, pas l'historique.** Les anciens volumes/transformations par-copro sont **SANS OBJET** et retirés.

La template est semée par le **flux canonique du §0** (budget voté → `validate_budget` → `generate_calls_from_ag_payload` → `post_budget_call_for_funds` → encaissement → `validate_budget_expense`). La donnée **naît conforme** : `weight_snapshot` figé à l'émission par le posteur (jamais à recalculer), `ledger_tx_id` renseigné par construction (donc `trg_cff_ledger_required` passe sans appel orphelin à rattraper), `amount`/`amount_due`/`amount_paid` respectant les CHECK, `budget_status` directement dans le jeu cible 5-valeurs (plus de mapping `draft_from_ag`/`pending_approval`), UNIQUE partiel « 1 budget validé/copro×période×type » respecté par le workflow. **`created_by` pointe `profiles` dès la création** (plus de mapping `auth.users`→`profiles`).

**Tables non instanciées par la template (CONSERVÉES, 0 ligne) :**
- **`budget_payment_schedules`** : **CONSERVÉE** (structure + RLS), 0 ligne ; ne PAS DROP (câblée front `usePaymentSchedule.ts`/`TravauxDetailModal.tsx` + 2 pages, §1.9, §7-A4). La template ne pose pas d'échéancier de paiement travaux tant que la feature n'est pas alimentée. `delete_service_order` reste inchangée.
- **`alur_transfers`** : **CONSERVÉE** (structure + RLS), 0 ligne ; ne PAS DROP (2 vues + hook front, §1.10). La template ne pose pas de transfert ALUR tant que la feature n'est pas câblée.

**`email_templates` (référence système GLOBALE, hors copro)** : les 6 modèles système (`copro_id IS NULL` : `ag_convocation`, `ag_relance`, `ag_pv_notification`, `payment_reminder_7/30/60`) sont **provisionnés au seed du schéma** (pas une « reprise du live » : c'est une table de référence livrée avec l'application). **Obligatoires** avant toute création de copro : `create_default_reminder_rules` les LIT par `code` pour câbler `payment_reminder_rules.template_id`. Sans eux, le seed des relances de la template échoue.

**Idempotence** : les clés (`uq_call_for_funds_idempotent`, `idempotency_key` des paiements côté 02) rendent la **génération de la template rejouable** sans collision — pas une « reprise », un re-seed sûr.

---

## 7. ARBITRAGES — TRANCHÉS (verrous USER appliqués)

Tous tranchés. Plus aucune décision USER en attente ici.

**A1 — `budget_status` réduit à 5 valeurs → TRANCHÉ (verrou A6).** `{draft, submitted, validated, rejected, closed}` (§2). Fusion `draft_from_ag`→`draft` (provenance via `source_ag_id`) et `pending_approval`→`submitted`. La template naît directement avec le jeu cible (pas de mapping).

**A2 — UNIQUE partiel « 1 budget validé/copro×période×type » → TRANCHÉ (verrou A17).** Contrainte déclarative `(copro_id, period_id, budget_type) WHERE status='validated'` (§1.1), en plus du contrôle applicatif de `validate_budget`. Plus robuste.

**A3 — `post_call_for_funds` mono-clé → ABANDON (verrou A7).** Rebrancher l'edge `generate_call_for_funds` sur l'agrégé 10-args **AVANT** abandon (séquencé). Aucun chemin mono-clé conservé. Décision unique avec 02-A3.

**A4 — `budget_payment_schedules` → CONSERVÉE (DROP ANNULÉ, ex-verrou A8 levé par l'USER).** Faux-mort câblé front confirmé : `usePaymentSchedule.ts` → `TravauxDetailModal.tsx` + 2 pages dashboard. Structure + RLS `user_is_copro_manager` conservées, 0 ligne. `delete_service_order` (07 §5) reste **inchangée** (son `UPDATE budget_payment_schedules …` est valide). Plus aucun séquençage DROP.

**A5 — `alur_transfers` → CONSERVÉE (faux-mort câblé).** 0 ligne mais 2 vues + hook front (`useALURData.ts`) en dépendent ; structure + RLS `user_is_copro_manager` conservées. Écriture GL canonique (D105→6xx) à câbler le jour où la feature est activée.

**A6 — Fusion des triggers de statut de ligne → TRANCHÉ (verrou A18).** `update_call_line_status` (BEFORE) + `trg_update_call_status_from_lines` (AFTER) fusionnés en un seul `trg_call_line_status_sync` (AFTER, §4). Même sémantique, un seul point de maintenance.
