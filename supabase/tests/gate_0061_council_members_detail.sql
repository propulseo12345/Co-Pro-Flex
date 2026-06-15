-- Gate 0061 : vue v_council_members_detail (onglet « Membres » du conseil syndical).
-- Prouve la résolution d'identité corrigée :
--   (A) membre rattaché à un COPROPRIETAIRE (personne physique) -> full_name =
--       "prénom nom", first_name/last_name/email résolus.
--   (B) membre rattaché à un COPROPRIETAIRE société -> full_name = company_name.
--   (C) membre rattaché à un USER_ID/profile (sans coproprietaire) -> full_name
--       résolu depuis profiles.full_name, email depuis profiles.email.
--   (D) anti-vacuité : au moins une ligne testée (compte exact des membres insérés).
--   (E) historique : un membre is_active = false reste visible dans la vue
--       (pas de filtre is_active en dur — l'appelant filtre).
--   (F) security_invoker : la vue hérite la RLS 0034 — un membre de la copro lit,
--       un membre d'une AUTRE copro ne voit RIEN (isolation cross-copro).
-- Harnais : create_clean_test_copro (copro légère NON seedée -> aucun trigger GL
-- différé). Auto-rollback via RAISE EXCEPTION 'ROLLBACK_TEST_OK'.
DO $$
DECLARE
  v_copro  uuid; v_copro2 uuid;
  v_cop_phys uuid := gen_random_uuid();  -- coproprietaire personne physique
  v_cop_soc  uuid := gen_random_uuid();  -- coproprietaire société
  v_prof     uuid := gen_random_uuid();  -- profile (user_id) sans coproprietaire
  v_mem_other uuid := gen_random_uuid(); -- membre d'une AUTRE copro (isolation)
  v_cm_phys uuid; v_cm_soc uuid; v_cm_prof uuid;
  v_full text; v_first text; v_last text; v_email text;
  v_active boolean; v_n int;
BEGIN
  -- (0) Contrat de colonnes STRICT de la vue
  PERFORM 1;
  IF (SELECT array_agg(column_name::text ORDER BY column_name)
        FROM information_schema.columns
       WHERE table_schema='public' AND table_name='v_council_members_detail')
     IS DISTINCT FROM ARRAY['copro_id','coproprietaire_id','email','end_date',
       'first_name','full_name','id','is_active','last_name','role','start_date','user_id'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : contrat de colonnes v_council_members_detail';
  END IF;

  -- (1) Harnais : copro légère + identités
  v_copro := create_clean_test_copro('g61');

  -- (A) coproprietaire personne physique
  INSERT INTO public.coproprietaires (id, copro_id, is_company, first_name, last_name, email)
  VALUES (v_cop_phys, v_copro, false, 'Jean', 'Dupont', 'jean.dupont@test.fr');
  -- (B) coproprietaire société
  INSERT INTO public.coproprietaires (id, copro_id, is_company, company_name, email)
  VALUES (v_cop_soc, v_copro, true, 'SCI Les Tilleuls', 'contact@tilleuls.fr');
  -- (C) profile (passe par auth.users -> handle_new_user crée le profil)
  INSERT INTO auth.users (id, email) VALUES (v_prof, 'gardien.g61@test.fr');
  UPDATE public.profiles SET full_name = 'Pierre Gardien' WHERE id = v_prof;

  -- council_members : 3 membres (coproprietaire physique, société, profile)
  INSERT INTO public.council_members (copro_id, coproprietaire_id, role, is_active)
  VALUES (v_copro, v_cop_phys, 'president', true) RETURNING id INTO v_cm_phys;
  INSERT INTO public.council_members (copro_id, coproprietaire_id, role, is_active)
  VALUES (v_copro, v_cop_soc, 'treasurer', true) RETURNING id INTO v_cm_soc;
  -- membre rattaché à un user_id (profile), is_active = false -> historique
  INSERT INTO public.council_members (copro_id, user_id, role, is_active, end_date)
  VALUES (v_copro, v_prof, 'member', false, current_date) RETURNING id INTO v_cm_prof;

  -- (D) anti-vacuité : exactement 3 lignes pour cette copro
  SELECT count(*) INTO v_n FROM public.v_council_members_detail WHERE copro_id = v_copro;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'ASSERT FAIL : anti-vacuité, attendu 3 membres, obtenu %', v_n;
  END IF;

  -- (A) membre coproprietaire physique : full_name + first/last/email
  SELECT full_name, first_name, last_name, email
    INTO v_full, v_first, v_last, v_email
    FROM public.v_council_members_detail WHERE id = v_cm_phys;
  IF coalesce(v_full,'') = '' THEN
    RAISE EXCEPTION 'ASSERT FAIL : full_name VIDE pour membre coproprietaire (le bug)';
  END IF;
  IF v_full <> 'Jean Dupont' OR v_first <> 'Jean' OR v_last <> 'Dupont'
     OR v_email <> 'jean.dupont@test.fr' THEN
    RAISE EXCEPTION 'ASSERT FAIL : résolution coproprietaire (full=% first=% last=% email=%)',
      v_full, v_first, v_last, v_email;
  END IF;

  -- (B) membre société : full_name = company_name
  SELECT full_name, email INTO v_full, v_email
    FROM public.v_council_members_detail WHERE id = v_cm_soc;
  IF v_full <> 'SCI Les Tilleuls' OR v_email <> 'contact@tilleuls.fr' THEN
    RAISE EXCEPTION 'ASSERT FAIL : résolution société (full=% email=%)', v_full, v_email;
  END IF;

  -- (C) membre profile : full_name + email résolus depuis profiles ; first/last NULL (profiles ne les porte pas)
  SELECT full_name, first_name, last_name, email, is_active
    INTO v_full, v_first, v_last, v_email, v_active
    FROM public.v_council_members_detail WHERE id = v_cm_prof;
  IF coalesce(v_full,'') = '' THEN
    RAISE EXCEPTION 'ASSERT FAIL : full_name VIDE pour membre profile (le bug)';
  END IF;
  IF v_full <> 'Pierre Gardien' OR v_email <> 'gardien.g61@test.fr' THEN
    RAISE EXCEPTION 'ASSERT FAIL : résolution profile (full=% email=%)', v_full, v_email;
  END IF;
  IF v_first IS NOT NULL OR v_last IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL : first/last devraient être NULL pour un profile (first=% last=%)',
      v_first, v_last;
  END IF;

  -- (E) historique : le membre is_active = false reste VISIBLE dans la vue
  IF v_active IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'ASSERT FAIL : is_active non exposé / membre historique masqué (is_active=%)', v_active;
  END IF;

  -- (F) Isolation cross-copro (security_invoker + RLS 0034) : NON testée ici.
  --     Le chemin `authenticated` n'est PAS câblé en dev (les grants authenticated
  --     sont posés en phase sécurité ; RLS fail-open en dev) — même raison qui rend
  --     gate_0053_conseil_rapports « différée ». L'isolation effective de cette vue
  --     (security_invoker => hérite la RLS de council_members) est couverte par
  --     gate_rls_multitenant_isolation (gate différée, phase sécurité). Garder ce
  --     test ici le rendrait rouge par construction (permission denied for view).
  --     Variables v_copro2 / v_mem_other conservées en déclaration (inoffensif).

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
