-- =====================================================================
-- SEED E2E - Module AG / Finance copro (HARNESS 5d3ed408)
-- Cible : copro 5d3ed408-d20a-4304-8976-47798c1f85a4 (Le Clos Saint-Michel demo)
-- Exercice OUVERT unique ce8dbd4b (2026) - NE CLOTURE PAS.
--
-- Produit :
--   AG #1 "[E2E] AG ordinaire 2026"  -> votee + ACTIVEE
--       - budget TRAVAUX (works) valide + lie a l'AG (source_ag_id) via CREATE_WORK_BUDGET
--       - fonds ALUR alimente : cotisation art.14-2 postee D450-5 / C105 (solde 105 > 0)
--       - conseil syndical elu (ELECT_COUNCIL)
--       - NE revote PAS le budget COURANT (pas de collision unicite)
--       - N'approuve PAS les comptes (pas de cloture) : res #2 laissee non votee -> rejetee
--   AG #2 "[E2E] AG extraordinaire (a tenir)" -> EN COURS (session_active)
--       - presences (ag_attendance) des 3 coproprietaires
--       - resolutions en attente de vote, AUCUN vote -> testable dans l'app
--
-- Passe par le VRAI moteur : create_ag_with_standard_resolutions, start_ag,
-- cast_vote, finalize_and_activate_ag (qui enchaine calculate_resolution_result
-- -> prepare_ag_decisions -> activate_ag_decisions).
-- Seuls INSERT directs : budgets works/alur en brouillon + leurs budget_lines,
-- l'aiguillage des resolutions (action_type/linked_*_budget_id), variables,
-- et ag_attendance (requis par le trigger pour les votes 'live').
--
-- IDEMPOTENT : purge prealable des AG dont le titre commence par '[E2E]'
-- (CASCADE supprime resolutions/votes/attendance/pending_actions ; les budgets
-- works/alur de seed et leurs appels/ecritures sont purges explicitement).
--
-- LANCEMENT :
--   docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres < seed_e2e_ag.sql
-- (un seul psql = une seule session : le set_config service_role reste actif.)
-- =====================================================================

\set ON_ERROR_STOP on
\timing off

begin;

-- --- 0) Bypass des gardes role (is_service_call) pour toute la transaction ---------
--     transaction-local (3e arg = true) : actif jusqu'au COMMIT.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  -- Constantes copro de test (verifiees read-only)
  c_copro     uuid := '5d3ed408-d20a-4304-8976-47798c1f85a4';
  c_period    uuid := 'ce8dbd4b-1031-46e6-88fe-fc626fce04b9';  -- Exercice 2026, OPEN
  c_key_gen   uuid := 'f4f21be6-6a73-425a-ae05-7138271ec938';  -- Cle generale (total 1000, 4 lots)
  c_acct_105  uuid := '0df31d64-d489-413d-a200-176a2b05f835';  -- 105 Fonds ALUR (postable)
  c_acct_702  uuid := '2106b53e-2a01-4596-aa05-d60d167a4356';  -- 702 Provisions travaux (postable)

  -- Coproprietaires (tous actifs, share 100)
  c_alice  uuid := 'f98dbe1c-d49b-4002-be8b-7ca4a2b8d3d5';  -- 2 lots -> 500 tantiemes
  c_bruno  uuid := '02461acc-da9e-46f3-afd6-fadec973671e';  -- 1 lot  -> 250
  c_chloe  uuid := 'f0216354-25e0-496e-aa30-dd956a1ca374';  -- 1 lot  -> 250
  -- (total 1000 si les 3 votent : passe art24 ET art25 = floor(1000/2)+1 = 501)

  -- Lots par copro (pour ag_attendance.lot_ids)
  c_lot_a101 uuid := '13e7aee8-dfe8-482d-a1e6-76cc358af155';  -- Alice
  c_lot_a102 uuid := '96f5fbad-cb8d-4a12-add2-4064a342ce95';  -- Alice
  c_lot_a201 uuid := 'c06f6583-da26-4fc9-a543-32302dd5916d';  -- Bruno
  c_lot_a202 uuid := 'cabed985-09d6-497b-a927-e9e097048b28';  -- Chloe

  v_ag1            uuid;   -- AG ordinaire (passee)
  v_ag2            uuid;   -- AG extraordinaire (en cours)
  v_budget_works   uuid;
  v_budget_alur    uuid;
  v_res_works      uuid;   -- resolution #4 (repurposed CREATE_WORK_BUDGET)
  v_res_alur       uuid;   -- resolution #5 (CREATE_ALUR_FUND)
  v_res_council    uuid;   -- resolution #7 (ELECT_COUNCIL)
  v_fin            jsonb;
  v_bal_105        numeric;
  r                record;
