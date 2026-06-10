-- ============================================================================
-- supabase/seed.sql — Seed DEV local (rejoué automatiquement par `supabase db reset`)
-- ----------------------------------------------------------------------------
-- Donne un environnement immédiatement CLIQUABLE en local :
--   1) une copropriété « boucle d'or » avec une finance complète (budget courant
--      validé, appels de fonds, encaissement, facture fournisseur) via la fonction
--      create_test_copro_seeded() — c'est elle qui produit les chiffres du dashboard.
--   2) les 3 comptes démo du login (admin / gestionnaire / jean.dupont, mdp
--      `password123`) avec leur accès (membership) à cette copro.
--
-- ⚠ LOCAL / DEV UNIQUEMENT — mots de passe faibles, RLS désactivée en dev.
--   Ne jamais exécuter sur une base de production.
--
-- IDEMPOTENT : la copro n'est créée que si aucune n'existe ; les users sont
--   guardés par e-mail ; les memberships par (user, copro). Ré-exécution = no-op.
--
-- ⚠ PIÈGE GoTrue : les colonnes de tokens de auth.users DOIVENT valoir '' (et non
--   NULL), sinon le login renvoie « Database error querying schema »
--   (Scan error … converting NULL to string is unsupported).
-- ============================================================================

-- ── Bascule DEV (B1 fail-safe) ──────────────────────────────────────────────
-- La chaîne de migrations vient de rejouer avec la RLS ON (défaut fail-safe :
-- GUC `app.environment` absent sur base fraîche). En LOCAL uniquement, on
-- re-applique la bascule en mode dev → RLS OFF ([[dev_phase_rls]] : phase dev
-- volontaire). Le set_config est de session, mais la bascule elle-même est de
-- la DDL durable. seed.sql n'est JAMAIS rejoué par `db push` cloud → le cloud
-- reste fail-safe, RLS ON + FORCE GL.
-- NB : un `ALTER DATABASE … SET app.environment` persistant est refusé au rôle
-- `postgres` (GUC custom, PG15+). Si une future migration appliquée SEULE via
-- `migration up` re-bascule la RLS ON en local → refaire `db reset`.
select set_config('app.environment', 'development', false);
select public.apply_rls_environment();

-- Contexte service_role : nécessaire pour franchir les gardes is_service_call()
-- des fonctions de seed (create_test_copro_seeded, seed_golden_loop…).
select set_config('request.jwt.claims', '{"role":"service_role"}', false);

do $$
declare
  v_copro   uuid;
  v_cabinet uuid;
  v_uid     uuid;
  acct      record;
begin
  -- 1) Copropriété boucle d'or (une seule — idempotent).
  select id, cabinet_id into v_copro, v_cabinet
  from public.copros order by created_at limit 1;

  if v_copro is null then
    v_copro := public.create_test_copro_seeded('Le Clos Saint-Michel (démo)');
    select cabinet_id into v_cabinet from public.copros where id = v_copro;
  end if;

  -- 2) Comptes démo du login + accès à la copro.
  for acct in
    select * from (values
      ('admin@coproflex.fr',        'Admin Syndic', 'platform_admin'),
      ('gestionnaire@coproflex.fr', 'Gestionnaire', 'gestionnaire'),
      ('jean.dupont@email.fr',      'Jean Dupont',  'coproprietaire')
    ) as t(email, full_name, role)
  loop
    select id into v_uid
    from auth.users where email = acct.email and is_sso_user = false;

    if v_uid is null then
      v_uid := gen_random_uuid();

      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change,
        email_change_token_new, email_change_token_current,
        phone_change, phone_change_token, reauthentication_token
      ) values (
        v_uid, '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', acct.email,
        crypt('password123', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', acct.full_name),
        '', '', '', '', '', '', '', ''
      );

      -- Identité e-mail (requise par GoTrue pour le login par mot de passe).
      insert into auth.identities (
        provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        v_uid::text, v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', acct.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;

    -- Le profil est créé par le trigger handle_new_user ; on le rattache au cabinet
    -- de la copro (nécessaire pour l'accès d'un gestionnaire).
    update public.profiles
    set cabinet_id = v_cabinet, full_name = acct.full_name
    where id = v_uid;

    -- Accès à la copro (platform_admin voit tout ; gestionnaire/coproprietaire ciblés).
    insert into public.memberships (id, user_id, copro_id, role, created_at)
    select gen_random_uuid(), v_uid, v_copro, acct.role::public.membership_role, now()
    where not exists (
      select 1 from public.memberships
      where user_id = v_uid and copro_id = v_copro
    );
  end loop;
end $$;

-- Nettoyage du contexte service_role.
select set_config('request.jwt.claims', '', false);
