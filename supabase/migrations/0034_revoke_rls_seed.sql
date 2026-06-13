-- ============================================================================
-- 0034 — revoke-rls-seed : ACCEPTATION PHASE 0 (RLS + seed + COPRO-TEMPLATE)
-- ============================================================================
-- Contrat : .planning/db-cible/AUTORISATION.md (§1.3 matrice, §4 helpers, §5 gardes,
--   §6 RLS ON-prod/OFF-dev + FORCE GL). Helpers : 0023. Reconstruction propre (0 policy avant).
-- Patron : SELECT user_has_copro_access (donnee collective) / user_is_copro_manager (back-office) ;
--   ecriture user_is_copro_manager ; volet own lot-centric ou par-contenu ou.
--   anon = aucune policy. service_role bypasse la RLS.
-- Decisions USER (2026-06-07) : platform_admin non seede ; indivision visible (coproprietaires) ;
--   votes AG par RPC (pas de own-write ag_votes/ag_attendance/council_*) ; events lecture-copro/ecriture-mgr.
-- Ordre : (1) policies (79 tables) -> (2) assertion REVOKE + bascule env + FORCE + seed -> (3) provision_demo_tenant.
-- ============================================================================

-- ############################################################################
-- BLOC 1 — POLICIES RLS (79 tables)
-- ############################################################################

-- ===== lot tenance-identite =====
-- cabinets : classe D
create policy p_admin_all on public.cabinets
  as permissive for all to authenticated
  using (public.user_is_platform_admin())
  with check (public.user_is_platform_admin());
create policy p_sel_cabinet on public.cabinets
  for select to authenticated
  using (id = (select cabinet_id from public.profiles where id = auth.uid()));

-- copros : classe A
create policy p_sel_access on public.copros
  for select to authenticated
  using (public.user_has_copro_access(id));
create policy p_mgr_all on public.copros
  as permissive for all to authenticated
  using (public.user_is_copro_manager(id))
  with check (public.user_is_copro_manager(id));

-- buildings : classe A
create policy p_sel_access on public.buildings
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.buildings
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- lots : classe A
create policy p_sel_access on public.lots
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.lots
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- lot_owners : classe D
create policy p_sel_mgr_own on public.lot_owners
  for select to authenticated
  using (public.user_is_copro_manager(copro_id) or public.user_is_lot_owner_in_copro(copro_id, lot_id));
create policy p_mgr_all on public.lot_owners
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- coproprietaires : classe D
create policy p_mgr_all on public.coproprietaires
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));
create policy p_own_select on public.coproprietaires
  for select to authenticated
  using (user_id = auth.uid());
create policy p_own_indivision on public.coproprietaires
  for select to authenticated
  using (exists (
    select 1 from public.lot_owners lo
    where lo.coproprietaire_id = coproprietaires.id
      and lo.copro_id = coproprietaires.copro_id
      and lo.end_date is null
      and lo.lot_id = any(public.get_user_lot_ids(coproprietaires.copro_id))
  ));

-- repartition_keys : classe A
create policy p_sel_access on public.repartition_keys
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.repartition_keys
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- repartition_key_lines : classe A
create policy p_sel_access on public.repartition_key_lines
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.repartition_key_lines
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- memberships : classe D
create policy p_mgr_all on public.memberships
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));
create policy p_own_select on public.memberships
  for select to authenticated
  using (user_id = auth.uid());

-- profiles : classe D
create policy p_sel_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.user_is_platform_admin());
create policy p_own_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and cabinet_id is not distinct from (select cabinet_id from public.profiles where id = auth.uid()));
create policy p_admin_all on public.profiles
  as permissive for all to authenticated
  using (public.user_is_platform_admin())
  with check (public.user_is_platform_admin());

-- copro_invitations : classe D
create policy p_mgr_all on public.copro_invitations
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- work_domain : classe D
create policy p_sel_all on public.work_domain
  for select to authenticated
  using (true);
create policy p_admin_all on public.work_domain
  as permissive for all to authenticated
  using (public.user_is_platform_admin())
  with check (public.user_is_platform_admin());


