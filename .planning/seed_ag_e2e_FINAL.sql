-- =====================================================================
-- SEED E2E AG — copro 5d3ed408-d20a-4304-8976-47798c1f85a4
-- A coller dans un .sql et exécuter via:
--   docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres < seed_ag_e2e.sql
--
-- ⚠️ NE PAS SCINDER L'EXÉCUTION. Le script DOIT être joué d'un seul bloc
--    (psql < seed_ag_e2e.sql). Le bypass service_role est posé en
--    transaction-local : exécuté bloc par bloc, is_service_call() repasse
--    à false et TOUTES les RPC (create_ag, start_ag, cast_vote,
--    finalize_and_activate_ag...) lèvent 42501.
--
-- ⚠️ IDEMPOTENCE LIMITÉE — À LIRE AVANT TOUT RE-RUN.
--    Le 1er run pose un appel de fonds ALUR POSTÉ (D450-5/C105). Le grand
--    livre posté est IMMUABLE par conception : le trigger
--    tr_ledger_entry_immutable lève 23514 sur toute suppression d'une
--    écriture postée dont source_type='call_for_funds' (non exempté par
--    is_ledger_regen_exempt, qui ne couvre que opening_balance/closing/
--    opening_onboarding/result_allocation). Il n'existe AUCUNE RPC de
--    contre-passation. On ne peut donc PAS rejouer ce seed « à chaud » sur
--    une copro qui porte déjà un appel ALUR [E2E] posté sans corrompre le
--    solde du compte 105.
--
--    => Ce script s'exécute sur une copro VIERGE (ou après un reset DB).
--       La section 1 purge proprement les artefacts NON comptables d'un run
--       précédent (budgets draft, AG, conseil) et, si elle détecte un appel
--       ALUR [E2E] DÉJÀ POSTÉ, elle AVORTE avec un message explicite plutôt
--       que de tenter une suppression interdite (échec silencieux proscrit).
-- =====================================================================
\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------
-- 0) BYPASS garde rôle : simuler le service_role (transaction-local).
--    Sans cela, TOUTES les RPC (create_ag, start_ag, cast_vote,
--    finalize_and_activate_ag...) lèvent 42501 même en superuser postgres.
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
begin
  if not public.is_service_call() then
    raise exception 'bypass service_role NON actif : is_service_call()=false';
  end if;
  raise notice '[0] bypass service_role actif (is_service_call=true)';
end $$;

-- =====================================================================
-- 1) NETTOYAGE / PRÉCONDITION des artefacts '[E2E]' d'un run précédent
--    Ordre corrigé : on supprime TOUJOURS l'enfant qui REFERENCE avant
--    le parent référencé. Les FK call_for_funds->ledger_transactions et
--    alur_transfers->ledger_transactions sont ON DELETE RESTRICT.
-- =====================================================================
do $$
declare
  c_copro constant uuid := '5d3ed408-d20a-4304-8976-47798c1f85a4';
  v_n          int;
  v_posted_cff int;