begin

  -- ================================================================
  -- 1) PURGE des seeds precedents (idempotence)
  -- ================================================================
  raise notice '[E2E] 1) Purge des seeds precedents...';

  -- 1a) Appels de fonds + ecritures GL adosses aux budgets works/alur de seed
  --     (les budgets de seed sont reconnus par source_ag_id pointant une AG '[E2E]').
  for r in
    select b.id as budget_id
    from public.budgets b
    join public.ag_meetings m on m.id = b.source_ag_id
    where b.copro_id = c_copro
      and m.title like '[E2E]%'
      and b.budget_type in ('works', 'alur')
  loop
    -- ecritures GL des appels de ce budget (ledger_entries -> ON DELETE CASCADE par tx)
    delete from public.ledger_transactions lt
    using public.call_for_funds cff
    where cff.budget_id = r.budget_id
      and lt.id = cff.ledger_tx_id;
    -- appels (call_for_funds_lines -> ON DELETE CASCADE)
    delete from public.call_for_funds cff where cff.budget_id = r.budget_id;
    -- le budget lui-meme (budget_lines -> ON DELETE CASCADE)
    delete from public.budgets b where b.id = r.budget_id;
  end loop;

  -- 1b) Les AG '[E2E]' (CASCADE -> ag_resolutions, ag_votes, ag_attendance, ag_pending_actions)
  delete from public.ag_meetings m
  where m.copro_id = c_copro and m.title like '[E2E]%';

  raise notice '[E2E]    purge OK.';

  -- ================================================================
  -- 2) AG #1 ORDINAIRE -> PASSEE, votee + activee
  -- ================================================================
  raise notice '[E2E] 2) Creation AG #1 ordinaire (7 resolutions standard)...';
  v_ag1 := public.create_ag_with_standard_resolutions(
    c_copro,
    '[E2E] AG ordinaire 2026',
    '2026-06-15T18:00:00+02'::timestamptz,
    'ordinary'::ag_meeting_type,
    'Salle commune'
  );
  raise notice '[E2E]    AG #1 = %', v_ag1;

  -- 2a) Recuperer les resolutions a faire passer
  --     #4 = CREATE_BUDGET (on la repurpose en CREATE_WORK_BUDGET pour un budget TRAVAUX,
  --          ce qui evite de revoter le budget COURANT -> pas de collision unicite),
  --     #5 = CREATE_ALUR_FUND, #7 = ELECT_COUNCIL.
  select id into v_res_works   from public.ag_resolutions where ag_id = v_ag1 and resolution_number = 4;
  select id into v_res_alur    from public.ag_resolutions where ag_id = v_ag1 and resolution_number = 5;
  select id into v_res_council from public.ag_resolutions where ag_id = v_ag1 and resolution_number = 7;

  -- ================================================================
  -- 3) Budgets brouillon TRAVAUX + ALUR lies a l'AG #1
  --    (seuls INSERT directs autorises pour les budgets + leurs lignes)
  -- ================================================================
  raise notice '[E2E] 3) Budgets travaux + ALUR (brouillon) lies a l''AG #1...';

  -- 3a) Budget TRAVAUX (works) : valide a l'activation (CREATE_WORK_BUDGET), SANS appel GL.
  insert into public.budgets (copro_id, period_id, budget_type, status, version, name, source_ag_id)
  values (c_copro, c_period, 'works', 'draft', 1,
          '[E2E] Budget travaux ravalement 2026', v_ag1)
  returning id into v_budget_works;

  -- une ligne sur la cle generale (cle complete) ; account_id = 702 (postable).
  insert into public.budget_lines (budget_id, copro_id, account_id, repartition_key_id, label, amount)
  values (v_budget_works, c_copro, c_acct_702, c_key_gen,
          'Ravalement de facade', 12000);

  -- 3b) Budget ALUR (alur) : valide + appel D450-5/C105 a l'activation (CREATE_ALUR_FUND).
  insert into public.budgets (copro_id, period_id, budget_type, status, version, name, source_ag_id)
  values (c_copro, c_period, 'alur', 'draft', 1,
          '[E2E] Cotisation fonds travaux ALUR 2026', v_ag1)
  returning id into v_budget_alur;

  -- montant cotisation = 3000 reparti sur la cle generale ; account_id = 105 (postable).
  -- NB : le credit GL (105) est derive du budget_type 'alur', PAS de account_id.
  insert into public.budget_lines (budget_id, copro_id, account_id, repartition_key_id, label, amount)
  values (v_budget_alur, c_copro, c_acct_105, c_key_gen,
          'Cotisation annuelle fonds de travaux (art. 14-2)', 3000);

  raise notice '[E2E]    budget works = % ; budget alur = %', v_budget_works, v_budget_alur;

  -- ================================================================
  -- 4) Aiguillage des resolutions vers les budgets + variables (echeancier ALUR + conseil)
  -- ================================================================
  raise notice '[E2E] 4) Aiguillage resolutions (action_type / linked / variables)...';

  -- #4 -> CREATE_WORK_BUDGET (budget TRAVAUX) + lien explicite (linked_work_budget_id)
  update public.ag_resolutions
  set action_type          = 'CREATE_WORK_BUDGET',
      linked_work_budget_id = v_budget_works,
      title                = 'Approbation du budget travaux (ravalement)',
      variables            = '{}'::jsonb
  where id = v_res_works;

  -- #5 -> CREATE_ALUR_FUND : echeancier UNIQUE (1 appel 100% du budget alur)
  update public.ag_resolutions
  set linked_budget_id = v_budget_alur,
      variables        = jsonb_build_object(
                           'budget_id', v_budget_alur,
                           'mode', 'UNIQUE',
                           'issue_date', '2026-07-01',
                           'due_date', '2026-07-31')
  where id = v_res_alur;

  -- #7 -> ELECT_COUNCIL : 3 membres (president + 2 membres)
  update public.ag_resolutions
  set variables = jsonb_build_object('council_members', jsonb_build_array(
        jsonb_build_object('coproprietaire_id', c_alice, 'role', 'president'),
        jsonb_build_object('coproprietaire_id', c_bruno, 'role', 'member'),
        jsonb_build_object('coproprietaire_id', c_chloe, 'role', 'member')
      ))
  where id = v_res_council;

  -- ================================================================
  -- 5) Ouvrir la seance AG #1, presences, puis votes 'for' (les 3 -> 1000/1000)
  --    sur les 3 resolutions a faire passer (#4, #5, #7).
  --    Les autres resolutions (#1,#2,#3,#6) restent non votees -> rejetees a la finalisation
  --    => pas d'APPROVE_ACCOUNTS (pas de cloture), pas de budget courant revote.
  -- ================================================================
  raise notice '[E2E] 5) Ouverture seance + presences + votes AG #1...';
  perform public.start_ag(v_ag1, 'Ouverture seance AG ordinaire 2026 (seed E2E)');

  -- Presences (requis par le trigger pour les votes vote_source='live')
  insert into public.ag_attendance (ag_id, copro_id, coproprietaire_id, lot_ids, tantiemes, presence_type)
  values
    (v_ag1, c_copro, c_alice, array[c_lot_a101, c_lot_a102]::uuid[], 500, 'present'),
    (v_ag1, c_copro, c_bruno, array[c_lot_a201]::uuid[],            250, 'present'),
    (v_ag1, c_copro, c_chloe, array[c_lot_a202]::uuid[],            250, 'present')
  on conflict (ag_id, coproprietaire_id) do nothing;

  -- Votes : les 3 votent POUR sur #4, #5, #7 (tantiemes derives auto par cast_vote)
  perform public.cast_vote(v_res_works,   c_alice, 'for', 'live');
  perform public.cast_vote(v_res_works,   c_bruno, 'for', 'live');
  perform public.cast_vote(v_res_works,   c_chloe, 'for', 'live');

  perform public.cast_vote(v_res_alur,    c_alice, 'for', 'live');
  perform public.cast_vote(v_res_alur,    c_bruno, 'for', 'live');
  perform public.cast_vote(v_res_alur,    c_chloe, 'for', 'live');

  perform public.cast_vote(v_res_council, c_alice, 'for', 'live');
  perform public.cast_vote(v_res_council, c_bruno, 'for', 'live');
  perform public.cast_vote(v_res_council, c_chloe, 'for', 'live');

  raise notice '[E2E]    9 votes poses (3 resolutions x 3 proprietaires).';

  -- ================================================================
  -- 6) Finaliser + activer AG #1
  --    -> calculate_resolution_result (fige approved/rejected)
  --    -> prepare_ag_decisions (pending_actions des resolutions approuvees)
  --    -> activate_ag_decisions :
  --         CREATE_WORK_BUDGET -> validate_budget(works) [pas de GL]
  --         CREATE_ALUR_FUND   -> validate_budget(alur) + post D450-5/C105
  --         ELECT_COUNCIL      -> upsert conseil syndical
  -- ================================================================
  raise notice '[E2E] 6) finalize_and_activate_ag(AG #1)...';
  v_fin := public.finalize_and_activate_ag(v_ag1, true);
  raise notice '[E2E]    resultat finalize : %', v_fin;

  -- ================================================================
  -- 7) AG #2 EXTRAORDINAIRE -> EN COURS (session_active), presences, AUCUN vote
  --    create_ag(..., 'extraordinary') ne cree PAS de resolution -> on en cree 2 a la main
  --    (autorise : aiguillage de resolutions). Aucune n'est votee.
  -- ================================================================
  raise notice '[E2E] 7) Creation AG #2 extraordinaire (en cours, sans vote)...';
  v_ag2 := public.create_ag_with_standard_resolutions(
    c_copro,
    '[E2E] AG extraordinaire (a tenir)',
    '2026-09-20T18:00:00+02'::timestamptz,
    'extraordinary'::ag_meeting_type,
    'Salle commune'
  );
  raise notice '[E2E]    AG #2 = %', v_ag2;

  -- Resolutions en attente de vote (status par defaut 'draft', aucun ag_votes)
  insert into public.ag_resolutions
    (ag_id, copro_id, resolution_number, title, description, resolution_type, majority_type, action_type, variables)
  values
    (v_ag2, c_copro, 1,
     'Vote de travaux exceptionnels d''etancheite de la toiture',
     'Approbation de travaux exceptionnels hors budget previsionnel', 'works', 'art25', null, '{}'::jsonb),
    (v_ag2, c_copro, 2,
     'Autorisation de pose de bornes de recharge vehicules electriques',
     'Decision relative a l''installation d''IRVE dans le parking', 'other', 'art25', null, '{}'::jsonb);

  -- Passer l'AG #2 en session_active + presences des 3 (pour tester le vote 'live' dans l'app)
  perform public.start_ag(v_ag2, 'Seance ouverte - en attente des votes (seed E2E)');

  insert into public.ag_attendance (ag_id, copro_id, coproprietaire_id, lot_ids, tantiemes, presence_type)
  values
    (v_ag2, c_copro, c_alice, array[c_lot_a101, c_lot_a102]::uuid[], 500, 'present'),
    (v_ag2, c_copro, c_bruno, array[c_lot_a201]::uuid[],            250, 'present'),
    (v_ag2, c_copro, c_chloe, array[c_lot_a202]::uuid[],            250, 'present')
  on conflict (ag_id, coproprietaire_id) do nothing;

  raise notice '[E2E]    AG #2 en session_active, presences posees, AUCUN vote.';

  -- ================================================================
  -- 8) Verifications inline (RAISE) -- les SELECT detailles sont apres COMMIT
  -- ================================================================
  select round(coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0),2)
    into v_bal_105
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
  where e.copro_id = c_copro and e.account_id = c_acct_105;

  raise notice '[E2E] 8) Solde compte 105 (ALUR) apres seed = % (attendu = 3000)', v_bal_105;
  if v_bal_105 <= 0 then
    raise exception '[E2E] ECHEC : solde 105 non positif (%), la cotisation ALUR ne s''est pas postee', v_bal_105;
  end if;

  if not exists (
    select 1 from public.budgets
    where source_ag_id = v_ag1 and budget_type='works' and status='validated'
  ) then
    raise exception '[E2E] ECHEC : budget travaux non valide / non lie a l''AG #1';
  end if;

  if not exists (select 1 from public.ag_meetings where id = v_ag2 and status='session_active') then
    raise exception '[E2E] ECHEC : AG #2 n''est pas en session_active';
  end if;

  raise notice '[E2E] === SEED OK === AG1=% AG2=% budget_works=% budget_alur=%',
               v_ag1, v_ag2, v_budget_works, v_budget_alur;
