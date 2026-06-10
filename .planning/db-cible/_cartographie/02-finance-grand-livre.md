# Cartographie domaine FINANCE — Grand livre

> Live CoProFlex `iyfesbjnkpynmwlsmxnp` — lecture seule, 2026-06-04.
> Domaine le plus critique. Source unique = grand livre immuable (partie double + droits constatés).
> Copros porteuses : gold `22222222-aaaa-bbbb-cccc-222222222222` (Le Clos Saint-Michel), immuable `11111111-aaaa-bbbb-cccc-111111111111` (Les Jardins d'Émeraude). **ATTENTION : les UUID réels sont en forme `2222...-aaaa-bbbb-cccc-...`, PAS `2222...-2222-...`.**

## VERDICT GLOBAL : BIEN FAIT (noyau GL) — quelques corrections ciblées avant re-baseline

Le noyau (accounts / ledger_transactions / ledger_entries / accounting_periods) est **bien conçu** : modèle ledger pur header+lignes, partie double vérifiée à la pose, immutabilité câblée par triggers (CONSTRAINT TRIGGER + no-delete-posted + no-insert-posted), lot-centric par sous-compte de nature 450-1..5, idempotence (clés uniques par source_type), enums propres. **0 transaction déséquilibrée sur 134.** Ce n'est PAS « à repenser » : c'est à nettoyer et durcir.

Réserves (toutes corrigeables) : (1) **drift de données** — 6 écritures violent les invariants actuels DANS les copros à migrer ; (2) garde `enforce_lot_id_on_45x` incomplète ; (3) `WHEN OTHERS` qui maquille les erreurs en `success:false` ; (4) colonnes/tables mortes (`accounts.parent_id`, `lot_accounts`) ; (5) enum `period_status` sur-dimensionné vs décision binaire `open` actée.

---

## 1. STRUCTURE LIVE (par table)

RLS : modèle `user_is_copro_manager(copro_id)` (écriture) / `user_has_copro_access(copro_id)` (lecture). RLS **désactivé** sur le noyau finance (volontaire phase dev, cf. mémoire), **activé** sur collective_loans/shares/treasury_advances. Toutes ont policies définies (prêtes pour activation prod).

### accounts — 1081 lignes (plan de comptes) · RLS off · policies OK
Plan de comptes répliqué **par copro** (12 copros, ~90 comptes/copro). Unité = (copro_id, code) UNIQUE.
| col | type | null | défaut |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| copro_id | uuid | NO | — → FK copros |
| code | text | NO | — |
| name | text | NO | — |
| account_type | account_type(enum) | NO | — (asset/liability/income/expense/equity) |
| is_active | bool | NO | true |
| parent_id | uuid | YES | — → **FK self (accounts.id) — JAMAIS utilisée (0 ligne renseignée)** |
| is_system | bool | NO | false (14 lignes) |
| description | text | YES | — |
| banque / iban / bic | text | YES | — (comptes 512 banque) |
| initial_balance | numeric | YES | 0 |
| is_postable | bool | NO | true (6 lignes false = comptes agrégateurs ex. `450`) |
- PK id ; UNIQUE (copro_id, code) ; FK parent_id→accounts, copro_id→copros.
- Index : code, (copro_id,left(code,1)), copro_id, (copro_id,account_type), account_type. **Indexation correcte** (préfixe de classe pour annexes).
- Aucun trigger.

### ledger_transactions — 134 lignes (en-tête écriture) · RLS off
| col | type | null | défaut |
|---|---|---|---|
| id | uuid | NO | uuid |
| copro_id | uuid | NO | FK copros |
| period_id | uuid | NO | FK accounting_periods |
| tx_date | date | NO | CURRENT_DATE |
| source_type | text | YES | CHECK liste blanche (16 valeurs : budget, call_for_funds, payment, supplier_invoice/payment, bank_movement, transfer, od, opening, closing, manual, opening_balance, opening_onboarding, reclassification, result_allocation, budget_expense) |
| source_id | uuid | YES | (42/134 NULL — legacy, cf. audit V1) |
| label | text | NO | — |
| status | text | NO | 'draft' — CHECK (draft/posted) |
| created_by/posted_by | uuid | YES | FK profiles |
| posted_at | timestamptz | YES | — |
| metadata | jsonb | NO | '{}' |
- CHECK `ck_posted_consistency` (draft⇒posted_at/by NULL ; posted⇒posted_at NOT NULL). Excellent.
- Index idempotence partiels : `uq_ledger_tx_closing`(copro,source_id,period WHERE closing), `uq_ledger_tx_opening_balance`, `uq_ledger_tx_opening_onboarding`, `idx_ledger_tx_source` partiel.
- Triggers : `trg_ledger_tx_immutable` (UPDATE bloqué si posted), `trg_ledger_tx_no_delete_posted`. **Immutabilité OK.**

### ledger_entries — 476 lignes (lignes débit/crédit) · RLS off — **CŒUR DU GL**
| col | type | null | défaut |
|---|---|---|---|
| id | uuid | NO | uuid |
| tx_id | uuid | NO | FK ledger_transactions |
| copro_id | uuid | NO | FK copros |
| period_id | uuid | NO | FK accounting_periods |
| account_id | uuid | NO | FK accounts |
| lot_id | uuid | YES | FK lots (dimension analytique lot-centric) |
| direction | text | NO | CHECK (debit/credit) |
| amount | numeric | NO | CHECK > 0 |
| entry_label | text | YES | — |
- Index : tx, account, (copro,period,account), lot partiel WHERE lot_id NOT NULL.
- **5 triggers (garde-fous solides)** : `enforce_is_postable` (CONSTRAINT TRIGGER déférable), `trg_enforce_lot_id_on_45x` (impose lot_id sur 450%/459%), `trg_ledger_entry_consistency` (copro/period doivent matcher l'en-tête), `trg_ledger_entry_no_insert_posted` (interdit insert dans une tx déjà posted), `trg_ledger_entry_immutable` (UPDATE/DELETE bloqués).
- Lu par : v_general_ledger, v_trial_balance, v_lot_balance, v_lot_avance, v_dashboard_kpis, v_budget_consumption_by_account, v_finance_integrity_issues, v_general_ledger_by_account_class.

### accounting_periods — 20 lignes · RLS off
Colonnes : id, copro_id(FK), name, start_date, end_date, status(enum period_status), locked_at/by, closed_at/by, approved_at/by, approval_notes, notes, created/updated_at.
- CHECK `valid_dates` (end>start) ; UNIQUE (copro_id,name).
- Triggers : `enforce_single_open_period` (1 seule période open/copro), `handle_updated_at`.
- **Dette enum** : `period_status` = {open,locked,closed,approved,rejected} mais décision WP5.2 actée = **binaire `open` + reopen_period**. Colonnes `locked_at/locked_by` = vestiges du verrou abandonné → mortes.

### period_cutoff_items — 5 lignes (cut-off droits constatés) · RLS off
id, copro_id, period_id, kind(CHECK CAP/CCA/PCA/PAR), account_id, counterpart_account_id, amount(>0), label, supplier_id(FK suppliers), auto_reverse(true), posting_tx_id/reversal_tx_id(FK ledger_transactions), timestamps.
- **Bien fait** : matérialise les charges/produits constatés d'avance avec auto-extourne (art.14-3 décret 2005-240). FK vers `suppliers` (à fusionner suppliers+providers, cf. décision tiers).

### payments — 38 lignes · RLS off (manager + owner select)
id, copro_id, period_id, lot_id(FK), amount(>0), payment_date, method(enum payment_method), reference, status(enum payment_status recorded/reconciled/reversed), ledger_tx_id(FK), created_by, idempotency_key.
- Index `ux_payments_idempotency`(copro,idempotency_key) partiel. **Lot-centric** (lot_id NOT NULL). Bon.

### payment_allocations — 165 lignes · RLS off (manager + owner)
id, copro_id, payment_id(FK), call_line_id(FK call_for_funds_lines), amount_allocated(>0).
- UNIQUE `uq_allocation`(payment_id, call_line_id). Triggers : `trg_validate_payment_allocation` (BEFORE — n'over-alloue pas), `trg_allocation_update_line` (AFTER — met à jour le payé de la ligne d'appel). **Imputation FIFO cloisonnée portée par `allocate_payment`/`post_owner_payment`.**

### bank_movements — 6 lignes · RLS off
id, copro_id, period_id, bank_date, value_date, amount_signed, label, bank_ref, status(enum bank_movement_status unmatched/matched/ignored), account_id(FK accounts=512), account_code/account_category(varchar — **dénormalisation** redondante avec account_id).
- DELETE autorisé seulement si status=unmatched. Bon.

### bank_matches — 0 ligne · RLS off
id, copro_id, bank_movement_id(FK), target_type(enum payment/supplier_payment/other), target_id(uuid **polymorphe non-FK**), amount_matched(>0), matched_at/by. Vide mais structure cohérente (rapprochement).

### treasury_advances — 12 lignes · RLS **on**
id, copro_id, lot_id(FK), owner_id(FK coproprietaires), advance_type(CHECK permanent/special/work_fund), label, amount_due/paid. **Lot-centric mais owner_id redondant** (dérivable du lot). Avances de trésorerie (art.35).

### collective_loans — 1 ligne · RLS **on**
id, copro_id, label, lender, total/remaining_amount, annual_payment, interest_rate, start/end_date, status(CHECK active/repaid/cancelled). **Aucun lien GL** (pas de ledger_tx) — emprunt collectif géré hors écriture (à brancher au GL pour respecter « chaque opération génère une écriture »).

### collective_loan_shares — 6 lignes · RLS **on**
id, loan_id(FK), lot_id(FK), share_amount, remaining_amount, last_payment_date. UNIQUE(loan_id,lot_id). Lot-centric, OK.

### lot_accounts — 21 lignes · RLS off — **TABLE MORTE**
id, copro_id, lot_id(FK), account_id(FK). UNIQUE(lot_id). **Référencée par 0 fonction.** Vestige du modèle abandonné « 1 compte 411-xxx par lot ». Contredit la règle lot-centric (lot = dimension `ledger_entries.lot_id`, pas un compte dédié). → DROP.

---

## 2. CONTRAT FONCTIONNEL (le schéma cible doit l'honorer)

**Route canonique d'écriture** : `create_ledger_transaction(copro,period,date,label,source_type,source_id,entries jsonb,auto_post)` SECURITY DEFINER → insère 1 en-tête + N lignes, vérifie l'équilibre si auto_post, délègue à `post_ledger_transaction`. Écrit : ledger_transactions, ledger_entries.
- `post_ledger_transaction(tx_id)` DEFINER : refuse si déjà posted / période non `open` / 0 ligne / déséquilibre>0.01 ; passe status=posted. **Garde période open = clé du gel.**

**Posteurs métier (tous DEFINER, tous via le GL)** :
- `post_budget_call_for_funds(...)` (2 surcharges) — appel agrégé D450-x/lot · C701. Écrit call_for_funds(_lines) + GL.
- `post_call_for_funds(...)` — variante mono-clé (legacy ? à rationaliser vs agrégé).
- `post_owner_payment(...)` / `allocate_payment(...)` / `validate_payment_allocation` — encaissement + imputation FIFO cloisonnée par nature ; écrit payments, payment_allocations, GL (D512/C450).
- `post_supplier_invoice(...)` / `post_supplier_payment(...)` (2 surcharges) — D6xx/C401 puis D401/C512.
- `post_period_cutoff` / `reverse_period_cutoff` / `cutoff_entry_pair` — droits constatés CAP/CCA/PCA/PAR + extourne.
- `create_alur_fund_from_ag` — cotisation ALUR (doit poster D450-5/C105, à vérifier au redesign).
- `set_opening_balance` / `get_opening_balance` — reprise de mandat (source_type opening_balance/onboarding).
- `open_next_period` / `approve_period` / `close_period` / `reopen_period` / `regularize_period` — cycle période + à-nouveau (à-nouveau AVANT affectation). `result_allocation` (1 tx) = affectation 110/120→450.
- Chaîne AG canonique **postant le GL** : `prepare_ag_decisions` → `activate_ag_decisions` → `generate_calls_from_ag_payload` (seul des AG à toucher le GL) → `post_budget_call_for_funds`.

**Lecture/intégrité** : `check_transaction_balance`, `check_payment_allocation_integrity`, `calculate_budget_projection`, `fn_annexe_1..5`, `fn_dashboard_kpis`, vues v_trial_balance / v_general_ledger / v_lot_balance / v_finance_integrity_issues (toutes filtrent `status='posted'` — **dérivation correcte du GL**).

---

## 3. VERDICT QUALITÉ — preuves

**BIEN FAIT** :
- Partie double **garantie** (équilibre vérifié dans `post_ledger_transaction` + `create_ledger_transaction`) ; 0/134 tx déséquilibrée en live.
- Immutabilité **réellement câblée** (6 triggers entries + 2 triggers tx), pas seulement conventionnelle.
- Lot-centric correct : dimension `lot_id` + sous-comptes 450-1..5 (5 sous-codes présents), 459 inclus, **pas** de compte par lot (411 absent). Conforme à la règle métier.
- Idempotence soignée (index uniques partiels par source_type ; idempotency_key payments).
- Vues dérivées du GL posté uniquement (source unique respectée).

**À CORRIGER (preuves)** :
1. **DRIFT BLOQUANT — 6 écritures illégales au regard des invariants actuels, et elles sont DANS les copros à migrer** : 6 lignes `ledger_entries` sur le compte `450` (parent, `is_postable=false`) avec `lot_id NULL` → 5 dans la copro immuable `11111111`, 1 dans la gold `22222222`. Elles violent à la fois `trg_enforce_is_postable` ET `enforce_lot_id_on_45x` : preuve que ces gardes ont été ajoutées APRÈS coup et que la donnée historique n'a jamais été reprise. **Toute migration telle-quelle ré-injecte ces 6 lignes et fera échouer les triggers cibles.** → à reclasser sur 450-x + lot_id avant reprise (mais la copro 11111111 est « immuable » : arbitrage USER requis — extourne+repost vs exemption).
2. **Garde `enforce_lot_id_on_45x` incomplète** : ne couvre que `450%`/`459%`. Les autres comptes individualisables (451 liaisons inter-copro, 455/458 associés/répartition) passent sans lot_id. À élargir ou à statuer.
3. **`WHEN OTHERS THEN return success:false`** dans `create_ledger_transaction` et `post_ledger_transaction` : maquille une exception en faux succès applicatif et **avale le rollback implicite** — anti-pattern dangereux pour de la compta. À remplacer par une vraie remontée d'erreur transactionnelle.
4. **Colonnes/structures mortes** : `accounts.parent_id` (FK self, 0 ligne renseignée — hiérarchie jamais peuplée alors que les vues la SELECT) ; `accounting_periods.locked_at/locked_by` (verrou abandonné) ; enum `period_status` à 5 valeurs vs binaire `open` décidé.
5. **Dénormalisation** : `bank_movements.account_code`/`account_category` (redondants avec account_id→accounts) ; `treasury_advances.owner_id` (dérivable du lot, viole « le solde par personne se dérive »).
6. **Doublons de fonctions** : `post_call_for_funds` (mono-clé) vs `post_budget_call_for_funds` (agrégé, canonique) ; 2 surcharges de `post_budget_call_for_funds` et `post_supplier_payment` (l'une sans idempotency_key) → garder la signature idempotente, dropper l'ancienne.
7. **Index redondants** : payment_allocations a 4 index pour 2 axes (`idx_allocations_payment`+`idx_payment_allocations_payment_id` doublon ; idem call_line). À dédupliquer.
8. **collective_loans hors GL** : aucun ledger_tx rattaché → viole « chaque opération génère une écriture ». À brancher.

---

## 4. CANDIDATS MORTS / DOUBLONS (à confirmer par l'agent transverse)
- **lot_accounts** (21 lignes mais 0 fonction la lit) → DROP (modèle 411-par-lot abandonné).
- **accounts.parent_id** (colonne morte, 0 valeur) → DROP colonne + FK self.
- **accounting_periods.locked_at / locked_by** + valeurs enum `period_status` {locked,closed,approved,rejected} si binaire `open` retenu → simplifier.
- **bank_matches** : 0 ligne (structure à garder pour rapprochement, pas morte).
- **budget_payment_schedules** : 0 ligne (présent dans le domaine, à statuer avec l'agent budget).
- Doublons fonctions : `post_call_for_funds`, surcharges non-idempotentes de `post_budget_call_for_funds`/`post_supplier_payment`.
- AG bespoke ne postant PAS le GL (à abandonner, hors finance mais impactant) : `generate_combined_calls_from_ag`, `create_budget_from_ag`, `elect_council_from_ag`, `get_ag_pending_actions`, `mark_ag_action_activated`, `activate_ag_decisions` (ne poste pas lui-même).

---

## 5. MIGRATION (données à reprendre)
Reprendre **uniquement** gold `22222222` (20 tx / 72 entries / 92 comptes / 6 paiements / 2 périodes) + immuable `11111111` (27 tx / 126 entries / 101 comptes / 8 paiements / 4 périodes). Le reste (HARNESS*, Residence Test, Residence Test 2) = jetable.
À reprendre par table : accounts (plan par copro), accounting_periods, ledger_transactions (+ statut posted/draft : 1 draft manual à trancher), ledger_entries, payments, payment_allocations, period_cutoff_items, bank_movements (6), treasury_advances (12), collective_loans/shares (1/6).
**Point dur de reprise** : les **6 écritures `450`/lot_id NULL/non-postable** (5 en 11111111, 1 en 22222222) — à reclasser (450→450-x + lot_id) avant insertion dans le schéma cible, sinon les triggers `enforce_is_postable` + `enforce_lot_id_on_45x` rejettent. Décision USER nécessaire pour la copro « immuable » (extourne/repost daté vs exemption ponctuelle de reprise). Conserver les `idempotency_key`/`source_id` existants pour ne pas casser l'idempotence ; régénérer les `source_id` NULL (42 tx) si le schéma cible les rend obligatoires.
