-- ============================================================
-- HARNAIS DE TEST JETABLE — create_test_copro / create_test_copro_seeded
-- ============================================================
-- create_test_copro(tag) : clone le SQUELETTE de la boucle d'or (22222222,
--   immuable, lecture seule) dans une copro neuve « HARNESS … » + exercice
--   ouvert, et renvoie son id. Fondations seulement (copro, plan comptable,
--   copropriétaires, lots, propriétaires, clés, fournisseur) — aucun flux.
-- create_test_copro_seeded(tag, budget, impayés) : clone + seed_golden_loop en
--   un appel ; renvoie {copro_id, period_id, seed}.
-- Réutilisable pour V1/V4 (tester clôture, FIFO, etc.) sur données jetables,
-- sans jamais toucher la boucle d'or ni le témoin 11111111.

CREATE OR REPLACE FUNCTION public.create_test_copro(p_tag text DEFAULT 'default')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src    uuid := '22222222-aaaa-bbbb-cccc-222222222222';  -- squelette boucle d'or (immuable, lecture seule)
  v_new    uuid := gen_random_uuid();
  v_period uuid := gen_random_uuid();
  v_year   int  := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  -- 1. copro (skeleton, pas d'état financier)
  INSERT INTO copros (id, name, address, city, postal_code, siret, num_immatriculation,
                      date_reglement, buildings_count, lots_count, total_tantiemes,
                      annee_construction, exercice_debut, cabinet_id, onboarding_step, onboarding_max_step)
  SELECT v_new, 'HARNESS '||substr(v_new::text,1,8)||' ('||p_tag||')', address, city, postal_code, siret, NULL,
         date_reglement, buildings_count, lots_count, total_tantiemes,
         annee_construction, exercice_debut, cabinet_id, onboarding_step, onboarding_max_step
  FROM copros WHERE id = v_src;

  -- 2. accounts (two-pass pour la self-FK parent_id)
  CREATE TEMP TABLE _map_acc (old_id uuid, new_id uuid) ON COMMIT DROP;
  INSERT INTO _map_acc SELECT id, gen_random_uuid() FROM accounts WHERE copro_id = v_src;
  INSERT INTO accounts (id, copro_id, code, name, account_type, is_active, parent_id,
                        is_system, description, banque, iban, bic, initial_balance)
  SELECT m.new_id, v_new, a.code, a.name, a.account_type, a.is_active, NULL,
         a.is_system, a.description, a.banque, a.iban, a.bic, a.initial_balance
  FROM accounts a JOIN _map_acc m ON m.old_id = a.id WHERE a.copro_id = v_src;
  UPDATE accounts t SET parent_id = mp.new_id
  FROM accounts a JOIN _map_acc mc ON mc.old_id = a.id
                  JOIN _map_acc mp ON mp.old_id = a.parent_id
  WHERE a.copro_id = v_src AND a.parent_id IS NOT NULL AND t.id = mc.new_id;

  -- 3. coproprietaires (user_id forcé NULL -> évite FK profiles)
  CREATE TEMP TABLE _map_co (old_id uuid, new_id uuid) ON COMMIT DROP;
  INSERT INTO _map_co SELECT id, gen_random_uuid() FROM coproprietaires WHERE copro_id = v_src;
  INSERT INTO coproprietaires (id, copro_id, user_id, is_company, company_name, civility,
                               first_name, last_name, email, phone, mobile, address_line1, address_line2,
                               city, postal_code, country, prefers_email, prefers_paper, notes, is_resident)
  SELECT m.new_id, v_new, NULL, c.is_company, c.company_name, c.civility,
         c.first_name, c.last_name, c.email, c.phone, c.mobile, c.address_line1, c.address_line2,
         c.city, c.postal_code, c.country, c.prefers_email, c.prefers_paper, c.notes, c.is_resident
  FROM coproprietaires c JOIN _map_co m ON m.old_id = c.id WHERE c.copro_id = v_src;

  -- 4. lots (building_id forcé NULL -> table buildings hors périmètre)
  CREATE TEMP TABLE _map_lot (old_id uuid, new_id uuid) ON COMMIT DROP;
  INSERT INTO _map_lot SELECT id, gen_random_uuid() FROM lots WHERE copro_id = v_src;
  INSERT INTO lots (id, copro_id, building_id, ref, type, floor, surface, tantiemes_generaux,
                    tantiemes_escalier, tantiemes_ascenseur, tantiemes_chauffage, description)
  SELECT m.new_id, v_new, NULL, l.ref, l.type, l.floor, l.surface, l.tantiemes_generaux,
         l.tantiemes_escalier, l.tantiemes_ascenseur, l.tantiemes_chauffage, l.description
  FROM lots l JOIN _map_lot m ON m.old_id = l.id WHERE l.copro_id = v_src;

  -- 5. lot_owners (remap lot_id + coproprietaire_id)
  INSERT INTO lot_owners (id, lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date, end_date)
  SELECT gen_random_uuid(), ml.new_id, mc.new_id, v_new, lo.share_percent, lo.is_primary, lo.start_date, lo.end_date
  FROM lot_owners lo
  JOIN _map_lot ml ON ml.old_id = lo.lot_id
  JOIN _map_co  mc ON mc.old_id = lo.coproprietaire_id
  WHERE lo.copro_id = v_src;

  -- 6. repartition_keys
  CREATE TEMP TABLE _map_key (old_id uuid, new_id uuid) ON COMMIT DROP;
  INSERT INTO _map_key SELECT id, gen_random_uuid() FROM repartition_keys WHERE copro_id = v_src;
  INSERT INTO repartition_keys (id, copro_id, name, basis, description, is_active, coverage_mode, category, valid_from, valid_to)
  SELECT m.new_id, v_new, rk.name, rk.basis, rk.description, rk.is_active, rk.coverage_mode, rk.category, rk.valid_from, rk.valid_to
  FROM repartition_keys rk JOIN _map_key m ON m.old_id = rk.id WHERE rk.copro_id = v_src;

  -- 7. repartition_key_lines (remap key_id + lot_id)
  INSERT INTO repartition_key_lines (id, key_id, copro_id, lot_id, weight)
  SELECT gen_random_uuid(), mk.new_id, v_new, ml.new_id, rkl.weight
  FROM repartition_key_lines rkl
  JOIN _map_key mk ON mk.old_id = rkl.key_id
  JOIN _map_lot ml ON ml.old_id = rkl.lot_id
  WHERE rkl.copro_id = v_src;

  -- 8. suppliers
  INSERT INTO suppliers (id, copro_id, name, siret, contact, is_active)
  SELECT gen_random_uuid(), v_new, s.name, s.siret, s.contact, s.is_active
  FROM suppliers s WHERE s.copro_id = v_src;

  -- 9. exercice comptable NEUF, ouvert, année courante
  INSERT INTO accounting_periods (id, copro_id, name, start_date, end_date, status)
  VALUES (v_period, v_new, 'Exercice '||v_year, make_date(v_year,1,1), make_date(v_year,12,31), 'open');

  RAISE NOTICE 'HARNESS copro % (period %) prête.', v_new, v_period;
  RETURN v_new;
END;
$function$;

COMMENT ON FUNCTION public.create_test_copro(text) IS
  'Harnais de test : clone le squelette de la boucle d''or (22222222) dans une copro jetable « HARNESS … » + exercice ouvert. Renvoie le nouvel id. Aucune écriture sur les copros immuables.';

-- Wrapper one-shot : clone + seed la boucle financière complète
CREATE OR REPLACE FUNCTION public.create_test_copro_seeded(
  p_tag          text DEFAULT 'default',
  p_budget_total numeric DEFAULT 15000,
  p_unpaid_count integer DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_copro  uuid;
  v_period uuid;
  v_seed   jsonb;
BEGIN
  v_copro := create_test_copro(p_tag);
  SELECT id INTO v_period FROM accounting_periods
   WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  v_seed := seed_golden_loop(v_copro, v_period, p_budget_total, p_unpaid_count);
  RETURN jsonb_build_object('copro_id', v_copro, 'period_id', v_period, 'seed', v_seed);
END;
$function$;

COMMENT ON FUNCTION public.create_test_copro_seeded(text, numeric, integer) IS
  'Harnais one-shot : create_test_copro + seed_golden_loop. Renvoie {copro_id, period_id, seed}.';