begin
  -- 1a) GARDE-FOU IMMUTABILITÉ : un appel ALUR [E2E] DÉJÀ POSTÉ ne peut pas
  --     être purgé (GL immuable, pas de contre-passation). On avorte clairement.
  select count(*) into v_posted_cff
  from public.call_for_funds cff
  join public.budgets b on b.id = cff.budget_id
  join public.ledger_transactions t on t.id = cff.ledger_tx_id
  where b.copro_id = c_copro
    and b.name like '[E2E]%'
    and t.status = 'posted';

  if v_posted_cff > 0 then
    raise exception
      'Re-run impossible : % appel(s) de fonds [E2E] déjà POSTÉ(s) (grand livre immuable, '
      'aucune contre-passation disponible). Rejouez ce seed sur une copro VIERGE ou après un reset DB.',
      v_posted_cff
      using errcode = '23514';
  end if;

  -- 1b) call_for_funds [E2E] NON postés (ex. run interrompu avant posting) :
  --     d'abord neutraliser le statut pour satisfaire le trigger différé
  --     trg_cff_ledger_required (tolère draft/cancelled sans ledger_tx_id),
  --     puis supprimer l'enfant (CFF) qui référence la tx en RESTRICT.
  update public.call_for_funds cff
     set status = 'cancelled'
  from public.budgets b
  where cff.budget_id = b.id
    and b.copro_id = c_copro and b.name like '[E2E]%'
    and cff.status not in ('draft', 'cancelled');
  get diagnostics v_n = row_count; raise notice '[1b] call_for_funds E2E annulés (pré-purge): %', v_n;

  -- Mémoriser les tx liées AVANT de supprimer les CFF (sinon on perd le lien).
  create temp table _e2e_cff_tx on commit drop as
    select cff.ledger_tx_id as tx_id
    from public.call_for_funds cff
    join public.budgets b on b.id = cff.budget_id
    where b.copro_id = c_copro and b.name like '[E2E]%'
      and cff.ledger_tx_id is not null;

  delete from public.call_for_funds cff
  using public.budgets b
  where cff.budget_id = b.id and b.copro_id = c_copro and b.name like '[E2E]%';
  get diagnostics v_n = row_count; raise notice '[1b] call_for_funds E2E supprimés: %', v_n;

  -- Une fois les CFF supprimés, la FK RESTRICT est levée : on peut purger les tx
  -- (cascade -> ledger_entries). Le garde-fou 1a a déjà écarté les tx POSTÉES :
  -- il ne reste ici que des tx non postées (immutabilité non déclenchée).
  delete from public.ledger_transactions t
  where t.id in (select tx_id from _e2e_cff_tx);
  get diagnostics v_n = row_count; raise notice '[1b] ledger_transactions (appels E2E non postés) supprimées: %', v_n;

  -- 1c) Affectations ALUR (transfer) éventuelles : enfant (alur_transfers,
  --     qui référence la tx en RESTRICT) AVANT le parent (ledger_transactions).
  --     Mémoriser les tx référencées avant suppression.
  create temp table _e2e_transfer_tx on commit drop as
    select at.ledger_tx_id as tx_id from public.alur_transfers at
      join public.budgets b on b.id = at.budget_id
      where b.copro_id = c_copro and b.name like '[E2E]%' and at.ledger_tx_id is not null
    union
    select at.cash_ledger_tx_id from public.alur_transfers at
      join public.budgets b on b.id = at.budget_id
      where b.copro_id = c_copro and b.name like '[E2E]%' and at.cash_ledger_tx_id is not null;

  -- Garde-fou symétrique : une affectation ALUR postée serait elle aussi immuable.
  if exists (
    select 1 from _e2e_transfer_tx tt
    join public.ledger_transactions t on t.id = tt.tx_id
    where t.status = 'posted'
  ) then
    raise exception
      'Re-run impossible : affectation(s) ALUR [E2E] déjà postée(s) (grand livre immuable). '
      'Rejouez sur une copro vierge / après reset DB.'
      using errcode = '23514';
  end if;

  delete from public.alur_transfers at
  using public.budgets b
  where at.budget_id = b.id and b.copro_id = c_copro and b.name like '[E2E]%';

  delete from public.ledger_transactions t
  where t.id in (select tx_id from _e2e_transfer_tx);

  -- 1d) Budgets [E2E] (cascade -> budget_lines)
  delete from public.budgets b
  where b.copro_id = c_copro and b.name like '[E2E]%';
  get diagnostics v_n = row_count; raise notice '[1d] budgets E2E supprimés: %', v_n;

  -- 1e) AG [E2E] (cascade -> ag_resolutions, ag_votes, ag_attendance, ag_pending_actions)
  --     On supprime le conseil AVANT les AG pour pouvoir tracer les élus E2E.
  --     Bornage de la purge du conseil aux SEULS copropriétaires élus par les
  --     résolutions ELECT_COUNCIL des AG [E2E] (pas un filtre par date, trop large
  --     et fragile : il détruirait un conseil légitime élu le même jour et
  --     laisserait des lignes mortes si le re-run a lieu un autre jour).
  delete from public.council_members cm
  where cm.copro_id = c_copro
    and cm.coproprietaire_id in (
      select (elt ->> 'coproprietaire_id')::uuid
      from public.ag_meetings m
      join public.ag_resolutions r on r.ag_id = m.id and r.action_type = 'ELECT_COUNCIL'
      cross join lateral jsonb_array_elements(
        coalesce(r.variables -> 'council_members', '[]'::jsonb)) as elt
      where m.copro_id = c_copro and m.title like '[E2E]%'
        and (elt ->> 'coproprietaire_id') is not null
    );
  get diagnostics v_n = row_count; raise notice '[1e] council_members (élus E2E) supprimés: %', v_n;

  -- 1f) Suppression des AG [E2E] elles-mêmes.
  delete from public.ag_meetings m
  where m.copro_id = c_copro and m.title like '[E2E]%';
  get diagnostics v_n = row_count; raise notice '[1f] ag_meetings E2E supprimées: %', v_n;
