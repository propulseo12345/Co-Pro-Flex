# Extract qqfq — FONCTIONS & TRIGGERS (signatures)

> ✅ **VOIE 1 — ALGORITHME : le CORPS d'une RPC retenue se copie quasi-littéral** (rouages éprouvés au centime, réécrire = risque de bug). **MAIS** le **CHOIX** des RPC/triggers à inclure reste VOIE 2 : périmètre justifié par le golden via le registre `coproflex-v2/.planning/REGISTRE_INCLUSION_0001.md`. Copier le CORPS d'une fonction **retenue**, jamais la LISTE entière « parce qu'elles sont là ». *(Copie à deux voies, BL 2026-06-28.)*

> Source : projet **live `qqfqrcolzmcbsvfaumiq`** (gelé), extrait 2026-06-28 (boucle principale).
> `args` = arguments réels ; `→ ret` = type retour ; `[DEF]` = SECURITY DEFINER, `[INV]` = INVOKER.
> Corps complets à extraire à la demande (`pg_get_functiondef`) au moment d'écrire la baseline (BL-03).
> À confronter à `.planning/db-cible/INVENTAIRE-FONCTIONS.md`.

## ⚠️ Repères pour BL-03 (corps = qqfq, forme = blueprint)
- **À RÉÉCRIRE (défauts nommés)** : `create_ledger_transaction` (retirer l'anti-pattern `WHEN OTHERS THEN success:false`), `validate_budget_expense` (fin du double-posting BL-05 + nom via `tiers`), `regularize_period`, `get_pending_reminders_to_send`.
- **COPIE quasi-littérale (rouages éprouvés, 0/134 déséquilibre)** : `allocate_payment` (FIFO), `post_owner_payment`, `post_period_cutoff`/`cutoff_entry_pair`, `settle_works_balance`, `set_opening_balance`, `compute_repartition_shares`, `post_budget_call_for_funds`.
- **`post_call_for_funds` mono-clé = ABSENT** de qqfq (déjà supprimé/jamais recréé) → ne JAMAIS le réintroduire. ✅
- **`apply_rls_environment` + `assert_public_tables_have_rls`** = toggle RLS prod/dev → **PÉRIMÉ v2** (FORCE natif partout). `assert_public_tables_have_rls` reste utile comme **gate** (table publique sans RLS = échec).
- **Helpers sécu à corriger (C16-4)** : `user_is_platform_admin()` (faille — `exists` sur memberships sans copro_id), `user_has_copro_access` (garder bypass admin LECTURE via `platform_admins`), `user_is_copro_manager` (RETIRER le bypass admin), `user_is_cabinet_manager`.
- **Argent `numeric` → `bigint` centimes** : toute RPC qui calcule des montants doit être revue pour l'arithmétique entière.

## Sécurité / RLS (socle 0004)
`user_has_copro_access(p_copro_id)→bool[DEF]` · `user_is_copro_manager(p_copro_id)→bool[DEF]` · `user_is_cabinet_manager(p_cabinet_id)→bool[DEF]` · `user_is_platform_admin()→bool[DEF]` ⚠FAILLE · `user_is_lot_owner(p_lot_id)→bool[DEF]` · `user_is_lot_owner_in_copro(p_copro_id,p_lot_id)→bool[DEF]` · `user_is_lot_owner_or_manager(...)→bool[DEF]` · `user_owns_any_lot_in_copro(p_copro_id)→bool[DEF]` · `get_user_lot_ids(p_copro_id)→uuid[][DEF]` · `is_council_member/president(...)→bool[DEF]` · `is_conversation_member(...)→bool[DEF]` · `can_view_content(...)→bool[DEF]` · `user_can_view_document(p_document_id)→bool[DEF]` · `is_service_call()→bool[DEF]` · `apply_rls_environment()→void[DEF]` ⚠PÉRIMÉ · `assert_public_tables_have_rls()→void[DEF]` (garder=gate) · `handle_new_user()→trigger[DEF]`

## GL — cœur grand livre (0003)
`create_ledger_transaction(p_copro_id,p_period_id,p_tx_date,p_label,p_source_type text,p_source_id,p_entries jsonb,p_auto_post bool)→jsonb[DEF]` ⚠RÉÉCRIRE · `post_ledger_transaction(p_tx_id)→jsonb[DEF]` · `reverse_ledger_transaction(p_tx_id,p_reason,p_reversal_date)→jsonb[DEF]` · triggers : `tr_check_transaction_balance` (équilibre déféré) · `tr_ledger_entry_immutable` · `tr_ledger_entry_no_insert_posted` · `tr_ledger_entry_consistency` · `tr_ledger_tx_immutable[INV]` · `tr_ledger_tx_no_delete_posted[INV]` · `tr_enforce_lot_id_on_45x` (à ÉLARGIR, A2) · `tr_enforce_is_postable`

## Périodes / exercices
`open_next_period(p_copro_id,p_closing_period_id,p_new_name,p_new_start,p_new_end)→jsonb[DEF]` · `close_period(p_period_id)→jsonb[DEF]` · `approve_period(p_period_id)→jsonb[DEF]` · `reopen_period(p_period_id)→jsonb[DEF]` · `regularize_period(p_copro_id,p_period_id,p_affecter_travaux bool)→jsonb[DEF]` ⚠RÉÉCRIRE · `get_period_for_date(p_copro_id,p_date)→uuid[DEF]` · `is_ledger_regen_exempt(p_source_type,p_source_id,p_posting_period_id)→bool[DEF]`

## Solde d'ouverture / reprise de mandat
`set_opening_balance(p_copro_id,p_period_id,p_as_of_date,p_lines jsonb)→jsonb[DEF]` · `get_opening_balance(p_copro_id,p_period_id)→jsonb[DEF]` · `set_opening_balance_residual_detail(...)→jsonb[DEF]` · `get_opening_balance_residual_detail(...)→jsonb[DEF]` · `opening_residual_gl(p_copro_id,p_period_id)→numeric[DEF]`

## Plan de comptes / provisioning
`provision_copro_chart(p_copro_id)→int[DEF]` · `set_account_charge_nature(p_copro_id,p_account_code,p_nature)→void[DEF]` · `resolve_lot_tiers_account(p_copro_id,p_nature)→uuid[DEF]`

## Budgets
`validate_budget(p_budget_id)→jsonb[DEF]` · `submit_budget(p_budget_id)→jsonb[DEF]` · `calculate_budget_projection(p_copro_id,p_period_id,p_budget_type)→jsonb[DEF]` · `validate_budget_expense(p_expense_id)→jsonb[DEF]` ⚠RÉÉCRIRE (double-posting BL-05)

## Appels de fonds
`post_budget_call_for_funds(p_copro_id,p_period_id,p_budget_id,p_label,p_trimester,p_issue_date,p_due_date,p_fraction,p_installment_index,p_installment_count)→jsonb[DEF]` *(trimestriel natif ✅)* · `generate_calls_from_ag_payload(p_ag_id,p_copro_id,p_resolution_id,p_payload)→jsonb[DEF]` · `cancel_call_for_funds(p_call_id,p_reason)→jsonb[DEF]` · `update_call_status(p_call_id)→void[DEF]` · `recalculate_all_call_statuses(p_copro_id)→TABLE[DEF]` · triggers : `tr_validate_call_total` · `tr_call_line_status_sync` · `tr_cff_ledger_required` (re-quête la ligne, exempte cancelled)

## Paiements copropriétaires (FIFO)
`post_owner_payment(p_copro_id,p_period_id,p_lot_id,p_amount,p_payment_date,p_method,p_reference,p_call_line_ids uuid[],p_idempotency_key,p_nature_filter)→jsonb[DEF]` · `allocate_payment(p_payment_id,p_call_line_ids uuid[],p_nature_filter)→TABLE[INV]` *(FIFO cloisonné par nature)* · `unallocate_payment(p_payment_id)→jsonb[DEF]` · `reverse_payment(p_payment_id,p_reason,p_reversal_date)→jsonb[DEF]` · `get_lot_balance_45x(p_copro_id,p_lot_id)→numeric[DEF]` *(⚠ inclut 450-5, pas de cut-off as_of — voir C12-4)* · triggers : `tr_validate_payment_allocation` · `tr_allocation_update_line`

## Impayés / relances
`get_pending_reminders_to_send(p_copro_id)→TABLE[DEF]` ⚠RÉÉCRIRE · `create_payment_reminder(...)→uuid[DEF]` · `cancel_stale_reminders(p_copro_id)→int[DEF]` · `mark_reminder_sent/failed(...)→void[DEF]` · `is_reminders_paused(p_copro_id)→TABLE[DEF]` · `copros_due_for_reminders()→SETOF uuid[DEF]` · `run_daily_payment_reminders()→void[DEF]` · `create_default_reminder_rules/settings()→trigger[DEF]`

## Fournisseurs / factures
`post_supplier_invoice(p_copro_id,p_period_id,p_tiers_id,p_invoice_number,p_invoice_date,p_due_date,p_label,p_lines jsonb,p_document_id,p_service_order_id,p_post_immediately,p_montant_ht,p_montant_tva,p_taux_tva)→jsonb[DEF]` · `validate_supplier_invoice(p_invoice_id)→jsonb[DEF]` · `cancel_supplier_invoice(p_invoice_id,p_reason)→jsonb[DEF]` · `post_supplier_payment(...)→jsonb[DEF]` · `post_supplier_advance(...)→jsonb[DEF]` · `settle_supplier_advance_on_invoice(...)→jsonb[DEF]` · `post_supplier_credit_note(...)→jsonb[DEF]` · `supplier_invoice_net_payable(p_invoice_id)→numeric[DEF]` · `get_supplier_invoice_paid_amount(p_invoice_id)→numeric[DEF]` · triggers : `tr_validate_supplier_invoice_total` · `tr_validate_supplier_payment` · `tr_update_supplier_invoice_status_after_payment`

## Travaux / ALUR / cut-off
`post_period_cutoff(p_copro_id,p_period_id,p_items jsonb)→jsonb[DEF]` · `reverse_period_cutoff(p_copro_id,p_period_id)→jsonb[DEF]` · `cutoff_entry_pair(p_kind,p_account_id,p_counterpart_id,p_amount,p_label,p_reverse)→jsonb[INV]` · `close_works_operation(p_copro_id,p_budget_id)→jsonb[DEF]` · `settle_works_balance(p_copro_id,p_period_id)→jsonb[DEF]` · `assert_no_unlinked_works_entries(p_copro_id,p_period_id)→void[DEF]` · `assert_result_allocation_split(p_copro_id,p_period_id)→void[DEF]` *(garde invariant 12/478, BL-06)* · `post_alur_transfer(...)→jsonb[DEF]` · `settle_alur_transfer_cash(p_transfer_id,p_settled_date)→jsonb[DEF]`

## Lecture / audit / annexes (vues-fonctions)
`get_lot_balance_45x` (ci-dessus) · `audit_finance_integrity(p_copro_id)→TABLE(...issue_type,expected,actual,difference)[DEF]` *(gate DoD)* · `get_owner_statement(p_copro_id,p_owner_id,p_period_id,p_lot_id)→jsonb[DEF]` · `fn_dashboard_kpis(p_copro_id,p_period_id)→jsonb[DEF]` · `fn_annexe_1(...)` · `fn_annexe_1_detail_copros(...)` · `fn_annexe_2(p_copro,p_period,p_prev,p_next)` · `fn_annexe_3(...)` · `fn_annexe_4(...)` · `fn_annexe_5(...)` *(annexes = REPORTÉES, BL-06)*

## Répartition
`compute_repartition_shares(p_key_id)→TABLE(lot_id,weight,share_pct)[DEF]` · `repartition_key_is_complete(p_key_id)→bool[DEF]`

## Banque / rapprochement — REPORTÉ (BL-06)
`import_bank_movements(...)→jsonb[DEF]` · `reconcile_bank_movement(...)→jsonb[DEF]` · `refresh_bank_movement_status(p_movement_id)→bank_movement_status[DEF]`

## Cycle de vie copro / test / seed
`create_copro(p_name,p_address,p_city,p_postal_code,p_annee_construction,p_siret,p_previous_syndic_name,p_exercice_debut)→jsonb[DEF]` · `delete_onboarding_copro(p_copro_id)→jsonb[DEF]` · `provision_demo_tenant()→jsonb[DEF]` · **seed/test** : `seed_golden_loop(p_copro_id)→jsonb[DEF]` · `create_test_copro(p_name)→uuid[DEF]` · `create_test_copro_seeded(p_name)→uuid[DEF]` *(⚠ forme PÉRIMÉE 7 lots/1000 → golden 18/10000, BL-07)* · `create_clean_test_copro(_seeded)(p_name)→uuid[DEF]`

## Triggers transverses (cohérence copro / updated_at)
`set_updated_at()[INV]` · `enforce_copro_consistency()[DEF]` + ~30 `tr_*_copro_consistency` (lot, lot_owner, rkl, member, mail, message, event, legal, etat_date, mutation, opposition, contract, invoice, budget_line, so, like, comment, insurance…) · `tr_lot_owner_shares_sum[INV]` · `tr_check_budget_line_copro_consistency` · `tr_check_invoice_copro_consistency`

## HORS-FINANCE — DIFFÉRÉ (BL-08) — noms seuls
AG (~45 fn) : `create_ag_with_standard_resolutions, start_ag, close_ag, finalize_ag, archive_ag, prepare_ag_decisions, activate_ag_decisions, finalize_and_activate_ag, calculate_resolution_result, cast_vote, compute_ag_quorum, compute_majority_threshold, compute_decision_result, validate_ag_variables, check_convocation_delay, get_ag_*, save_ag_*, register_correspondence_form_votes, generate_calls_from_ag_payload, rpc_get_ag_*` …
Mutations/état daté : `validate_mutation, create_etat_date_snapshot, generate_etat_date_payload, upsert_mutation_*, initialize_mutation_steps, tr_etat_date_*`
Maintenance/OS : `update_service_order_status, is_valid_service_order_transition, generate_service_order_number, create_logbook_from_service_order, delete_service_order, update_contract_status_auto`
Docs/comm : `create_document_*, create_document_version, prevent_protected_document_deletion, calculate_document_expiration, mark_conversation_read, is_conversation_member, update_wall_post_*, link_coproprietaire_account`
