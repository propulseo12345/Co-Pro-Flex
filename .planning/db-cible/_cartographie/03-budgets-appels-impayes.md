# Cartographie domaine 03 — Budgets / Appels de fonds / ALUR / Impayés / Imputation paiements

> Lecture seule sur le live `iyfesbjnkpynmwlsmxnp` (public). Date : 2026-06-04.
> Périmètre : `budgets`, `budget_lines`, `budget_expenses`, `budget_payment_schedules`, `call_for_funds`, `call_for_funds_lines`, `payment_reminder_rules`, `payment_reminders`, `reminder_settings`, `alur_transfers`.
> Tables limitrophes citées pour le contrat mais hors périmètre de cet agent : `payments`, `payment_allocations` (imputation), `accounts`, `repartition_keys`, `repartition_key_lines`, `ledger_transactions`, `accounting_periods`.

## VERDICT GLOBAL : À REPENSER (cœur sain, périphérie à élaguer)

Le **cœur appel de fonds** (`budgets` / `budget_lines` / `call_for_funds` / `call_for_funds_lines`) est **BIEN FAIT** : lot-centric, agrégé multi-clés, contraintes d'intégrité fortes, chaîne canonique qui poste le grand livre. Mais le **domaine pris dans son ensemble est À REPENSER** pour 4 raisons structurelles :
1. **Deux tables mortes** (`alur_transfers` 0 ligne / 0 réf, `budget_payment_schedules` 0 ligne) qui matérialisent des features jamais branchées.
2. **Surcharge dupliquée** `post_budget_call_for_funds` (8 args vs 10 args) avec deux algorithmes de répartition différents — drift à fusionner.
3. **Deux triggers concurrents** sur le statut des lignes d'appel + incohérence d'enum (`call_line_status` vs `call_for_funds_status`).
4. **ALUR sans écriture comptable** : `create_alur_fund_from_ag` crée bien le budget ALUR mais ne génère **aucune** écriture D450-5/C105 ; seul `post_budget_call_for_funds` poste l'ALUR (via le crédit `105`) — la création de fonds et l'appel sont désynchronisés.

Couverture : **10 tables**, **23 fonctions** (dont 3 triggers internes au domaine), **~25 vues** lectrices, **10 enums**.

---

## 1. STRUCTURE LIVE (table par table)

Convention RLS live : **8/10 tables ont RLS DÉSACTIVÉ** (volontaire en phase dev, cf. mémoire), mais les policies sont déjà écrites. Seules `alur_transfers` et `budget_payment_schedules` ont `relrowsecurity=true`. À l'activation prod, le modèle policies est `user_has_copro_access` (SELECT) / `user_is_copro_manager` (write) — conforme aux 3 rôles attendus.

### 1.1 `budgets` (23 lignes — VIVANT)
Budget annuel par (copro, période, type, version). **Cœur du domaine.**

| Col | Type | Null | Défaut |
|-----|------|------|--------|
| id | uuid | NO | gen_random_uuid() |
| copro_id | uuid | NO | — |
| period_id | uuid | NO | — |
| budget_type | enum budget_type | NO | — |
| status | enum budget_status | NO | 'draft' |
| version | int | NO | 1 |
| name | text | YES | — |
| notes | text | YES | — |
| created_by | uuid | YES | — |
| validated_by | uuid | YES | — |
| created_at | timestamptz | NO | now() |
| validated_at | timestamptz | YES | — |
| source_ag_id | uuid | YES | — |

- **PK** : (id). **UNIQUE** : `budgets_copro_period_type_version_unique (copro_id, period_id, budget_type, version)`.
- **FK** : copro_id→copros (CASCADE), period_id→accounting_periods (RESTRICT), created_by/validated_by→profiles (SET NULL), source_ag_id→ag_meetings.
- **Index** : PK, unique, `idx_budgets_copro_period_type_status`, `idx_budgets_period_status`.
- **Triggers** : aucun.
- **RLS** : OFF. Policies select(access)/insert+update+delete(manager).
- **Enums** : `budget_type` = {current, works, alur} ; `budget_status` = {draft, draft_from_ag, pending_approval, submitted, validated, rejected, closed}.

### 1.2 `budget_lines` (93 lignes — VIVANT)
Ligne budgétaire = (compte de charge × clé de répartition). Base du calcul d'appel.

| Col | Type | Null | Défaut |
|-----|------|------|--------|
| id, budget_id, copro_id, account_id, repartition_key_id | uuid | NO | — |
| label | text | NO | — |
| amount | numeric | NO | — |
| code | text | YES | — |
| sort_order | int | YES | 0 |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | YES | now() |