end $$;

-- =====================================================================
-- 2) AG n°1 — '[E2E] AG ordinaire 2026' : PASSÉE, votée, ACTIVÉE
-- =====================================================================
do $$
declare
  c_copro      constant uuid := '5d3ed408-d20a-4304-8976-47798c1f85a4';
  c_period     constant uuid := 'ce8dbd4b-1031-46e6-88fe-fc626fce04b9'; -- Exercice 2026 (open)
  c_key_gen    constant uuid := 'f4f21be6-6a73-425a-ae05-7138271ec938'; -- Clé générale (complète)
  -- Comptes cohérents pour la lisibilité analytique des budgets.
  -- NB : l'account_id de la budget_line est NEUTRE pour l'imputation GL des
  --      appels (post_budget_call_for_funds dérive la contrepartie du
  --      budget_type : alur -> C105 / works|current -> C701/702). On le rend
  --      malgré tout cohérent pour ne pas polluer une lecture par compte.
  c_acc_105    constant uuid := '0df31d64-d489-413d-a200-176a2b05f835'; -- 105 Fonds travaux ALUR (equity)
  c_acc_672    constant uuid := '07577ad1-6255-4247-a686-6a1eba4bf624'; -- 672 Travaux (expense)
  c_alice      constant uuid := 'f98dbe1c-d49b-4002-be8b-7ca4a2b8d3d5';
  c_bruno      constant uuid := '02461acc-da9e-46f3-afd6-fadec973671e';
  c_chloe      constant uuid := 'f0216354-25e0-496e-aa30-dd956a1ca374';
  c_lot_a101   constant uuid := '13e7aee8-dfe8-482d-a1e6-76cc358af155';
  c_lot_a102   constant uuid := '96f5fbad-cb8d-4a12-add2-4064a342ce95';
  c_lot_a201   constant uuid := 'c06f6583-da26-4fc9-a543-32302dd5916d';
  c_lot_a202   constant uuid := 'cabed985-09d6-497b-a927-e9e097048b28';

  v_ag1        uuid;
  v_b_works    uuid;
  v_b_alur     uuid;
  v_res5       uuid;  -- CREATE_ALUR_FUND
  v_res7       uuid;  -- ELECT_COUNCIL
  v_res8       uuid;  -- CREATE_WORK_BUDGET (ajout manuel)
  v_fin        jsonb;
