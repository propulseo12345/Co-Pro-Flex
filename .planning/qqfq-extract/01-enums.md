# Extract qqfq — ENUMS (schema public)

> Source : projet **live `qqfqrcolzmcbsvfaumiq`** (gelé en référence), extrait le 2026-06-28 (boucle principale, MCP).
> Matière première pour la baseline v2 (BL-03 : forme=blueprint, corps=qqfq). **0 donnée, structure seule.**
> À confronter à `.planning/db-cible/ENUMS.md` pendant la consolidation (BL-08).
> ⚠️ Sur une base NEUVE : `CREATE TYPE` direct au **set cible final** (pas d'`ALTER TYPE ADD VALUE` de migration).

| enum | valeurs |
|------|---------|
| `account_receivable_nature` | current, works, alur, loan, advance, doubtful |
| `account_type` | asset, liability, income, expense, equity |
| `ag_action_type` | CREATE_BUDGET, APPROVE_ACCOUNTS, SCHEDULE_BUDGET_PAYMENTS, CREATE_ALUR_FUND, SCHEDULE_ALUR_PAYMENTS, CREATE_WORK_BUDGET, CREATE_EXCEPTIONAL_CALL, ELECT_COUNCIL, APPOINT_SYNDIC, MANAGE_CONTRACT, GRANT_QUITUS, DESIGNATE_BUREAU |
| `ag_draft_type` | attendance, resolutions, votes, pv, envoi, milestones, other, roles, session, variables, resolution_vars, signataires, resolutions_results, resolutions_passerelles |
| `ag_meeting_type` | ordinary, extraordinary, mixed |
| `ag_status` | draft, convoked, in_progress, session_active, closed, pv_generated, pv_signed, pv_sent, finalized, archived |
| `attendance_type` | present, proxy, correspondence |
| `bank_match_target_type` | payment, supplier_payment, other |
| `bank_movement_status` | unmatched, matched, ignored |
| `budget_status` | draft, submitted, validated, rejected, closed |
| `budget_type` | current, works, alur |
| `call_for_funds_status` | draft, issued, partially_paid, paid, cancelled |
| `call_line_status` | unpaid, partial, paid |
| `collective_loan_status` | active, repaid, cancelled |
| `content_visibility` | all_members, council_only, managers_only |
| `contract_status` | draft, active, to_renew, expired, terminated |
| `correspondence_form_status` | pending, validated, integrated |
| `council_decision_status` | draft, submitted, approved, rejected, archived |
| `council_doc_link_type` | contract, service_order, ag, invoice, budget, other |
| `council_role` | president, secretary, treasurer, member, observer |
| `coverage_mode` | all_lots, subset |
| `cutoff_kind` | CAP, CCA, PCA, PAR |
| `delivery_status` | pending, queued, sent, delivered, opened, clicked, bounced, failed, cancelled |
| `document_category` | pv_ag, convocation, reglement, contrat, facture, devis, diagnostic, assurance, budget, appel_fonds, releve_charges, etat_date, courrier, photo, plan, ordre_service, autre |
| `document_entity_type` | ag, resolution, service_order, contract, supplier_invoice, mutation, budget, lot, coproprietaire, council, event, other, budget_expense |
| `document_relation_kind` | related, annexe, source, justificatif |
| `document_source` | manual, ag, finance, maintenance, mutation, system |
| `document_status` | active, archived, deleted |
| `document_visibility` | gestionnaire_seul, conseil, tous_coproprietaires |
| `etat_date_type` | pre, final |
| `event_type` | ag, reunion_cs, travaux, intervention, fete, autre |
| `expense_status` | draft, pending_validation, validated, rejected |
| `insurance_sub_type` | multirisque, dommages_ouvrage, rc, protection_juridique, autre |
| `intervention_category` | courante, urgente, reglementaire, travaux |
| `intervention_frequency` | once, weekly, monthly, quarterly, biannual, annual |
| `invitation_status` | pending, accepted, revoked, expired |
| `ledger_direction` | debit, credit |
| `ledger_source_type` | budget, call_for_funds, payment, supplier_invoice, supplier_payment, bank_movement, transfer, od, opening, closing, manual, opening_balance, opening_onboarding, reclassification, result_allocation, budget_expense, mutation, collective_loan, supplier_credit_note, works_settlement |
| `ledger_tx_status` | draft, posted |
| `legal_proceeding_nature` | litigation, recovery, other |
| `legal_proceeding_status` | pending, in_progress, closed, won, lost |
| `logbook_entry_type` | intervention, controle, incident, maintenance, autre |
| `logbook_status` | planifiee, en_cours, terminee |
| `lot_type` | appartement, studio, commerce, bureau, cave, parking, garage, local_technique, autre |
| `majority_type` | art24, art25, art25_1, art26, art26_1, unanimity |
| `membership_role` | gestionnaire, coproprietaire, platform_admin |
| `message_type` | text, file, system |
| `mutation_status` | draft, pre_etat_generated, etat_generated, sent_to_notary, signed, validated, cancelled |
| `mutation_step_key` | demande, pre_etat_date, etat_date, envoi_notaire, signature_acte, cloture_compte |
| `mutation_step_status` | pending, in_progress, completed, skipped |
| `mutation_type` | sale, donation, succession, other |
| `notification_channel` | email, registered_email, postal, registered_postal, hand_delivery |
| `opposition_status` | pending, opposed, paid, released, contested |
| `payment_method` | cash, check, transfer, card, direct_debit, other |
| `payment_phase_status` | pending, called, paid, overdue |
| `payment_status` | recorded, reconciled, reversed |
| `period_status` | open, closed, approved |
| `planned_work_status` | identified, voted, scheduled, in_progress, completed, cancelled |
| `priority_level` | low, normal, medium, high, critical |
| `reminder_status` | pending, sent, failed, stale, skipped |
| `repartition_basis` | tantiemes, surface, custom |
| `repartition_category` | general, special, alur |
| `resolution_status` | draft, pending, voting, voted, approved, rejected, adjourned, withdrawn |
| `resolution_type` | budget, accounts, works, contract, council, syndic, other |
| `service_order_event_type` | created, sent, status_change, comment, document, cancelled |
| `service_order_origin` | syndic, conseil, coproprietaire, contrat, autre |
| `service_order_status` | draft, sent, awaiting_provider, scheduled, in_progress, completed, closed, cancelled, refused |
| `service_order_type` | classique, urgent, contrat, art18 |
| `supplier_doc_kind` | invoice, credit_note |
| `supplier_invoice_status` | draft, posted, paid, cancelled |
| `technical_doc_type` | dta, dpe_collectif, diagnostic_plomb, diagnostic_electricite, diagnostic_gaz, carnet_entretien, controle_ascenseur, controle_chaufferie, controle_incendie, controle_jeux, garantie_decennale, garantie_biennale, plan_copropriete, reglement_copropriete, etat_descriptif, ppt, dtg, audit_energetique, autre |
| `tiers_category` | syndic, copropriete, externe |
| `transfer_destination` | works, reserve, operating, other |
| `treasury_advance_type` | permanent, special, work_fund |
| `vote_choice` | for, against, abstention |
| `vote_source` | live, correspondence |
| `wall_post_category` | information, urgent, question, event, other |

## Notes d'alignement (à trancher en consolidation)
- `membership_role` contient encore **`platform_admin`** (rôle) → **mort en v2** (super-admin = table `platform_admins` hors-tenant, C16-4). L'enum est laissé mais la valeur ne sert plus.
- `tiers_category` (syndic, copropriete, externe) ≠ l'`tiers_type` mentionné comme abandonné ailleurs — vérifier lequel est en place vs cible (fusion tiers + `work_domain`).
- `account_receivable_nature` = les 6 natures 45x (current/works/alur/loan/advance/doubtful) → cohérent 450-1..5 + 459.
- `ledger_source_type` est très riche (24 valeurs) : inclut `result_allocation`, `works_settlement`, `opening_onboarding` → confirmer le set cible finance-first.