- **PK** (id). **CHECK** `amount >= 0`. Pas d'UNIQUE.
- **FK** : budget_id→budgets (CASCADE), copro_id→copros (CASCADE), account_id→accounts (RESTRICT), repartition_key_id→repartition_keys (RESTRICT).
- **Index** : PK, account, budget, copro.
- **Trigger** : `trg_budget_line_copro_consistency` (BEFORE I/U) → `check_budget_line_copro_consistency()` (garde-fou cohérence copro_id budget/ligne).
- **RLS** : OFF. Policies access/manager.

### 1.3 `budget_expenses` (11 lignes — VIVANT, faible)
Dépense réalisée imputée sur une ligne de budget (cycle voté→engagé→réalisé→payé, palier « réalisé »).

| Col notable | Type | Note |
|-----|------|------|
| budget_id, budget_line_id | uuid NO | rattachement double |
| label, amount, tx_date | NO | montant TTC réalisé |
| status | enum expense_status | 'draft' |
| fournisseur, montant_ht, taux_tva, piece_jointe | YES | métadonnées facture |
| validated_at/by, rejection_comment | YES | workflow validation |
| ledger_tx_id | uuid YES | lien écriture GL |

- **PK** (id). Pas de CHECK montant, pas d'UNIQUE.
- **FK** : budget_id/budget_line_id/copro_id→ (CASCADE), validated_by→profiles.
- **Index** : PK, budget, copro_date, line, status.
- **Trigger** : `tr_budget_expenses_updated_at`.
- **RLS** : OFF. Policies : select(access), insert/update(manager), delete(manager AND status='draft').
- **Enum** `expense_status` = {draft, pending_validation, validated, rejected}.
- 7/11 lignes ont `ledger_tx_id` non NULL (comptabilisées D6xx/C401 via `validate_budget_expense`).

### 1.4 `budget_payment_schedules` (0 ligne — **MORT / candidat drop**)
Échéancier de paiement par phases pour budget travaux (acomptes, retenue de garantie). **Jamais alimentée.** Aucune fonction métier ne l'écrit (seul son trigger updated_at la référence).

- 19 colonnes (phase_number, percentage, amount, due_date, status enum `payment_phase_status`, is_retention, retention_release_date, service_order_id, document_id…).
- **UNIQUE** `uq_budget_phase (budget_id, phase_number)`. FK vers documents/service_orders (SET NULL).
- **RLS ON** (via memberships role gestionnaire/admin).
- Enum `payment_phase_status` = {pending, awaiting_invoice, paid}.
- **Verdict** : feature « suivi d'échéancier travaux » conçue mais jamais branchée. À redécider : soit intégrée au futur module travaux/marchés, soit DROP.

### 1.5 `call_for_funds` (51 lignes — VIVANT, pivot)
Appel de fonds agrégé (en-tête). 1 appel = 1 (copro, période, label, date) ; multi-clés via les lignes.

| Col notable | Type | Note |
|-----|------|------|
| budget_id | uuid YES | source du calcul |
| repartition_key_id | uuid YES | **TOUJOURS NULL en pratique** (appel multi-clés, la clé est portée par la ligne) |
| label, issue_date, due_date | NO | |
| trimester | int YES | CHECK 1..4 |
| total_amount | numeric NO | CHECK > 0 |
| status | enum call_for_funds_status | 'draft' |
| ledger_tx_id | uuid YES | lien écriture GL |
| issued_at, description | YES | |

- **PK** (id). **UNIQUE** `uq_call_for_funds_idempotent (copro_id, period_id, label, issue_date)` (idempotence). CHECK total>0, trimester∈[1,4].
- **FK** : budget_id→budgets, copro_id→copros (CASCADE), period_id→accounting_periods, repartition_key_id→repartition_keys, ledger_tx_id→ledger_transactions, created_by→profiles.
- **Index** : PK, unique, copro_period, due_date, status(copro).
- **RLS** : OFF. Policies : **2 SELECT** (manager + owner via EXISTS sur lignes `user_is_lot_owner`), insert/update(manager), delete(manager AND status='draft').
- Enum `call_for_funds_status` = {draft, issued, partially_paid, paid, cancelled}.
- **ALERTE intégrité** : 6 appels `status<>'draft'` avec `ledger_tx_id IS NULL` → appels non rattachés à une écriture (créés hors chaîne canonique). Viole « chaque opération génère une écriture ». À nettoyer avant migration.