begin
  -- a) Création AG + 7 résolutions standard (status 'draft')
  v_ag1 := public.create_ag_with_standard_resolutions(
             c_copro,
             '[E2E] AG ordinaire 2026',
             '2026-06-15T18:00:00+02'::timestamptz,
             'ordinary'::ag_meeting_type,
             'Salle commune');
  raise notice '[2a] AG n1 créée: %', v_ag1;

  -- b) Budgets liés (créés AVANT activation), en 'draft'
  --    Budget TRAVAUX (validate seulement, ne poste rien)
  insert into public.budgets(copro_id, period_id, budget_type, status, version, name, source_ag_id)
  values (c_copro, c_period, 'works', 'draft', 1, '[E2E] Budget travaux 2026', v_ag1)
  returning id into v_b_works;
  insert into public.budget_lines(budget_id, copro_id, account_id, repartition_key_id, label, amount, code, sort_order)
  values (v_b_works, c_copro, c_acc_672, c_key_gen, 'Ravalement façade', 12000.00, '672', 1);
  raise notice '[2b] Budget travaux créé (draft): % (12000)', v_b_works;

  --    Budget ALUR (cotisation art.14-2 -> appelée D450-5/C105)
  insert into public.budgets(copro_id, period_id, budget_type, status, version, name, source_ag_id)
  values (c_copro, c_period, 'alur', 'draft', 1, '[E2E] Cotisation ALUR 2026', v_ag1)
  returning id into v_b_alur;
  insert into public.budget_lines(budget_id, copro_id, account_id, repartition_key_id, label, amount, code, sort_order)
  values (v_b_alur, c_copro, c_acc_105, c_key_gen, 'Cotisation fonds travaux ALUR', 2400.00, '105', 1);
  raise notice '[2b] Budget ALUR créé (draft): % (2400)', v_b_alur;

  -- c) Récupérer les ids des résolutions ciblées + les aiguiller
  select id into v_res5 from public.ag_resolutions where ag_id = v_ag1 and resolution_number = 5; -- CREATE_ALUR_FUND
  select id into v_res7 from public.ag_resolutions where ag_id = v_ag1 and resolution_number = 7; -- ELECT_COUNCIL

  update public.ag_resolutions
     set variables = jsonb_build_object('mode','UNIQUE','issue_date','2026-07-01','due_date','2026-07-31')
   where id = v_res5;

  update public.ag_resolutions
     set variables = jsonb_build_object('council_members', jsonb_build_array(
            jsonb_build_object('coproprietaire_id', c_alice, 'role', 'president'),
            jsonb_build_object('coproprietaire_id', c_bruno, 'role', 'member'),
            jsonb_build_object('coproprietaire_id', c_chloe, 'role', 'member')))
   where id = v_res7;

  -- Résolution #8 CREATE_WORK_BUDGET (l'ordinaire standard ne crée pas de vote travaux)
  insert into public.ag_resolutions(
      ag_id, copro_id, resolution_number, title, description,
      resolution_type, majority_type, action_type,
      linked_work_budget_id, variables, status)
  values (
      v_ag1, c_copro, 8,
      '[E2E] Vote du budget travaux (ravalement)',
      'Approbation du budget travaux exceptionnels',
      'works', 'art25', 'CREATE_WORK_BUDGET',
      v_b_works, jsonb_build_object('amount', 12000), 'draft')
  returning id into v_res8;
  raise notice '[2c] Résolutions aiguillées (#5 ALUR, #7 conseil, #8 travaux=%).', v_res8;

  -- NB métier : les résolutions #2 APPROVE_ACCOUNTS, #3 GRANT_QUITUS,
  --   #4 CREATE_BUDGET (budget prévisionnel courant) et #6 APPOINT_SYNDIC sont
  --   VOLONTAIREMENT laissées sans vote -> calculate_resolution_result les
  --   passe 'rejected' (for=against=0). C'est conforme à l'objectif de ce
  --   scénario (démontrer la chaîne ALUR + conseil + budget travaux). En
  --   particulier #4 reste rejetée à dessein : le budget courant pré-existant
  --   (b0141c40) demeure le seul 'validated' et on évite toute collision
  --   uq_budget_one_validated. Si une démo « AG ordinaire complète » est un
  --   jour requise, faire voter #4 en la liant via linked_budget_id.

  -- d) Ouverture de séance -> status 'session_active'
  perform public.start_ag(v_ag1, 'Ouverture de séance (E2E)');
  raise notice '[2d] AG n1 en session_active.';

  -- e) Présences (lot_ids -> tantiemes dérivés par trigger)
  insert into public.ag_attendance(ag_id, copro_id, coproprietaire_id, lot_ids, presence_type)
  values (v_ag1, c_copro, c_alice, array[c_lot_a101, c_lot_a102], 'present'),
         (v_ag1, c_copro, c_bruno, array[c_lot_a201],            'present'),
         (v_ag1, c_copro, c_chloe, array[c_lot_a202],            'present');
  raise notice '[2e] 3 présences enregistrées.';

  -- f) Votes calibrés POUR PASSER (art25 -> >500 tantiemes ; ici 1000/1000)
  --    res #1 (bureau) votée pour réalisme (sans effet, exclue par prepare)
  perform public.cast_vote((select id from public.ag_resolutions where ag_id=v_ag1 and resolution_number=1),
                            c_alice, 'for', 'live');
  perform public.cast_vote((select id from public.ag_resolutions where ag_id=v_ag1 and resolution_number=1),
                            c_bruno, 'for', 'live');
  perform public.cast_vote((select id from public.ag_resolutions where ag_id=v_ag1 and resolution_number=1),
                            c_chloe, 'for', 'live');
  -- res #5 ALUR (art25)
  perform public.cast_vote(v_res5, c_alice, 'for', 'live');
  perform public.cast_vote(v_res5, c_bruno, 'for', 'live');
  perform public.cast_vote(v_res5, c_chloe, 'for', 'live');
  -- res #7 conseil (art25)
  perform public.cast_vote(v_res7, c_alice, 'for', 'live');
  perform public.cast_vote(v_res7, c_bruno, 'for', 'live');
  perform public.cast_vote(v_res7, c_chloe, 'for', 'live');
  -- res #8 travaux (art25)
  perform public.cast_vote(v_res8, c_alice, 'for', 'live');
  perform public.cast_vote(v_res8, c_bruno, 'for', 'live');
  perform public.cast_vote(v_res8, c_chloe, 'for', 'live');
  raise notice '[2f] Votes posés (res 1,5,7,8 = 1000/1000). Res 2,3,4,6 NON votées -> rejected (volontaire).';

  -- g) Figer + préparer + activer (un seul appel)
  v_fin := public.finalize_and_activate_ag(v_ag1, true);
  raise notice '[2g] finalize_and_activate_ag: %', v_fin;

  -- h) Clôture de séance : AG#1 PASSÉE -> status 'closed' (séance levée).
  --    finalize_and_activate_ag NE change PAS le statut (l'AG reste session_active) ;
  --    close_ag fige les résolutions restantes (ici aucune : déjà approved/rejected)
  --    et passe l'AG en 'closed' avec closed_at / session_ended_at renseignés.
  perform public.close_ag(v_ag1, '[E2E] Séance levée — PV à suivre');
  raise notice '[2h] AG n1 clôturée (close_ag -> status closed).';
end $$;

-- =====================================================================
-- 3) AG n°2 — '[E2E] AG extraordinaire (à tenir)' : EN COURS, sans vote
-- =====================================================================
do $$
declare
  c_copro    constant uuid := '5d3ed408-d20a-4304-8976-47798c1f85a4';
  c_alice    constant uuid := 'f98dbe1c-d49b-4002-be8b-7ca4a2b8d3d5';
  c_bruno    constant uuid := '02461acc-da9e-46f3-afd6-fadec973671e';
  c_chloe    constant uuid := 'f0216354-25e0-496e-aa30-dd956a1ca374';
  c_lot_a101 constant uuid := '13e7aee8-dfe8-482d-a1e6-76cc358af155';
  c_lot_a102 constant uuid := '96f5fbad-cb8d-4a12-add2-4064a342ce95';
  c_lot_a201 constant uuid := 'c06f6583-da26-4fc9-a543-32302dd5916d';
  c_lot_a202 constant uuid := 'cabed985-09d6-497b-a927-e9e097048b28';
  v_ag2      uuid;
