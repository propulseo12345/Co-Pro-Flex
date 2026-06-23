--
-- PostgreSQL database dump
--

\restrict XiuDCBpdhAEj43eOYIwHJqh9ubIYGSwWASSZwF4JvhUKKYishFE6TZPJpSbnhJf

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: account_receivable_nature; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.account_receivable_nature AS ENUM (
    'current',
    'works',
    'alur',
    'loan',
    'advance',
    'doubtful'
);


ALTER TYPE public.account_receivable_nature OWNER TO postgres;

--
-- Name: account_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.account_type AS ENUM (
    'asset',
    'liability',
    'income',
    'expense',
    'equity'
);


ALTER TYPE public.account_type OWNER TO postgres;

--
-- Name: ag_action_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ag_action_type AS ENUM (
    'CREATE_BUDGET',
    'APPROVE_ACCOUNTS',
    'SCHEDULE_BUDGET_PAYMENTS',
    'CREATE_ALUR_FUND',
    'SCHEDULE_ALUR_PAYMENTS',
    'CREATE_WORK_BUDGET',
    'CREATE_EXCEPTIONAL_CALL',
    'ELECT_COUNCIL',
    'APPOINT_SYNDIC',
    'MANAGE_CONTRACT',
    'GRANT_QUITUS',
    'DESIGNATE_BUREAU'
);


ALTER TYPE public.ag_action_type OWNER TO postgres;

--
-- Name: ag_draft_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ag_draft_type AS ENUM (
    'attendance',
    'resolutions',
    'votes',
    'pv',
    'envoi',
    'milestones',
    'other'
);


ALTER TYPE public.ag_draft_type OWNER TO postgres;

--
-- Name: ag_meeting_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ag_meeting_type AS ENUM (
    'ordinary',
    'extraordinary',
    'mixed'
);


ALTER TYPE public.ag_meeting_type OWNER TO postgres;

--
-- Name: ag_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ag_status AS ENUM (
    'draft',
    'convoked',
    'in_progress',
    'session_active',
    'closed',
    'pv_generated',
    'pv_signed',
    'pv_sent',
    'finalized',
    'archived'
);


ALTER TYPE public.ag_status OWNER TO postgres;

--
-- Name: attendance_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.attendance_type AS ENUM (
    'present',
    'proxy',
    'correspondence'
);


ALTER TYPE public.attendance_type OWNER TO postgres;

--
-- Name: bank_match_target_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.bank_match_target_type AS ENUM (
    'payment',
    'supplier_payment',
    'other'
);


ALTER TYPE public.bank_match_target_type OWNER TO postgres;

--
-- Name: bank_movement_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.bank_movement_status AS ENUM (
    'unmatched',
    'matched',
    'ignored'
);


ALTER TYPE public.bank_movement_status OWNER TO postgres;

--
-- Name: budget_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.budget_status AS ENUM (
    'draft',
    'submitted',
    'validated',
    'rejected',
    'closed'
);


ALTER TYPE public.budget_status OWNER TO postgres;

--
-- Name: budget_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.budget_type AS ENUM (
    'current',
    'works',
    'alur'
);


ALTER TYPE public.budget_type OWNER TO postgres;

--
-- Name: call_for_funds_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.call_for_funds_status AS ENUM (
    'draft',
    'issued',
    'partially_paid',
    'paid',
    'cancelled'
);


ALTER TYPE public.call_for_funds_status OWNER TO postgres;

--
-- Name: call_line_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.call_line_status AS ENUM (
    'unpaid',
    'partial',
    'paid'
);


ALTER TYPE public.call_line_status OWNER TO postgres;

--
-- Name: collective_loan_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.collective_loan_status AS ENUM (
    'active',
    'repaid',
    'cancelled'
);


ALTER TYPE public.collective_loan_status OWNER TO postgres;

--
-- Name: content_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.content_visibility AS ENUM (
    'all_members',
    'council_only',
    'managers_only'
);


ALTER TYPE public.content_visibility OWNER TO postgres;

--
-- Name: contract_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contract_status AS ENUM (
    'draft',
    'active',
    'to_renew',
    'expired',
    'terminated'
);


ALTER TYPE public.contract_status OWNER TO postgres;

--
-- Name: correspondence_form_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.correspondence_form_status AS ENUM (
    'pending',
    'validated',
    'integrated'
);


ALTER TYPE public.correspondence_form_status OWNER TO postgres;

--
-- Name: council_decision_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.council_decision_status AS ENUM (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'archived'
);


ALTER TYPE public.council_decision_status OWNER TO postgres;

--
-- Name: council_doc_link_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.council_doc_link_type AS ENUM (
    'contract',
    'service_order',
    'ag',
    'invoice',
    'budget',
    'other'
);


ALTER TYPE public.council_doc_link_type OWNER TO postgres;

--
-- Name: council_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.council_role AS ENUM (
    'president',
    'secretary',
    'treasurer',
    'member',
    'observer'
);


ALTER TYPE public.council_role OWNER TO postgres;

--
-- Name: coverage_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.coverage_mode AS ENUM (
    'all_lots',
    'subset'
);


ALTER TYPE public.coverage_mode OWNER TO postgres;

--
-- Name: cutoff_kind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cutoff_kind AS ENUM (
    'CAP',
    'CCA',
    'PCA',
    'PAR'
);


ALTER TYPE public.cutoff_kind OWNER TO postgres;

--
-- Name: delivery_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.delivery_status AS ENUM (
    'pending',
    'queued',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
    'cancelled'
);


ALTER TYPE public.delivery_status OWNER TO postgres;

--
-- Name: document_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_category AS ENUM (
    'pv_ag',
    'convocation',
    'reglement',
    'contrat',
    'facture',
    'devis',
    'diagnostic',
    'assurance',
    'budget',
    'appel_fonds',
    'releve_charges',
    'etat_date',
    'courrier',
    'photo',
    'plan',
    'ordre_service',
    'autre'
);


ALTER TYPE public.document_category OWNER TO postgres;

--
-- Name: document_entity_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_entity_type AS ENUM (
    'ag',
    'resolution',
    'service_order',
    'contract',
    'supplier_invoice',
    'mutation',
    'budget',
    'lot',
    'coproprietaire',
    'council',
    'event',
    'other'
);


ALTER TYPE public.document_entity_type OWNER TO postgres;

--
-- Name: document_relation_kind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_relation_kind AS ENUM (
    'related',
    'annexe',
    'source',
    'justificatif'
);


ALTER TYPE public.document_relation_kind OWNER TO postgres;

--
-- Name: document_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_source AS ENUM (
    'manual',
    'ag',
    'finance',
    'maintenance',
    'mutation',
    'system'
);


ALTER TYPE public.document_source OWNER TO postgres;

--
-- Name: document_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_status AS ENUM (
    'active',
    'archived',
    'deleted'
);


ALTER TYPE public.document_status OWNER TO postgres;

--
-- Name: document_visibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_visibility AS ENUM (
    'gestionnaire_seul',
    'conseil',
    'tous_coproprietaires'
);


ALTER TYPE public.document_visibility OWNER TO postgres;

--
-- Name: etat_date_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.etat_date_type AS ENUM (
    'pre',
    'final'
);


ALTER TYPE public.etat_date_type OWNER TO postgres;

--
-- Name: event_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_type AS ENUM (
    'ag',
    'reunion_cs',
    'travaux',
    'intervention',
    'fete',
    'autre'
);


ALTER TYPE public.event_type OWNER TO postgres;

--
-- Name: expense_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.expense_status AS ENUM (
    'draft',
    'pending_validation',
    'validated',
    'rejected'
);


ALTER TYPE public.expense_status OWNER TO postgres;

--
-- Name: insurance_sub_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.insurance_sub_type AS ENUM (
    'multirisque',
    'dommages_ouvrage',
    'rc',
    'protection_juridique',
    'autre'
);


ALTER TYPE public.insurance_sub_type OWNER TO postgres;

--
-- Name: intervention_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.intervention_category AS ENUM (
    'courante',
    'urgente',
    'reglementaire',
    'travaux'
);


ALTER TYPE public.intervention_category OWNER TO postgres;

--
-- Name: intervention_frequency; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.intervention_frequency AS ENUM (
    'once',
    'weekly',
    'monthly',
    'quarterly',
    'biannual',
    'annual'
);


ALTER TYPE public.intervention_frequency OWNER TO postgres;

--
-- Name: invitation_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invitation_status AS ENUM (
    'pending',
    'accepted',
    'revoked',
    'expired'
);


ALTER TYPE public.invitation_status OWNER TO postgres;

--
-- Name: ledger_direction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ledger_direction AS ENUM (
    'debit',
    'credit'
);


ALTER TYPE public.ledger_direction OWNER TO postgres;

--
-- Name: ledger_source_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ledger_source_type AS ENUM (
    'budget',
    'call_for_funds',
    'payment',
    'supplier_invoice',
    'supplier_payment',
    'bank_movement',
    'transfer',
    'od',
    'opening',
    'closing',
    'manual',
    'opening_balance',
    'opening_onboarding',
    'reclassification',
    'result_allocation',
    'budget_expense',
    'mutation',
    'collective_loan'
);


ALTER TYPE public.ledger_source_type OWNER TO postgres;

--
-- Name: ledger_tx_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ledger_tx_status AS ENUM (
    'draft',
    'posted'
);


ALTER TYPE public.ledger_tx_status OWNER TO postgres;

--
-- Name: legal_proceeding_nature; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.legal_proceeding_nature AS ENUM (
    'litigation',
    'recovery',
    'other'
);


ALTER TYPE public.legal_proceeding_nature OWNER TO postgres;

--
-- Name: legal_proceeding_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.legal_proceeding_status AS ENUM (
    'pending',
    'in_progress',
    'closed',
    'won',
    'lost'
);


ALTER TYPE public.legal_proceeding_status OWNER TO postgres;

--
-- Name: logbook_entry_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.logbook_entry_type AS ENUM (
    'intervention',
    'controle',
    'incident',
    'maintenance',
    'autre'
);


ALTER TYPE public.logbook_entry_type OWNER TO postgres;

--
-- Name: logbook_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.logbook_status AS ENUM (
    'planifiee',
    'en_cours',
    'terminee'
);


ALTER TYPE public.logbook_status OWNER TO postgres;

--
-- Name: lot_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lot_type AS ENUM (
    'appartement',
    'studio',
    'commerce',
    'bureau',
    'cave',
    'parking',
    'garage',
    'local_technique',
    'autre'
);


ALTER TYPE public.lot_type OWNER TO postgres;

--
-- Name: majority_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.majority_type AS ENUM (
    'art24',
    'art25',
    'art25_1',
    'art26',
    'art26_1',
    'unanimity'
);


ALTER TYPE public.majority_type OWNER TO postgres;

--
-- Name: membership_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.membership_role AS ENUM (
    'gestionnaire',
    'coproprietaire',
    'platform_admin'
);


ALTER TYPE public.membership_role OWNER TO postgres;

--
-- Name: message_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.message_type AS ENUM (
    'text',
    'file',
    'system'
);


ALTER TYPE public.message_type OWNER TO postgres;

--
-- Name: mutation_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mutation_status AS ENUM (
    'draft',
    'pre_etat_generated',
    'etat_generated',
    'signed',
    'validated',
    'cancelled'
);


ALTER TYPE public.mutation_status OWNER TO postgres;

--
-- Name: mutation_step_key; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mutation_step_key AS ENUM (
    'demande',
    'pre_etat_date',
    'etat_date',
    'envoi_notaire',
    'signature_acte',
    'cloture_compte'
);


ALTER TYPE public.mutation_step_key OWNER TO postgres;

--
-- Name: mutation_step_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mutation_step_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped'
);


ALTER TYPE public.mutation_step_status OWNER TO postgres;

--
-- Name: mutation_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mutation_type AS ENUM (
    'sale',
    'donation',
    'succession',
    'other'
);


ALTER TYPE public.mutation_type OWNER TO postgres;

--
-- Name: notification_channel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_channel AS ENUM (
    'email',
    'registered_email',
    'postal',
    'registered_postal',
    'hand_delivery'
);


ALTER TYPE public.notification_channel OWNER TO postgres;

--
-- Name: opposition_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.opposition_status AS ENUM (
    'pending',
    'opposed',
    'paid',
    'released',
    'contested'
);


ALTER TYPE public.opposition_status OWNER TO postgres;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'check',
    'transfer',
    'card',
    'direct_debit',
    'other'
);


ALTER TYPE public.payment_method OWNER TO postgres;

--
-- Name: payment_phase_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_phase_status AS ENUM (
    'pending',
    'called',
    'paid',
    'overdue'
);


ALTER TYPE public.payment_phase_status OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'recorded',
    'reconciled',
    'reversed'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- Name: period_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.period_status AS ENUM (
    'open',
    'closed',
    'approved'
);


ALTER TYPE public.period_status OWNER TO postgres;

--
-- Name: planned_work_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.planned_work_status AS ENUM (
    'identified',
    'voted',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE public.planned_work_status OWNER TO postgres;

--
-- Name: priority_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.priority_level AS ENUM (
    'low',
    'normal',
    'medium',
    'high',
    'critical'
);


ALTER TYPE public.priority_level OWNER TO postgres;

--
-- Name: reminder_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reminder_status AS ENUM (
    'pending',
    'sent',
    'failed',
    'stale',
    'skipped'
);


ALTER TYPE public.reminder_status OWNER TO postgres;

--
-- Name: repartition_basis; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.repartition_basis AS ENUM (
    'tantiemes',
    'surface',
    'custom'
);


ALTER TYPE public.repartition_basis OWNER TO postgres;

--
-- Name: repartition_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.repartition_category AS ENUM (
    'general',
    'special',
    'alur'
);


ALTER TYPE public.repartition_category OWNER TO postgres;

--
-- Name: resolution_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.resolution_status AS ENUM (
    'draft',
    'pending',
    'voting',
    'voted',
    'approved',
    'rejected',
    'adjourned',
    'withdrawn'
);


ALTER TYPE public.resolution_status OWNER TO postgres;

--
-- Name: resolution_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.resolution_type AS ENUM (
    'budget',
    'accounts',
    'works',
    'contract',
    'council',
    'syndic',
    'other'
);


ALTER TYPE public.resolution_type OWNER TO postgres;

--
-- Name: service_order_event_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.service_order_event_type AS ENUM (
    'created',
    'sent',
    'status_change',
    'comment',
    'document',
    'cancelled'
);


ALTER TYPE public.service_order_event_type OWNER TO postgres;

--
-- Name: service_order_origin; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.service_order_origin AS ENUM (
    'syndic',
    'conseil',
    'coproprietaire',
    'contrat',
    'autre'
);


ALTER TYPE public.service_order_origin OWNER TO postgres;

--
-- Name: service_order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.service_order_status AS ENUM (
    'draft',
    'sent',
    'awaiting_provider',
    'scheduled',
    'in_progress',
    'completed',
    'closed',
    'cancelled',
    'refused'
);


ALTER TYPE public.service_order_status OWNER TO postgres;

--
-- Name: service_order_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.service_order_type AS ENUM (
    'classique',
    'urgent',
    'contrat',
    'art18'
);


ALTER TYPE public.service_order_type OWNER TO postgres;

--
-- Name: supplier_invoice_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.supplier_invoice_status AS ENUM (
    'draft',
    'posted',
    'paid',
    'cancelled'
);


ALTER TYPE public.supplier_invoice_status OWNER TO postgres;

--
-- Name: technical_doc_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.technical_doc_type AS ENUM (
    'dta',
    'dpe_collectif',
    'diagnostic_plomb',
    'diagnostic_electricite',
    'diagnostic_gaz',
    'carnet_entretien',
    'controle_ascenseur',
    'controle_chaufferie',
    'controle_incendie',
    'controle_jeux',
    'garantie_decennale',
    'garantie_biennale',
    'plan_copropriete',
    'reglement_copropriete',
    'etat_descriptif',
    'ppt',
    'dtg',
    'audit_energetique',
    'autre'
);


ALTER TYPE public.technical_doc_type OWNER TO postgres;

--
-- Name: tiers_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tiers_category AS ENUM (
    'syndic',
    'copropriete',
    'externe'
);


ALTER TYPE public.tiers_category OWNER TO postgres;

--
-- Name: transfer_destination; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transfer_destination AS ENUM (
    'works',
    'reserve',
    'operating',
    'other'
);


ALTER TYPE public.transfer_destination OWNER TO postgres;

--
-- Name: treasury_advance_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.treasury_advance_type AS ENUM (
    'permanent',
    'special',
    'work_fund'
);


ALTER TYPE public.treasury_advance_type OWNER TO postgres;

--
-- Name: vote_choice; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vote_choice AS ENUM (
    'for',
    'against',
    'abstention'
);


ALTER TYPE public.vote_choice OWNER TO postgres;

--
-- Name: vote_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vote_source AS ENUM (
    'live',
    'correspondence'
);


ALTER TYPE public.vote_source OWNER TO postgres;

--
-- Name: wall_post_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.wall_post_category AS ENUM (
    'information',
    'urgent',
    'question',
    'event',
    'other'
);


ALTER TYPE public.wall_post_category OWNER TO postgres;

--
-- Name: check_tiers_domain_ids(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_tiers_domain_ids() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare d uuid;
begin
  foreach d in array new.domain_ids loop
    if not exists (select 1 from public.work_domain where id = d) then
      raise exception 'tiers % : domain_id % absent de work_domain', new.id, d using errcode='23503';
    end if;
  end loop;
  return new;
end;
$$;


ALTER FUNCTION public.check_tiers_domain_ids() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: tr_invitation_copro_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tr_invitation_copro_consistency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (select copro_id from public.coproprietaires where id = new.coproprietaire_id) <> new.copro_id then
    raise exception 'invitation % : coproprietaire d''une autre copro', new.id using errcode='23514';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.tr_invitation_copro_consistency() OWNER TO postgres;

--
-- Name: tr_lot_copro_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tr_lot_copro_consistency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.building_id is not null then
    if (select copro_id from public.buildings where id = new.building_id) <> new.copro_id then
      raise exception 'lot % : building_id appartient a une autre copro', new.id using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.tr_lot_copro_consistency() OWNER TO postgres;

--
-- Name: tr_lot_owner_copro_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tr_lot_owner_copro_consistency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (select copro_id from public.lots where id = new.lot_id) <> new.copro_id
     or (select copro_id from public.coproprietaires where id = new.coproprietaire_id) <> new.copro_id then
    raise exception 'lot_owner % : lot/coproprietaire/copro incoherents', new.id using errcode='23514';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.tr_lot_owner_copro_consistency() OWNER TO postgres;

--
-- Name: tr_lot_owner_shares_sum(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tr_lot_owner_shares_sum() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare v_lot uuid; v_sum numeric;
begin
  v_lot := coalesce(new.lot_id, old.lot_id);
  select coalesce(sum(share_percent),0) into v_sum
  from public.lot_owners where lot_id = v_lot and end_date is null;
  if v_sum > 100.0005 then
    raise exception 'lot % : Σ share_percent actifs (%) > 100', v_lot, v_sum using errcode='23514';
  end if;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION public.tr_lot_owner_shares_sum() OWNER TO postgres;

--
-- Name: tr_rkl_copro_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tr_rkl_copro_consistency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (select copro_id from public.repartition_keys where id = new.key_id) <> new.copro_id
     or (select copro_id from public.lots where id = new.lot_id) <> new.copro_id then
    raise exception 'rkl % : key/lot/copro incoherents', new.id using errcode='23514';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.tr_rkl_copro_consistency() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounting_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounting_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status public.period_status DEFAULT 'open'::public.period_status NOT NULL,
    closed_at timestamp with time zone,
    closed_by uuid,
    approved_at timestamp with time zone,
    approved_by uuid,
    approval_notes text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_period_dates CHECK ((end_date > start_date))
);


ALTER TABLE public.accounting_periods OWNER TO postgres;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    account_type public.account_type NOT NULL,
    nature public.account_receivable_nature,
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_postable boolean DEFAULT true NOT NULL,
    description text,
    iban text,
    bic text,
    bank_name text,
    initial_balance numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_nature_only_on_45x CHECK (((nature IS NULL) OR (code ~~ '45%'::text)))
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: ag_attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ag_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    coproprietaire_id uuid NOT NULL,
    lot_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    tantiemes numeric DEFAULT 0 NOT NULL,
    presence_type public.attendance_type DEFAULT 'present'::public.attendance_type NOT NULL,
    represented_by_id uuid,
    represented_by_name text,
    proxy_document_id uuid,
    proxy_signed_at timestamp with time zone,
    signed boolean DEFAULT false NOT NULL,
    signed_at timestamp with time zone,
    signature_data text,
    arrived_at timestamp with time zone,
    left_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ag_attendance_proxy CHECK (((presence_type <> 'proxy'::public.attendance_type) OR (represented_by_id IS NOT NULL))),
    CONSTRAINT ck_ag_attendance_self CHECK ((represented_by_id <> coproprietaire_id))
);


ALTER TABLE public.ag_attendance OWNER TO postgres;

--
-- Name: ag_correspondence_vote_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_correspondence_vote_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    correspondence_form_id uuid NOT NULL,
    resolution_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    coproprietaire_id uuid NOT NULL,
    vote public.vote_choice NOT NULL,
    integrated_vote_id uuid,
    integrated_at timestamp with time zone,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    recorded_by uuid
);