### 1.6 `call_for_funds_lines` (721 lignes — VIVANT, table la plus dense)
Ligne d'appel = quote-part d'UN lot pour UNE clé. **Cœur lot-centric.**

| Col | Type | Null | Note |
|-----|------|------|------|
| call_id, lot_id, copro_id | uuid NO | dimension lot |
| amount_due | numeric NO | CHECK >= 0 |
| amount_paid | numeric NO | défaut 0, CHECK >= 0 |
| status | enum call_line_status | 'unpaid' |
| repartition_key_id | uuid YES | clé appliquée |
| weight_snapshot | numeric YES | tantièmes figés à l'émission |

- **PK** (id). **UNIQUE** `uq_call_line_lot_key (call_id, lot_id, repartition_key_id)`. **CHECK** : amount_due>=0, amount_paid>=0, **`ck_call_line_amounts (amount_paid <= amount_due)`**.
- **FK** : call_id→call_for_funds (CASCADE), copro_id→copros (CASCADE), lot_id→lots, repartition_key_id→repartition_keys.
- **Index** : PK, unique, + **doublon** : `idx_call_for_funds_lines_call_id` ET `idx_call_lines_call` indexent tous deux (call_id) → un des deux est redondant. Aussi copro_call, lot, lot_status, status.
- **3 triggers** (voir §2, point critique) : `trg_call_line_status` (BEFORE), `trg_call_line_update_status` (AFTER), `trg_validate_call_total` (CONSTRAINT DEFERRED).
- **RLS** : OFF. Policies select manager + owner (`user_is_lot_owner(lot_id)`).
- Enum `call_line_status` = {unpaid, partial, paid}.

### 1.7 `payment_reminder_rules` (36 lignes — VIVANT)
Règles de relance impayés par copro (paliers J+N, canal).

- Cols : copro_id, delay_days (CHECK>0), channel (enum notification_channel, 'email'), template_id→email_templates, label, is_active.
- **UNIQUE** `uq_payment_reminder_rules_copro_delay (copro_id, delay_days)`.
- **FK created_by → auth.users(id)** (incohérence : le reste du domaine pointe `profiles`).
- Trigger `set_updated_at`. RLS OFF (policies via memberships).
- Enum `notification_channel` = {email, registered_email, postal, registered_postal, hand_delivery}.
- 3 règles/copro sur 12 copros → seedé par trigger `create_default_reminder_rules`.

### 1.8 `payment_reminders` (3 lignes — VIVANT, faible — uniquement copro 11111111)
Relance émise pour un lot impayé (instance de relance).

- 23 colonnes : lot_id, owner_id→coproprietaires, unpaid_amount (CHECK>0), oldest_due_date, days_overdue (CHECK>=0), delay_level, reminder_rule_id, status (enum reminder_status), recipient_email/name, provider_message_id, delivery_status (enum), scheduled_at, sent_at, cancelled_at/reason, **call_id / call_line_id** (rattachement appel), content.
- **UNIQUE** `uq_payment_reminders_lot_delay_active (lot_id, delay_level, status)`.
- **FK created_by → auth.users** (idem incohérence).
- RLS OFF. Index partiels (scheduled WHERE pending, call_line WHERE not null).
- Enums `reminder_status` = {pending, sent, failed, stale, skipped} ; `delivery_status` = {pending, queued, sent, delivered, opened, bounced, failed, cancelled}.

### 1.9 `reminder_settings` (12 lignes — VIVANT)
Pause des relances par copro (1 ligne/copro). **PK = copro_id** (singleton par copro).

- Cols : copro_id (PK), is_paused, paused_until, pause_reason, timestamps.
- Trigger `set_updated_at`. RLS OFF. Index partiel WHERE is_paused.

### 1.10 `alur_transfers` (0 ligne — **MORT / candidat drop**)
Mouvements du fonds travaux ALUR (vers compte courant / budget travaux). **Jamais alimentée, 0 référence dans TOUTE fonction.**