begin
  -- a) AG extraordinaire : create_ag NE génère AUCUNE résolution pour 'extraordinary'
  v_ag2 := public.create_ag_with_standard_resolutions(
             c_copro,
             '[E2E] AG extraordinaire (à tenir)',
             '2026-09-20T18:30:00+02'::timestamptz,
             'extraordinary'::ag_meeting_type,
             'Salle commune');
  raise notice '[3a] AG n2 créée (extraordinaire, 0 résolution auto): %', v_ag2;

  -- b) Résolutions EN ATTENTE DE VOTE (status 'pending', aucun vote)
  insert into public.ag_resolutions(
      ag_id, copro_id, resolution_number, title, description,
      resolution_type, majority_type, action_type, variables, status)
  values
    (v_ag2, c_copro, 1,
     'Travaux exceptionnels de réfection de la toiture',
     'Vote des travaux exceptionnels et de leur financement',
     'works', 'art25', NULL, '{}'::jsonb, 'pending'),
    (v_ag2, c_copro, 2,
     'Autorisation de souscrire un emprunt collectif',
     'Habilitation du syndic à négocier un emprunt',
     'other', 'art26', NULL, '{}'::jsonb, 'pending');
  raise notice '[3b] 2 résolutions en attente de vote insérées (status pending).';

  -- c) Ouverture de séance -> status 'session_active'
  perform public.start_ag(v_ag2, 'Séance ouverte (E2E, à tenir)');
  raise notice '[3c] AG n2 en session_active.';

  -- d) Présences pour les 3 coproprietaires (AUCUN vote)
  insert into public.ag_attendance(ag_id, copro_id, coproprietaire_id, lot_ids, presence_type)
  values (v_ag2, c_copro, c_alice, array[c_lot_a101, c_lot_a102], 'present'),
         (v_ag2, c_copro, c_bruno, array[c_lot_a201],            'present'),
         (v_ag2, c_copro, c_chloe, array[c_lot_a202],            'present');
  raise notice '[3d] 3 présences enregistrées sur AG n2 (aucun vote posé).';