ALTER TABLE public.ag_correspondence_vote_details OWNER TO postgres;

--
-- Name: ag_correspondence_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_correspondence_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ag_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    coproprietaire_id uuid NOT NULL,
    form_document_id uuid,
    reception_method text DEFAULT 'postal'::text,
    received_at timestamp with time zone,
    status public.correspondence_form_status DEFAULT 'pending'::public.correspondence_form_status NOT NULL,
    integrated_at timestamp with time zone,
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ag_corr_reception_method CHECK ((reception_method = ANY (ARRAY['postal'::text, 'email'::text, 'hand_delivery'::text])))
);


ALTER TABLE public.ag_correspondence_votes OWNER TO postgres;

--
-- Name: ag_envoi_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_envoi_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ag_id uuid NOT NULL,
    coproprietaire_id uuid,
    method public.notification_channel NOT NULL,
    status public.delivery_status DEFAULT 'queued'::public.delivery_status NOT NULL,
    tracking_ref text,
    document_id uuid,
    error_message text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ag_envoi_tracking OWNER TO postgres;

--
-- Name: ag_meetings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    title text NOT NULL,
    meeting_type public.ag_meeting_type DEFAULT 'ordinary'::public.ag_meeting_type NOT NULL,
    meeting_date timestamp with time zone NOT NULL,
    location text,
    convocation_date timestamp with time zone,
    status public.ag_status DEFAULT 'draft'::public.ag_status NOT NULL,
    quorum_required boolean DEFAULT true NOT NULL,
    president_id uuid,
    president_name text,
    secretary_id uuid,
    secretary_name text,
    scrutineer1_id uuid,
    scrutineer1_name text,
    scrutineer2_id uuid,
    scrutineer2_name text,
    session_started_at timestamp with time zone,
    session_ended_at timestamp with time zone,
    opening_notes text,
    closing_notes text,
    incidents text,
    pv_document_id uuid,
    pv_generated_at timestamp with time zone,
    pv_sent_at timestamp with time zone,
    closed_at timestamp with time zone,
    current_step integer DEFAULT 1,
    max_step_reached integer DEFAULT 1,
    step_data jsonb DEFAULT '{}'::jsonb,
    wizard_mode text DEFAULT 'guided'::text,
    remote_meeting_url text,
    remote_meeting_provider text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ag_meetings_current_step CHECK (((current_step >= 1) AND (current_step <= 9))),
    CONSTRAINT ck_ag_meetings_max_step CHECK (((max_step_reached >= 1) AND (max_step_reached <= 9))),
    CONSTRAINT ck_ag_meetings_wizard_mode CHECK ((wizard_mode = ANY (ARRAY['guided'::text, 'expert'::text])))
);


ALTER TABLE public.ag_meetings OWNER TO postgres;

--
-- Name: ag_milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ag_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    milestone_key text,
    due_date date,
    done boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ag_milestones OWNER TO postgres;

--
-- Name: ag_notification_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_notification_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    copro_id uuid,
    event_type text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ag_notification_events OWNER TO postgres;

--
-- Name: ag_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ag_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    coproprietaire_id uuid,
    channel public.notification_channel,
    status public.delivery_status DEFAULT 'queued'::public.delivery_status NOT NULL,
    provider_ref text,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ag_notifications OWNER TO postgres;

--
-- Name: ag_pending_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_pending_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ag_id uuid NOT NULL,
    resolution_id uuid NOT NULL,
    action_type public.ag_action_type NOT NULL,
    target_table text NOT NULL,
    target_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    activated_at timestamp with time zone,
    result_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ag_pending_status CHECK ((status = ANY (ARRAY['pending'::text, 'activated'::text, 'failed'::text]))),
    CONSTRAINT ck_ag_pending_target_table CHECK ((target_table = ANY (ARRAY['budgets'::text, 'call_for_funds'::text, 'council_members'::text, 'accounting_periods'::text, 'copros'::text, 'contracts'::text])))
);


ALTER TABLE public.ag_pending_actions OWNER TO postgres;

--
-- Name: ag_resolutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_resolutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ag_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    resolution_number integer NOT NULL,
    title text NOT NULL,
    description text,
    resolution_type public.resolution_type DEFAULT 'other'::public.resolution_type NOT NULL,
    majority_type public.majority_type DEFAULT 'art24'::public.majority_type NOT NULL,
    action_type public.ag_action_type,
    linked_budget_id uuid,
    linked_work_budget_id uuid,
    bridge_vote_id uuid,
    is_bridgeable boolean DEFAULT false,
    variables jsonb DEFAULT '{}'::jsonb,
    is_customized boolean DEFAULT false,
    status public.resolution_status DEFAULT 'draft'::public.resolution_status NOT NULL,
    threshold_tantiemes numeric,
    threshold_voters integer,
    voted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ag_resolution_bridge CHECK (((bridge_vote_id IS NULL) OR (majority_type = ANY (ARRAY['art25_1'::public.majority_type, 'art26_1'::public.majority_type]))))
);


ALTER TABLE public.ag_resolutions OWNER TO postgres;

--
-- Name: ag_session_drafts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_session_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ag_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    user_id uuid NOT NULL,
    draft_type public.ag_draft_type NOT NULL,
    draft_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    last_modified_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ag_session_drafts OWNER TO postgres;

--
-- Name: ag_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ag_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resolution_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    coproprietaire_id uuid NOT NULL,
    vote public.vote_choice NOT NULL,
    tantiemes numeric NOT NULL,
    vote_source public.vote_source DEFAULT 'live'::public.vote_source NOT NULL,
    is_excluded boolean DEFAULT false,
    exclusion_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ag_vote_exclusion CHECK (((is_excluded = false) OR (exclusion_reason IS NOT NULL)))
);


ALTER TABLE public.ag_votes OWNER TO postgres;

--
-- Name: alur_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alur_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    budget_id uuid,
    destination public.transfer_destination NOT NULL,
    amount numeric(14,2) NOT NULL,
    transfer_date date,
    ledger_tx_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.alur_transfers OWNER TO postgres;

--
-- Name: bank_matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    bank_movement_id uuid NOT NULL,
    target_type public.bank_match_target_type NOT NULL,
    target_id uuid,
    amount_matched numeric(14,2) NOT NULL,
    matched_at timestamp with time zone DEFAULT now() NOT NULL,
    matched_by uuid,
    CONSTRAINT ck_match_amount CHECK ((amount_matched > (0)::numeric))
);


ALTER TABLE public.bank_matches OWNER TO postgres;

--
-- Name: bank_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid,
    bank_date date NOT NULL,
    value_date date,
    amount_signed numeric(14,2) NOT NULL,
    label text,
    bank_ref text,
    status public.bank_movement_status DEFAULT 'unmatched'::public.bank_movement_status NOT NULL,
    account_id uuid NOT NULL
);


ALTER TABLE public.bank_movements OWNER TO postgres;

--
-- Name: budget_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    budget_id uuid NOT NULL,
    budget_line_id uuid NOT NULL,
    label text NOT NULL,
    amount numeric(14,2) NOT NULL,
    montant_ht numeric(14,2),
    taux_tva numeric(5,2),
    tx_date date DEFAULT CURRENT_DATE NOT NULL,
    status public.expense_status DEFAULT 'draft'::public.expense_status NOT NULL,
    tiers_id uuid,
    piece_jointe uuid,
    ledger_tx_id uuid,
    validated_by uuid,
    validated_at timestamp with time zone,
    rejection_comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_budget_expense_amount CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.budget_expenses OWNER TO postgres;

--
-- Name: budget_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    account_id uuid NOT NULL,
    repartition_key_id uuid NOT NULL,
    label text NOT NULL,
    amount numeric(14,2) NOT NULL,
    code text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_budget_line_amount CHECK ((amount >= (0)::numeric))
);


ALTER TABLE public.budget_lines OWNER TO postgres;

--
-- Name: budget_payment_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_payment_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    budget_id uuid,
    service_order_id uuid,
    phase_label text,
    due_date date,
    amount numeric(14,2),
    status public.payment_phase_status DEFAULT 'pending'::public.payment_phase_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.budget_payment_schedules OWNER TO postgres;

--
-- Name: budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid NOT NULL,
    budget_type public.budget_type NOT NULL,
    status public.budget_status DEFAULT 'draft'::public.budget_status NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    name text,
    notes text,
    source_ag_id uuid,
    created_by uuid,
    validated_by uuid,
    validated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.budgets OWNER TO postgres;

--
-- Name: buildings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buildings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    floors_count smallint DEFAULT 1,
    construction_year smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_building_annee CHECK (((construction_year IS NULL) OR ((construction_year >= 1700) AND (construction_year <= ((EXTRACT(year FROM now()))::integer + 5)))))
);


ALTER TABLE public.buildings OWNER TO postgres;

--
-- Name: cabinets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cabinets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    siret text,
    email text,
    phone text,
    address_line1 text,
    address_line2 text,
    city text,
    postal_code text,
    country text DEFAULT 'France'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_cabinet_email CHECK (((email IS NULL) OR (email ~* '^[^@]+@[^@]+\.[^@]+$'::text)))
);


ALTER TABLE public.cabinets OWNER TO postgres;

--
-- Name: call_for_funds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_for_funds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid NOT NULL,
    budget_id uuid,
    repartition_key_id uuid,
    label text NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    trimester integer,
    total_amount numeric(14,2) NOT NULL,
    status public.call_for_funds_status DEFAULT 'draft'::public.call_for_funds_status NOT NULL,
    ledger_tx_id uuid,
    issued_at timestamp with time zone,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_cff_total CHECK ((total_amount > (0)::numeric)),
    CONSTRAINT ck_cff_trimester CHECK (((trimester >= 1) AND (trimester <= 4)))
);


ALTER TABLE public.call_for_funds OWNER TO postgres;

--
-- Name: call_for_funds_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_for_funds_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    repartition_key_id uuid,
    amount_due numeric(14,2) NOT NULL,
    amount_paid numeric(14,2) DEFAULT 0 NOT NULL,
    status public.call_line_status DEFAULT 'unpaid'::public.call_line_status NOT NULL,
    weight_snapshot numeric,
    CONSTRAINT ck_call_line_amounts CHECK ((amount_paid <= amount_due)),
    CONSTRAINT ck_cff_line_due CHECK ((amount_due >= (0)::numeric)),
    CONSTRAINT ck_cff_line_paid CHECK ((amount_paid >= (0)::numeric))
);


ALTER TABLE public.call_for_funds_lines OWNER TO postgres;

--
-- Name: collective_loan_shares; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collective_loan_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    share_amount numeric(14,2),
    remaining_amount numeric(14,2),
    last_payment_date date
);


ALTER TABLE public.collective_loan_shares OWNER TO postgres;

--
-- Name: collective_loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collective_loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    label text,
    lender text,
    total_amount numeric(14,2),
    remaining_amount numeric(14,2),
    annual_payment numeric(14,2),
    interest_rate numeric(6,3),
    start_date date,
    end_date date,
    status public.collective_loan_status DEFAULT 'active'::public.collective_loan_status NOT NULL,
    ledger_tx_id uuid
);


ALTER TABLE public.collective_loans OWNER TO postgres;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    tiers_id uuid NOT NULL,
    domain_id uuid NOT NULL,
    label text NOT NULL,
    reference text,
    start_date date NOT NULL,
    end_date date,
    renewal_date date,
    tacit_renewal boolean DEFAULT true NOT NULL,
    notice_months integer DEFAULT 3 NOT NULL,
    annual_amount numeric(14,2),
    billing_frequency public.intervention_frequency,
    planned_frequency public.intervention_frequency,
    planned_day_of_month integer,
    auto_generate_orders boolean DEFAULT false NOT NULL,
    next_planned_intervention date,
    is_regulatory boolean DEFAULT false NOT NULL,
    status public.contract_status DEFAULT 'draft'::public.contract_status NOT NULL,
    terminated_at timestamp with time zone,
    termination_reason text,
    observations text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_contract_dates CHECK (((end_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT ck_contract_day CHECK (((planned_day_of_month IS NULL) OR ((planned_day_of_month >= 1) AND (planned_day_of_month <= 31))))
);


ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: conversation_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    last_read_at timestamp with time zone,
    unread_count integer DEFAULT 0 NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    is_muted boolean DEFAULT false NOT NULL,
    left_at timestamp with time zone,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_unread_count CHECK ((unread_count >= 0))
);


ALTER TABLE public.conversation_members OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    subject text,
    is_group boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    last_message_at timestamp with time zone,
    last_message_preview text,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: copro_invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.copro_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    coproprietaire_id uuid NOT NULL,
    email text NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    status public.invitation_status DEFAULT 'pending'::public.invitation_status NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    accepted_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_inv_accepted CHECK (((status = 'accepted'::public.invitation_status) = (accepted_at IS NOT NULL))),
    CONSTRAINT ck_inv_email CHECK ((email ~* '^[^@]+@[^@]+\.[^@]+$'::text))
);


ALTER TABLE public.copro_invitations OWNER TO postgres;

--
-- Name: coproprietaires; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coproprietaires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    user_id uuid,
    is_company boolean DEFAULT false NOT NULL,
    company_name text,
    civility text,
    first_name text,
    last_name text,
    email text,
    phone text,
    mobile text,
    address_line1 text,
    address_line2 text,
    city text,
    postal_code text,
    country text DEFAULT 'France'::text NOT NULL,
    prefers_email boolean DEFAULT true NOT NULL,
    prefers_paper boolean DEFAULT false NOT NULL,
    is_resident boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_copro_email CHECK (((email IS NULL) OR (email ~* '^[^@]+@[^@]+\.[^@]+$'::text))),
    CONSTRAINT ck_copro_person_company CHECK ((is_company = (company_name IS NOT NULL)))
);


ALTER TABLE public.coproprietaires OWNER TO postgres;

--
-- Name: copros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.copros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cabinet_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    city text,
    postal_code text,
    siret text,
    num_immatriculation text,
    date_reglement date,
    annee_construction smallint,
    exercice_debut smallint DEFAULT 1 NOT NULL,
    onboarding_step smallint DEFAULT 0,
    onboarding_max_step smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_copro_annee CHECK (((annee_construction IS NULL) OR ((annee_construction >= 1700) AND (annee_construction <= ((EXTRACT(year FROM now()))::integer + 5))))),
    CONSTRAINT ck_copro_exercice_mois CHECK (((exercice_debut >= 1) AND (exercice_debut <= 12)))
);


ALTER TABLE public.copros OWNER TO postgres;

--
-- Name: council_decisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.council_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status public.council_decision_status DEFAULT 'draft'::public.council_decision_status NOT NULL,
    created_by uuid NOT NULL,
    submitted_at timestamp with time zone,
    submitted_by uuid,
    decided_at timestamp with time zone,
    decided_by uuid,
    linked_ag_id uuid,
    linked_resolution_id uuid,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.council_decisions OWNER TO postgres;

--
-- Name: council_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.council_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    document_id uuid NOT NULL,
    visibility public.content_visibility DEFAULT 'council_only'::public.content_visibility NOT NULL,
    linked_type public.council_doc_link_type,
    linked_id uuid,
    label text,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.council_documents OWNER TO postgres;

--
-- Name: council_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.council_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    user_id uuid,
    coproprietaire_id uuid,
    role public.council_role DEFAULT 'member'::public.council_role NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_council_member_identity CHECK (((user_id IS NOT NULL) OR (coproprietaire_id IS NOT NULL)))
);


ALTER TABLE public.council_members OWNER TO postgres;

--
-- Name: council_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.council_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    decision_id uuid NOT NULL,
    council_member_id uuid NOT NULL,
    vote public.vote_choice NOT NULL,
    comment text,
    voted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.council_votes OWNER TO postgres;

--
-- Name: document_folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    description text,
    icon text DEFAULT 'Folder'::text NOT NULL,
    color text DEFAULT '#6B7280'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    category_default public.document_category,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_no_self_parent CHECK ((parent_id IS DISTINCT FROM id))
);


ALTER TABLE public.document_folders OWNER TO postgres;

--
-- Name: document_relations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    entity_type public.document_entity_type NOT NULL,
    entity_id uuid NOT NULL,
    relation_kind public.document_relation_kind DEFAULT 'related'::public.document_relation_kind NOT NULL,
    label text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_relations OWNER TO postgres;