-- ===== lot finance-gl =====
-- accounts : Classe B (back-office gestionnaire, manager only, AUCUN volet own)
create policy p_mgr_all on public.accounts as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- accounting_periods : Classe C (SELECT collectif user_has_copro_access + ALL mgr)
create policy p_sel_access on public.accounting_periods as permissive for select to authenticated using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.accounting_periods as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- ledger_transactions : Classe C (SELECT mgr OR own via ledger_entries.lot_id ; ALL mgr)
create policy p_sel_mgr on public.ledger_transactions as permissive for select to authenticated using (public.user_is_copro_manager(copro_id));
create policy p_sel_own on public.ledger_transactions as permissive for select to authenticated using (exists (select 1 from public.ledger_entries e where e.tx_id = ledger_transactions.id and e.lot_id = any (public.get_user_lot_ids(ledger_transactions.copro_id))));
create policy p_mgr_all on public.ledger_transactions as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- ledger_entries : Classe C (SELECT mgr OR own via lot_id ; ALL mgr)
create policy p_sel_mgr on public.ledger_entries as permissive for select to authenticated using (public.user_is_copro_manager(copro_id));
create policy p_sel_own on public.ledger_entries as permissive for select to authenticated using (lot_id = any (public.get_user_lot_ids(copro_id)));
create policy p_mgr_all on public.ledger_entries as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- period_cutoff_items : Classe B (back-office gestionnaire, manager only)
create policy p_mgr_all on public.period_cutoff_items as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- treasury_advances : Classe C (SELECT mgr OR own via user_is_lot_owner_in_copro ; ALL mgr)
create policy p_sel_mgr on public.treasury_advances as permissive for select to authenticated using (public.user_is_copro_manager(copro_id));
create policy p_sel_own on public.treasury_advances as permissive for select to authenticated using (public.user_is_lot_owner_in_copro(copro_id, lot_id));
create policy p_mgr_all on public.treasury_advances as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- bank_movements : Classe B (back-office gestionnaire, manager only)
create policy p_mgr_all on public.bank_movements as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- bank_matches : Classe B (back-office gestionnaire, manager only)
create policy p_mgr_all on public.bank_matches as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- Helpers DEFINER anti-récursion RLS collective_loans <-> collective_loan_shares (revue 0034).
create or replace function public.loan_copro_id(p_loan_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select copro_id from public.collective_loans where id = p_loan_id;
$$;
revoke execute on function public.loan_copro_id(uuid) from public, anon;
grant execute on function public.loan_copro_id(uuid) to authenticated, service_role;

create or replace function public.user_owns_share_in_loan(p_loan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.collective_loan_shares s
    where s.loan_id = p_loan_id
      and s.lot_id = any (public.get_user_lot_ids(public.loan_copro_id(p_loan_id)))
  );
$$;
revoke execute on function public.user_owns_share_in_loan(uuid) from public, anon;
grant execute on function public.user_owns_share_in_loan(uuid) to authenticated, service_role;

-- collective_loans : Classe C (SELECT mgr OR own via collective_loan_shares.lot_id ; ALL mgr)
create policy p_sel_mgr on public.collective_loans as permissive for select to authenticated using (public.user_is_copro_manager(copro_id));
create policy p_sel_own on public.collective_loans as permissive for select to authenticated using (public.user_owns_share_in_loan(collective_loans.id));
create policy p_mgr_all on public.collective_loans as permissive for all to authenticated using (public.user_is_copro_manager(copro_id)) with check (public.user_is_copro_manager(copro_id));

-- collective_loan_shares : Classe C dérivé (pas de copro_id ; via loan_id -> collective_loans.copro_id)
create policy p_sel_mgr on public.collective_loan_shares as permissive for select to authenticated using (public.user_is_copro_manager(public.loan_copro_id(collective_loan_shares.loan_id)));
create policy p_sel_own on public.collective_loan_shares as permissive for select to authenticated using (collective_loan_shares.lot_id = any (public.get_user_lot_ids(public.loan_copro_id(collective_loan_shares.loan_id))));
create policy p_mgr_all on public.collective_loan_shares as permissive for all to authenticated using (public.user_is_copro_manager(public.loan_copro_id(collective_loan_shares.loan_id))) with check (public.user_is_copro_manager(public.loan_copro_id(collective_loan_shares.loan_id)));


-- ===== lot budgets-appels-paiements =====
-- tiers : Classe E (annuaire)
create policy p_sel_mgr on public.tiers
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_mgr_all on public.tiers
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- budgets : Classe A (collectif)
create policy p_sel_access on public.budgets
  for select to authenticated
  using (user_has_copro_access(copro_id));
create policy p_mgr_all on public.budgets
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- budget_lines : Classe A (collectif)
create policy p_sel_access on public.budget_lines
  for select to authenticated
  using (user_has_copro_access(copro_id));
create policy p_mgr_all on public.budget_lines
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- budget_expenses : Classe A (collectif)
create policy p_sel_access on public.budget_expenses
  for select to authenticated
  using (user_has_copro_access(copro_id));
create policy p_mgr_all on public.budget_expenses
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- budget_payment_schedules : Classe A (collectif)
create policy p_sel_access on public.budget_payment_schedules
  for select to authenticated
  using (user_has_copro_access(copro_id));
create policy p_mgr_all on public.budget_payment_schedules
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- call_for_funds : Classe A (collectif)
create policy p_sel_access on public.call_for_funds
  for select to authenticated
  using (user_has_copro_access(copro_id));
create policy p_mgr_all on public.call_for_funds
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- call_for_funds_lines : Classe C (GL/finance volet own lot-centric)
create policy p_sel_mgr on public.call_for_funds_lines
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_sel_own on public.call_for_funds_lines
  for select to authenticated
  using (user_is_lot_owner_in_copro(copro_id, lot_id));
create policy p_mgr_all on public.call_for_funds_lines
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- payments : Classe C (GL/finance volet own lot-centric)
create policy p_sel_mgr on public.payments
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_sel_own on public.payments
  for select to authenticated
  using (user_is_lot_owner_in_copro(copro_id, lot_id));
create policy p_mgr_all on public.payments
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- payment_allocations : Classe C (GL/finance own via sous-requête call_for_funds_lines)
create policy p_sel_mgr on public.payment_allocations
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_sel_own on public.payment_allocations
  for select to authenticated
  using (exists (
    select 1 from public.call_for_funds_lines cl
    where cl.id = payment_allocations.call_line_id
      and cl.copro_id = payment_allocations.copro_id
      and cl.lot_id = any(get_user_lot_ids(payment_allocations.copro_id))
  ));
create policy p_mgr_all on public.payment_allocations
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- payment_reminders : Classe C (GL/finance volet own lot-centric)
create policy p_sel_mgr on public.payment_reminders
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_sel_own on public.payment_reminders
  for select to authenticated
  using (user_is_lot_owner_in_copro(copro_id, lot_id));
create policy p_mgr_all on public.payment_reminders
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- payment_reminder_rules : Classe B (back-office gestionnaire)
create policy p_sel_mgr on public.payment_reminder_rules
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_mgr_all on public.payment_reminder_rules
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- reminder_settings : Classe B (back-office gestionnaire)
create policy p_sel_mgr on public.reminder_settings
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_mgr_all on public.reminder_settings
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- alur_transfers : Classe A (collectif)
create policy p_sel_access on public.alur_transfers
  for select to authenticated
  using (user_has_copro_access(copro_id));
create policy p_mgr_all on public.alur_transfers
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- supplier_invoices : Classe B (back-office gestionnaire)
create policy p_sel_mgr on public.supplier_invoices
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_mgr_all on public.supplier_invoices
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- supplier_invoice_lines : Classe B (back-office gestionnaire)
create policy p_sel_mgr on public.supplier_invoice_lines
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_mgr_all on public.supplier_invoice_lines
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));

-- supplier_payments : Classe B (back-office gestionnaire)
create policy p_sel_mgr on public.supplier_payments
  for select to authenticated
  using (user_is_copro_manager(copro_id));
create policy p_mgr_all on public.supplier_payments
  as permissive for all to authenticated
  using (user_is_copro_manager(copro_id))
  with check (user_is_copro_manager(copro_id));


-- ===== lot ag-conseil =====
-- ag_meetings : classe A (collectif)
create policy p_sel_access on public.ag_meetings
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.ag_meetings
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ag_resolutions : classe A (collectif)
create policy p_sel_access on public.ag_resolutions
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.ag_resolutions
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ag_votes : classe A (collectif, PAS de own-write, vote via cast_vote RPC)
create policy p_sel_access on public.ag_votes
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.ag_votes
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ag_attendance : classe A (collectif, PAS de own-write)
create policy p_sel_access on public.ag_attendance
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.ag_attendance
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ag_correspondence_votes : classe A (collectif)
create policy p_sel_access on public.ag_correspondence_votes
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.ag_correspondence_votes
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ag_correspondence_vote_details : classe A (collectif)
create policy p_sel_access on public.ag_correspondence_vote_details
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.ag_correspondence_vote_details
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ag_session_drafts : classe F (brouillon par auteur gestionnaire)
create policy p_mgr_all on public.ag_session_drafts
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id) and user_id = auth.uid())
  with check (public.user_is_copro_manager(copro_id) and user_id = auth.uid());

