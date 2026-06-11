-- GATE — GARDES D'AUTORISATION DES RPC SECURITY DEFINER (0045 / B1 sécurité)
-- ============================================================================================
-- Prouve que les 7 fonctions DEFINER corrigées en 0045 refusent (SQLSTATE 42501) un appel d'un
-- gestionnaire du cabinet A portant sur un objet du cabinet B, ET réussissent sur les objets de
-- la copro de A (anti deny-all). La garde vit dans le CORPS de la fonction (is_service_call OR
-- user_has_copro_access/manager) et ne dépend PAS de la RLS : on pose simplement le JWT du
-- gestionnaire A (request.jwt.claims.sub → auth.uid ; role 'authenticated' → is_service_call=false).
--
-- Lancé par db-test.mjs (contexte service_role préfixé). Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro_a uuid; v_copro_b uuid; v_cab_a uuid;
  v_mgr_a   uuid := gen_random_uuid();
  v_key_b   uuid; v_inv_b uuid; v_date_b date;
  v_key_a   uuid; v_inv_a uuid; v_date_a date;
  v_n int; v_txt text; v_uuid uuid; v_bool boolean; v_num numeric;
  v_denied int := 0; v_ok int := 0;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro_a := create_clean_test_copro_seeded('def-guard-A');
  v_copro_b := create_clean_test_copro_seeded('def-guard-B');
  SELECT cabinet_id INTO v_cab_a FROM public.copros WHERE id = v_copro_a;

  -- Objets de chaque copro (le seed crée clés de répartition, facture fournisseur, exercice).
  SELECT id INTO v_key_b FROM public.repartition_keys  WHERE copro_id = v_copro_b LIMIT 1;
  SELECT id INTO v_inv_b FROM public.supplier_invoices WHERE copro_id = v_copro_b LIMIT 1;
  SELECT start_date INTO v_date_b FROM public.accounting_periods WHERE copro_id = v_copro_b ORDER BY start_date LIMIT 1;
  SELECT id INTO v_key_a FROM public.repartition_keys  WHERE copro_id = v_copro_a LIMIT 1;
  SELECT id INTO v_inv_a FROM public.supplier_invoices WHERE copro_id = v_copro_a LIMIT 1;
  SELECT start_date INTO v_date_a FROM public.accounting_periods WHERE copro_id = v_copro_a ORDER BY start_date LIMIT 1;

  IF v_key_b IS NULL OR v_inv_b IS NULL OR v_date_b IS NULL
     OR v_key_a IS NULL OR v_inv_a IS NULL OR v_date_a IS NULL THEN
    RAISE EXCEPTION 'SETUP FAIL : objets seed manquants (key_b=% inv_b=% per_b=% key_a=% inv_a=% per_a=%)',
      v_key_b, v_inv_b, v_date_b, v_key_a, v_inv_a, v_date_a;
  END IF;

  -- Gestionnaire du cabinet A.
  INSERT INTO auth.users (id, email) VALUES (v_mgr_a, 'mgr.dg.' || substr(v_mgr_a::text,1,8) || '@test.fr');
  UPDATE public.profiles SET cabinet_id = v_cab_a WHERE id = v_mgr_a;
  INSERT INTO public.memberships (user_id, copro_id, role) VALUES (v_mgr_a, v_copro_a, 'gestionnaire');

  -- Bascule sur le JWT du gestionnaire A (is_service_call=false, auth.uid=mgr_a).
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_mgr_a, 'role','authenticated')::text, true);

  -- ===================== (1) REFUS cross-tenant : 42501 sur les objets de B =====================
  -- Helper macro : chaque appel doit lever insufficient_privilege (42501).
  BEGIN PERFORM 1 FROM public.compute_repartition_shares(v_key_b);
    RAISE EXCEPTION 'NO_DENY:compute_repartition_shares';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;

  BEGIN v_num := public.get_supplier_invoice_paid_amount(v_inv_b);
    RAISE EXCEPTION 'NO_DENY:get_supplier_invoice_paid_amount';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;

  BEGIN v_num := public.supplier_invoice_net_payable(v_inv_b);
    RAISE EXCEPTION 'NO_DENY:supplier_invoice_net_payable';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;

  BEGIN v_uuid := public.resolve_lot_tiers_account(v_copro_b, 'current');
    RAISE EXCEPTION 'NO_DENY:resolve_lot_tiers_account';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;

  BEGIN v_uuid := public.get_period_for_date(v_copro_b, v_date_b);
    RAISE EXCEPTION 'NO_DENY:get_period_for_date';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;

  BEGIN v_bool := public.repartition_key_is_complete(v_key_b);
    RAISE EXCEPTION 'NO_DENY:repartition_key_is_complete';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;

  BEGIN v_txt := public.generate_service_order_number(v_copro_b);
    RAISE EXCEPTION 'NO_DENY:generate_service_order_number';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;

  IF v_denied <> 7 THEN
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    RAISE EXCEPTION 'ASSERT FAIL : seulement %/7 RPC ont refusé l''objet du cabinet B', v_denied;
  END IF;

  -- ===================== (2) PREUVE POSITIVE : succès sur les objets de A =====================
  -- (anti deny-all : le gestionnaire A garde l'usage normal de SA copro)
  PERFORM 1 FROM public.compute_repartition_shares(v_key_a);                 v_ok := v_ok + 1;
  v_num  := public.get_supplier_invoice_paid_amount(v_inv_a);                v_ok := v_ok + 1;
  v_num  := public.supplier_invoice_net_payable(v_inv_a);                    v_ok := v_ok + 1;
  v_uuid := public.resolve_lot_tiers_account(v_copro_a, 'current');          v_ok := v_ok + 1;
  v_uuid := public.get_period_for_date(v_copro_a, v_date_a);                 v_ok := v_ok + 1;
  v_bool := public.repartition_key_is_complete(v_key_a);                     v_ok := v_ok + 1;
  v_txt  := public.generate_service_order_number(v_copro_a);                 v_ok := v_ok + 1;

  IF v_ok <> 7 THEN
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    RAISE EXCEPTION 'RÉGRESSION : seulement %/7 RPC réussissent sur la copro de A', v_ok;
  END IF;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN
    RAISE NOTICE 'OK : 7/7 RPC DEFINER gardées (refus cross-tenant + succès intra-copro)';
  ELSIF SQLERRM LIKE 'NO_DENY:%' THEN
    RAISE EXCEPTION 'FUITE : la RPC % n''a PAS refusé l''objet du cabinet B (garde absente)', split_part(SQLERRM, ':', 2);
  ELSE
    RAISE;
  END IF;
END $$;