--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version_number integer NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    file_hash text,
    change_summary text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_version_pos CHECK ((version_number >= 1))
);


ALTER TABLE public.document_versions OWNER TO postgres;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    folder_id uuid,
    lot_id uuid,
    coproprietaire_id uuid,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    mime_type text,
    file_hash text,
    title text,
    description text,
    category public.document_category DEFAULT 'autre'::public.document_category NOT NULL,
    tags text[],
    document_date date,
    year integer,
    status public.document_status DEFAULT 'active'::public.document_status NOT NULL,
    visibility public.document_visibility DEFAULT 'gestionnaire_seul'::public.document_visibility NOT NULL,
    source_module public.document_source DEFAULT 'manual'::public.document_source NOT NULL,
    current_version_no integer DEFAULT 1 NOT NULL,
    retention_years integer DEFAULT 10,
    expiration_date date,
    deletion_blocked boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    is_starred boolean DEFAULT false NOT NULL,
    search_text tsvector,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_archived CHECK (((is_archived = false) OR (archived_at IS NOT NULL))),
    CONSTRAINT ck_retention CHECK (((retention_years IS NULL) OR (retention_years >= 0))),
    CONSTRAINT ck_year CHECK (((year IS NULL) OR ((year >= 1900) AND (year <= 2100))))
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text,
    available_variables jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: etat_date_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.etat_date_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    mutation_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    snapshot_type public.etat_date_type NOT NULL,
    effective_date date NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    generated_by uuid,
    payload jsonb NOT NULL,
    document_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_etat_date_payload_parts CHECK (((payload ? 'partie_1_sommes_dues_vendeur'::text) AND (payload ? 'partie_2_dues_par_syndicat'::text) AND (payload ? 'partie_3_charge_acquereur'::text)))
);


ALTER TABLE public.etat_date_snapshots OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    event_type public.event_type DEFAULT 'autre'::public.event_type NOT NULL,
    location text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    all_day boolean DEFAULT false NOT NULL,
    visibility public.content_visibility DEFAULT 'all_members'::public.content_visibility NOT NULL,
    linked_ag_id uuid,
    linked_service_order_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_event_dates CHECK (((ends_at IS NULL) OR (ends_at >= starts_at)))
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: insurance_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurance_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    sub_type public.insurance_sub_type NOT NULL,
    policy_number text,
    insurer_name text,
    annual_premium numeric(14,2),
    deductible numeric(14,2),
    guarantees text[] DEFAULT '{}'::text[] NOT NULL,
    related_works text,
    works_reception_date date,
    observations text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.insurance_policies OWNER TO postgres;

--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tx_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid NOT NULL,
    account_id uuid NOT NULL,
    lot_id uuid,
    direction public.ledger_direction NOT NULL,
    amount numeric(14,2) NOT NULL,
    entry_label text,
    CONSTRAINT ck_entry_amount CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- Name: ledger_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid NOT NULL,
    tx_date date DEFAULT CURRENT_DATE NOT NULL,
    source_type public.ledger_source_type NOT NULL,
    source_id uuid,
    label text NOT NULL,
    status public.ledger_tx_status DEFAULT 'draft'::public.ledger_tx_status NOT NULL,
    created_by uuid,
    posted_by uuid,
    posted_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT ck_posted_consistency CHECK ((((status = 'draft'::public.ledger_tx_status) AND (posted_at IS NULL) AND (posted_by IS NULL)) OR ((status = 'posted'::public.ledger_tx_status) AND (posted_at IS NOT NULL))))
);


ALTER TABLE public.ledger_transactions OWNER TO postgres;

--
-- Name: legal_proceedings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.legal_proceedings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    title text NOT NULL,
    nature public.legal_proceeding_nature NOT NULL,
    status public.legal_proceeding_status DEFAULT 'pending'::public.legal_proceeding_status NOT NULL,
    lot_id uuid,
    debtor_owner_id uuid,
    nature_filter public.repartition_category,
    opposing_party text,
    amount_at_stake numeric(14,2),
    start_date date,
    end_date date,
    court text,
    lawyer text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_legal_amount CHECK (((amount_at_stake IS NULL) OR (amount_at_stake >= (0)::numeric))),
    CONSTRAINT ck_legal_dates CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT ck_legal_recovery_target CHECK (((nature <> 'recovery'::public.legal_proceeding_nature) OR (lot_id IS NOT NULL)))
);


ALTER TABLE public.legal_proceedings OWNER TO postgres;

--
-- Name: logbook_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logbook_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    building_id uuid,
    tiers_id uuid,
    contract_id uuid,
    service_order_id uuid,
    document_id uuid,
    entry_type public.logbook_entry_type NOT NULL,
    category public.intervention_category DEFAULT 'courante'::public.intervention_category NOT NULL,
    title text NOT NULL,
    description text,
    equipment_concerned text,
    provider_name_snapshot text,
    domain_id uuid,
    budget_category text,
    happened_at date NOT NULL,
    completed_at date,
    next_due_at date,
    cost numeric(14,2),
    status public.logbook_status DEFAULT 'planifiee'::public.logbook_status NOT NULL,
    comments text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.logbook_entries OWNER TO postgres;

--
-- Name: lot_owners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lot_owners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lot_id uuid NOT NULL,
    coproprietaire_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    share_percent numeric(6,3) DEFAULT 100 NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_lo_dates CHECK (((end_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT ck_lo_share CHECK (((share_percent > (0)::numeric) AND (share_percent <= (100)::numeric)))
);


ALTER TABLE public.lot_owners OWNER TO postgres;

--
-- Name: lots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    building_id uuid,
    ref text NOT NULL,
    type public.lot_type DEFAULT 'appartement'::public.lot_type NOT NULL,
    floor smallint,
    surface numeric(8,2),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lots OWNER TO postgres;

--
-- Name: mails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    from_email text NOT NULL,
    from_name text NOT NULL,
    to_emails jsonb NOT NULL,
    cc_emails jsonb,
    subject text NOT NULL,
    body text NOT NULL,
    body_html text,
    attachments jsonb,
    status text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    is_starred boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    label_ids text[],
    in_reply_to uuid,
    thread_id uuid,
    resend_id text,
    sent_at timestamp with time zone,
    received_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mails OWNER TO postgres;

--
-- Name: memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    role public.membership_role DEFAULT 'coproprietaire'::public.membership_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.memberships OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    message_type public.message_type DEFAULT 'text'::public.message_type NOT NULL,
    attachment_id uuid,
    reply_to_id uuid,
    read_by uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: mutation_oppositions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mutation_oppositions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    mutation_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    notaire_id uuid,
    avis_mutation_date date NOT NULL,
    opposition_deadline date NOT NULL,
    opposition_date date,
    amount_opposed numeric(14,2) DEFAULT 0 NOT NULL,
    causes jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.opposition_status DEFAULT 'pending'::public.opposition_status NOT NULL,
    notaire_payment_date date,
    paid_amount numeric(14,2),
    ledger_transaction_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_opp_amount CHECK ((amount_opposed >= (0)::numeric)),
    CONSTRAINT ck_opp_deadline CHECK ((opposition_deadline = (avis_mutation_date + 15))),
    CONSTRAINT ck_opp_opposed_in_time CHECK (((opposition_date IS NULL) OR (opposition_date <= opposition_deadline))),
    CONSTRAINT ck_opp_paid CHECK (((status <> 'paid'::public.opposition_status) OR ((notaire_payment_date IS NOT NULL) AND (paid_amount IS NOT NULL) AND (ledger_transaction_id IS NOT NULL))))
);


ALTER TABLE public.mutation_oppositions OWNER TO postgres;

--
-- Name: mutation_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mutation_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    mutation_id uuid NOT NULL,
    step_key public.mutation_step_key NOT NULL,
    status public.mutation_step_status DEFAULT 'pending'::public.mutation_step_status NOT NULL,
    completed_at timestamp with time zone,
    completed_by uuid,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_step_completed CHECK (((status = 'completed'::public.mutation_step_status) = (completed_at IS NOT NULL)))
);


ALTER TABLE public.mutation_steps OWNER TO postgres;

--
-- Name: mutations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mutations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    period_id uuid,
    status public.mutation_status DEFAULT 'draft'::public.mutation_status NOT NULL,
    mutation_type public.mutation_type DEFAULT 'sale'::public.mutation_type NOT NULL,
    seller_owner_id uuid NOT NULL,
    buyer_owner_id uuid,
    notaire_id uuid,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    signature_date date,
    effective_date date,
    cancelled_at timestamp with time zone,
    cancel_reason text,
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_mut_cancelled CHECK (((status = 'cancelled'::public.mutation_status) = (cancelled_at IS NOT NULL))),
    CONSTRAINT ck_mut_dates CHECK (((signature_date IS NULL) OR (effective_date IS NULL) OR (effective_date >= signature_date))),
    CONSTRAINT ck_mut_seller_buyer_distinct CHECK (((buyer_owner_id IS NULL) OR (buyer_owner_id <> seller_owner_id)))
);


ALTER TABLE public.mutations OWNER TO postgres;

--
-- Name: payment_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    call_line_id uuid NOT NULL,
    amount_allocated numeric(14,2) NOT NULL,
    CONSTRAINT ck_alloc_amount CHECK ((amount_allocated > (0)::numeric))
);


ALTER TABLE public.payment_allocations OWNER TO postgres;

--
-- Name: payment_reminder_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_reminder_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    delay_days integer NOT NULL,
    channel public.notification_channel DEFAULT 'email'::public.notification_channel NOT NULL,
    template_id uuid,
    label text,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_reminder_delay CHECK ((delay_days > 0))
);


ALTER TABLE public.payment_reminder_rules OWNER TO postgres;

--
-- Name: payment_reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    owner_id uuid,
    reminder_rule_id uuid,
    call_id uuid,
    call_line_id uuid,
    unpaid_amount numeric(14,2) NOT NULL,
    oldest_due_date date,
    days_overdue integer,
    delay_level integer,
    status public.reminder_status DEFAULT 'pending'::public.reminder_status NOT NULL,
    delivery_status public.delivery_status,
    recipient_email text,
    recipient_name text,
    provider_message_id text,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancelled_reason text,
    content text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_reminder_overdue CHECK ((days_overdue >= 0)),
    CONSTRAINT ck_reminder_unpaid CHECK ((unpaid_amount > (0)::numeric))
);


ALTER TABLE public.payment_reminders OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    method public.payment_method NOT NULL,
    reference text,
    status public.payment_status DEFAULT 'recorded'::public.payment_status NOT NULL,
    ledger_tx_id uuid,
    created_by uuid,
    idempotency_key text,
    CONSTRAINT ck_payment_amount CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: period_cutoff_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.period_cutoff_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid NOT NULL,
    kind public.cutoff_kind NOT NULL,
    account_id uuid NOT NULL,
    counterpart_account_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    label text,
    tiers_id uuid,
    auto_reverse boolean DEFAULT true NOT NULL,
    posting_tx_id uuid,
    reversal_tx_id uuid,
    CONSTRAINT ck_cutoff_amount CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.period_cutoff_items OWNER TO postgres;

--
-- Name: planned_works; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.planned_works (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    domain_id uuid NOT NULL,
    budget_line_id uuid,
    ag_id uuid,
    resolution_id uuid,
    label text NOT NULL,
    description text,
    planned_date date,
    vote_date date,
    completion_date date,
    estimated_amount numeric(14,2),
    voted_amount numeric(14,2),
    actual_amount numeric(14,2),
    status public.planned_work_status DEFAULT 'identified'::public.planned_work_status NOT NULL,
    priority public.priority_level,
    from_ppt boolean DEFAULT false NOT NULL,
    ppt_year integer,
    observations text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.planned_works OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    phone text,
    avatar_url text,
    cabinet_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: reminder_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminder_settings (
    copro_id uuid NOT NULL,
    is_paused boolean DEFAULT false NOT NULL,
    paused_until date,
    pause_reason text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reminder_settings OWNER TO postgres;

--
-- Name: repartition_key_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.repartition_key_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    copro_id uuid NOT NULL,
    weight numeric(12,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_rkl_weight CHECK ((weight >= (0)::numeric))
);


ALTER TABLE public.repartition_key_lines OWNER TO postgres;

--
-- Name: repartition_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.repartition_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    name text NOT NULL,
    basis public.repartition_basis NOT NULL,
    category public.repartition_category DEFAULT 'general'::public.repartition_category NOT NULL,
    coverage_mode public.coverage_mode DEFAULT 'all_lots'::public.coverage_mode NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    valid_from date DEFAULT CURRENT_DATE NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_key_validity CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)))
);


ALTER TABLE public.repartition_keys OWNER TO postgres;

--
-- Name: service_order_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_order_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    service_order_id uuid NOT NULL,
    event_type public.service_order_event_type NOT NULL,
    from_status public.service_order_status,
    to_status public.service_order_status,
    payload jsonb,
    comment text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.service_order_events OWNER TO postgres;

--
-- Name: service_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    order_number text NOT NULL,
    tiers_id uuid NOT NULL,
    contract_id uuid,
    building_id uuid,
    lot_id uuid,
    logbook_entry_id uuid,
    order_type public.service_order_type DEFAULT 'classique'::public.service_order_type NOT NULL,
    origin public.service_order_origin DEFAULT 'syndic'::public.service_order_origin NOT NULL,
    urgency public.priority_level DEFAULT 'normal'::public.priority_level NOT NULL,
    is_art18_emergency boolean DEFAULT false NOT NULL,
    emergency_ceiling numeric(14,2),
    title text NOT NULL,
    description text,
    estimated_amount numeric(14,2),
    quoted_amount numeric(14,2),
    actual_amount numeric(14,2),
    status public.service_order_status DEFAULT 'draft'::public.service_order_status NOT NULL,
    refusal_reason text,
    sent_at timestamp with time zone,
    acknowledged_at timestamp with time zone,
    quoted_at timestamp with time zone,
    validated_at timestamp with time zone,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    closed_at timestamp with time zone,
    refused_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.service_orders OWNER TO postgres;

--
-- Name: supplier_invoice_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_invoice_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    account_id uuid NOT NULL,
    repartition_key_id uuid,
    budget_line_id uuid,
    label text NOT NULL,
    amount numeric(14,2) NOT NULL,
    amount_ht numeric(14,2),
    amount_tva numeric(14,2),
    taux_pct numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_line_amount CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.supplier_invoice_lines OWNER TO postgres;

--
-- Name: supplier_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid NOT NULL,
    tiers_id uuid NOT NULL,
    service_order_id uuid,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    due_date date,
    label text NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    montant_ht numeric(14,2),
    montant_tva numeric(14,2),
    taux_tva numeric(5,2),
    status public.supplier_invoice_status DEFAULT 'draft'::public.supplier_invoice_status NOT NULL,
    document_id uuid,
    ledger_tx_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_supplier_invoice_total CHECK ((total_amount > (0)::numeric))
);


ALTER TABLE public.supplier_invoices OWNER TO postgres;

--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    period_id uuid NOT NULL,
    supplier_invoice_id uuid NOT NULL,
    payment_date date NOT NULL,
    amount numeric(14,2) NOT NULL,
    method public.payment_method NOT NULL,
    reference text,
    ledger_tx_id uuid,
    idempotency_key text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_payment_amount CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.supplier_payments OWNER TO postgres;

--
-- Name: technical_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.technical_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    document_id uuid NOT NULL,
    name text NOT NULL,
    doc_type public.technical_doc_type NOT NULL,
    added_date date DEFAULT CURRENT_DATE NOT NULL,
    validity_date date,
    observations text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.technical_documents OWNER TO postgres;

--
-- Name: tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    name text NOT NULL,
    is_supplier boolean DEFAULT false NOT NULL,
    is_provider boolean DEFAULT false NOT NULL,
    is_notary boolean DEFAULT false NOT NULL,
    category public.tiers_category DEFAULT 'externe'::public.tiers_category NOT NULL,
    domain_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    siret text,
    vat_number text,
    iban text,
    bic text,
    office_name text,
    notary_reference text,
    contact_name text,
    contact_role text,
    email text,
    phone text,
    phone_emergency text,
    address text,
    postal_code text,
    city text,
    rating_avg numeric(2,1),
    rating_count integer DEFAULT 0 NOT NULL,
    interventions_count integer DEFAULT 0 NOT NULL,
    last_intervention_at timestamp with time zone,
    intervention_radius_km integer,
    certifications text[] DEFAULT '{}'::text[] NOT NULL,
    description text,
    availability text,
    internal_notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_tiers_rating CHECK (((rating_avg IS NULL) OR ((rating_avg >= (0)::numeric) AND (rating_avg <= (5)::numeric)))),
    CONSTRAINT ck_tiers_role CHECK ((is_supplier OR is_provider OR is_notary)),
    CONSTRAINT ck_tiers_siret CHECK (((siret IS NULL) OR (siret ~ '^[0-9]{14}$'::text)))
);


ALTER TABLE public.tiers OWNER TO postgres;

--
-- Name: tiers_directory; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.tiers_directory WITH (security_invoker='true') AS
 SELECT id,
    copro_id,
    name,
    category,
    domain_ids,
    vat_number,
    contact_name,
    contact_role,
    email,
    phone,
    address,
    postal_code,
    city,
    rating_avg,
    rating_count,
    certifications,
    description,
    is_active
   FROM public.tiers
  WHERE (is_notary = false);


ALTER VIEW public.tiers_directory OWNER TO postgres;

--
-- Name: treasury_advances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.treasury_advances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    lot_id uuid NOT NULL,
    advance_type public.treasury_advance_type NOT NULL,
    label text,
    amount_due numeric(14,2) DEFAULT 0 NOT NULL,
    amount_paid numeric(14,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.treasury_advances OWNER TO postgres;

--
-- Name: wall_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wall_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    parent_comment_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_no_self_parent CHECK ((parent_comment_id IS DISTINCT FROM id))
);


ALTER TABLE public.wall_comments OWNER TO postgres;

--
-- Name: wall_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wall_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wall_likes OWNER TO postgres;

--
-- Name: wall_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wall_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    copro_id uuid NOT NULL,
    author_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category public.wall_post_category DEFAULT 'information'::public.wall_post_category NOT NULL,
    visibility public.content_visibility DEFAULT 'all_members'::public.content_visibility NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    pinned_at timestamp with time zone,
    pinned_by uuid,
    is_locked boolean DEFAULT false NOT NULL,
    attachment_id uuid,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_pinned CHECK (((is_pinned = false) OR (pinned_at IS NOT NULL))),
    CONSTRAINT ck_wall_counts CHECK (((likes_count >= 0) AND (comments_count >= 0)))
);


ALTER TABLE public.wall_posts OWNER TO postgres;