-- ag_pending_actions : classe F (dérivé ag_id->ag_meetings.copro_id, interne mgr)
create policy p_mgr_all on public.ag_pending_actions
  as permissive for all to authenticated
  using (exists (select 1 from public.ag_meetings m where m.id = ag_id and public.user_is_copro_manager(m.copro_id)))
  with check (exists (select 1 from public.ag_meetings m where m.id = ag_id and public.user_is_copro_manager(m.copro_id)));

-- ag_envoi_tracking : classe F (own destinataire + ALL mgr dérivé)
create policy p_own_select on public.ag_envoi_tracking
  for select to authenticated
  using (exists (select 1 from public.coproprietaires co where co.id = coproprietaire_id and co.user_id = auth.uid()));
create policy p_mgr_all on public.ag_envoi_tracking
  as permissive for all to authenticated
  using (exists (select 1 from public.ag_meetings m where m.id = ag_id and public.user_is_copro_manager(m.copro_id)))
  with check (exists (select 1 from public.ag_meetings m where m.id = ag_id and public.user_is_copro_manager(m.copro_id)));

-- ag_milestones : classe A (collectif)
create policy p_sel_access on public.ag_milestones
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.ag_milestones
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ag_notifications : classe F (own destinataire + ALL mgr)
create policy p_own_select on public.ag_notifications
  for select to authenticated
  using (exists (select 1 from public.coproprietaires co where co.id = coproprietaire_id and co.user_id = auth.uid()));
create policy p_mgr_all on public.ag_notifications
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- ag_notification_events : classe F (dérivé notification_id->ag_notifications.copro_id, interne mgr)
create policy p_mgr_all on public.ag_notification_events
  as permissive for all to authenticated
  using (exists (select 1 from public.ag_notifications n where n.id = notification_id and public.user_is_copro_manager(n.copro_id)))
  with check (exists (select 1 from public.ag_notifications n where n.id = notification_id and public.user_is_copro_manager(n.copro_id)));

-- council_members : classe E (composition CS = info copro)
create policy p_sel_access on public.council_members
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.council_members
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- council_decisions : classe E (membre CS ou mgr ; PAS de own-write)
create policy p_sel_content on public.council_decisions
  for select to authenticated
  using (public.is_council_member(copro_id, auth.uid()) or public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.council_decisions
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- council_votes : classe E (membre CS ou mgr ; PAS de own-write, RPC)
create policy p_sel_content on public.council_votes
  for select to authenticated
  using (public.is_council_member(copro_id, auth.uid()) or public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.council_votes
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- council_documents : classe E (visibilité par contenu)
create policy p_sel_content on public.council_documents
  for select to authenticated
  using (public.can_view_content(copro_id, visibility, auth.uid()));
create policy p_mgr_all on public.council_documents
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));


-- ===== lot ged-mutations =====
-- documents : classe E (confidentialité par contenu — PAS de p_sel_access)
create policy p_sel_content on public.documents
  for select to authenticated
  using (public.user_can_view_document(id));
create policy p_mgr_all on public.documents
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- document_folders : classe A (collectif)
create policy p_sel_access on public.document_folders
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.document_folders
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- document_relations : classe E (confidentialité via document parent — PAS de p_sel_access)
create policy p_sel_content on public.document_relations
  for select to authenticated
  using (public.user_can_view_document(document_id));
create policy p_mgr_all on public.document_relations
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- document_versions : classe E (dérivé document_id -> documents ; immutable, pas U/D)
create policy p_sel_content on public.document_versions
  for select to authenticated
  using (public.user_can_view_document(document_id));
create policy p_mgr_insert on public.document_versions
  for insert to authenticated
  with check (exists (
    select 1 from public.documents d
    where d.id = document_versions.document_id
      and public.user_is_copro_manager(d.copro_id)
  ));

-- technical_documents : classe A (collectif)
create policy p_sel_access on public.technical_documents
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.technical_documents
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- mutations : classe B (back-office gestionnaire)
create policy p_sel_mgr on public.mutations
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.mutations
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- mutation_steps : classe B (back-office gestionnaire)
create policy p_sel_mgr on public.mutation_steps
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.mutation_steps
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- mutation_oppositions : classe B (back-office gestionnaire)
create policy p_sel_mgr on public.mutation_oppositions
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.mutation_oppositions
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- etat_date_snapshots : classe B (back-office gestionnaire ; immutable, pas U/D)
create policy p_sel_mgr on public.etat_date_snapshots
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_mgr_insert on public.etat_date_snapshots
  for insert to authenticated
  with check (public.user_is_copro_manager(copro_id));

-- legal_proceedings : classe B (back-office gestionnaire)
create policy p_sel_mgr on public.legal_proceedings
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.legal_proceedings
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- insurance_policies : classe A (collectif)
create policy p_sel_access on public.insurance_policies
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.insurance_policies
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- planned_works : classe A (collectif)
create policy p_sel_access on public.planned_works
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.planned_works
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));


-- ===== lot maintenance-comm =====
-- service_orders : classe B (back-office gestionnaire)
create policy p_sel_mgr on public.service_orders
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.service_orders
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- service_order_events : classe B (back-office gestionnaire, append-only)
create policy p_sel_mgr on public.service_order_events
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_ins_mgr on public.service_order_events
  for insert to authenticated
  with check (public.user_is_copro_manager(copro_id));

-- logbook_entries : classe B (back-office gestionnaire)
create policy p_sel_mgr on public.logbook_entries
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.logbook_entries
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- contracts : classe A (collectif)
create policy p_sel_access on public.contracts
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.contracts
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- conversations : classe E (confidentialité par membre)
create policy p_sel_member on public.conversations
  for select to authenticated
  using (public.is_conversation_member(id, auth.uid()) or public.user_is_copro_manager(copro_id));
create policy p_ins_access on public.conversations
  for insert to authenticated
  with check (public.user_has_copro_access(copro_id) and created_by = auth.uid());
create policy p_upd_mgr on public.conversations
  for update to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));
create policy p_del_mgr on public.conversations
  for delete to authenticated
  using (public.user_is_copro_manager(copro_id));

-- conversation_members : classe E (confidentialité par membre)
create policy p_sel_member on public.conversation_members
  for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));
create policy p_own_select on public.conversation_members
  for select to authenticated
  using (user_id = auth.uid());
