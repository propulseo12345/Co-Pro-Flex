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
     'gest.a@demo.coproflex.test', crypt('demo-password-A', gen_salt('bf')),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Gestionnaire A"}'::jsonb, now(), now()),
    (v_gest_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'gest.b@demo.coproflex.test', crypt('demo-password-B', gen_salt('bf')),
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
  --    pour disposer d'un copropriétaire identifié — optionnel, non bloquant).
  insert into public.coproprietaires (id, copro_id, is_company, first_name, last_name, email, is_resident, user_id) values
    (v_co1, v_copro, false, 'Alice', 'Martin',  'alice.demo@coproflex.test',  true,  null),
    (v_co2, v_copro, false, 'Bruno', 'Durand',  'bruno.demo@coproflex.test',  true,  v_gest_b),
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