end $$;

commit;

-- =====================================================================
-- VERIFICATIONS POST-COMMIT (read-only)
-- =====================================================================

\echo '--- AG de seed (statuts) ---'
select id, title, meeting_type, status
from public.ag_meetings
where copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and title like '[E2E]%'
order by title;

\echo '--- AG #1 : resolutions figees (approved/rejected) ---'
select r.resolution_number, r.title, r.action_type, r.majority_type, r.status
from public.ag_resolutions r
join public.ag_meetings m on m.id = r.ag_id
where m.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4'
  and m.title = '[E2E] AG ordinaire 2026'
order by r.resolution_number;

\echo '--- AG #1 : pending_actions activees ---'
select pa.action_type, pa.target_table, pa.status
from public.ag_pending_actions pa
join public.ag_meetings m on m.id = pa.ag_id
where m.title = '[E2E] AG ordinaire 2026'
order by pa.action_type;

\echo '--- Budget TRAVAUX valide + lie a l''AG #1 ---'
select b.budget_type, b.status, b.name, (b.source_ag_id is not null) as lie_a_l_ag
from public.budgets b
join public.ag_meetings m on m.id = b.source_ag_id
where b.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4'
  and m.title = '[E2E] AG ordinaire 2026'
order by b.budget_type;

\echo '--- Solde compte 105 (fonds ALUR) -- attendu 3000 ---'
select a.code, a.name,
       round(coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0),2) as solde_105