--
-- Name: work_domain; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_domain (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.work_domain OWNER TO postgres;

--
-- Name: accounting_periods pk_accounting_periods; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT pk_accounting_periods PRIMARY KEY (id);


--
-- Name: accounts pk_accounts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT pk_accounts PRIMARY KEY (id);


--
-- Name: ag_attendance pk_ag_attendance; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_attendance
    ADD CONSTRAINT pk_ag_attendance PRIMARY KEY (id);


--
-- Name: ag_correspondence_vote_details pk_ag_corr_vote_details; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_vote_details
    ADD CONSTRAINT pk_ag_corr_vote_details PRIMARY KEY (id);


--
-- Name: ag_correspondence_votes pk_ag_correspondence_votes; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_votes
    ADD CONSTRAINT pk_ag_correspondence_votes PRIMARY KEY (id);


--
-- Name: ag_envoi_tracking pk_ag_envoi_tracking; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_envoi_tracking
    ADD CONSTRAINT pk_ag_envoi_tracking PRIMARY KEY (id);


--
-- Name: ag_meetings pk_ag_meetings; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_meetings
    ADD CONSTRAINT pk_ag_meetings PRIMARY KEY (id);


--
-- Name: ag_milestones pk_ag_milestones; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_milestones
    ADD CONSTRAINT pk_ag_milestones PRIMARY KEY (id);


--
-- Name: ag_notification_events pk_ag_notification_events; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_notification_events
    ADD CONSTRAINT pk_ag_notification_events PRIMARY KEY (id);


--
-- Name: ag_notifications pk_ag_notifications; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_notifications
    ADD CONSTRAINT pk_ag_notifications PRIMARY KEY (id);


--
-- Name: ag_pending_actions pk_ag_pending_actions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_pending_actions
    ADD CONSTRAINT pk_ag_pending_actions PRIMARY KEY (id);


--
-- Name: ag_resolutions pk_ag_resolutions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_resolutions
    ADD CONSTRAINT pk_ag_resolutions PRIMARY KEY (id);


--
-- Name: ag_session_drafts pk_ag_session_drafts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_session_drafts
    ADD CONSTRAINT pk_ag_session_drafts PRIMARY KEY (id);


--
-- Name: ag_votes pk_ag_votes; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_votes
    ADD CONSTRAINT pk_ag_votes PRIMARY KEY (id);


--
-- Name: alur_transfers pk_alur_transfers; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alur_transfers
    ADD CONSTRAINT pk_alur_transfers PRIMARY KEY (id);


--
-- Name: bank_matches pk_bank_matches; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_matches
    ADD CONSTRAINT pk_bank_matches PRIMARY KEY (id);


--
-- Name: bank_movements pk_bank_movements; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_movements
    ADD CONSTRAINT pk_bank_movements PRIMARY KEY (id);


--
-- Name: budget_expenses pk_budget_expenses; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_expenses
    ADD CONSTRAINT pk_budget_expenses PRIMARY KEY (id);


--
-- Name: budget_lines pk_budget_lines; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT pk_budget_lines PRIMARY KEY (id);


--
-- Name: budget_payment_schedules pk_budget_payment_schedules; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_payment_schedules
    ADD CONSTRAINT pk_budget_payment_schedules PRIMARY KEY (id);


--
-- Name: budgets pk_budgets; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT pk_budgets PRIMARY KEY (id);


--
-- Name: buildings pk_buildings; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT pk_buildings PRIMARY KEY (id);


--
-- Name: cabinets pk_cabinets; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cabinets
    ADD CONSTRAINT pk_cabinets PRIMARY KEY (id);


--
-- Name: call_for_funds pk_call_for_funds; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds
    ADD CONSTRAINT pk_call_for_funds PRIMARY KEY (id);


--
-- Name: call_for_funds_lines pk_call_for_funds_lines; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds_lines
    ADD CONSTRAINT pk_call_for_funds_lines PRIMARY KEY (id);


--
-- Name: collective_loan_shares pk_collective_loan_shares; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collective_loan_shares
    ADD CONSTRAINT pk_collective_loan_shares PRIMARY KEY (id);


--
-- Name: collective_loans pk_collective_loans; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collective_loans
    ADD CONSTRAINT pk_collective_loans PRIMARY KEY (id);


--
-- Name: contracts pk_contracts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT pk_contracts PRIMARY KEY (id);


--
-- Name: conversation_members pk_conversation_members; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT pk_conversation_members PRIMARY KEY (id);


--
-- Name: conversations pk_conversations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT pk_conversations PRIMARY KEY (id);


--
-- Name: copro_invitations pk_copro_invitations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copro_invitations
    ADD CONSTRAINT pk_copro_invitations PRIMARY KEY (id);


--
-- Name: coproprietaires pk_coproprietaires; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coproprietaires
    ADD CONSTRAINT pk_coproprietaires PRIMARY KEY (id);


--
-- Name: copros pk_copros; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copros
    ADD CONSTRAINT pk_copros PRIMARY KEY (id);


--
-- Name: council_decisions pk_council_decisions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_decisions
    ADD CONSTRAINT pk_council_decisions PRIMARY KEY (id);


--
-- Name: council_documents pk_council_documents; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_documents
    ADD CONSTRAINT pk_council_documents PRIMARY KEY (id);


--
-- Name: council_members pk_council_members; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_members
    ADD CONSTRAINT pk_council_members PRIMARY KEY (id);


--
-- Name: council_votes pk_council_votes; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_votes
    ADD CONSTRAINT pk_council_votes PRIMARY KEY (id);


--
-- Name: document_folders pk_document_folders; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT pk_document_folders PRIMARY KEY (id);


--
-- Name: document_relations pk_document_relations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT pk_document_relations PRIMARY KEY (id);


--
-- Name: document_versions pk_document_versions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT pk_document_versions PRIMARY KEY (id);


--
-- Name: documents pk_documents; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT pk_documents PRIMARY KEY (id);


--
-- Name: email_templates pk_email_templates; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT pk_email_templates PRIMARY KEY (id);


--
-- Name: etat_date_snapshots pk_etat_date_snapshots; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etat_date_snapshots
    ADD CONSTRAINT pk_etat_date_snapshots PRIMARY KEY (id);


--
-- Name: events pk_events; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT pk_events PRIMARY KEY (id);


--
-- Name: insurance_policies pk_insurance_policies; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT pk_insurance_policies PRIMARY KEY (id);


--
-- Name: ledger_entries pk_ledger_entries; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT pk_ledger_entries PRIMARY KEY (id);


--
-- Name: ledger_transactions pk_ledger_transactions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_transactions
    ADD CONSTRAINT pk_ledger_transactions PRIMARY KEY (id);


--
-- Name: legal_proceedings pk_legal_proceedings; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_proceedings
    ADD CONSTRAINT pk_legal_proceedings PRIMARY KEY (id);


--
-- Name: logbook_entries pk_logbook_entries; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT pk_logbook_entries PRIMARY KEY (id);


--
-- Name: lot_owners pk_lot_owners; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_owners
    ADD CONSTRAINT pk_lot_owners PRIMARY KEY (id);


--
-- Name: lots pk_lots; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT pk_lots PRIMARY KEY (id);


--
-- Name: mails pk_mails; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mails
    ADD CONSTRAINT pk_mails PRIMARY KEY (id);


--
-- Name: memberships pk_memberships; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT pk_memberships PRIMARY KEY (id);


--
-- Name: messages pk_messages; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT pk_messages PRIMARY KEY (id);


--
-- Name: mutation_oppositions pk_mutation_oppositions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_oppositions
    ADD CONSTRAINT pk_mutation_oppositions PRIMARY KEY (id);


--
-- Name: mutation_steps pk_mutation_steps; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_steps
    ADD CONSTRAINT pk_mutation_steps PRIMARY KEY (id);


--
-- Name: mutations pk_mutations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT pk_mutations PRIMARY KEY (id);


--
-- Name: payment_allocations pk_payment_allocations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT pk_payment_allocations PRIMARY KEY (id);


--
-- Name: payment_reminder_rules pk_payment_reminder_rules; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminder_rules
    ADD CONSTRAINT pk_payment_reminder_rules PRIMARY KEY (id);


--
-- Name: payment_reminders pk_payment_reminders; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT pk_payment_reminders PRIMARY KEY (id);


--
-- Name: payments pk_payments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT pk_payments PRIMARY KEY (id);


--
-- Name: period_cutoff_items pk_period_cutoff_items; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_cutoff_items
    ADD CONSTRAINT pk_period_cutoff_items PRIMARY KEY (id);


--
-- Name: planned_works pk_planned_works; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_works
    ADD CONSTRAINT pk_planned_works PRIMARY KEY (id);


--
-- Name: profiles pk_profiles; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT pk_profiles PRIMARY KEY (id);


--
-- Name: reminder_settings pk_reminder_settings; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT pk_reminder_settings PRIMARY KEY (copro_id);


--
-- Name: repartition_key_lines pk_repartition_key_lines; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repartition_key_lines
    ADD CONSTRAINT pk_repartition_key_lines PRIMARY KEY (id);


--
-- Name: repartition_keys pk_repartition_keys; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repartition_keys
    ADD CONSTRAINT pk_repartition_keys PRIMARY KEY (id);


--
-- Name: service_order_events pk_service_order_events; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_order_events
    ADD CONSTRAINT pk_service_order_events PRIMARY KEY (id);


--
-- Name: service_orders pk_service_orders; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT pk_service_orders PRIMARY KEY (id);


--
-- Name: supplier_invoice_lines pk_supplier_invoice_lines; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT pk_supplier_invoice_lines PRIMARY KEY (id);


--
-- Name: supplier_invoices pk_supplier_invoices; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT pk_supplier_invoices PRIMARY KEY (id);


--
-- Name: supplier_payments pk_supplier_payments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT pk_supplier_payments PRIMARY KEY (id);


--
-- Name: technical_documents pk_technical_documents; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.technical_documents
    ADD CONSTRAINT pk_technical_documents PRIMARY KEY (id);


--
-- Name: tiers pk_tiers; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers
    ADD CONSTRAINT pk_tiers PRIMARY KEY (id);


--
-- Name: treasury_advances pk_treasury_advances; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_advances
    ADD CONSTRAINT pk_treasury_advances PRIMARY KEY (id);


--
-- Name: wall_comments pk_wall_comments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_comments
    ADD CONSTRAINT pk_wall_comments PRIMARY KEY (id);


--
-- Name: wall_likes pk_wall_likes; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_likes
    ADD CONSTRAINT pk_wall_likes PRIMARY KEY (id);


--
-- Name: wall_posts pk_wall_posts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_posts
    ADD CONSTRAINT pk_wall_posts PRIMARY KEY (id);


--
-- Name: work_domain pk_work_domain; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_domain
    ADD CONSTRAINT pk_work_domain PRIMARY KEY (id);


--
-- Name: accounts uq_accounts_copro_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT uq_accounts_copro_code UNIQUE (copro_id, code);


--
-- Name: lot_owners uq_active_ownership; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_owners
    ADD CONSTRAINT uq_active_ownership UNIQUE (lot_id, coproprietaire_id, start_date);


--
-- Name: ag_attendance uq_ag_attendance_owner; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_attendance
    ADD CONSTRAINT uq_ag_attendance_owner UNIQUE (ag_id, coproprietaire_id);


--
-- Name: ag_correspondence_vote_details uq_ag_corr_detail_resolution; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_vote_details
    ADD CONSTRAINT uq_ag_corr_detail_resolution UNIQUE (correspondence_form_id, resolution_id);


--
-- Name: ag_correspondence_votes uq_ag_corr_vote_owner; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_votes
    ADD CONSTRAINT uq_ag_corr_vote_owner UNIQUE (ag_id, coproprietaire_id);


--
-- Name: ag_pending_actions uq_ag_pending_action; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_pending_actions
    ADD CONSTRAINT uq_ag_pending_action UNIQUE (ag_id, resolution_id);


--
-- Name: ag_resolutions uq_ag_resolution_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_resolutions
    ADD CONSTRAINT uq_ag_resolution_number UNIQUE (ag_id, resolution_number);


--
-- Name: ag_session_drafts uq_ag_session_draft; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_session_drafts
    ADD CONSTRAINT uq_ag_session_draft UNIQUE (ag_id, user_id, draft_type);


--
-- Name: ag_votes uq_ag_vote_resolution; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_votes
    ADD CONSTRAINT uq_ag_vote_resolution UNIQUE (resolution_id, coproprietaire_id);


--
-- Name: payment_allocations uq_alloc_payment_line; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT uq_alloc_payment_line UNIQUE (payment_id, call_line_id);


--
-- Name: budgets uq_budget_version; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT uq_budget_version UNIQUE (copro_id, period_id, budget_type, version);


--
-- Name: call_for_funds uq_call_idempotent; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds
    ADD CONSTRAINT uq_call_idempotent UNIQUE (copro_id, period_id, label, issue_date);


--
-- Name: call_for_funds_lines uq_call_line_lot_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds_lines
    ADD CONSTRAINT uq_call_line_lot_key UNIQUE (call_id, lot_id, repartition_key_id);


--
-- Name: conversation_members uq_conversation_member; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT uq_conversation_member UNIQUE (conversation_id, user_id);


--
-- Name: council_documents uq_council_document; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_documents
    ADD CONSTRAINT uq_council_document UNIQUE (copro_id, document_id);


--
-- Name: council_members uq_council_member; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_members
    ADD CONSTRAINT uq_council_member UNIQUE (copro_id, coproprietaire_id, start_date);


--
-- Name: council_votes uq_council_vote; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_votes
    ADD CONSTRAINT uq_council_vote UNIQUE (decision_id, council_member_id);


--
-- Name: document_folders uq_document_folders_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT uq_document_folders_name UNIQUE (copro_id, parent_id, name);


--
-- Name: document_relations uq_document_relation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT uq_document_relation UNIQUE (document_id, entity_type, entity_id);


--
-- Name: document_versions uq_document_version; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT uq_document_version UNIQUE (document_id, version_number);


--
-- Name: documents uq_documents_copro_path; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT uq_documents_copro_path UNIQUE (copro_id, file_path);


--
-- Name: copro_invitations uq_invitation_token; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copro_invitations
    ADD CONSTRAINT uq_invitation_token UNIQUE (token);


--
-- Name: repartition_keys uq_key_copro_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repartition_keys
    ADD CONSTRAINT uq_key_copro_name UNIQUE (copro_id, name);


--
-- Name: collective_loan_shares uq_loan_lot; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collective_loan_shares
    ADD CONSTRAINT uq_loan_lot UNIQUE (loan_id, lot_id);


--
-- Name: lots uq_lots_copro_ref; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT uq_lots_copro_ref UNIQUE (copro_id, ref);


--
-- Name: memberships uq_membership_user_copro; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT uq_membership_user_copro UNIQUE (user_id, copro_id);


--
-- Name: mutation_steps uq_mutation_step; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_steps
    ADD CONSTRAINT uq_mutation_step UNIQUE (mutation_id, step_key);


--
-- Name: mutation_oppositions uq_opposition_mutation; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_oppositions
    ADD CONSTRAINT uq_opposition_mutation UNIQUE (mutation_id);


--
-- Name: accounting_periods uq_period_copro_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT uq_period_copro_name UNIQUE (copro_id, name);


--
-- Name: payment_reminders uq_reminder_lot_delay_active; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT uq_reminder_lot_delay_active UNIQUE (lot_id, delay_level, status);


--
-- Name: payment_reminder_rules uq_reminder_rule_delay; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminder_rules
    ADD CONSTRAINT uq_reminder_rule_delay UNIQUE (copro_id, delay_days);


--
-- Name: repartition_key_lines uq_rkl_key_lot; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repartition_key_lines
    ADD CONSTRAINT uq_rkl_key_lot UNIQUE (key_id, lot_id);


--
-- Name: service_orders uq_service_order_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT uq_service_order_number UNIQUE (copro_id, order_number);


--
-- Name: supplier_invoices uq_supplier_invoice_num; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT uq_supplier_invoice_num UNIQUE (copro_id, tiers_id, invoice_number);


--
-- Name: technical_documents uq_technical_document; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.technical_documents
    ADD CONSTRAINT uq_technical_document UNIQUE (copro_id, doc_type, document_id);


--
-- Name: tiers uq_tiers_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers
    ADD CONSTRAINT uq_tiers_name UNIQUE (copro_id, name);


--
-- Name: wall_likes uq_wall_like; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_likes
    ADD CONSTRAINT uq_wall_like UNIQUE (post_id, user_id);


--
-- Name: work_domain uq_work_domain_slug; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_domain
    ADD CONSTRAINT uq_work_domain_slug UNIQUE (slug);


--
-- Name: idx_accounts_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accounts_class ON public.accounts USING btree (copro_id, "left"(code, 1));


--
-- Name: idx_accounts_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accounts_copro ON public.accounts USING btree (copro_id);


--
-- Name: idx_accounts_nature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accounts_nature ON public.accounts USING btree (copro_id, nature) WHERE (nature IS NOT NULL);


--
-- Name: idx_accounts_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accounts_type ON public.accounts USING btree (copro_id, account_type);


--
-- Name: idx_ag_attendance_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_attendance_copro ON public.ag_attendance USING btree (copro_id);


--
-- Name: idx_ag_attendance_lots; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_attendance_lots ON public.ag_attendance USING gin (lot_ids);


--
-- Name: idx_ag_corr_details_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_corr_details_copro ON public.ag_correspondence_vote_details USING btree (copro_id);


--
-- Name: idx_ag_corr_details_form; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_corr_details_form ON public.ag_correspondence_vote_details USING btree (correspondence_form_id);


--
-- Name: idx_ag_corr_details_resolution; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_corr_details_resolution ON public.ag_correspondence_vote_details USING btree (resolution_id);


--
-- Name: idx_ag_corr_votes_ag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_corr_votes_ag ON public.ag_correspondence_votes USING btree (ag_id);


--
-- Name: idx_ag_corr_votes_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_corr_votes_copro ON public.ag_correspondence_votes USING btree (copro_id);


--
-- Name: idx_ag_envoi_tracking_ag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_envoi_tracking_ag ON public.ag_envoi_tracking USING btree (ag_id);


--
-- Name: idx_ag_envoi_tracking_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_envoi_tracking_status ON public.ag_envoi_tracking USING btree (status);


--
-- Name: idx_ag_meetings_copro_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_meetings_copro_date ON public.ag_meetings USING btree (copro_id, meeting_date DESC);


--
-- Name: idx_ag_meetings_copro_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_meetings_copro_status ON public.ag_meetings USING btree (copro_id, status);


--
-- Name: idx_ag_meetings_remote; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_meetings_remote ON public.ag_meetings USING btree (copro_id) WHERE (remote_meeting_url IS NOT NULL);


--
-- Name: idx_ag_milestones_ag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_milestones_ag ON public.ag_milestones USING btree (ag_id);


--
-- Name: idx_ag_milestones_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_milestones_copro ON public.ag_milestones USING btree (copro_id);


--
-- Name: idx_ag_notification_events_notification; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_notification_events_notification ON public.ag_notification_events USING btree (notification_id);


--
-- Name: idx_ag_notifications_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_notifications_copro ON public.ag_notifications USING btree (copro_id);


--
-- Name: idx_ag_pending_ag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_pending_ag ON public.ag_pending_actions USING btree (ag_id);


--
-- Name: idx_ag_pending_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_pending_status ON public.ag_pending_actions USING btree (status);


--
-- Name: idx_ag_resolutions_ag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_resolutions_ag ON public.ag_resolutions USING btree (ag_id);


--
-- Name: idx_ag_resolutions_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_resolutions_copro ON public.ag_resolutions USING btree (copro_id);


--
-- Name: idx_ag_resolutions_majority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_resolutions_majority ON public.ag_resolutions USING btree (majority_type);


--
-- Name: idx_ag_resolutions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_resolutions_status ON public.ag_resolutions USING btree (status);


--
-- Name: idx_ag_session_drafts_ag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_session_drafts_ag ON public.ag_session_drafts USING btree (ag_id);


--
-- Name: idx_ag_session_drafts_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_session_drafts_copro ON public.ag_session_drafts USING btree (copro_id);


--
-- Name: idx_ag_votes_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ag_votes_copro ON public.ag_votes USING btree (copro_id);


--
-- Name: idx_alloc_line; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alloc_line ON public.payment_allocations USING btree (call_line_id);


--
-- Name: idx_alloc_payment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alloc_payment ON public.payment_allocations USING btree (payment_id);


--
-- Name: idx_bank_matches_mov; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_matches_mov ON public.bank_matches USING btree (bank_movement_id);


--
-- Name: idx_bank_mov_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_mov_copro ON public.bank_movements USING btree (copro_id);


--
-- Name: idx_budget_exp_budget; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_exp_budget ON public.budget_expenses USING btree (budget_id);


--
-- Name: idx_budget_exp_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_exp_date ON public.budget_expenses USING btree (copro_id, tx_date);


--
-- Name: idx_budget_exp_line; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_exp_line ON public.budget_expenses USING btree (budget_line_id);


--
-- Name: idx_budget_exp_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_exp_status ON public.budget_expenses USING btree (status);


--
-- Name: idx_budget_lines_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_lines_account ON public.budget_lines USING btree (account_id);


--
-- Name: idx_budget_lines_budget; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_lines_budget ON public.budget_lines USING btree (budget_id);


--
-- Name: idx_budget_lines_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_lines_copro ON public.budget_lines USING btree (copro_id);


--
-- Name: idx_budgets_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budgets_copro ON public.budgets USING btree (copro_id);


--
-- Name: idx_budgets_cpts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budgets_cpts ON public.budgets USING btree (copro_id, period_id, budget_type, status);


--
-- Name: idx_budgets_period_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budgets_period_status ON public.budgets USING btree (period_id, status);


--
-- Name: idx_buildings_copro_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_buildings_copro_id ON public.buildings USING btree (copro_id);


--
-- Name: idx_cabinets_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cabinets_name ON public.cabinets USING btree (name);


--
-- Name: idx_cff_copro_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cff_copro_period ON public.call_for_funds USING btree (copro_id, period_id);


--
-- Name: idx_cff_copro_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cff_copro_status ON public.call_for_funds USING btree (copro_id, status);


--
-- Name: idx_cff_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cff_due ON public.call_for_funds USING btree (due_date);


--
-- Name: idx_cff_lines_call; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cff_lines_call ON public.call_for_funds_lines USING btree (call_id);


--
-- Name: idx_cff_lines_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cff_lines_copro ON public.call_for_funds_lines USING btree (copro_id, call_id);


--
-- Name: idx_cff_lines_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cff_lines_lot ON public.call_for_funds_lines USING btree (lot_id);


--
-- Name: idx_cff_lines_lot_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cff_lines_lot_status ON public.call_for_funds_lines USING btree (lot_id, status);


--
-- Name: idx_cff_lines_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cff_lines_status ON public.call_for_funds_lines USING btree (status);


--
-- Name: idx_contracts_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_copro ON public.contracts USING btree (copro_id);


--
-- Name: idx_contracts_copro_end; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_copro_end ON public.contracts USING btree (copro_id, end_date);


--
-- Name: idx_contracts_copro_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_copro_status ON public.contracts USING btree (copro_id, status);


--
-- Name: idx_contracts_tiers; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contracts_tiers ON public.contracts USING btree (tiers_id);


--
-- Name: idx_conversation_members_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversation_members_active ON public.conversation_members USING btree (user_id, conversation_id) WHERE (left_at IS NULL);


--
-- Name: idx_conversation_members_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversation_members_conversation ON public.conversation_members USING btree (conversation_id);


--
-- Name: idx_conversation_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversation_members_user ON public.conversation_members USING btree (user_id);


--
-- Name: idx_conversations_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_copro ON public.conversations USING btree (copro_id);


--
-- Name: idx_conversations_copro_last_message; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_copro_last_message ON public.conversations USING btree (copro_id, last_message_at DESC NULLS LAST);


--
-- Name: idx_coproprietaires_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coproprietaires_copro ON public.coproprietaires USING btree (copro_id);


--
-- Name: idx_coproprietaires_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coproprietaires_email ON public.coproprietaires USING btree (email);


--
-- Name: idx_coproprietaires_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coproprietaires_name ON public.coproprietaires USING btree (last_name, first_name);


--
-- Name: idx_coproprietaires_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_coproprietaires_user ON public.coproprietaires USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_copros_cabinet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_copros_cabinet ON public.copros USING btree (cabinet_id);


--
-- Name: idx_copros_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_copros_name ON public.copros USING btree (name);


--
-- Name: idx_council_decisions_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_council_decisions_copro ON public.council_decisions USING btree (copro_id);


--
-- Name: idx_council_decisions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_council_decisions_status ON public.council_decisions USING btree (status);


--
-- Name: idx_council_documents_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_council_documents_copro ON public.council_documents USING btree (copro_id);


--
-- Name: idx_council_members_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_council_members_active ON public.council_members USING btree (copro_id) WHERE is_active;


--
-- Name: idx_council_votes_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_council_votes_copro ON public.council_votes USING btree (copro_id);


--
-- Name: idx_council_votes_decision; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_council_votes_decision ON public.council_votes USING btree (decision_id);


--
-- Name: idx_cutoff_copro_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cutoff_copro_period ON public.period_cutoff_items USING btree (copro_id, period_id);


--
-- Name: idx_document_folders_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_folders_copro ON public.document_folders USING btree (copro_id);


--
-- Name: idx_document_folders_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_folders_parent ON public.document_folders USING btree (parent_id);


--
-- Name: idx_document_folders_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_folders_sort ON public.document_folders USING btree (copro_id, parent_id, sort_order);


--
-- Name: idx_document_relations_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_relations_copro ON public.document_relations USING btree (copro_id);


--
-- Name: idx_document_relations_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_relations_entity ON public.document_relations USING btree (entity_type, entity_id);


--
-- Name: idx_document_versions_document; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_versions_document ON public.document_versions USING btree (document_id);


--
-- Name: idx_documents_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_category ON public.documents USING btree (copro_id, category);


--
-- Name: idx_documents_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_copro ON public.documents USING btree (copro_id);


--
-- Name: idx_documents_coproprietaire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_coproprietaire ON public.documents USING btree (coproprietaire_id) WHERE (coproprietaire_id IS NOT NULL);


--
-- Name: idx_documents_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_created ON public.documents USING btree (copro_id, created_at DESC);


--
-- Name: idx_documents_folder; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_folder ON public.documents USING btree (folder_id);


--
-- Name: idx_documents_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_hash ON public.documents USING btree (copro_id, file_hash) WHERE (file_hash IS NOT NULL);


--
-- Name: idx_documents_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_lot ON public.documents USING btree (lot_id);


--
-- Name: idx_documents_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_search ON public.documents USING gin (search_text);


--
-- Name: idx_documents_starred; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_starred ON public.documents USING btree (copro_id) WHERE is_starred;


--
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_status ON public.documents USING btree (copro_id, status);


--
-- Name: idx_documents_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_tags ON public.documents USING gin (tags);


--
-- Name: idx_documents_visibility; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_visibility ON public.documents USING btree (copro_id, visibility);


--
-- Name: idx_documents_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_year ON public.documents USING btree (copro_id, year);


--
-- Name: idx_email_templates_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_templates_code ON public.email_templates USING btree (code);


--
-- Name: idx_email_templates_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_templates_copro ON public.email_templates USING btree (copro_id);


--
-- Name: idx_entries_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entries_account ON public.ledger_entries USING btree (account_id);


--
-- Name: idx_entries_cpa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entries_cpa ON public.ledger_entries USING btree (copro_id, period_id, account_id);


--
-- Name: idx_entries_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entries_lot ON public.ledger_entries USING btree (lot_id) WHERE (lot_id IS NOT NULL);


--
-- Name: idx_entries_tx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entries_tx ON public.ledger_entries USING btree (tx_id);


--
-- Name: idx_etat_date_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_etat_date_lot ON public.etat_date_snapshots USING btree (lot_id);


--
-- Name: idx_etat_date_mutation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_etat_date_mutation ON public.etat_date_snapshots USING btree (copro_id, mutation_id, snapshot_type);


--
-- Name: idx_events_copro_starts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_copro_starts ON public.events USING btree (copro_id, starts_at);


--
-- Name: idx_events_copro_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_copro_type ON public.events USING btree (copro_id, event_type);


--
-- Name: idx_insurance_policies_contract; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_policies_contract ON public.insurance_policies USING btree (contract_id);


--
-- Name: idx_insurance_policies_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_policies_copro ON public.insurance_policies USING btree (copro_id);


--
-- Name: idx_insurance_policies_copro_subtype; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insurance_policies_copro_subtype ON public.insurance_policies USING btree (copro_id, sub_type);


--
-- Name: idx_inv_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_copro ON public.copro_invitations USING btree (copro_id);


--
-- Name: idx_inv_coprop; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_coprop ON public.copro_invitations USING btree (coproprietaire_id);


--
-- Name: idx_inv_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_pending ON public.copro_invitations USING btree (copro_id, status) WHERE (status = 'pending'::public.invitation_status);


--
-- Name: idx_inv_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_token ON public.copro_invitations USING btree (token);


--
-- Name: idx_keys_copro_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_keys_copro_active ON public.repartition_keys USING btree (copro_id, is_active);


--
-- Name: idx_ledger_tx_copro_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ledger_tx_copro_period ON public.ledger_transactions USING btree (copro_id, period_id);


--
-- Name: idx_ledger_tx_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ledger_tx_source ON public.ledger_transactions USING btree (source_type, source_id) WHERE (source_id IS NOT NULL);


--
-- Name: idx_legal_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_copro ON public.legal_proceedings USING btree (copro_id);


--
-- Name: idx_legal_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_lot ON public.legal_proceedings USING btree (lot_id) WHERE (lot_id IS NOT NULL);


--
-- Name: idx_legal_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_status ON public.legal_proceedings USING btree (copro_id, status);


--
-- Name: idx_lo_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lo_active ON public.lot_owners USING btree (lot_id) WHERE (end_date IS NULL);


--
-- Name: idx_lo_copro_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lo_copro_active ON public.lot_owners USING btree (copro_id, end_date);


--
-- Name: idx_lo_lot_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lo_lot_active ON public.lot_owners USING btree (lot_id, end_date);


--
-- Name: idx_lo_owner_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lo_owner_active ON public.lot_owners USING btree (coproprietaire_id, end_date);


--
-- Name: idx_lo_owner_primary; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lo_owner_primary ON public.lot_owners USING btree (coproprietaire_id, is_primary);


--
-- Name: idx_logbook_entries_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logbook_entries_copro ON public.logbook_entries USING btree (copro_id);


--
-- Name: idx_logbook_entries_copro_happened; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logbook_entries_copro_happened ON public.logbook_entries USING btree (copro_id, happened_at);


--
-- Name: idx_logbook_entries_so; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logbook_entries_so ON public.logbook_entries USING btree (service_order_id);


--
-- Name: idx_logbook_entries_tiers; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logbook_entries_tiers ON public.logbook_entries USING btree (tiers_id);


--
-- Name: idx_lots_building; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lots_building ON public.lots USING btree (building_id);


--
-- Name: idx_lots_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lots_copro ON public.lots USING btree (copro_id);


--
-- Name: idx_mails_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mails_active ON public.mails USING btree (copro_id) WHERE (is_deleted = false);


--
-- Name: idx_mails_copro_owner_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mails_copro_owner_created ON public.mails USING btree (copro_id, owner_id, created_at DESC);


--
-- Name: idx_mails_resend; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mails_resend ON public.mails USING btree (resend_id) WHERE (resend_id IS NOT NULL);


--
-- Name: idx_mails_thread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mails_thread ON public.mails USING btree (thread_id) WHERE (thread_id IS NOT NULL);


--
-- Name: idx_memberships_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memberships_copro ON public.memberships USING btree (copro_id);


--
-- Name: idx_memberships_copro_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memberships_copro_role ON public.memberships USING btree (copro_id, role);


--
-- Name: idx_memberships_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memberships_user ON public.memberships USING btree (user_id);


--
-- Name: idx_messages_attachment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_attachment ON public.messages USING btree (conversation_id) WHERE (attachment_id IS NOT NULL);


--
-- Name: idx_messages_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_author ON public.messages USING btree (author_id);


--
-- Name: idx_messages_conversation_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation_created ON public.messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_mutation_steps_mutation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mutation_steps_mutation ON public.mutation_steps USING btree (mutation_id);


--
-- Name: idx_mutation_steps_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mutation_steps_status ON public.mutation_steps USING btree (mutation_id, status);


--
-- Name: idx_mutations_copro_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mutations_copro_status ON public.mutations USING btree (copro_id, status);


--
-- Name: idx_mutations_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mutations_lot ON public.mutations USING btree (lot_id);


--
-- Name: idx_mutations_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mutations_period ON public.mutations USING btree (period_id);


--
-- Name: idx_mutations_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mutations_seller ON public.mutations USING btree (seller_owner_id);


--
-- Name: idx_opposition_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opposition_copro ON public.mutation_oppositions USING btree (copro_id);


--
-- Name: idx_opposition_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opposition_lot ON public.mutation_oppositions USING btree (lot_id);


--
-- Name: idx_opposition_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opposition_status ON public.mutation_oppositions USING btree (copro_id, status);


--
-- Name: idx_payments_copro_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_copro_period ON public.payments USING btree (copro_id, period_id);


--
-- Name: idx_payments_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_lot ON public.payments USING btree (lot_id);


--
-- Name: idx_planned_works_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planned_works_copro ON public.planned_works USING btree (copro_id);


--
-- Name: idx_planned_works_copro_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planned_works_copro_status ON public.planned_works USING btree (copro_id, status);


--
-- Name: idx_planned_works_ppt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_planned_works_ppt ON public.planned_works USING btree (copro_id) WHERE from_ppt;


--
-- Name: idx_profiles_cabinet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_cabinet ON public.profiles USING btree (cabinet_id) WHERE (cabinet_id IS NOT NULL);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_reminder_settings_paused; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminder_settings_paused ON public.reminder_settings USING btree (copro_id) WHERE is_paused;


--
-- Name: idx_reminders_call_line; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_call_line ON public.payment_reminders USING btree (call_line_id) WHERE (call_line_id IS NOT NULL);


--
-- Name: idx_reminders_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_pending ON public.payment_reminders USING btree (scheduled_at) WHERE (status = 'pending'::public.reminder_status);


--
-- Name: idx_rkl_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rkl_copro ON public.repartition_key_lines USING btree (copro_id);


--
-- Name: idx_rkl_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rkl_key ON public.repartition_key_lines USING btree (key_id);


--
-- Name: idx_rkl_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rkl_lot ON public.repartition_key_lines USING btree (lot_id);


--
-- Name: idx_service_order_events_so; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_order_events_so ON public.service_order_events USING btree (service_order_id, created_at);


--
-- Name: idx_service_orders_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_orders_copro ON public.service_orders USING btree (copro_id);


--
-- Name: idx_service_orders_copro_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_orders_copro_created ON public.service_orders USING btree (copro_id, created_at);


--
-- Name: idx_service_orders_copro_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_orders_copro_status ON public.service_orders USING btree (copro_id, status);


--
-- Name: idx_service_orders_tiers; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_orders_tiers ON public.service_orders USING btree (tiers_id);


--
-- Name: idx_supplier_invoice_lines_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_invoice_lines_invoice ON public.supplier_invoice_lines USING btree (invoice_id);


--
-- Name: idx_supplier_invoices_copro_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_invoices_copro_period ON public.supplier_invoices USING btree (copro_id, period_id);


--
-- Name: idx_supplier_invoices_copro_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_invoices_copro_status ON public.supplier_invoices USING btree (copro_id, status);


--
-- Name: idx_supplier_invoices_so; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_invoices_so ON public.supplier_invoices USING btree (service_order_id);


--
-- Name: idx_supplier_invoices_tiers; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_invoices_tiers ON public.supplier_invoices USING btree (tiers_id);


--
-- Name: idx_supplier_payments_copro_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_payments_copro_period ON public.supplier_payments USING btree (copro_id, period_id);


--
-- Name: idx_supplier_payments_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplier_payments_invoice ON public.supplier_payments USING btree (supplier_invoice_id);


--
-- Name: idx_technical_documents_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_technical_documents_type ON public.technical_documents USING btree (copro_id, doc_type);


--
-- Name: idx_technical_documents_validity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_technical_documents_validity ON public.technical_documents USING btree (copro_id, validity_date) WHERE (validity_date IS NOT NULL);


--
-- Name: idx_tiers_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_active ON public.tiers USING btree (copro_id, is_active);


--
-- Name: idx_tiers_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_category ON public.tiers USING btree (copro_id, category);


--
-- Name: idx_tiers_copro; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_copro ON public.tiers USING btree (copro_id);


--
-- Name: idx_tiers_domains; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_domains ON public.tiers USING gin (domain_ids);


--
-- Name: idx_tiers_notary; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_notary ON public.tiers USING btree (copro_id) WHERE is_notary;


--
-- Name: idx_tiers_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_provider ON public.tiers USING btree (copro_id) WHERE is_provider;


--
-- Name: idx_tiers_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiers_supplier ON public.tiers USING btree (copro_id) WHERE is_supplier;


--
-- Name: idx_treasury_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_treasury_lot ON public.treasury_advances USING btree (lot_id);


--
-- Name: idx_wall_comments_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wall_comments_parent ON public.wall_comments USING btree (parent_comment_id) WHERE (parent_comment_id IS NOT NULL);


--
-- Name: idx_wall_comments_post_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wall_comments_post_created ON public.wall_comments USING btree (post_id, created_at);


--
-- Name: idx_wall_likes_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wall_likes_post ON public.wall_likes USING btree (post_id);


--
-- Name: idx_wall_posts_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wall_posts_author ON public.wall_posts USING btree (author_id);


--
-- Name: idx_wall_posts_copro_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wall_posts_copro_created ON public.wall_posts USING btree (copro_id, created_at DESC);


--
-- Name: idx_wall_posts_copro_pinned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wall_posts_copro_pinned ON public.wall_posts USING btree (copro_id, is_pinned, created_at DESC);


--
-- Name: idx_wall_posts_copro_visibility; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wall_posts_copro_visibility ON public.wall_posts USING btree (copro_id, visibility);


--
-- Name: idx_wall_posts_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wall_posts_tags ON public.wall_posts USING gin (tags);


--
-- Name: idx_work_domain_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_work_domain_active ON public.work_domain USING btree (is_active, sort_order);


--
-- Name: uq_budget_one_validated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_budget_one_validated ON public.budgets USING btree (copro_id, period_id, budget_type) WHERE (status = 'validated'::public.budget_status);


--
-- Name: uq_email_templates_code_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_email_templates_code_scope ON public.email_templates USING btree (code, copro_id);


--
-- Name: uq_email_templates_code_system; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_email_templates_code_system ON public.email_templates USING btree (code) WHERE (copro_id IS NULL);


--
-- Name: uq_invitation_pending_coprop; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_invitation_pending_coprop ON public.copro_invitations USING btree (coproprietaire_id) WHERE (status = 'pending'::public.invitation_status);


--
-- Name: uq_ledger_tx_closing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_ledger_tx_closing ON public.ledger_transactions USING btree (copro_id, source_id, period_id) WHERE (source_type = 'closing'::public.ledger_source_type);


--
-- Name: uq_ledger_tx_opening_balance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_ledger_tx_opening_balance ON public.ledger_transactions USING btree (copro_id, source_id, period_id) WHERE (source_type = 'opening_balance'::public.ledger_source_type);


--
-- Name: uq_ledger_tx_opening_onboarding; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_ledger_tx_opening_onboarding ON public.ledger_transactions USING btree (copro_id, source_id, period_id) WHERE (source_type = 'opening_onboarding'::public.ledger_source_type);


--
-- Name: uq_ledger_tx_result_allocation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_ledger_tx_result_allocation ON public.ledger_transactions USING btree (copro_id, period_id) WHERE (source_type = 'result_allocation'::public.ledger_source_type);


--
-- Name: uq_lot_primary_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_lot_primary_active ON public.lot_owners USING btree (lot_id) WHERE ((end_date IS NULL) AND is_primary);


--
-- Name: uq_mutations_active_lot; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_mutations_active_lot ON public.mutations USING btree (lot_id) WHERE (status = ANY (ARRAY['draft'::public.mutation_status, 'pre_etat_generated'::public.mutation_status, 'etat_generated'::public.mutation_status, 'signed'::public.mutation_status]));


--
-- Name: uq_payments_idempotency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_payments_idempotency ON public.payments USING btree (copro_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: uq_period_single_open; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_period_single_open ON public.accounting_periods USING btree (copro_id) WHERE (status = 'open'::public.period_status);


--
-- Name: ux_supplier_payments_idempotency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_supplier_payments_idempotency ON public.supplier_payments USING btree (copro_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: accounts trg_accounts_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ag_attendance trg_ag_attendance_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ag_attendance_updated BEFORE UPDATE ON public.ag_attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ag_correspondence_votes trg_ag_corr_votes_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ag_corr_votes_updated BEFORE UPDATE ON public.ag_correspondence_votes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ag_envoi_tracking trg_ag_envoi_tracking_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ag_envoi_tracking_updated BEFORE UPDATE ON public.ag_envoi_tracking FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ag_meetings trg_ag_meetings_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ag_meetings_updated BEFORE UPDATE ON public.ag_meetings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ag_milestones trg_ag_milestones_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ag_milestones_updated BEFORE UPDATE ON public.ag_milestones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ag_resolutions trg_ag_resolutions_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ag_resolutions_updated BEFORE UPDATE ON public.ag_resolutions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ag_votes trg_ag_votes_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ag_votes_updated BEFORE UPDATE ON public.ag_votes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: alur_transfers trg_alur_transfers_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_alur_transfers_updated BEFORE UPDATE ON public.alur_transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: budget_payment_schedules trg_bps_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bps_updated BEFORE UPDATE ON public.budget_payment_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: budget_expenses trg_budget_exp_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_budget_exp_updated BEFORE UPDATE ON public.budget_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: budget_lines trg_budget_lines_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_budget_lines_updated BEFORE UPDATE ON public.budget_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: budgets trg_budgets_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: buildings trg_buildings_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_buildings_updated BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: cabinets trg_cabinets_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cabinets_updated BEFORE UPDATE ON public.cabinets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: call_for_funds trg_cff_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cff_updated BEFORE UPDATE ON public.call_for_funds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tiers trg_check_tiers_domain_ids; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_check_tiers_domain_ids BEFORE INSERT OR UPDATE ON public.tiers FOR EACH ROW EXECUTE FUNCTION public.check_tiers_domain_ids();


--
-- Name: contracts trg_contracts_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: conversations trg_conversations_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: coproprietaires trg_coproprietaires_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_coproprietaires_updated BEFORE UPDATE ON public.coproprietaires FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: copros trg_copros_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_copros_updated BEFORE UPDATE ON public.copros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: council_decisions trg_council_decisions_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_council_decisions_updated BEFORE UPDATE ON public.council_decisions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: council_members trg_council_members_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_council_members_updated BEFORE UPDATE ON public.council_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: document_folders trg_document_folders_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_document_folders_updated BEFORE UPDATE ON public.document_folders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: documents trg_documents_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: email_templates trg_email_templates_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_email_templates_updated BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: events trg_events_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: insurance_policies trg_insurance_policies_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_insurance_policies_updated BEFORE UPDATE ON public.insurance_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: copro_invitations trg_invitation_copro_consistency; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_invitation_copro_consistency BEFORE INSERT OR UPDATE ON public.copro_invitations FOR EACH ROW EXECUTE FUNCTION public.tr_invitation_copro_consistency();


--
-- Name: legal_proceedings trg_legal_proceedings_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_legal_proceedings_updated BEFORE UPDATE ON public.legal_proceedings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: logbook_entries trg_logbook_entries_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_logbook_entries_updated BEFORE UPDATE ON public.logbook_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lots trg_lot_copro_consistency; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_lot_copro_consistency BEFORE INSERT OR UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.tr_lot_copro_consistency();


--
-- Name: lot_owners trg_lot_owner_copro_consistency; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_lot_owner_copro_consistency BEFORE INSERT OR UPDATE ON public.lot_owners FOR EACH ROW EXECUTE FUNCTION public.tr_lot_owner_copro_consistency();


--
-- Name: lot_owners trg_lot_owner_shares_sum; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_lot_owner_shares_sum AFTER INSERT OR DELETE OR UPDATE ON public.lot_owners FOR EACH ROW EXECUTE FUNCTION public.tr_lot_owner_shares_sum();


--
-- Name: lots trg_lots_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_lots_updated BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: mails trg_mails_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_mails_updated BEFORE UPDATE ON public.mails FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: mutation_oppositions trg_mutation_oppositions_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_mutation_oppositions_updated BEFORE UPDATE ON public.mutation_oppositions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: mutation_steps trg_mutation_steps_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_mutation_steps_updated BEFORE UPDATE ON public.mutation_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: mutations trg_mutations_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_mutations_updated BEFORE UPDATE ON public.mutations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: accounting_periods trg_periods_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_periods_updated BEFORE UPDATE ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: planned_works trg_planned_works_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_planned_works_updated BEFORE UPDATE ON public.planned_works FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles trg_profiles_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_reminder_rules trg_reminder_rules_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reminder_rules_updated BEFORE UPDATE ON public.payment_reminder_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reminder_settings trg_reminder_settings_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reminder_settings_updated BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_reminders trg_reminders_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reminders_updated BEFORE UPDATE ON public.payment_reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: repartition_key_lines trg_rkl_copro_consistency; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_rkl_copro_consistency BEFORE INSERT OR UPDATE ON public.repartition_key_lines FOR EACH ROW EXECUTE FUNCTION public.tr_rkl_copro_consistency();


--
-- Name: service_orders trg_service_orders_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_service_orders_updated BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: supplier_invoices trg_supplier_invoices_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_supplier_invoices_updated BEFORE UPDATE ON public.supplier_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: technical_documents trg_technical_documents_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_technical_documents_updated BEFORE UPDATE ON public.technical_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tiers trg_tiers_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_tiers_updated BEFORE UPDATE ON public.tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: wall_comments trg_wall_comments_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_wall_comments_updated BEFORE UPDATE ON public.wall_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: wall_posts trg_wall_posts_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_wall_posts_updated BEFORE UPDATE ON public.wall_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: accounting_periods accounting_periods_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: accounting_periods accounting_periods_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id);


--
-- Name: accounting_periods accounting_periods_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_periods
    ADD CONSTRAINT accounting_periods_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: accounts accounts_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: ag_attendance ag_attendance_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_attendance
    ADD CONSTRAINT ag_attendance_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE CASCADE;


--
-- Name: ag_attendance ag_attendance_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_attendance
    ADD CONSTRAINT ag_attendance_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_attendance ag_attendance_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_attendance
    ADD CONSTRAINT ag_attendance_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE RESTRICT;


--
-- Name: ag_attendance ag_attendance_represented_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_attendance
    ADD CONSTRAINT ag_attendance_represented_by_id_fkey FOREIGN KEY (represented_by_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: ag_correspondence_vote_details ag_correspondence_vote_details_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_vote_details
    ADD CONSTRAINT ag_correspondence_vote_details_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_correspondence_vote_details ag_correspondence_vote_details_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_vote_details
    ADD CONSTRAINT ag_correspondence_vote_details_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE RESTRICT;


--
-- Name: ag_correspondence_vote_details ag_correspondence_vote_details_correspondence_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_vote_details
    ADD CONSTRAINT ag_correspondence_vote_details_correspondence_form_id_fkey FOREIGN KEY (correspondence_form_id) REFERENCES public.ag_correspondence_votes(id) ON DELETE CASCADE;


--
-- Name: ag_correspondence_vote_details ag_correspondence_vote_details_integrated_vote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_vote_details
    ADD CONSTRAINT ag_correspondence_vote_details_integrated_vote_id_fkey FOREIGN KEY (integrated_vote_id) REFERENCES public.ag_votes(id) ON DELETE SET NULL;


--
-- Name: ag_correspondence_vote_details ag_correspondence_vote_details_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_vote_details
    ADD CONSTRAINT ag_correspondence_vote_details_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ag_correspondence_vote_details ag_correspondence_vote_details_resolution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_vote_details
    ADD CONSTRAINT ag_correspondence_vote_details_resolution_id_fkey FOREIGN KEY (resolution_id) REFERENCES public.ag_resolutions(id) ON DELETE CASCADE;


--
-- Name: ag_correspondence_votes ag_correspondence_votes_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_votes
    ADD CONSTRAINT ag_correspondence_votes_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE CASCADE;


--
-- Name: ag_correspondence_votes ag_correspondence_votes_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_votes
    ADD CONSTRAINT ag_correspondence_votes_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_correspondence_votes ag_correspondence_votes_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_votes
    ADD CONSTRAINT ag_correspondence_votes_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE RESTRICT;


--
-- Name: ag_correspondence_votes ag_correspondence_votes_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_votes
    ADD CONSTRAINT ag_correspondence_votes_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ag_envoi_tracking ag_envoi_tracking_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_envoi_tracking
    ADD CONSTRAINT ag_envoi_tracking_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE CASCADE;


--
-- Name: ag_envoi_tracking ag_envoi_tracking_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_envoi_tracking
    ADD CONSTRAINT ag_envoi_tracking_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: ag_meetings ag_meetings_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_meetings
    ADD CONSTRAINT ag_meetings_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_meetings ag_meetings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_meetings
    ADD CONSTRAINT ag_meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ag_meetings ag_meetings_president_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_meetings
    ADD CONSTRAINT ag_meetings_president_id_fkey FOREIGN KEY (president_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: ag_meetings ag_meetings_scrutineer1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_meetings
    ADD CONSTRAINT ag_meetings_scrutineer1_id_fkey FOREIGN KEY (scrutineer1_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: ag_meetings ag_meetings_scrutineer2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_meetings
    ADD CONSTRAINT ag_meetings_scrutineer2_id_fkey FOREIGN KEY (scrutineer2_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: ag_meetings ag_meetings_secretary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_meetings
    ADD CONSTRAINT ag_meetings_secretary_id_fkey FOREIGN KEY (secretary_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ag_milestones ag_milestones_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_milestones
    ADD CONSTRAINT ag_milestones_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE CASCADE;


--
-- Name: ag_milestones ag_milestones_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_milestones
    ADD CONSTRAINT ag_milestones_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_notification_events ag_notification_events_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_notification_events
    ADD CONSTRAINT ag_notification_events_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.ag_notifications(id) ON DELETE CASCADE;


--
-- Name: ag_notifications ag_notifications_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_notifications
    ADD CONSTRAINT ag_notifications_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE CASCADE;


--
-- Name: ag_notifications ag_notifications_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_notifications
    ADD CONSTRAINT ag_notifications_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_notifications ag_notifications_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_notifications
    ADD CONSTRAINT ag_notifications_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: ag_pending_actions ag_pending_actions_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_pending_actions
    ADD CONSTRAINT ag_pending_actions_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE CASCADE;


--
-- Name: ag_pending_actions ag_pending_actions_resolution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_pending_actions
    ADD CONSTRAINT ag_pending_actions_resolution_id_fkey FOREIGN KEY (resolution_id) REFERENCES public.ag_resolutions(id) ON DELETE CASCADE;


--
-- Name: ag_resolutions ag_resolutions_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_resolutions
    ADD CONSTRAINT ag_resolutions_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE CASCADE;


--
-- Name: ag_resolutions ag_resolutions_bridge_vote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_resolutions
    ADD CONSTRAINT ag_resolutions_bridge_vote_id_fkey FOREIGN KEY (bridge_vote_id) REFERENCES public.ag_resolutions(id) ON DELETE SET NULL;


--
-- Name: ag_resolutions ag_resolutions_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_resolutions
    ADD CONSTRAINT ag_resolutions_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_resolutions ag_resolutions_linked_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_resolutions
    ADD CONSTRAINT ag_resolutions_linked_budget_id_fkey FOREIGN KEY (linked_budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL;


--
-- Name: ag_resolutions ag_resolutions_linked_work_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_resolutions
    ADD CONSTRAINT ag_resolutions_linked_work_budget_id_fkey FOREIGN KEY (linked_work_budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL;


--
-- Name: ag_session_drafts ag_session_drafts_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_session_drafts
    ADD CONSTRAINT ag_session_drafts_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE CASCADE;


--
-- Name: ag_session_drafts ag_session_drafts_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_session_drafts
    ADD CONSTRAINT ag_session_drafts_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_session_drafts ag_session_drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_session_drafts
    ADD CONSTRAINT ag_session_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ag_votes ag_votes_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_votes
    ADD CONSTRAINT ag_votes_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ag_votes ag_votes_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_votes
    ADD CONSTRAINT ag_votes_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE RESTRICT;


--
-- Name: ag_votes ag_votes_resolution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_votes
    ADD CONSTRAINT ag_votes_resolution_id_fkey FOREIGN KEY (resolution_id) REFERENCES public.ag_resolutions(id) ON DELETE CASCADE;


--
-- Name: alur_transfers alur_transfers_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alur_transfers
    ADD CONSTRAINT alur_transfers_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL;


--
-- Name: alur_transfers alur_transfers_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alur_transfers
    ADD CONSTRAINT alur_transfers_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: alur_transfers alur_transfers_ledger_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alur_transfers
    ADD CONSTRAINT alur_transfers_ledger_tx_id_fkey FOREIGN KEY (ledger_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: bank_matches bank_matches_bank_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_matches
    ADD CONSTRAINT bank_matches_bank_movement_id_fkey FOREIGN KEY (bank_movement_id) REFERENCES public.bank_movements(id) ON DELETE CASCADE;


--
-- Name: bank_matches bank_matches_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_matches
    ADD CONSTRAINT bank_matches_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: bank_matches bank_matches_matched_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_matches
    ADD CONSTRAINT bank_matches_matched_by_fkey FOREIGN KEY (matched_by) REFERENCES public.profiles(id);


--
-- Name: bank_movements bank_movements_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_movements
    ADD CONSTRAINT bank_movements_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: bank_movements bank_movements_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_movements
    ADD CONSTRAINT bank_movements_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: bank_movements bank_movements_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_movements
    ADD CONSTRAINT bank_movements_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: budget_expenses budget_expenses_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_expenses
    ADD CONSTRAINT budget_expenses_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE RESTRICT;


--
-- Name: budget_expenses budget_expenses_budget_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_expenses
    ADD CONSTRAINT budget_expenses_budget_line_id_fkey FOREIGN KEY (budget_line_id) REFERENCES public.budget_lines(id) ON DELETE RESTRICT;


--
-- Name: budget_expenses budget_expenses_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_expenses
    ADD CONSTRAINT budget_expenses_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: budget_expenses budget_expenses_ledger_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_expenses
    ADD CONSTRAINT budget_expenses_ledger_tx_id_fkey FOREIGN KEY (ledger_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: budget_expenses budget_expenses_tiers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_expenses
    ADD CONSTRAINT budget_expenses_tiers_id_fkey FOREIGN KEY (tiers_id) REFERENCES public.tiers(id) ON DELETE SET NULL;


--
-- Name: budget_expenses budget_expenses_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_expenses
    ADD CONSTRAINT budget_expenses_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.profiles(id);


--
-- Name: budget_lines budget_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: budget_lines budget_lines_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;


--
-- Name: budget_lines budget_lines_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: budget_lines budget_lines_repartition_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_repartition_key_id_fkey FOREIGN KEY (repartition_key_id) REFERENCES public.repartition_keys(id) ON DELETE RESTRICT;


--
-- Name: budget_payment_schedules budget_payment_schedules_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_payment_schedules
    ADD CONSTRAINT budget_payment_schedules_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;


--
-- Name: budget_payment_schedules budget_payment_schedules_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_payment_schedules
    ADD CONSTRAINT budget_payment_schedules_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: budgets budgets_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: budgets budgets_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: buildings buildings_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: call_for_funds call_for_funds_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds
    ADD CONSTRAINT call_for_funds_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id);


--
-- Name: call_for_funds call_for_funds_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds
    ADD CONSTRAINT call_for_funds_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: call_for_funds call_for_funds_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds
    ADD CONSTRAINT call_for_funds_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: call_for_funds call_for_funds_ledger_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds
    ADD CONSTRAINT call_for_funds_ledger_tx_id_fkey FOREIGN KEY (ledger_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: call_for_funds_lines call_for_funds_lines_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds_lines
    ADD CONSTRAINT call_for_funds_lines_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.call_for_funds(id) ON DELETE CASCADE;


--
-- Name: call_for_funds_lines call_for_funds_lines_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds_lines
    ADD CONSTRAINT call_for_funds_lines_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: call_for_funds_lines call_for_funds_lines_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds_lines
    ADD CONSTRAINT call_for_funds_lines_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: call_for_funds_lines call_for_funds_lines_repartition_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds_lines
    ADD CONSTRAINT call_for_funds_lines_repartition_key_id_fkey FOREIGN KEY (repartition_key_id) REFERENCES public.repartition_keys(id);


--
-- Name: call_for_funds call_for_funds_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds
    ADD CONSTRAINT call_for_funds_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id);


--
-- Name: call_for_funds call_for_funds_repartition_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_for_funds
    ADD CONSTRAINT call_for_funds_repartition_key_id_fkey FOREIGN KEY (repartition_key_id) REFERENCES public.repartition_keys(id);


--
-- Name: collective_loan_shares collective_loan_shares_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collective_loan_shares
    ADD CONSTRAINT collective_loan_shares_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.collective_loans(id) ON DELETE CASCADE;


--
-- Name: collective_loan_shares collective_loan_shares_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collective_loan_shares
    ADD CONSTRAINT collective_loan_shares_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: collective_loans collective_loans_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collective_loans
    ADD CONSTRAINT collective_loans_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: collective_loans collective_loans_ledger_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collective_loans
    ADD CONSTRAINT collective_loans_ledger_tx_id_fkey FOREIGN KEY (ledger_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: contracts contracts_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.work_domain(id) ON DELETE RESTRICT;


--
-- Name: contracts contracts_tiers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_tiers_id_fkey FOREIGN KEY (tiers_id) REFERENCES public.tiers(id) ON DELETE RESTRICT;


--
-- Name: conversation_members conversation_members_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: copro_invitations copro_invitations_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copro_invitations
    ADD CONSTRAINT copro_invitations_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: copro_invitations copro_invitations_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copro_invitations
    ADD CONSTRAINT copro_invitations_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE CASCADE;


--
-- Name: copro_invitations copro_invitations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copro_invitations
    ADD CONSTRAINT copro_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: coproprietaires coproprietaires_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coproprietaires
    ADD CONSTRAINT coproprietaires_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: copros copros_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.copros
    ADD CONSTRAINT copros_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON DELETE RESTRICT;


--
-- Name: council_decisions council_decisions_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_decisions
    ADD CONSTRAINT council_decisions_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: council_decisions council_decisions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_decisions
    ADD CONSTRAINT council_decisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: council_decisions council_decisions_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_decisions
    ADD CONSTRAINT council_decisions_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: council_decisions council_decisions_linked_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_decisions
    ADD CONSTRAINT council_decisions_linked_ag_id_fkey FOREIGN KEY (linked_ag_id) REFERENCES public.ag_meetings(id) ON DELETE SET NULL;


--
-- Name: council_decisions council_decisions_linked_resolution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_decisions
    ADD CONSTRAINT council_decisions_linked_resolution_id_fkey FOREIGN KEY (linked_resolution_id) REFERENCES public.ag_resolutions(id) ON DELETE SET NULL;


--
-- Name: council_decisions council_decisions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_decisions
    ADD CONSTRAINT council_decisions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: council_documents council_documents_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_documents
    ADD CONSTRAINT council_documents_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: council_documents council_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_documents
    ADD CONSTRAINT council_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: council_members council_members_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_members
    ADD CONSTRAINT council_members_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: council_members council_members_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_members
    ADD CONSTRAINT council_members_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: council_members council_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_members
    ADD CONSTRAINT council_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: council_votes council_votes_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_votes
    ADD CONSTRAINT council_votes_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: council_votes council_votes_council_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_votes
    ADD CONSTRAINT council_votes_council_member_id_fkey FOREIGN KEY (council_member_id) REFERENCES public.council_members(id) ON DELETE CASCADE;


--
-- Name: council_votes council_votes_decision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_votes
    ADD CONSTRAINT council_votes_decision_id_fkey FOREIGN KEY (decision_id) REFERENCES public.council_decisions(id) ON DELETE CASCADE;


--
-- Name: document_folders document_folders_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT document_folders_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: document_folders document_folders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT document_folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: document_folders document_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT document_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.document_folders(id) ON DELETE CASCADE;


--
-- Name: document_relations document_relations_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: document_relations document_relations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: document_relations document_relations_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_relations
    ADD CONSTRAINT document_relations_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_versions document_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: documents documents_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: documents documents_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.document_folders(id) ON DELETE SET NULL;


--
-- Name: documents documents_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- Name: email_templates email_templates_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: etat_date_snapshots etat_date_snapshots_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etat_date_snapshots
    ADD CONSTRAINT etat_date_snapshots_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: etat_date_snapshots etat_date_snapshots_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etat_date_snapshots
    ADD CONSTRAINT etat_date_snapshots_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: etat_date_snapshots etat_date_snapshots_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etat_date_snapshots
    ADD CONSTRAINT etat_date_snapshots_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: etat_date_snapshots etat_date_snapshots_mutation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etat_date_snapshots
    ADD CONSTRAINT etat_date_snapshots_mutation_id_fkey FOREIGN KEY (mutation_id) REFERENCES public.mutations(id) ON DELETE CASCADE;


--
-- Name: events events_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: events events_linked_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_linked_ag_id_fkey FOREIGN KEY (linked_ag_id) REFERENCES public.ag_meetings(id) ON DELETE SET NULL;


--
-- Name: events events_linked_service_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_linked_service_order_id_fkey FOREIGN KEY (linked_service_order_id) REFERENCES public.service_orders(id) ON DELETE SET NULL;


--
-- Name: ag_attendance fk_ag_att_proxy; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_attendance
    ADD CONSTRAINT fk_ag_att_proxy FOREIGN KEY (proxy_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: ag_correspondence_votes fk_ag_corr_form; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_correspondence_votes
    ADD CONSTRAINT fk_ag_corr_form FOREIGN KEY (form_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: ag_envoi_tracking fk_ag_envoi_doc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_envoi_tracking
    ADD CONSTRAINT fk_ag_envoi_doc FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: ag_meetings fk_ag_pv_doc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ag_meetings
    ADD CONSTRAINT fk_ag_pv_doc FOREIGN KEY (pv_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: payment_allocations fk_alloc_call_line; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT fk_alloc_call_line FOREIGN KEY (call_line_id) REFERENCES public.call_for_funds_lines(id) ON DELETE CASCADE;


--
-- Name: budget_expenses fk_be_piece; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_expenses
    ADD CONSTRAINT fk_be_piece FOREIGN KEY (piece_jointe) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: budget_payment_schedules fk_bps_service_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_payment_schedules
    ADD CONSTRAINT fk_bps_service_order FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id) ON DELETE SET NULL;


--
-- Name: budgets fk_budgets_source_ag; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT fk_budgets_source_ag FOREIGN KEY (source_ag_id) REFERENCES public.ag_meetings(id) ON DELETE SET NULL;


--
-- Name: coproprietaires fk_coproprietaires_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coproprietaires
    ADD CONSTRAINT fk_coproprietaires_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: council_documents fk_council_doc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.council_documents
    ADD CONSTRAINT fk_council_doc FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: period_cutoff_items fk_cutoff_tiers; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_cutoff_items
    ADD CONSTRAINT fk_cutoff_tiers FOREIGN KEY (tiers_id) REFERENCES public.tiers(id) ON DELETE SET NULL;


--
-- Name: etat_date_snapshots fk_etatdate_doc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etat_date_snapshots
    ADD CONSTRAINT fk_etatdate_doc FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: service_orders fk_so_logbook; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT fk_so_logbook FOREIGN KEY (logbook_entry_id) REFERENCES public.logbook_entries(id) ON DELETE SET NULL;


--
-- Name: insurance_policies insurance_policies_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: insurance_policies insurance_policies_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_tx_id_fkey FOREIGN KEY (tx_id) REFERENCES public.ledger_transactions(id) ON DELETE CASCADE;


--
-- Name: ledger_transactions ledger_transactions_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_transactions
    ADD CONSTRAINT ledger_transactions_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: ledger_transactions ledger_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_transactions
    ADD CONSTRAINT ledger_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: ledger_transactions ledger_transactions_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_transactions
    ADD CONSTRAINT ledger_transactions_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: ledger_transactions ledger_transactions_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_transactions
    ADD CONSTRAINT ledger_transactions_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.profiles(id);


--
-- Name: legal_proceedings legal_proceedings_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_proceedings
    ADD CONSTRAINT legal_proceedings_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: legal_proceedings legal_proceedings_debtor_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_proceedings
    ADD CONSTRAINT legal_proceedings_debtor_owner_id_fkey FOREIGN KEY (debtor_owner_id) REFERENCES public.coproprietaires(id) ON DELETE SET NULL;


--
-- Name: legal_proceedings legal_proceedings_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_proceedings
    ADD CONSTRAINT legal_proceedings_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- Name: logbook_entries logbook_entries_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT logbook_entries_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;


--
-- Name: logbook_entries logbook_entries_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT logbook_entries_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: logbook_entries logbook_entries_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT logbook_entries_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: logbook_entries logbook_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT logbook_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: logbook_entries logbook_entries_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT logbook_entries_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: logbook_entries logbook_entries_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT logbook_entries_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.work_domain(id) ON DELETE RESTRICT;


--
-- Name: logbook_entries logbook_entries_service_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT logbook_entries_service_order_id_fkey FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id) ON DELETE SET NULL;


--
-- Name: logbook_entries logbook_entries_tiers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logbook_entries
    ADD CONSTRAINT logbook_entries_tiers_id_fkey FOREIGN KEY (tiers_id) REFERENCES public.tiers(id) ON DELETE SET NULL;


--
-- Name: lot_owners lot_owners_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_owners
    ADD CONSTRAINT lot_owners_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: lot_owners lot_owners_coproprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_owners
    ADD CONSTRAINT lot_owners_coproprietaire_id_fkey FOREIGN KEY (coproprietaire_id) REFERENCES public.coproprietaires(id) ON DELETE CASCADE;


--
-- Name: lot_owners lot_owners_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lot_owners
    ADD CONSTRAINT lot_owners_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: lots lots_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;


--
-- Name: lots lots_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: mails mails_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mails
    ADD CONSTRAINT mails_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: mails mails_in_reply_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mails
    ADD CONSTRAINT mails_in_reply_to_fkey FOREIGN KEY (in_reply_to) REFERENCES public.mails(id) ON DELETE SET NULL;


--
-- Name: mails mails_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mails
    ADD CONSTRAINT mails_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: memberships memberships_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: messages messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: mutation_oppositions mutation_oppositions_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_oppositions
    ADD CONSTRAINT mutation_oppositions_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: mutation_oppositions mutation_oppositions_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_oppositions
    ADD CONSTRAINT mutation_oppositions_ledger_transaction_id_fkey FOREIGN KEY (ledger_transaction_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: mutation_oppositions mutation_oppositions_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_oppositions
    ADD CONSTRAINT mutation_oppositions_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: mutation_oppositions mutation_oppositions_mutation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_oppositions
    ADD CONSTRAINT mutation_oppositions_mutation_id_fkey FOREIGN KEY (mutation_id) REFERENCES public.mutations(id) ON DELETE CASCADE;


--
-- Name: mutation_oppositions mutation_oppositions_notaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_oppositions
    ADD CONSTRAINT mutation_oppositions_notaire_id_fkey FOREIGN KEY (notaire_id) REFERENCES public.tiers(id) ON DELETE SET NULL;


--
-- Name: mutation_steps mutation_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_steps
    ADD CONSTRAINT mutation_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: mutation_steps mutation_steps_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_steps
    ADD CONSTRAINT mutation_steps_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: mutation_steps mutation_steps_mutation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutation_steps
    ADD CONSTRAINT mutation_steps_mutation_id_fkey FOREIGN KEY (mutation_id) REFERENCES public.mutations(id) ON DELETE CASCADE;


--
-- Name: mutations mutations_buyer_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_buyer_owner_id_fkey FOREIGN KEY (buyer_owner_id) REFERENCES public.coproprietaires(id) ON DELETE RESTRICT;


--
-- Name: mutations mutations_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: mutations mutations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: mutations mutations_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: mutations mutations_notaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_notaire_id_fkey FOREIGN KEY (notaire_id) REFERENCES public.tiers(id) ON DELETE SET NULL;


--
-- Name: mutations mutations_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: mutations mutations_seller_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mutations
    ADD CONSTRAINT mutations_seller_owner_id_fkey FOREIGN KEY (seller_owner_id) REFERENCES public.coproprietaires(id) ON DELETE RESTRICT;


--
-- Name: payment_allocations payment_allocations_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: payment_allocations payment_allocations_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_allocations
    ADD CONSTRAINT payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payment_reminder_rules payment_reminder_rules_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminder_rules
    ADD CONSTRAINT payment_reminder_rules_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: payment_reminder_rules payment_reminder_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminder_rules
    ADD CONSTRAINT payment_reminder_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: payment_reminder_rules payment_reminder_rules_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminder_rules
    ADD CONSTRAINT payment_reminder_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL;


--
-- Name: payment_reminders payment_reminders_call_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.call_for_funds(id);


--
-- Name: payment_reminders payment_reminders_call_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_call_line_id_fkey FOREIGN KEY (call_line_id) REFERENCES public.call_for_funds_lines(id);


--
-- Name: payment_reminders payment_reminders_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: payment_reminders payment_reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: payment_reminders payment_reminders_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: payment_reminders payment_reminders_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.coproprietaires(id);


--
-- Name: payment_reminders payment_reminders_reminder_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_reminders
    ADD CONSTRAINT payment_reminders_reminder_rule_id_fkey FOREIGN KEY (reminder_rule_id) REFERENCES public.payment_reminder_rules(id);


--
-- Name: payments payments_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: payments payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: payments payments_ledger_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_ledger_tx_id_fkey FOREIGN KEY (ledger_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: payments payments_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: payments payments_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: period_cutoff_items period_cutoff_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_cutoff_items
    ADD CONSTRAINT period_cutoff_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: period_cutoff_items period_cutoff_items_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_cutoff_items
    ADD CONSTRAINT period_cutoff_items_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: period_cutoff_items period_cutoff_items_counterpart_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_cutoff_items
    ADD CONSTRAINT period_cutoff_items_counterpart_account_id_fkey FOREIGN KEY (counterpart_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: period_cutoff_items period_cutoff_items_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_cutoff_items
    ADD CONSTRAINT period_cutoff_items_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: period_cutoff_items period_cutoff_items_posting_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_cutoff_items
    ADD CONSTRAINT period_cutoff_items_posting_tx_id_fkey FOREIGN KEY (posting_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: period_cutoff_items period_cutoff_items_reversal_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_cutoff_items
    ADD CONSTRAINT period_cutoff_items_reversal_tx_id_fkey FOREIGN KEY (reversal_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: planned_works planned_works_ag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_works
    ADD CONSTRAINT planned_works_ag_id_fkey FOREIGN KEY (ag_id) REFERENCES public.ag_meetings(id) ON DELETE SET NULL;


--
-- Name: planned_works planned_works_budget_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_works
    ADD CONSTRAINT planned_works_budget_line_id_fkey FOREIGN KEY (budget_line_id) REFERENCES public.budget_lines(id) ON DELETE SET NULL;


--
-- Name: planned_works planned_works_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_works
    ADD CONSTRAINT planned_works_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: planned_works planned_works_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_works
    ADD CONSTRAINT planned_works_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: planned_works planned_works_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_works
    ADD CONSTRAINT planned_works_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.work_domain(id) ON DELETE RESTRICT;


--
-- Name: planned_works planned_works_resolution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.planned_works
    ADD CONSTRAINT planned_works_resolution_id_fkey FOREIGN KEY (resolution_id) REFERENCES public.ag_resolutions(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reminder_settings reminder_settings_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: repartition_key_lines repartition_key_lines_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repartition_key_lines
    ADD CONSTRAINT repartition_key_lines_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: repartition_key_lines repartition_key_lines_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repartition_key_lines
    ADD CONSTRAINT repartition_key_lines_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.repartition_keys(id) ON DELETE CASCADE;


--
-- Name: repartition_key_lines repartition_key_lines_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repartition_key_lines
    ADD CONSTRAINT repartition_key_lines_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: repartition_keys repartition_keys_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repartition_keys
    ADD CONSTRAINT repartition_keys_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: service_order_events service_order_events_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_order_events
    ADD CONSTRAINT service_order_events_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: service_order_events service_order_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_order_events
    ADD CONSTRAINT service_order_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: service_order_events service_order_events_service_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_order_events
    ADD CONSTRAINT service_order_events_service_order_id_fkey FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id) ON DELETE CASCADE;


--
-- Name: service_orders service_orders_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;


--
-- Name: service_orders service_orders_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: service_orders service_orders_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: service_orders service_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: service_orders service_orders_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- Name: service_orders service_orders_tiers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_tiers_id_fkey FOREIGN KEY (tiers_id) REFERENCES public.tiers(id) ON DELETE RESTRICT;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT supplier_invoice_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_budget_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT supplier_invoice_lines_budget_line_id_fkey FOREIGN KEY (budget_line_id) REFERENCES public.budget_lines(id) ON DELETE SET NULL;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT supplier_invoice_lines_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT supplier_invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE CASCADE;


--
-- Name: supplier_invoice_lines supplier_invoice_lines_repartition_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoice_lines
    ADD CONSTRAINT supplier_invoice_lines_repartition_key_id_fkey FOREIGN KEY (repartition_key_id) REFERENCES public.repartition_keys(id) ON DELETE RESTRICT;


--
-- Name: supplier_invoices supplier_invoices_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: supplier_invoices supplier_invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: supplier_invoices supplier_invoices_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: supplier_invoices supplier_invoices_ledger_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_ledger_tx_id_fkey FOREIGN KEY (ledger_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: supplier_invoices supplier_invoices_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: supplier_invoices supplier_invoices_service_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_service_order_id_fkey FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id) ON DELETE SET NULL;


--
-- Name: supplier_invoices supplier_invoices_tiers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_tiers_id_fkey FOREIGN KEY (tiers_id) REFERENCES public.tiers(id) ON DELETE RESTRICT;


--
-- Name: supplier_payments supplier_payments_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: supplier_payments supplier_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: supplier_payments supplier_payments_ledger_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_ledger_tx_id_fkey FOREIGN KEY (ledger_tx_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: supplier_payments supplier_payments_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id) ON DELETE RESTRICT;


--
-- Name: supplier_payments supplier_payments_supplier_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_invoice_id_fkey FOREIGN KEY (supplier_invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE CASCADE;


--
-- Name: technical_documents technical_documents_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.technical_documents
    ADD CONSTRAINT technical_documents_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: technical_documents technical_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.technical_documents
    ADD CONSTRAINT technical_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: technical_documents technical_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.technical_documents
    ADD CONSTRAINT technical_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE RESTRICT;


--
-- Name: tiers tiers_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiers
    ADD CONSTRAINT tiers_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: treasury_advances treasury_advances_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_advances
    ADD CONSTRAINT treasury_advances_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE RESTRICT;


--
-- Name: treasury_advances treasury_advances_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_advances
    ADD CONSTRAINT treasury_advances_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE RESTRICT;


--
-- Name: wall_comments wall_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_comments
    ADD CONSTRAINT wall_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: wall_comments wall_comments_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_comments
    ADD CONSTRAINT wall_comments_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: wall_comments wall_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_comments
    ADD CONSTRAINT wall_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.wall_comments(id) ON DELETE CASCADE;


--
-- Name: wall_comments wall_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_comments
    ADD CONSTRAINT wall_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.wall_posts(id) ON DELETE CASCADE;


--
-- Name: wall_likes wall_likes_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_likes
    ADD CONSTRAINT wall_likes_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: wall_likes wall_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_likes
    ADD CONSTRAINT wall_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.wall_posts(id) ON DELETE CASCADE;


--
-- Name: wall_likes wall_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_likes
    ADD CONSTRAINT wall_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wall_posts wall_posts_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_posts
    ADD CONSTRAINT wall_posts_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: wall_posts wall_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_posts
    ADD CONSTRAINT wall_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: wall_posts wall_posts_copro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_posts
    ADD CONSTRAINT wall_posts_copro_id_fkey FOREIGN KEY (copro_id) REFERENCES public.copros(id) ON DELETE CASCADE;


--
-- Name: wall_posts wall_posts_pinned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wall_posts
    ADD CONSTRAINT wall_posts_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION check_tiers_domain_ids(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.check_tiers_domain_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_tiers_domain_ids() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION tr_invitation_copro_consistency(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tr_invitation_copro_consistency() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tr_invitation_copro_consistency() TO service_role;


--
-- Name: FUNCTION tr_lot_copro_consistency(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tr_lot_copro_consistency() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tr_lot_copro_consistency() TO service_role;


--
-- Name: FUNCTION tr_lot_owner_copro_consistency(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tr_lot_owner_copro_consistency() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tr_lot_owner_copro_consistency() TO service_role;


--
-- Name: FUNCTION tr_lot_owner_shares_sum(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tr_lot_owner_shares_sum() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tr_lot_owner_shares_sum() TO service_role;


--
-- Name: FUNCTION tr_rkl_copro_consistency(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tr_rkl_copro_consistency() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tr_rkl_copro_consistency() TO service_role;


--
-- Name: TABLE accounting_periods; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.accounting_periods TO anon;
GRANT ALL ON TABLE public.accounting_periods TO authenticated;
GRANT ALL ON TABLE public.accounting_periods TO service_role;


--
-- Name: TABLE accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.accounts TO anon;
GRANT ALL ON TABLE public.accounts TO authenticated;
GRANT ALL ON TABLE public.accounts TO service_role;


--
-- Name: TABLE ag_attendance; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_attendance TO anon;
GRANT ALL ON TABLE public.ag_attendance TO authenticated;
GRANT ALL ON TABLE public.ag_attendance TO service_role;


--
-- Name: TABLE ag_correspondence_vote_details; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_correspondence_vote_details TO anon;
GRANT ALL ON TABLE public.ag_correspondence_vote_details TO authenticated;
GRANT ALL ON TABLE public.ag_correspondence_vote_details TO service_role;


--
-- Name: TABLE ag_correspondence_votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_correspondence_votes TO anon;
GRANT ALL ON TABLE public.ag_correspondence_votes TO authenticated;
GRANT ALL ON TABLE public.ag_correspondence_votes TO service_role;


--
-- Name: TABLE ag_envoi_tracking; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_envoi_tracking TO anon;
GRANT ALL ON TABLE public.ag_envoi_tracking TO authenticated;
GRANT ALL ON TABLE public.ag_envoi_tracking TO service_role;


--
-- Name: TABLE ag_meetings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_meetings TO anon;
GRANT ALL ON TABLE public.ag_meetings TO authenticated;
GRANT ALL ON TABLE public.ag_meetings TO service_role;


--
-- Name: TABLE ag_milestones; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_milestones TO anon;
GRANT ALL ON TABLE public.ag_milestones TO authenticated;
GRANT ALL ON TABLE public.ag_milestones TO service_role;


--
-- Name: TABLE ag_notification_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_notification_events TO anon;
GRANT ALL ON TABLE public.ag_notification_events TO authenticated;
GRANT ALL ON TABLE public.ag_notification_events TO service_role;


--
-- Name: TABLE ag_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_notifications TO anon;
GRANT ALL ON TABLE public.ag_notifications TO authenticated;
GRANT ALL ON TABLE public.ag_notifications TO service_role;


--
-- Name: TABLE ag_pending_actions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_pending_actions TO anon;
GRANT ALL ON TABLE public.ag_pending_actions TO authenticated;
GRANT ALL ON TABLE public.ag_pending_actions TO service_role;


--
-- Name: TABLE ag_resolutions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_resolutions TO anon;
GRANT ALL ON TABLE public.ag_resolutions TO authenticated;
GRANT ALL ON TABLE public.ag_resolutions TO service_role;


--
-- Name: TABLE ag_session_drafts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_session_drafts TO anon;
GRANT ALL ON TABLE public.ag_session_drafts TO authenticated;
GRANT ALL ON TABLE public.ag_session_drafts TO service_role;


--
-- Name: TABLE ag_votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ag_votes TO anon;
GRANT ALL ON TABLE public.ag_votes TO authenticated;
GRANT ALL ON TABLE public.ag_votes TO service_role;


--
-- Name: TABLE alur_transfers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.alur_transfers TO anon;
GRANT ALL ON TABLE public.alur_transfers TO authenticated;
GRANT ALL ON TABLE public.alur_transfers TO service_role;


--
-- Name: TABLE bank_matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bank_matches TO anon;
GRANT ALL ON TABLE public.bank_matches TO authenticated;
GRANT ALL ON TABLE public.bank_matches TO service_role;


--
-- Name: TABLE bank_movements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bank_movements TO anon;
GRANT ALL ON TABLE public.bank_movements TO authenticated;
GRANT ALL ON TABLE public.bank_movements TO service_role;


--
-- Name: TABLE budget_expenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.budget_expenses TO anon;
GRANT ALL ON TABLE public.budget_expenses TO authenticated;
GRANT ALL ON TABLE public.budget_expenses TO service_role;


--
-- Name: TABLE budget_lines; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.budget_lines TO anon;
GRANT ALL ON TABLE public.budget_lines TO authenticated;
GRANT ALL ON TABLE public.budget_lines TO service_role;


--
-- Name: TABLE budget_payment_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.budget_payment_schedules TO anon;
GRANT ALL ON TABLE public.budget_payment_schedules TO authenticated;
GRANT ALL ON TABLE public.budget_payment_schedules TO service_role;


--
-- Name: TABLE budgets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.budgets TO anon;
GRANT ALL ON TABLE public.budgets TO authenticated;
GRANT ALL ON TABLE public.budgets TO service_role;


--
-- Name: TABLE buildings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.buildings TO anon;
GRANT ALL ON TABLE public.buildings TO authenticated;
GRANT ALL ON TABLE public.buildings TO service_role;


--
-- Name: TABLE cabinets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cabinets TO anon;
GRANT ALL ON TABLE public.cabinets TO authenticated;
GRANT ALL ON TABLE public.cabinets TO service_role;


--
-- Name: TABLE call_for_funds; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.call_for_funds TO anon;
GRANT ALL ON TABLE public.call_for_funds TO authenticated;
GRANT ALL ON TABLE public.call_for_funds TO service_role;


--
-- Name: TABLE call_for_funds_lines; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.call_for_funds_lines TO anon;
GRANT ALL ON TABLE public.call_for_funds_lines TO authenticated;
GRANT ALL ON TABLE public.call_for_funds_lines TO service_role;


--
-- Name: TABLE collective_loan_shares; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.collective_loan_shares TO anon;
GRANT ALL ON TABLE public.collective_loan_shares TO authenticated;
GRANT ALL ON TABLE public.collective_loan_shares TO service_role;


--
-- Name: TABLE collective_loans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.collective_loans TO anon;
GRANT ALL ON TABLE public.collective_loans TO authenticated;
GRANT ALL ON TABLE public.collective_loans TO service_role;


--
-- Name: TABLE contracts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contracts TO anon;
GRANT ALL ON TABLE public.contracts TO authenticated;
GRANT ALL ON TABLE public.contracts TO service_role;


--
-- Name: TABLE conversation_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversation_members TO anon;
GRANT ALL ON TABLE public.conversation_members TO authenticated;
GRANT ALL ON TABLE public.conversation_members TO service_role;


--
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;


--
-- Name: TABLE copro_invitations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.copro_invitations TO anon;
GRANT ALL ON TABLE public.copro_invitations TO authenticated;
GRANT ALL ON TABLE public.copro_invitations TO service_role;


--
-- Name: TABLE coproprietaires; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.coproprietaires TO anon;
GRANT ALL ON TABLE public.coproprietaires TO authenticated;
GRANT ALL ON TABLE public.coproprietaires TO service_role;


--
-- Name: TABLE copros; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.copros TO anon;
GRANT ALL ON TABLE public.copros TO authenticated;
GRANT ALL ON TABLE public.copros TO service_role;


--
-- Name: TABLE council_decisions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.council_decisions TO anon;
GRANT ALL ON TABLE public.council_decisions TO authenticated;
GRANT ALL ON TABLE public.council_decisions TO service_role;


--
-- Name: TABLE council_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.council_documents TO anon;
GRANT ALL ON TABLE public.council_documents TO authenticated;
GRANT ALL ON TABLE public.council_documents TO service_role;


--
-- Name: TABLE council_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.council_members TO anon;
GRANT ALL ON TABLE public.council_members TO authenticated;
GRANT ALL ON TABLE public.council_members TO service_role;


--
-- Name: TABLE council_votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.council_votes TO anon;
GRANT ALL ON TABLE public.council_votes TO authenticated;
GRANT ALL ON TABLE public.council_votes TO service_role;


--
-- Name: TABLE document_folders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_folders TO anon;
GRANT ALL ON TABLE public.document_folders TO authenticated;
GRANT ALL ON TABLE public.document_folders TO service_role;


--
-- Name: TABLE document_relations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_relations TO anon;
GRANT ALL ON TABLE public.document_relations TO authenticated;
GRANT ALL ON TABLE public.document_relations TO service_role;


--
-- Name: TABLE document_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_versions TO anon;
GRANT ALL ON TABLE public.document_versions TO authenticated;
GRANT ALL ON TABLE public.document_versions TO service_role;


--
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documents TO anon;
GRANT ALL ON TABLE public.documents TO authenticated;
GRANT ALL ON TABLE public.documents TO service_role;


--
-- Name: TABLE email_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.email_templates TO anon;
GRANT ALL ON TABLE public.email_templates TO authenticated;
GRANT ALL ON TABLE public.email_templates TO service_role;


--
-- Name: TABLE etat_date_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.etat_date_snapshots TO anon;
GRANT ALL ON TABLE public.etat_date_snapshots TO authenticated;
GRANT ALL ON TABLE public.etat_date_snapshots TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


--
-- Name: TABLE insurance_policies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.insurance_policies TO anon;
GRANT ALL ON TABLE public.insurance_policies TO authenticated;
GRANT ALL ON TABLE public.insurance_policies TO service_role;


--
-- Name: TABLE ledger_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ledger_entries TO anon;
GRANT ALL ON TABLE public.ledger_entries TO authenticated;
GRANT ALL ON TABLE public.ledger_entries TO service_role;


--
-- Name: TABLE ledger_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ledger_transactions TO anon;
GRANT ALL ON TABLE public.ledger_transactions TO authenticated;
GRANT ALL ON TABLE public.ledger_transactions TO service_role;


--
-- Name: TABLE legal_proceedings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.legal_proceedings TO anon;
GRANT ALL ON TABLE public.legal_proceedings TO authenticated;
GRANT ALL ON TABLE public.legal_proceedings TO service_role;


--
-- Name: TABLE logbook_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.logbook_entries TO anon;
GRANT ALL ON TABLE public.logbook_entries TO authenticated;
GRANT ALL ON TABLE public.logbook_entries TO service_role;


--
-- Name: TABLE lot_owners; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lot_owners TO anon;
GRANT ALL ON TABLE public.lot_owners TO authenticated;
GRANT ALL ON TABLE public.lot_owners TO service_role;


--
-- Name: TABLE lots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lots TO anon;
GRANT ALL ON TABLE public.lots TO authenticated;
GRANT ALL ON TABLE public.lots TO service_role;


--
-- Name: TABLE mails; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mails TO anon;
GRANT ALL ON TABLE public.mails TO authenticated;
GRANT ALL ON TABLE public.mails TO service_role;


--
-- Name: TABLE memberships; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.memberships TO anon;
GRANT ALL ON TABLE public.memberships TO authenticated;
GRANT ALL ON TABLE public.memberships TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- Name: TABLE mutation_oppositions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mutation_oppositions TO anon;
GRANT ALL ON TABLE public.mutation_oppositions TO authenticated;
GRANT ALL ON TABLE public.mutation_oppositions TO service_role;


--
-- Name: TABLE mutation_steps; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mutation_steps TO anon;
GRANT ALL ON TABLE public.mutation_steps TO authenticated;
GRANT ALL ON TABLE public.mutation_steps TO service_role;


--
-- Name: TABLE mutations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mutations TO anon;
GRANT ALL ON TABLE public.mutations TO authenticated;
GRANT ALL ON TABLE public.mutations TO service_role;


--
-- Name: TABLE payment_allocations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_allocations TO anon;
GRANT ALL ON TABLE public.payment_allocations TO authenticated;
GRANT ALL ON TABLE public.payment_allocations TO service_role;


--
-- Name: TABLE payment_reminder_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_reminder_rules TO anon;
GRANT ALL ON TABLE public.payment_reminder_rules TO authenticated;
GRANT ALL ON TABLE public.payment_reminder_rules TO service_role;


--
-- Name: TABLE payment_reminders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_reminders TO anon;
GRANT ALL ON TABLE public.payment_reminders TO authenticated;
GRANT ALL ON TABLE public.payment_reminders TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: TABLE period_cutoff_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.period_cutoff_items TO anon;
GRANT ALL ON TABLE public.period_cutoff_items TO authenticated;
GRANT ALL ON TABLE public.period_cutoff_items TO service_role;


--
-- Name: TABLE planned_works; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.planned_works TO anon;
GRANT ALL ON TABLE public.planned_works TO authenticated;
GRANT ALL ON TABLE public.planned_works TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE reminder_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reminder_settings TO anon;
GRANT ALL ON TABLE public.reminder_settings TO authenticated;
GRANT ALL ON TABLE public.reminder_settings TO service_role;


--
-- Name: TABLE repartition_key_lines; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.repartition_key_lines TO anon;
GRANT ALL ON TABLE public.repartition_key_lines TO authenticated;
GRANT ALL ON TABLE public.repartition_key_lines TO service_role;


--
-- Name: TABLE repartition_keys; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.repartition_keys TO anon;
GRANT ALL ON TABLE public.repartition_keys TO authenticated;
GRANT ALL ON TABLE public.repartition_keys TO service_role;


--
-- Name: TABLE service_order_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.service_order_events TO anon;
GRANT ALL ON TABLE public.service_order_events TO authenticated;
GRANT ALL ON TABLE public.service_order_events TO service_role;


--
-- Name: TABLE service_orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.service_orders TO anon;
GRANT ALL ON TABLE public.service_orders TO authenticated;
GRANT ALL ON TABLE public.service_orders TO service_role;


--
-- Name: TABLE supplier_invoice_lines; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.supplier_invoice_lines TO anon;
GRANT ALL ON TABLE public.supplier_invoice_lines TO authenticated;
GRANT ALL ON TABLE public.supplier_invoice_lines TO service_role;


--
-- Name: TABLE supplier_invoices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.supplier_invoices TO anon;
GRANT ALL ON TABLE public.supplier_invoices TO authenticated;
GRANT ALL ON TABLE public.supplier_invoices TO service_role;


--
-- Name: TABLE supplier_payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.supplier_payments TO anon;
GRANT ALL ON TABLE public.supplier_payments TO authenticated;
GRANT ALL ON TABLE public.supplier_payments TO service_role;


--
-- Name: TABLE technical_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.technical_documents TO anon;
GRANT ALL ON TABLE public.technical_documents TO authenticated;
GRANT ALL ON TABLE public.technical_documents TO service_role;


--
-- Name: TABLE tiers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tiers TO anon;
GRANT ALL ON TABLE public.tiers TO authenticated;
GRANT ALL ON TABLE public.tiers TO service_role;


--
-- Name: TABLE tiers_directory; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tiers_directory TO anon;
GRANT ALL ON TABLE public.tiers_directory TO authenticated;
GRANT ALL ON TABLE public.tiers_directory TO service_role;


--
-- Name: TABLE treasury_advances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.treasury_advances TO anon;
GRANT ALL ON TABLE public.treasury_advances TO authenticated;
GRANT ALL ON TABLE public.treasury_advances TO service_role;


--
-- Name: TABLE wall_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.wall_comments TO anon;
GRANT ALL ON TABLE public.wall_comments TO authenticated;
GRANT ALL ON TABLE public.wall_comments TO service_role;


--
-- Name: TABLE wall_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.wall_likes TO anon;
GRANT ALL ON TABLE public.wall_likes TO authenticated;
GRANT ALL ON TABLE public.wall_likes TO service_role;


--
-- Name: TABLE wall_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.wall_posts TO anon;
GRANT ALL ON TABLE public.wall_posts TO authenticated;
GRANT ALL ON TABLE public.wall_posts TO service_role;


--
-- Name: TABLE work_domain; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.work_domain TO anon;
GRANT ALL ON TABLE public.work_domain TO authenticated;
GRANT ALL ON TABLE public.work_domain TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict XiuDCBpdhAEj43eOYIwHJqh9ubIYGSwWASSZwF4JvhUKKYishFE6TZPJpSbnhJf