create policy p_mgr_all on public.conversation_members
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- messages : classe E (confidentialité par membre ; auteur = author_id)
create policy p_sel_member on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()) or public.user_is_copro_manager(copro_id));
create policy p_own_insert on public.messages
  for insert to authenticated
  with check (public.is_conversation_member(conversation_id, auth.uid()) and author_id = auth.uid());
create policy p_own_update on public.messages
  for update to authenticated
  using (author_id = auth.uid() or public.user_is_copro_manager(copro_id))
  with check (author_id = auth.uid() or public.user_is_copro_manager(copro_id));
create policy p_own_delete on public.messages
  for delete to authenticated
  using (author_id = auth.uid() or public.user_is_copro_manager(copro_id));

-- wall_posts : classe E (confidentialité par contenu)
create policy p_sel_content on public.wall_posts
  for select to authenticated
  using (public.can_view_content(copro_id, visibility, auth.uid()));
create policy p_own_select on public.wall_posts
  for select to authenticated
  using (author_id = auth.uid());
create policy p_mgr_all on public.wall_posts
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

create policy p_own_insert on public.wall_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.user_has_copro_access(copro_id));
create policy p_own_update on public.wall_posts
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy p_own_delete on public.wall_posts
  for delete to authenticated
  using (author_id = auth.uid());

-- wall_comments : classe E (confidentialité héritée du post parent)
create policy p_sel_content on public.wall_comments
  for select to authenticated
  using (exists (
    select 1 from public.wall_posts p
    where p.id = wall_comments.post_id
      and public.can_view_content(p.copro_id, p.visibility, auth.uid())
  ));
create policy p_own_select on public.wall_comments
  for select to authenticated
  using (author_id = auth.uid());
create policy p_mgr_all on public.wall_comments
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

create policy p_own_insert on public.wall_comments
  for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.wall_posts p
    where p.id = wall_comments.post_id
      and public.can_view_content(p.copro_id, p.visibility, auth.uid())
  ));
create policy p_own_update on public.wall_comments
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy p_own_delete on public.wall_comments
  for delete to authenticated
  using (author_id = auth.uid());

-- wall_likes : classe E (confidentialité héritée du post parent)
create policy p_sel_content on public.wall_likes
  for select to authenticated
  using (exists (
    select 1 from public.wall_posts p
    where p.id = wall_likes.post_id
      and public.can_view_content(p.copro_id, p.visibility, auth.uid())
  ));
create policy p_own_insert on public.wall_likes
  for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.wall_posts p
    where p.id = wall_likes.post_id
      and public.can_view_content(p.copro_id, p.visibility, auth.uid())
  ));
create policy p_own_delete on public.wall_likes
  for delete to authenticated
  using (user_id = auth.uid());
create policy p_mgr_all on public.wall_likes
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- events : classe A (collectif ; lecture copro + écriture gestionnaire — décision 4)
create policy p_sel_access on public.events
  for select to authenticated
  using (public.user_has_copro_access(copro_id));
create policy p_mgr_all on public.events
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- mails : classe B (back-office gestionnaire)
create policy p_sel_mgr on public.mails
  for select to authenticated
  using (public.user_is_copro_manager(copro_id));
create policy p_mgr_all on public.mails
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- email_templates : classe E (système copro_id NULL hybride)
create policy p_sel_hybrid on public.email_templates
  for select to authenticated
  using (copro_id is null or public.user_has_copro_access(copro_id));
create policy p_ins_hybrid on public.email_templates
  for insert to authenticated
  with check ((copro_id is not null and public.user_is_copro_manager(copro_id)) or (copro_id is null and public.user_is_platform_admin()));
create policy p_upd_hybrid on public.email_templates
  for update to authenticated
  using ((copro_id is not null and public.user_is_copro_manager(copro_id)) or (copro_id is null and public.user_is_platform_admin()))
  with check ((copro_id is not null and public.user_is_copro_manager(copro_id)) or (copro_id is null and public.user_is_platform_admin()));
create policy p_del_hybrid on public.email_templates
  for delete to authenticated
  using ((copro_id is not null and public.user_is_copro_manager(copro_id)) or (copro_id is null and public.user_is_platform_admin()));


-- tiers_directory : REDEFINIE en SECURITY DEFINER + filtre copro interne (revue 0034).
-- La table tiers est manager-only (p_sel_mgr) ; le copropriétaire ne lit JAMAIS iban/bic/siret en direct.
-- L'annuaire prestataire (colonnes safe, sans coordonnées bancaires) lui est exposé UNIQUEMENT via cette vue,
-- qui borne à sa copro (user_has_copro_access) et bypasse la RLS de tiers (definer).
create or replace view public.tiers_directory with (security_invoker = false) as
select id, copro_id, name, category, domain_ids, vat_number, contact_name, contact_role,
       email, phone, address, postal_code, city, rating_avg, rating_count, certifications,
       description, is_active
from public.tiers
where is_notary = false
  and public.user_has_copro_access(copro_id);
revoke all on public.tiers_directory from anon;
grant select on public.tiers_directory to authenticated;

-- ############################################################################
-- BLOC 2 — INFRA : assertion REVOKE + bascule env + FORCE GL + seed global
-- ############################################################################

-- ============================================================
-- 0034 — revoke-rls-seed : blocs INFRA (REVOKE / BASCULE / FORCE / SEED)
-- Policies RLS = bloc séparé (Bloc 2). Ordre : (1) REVOKE filet,
-- (2)+(3) bascule env FAIL-SAFE (B1 : RLS ON + FORCE GL par défaut,
-- OFF uniquement si app.environment='development' — posé par seed.sql
-- local, [[dev_phase_rls]]), (4) seed global.
-- ============================================================

-- ------------------------------------------------------------
-- (1) REVOKE DÉFENSIF + ASSERTION — filet idempotent (M2)
--     anon doit être à 0 fonction EXECUTE (fait au fil de l'eau 0023→0033).
--     Sur un cloud neuf, des grants par défaut (extensions, plateforme)
--     peuvent exister : REVOKE de masse défensif d'abord, puis assertion
--     restreinte aux fonctions NON issues d'extensions (pg_depend
--     deptype 'e') pour ne pas casser le push sur un faux positif.
-- ------------------------------------------------------------
revoke execute on all functions in schema public from anon;

do $$
declare
  v_leaked text;
begin
  select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ')
    into v_leaked
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    and not exists (
      select 1 from pg_depend d
      where d.objid = p.oid and d.deptype = 'e'
    );

  if v_leaked is not null then
    raise exception
      'RLS filet (0034) : anon possède EXECUTE sur des fonctions public.* : %', v_leaked;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- (2)+(3) BASCULE ENV — FAIL-SAFE (B1) : RLS ON sauf dev EXPLICITE
