-- 0003_enums_domaines.sql — enums 01/03/04/05/06/07/08 (ENUMS §1/§4/§6)
-- Source : .planning/db-cible/ENUMS.md
-- Exclus (dans 0002_enums_finance.sql) : account_type, ledger_source_type, ledger_tx_status,
--   ledger_direction, account_receivable_nature, cutoff_kind, treasury_advance_type,
--   collective_loan_status, period_status, payment_method, payment_status, bank_movement_status,
--   bank_match_target_type, expense_status, budget_type, budget_status, call_for_funds_status,
--   call_line_status, supplier_invoice_status, transfer_destination, payment_phase_status
-- Abandonnés (ne PAS créer) : tiers_type, vote_direction, council_vote_choice,
--   mail_delivery_status, mail_campaign_status, mail_recipient_type, ag_notification_type,
--   urgency_level, work_priority, provider_domain, planned_work_type, contract_type,
--   provider_category, document_confidentiality
-- work_domain : TABLE de référence (créée en 0004), pas un enum

-- ── Domaine 01 — Copros / lots / personnes ──────────────────────────────────

-- §1.4 — membership_role réduit 5→3 (admin→platform_admin A13/multi-cabinet, membre_cs supprimé)
create type membership_role as enum ('gestionnaire','coproprietaire','platform_admin');

-- §4 conservés
create type lot_type as enum ('appartement','studio','commerce','bureau','cave','parking','garage','local_technique','autre');
create type repartition_basis as enum ('tantiemes','surface','custom');
create type coverage_mode as enum ('all_lots','subset');
create type repartition_category as enum ('general','special','alur');

-- §6.6 — NOUVEAU : statut d'invitation portail copropriétaire (01 §1.10)
create type invitation_status as enum ('pending','accepted','revoked','expired');

-- ── Transverses fusionnés / nouveaux ────────────────────────────────────────

-- §1.1 — vote_choice : fusion vote_direction + council_vote_choice
create type vote_choice as enum ('for','against','abstention');

-- §4 conservé — canal du vote (orthogonal au choix)
create type vote_source as enum ('live','correspondence');

-- §1.5 — priority_level : fusion urgency_level + work_priority
create type priority_level as enum ('low','normal','medium','high','critical');

-- §1.2 — delivery_status : fusion delivery_status + mail_delivery_status (surensemble)
create type delivery_status as enum ('pending','queued','sent','delivered','opened','clicked','bounced','failed','cancelled');

-- §4 conservés
create type notification_channel as enum ('email','registered_email','postal','registered_postal','hand_delivery');
create type content_visibility as enum ('all_members','council_only','managers_only');
create type attendance_type as enum ('present','proxy','correspondence');

-- ── Domaine 04 — AG / gouvernance ───────────────────────────────────────────

-- §4 conservés
create type ag_meeting_type as enum ('ordinary','extraordinary','mixed');

-- §1.6 — ag_status : +archived (état terminal post-finalized, requis par archive_ag)
create type ag_status as enum ('draft','convoked','in_progress','session_active','closed','pv_generated','pv_signed','pv_sent','finalized','archived');

-- §4 conservés
create type ag_draft_type as enum ('attendance','resolutions','votes','pv','envoi','milestones','other');
create type majority_type as enum ('art24','art25','art25_1','art26','art26_1','unanimity');
create type resolution_type as enum ('budget','accounts','works','contract','council','syndic','other');

-- §1.7 — resolution_status (nettoyé : ne porte plus le choix de vote)
create type resolution_status as enum ('draft','pending','voting','voted','approved','rejected','adjourned','withdrawn');

-- §6.2 — NOUVEAU : pivot d'auto-population AG (ex-text libre ag_resolutions/ag_pending_actions.action_type)
create type ag_action_type as enum (
  'CREATE_BUDGET','APPROVE_ACCOUNTS','SCHEDULE_BUDGET_PAYMENTS',
  'CREATE_ALUR_FUND','SCHEDULE_ALUR_PAYMENTS','CREATE_WORK_BUDGET',
  'CREATE_EXCEPTIONAL_CALL','ELECT_COUNCIL','APPOINT_SYNDIC',
  'MANAGE_CONTRACT','GRANT_QUITUS','DESIGNATE_BUREAU'
);

-- §6.2 — NOUVEAU : cycle de vie formulaire de vote par correspondance
create type correspondence_form_status as enum ('pending','validated','integrated');