from public.accounts a
left join public.ledger_entries e on e.account_id = a.id
left join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
where a.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and a.code = '105'
group by a.code, a.name;

\echo '--- Ecriture ALUR D450-5 / C105 (verif partie double) ---'
select acc.code, e.direction, round(sum(e.amount),2) as montant
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
join public.accounts acc on acc.id = e.account_id
where e.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4'
  and acc.code in ('450-5','105')
group by acc.code, e.direction
order by acc.code, e.direction;

\echo '--- Conseil syndical elu (AG #1) ---'
select cm.role, co.first_name, co.last_name, cm.is_active
from public.council_members cm
join public.coproprietaires co on co.id = cm.coproprietaire_id
where cm.copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4' and cm.is_active
order by cm.role;

\echo '--- AG #2 : en session_active, resolutions sans vote ---'
select r.resolution_number, r.title, r.status,
       (select count(*) from public.ag_votes v where v.resolution_id = r.id) as nb_votes
from public.ag_resolutions r
join public.ag_meetings m on m.id = r.ag_id
where m.title = '[E2E] AG extraordinaire (a tenir)'
order by r.resolution_number;

\echo '--- Exercice : doit rester OUVERT (aucune cloture) ---'
select name, status from public.accounting_periods
where copro_id = '5d3ed408-d20a-4304-8976-47798c1f85a4';