--     `app.environment = 'development'` (posé par seed.sql en local)
--       → DISABLE + NO FORCE (phase dev, [[dev_phase_rls]]).
--     GUC absent ou toute autre valeur (cloud neuf, production)
--       → ENABLE sur toutes les tables du registre + FORCE sur les
--         5 tables du grand livre (RLS appliquée même au propriétaire,
--         jamais bypassée hors superuser/bypassrls).
--     Factorisée en fonction rejouable : appelée ici, par 0042
--     (resolution_templates créée APRÈS 0034 — ignorée ici via
--     to_regclass), par seed.sql (retour dev après reset local) et
--     par les tests d'étanchéité (simulation production).
-- ------------------------------------------------------------
create or replace function public.apply_rls_environment()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Fail-safe B1 : seul 'development' EXPLICITE désactive la RLS.
  v_dev boolean := current_setting('app.environment', true) = 'development';
  t text;
begin
  foreach t in array array[
    'cabinets', 'copros', 'buildings', 'lots', 'lot_owners', 'coproprietaires',
    'repartition_keys', 'repartition_key_lines', 'memberships', 'profiles',
    'copro_invitations', 'work_domain', 'accounts', 'accounting_periods',
    'ledger_transactions', 'ledger_entries', 'period_cutoff_items',
    'treasury_advances', 'bank_movements', 'bank_matches', 'collective_loans',
    'collective_loan_shares', 'tiers', 'budgets', 'budget_lines',
    'budget_expenses', 'budget_payment_schedules', 'call_for_funds',
    'call_for_funds_lines', 'payments', 'payment_allocations',
    'payment_reminders', 'payment_reminder_rules', 'reminder_settings',
    'alur_transfers', 'supplier_invoices', 'supplier_invoice_lines',
    'supplier_payments', 'ag_meetings', 'ag_resolutions', 'ag_votes',
    'ag_attendance', 'ag_correspondence_votes', 'ag_correspondence_vote_details',
    'ag_session_drafts', 'ag_pending_actions', 'ag_envoi_tracking',
    'ag_milestones', 'ag_notifications', 'ag_notification_events',
    'council_members', 'council_decisions', 'council_votes', 'council_documents',
    'documents', 'document_folders', 'document_relations', 'document_versions',
    'technical_documents', 'mutations', 'mutation_steps', 'mutation_oppositions',
    'etat_date_snapshots', 'legal_proceedings', 'insurance_policies',
    'planned_works', 'service_orders', 'service_order_events', 'logbook_entries',
    'contracts', 'conversations', 'conversation_members', 'messages',
    'wall_posts', 'wall_comments', 'wall_likes', 'events', 'mails',
    'email_templates',
    'resolution_templates',
    'ag_documents',      -- 0050 (rattrapage registre en 0052)
    'pv_templates'       -- 0052
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue; -- table pas encore créée à ce point de la chaîne (ex. resolution_templates avant 0042)
    end if;
    if v_dev then
      execute format('alter table public.%I disable row level security', t);
    else
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;

  foreach t in array array[
    'ledger_transactions', 'ledger_entries', 'accounting_periods',
    'accounts', 'payment_allocations'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    if v_dev then
      execute format('alter table public.%I no force row level security', t);
    else
      execute format('alter table public.%I force row level security', t);
    end if;
  end loop;
end;
$$;

-- Exécutable uniquement par le propriétaire (postgres : migrations, seed.sql, tests).
revoke execute on function public.apply_rls_environment() from public, anon, authenticated;

select public.apply_rls_environment();

-- ------------------------------------------------------------
-- (4) SEED global (service_role à l'exécution, idempotent)
-- ------------------------------------------------------------

-- work_domain : déjà seedé en 0004 (28 slugs). NE PAS re-seeder — assertion seule.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.work_domain;
  if v_count < 28 then
    raise exception
      'Seed work_domain (0034) : attendu >= 28 slugs (seed 0004), trouvé %', v_count;
  end if;
end;
$$;

-- platform_admin : NON seedé en SQL (décision USER 2026-06-07).
--   Compte réel créé hors migration, gates en service_role. Commentaire only.

-- email_templates système (copro_id NULL) : 6 modèles transverses.
--   ON CONFLICT cible l'index unique partiel uq_email_templates_code_system (code) WHERE copro_id IS NULL.
insert into public.email_templates
  (copro_id, code, name, description, subject, body_html, body_text, available_variables, is_active, is_default)
values
  (
    null,
    'ag_convocation',
    'Convocation à l''assemblée générale',
    'Modèle système de convocation envoyé aux copropriétaires.',
    'Convocation à l''assemblée générale de la copropriété {{copro_nom}} — {{ag_date}}',
    '<p>Madame, Monsieur {{coproprietaire_nom}},</p><p>Vous êtes convoqué(e) à l''assemblée générale {{ag_type}} de la copropriété <strong>{{copro_nom}}</strong>, qui se tiendra le <strong>{{ag_date}}</strong> à {{ag_heure}}, à l''adresse suivante : {{ag_lieu}}.</p><p>L''ordre du jour ainsi que les documents annexes sont joints à la présente convocation.</p><p>Le syndic, {{syndic_nom}}.</p>',
    'Madame, Monsieur {{coproprietaire_nom}},

Vous êtes convoqué(e) à l''assemblée générale {{ag_type}} de la copropriété {{copro_nom}}, qui se tiendra le {{ag_date}} à {{ag_heure}}, à l''adresse : {{ag_lieu}}.

L''ordre du jour et les documents annexes sont joints.

Le syndic, {{syndic_nom}}.',
    '["copro_nom","coproprietaire_nom","ag_type","ag_date","ag_heure","ag_lieu","syndic_nom"]'::jsonb,
    true,
    true
  ),
  (
    null,
    'ag_relance',
    'Relance de convocation à l''assemblée générale',
    'Modèle système de relance avant l''assemblée générale.',
    'Rappel — Assemblée générale de la copropriété {{copro_nom}} le {{ag_date}}',
    '<p>Madame, Monsieur {{coproprietaire_nom}},</p><p>Nous vous rappelons que l''assemblée générale de la copropriété <strong>{{copro_nom}}</strong> se tiendra le <strong>{{ag_date}}</strong> à {{ag_heure}}.</p><p>Si vous ne pouvez y assister, vous pouvez voter par correspondance ou donner pouvoir à un mandataire avant le {{date_limite}}.</p><p>Le syndic, {{syndic_nom}}.</p>',
    'Madame, Monsieur {{coproprietaire_nom}},

Nous vous rappelons que l''assemblée générale de la copropriété {{copro_nom}} se tiendra le {{ag_date}} à {{ag_heure}}.

Si vous ne pouvez y assister, vous pouvez voter par correspondance ou donner pouvoir avant le {{date_limite}}.

Le syndic, {{syndic_nom}}.',
    '["copro_nom","coproprietaire_nom","ag_date","ag_heure","date_limite","syndic_nom"]'::jsonb,
    true,
    true
  ),
  (
    null,
    'ag_pv_notification',
    'Notification du procès-verbal d''assemblée générale',
    'Modèle système de transmission du PV après l''assemblée générale.',
    'Procès-verbal de l''assemblée générale du {{ag_date}} — {{copro_nom}}',
    '<p>Madame, Monsieur {{coproprietaire_nom}},</p><p>Veuillez trouver ci-joint le procès-verbal de l''assemblée générale de la copropriété <strong>{{copro_nom}}</strong> tenue le <strong>{{ag_date}}</strong>.</p><p>Le délai de contestation des décisions court à compter de la présente notification, conformément à l''article 42 de la loi du 10 juillet 1965.</p><p>Le syndic, {{syndic_nom}}.</p>',
    'Madame, Monsieur {{coproprietaire_nom}},

Veuillez trouver ci-joint le procès-verbal de l''assemblée générale de la copropriété {{copro_nom}} tenue le {{ag_date}}.

Le délai de contestation court à compter de cette notification (art. 42 loi du 10 juillet 1965).

Le syndic, {{syndic_nom}}.',
    '["copro_nom","coproprietaire_nom","ag_date","syndic_nom"]'::jsonb,
    true,
    true
  ),
  (
    null,
    'payment_reminder_7',
    'Première relance d''impayé (J+7)',
    'Modèle système — premier rappel amiable d''appel de fonds échu.',
    'Rappel — Appel de fonds en attente de règlement — {{copro_nom}}',
    '<p>Madame, Monsieur {{coproprietaire_nom}},</p><p>Sauf erreur de notre part, l''appel de fonds n° {{appel_reference}} d''un montant de <strong>{{montant_du}}</strong>, échu le {{date_echeance}}, n''a pas encore été réglé.</p><p>Nous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais.</p><p>Le syndic, {{syndic_nom}}.</p>',
    'Madame, Monsieur {{coproprietaire_nom}},

Sauf erreur de notre part, l''appel de fonds n° {{appel_reference}} de {{montant_du}}, échu le {{date_echeance}}, n''a pas encore été réglé.

Merci de procéder à son règlement dans les meilleurs délais.

Le syndic, {{syndic_nom}}.',
    '["copro_nom","coproprietaire_nom","appel_reference","montant_du","date_echeance","syndic_nom"]'::jsonb,
    true,
    true
  ),
  (
    null,
    'payment_reminder_30',
    'Deuxième relance d''impayé (J+30)',
    'Modèle système — relance ferme d''appel de fonds échu.',
    'Deuxième rappel — Impayé sur la copropriété {{copro_nom}}',
    '<p>Madame, Monsieur {{coproprietaire_nom}},</p><p>Malgré notre précédent rappel, l''appel de fonds n° {{appel_reference}} d''un montant de <strong>{{montant_du}}</strong>, échu le {{date_echeance}}, demeure impayé.</p><p>Nous vous invitons à régulariser votre situation sous huitaine afin d''éviter l''engagement d''une procédure de recouvrement.</p><p>Le syndic, {{syndic_nom}}.</p>',
    'Madame, Monsieur {{coproprietaire_nom}},

Malgré notre précédent rappel, l''appel de fonds n° {{appel_reference}} de {{montant_du}}, échu le {{date_echeance}}, demeure impayé.

Merci de régulariser sous huitaine afin d''éviter une procédure de recouvrement.

Le syndic, {{syndic_nom}}.',
    '["copro_nom","coproprietaire_nom","appel_reference","montant_du","date_echeance","syndic_nom"]'::jsonb,
    true,
    true
  ),
  (
    null,
    'payment_reminder_60',
    'Mise en demeure (J+60)',
    'Modèle système — mise en demeure préalable au recouvrement contentieux.',
    'Mise en demeure — Impayé sur la copropriété {{copro_nom}}',
    '<p>Madame, Monsieur {{coproprietaire_nom}},</p><p>En l''absence de règlement de l''appel de fonds n° {{appel_reference}} d''un montant de <strong>{{montant_du}}</strong>, échu le {{date_echeance}}, nous vous mettons en demeure de régler la somme due dans un délai de quinze jours.</p><p>À défaut, le dossier sera transmis à notre conseil aux fins de recouvrement, les frais afférents restant à votre charge.</p><p>Le syndic, {{syndic_nom}}.</p>',
    'Madame, Monsieur {{coproprietaire_nom}},

En l''absence de règlement de l''appel de fonds n° {{appel_reference}} de {{montant_du}}, échu le {{date_echeance}}, nous vous mettons en demeure de régler la somme due sous quinze jours.

À défaut, le dossier sera transmis à notre conseil aux fins de recouvrement, frais à votre charge.

Le syndic, {{syndic_nom}}.',
    '["copro_nom","coproprietaire_nom","appel_reference","montant_du","date_echeance","syndic_nom"]'::jsonb,
    true,
    true
  )
on conflict (code) where copro_id is null do nothing;


-- ############################################################################
-- BLOC 3 — COPRO-TEMPLATE : provision_demo_tenant() (G-SVC, gates RLS)
-- ############################################################################

-- ============================================================================================
-- Bloc 5 — provision_demo_tenant()  [G-SVC]  — COPRO-TEMPLATE multi-cabinet pour gates RLS
-- ============================================================================================
-- Construit un environnement de DÉMO/TEST cloisonné pour éprouver la RLS de 0034 :
--   cabinet A + cabinet B ; gestionnaire A (membre de la copro) + gestionnaire B (AUCUNE
--   membership -> doit être REFUSÉ par la RLS sur la copro de A) ; une copro « DEMO Le Clos »
--   rattachée au cabinet A, son plan de comptes canonique, un exercice 2026 ouvert, et une
--   structure minimale (4 lots, 3 copropriétaires, lot_owners actifs, 3 clés + lignes, un
--   budget courant draft + lignes, 1 tiers fournisseur). Renvoie un jsonb des ids utiles.
--
-- Modèle : create_test_copro / seed_golden_loop (0029) pour la structure lots/clés/budget, et
--   pattern G-SVC (SECURITY DEFINER + is_service_call()) transverse 0023->0029.
--
-- ⚠ auth.users : sa DDL est GÉRÉE PAR GOTRUE (hors migrations publiques). On insère le MINIMUM
--   plausible pour qu'un local Supabase accepte la ligne et déclenche le trigger handle_new_user
--   (0011) qui crée le profil : id, instance_id, aud, role, email, encrypted_password,
--   raw_app_meta_data, raw_user_meta_data, created_at, updated_at. Les autres colonnes ont des
--   defaults côté GoTrue. Idempotent via on conflict (id). Le profil naît ensuite par TRIGGER ;
--   on UPDATE simplement profiles.cabinet_id. (Si une instance refusait l'INSERT direct pour
--   colonnes obligatoires supplémentaires, ajuster ICI le seul INSERT auth.users.)
--
-- IDEMPOTENT : uuids FIXES (cabinets, users, copro) + on conflict do nothing partout ; ré-appel
--   = no-op (renvoie les mêmes ids). Garde G-SVC stricte : 42501 hors service_role.
create or replace function public.provision_demo_tenant()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- UUIDs FIXES (idempotence + ré-référençables par le harnais de gates).
  v_cab_a   uuid := '0a000000-0000-4000-a000-000000000001';
  v_cab_b   uuid := '0b000000-0000-4000-a000-000000000002';
  v_gest_a  uuid := 'a5000000-0000-4000-a000-00000000000a';
  v_gest_b  uuid := 'b5000000-0000-4000-a000-00000000000b';
  v_copro   uuid := 'c0000000-0000-4000-a000-0000000000c0';
  v_period  uuid := 'ec000000-0000-4000-a000-0000000020c6';
  v_year    int  := 2026;

  v_lot1 uuid := '10000000-0000-4000-a000-000000000001';
  v_lot2 uuid := '10000000-0000-4000-a000-000000000002';
  v_lot3 uuid := '10000000-0000-4000-a000-000000000003';
  v_lot4 uuid := '10000000-0000-4000-a000-000000000004';
  v_co1  uuid := 'c1000000-0000-4000-a000-000000000001';
  v_co2  uuid := 'c1000000-0000-4000-a000-000000000002';
  v_co3  uuid := 'c1000000-0000-4000-a000-000000000003';
  v_key_gen uuid := 'ce000000-0000-4000-a000-000000000001';
  v_key_eau uuid := 'ce000000-0000-4000-a000-000000000002';
  v_key_asc uuid := 'ce000000-0000-4000-a000-000000000003';

  v_acc_assur  uuid; v_acc_syndic uuid; v_acc_menage uuid; v_acc_divers uuid;
  v_acc_eau    uuid; v_acc_asc uuid;
  v_acc_4501   uuid; v_acc_701 uuid; v_acc_512 uuid; v_acc_401 uuid;
  v_budget_id  uuid := 'b0d6e700-0000-4000-a000-000000000001';
  v_tiers      uuid := 'f0000000-0000-4000-a000-000000000001';
begin
  -- Garde G-SVC stricte : provisioning de démo jamais exposé en prod publique.
  if not public.is_service_call() then
    raise exception 'forbidden: service call required (provision_demo_tenant)'
      using errcode = '42501';
  end if;

  -- 1. Deux cabinets (tenants racines).
  insert into public.cabinets (id, name) values
    (v_cab_a, 'DEMO Cabinet A'),
    (v_cab_b, 'DEMO Cabinet B')
  on conflict (id) do nothing;

  -- 2. Deux utilisateurs gestionnaires dans auth.users -> le trigger handle_new_user crée le profil.
  --    Colonnes minimales plausibles GoTrue ; le reste prend ses defaults.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_gest_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'gest.a@demo.coproflex.test', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Gestionnaire A"}'::jsonb, now(), now()),
    (v_gest_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'gest.b@demo.coproflex.test', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Gestionnaire B"}'::jsonb, now(), now())
  on conflict (id) do nothing;

  -- 3. Rattachement cabinet de chaque gestionnaire (le profil existe via trigger handle_new_user).
  update public.profiles set cabinet_id = v_cab_a where id = v_gest_a;
  update public.profiles set cabinet_id = v_cab_b where id = v_gest_b;

  -- 4. Copro « DEMO Le Clos » sous le cabinet A (onboarding_step = NULL : copro en exercice vivant).
  insert into public.copros (id, cabinet_id, name, exercice_debut, onboarding_step)
  values (v_copro, v_cab_a, 'DEMO Le Clos', 1, null)
  on conflict (id) do nothing;

  -- 5. Membership gestionnaire A sur la copro (gestionnaire B reste SANS membership = isolé).
  insert into public.memberships (user_id, copro_id, role)
  values (v_gest_a, v_copro, 'gestionnaire')
  on conflict (user_id, copro_id) do nothing;

  -- 6. Plan de comptes canonique (idempotent via on conflict interne).
  perform public.provision_copro_chart(v_copro);

  -- 7. Exercice 2026 ouvert.
  insert into public.accounting_periods (id, copro_id, name, start_date, end_date, status)
  values (v_period, v_copro, 'Exercice ' || v_year,
          make_date(v_year, 1, 1), make_date(v_year, 12, 31), 'open')
  on conflict (id) do nothing;

  -- 8. Copropriétaires (3 ; Alice possède 2 lots ; on cable user_id de Bruno au gestionnaire B
  --    gestB reste un PUR étranger à la copro A (aucun lien personne) pour un test de cloisonnement net).
  insert into public.coproprietaires (id, copro_id, is_company, first_name, last_name, email, is_resident, user_id) values
    (v_co1, v_copro, false, 'Alice', 'Martin',  'alice.demo@coproflex.test',  true,  null),
    (v_co2, v_copro, false, 'Bruno', 'Durand',  'bruno.demo@coproflex.test',  true,  null),
    (v_co3, v_copro, false, 'Chloe', 'Bernard', 'chloe.demo@coproflex.test',  false, null)
  on conflict (id) do nothing;

  -- 9. Lots (4 lots).
  insert into public.lots (id, copro_id, ref, type, floor) values
    (v_lot1, v_copro, 'A101', 'appartement', 1),
    (v_lot2, v_copro, 'A102', 'appartement', 1),
    (v_lot3, v_copro, 'A201', 'appartement', 2),
    (v_lot4, v_copro, 'A202', 'appartement', 2)
  on conflict (id) do nothing;

  -- 10. lot_owners actifs (lot1+lot2 -> Alice ; lot3 -> Bruno ; lot4 -> Chloe), primaires.
  insert into public.lot_owners (lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date) values
    (v_lot1, v_co1, v_copro, 100, true, make_date(v_year, 1, 1)),
    (v_lot2, v_co1, v_copro, 100, true, make_date(v_year, 1, 1)),
    (v_lot3, v_co2, v_copro, 100, true, make_date(v_year, 1, 1)),
    (v_lot4, v_co3, v_copro, 100, true, make_date(v_year, 1, 1))
  on conflict (lot_id, coproprietaire_id, start_date) do nothing;

  -- 11. Clés : générale (all_lots, 4 lots) + eau (subset lot1,2) + ascenseur (subset lot3,4).
  insert into public.repartition_keys (id, copro_id, name, basis, category, coverage_mode, is_active, valid_from) values
    (v_key_gen, v_copro, 'Cle generale ' || v_year,  'tantiemes', 'general', 'all_lots', true, make_date(v_year, 1, 1)),
    (v_key_eau, v_copro, 'Cle eau ' || v_year,       'custom',    'special', 'subset',   true, make_date(v_year, 1, 1)),
    (v_key_asc, v_copro, 'Cle ascenseur ' || v_year, 'custom',    'special', 'subset',   true, make_date(v_year, 1, 1))
  on conflict (id) do nothing;

  insert into public.repartition_key_lines (key_id, lot_id, copro_id, weight) values
    (v_key_gen, v_lot1, v_copro, 250),
    (v_key_gen, v_lot2, v_copro, 250),
    (v_key_gen, v_lot3, v_copro, 250),
    (v_key_gen, v_lot4, v_copro, 250),
    (v_key_eau, v_lot1, v_copro, 50),
    (v_key_eau, v_lot2, v_copro, 50),
    (v_key_asc, v_lot3, v_copro, 50),
    (v_key_asc, v_lot4, v_copro, 50)
  on conflict (key_id, lot_id) do nothing;

  -- 12. Comptes utiles (provisionnés par provision_copro_chart) résolus par code.
  select id into v_acc_assur  from public.accounts where copro_id = v_copro and code = '616';
  select id into v_acc_syndic from public.accounts where copro_id = v_copro and code = '621';
  select id into v_acc_menage from public.accounts where copro_id = v_copro and code = '611';
  select id into v_acc_divers from public.accounts where copro_id = v_copro and code = '628';
  select id into v_acc_eau    from public.accounts where copro_id = v_copro and code = '601';
  select id into v_acc_asc    from public.accounts where copro_id = v_copro and code = '614';
  select id into v_acc_4501   from public.accounts where copro_id = v_copro and code = '450-1';
  select id into v_acc_701    from public.accounts where copro_id = v_copro and code = '701';
  select id into v_acc_512    from public.accounts where copro_id = v_copro and code = '512';
  select id into v_acc_401    from public.accounts where copro_id = v_copro and code = '401';
  if v_acc_assur is null or v_acc_syndic is null or v_acc_menage is null
     or v_acc_divers is null or v_acc_eau is null or v_acc_asc is null then
    raise exception 'provision_demo_tenant: plan de comptes incomplet pour la copro %', v_copro;
  end if;

  -- 13. Budget prévisionnel courant (draft) + lignes (Total = 18000).
  insert into public.budgets (id, copro_id, period_id, budget_type, status, version, name)
  values (v_budget_id, v_copro, v_period, 'current', 'draft', 1, 'Budget previsionnel ' || v_year)
  on conflict (id) do nothing;

  insert into public.budget_lines (budget_id, copro_id, account_id, repartition_key_id, label, amount, code, sort_order) values
    (v_budget_id, v_copro, v_acc_assur,  v_key_gen, 'Assurance immeuble',      5250.00, '616', 1),
    (v_budget_id, v_copro, v_acc_syndic, v_key_gen, 'Honoraires syndic',       4500.00, '621', 2),
    (v_budget_id, v_copro, v_acc_menage, v_key_gen, 'Menage parties communes', 3750.00, '611', 3),
    (v_budget_id, v_copro, v_acc_divers, v_key_gen, 'Charges diverses',        1500.00, '628', 4),
    (v_budget_id, v_copro, v_acc_eau,    v_key_eau, 'Eau froide collective',   1600.00, '601', 5),
    (v_budget_id, v_copro, v_acc_asc,    v_key_asc, 'Maintenance ascenseur',   1400.00, '614', 6)
  on conflict do nothing;

  -- 14. Un tiers fournisseur (uq_tiers_name unique(copro_id,name) ; ck_tiers_role -> is_supplier).
  insert into public.tiers (id, copro_id, name, is_supplier, category, is_active)
  values (v_tiers, v_copro, 'Prestataire Demo', true, 'externe', true)
  on conflict (id) do nothing;

  return jsonb_build_object(
    'cabinet_a',     v_cab_a,
    'cabinet_b',     v_cab_b,
    'copro',         v_copro,
    'period_2026',   v_period,
    'gest_a_uid',    v_gest_a,
    'gest_b_uid',    v_gest_b,
    'budget_id',     v_budget_id,
    'lot_ids',       jsonb_build_array(v_lot1, v_lot2, v_lot3, v_lot4),
    'copro_pers_ids',jsonb_build_array(v_co1, v_co2, v_co3),
    'tiers_id',      v_tiers,
    'account_ids',   jsonb_build_object(
      'acc_4501', v_acc_4501,
      'acc_701',  v_acc_701,
      'acc_512',  v_acc_512,
      'acc_401',  v_acc_401,
      'acc_616',  v_acc_assur,
      'acc_621',  v_acc_syndic,
      'acc_611',  v_acc_menage,
      'acc_628',  v_acc_divers,
      'acc_601',  v_acc_eau,
      'acc_614',  v_acc_asc
    )
  );
end;
$$;
revoke execute on function public.provision_demo_tenant() from public, anon;
grant execute on function public.provision_demo_tenant() to service_role;

comment on function public.provision_demo_tenant() is
  'COPRO-TEMPLATE multi-cabinet pour les gates RLS 0034 : cabinet A + B, gestionnaire A (membre) + gestionnaire B (sans membership = isolé), copro « DEMO Le Clos » (cabinet A) + plan canonique + exercice 2026 ouvert + structure (4 lots, 3 coproprietaires, lot_owners, 3 cles, budget courant draft + lignes, 1 tiers). Renvoie le jsonb des ids. Idempotent (uuids fixes + on conflict). auth.users inseré au minimum (DDL GoTrue) -> trigger handle_new_user crée le profil. G-SVC.';