-- §4 conservés
create type council_role as enum ('president','secretary','treasurer','member','observer');
create type council_decision_status as enum ('draft','submitted','approved','rejected','archived');
create type council_doc_link_type as enum ('contract','service_order','ag','invoice','budget','other');

-- ── Domaine 03 — Budgets / relances ─────────────────────────────────────────

-- §4 conservé
create type reminder_status as enum ('pending','sent','failed','stale','skipped');

-- ── Domaine 05 — Mutations / état daté ──────────────────────────────────────

-- §6.3 — NOUVEAUX (ex-CHECK sur colonnes text)
create type mutation_status as enum ('draft','pre_etat_generated','etat_generated','signed','validated','cancelled');
create type mutation_type as enum ('sale','donation','succession','other');
create type mutation_step_key as enum ('demande','pre_etat_date','etat_date','envoi_notaire','signature_acte','cloture_compte');
create type mutation_step_status as enum ('pending','in_progress','completed','skipped');
create type etat_date_type as enum ('pre','final');
create type opposition_status as enum ('pending','opposed','paid','released','contested');
create type legal_proceeding_nature as enum ('litigation','recovery','other');
create type legal_proceeding_status as enum ('pending','in_progress','closed','won','lost');

-- ── Domaine 06 — Documents / GED ─────────────────────────────────────────────

-- §3.1 — document_category dédupliqué 20→17 (−correspondance / −carnet_entretien / −fiche_synthetique)
create type document_category as enum (
  'pv_ag','convocation','reglement','contrat','facture','devis',
  'diagnostic','assurance','budget','appel_fonds','releve_charges',
  'etat_date','courrier','photo','plan','ordre_service','autre'
);

-- §4 conservés
create type document_status as enum ('active','archived','deleted');
create type document_source as enum ('manual','ag','finance','maintenance','mutation','system');

-- §6.5 — document_visibility : NOUVEAU (A4, remplace document_confidentiality supprimé)
create type document_visibility as enum ('gestionnaire_seul','conseil','tous_coproprietaires');

-- §6.5 — NOUVEAUX (GED)
create type document_entity_type as enum (
  'ag','resolution','service_order','contract','supplier_invoice',
  'mutation','budget','lot','coproprietaire','council','event','other'
);
create type document_relation_kind as enum ('related','annexe','source','justificatif');

-- §2.2 — technical_doc_type : CONSERVÉ (typologie réglementaire fermée)
create type technical_doc_type as enum (
  'dta','dpe_collectif','diagnostic_plomb','diagnostic_electricite','diagnostic_gaz',
  'carnet_entretien','controle_ascenseur','controle_chaufferie','controle_incendie',
  'controle_jeux','garantie_decennale','garantie_biennale','plan_copropriete',
  'reglement_copropriete','etat_descriptif','ppt','dtg','audit_energetique','autre'
);

-- ── Domaine 07 — Maintenance / tiers ────────────────────────────────────────

-- §6.4 — tiers_category : remplace provider_category (valeur coproflex retirée)
create type tiers_category as enum ('syndic','copropriete','externe');

-- §6.4 — logbook_status : NOUVEAU (remplace status text + CHECK)
create type logbook_status as enum ('planifiee','en_cours','terminee');

-- §4 conservés
create type contract_status as enum ('draft','active','to_renew','expired','terminated');
create type service_order_type as enum ('classique','urgent','contrat','art18');
create type service_order_origin as enum ('syndic','conseil','coproprietaire','contrat','autre');
create type service_order_status as enum ('draft','sent','awaiting_provider','scheduled','in_progress','completed','closed','cancelled','refused');
create type service_order_event_type as enum ('created','sent','status_change','comment','document','cancelled');
create type intervention_category as enum ('courante','urgente','reglementaire','travaux');
create type intervention_frequency as enum ('once','weekly','monthly','quarterly','biannual','annual');
create type logbook_entry_type as enum ('intervention','controle','incident','maintenance','autre');
create type insurance_sub_type as enum ('multirisque','dommages_ouvrage','rc','protection_juridique','autre');
create type planned_work_status as enum ('identified','voted','scheduled','in_progress','completed','cancelled');

-- ── Domaine 08 — Communication ───────────────────────────────────────────────

-- §6.7 — message_type : NOUVEAU (remplace text libre messages.message_type)
create type message_type as enum ('text','file','system');

-- §4 conservés
create type wall_post_category as enum ('information','urgent','question','event','other');
create type event_type as enum ('ag','reunion_cs','travaux','intervention','fete','autre');