- Cols : copro_id, alur_budget_id→budgets (CASCADE), amount (CHECK>0), transfer_date, destination (enum transfer_destination), destination_budget_id, description, resolution_ag_id, created_by→profiles.
- **RLS ON** (access/manager). 3 index.
- Enum `transfer_destination` = {compte_courant, budget_travaux}.
- **Verdict** : feature « affectation/transfert du fonds ALUR » entièrement conçue mais morte. À DROP ou réintégrer dans la chaîne ALUR comptable (le transfert ALUR doit générer une écriture, ce qu'aucun code ne fait).

---

## 2. CONTRAT FONCTIONNEL (le schéma cible doit l'honorer)

### Chaîne canonique appel de fonds (À CONSERVER — poste le GL)
- **`post_budget_call_for_funds(...)` — SECURITY DEFINER — RETURNS jsonb** — route canonique d'émission.
  - **Deux surcharges** (drift, à fusionner) :
    - 8 args (`...p_fraction`) : répartit par `round(p_fraction * amount * weight / total_weight, 2)` ligne par ligne → **risque de perte de centimes** (arrondi indépendant par lot).
    - 10 args (`...p_fraction, p_installment_index, p_installment_count`) : répartition par **somme cumulée / plus grand reste** (le total est exact au centime). C'est la bonne méthode.
  - Lit : `budgets` (budget_type), `accounts` (crédit 701/702/105), `budget_lines`, `repartition_keys`/`repartition_key_lines` (poids), `repartition_key_is_complete()`, `resolve_lot_tiers_account()` (débit 450-x/lot).
  - Écrit : INSERT `call_for_funds` (status 'issued'), INSERT `call_for_funds_lines` (1/lot×clé), appelle `create_ledger_transaction(... 'call_for_funds' ...)` → **D450-x/lot agrégé · C701/702/105 total**, UPDATE `call_for_funds.ledger_tx_id`.
  - **Conforme métier** : appel agrégé, ALUR crédite bien `105` (pas 701/702), gel des tantièmes via `weight_snapshot`, blocage si clé incomplète.
- **`generate_calls_from_ag_payload(p_copro_id, p_ag_id, p_resolution_id, p_payload)` — DEFINER — void** — découpe trimestriel/semestriel/annuel selon modalités AG, **délègue à `post_budget_call_for_funds` (10 args)** en boucle. Lit `budgets`/`budget_lines`/`accounting_periods`. **Ne poste PAS lui-même mais via la délégation → maillon canonique valide.** Idempotent (refuse si appel non-cancelled existe déjà).
- **`prepare_ag_decisions` → activate (chaîne AG)** : en amont, hors périmètre table mais bout de chaîne canonique.

### Workflow budget (À CONSERVER)
- **`submit_budget(p_budget_id)` — INVOKER — jsonb** : draft→submitted, vérifie ≥1 ligne + clés complètes (`v_repartition_key_totals`).
- **`validate_budget(p_budget_id)` — INVOKER — jsonb** : draft/submitted→validated, vérifie période ouverte + unicité d'un seul budget validated par (copro, période, type). Écrit validated_by/at.
- **`validate_budget_expense(p_expense_id)` — DEFINER — jsonb** : status→validated puis poste **D[compte charge ligne]/C401** via `create_ledger_transaction('budget_expense')`. Garde-fou période ouverte (cut-off charges à payer si fermée). Idempotent (ledger_tx_id). **Conforme** au modèle facture fournisseur (D6xx/C401).
- **`calculate_budget_projection(p_copro_id, p_period_id)` — DEFINER — TABLE** : projection budget vs réalisé (lecture seule, reporting).

### Imputation / paiement (À CONSERVER — frontière domaine)
- **`post_owner_payment(...)` — DEFINER — jsonb** (route canonique encaissement) : INSERT `payments` (idempotent via idempotency_key), appelle `allocate_payment`, **agrège les allocations par nature** (`budget_type`), poste **D512 · C450-x/lot par nature** (+ C450-advance si trop-perçu) via `create_ledger_transaction('payment')`. **Conforme** : cloisonnement par nature, gestion avance/trop-perçu.
- **`allocate_payment(p_payment_id, p_call_line_ids, p_nature_filter)` — set-returning** : imputation **FIFO par `issue_date`** (puis ordre fourni si lignes ciblées), filtre par nature (`p_nature_filter`), écrit `payment_allocations`, met à jour `call_for_funds.status`. **Ne poste PAS le GL** (bonne séparation : l'imputation est extra-GL, c'est `post_owner_payment` qui poste). **Conforme** règles d'imputation FIFO cloisonné.
- **`recalculate_all_call_statuses(p_copro_id)`** / **`update_call_status(p_call_id)`** / **`check_call_total_integrity`** : recalc/contrôle statuts d'appel.

### Relances impayés (À CONSERVER)
- `get_pending_reminders_to_send(p_copro_id)` (DEFINER, TABLE) — calcule les lots à relancer depuis `v_unpaid_by_lot` + règles.
- `create_payment_reminder(...)` (DEFINER, uuid) — INSERT `payment_reminders`.
- `mark_reminder_sent` / `mark_reminder_failed` (DEFINER) — transitions statut + provider_message_id.
- `cancel_stale_reminders(p_copro_id)` (DEFINER, int) — passe en 'stale' les relances de lots devenus soldés (via `v_unpaid_by_lot`).
- `is_reminders_paused(p_copro_id)` (DEFINER) — lit `reminder_settings`.
- `create_default_reminder_rules` / `create_default_reminder_settings` (triggers seed à la création de copro).

### Triggers du domaine (point CRITIQUE)
- **`update_call_line_status()`** (BEFORE I/U of amount_paid, via `trg_call_line_status`) : fixe `call_for_funds_lines.status` (paid si amount_paid>=amount_due, partial si >0, sinon unpaid).
- **`trg_update_call_status_from_lines()`** (AFTER I/D/U, via `trg_call_line_update_status`) : appelle `update_call_status(call_id)` pour propager le statut à l'en-tête.
- **`validate_call_for_funds_total()`** (CONSTRAINT DEFERRED, via `trg_validate_call_total`) : invariant Σ(amount_due lignes) == total_amount en-tête (tolérance 0,01). **Excellent garde-fou.**
- `check_budget_line_copro_consistency()` (cohérence copro_id). `*_updated_at` / `set_updated_at`.

### Fonctions AG bespoke — À ABANDONNER (ne postent PAS le GL)
- **`create_budget_from_ag(p_ag_id, p_exercice, p_postes)`** (DEFINER) — crée budget+lignes mais **0 écriture GL**, écrit `ag_pending_actions`. Doublon non-canonique de la chaîne prepare→activate.
- **`generate_combined_calls_from_ag(p_ag_id, p_nb_appels)`** (DEFINER, 5215 car) — génère des appels combinés **sans poster le GL** → c'est très probablement la source des **6 appels `issued` sans ledger_tx_id**. À DROP.
- **`create_alur_fund_from_ag(p_ag_id, p_montant, p_modalites)`** (DEFINER) — crée le budget ALUR + ligne mais **aucune écriture D450-5/C105**, écrit `ag_pending_actions`. Doit être remplacé par un maillon canonique qui poste l'ALUR.

---

## 3. VERDICT QUALITÉ DÉTAILLÉ (preuves)

### Ce qui est BIEN FAIT
- **Lot-centric pur** : `call_for_funds_lines` porte (call, lot, clé) avec `weight_snapshot` figé → solde par personne dérivable en sommant ses lots. Conforme à la règle d'or.
- **Appel agrégé multi-clés** : 1 ligne par lot×clé, en-tête sans clé (`repartition_key_id` toujours NULL), GL agrégé par lot. Exactement le modèle attendu.
- **Intégrité forte** : `ck_call_line_amounts (paid<=due)`, invariant total via constraint trigger DEFERRED, idempotence appels (`uq_call_for_funds_idempotent`) et paiements (idempotency_key), unicité budget validé par (copro, période, type).
- **Comptabilité d'engagement respectée** : appel→D450/C70x, dépense→D6xx/C401, paiement→D512/C450 par nature ; chaque opération canonique génère une écriture immuable.
- **Imputation conforme** : FIFO cloisonné par nature, trop-perçu en avance.

### Ce qui est À REPENSER (défauts concrets)
1. **Surcharge dupliquée `post_budget_call_for_funds`** (8 vs 10 args) avec deux maths de répartition. La 8-args perd potentiellement des centimes (arrondi par ligne, le total recalculé peut diverger du `total_amount` en-tête → risque de déclencher `validate_call_for_funds_total`). **Garder uniquement la 10-args (plus grand reste), supprimer la 8-args.**
2. **Triggers concurrents sur le statut** : `update_call_line_status` (BEFORE) et `trg_update_call_status_from_lines` (AFTER) tournent tous deux sur amount_paid. Logique éclatée, risque de double maintenance. À unifier.
3. **Index dupliqué** sur `call_for_funds_lines(call_id)` : `idx_call_for_funds_lines_call_id` + `idx_call_lines_call` → en supprimer un.
4. **Incohérence de FK identité** : `payment_reminder_rules.created_by` et `payment_reminders.created_by` → `auth.users(id)`, alors que tout le reste du domaine → `profiles(id)`. À uniformiser sur `profiles`.
5. **Deux enums de statut quasi-redondants** : `call_line_status` {unpaid/partial/paid} vs `call_for_funds_status` {…/partially_paid/paid} → vocabulaire divergent (partial vs partially_paid). Acceptable mais à harmoniser.
6. **ALUR désynchronisé** : `create_alur_fund_from_ag` ne génère pas l'écriture du fonds ; le crédit 105 n'apparaît qu'à l'appel. Cohérent avec « appel ALUR = D450-5/C105 » mais la *création* du fonds reste extra-comptable. À clarifier dans le schéma cible.
7. **Données polluées** : 6 appels émis sans écriture GL (artefacts bespoke). À purger ou re-poster avant migration.
8. **`budget_expenses` sans CHECK montant** ni contrainte d'unicité (vs les autres tables du domaine qui ont des CHECK>0).

### Cohérence avec les principes métier
| Principe | Respecté ? |
|---|---|
| Grand livre source unique, chaque op = écriture | OUI sur chaîne canonique ; NON sur bespoke (6 appels orphelins) |
| Unité = lot, solde personne dérivé | OUI |
| 450-x par nature + dimension lot_id (pas 411) | OUI (`resolve_lot_tiers_account`) |
| Appel agrégé multi-clés D450/C701 | OUI |
| ALUR D450-5/C105 (pas 701/702) | OUI à l'appel ; création de fonds extra-GL |
| Imputation FIFO cloisonnée par nature, cut-off | OUI |

---

## 4. CANDIDATS MORTS / DOUBLONS (à confirmer agent transverse)

| Objet | Type | Preuve | Action proposée |
|---|---|---|---|
| `alur_transfers` | TABLE | 0 ligne, **0 réf dans toute fonction** | DROP ou réintégrer (transfert ALUR doit poster le GL) |
| `budget_payment_schedules` | TABLE | 0 ligne, 1 réf = son seul trigger updated_at | DROP ou rattacher au futur module travaux/marchés |
| `post_budget_call_for_funds(8 args)` | FONCTION | surcharge legacy, maths arrondi inférieure à la 10-args | DROP la 8-args |
| `create_budget_from_ag` | FONCTION | ne poste pas le GL, écrit ag_pending_actions | ABANDONNER (cadre verrouillé) |
| `generate_combined_calls_from_ag` | FONCTION | ne poste pas le GL ; source probable des 6 appels orphelins | ABANDONNER + DROP |
| `create_alur_fund_from_ag` | FONCTION | ne poste pas le GL | REMPLACER par maillon canonique |
| `idx_call_lines_call` OU `idx_call_for_funds_lines_call_id` | INDEX | doublon (call_id) | DROP l'un des deux |

---

## 5. MIGRATION (copro 22222222 boucle d'or + 11111111 immuable)

Données à reprendre **uniquement** pour les 2 copros immuables/golden (le reste = ~10 copros de test jetables) :

| Table | 22222222 (golden) | 11111111 (immuable) |
|---|---|---|
| budgets | 5 | 9 |
| budget_lines | 20 | 35 |
| budget_expenses | 1 | 5 |
| call_for_funds | 4 | 19 |
| call_for_funds_lines | 72 | 275 |
| payment_reminder_rules | 3 | 3 |
| payment_reminders | 0 | 3 |
| reminder_settings | 1 | 1 |
| budget_payment_schedules | 0 | 0 |
| alur_transfers | 0 | 0 |

Points d'attention migration :
- **Reprendre `weight_snapshot`** des lignes d'appel tel quel (tantièmes figés à l'émission, ne pas recalculer).
- **Reprendre `ledger_tx_id`** des appels/dépenses comptabilisés (lien GL immuable). **Exclure/corriger** les 6 appels orphelins (ledger_tx_id NULL) — vérifier qu'aucun n'appartient à 11111111/22222222 avant reprise (sinon re-poster).
- `payments` / `payment_allocations` (hors périmètre graine mais **indispensables** au domaine impayés) doivent être migrés conjointement aux call_for_funds_lines pour préserver `amount_paid` et l'imputation FIFO.
- Les 2 tables mortes (alur_transfers, budget_payment_schedules) : rien à migrer.

### Note de périmètre (table manquante du graine signalée)
La table-graine ne contient **pas `payment_allocations`** (jointure paiement→ligne d'appel), qui est pourtant le pivot de l'imputation des paiements et du domaine impayés. À cartographier (probablement par l'agent « paiements/trésorerie » s'il existe, sinon à intégrer ici dans le schéma cible). `payments` également limitrophe.
