-- ============================================================
-- GATE 0034 — acceptation Phase 0 (RLS + cloisonnement multi-cabinet)
-- begin/rollback jetable. UUIDs fixes de provision_demo_tenant().
-- A1 parcours gestA · A2 refus 42501 gestB · A3 SELECT RLS cloisonné
-- A4 INSERT RLS · A5 non-récursion collective_loans · A6 tiers (RIB protégés)
-- ============================================================
\set ON_ERROR_STOP on
begin;

-- (0) RLS ON sur les tables testées (dev = OFF par défaut)
alter table public.copros enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.mutations enable row level security;
alter table public.mutation_steps enable row level security;
alter table public.collective_loans enable row level security;
alter table public.collective_loan_shares enable row level security;
alter table public.tiers enable row level security;
alter table public.memberships enable row level security;

-- (S) SETUP service_role
select set_config('request.jwt.claims','{"role":"service_role"}', true);
select public.provision_demo_tenant() ->> 'copro' as setup_copro;

-- (S2) Extra setup (role postgres, bypass RLS) :
--   - un copropriétaire-membre de la copro A (pour tester tiers : base=0, annuaire visible)
--   - un emprunt collectif + part (pour exercer la non-récursion collective_loans<->shares)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('c0de0000-0000-4000-a000-0000000000ce','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','copro.demo@coproflex.test',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb, now(), now())
on conflict (id) do nothing;
insert into public.memberships (user_id, copro_id, role)
values ('c0de0000-0000-4000-a000-0000000000ce','c0000000-0000-4000-a000-0000000000c0','coproprietaire')
on conflict (user_id, copro_id) do nothing;
insert into public.collective_loans (id, copro_id, label)
values ('10a40000-0000-4000-a000-0000000000a1','c0000000-0000-4000-a000-0000000000c0','Emprunt ravalement demo')
on conflict (id) do nothing;
insert into public.collective_loan_shares (loan_id, lot_id, share_amount)
values ('10a40000-0000-4000-a000-0000000000a1','10000000-0000-4000-a000-000000000001',5000)
on conflict (loan_id, lot_id) do nothing;

-- ============================================================
-- (A1) PARCOURS LÉGITIME gestA (gardes G-MGR laissent passer)
-- ============================================================
select set_config('request.jwt.claims',
  '{"sub":"a5000000-0000-4000-a000-00000000000a","role":"authenticated","email":"gest.a@demo.coproflex.test"}', true);
select public.validate_budget('b0d6e700-0000-4000-a000-000000000001');
select public.post_budget_call_for_funds(
  'c0000000-0000-4000-a000-0000000000c0','ec000000-0000-4000-a000-0000000020c6',
  'b0d6e700-0000-4000-a000-000000000001','Appel T1 2026',1,'2026-01-01'::date,'2026-01-31'::date,1.0,null,null) as call_id;
select public.post_owner_payment(
  'c0000000-0000-4000-a000-0000000000c0','ec000000-0000-4000-a000-0000000020c6',
  '10000000-0000-4000-a000-000000000001',1000.00,'2026-02-15'::date,'transfer','Reglement demo',null,'demo-pay-1',null) as payment_id;
\echo 'A1 OK : parcours gestA passe les gardes G-MGR'

