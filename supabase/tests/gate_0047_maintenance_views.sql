-- Gate 0047 : vues maintenance + KPIs portefeuille (contrat de compat front) + enum ag_draft_type étendu.
-- DURCIE suite à la revue adversariale 2026-06-11 (mutations M1-M6 : chaque mapping annoncé est
-- asserté en VALEUR, les filtres ont des tests NÉGATIFS, les KPIs financiers sont croisés avec la
-- source canonique fn_dashboard_kpis sur une copro SEEDÉE — plus aucun IS NOT NULL paresseux).
-- Auto-rollback (ROLLBACK_TEST_OK). Lancé par db-test.mjs (contexte service_role préfixé).
DO $$
DECLARE
  v_copro uuid; v_tiers uuid; v_notaire uuid; v_contract uuid; v_contract_echu uuid;
  v_contract_loin uuid; v_so uuid; v_log uuid; v_log_done uuid;
  v_inv1 uuid; v_inv2 uuid; v_domain uuid; v_ag uuid; v_period uuid;
  v_n int; v_txt text; v_arr text[]; v_num numeric; v_fn jsonb;
  v_d1 timestamptz := now() + interval '2 day';
  v_d2 timestamptz := now() - interval '1 hour';
BEGIN
  -- (1) Les 8 vues existent en security_invoker
  SELECT count(*) INTO v_n
  FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND c.relkind = 'v'
    AND c.relname IN ('v_providers_overview','v_contracts_overview','v_contracts_alerts',
                      'v_logbook_overview','v_logbook_alerts','v_service_orders_overview',
                      'v_maintenance_stats','v_dashboard_kpis')
    AND coalesce((SELECT bool_or(opt ILIKE 'security_invoker%true%') FROM unnest(c.reloptions) opt), false);
  IF v_n <> 8 THEN RAISE EXCEPTION 'ASSERT FAIL : vues security_invoker %/8', v_n; END IF;

  -- (2) Enum ag_draft_type étendu (les 7 types re-perdus du front sont revenus)
  SELECT count(*) INTO v_n FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
   WHERE t.typname = 'ag_draft_type'
     AND e.enumlabel IN ('roles','session','variables','resolution_vars','signataires',
                         'resolutions_results','resolutions_passerelles');
  IF v_n <> 7 THEN RAISE EXCEPTION 'ASSERT FAIL : ag_draft_type extension %/7', v_n; END IF;

  -- (3) Copro SEEDÉE (boucle d'or : GL non vide -> les assertions financières ont du grain)
  v_copro := create_clean_test_copro_seeded('mview');
  SELECT id INTO v_period FROM public.accounting_periods
   WHERE copro_id = v_copro AND status = 'open' LIMIT 1;
  IF v_period IS NULL THEN RAISE EXCEPTION 'SETUP FAIL : pas de période ouverte sur la copro harnais'; END IF;

  -- Référentiel : l'absence du seed work_domain (0004) est une RÉGRESSION, pas un cas à réparer.
  SELECT id INTO v_domain FROM public.work_domain WHERE slug = 'plomberie';
  IF v_domain IS NULL THEN
    RAISE EXCEPTION 'SETUP FAIL : référentiel work_domain non seedé (migration 0004 absente ou driftée)';
  END IF;

  INSERT INTO public.tiers (copro_id, name, category, is_provider, domain_ids, email, phone)
  VALUES (v_copro, 'Plombier Gate', 'externe', true, ARRAY[v_domain], 'p@x.fr', '0102030405')
  RETURNING id INTO v_tiers;
  -- Témoin NÉGATIF : un tiers NON prestataire ne doit jamais apparaître dans le hub.
  INSERT INTO public.tiers (copro_id, name, category, is_provider, is_notary)
  VALUES (v_copro, 'Notaire Gate', 'externe', false, true)
  RETURNING id INTO v_notaire;

  -- (4) v_providers_overview : category compat 'coproflex', domains slugs,
  --     coproflex_label=false (champ dé-scopé), filtre is_provider prouvé en négatif.
  SELECT category, domains INTO v_txt, v_arr FROM public.v_providers_overview WHERE id = v_tiers;
  IF v_txt IS DISTINCT FROM 'coproflex' THEN
    RAISE EXCEPTION 'ASSERT FAIL : category externe -> % (attendu coproflex)', v_txt;
  END IF;
  IF v_arr IS DISTINCT FROM ARRAY['plomberie'] THEN
    RAISE EXCEPTION 'ASSERT FAIL : domains % (attendu {plomberie})', v_arr;
  END IF;
  SELECT count(*) INTO v_n FROM public.v_providers_overview
   WHERE id = v_tiers AND coproflex_label = false AND email = 'p@x.fr' AND phone = '0102030405';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_providers_overview coproflex_label/contact'; END IF;
  SELECT count(*) INTO v_n FROM public.v_providers_overview WHERE id = v_notaire;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : tiers non-prestataire visible dans v_providers_overview'; END IF;

  -- (5) v_contracts_overview : title<-label, contract_number<-reference, contract_type<-slug,
  --     description<-observations, provider_name, renewal_alert. Le trigger métier bascule
  --     automatiquement en 'to_renew' (fenêtre de préavis) — prouvé au passage.
  INSERT INTO public.contracts (copro_id, tiers_id, label, reference, domain_id, observations,
                                start_date, end_date, status, notice_months, annual_amount)
  VALUES (v_copro, v_tiers, 'Contrat plomberie', 'C-001', v_domain, 'Obs gate',
          current_date - 300, current_date + 20, 'active', 2, 1200)
  RETURNING id INTO v_contract;

  SELECT count(*) INTO v_n FROM public.v_contracts_overview
   WHERE id = v_contract AND title = 'Contrat plomberie' AND contract_number = 'C-001'
     AND contract_type = 'plomberie' AND provider_name = 'Plombier Gate'
     AND description = 'Obs gate' AND status = 'to_renew' AND renewal_alert = true;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_contracts_overview compat'; END IF;

  -- (5b) v_contracts_alerts : alert_level en VALEUR ('warning' pour préavis en cours,
  --      'critical' pour échu) + fenêtre 180 jours prouvée en négatif.
  SELECT alert_level INTO v_txt FROM public.v_contracts_alerts WHERE id = v_contract;
  IF v_txt IS DISTINCT FROM 'warning' THEN
    RAISE EXCEPTION 'ASSERT FAIL : alert_level % (attendu warning)', v_txt;
  END IF;
  INSERT INTO public.contracts (copro_id, tiers_id, label, domain_id, start_date, end_date, status, notice_months)
  VALUES (v_copro, v_tiers, 'Contrat échu', v_domain, current_date - 400, current_date - 10, 'active', 2)
  RETURNING id INTO v_contract_echu;
  SELECT alert_level INTO v_txt FROM public.v_contracts_alerts WHERE id = v_contract_echu;
  IF v_txt IS DISTINCT FROM 'critical' THEN
    RAISE EXCEPTION 'ASSERT FAIL : alert_level échu % (attendu critical)', v_txt;
  END IF;
  INSERT INTO public.contracts (copro_id, tiers_id, label, domain_id, start_date, end_date, status, notice_months)
  VALUES (v_copro, v_tiers, 'Contrat lointain', v_domain, current_date, current_date + 200, 'active', 2)
  RETURNING id INTO v_contract_loin;
  SELECT count(*) INTO v_n FROM public.v_contracts_alerts WHERE id = v_contract_loin;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : contrat hors fenêtre 180j présent dans les alertes'; END IF;

  -- (6) v_service_orders_overview : dates en VALEUR (subject<-title, planned<-scheduled_at,
  --     accepted_at<-acknowledged_at), provider_email/phone, et liaison facture :
  --     seules les factures POSTÉES/PAYÉES comptent, la plus récente PAR DATE DE FACTURE gagne,
  --     un brouillon récent ne masque rien, l'avoir se déduit du cumul, 1 seule ligne par OS.
  INSERT INTO public.service_orders (copro_id, tiers_id, order_number, title, order_type,
                                     origin, status, urgency, scheduled_at, acknowledged_at)
  VALUES (v_copro, v_tiers, 'OS-GATE-1', 'Fuite cave', 'classique',
          'syndic', 'scheduled', 'high', v_d1, v_d2)
  RETURNING id INTO v_so;

  INSERT INTO public.supplier_invoices (copro_id, tiers_id, period_id, label, invoice_number,
                                        invoice_date, total_amount, status, doc_kind, service_order_id)
  VALUES (v_copro, v_tiers, v_period, 'Acompte', 'F-GATE-1', current_date - 2, 100, 'posted', 'invoice', v_so)
  RETURNING id INTO v_inv1;
  INSERT INTO public.supplier_invoices (copro_id, tiers_id, period_id, label, invoice_number,
                                        invoice_date, total_amount, status, doc_kind, service_order_id)
  VALUES (v_copro, v_tiers, v_period, 'Solde', 'F-GATE-2', current_date - 1, 60, 'posted', 'invoice', v_so)
  RETURNING id INTO v_inv2;
  -- Brouillon PLUS RÉCENT : ne doit PAS masquer la facture postée.
  INSERT INTO public.supplier_invoices (copro_id, tiers_id, period_id, label, invoice_number,
                                        invoice_date, total_amount, status, doc_kind, service_order_id)
  VALUES (v_copro, v_tiers, v_period, 'Brouillon piège', 'F-GATE-3', current_date, 999, 'draft', 'invoice', v_so);
  -- Avoir posté : déduit du cumul facturé.
  INSERT INTO public.supplier_invoices (copro_id, tiers_id, period_id, label, invoice_number,
                                        invoice_date, total_amount, status, doc_kind, service_order_id)
  VALUES (v_copro, v_tiers, v_period, 'Avoir', 'AV-GATE-1', current_date, 30, 'posted', 'credit_note', v_so);

  SELECT count(*) INTO v_n FROM public.v_service_orders_overview WHERE id = v_so;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : OS dupliqué/absent dans la vue (% lignes)', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.v_service_orders_overview
   WHERE id = v_so AND subject = 'Fuite cave' AND provider_name = 'Plombier Gate'
     AND provider_email = 'p@x.fr' AND provider_phone = '0102030405'
     AND planned_intervention_date = v_d1 AND accepted_at = v_d2
     AND supplier_invoice_id = v_inv2 AND invoice_number = 'F-GATE-2' AND invoice_amount = 60
     AND invoices_count = 2 AND invoiced_total = 130;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_service_orders_overview compat/facture'; END IF;

  -- (7) v_logbook_overview / v_logbook_alerts : domain slug, is_overdue, relations,
  --     filtre des alertes prouvé en négatif (une entrée terminée n'alerte pas).
  INSERT INTO public.logbook_entries (copro_id, tiers_id, title, entry_type, category, status,
                                      happened_at, next_due_at, domain_id, contract_id, service_order_id)
  VALUES (v_copro, v_tiers, 'Contrôle chaudière', 'controle', 'reglementaire', 'planifiee',
          current_date - 10, current_date - 1, v_domain, v_contract, v_so)
  RETURNING id INTO v_log;
  INSERT INTO public.logbook_entries (copro_id, tiers_id, title, entry_type, category, status,
                                      happened_at, next_due_at)
  VALUES (v_copro, v_tiers, 'Entretien terminé', 'maintenance', 'courante', 'terminee',
          current_date - 30, current_date - 5)
  RETURNING id INTO v_log_done;

  SELECT count(*) INTO v_n FROM public.v_logbook_overview
   WHERE id = v_log AND domain = 'plomberie' AND provider_name = 'Plombier Gate'
     AND is_overdue = true AND order_number = 'OS-GATE-1' AND contract_title = 'Contrat plomberie';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_logbook_overview compat'; END IF;
  SELECT count(*) INTO v_n FROM public.v_logbook_alerts WHERE id = v_log;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_logbook_alerts filtre positif'; END IF;
  SELECT count(*) INTO v_n FROM public.v_logbook_alerts WHERE id = v_log_done;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : entrée terminée présente dans v_logbook_alerts'; END IF;

  -- (8) v_maintenance_stats : compteurs en valeur — le notaire ne compte pas comme prestataire,
  --     'to_renew' reste compté actif, total annuel inclut les contrats en préavis.
  SELECT count(*) INTO v_n FROM public.v_maintenance_stats
   WHERE copro_id = v_copro AND active_providers_count = 1
     AND active_contracts_count >= 2 AND contracts_to_renew_count >= 1
     AND pending_orders_count = 1 AND contracts_annual_total >= 1200;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_maintenance_stats compteurs'; END IF;

  -- (9) v_dashboard_kpis : croisement avec la SOURCE CANONIQUE fn_dashboard_kpis (0028)
  --     sur la copro seedée (GL non vide), impayés croisés avec v_unpaid_by_lot,
  --     et prochaine AG en valeur (insertion d'une AG convoquée future).
  v_fn := public.fn_dashboard_kpis(v_copro, v_period);
  SELECT current_balance INTO v_num FROM public.v_dashboard_kpis WHERE copro_id = v_copro;
  IF v_num IS DISTINCT FROM (v_fn->>'tresorerie')::numeric THEN
    RAISE EXCEPTION 'ASSERT FAIL : current_balance % <> fn.tresorerie %', v_num, v_fn->>'tresorerie';
  END IF;
  SELECT unpaid_total INTO v_num FROM public.v_dashboard_kpis WHERE copro_id = v_copro;
  IF v_num IS DISTINCT FROM (v_fn->>'total_impayes')::numeric THEN
    RAISE EXCEPTION 'ASSERT FAIL : unpaid_total % <> fn.total_impayes %', v_num, v_fn->>'total_impayes';
  END IF;
  SELECT critical_unpaid_count INTO v_n FROM public.v_dashboard_kpis WHERE copro_id = v_copro;
  IF v_n IS DISTINCT FROM (SELECT count(*)::int FROM public.v_unpaid_by_lot
                            WHERE copro_id = v_copro AND total_unpaid > 0) THEN
    RAISE EXCEPTION 'ASSERT FAIL : critical_unpaid_count % <> nb lots en impayé', v_n;
  END IF;

  INSERT INTO public.ag_meetings (copro_id, title, meeting_date, meeting_type, status)
  VALUES (v_copro, 'AG Gate', current_date + 30, 'ordinary', 'convoked')
  RETURNING id INTO v_ag;
  SELECT count(*) INTO v_n FROM public.v_dashboard_kpis
   WHERE copro_id = v_copro AND next_ag_id = v_ag AND next_ag_title = 'AG Gate';
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : next_ag_* (AG convoquée future non remontée)'; END IF;
  SELECT count(*) INTO v_n FROM public.v_dashboard_kpis WHERE copro_id = v_copro;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : v_dashboard_kpis % lignes pour la copro (attendu 1)', v_n; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