end $$;

-- =====================================================================
-- 4) ASSERTIONS DURES (avant COMMIT) — un écart fait ÉCHOUER la transaction
--    (anti faux-vert : on n'affiche pas, on vérifie). Les SELECT informatifs
--    qui suivent ne servent qu'au confort de lecture.
-- =====================================================================
do $$
declare
  c_copro constant uuid := '5d3ed408-d20a-4304-8976-47798c1f85a4';
  v_solde_105    numeric;
  v_debit_405    numeric;
  v_credit_105   numeric;
  v_works_status text;
  v_n_approved   int;
  v_n_council    int;
  v_n_pending    int;
  v_period_open  int;
  v_current_ok   text;
  v_ag1_status   text;
begin
  -- A1) Solde du compte 105 = 2400 (cotisation ALUR appelée, postée).
  select round(coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0),2)
    into v_solde_105
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
  join public.accounts a on a.id = e.account_id
  where a.copro_id = c_copro and a.code = '105';
  if v_solde_105 <> 2400 then
    raise exception 'ASSERT A1 KO : solde 105 = % (attendu 2400)', v_solde_105 using errcode='23514';
  end if;

  -- A2) Écriture ALUR équilibrée : D 450-5 = 2400 et C 105 = 2400.
  select coalesce(sum(case when a.code='450-5' and e.direction='debit'  then e.amount else 0 end),0),
         coalesce(sum(case when a.code='105'   and e.direction='credit' then e.amount else 0 end),0)
    into v_debit_405, v_credit_105
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
  join public.accounts a on a.id = e.account_id
  join public.call_for_funds cff on cff.ledger_tx_id = t.id
  join public.budgets b on b.id = cff.budget_id and b.name like '[E2E]%' and b.budget_type='alur';
  if v_debit_405 <> 2400 or v_credit_105 <> 2400 then
    raise exception 'ASSERT A2 KO : D450-5=% C105=% (attendu 2400/2400)', v_debit_405, v_credit_105 using errcode='23514';
  end if;

  -- A3) Budget travaux [E2E] lié à l'AG et 'validated'.
  select b.status into v_works_status
  from public.budgets b
  where b.copro_id = c_copro and b.budget_type='works' and b.name like '[E2E]%';
  if v_works_status is distinct from 'validated' then
    raise exception 'ASSERT A3 KO : budget travaux E2E status=% (attendu validated)', v_works_status using errcode='23514';
  end if;

  -- A4) Résolutions 5/7/8 = 'approved' (exactement 3).
  select count(*) into v_n_approved
  from public.ag_resolutions r
  join public.ag_meetings m on m.id = r.ag_id
  where m.copro_id = c_copro and m.title = '[E2E] AG ordinaire 2026'
    and r.resolution_number in (5,7,8) and r.status = 'approved';
  if v_n_approved <> 3 then
    raise exception 'ASSERT A4 KO : % résolutions 5/7/8 approved (attendu 3)', v_n_approved using errcode='23514';
  end if;

  -- A5) Conseil syndical : exactement 3 membres actifs.
  select count(*) into v_n_council
  from public.council_members cm
  where cm.copro_id = c_copro and cm.is_active;
  if v_n_council <> 3 then
    raise exception 'ASSERT A5 KO : % membres de conseil actifs (attendu 3)', v_n_council using errcode='23514';
  end if;

  -- A6) AG n2 : aucune résolution votée, 2 en attente.
  select count(*) into v_n_pending
  from public.ag_resolutions r
  join public.ag_meetings m on m.id = r.ag_id
  where m.copro_id = c_copro and m.title = '[E2E] AG extraordinaire (à tenir)'
    and r.status = 'pending';
  if v_n_pending <> 2 then
    raise exception 'ASSERT A6 KO : % résolutions pending sur AG n2 (attendu 2)', v_n_pending using errcode='23514';
  end if;

  -- A7) Exercice 2026 toujours ouvert.
  select count(*) into v_period_open
  from public.accounting_periods
  where id = 'ce8dbd4b-1031-46e6-88fe-fc626fce04b9' and status = 'open';
  if v_period_open <> 1 then
    raise exception 'ASSERT A7 KO : exercice 2026 non ouvert (status attendu open)' using errcode='23514';
  end if;

  -- A8) Budget courant pré-existant intact (toujours validated).
  select status into v_current_ok from public.budgets where id = 'b0141c40-fc56-418d-93a3-b9cac97fff98';
  if v_current_ok is distinct from 'validated' then
    raise exception 'ASSERT A8 KO : budget courant b0141c40 status=% (attendu validated)', v_current_ok using errcode='23514';
  end if;

  -- A9) AG n1 clôturée : séance levée -> status 'closed'.
  select status::text into v_ag1_status
  from public.ag_meetings
  where copro_id = c_copro and title = '[E2E] AG ordinaire 2026';
  if v_ag1_status is distinct from 'closed' then
    raise exception 'ASSERT A9 KO : AG n1 status=% (attendu closed)', v_ag1_status using errcode='23514';
  end if;

  raise notice '[4] Toutes les assertions A1..A9 passent.';