-- ============================================================
-- (A2) REFUS CROSS-CABINET gestB (gardes → 42501)
-- ============================================================
do $$ declare v_ref int := 0; begin
  perform set_config('request.jwt.claims','{"sub":"b5000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
  begin perform public.post_budget_call_for_funds('c0000000-0000-4000-a000-0000000000c0','ec000000-0000-4000-a000-0000000020c6','b0d6e700-0000-4000-a000-000000000001','Intrus',2,'2026-04-01'::date,'2026-04-30'::date,1.0,null,null);
  exception when sqlstate '42501' then v_ref := v_ref + 1; end;
  begin perform public.post_owner_payment('c0000000-0000-4000-a000-0000000000c0','ec000000-0000-4000-a000-0000000020c6','10000000-0000-4000-a000-000000000001',10,'2026-03-01'::date,'transfer','x',null,'intrus-pay',null);
  exception when sqlstate '42501' then v_ref := v_ref + 1; end;
  begin perform public.set_opening_balance('c0000000-0000-4000-a000-0000000000c0','ec000000-0000-4000-a000-0000000020c6','2026-01-01'::date,'[]'::jsonb);
  exception when sqlstate '42501' then v_ref := v_ref + 1; end;
  if v_ref <> 3 then raise exception 'GATE FAIL (A2) : % refus / 3', v_ref; end if;
  raise notice 'A2 OK : 3/3 refus 42501 cross-cabinet';
end $$;

-- ============================================================
-- (A3..A6) sous role authenticated réel (RLS s'applique)
-- ============================================================
set local role authenticated;

-- (A3) SELECT cloisonné
select set_config('request.jwt.claims','{"sub":"b5000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
do $$ declare c int; g int; begin
  select count(*) into c from public.copros where id='c0000000-0000-4000-a000-0000000000c0';
  select count(*) into g from public.ledger_transactions where copro_id='c0000000-0000-4000-a000-0000000000c0';
  if c<>0 or g<>0 then raise exception 'GATE FAIL (A3) gestB voit copro=% gl=%', c,g; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"a5000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);
do $$ declare c int; g int; begin
  select count(*) into c from public.copros where id='c0000000-0000-4000-a000-0000000000c0';
  select count(*) into g from public.ledger_transactions where copro_id='c0000000-0000-4000-a000-0000000000c0';
  if c<>1 or g<1 then raise exception 'GATE FAIL (A3) gestA voit copro=% gl=%', c,g; end if;
  raise notice 'A3 OK : gestB 0/0, gestA copro=% gl=%', c,g;
end $$;

-- (A4) INSERT mutations RLS : gestA ok, gestB refusé
do $$ declare n int; refused boolean:=false; begin
  perform set_config('request.jwt.claims','{"sub":"a5000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);
  insert into public.mutations (copro_id, lot_id, period_id, status, mutation_type, seller_owner_id)
  values ('c0000000-0000-4000-a000-0000000000c0','10000000-0000-4000-a000-000000000001','ec000000-0000-4000-a000-0000000020c6','draft','sale','c1000000-0000-4000-a000-000000000001');
  get diagnostics n = row_count; if n<>1 then raise exception 'GATE FAIL (A4) gestA INSERT bloqué'; end if;
  perform set_config('request.jwt.claims','{"sub":"b5000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
  begin
    insert into public.mutations (copro_id, lot_id, period_id, status, mutation_type, seller_owner_id)
    values ('c0000000-0000-4000-a000-0000000000c0','10000000-0000-4000-a000-000000000002','ec000000-0000-4000-a000-0000000020c6','draft','sale','c1000000-0000-4000-a000-000000000001');
  exception when others then refused:=true; end;
  if not refused then raise exception 'GATE FAIL (A4) gestB INSERT NON bloqué (fuite RLS)'; end if;
  raise notice 'A4 OK : gestA insère, gestB refusé';
end $$;

-- (A5) NON-RÉCURSION collective_loans <-> collective_loan_shares (RLS ON + données + non-manager)
do $$ declare cl int; cls int; begin
  perform set_config('request.jwt.claims','{"sub":"b5000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
  -- avant la correction : 42P17 infinite recursion ; après : 0 ligne, aucune erreur
  select count(*) into cl  from public.collective_loans where copro_id='c0000000-0000-4000-a000-0000000000c0';
  select count(*) into cls from public.collective_loan_shares;
  raise notice 'A5 OK : pas de récursion RLS (collective_loans=% / shares=% vus par un non-membre)', cl, cls;
end $$;

-- (A6) TIERS : copropriétaire-membre ne lit PAS la base (RIB protégés) mais voit l'annuaire (vue definer)
do $$ declare base int; dir int; begin
  perform set_config('request.jwt.claims','{"sub":"c0de0000-0000-4000-a000-0000000000ce","role":"authenticated"}', true);
  select count(*) into base from public.tiers where copro_id='c0000000-0000-4000-a000-0000000000c0';
  select count(*) into dir  from public.tiers_directory where copro_id='c0000000-0000-4000-a000-0000000000c0';
  if base <> 0 then raise exception 'GATE FAIL (A6) copropriétaire lit la table tiers (fuite RIB) : % lignes', base; end if;
  if dir < 1 then raise exception 'GATE FAIL (A6) annuaire tiers_directory vide pour le copropriétaire (attendu >=1)'; end if;
  raise notice 'A6 OK : copropriétaire tiers(base)=0 (RIB protégés), tiers_directory=% (annuaire visible)', dir;
end $$;

reset role;
\echo '=========================================='
\echo 'GATE 0034 : TOUS LES PALIERS OK (A1..A6)'
\echo '=========================================='
rollback;