end $$;

-- =====================================================================
-- 4bis) VÉRIFICATIONS LISIBLES (SELECT informatifs) — affichées avant COMMIT
-- =====================================================================
\echo '=== V1 : Budget travaux validé lié à AG n1 ==='
select b.id, b.budget_type, b.status, b.name, b.source_ag_id
from public.budgets b
where b.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4'
  and b.budget_type = 'works' and b.name like '[E2E]%';

\echo '=== V2 : Solde compte 105 (Fonds ALUR) — attendu 2400 ==='
select round(coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0),2) as solde_105
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
join public.accounts a on a.id = e.account_id
where a.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and a.code = '105';

\echo '=== V3 : Écriture ALUR D450-5 / C105 (call_for_funds [E2E]) ==='
select a.code, e.direction, sum(e.amount) as montant
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
join public.accounts a on a.id = e.account_id
join public.call_for_funds cff on cff.ledger_tx_id = t.id
join public.budgets b on b.id = cff.budget_id and b.name like '[E2E]%' and b.budget_type='alur'
group by a.code, e.direction order by a.code;

\echo '=== V4 : Conseil syndical élu (3 membres actifs) ==='
select cm.role, c.first_name || ' ' || c.last_name as nom, cm.is_active, cm.start_date
from public.council_members cm
join public.coproprietaires c on c.id = cm.coproprietaire_id
where cm.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and cm.is_active
order by cm.role;

\echo '=== V5 : AG n1 — statuts des résolutions (5/7/8 approved ; 2/3/4/6 rejected) ==='
select r.resolution_number, r.action_type, r.status
from public.ag_resolutions r
join public.ag_meetings m on m.id = r.ag_id
where m.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and m.title = '[E2E] AG ordinaire 2026'
order by r.resolution_number;

\echo '=== V6 : AG n1 — pending_actions activées ==='
select a.action_type, a.status, a.result_data
from public.ag_pending_actions a
join public.ag_meetings m on m.id = a.ag_id
where m.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and m.title = '[E2E] AG ordinaire 2026'
order by a.action_type;

\echo '=== V7 : AG n2 — session active, présences, AUCUN vote, résolutions en attente ==='
select m.title, m.status as ag_status,
       (select count(*) from public.ag_attendance at where at.ag_id = m.id)  as presences,
       (select count(*) from public.ag_votes v
          join public.ag_resolutions r on r.id = v.resolution_id where r.ag_id = m.id) as votes,
       (select count(*) from public.ag_resolutions r where r.ag_id = m.id and r.status='pending') as res_en_attente
from public.ag_meetings m
where m.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and m.title = '[E2E] AG extraordinaire (à tenir)';

\echo '=== V8 : Exercice 2026 toujours OUVERT (un seul, non clôturé) ==='
select name, start_date, end_date, status
from public.accounting_periods
where copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4'
order by start_date;

\echo '=== V9 : Budget courant pré-existant intact (toujours validated) ==='
select id, budget_type, status, version
from public.budgets
where id = 'b0141c40-fc56-418d-93a3-b9cac97fff98';

\echo '=== V10 : AG n1 clôturée (status=closed, closed_at renseigné) ; AG n2 session_active ==='
select m.title, m.status as ag_status, m.closed_at, m.session_ended_at
from public.ag_meetings m
where m.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and m.title like '[E2E]%'
order by m.title;

-- COMMIT pour appliquer le seed. (Remplacer par ROLLBACK pour un dry-run ;
-- attention : un ROLLBACK annule TOUT — les V* afficheront un état correct
-- puis non persisté.)
commit;