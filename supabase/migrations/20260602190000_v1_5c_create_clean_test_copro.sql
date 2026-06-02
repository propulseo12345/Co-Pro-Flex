-- ============================================================
-- V1.5-C (B1) — Fixture de test PROPRE (née du chemin canonique)
-- ============================================================
-- But : disposer d'une copropriété de test SANS scories historiques, pour
-- prouver que le grand livre produit par le chemin canonique est cohérent
-- (audit_finance_integrity = 0 écart). Contrairement à create_test_copro,
-- on NE clone PAS la boucle d'or 22222222 : on bâtit une structure synthétique
-- minimale (4 lots, 3 copropriétaires, 3 clés) + le plan comptable canonique.
--
-- create_clean_test_copro(p_tag)            -> copro fraîche + provision_copro_chart
--                                              + structure synthétique. Renvoie l'uuid.
-- create_clean_test_copro_seeded(...)       -> + seed_golden_loop (boucle financière).
--                                              Renvoie {copro_id, period_id, seed}.
--
-- Colonnes vérifiées contre create_test_copro existant
-- (20260602098000_review_fix_special_key_determinism.sql:226-308) :
-- copros / coproprietaires / lots / lot_owners / repartition_keys /
-- repartition_key_lines / suppliers / accounting_periods — toutes alignées.

CREATE OR REPLACE FUNCTION public.create_clean_test_copro(p_tag text DEFAULT 'clean')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new    uuid := gen_random_uuid();
  v_period uuid := gen_random_uuid();
  v_year   int  := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_key_gen uuid := gen_random_uuid();
  v_key_eau uuid := gen_random_uuid();
  v_key_asc uuid := gen_random_uuid();
  v_lot_ids uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_co_ids  uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  i int;
BEGIN
  -- 1) Copro fraîche
  INSERT INTO copros (id, name, address, city, postal_code, buildings_count, lots_count, total_tantiemes, exercice_debut)
  VALUES (v_new, 'CLEAN '||substr(v_new::text,1,8)||' ('||p_tag||')', '1 rue du Test', 'Paris', '75001', 1, 4, 1000, '01-01');

  -- 2) Plan comptable CANONIQUE (la routine prod)
  PERFORM provision_copro_chart(v_new);

  -- 3) Copropriétaires (le 1er possède 2 lots)
  INSERT INTO coproprietaires (id, copro_id, is_company, first_name, last_name, email, is_resident) VALUES
    (v_co_ids[1], v_new, false, 'Alice',  'Martin',  'alice@test.fr',  true),
    (v_co_ids[2], v_new, false, 'Bruno',  'Durand',  'bruno@test.fr',  true),
    (v_co_ids[3], v_new, false, 'Chloé',  'Bernard', 'chloe@test.fr',  false);

  -- 4) Lots (250 tantièmes chacun = 1000)
  INSERT INTO lots (id, copro_id, ref, type, floor, tantiemes_generaux) VALUES
    (v_lot_ids[1], v_new, 'A101', 'appartement', 1, 250),
    (v_lot_ids[2], v_new, 'A102', 'appartement', 1, 250),
    (v_lot_ids[3], v_new, 'A201', 'appartement', 2, 250),
    (v_lot_ids[4], v_new, 'A202', 'appartement', 2, 250);

  -- 5) lot_owners (lot1+lot2 -> Alice ; lot3 -> Bruno ; lot4 -> Chloé), primaires
  INSERT INTO lot_owners (id, lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date) VALUES
    (gen_random_uuid(), v_lot_ids[1], v_co_ids[1], v_new, 100, true, make_date(v_year,1,1)),
    (gen_random_uuid(), v_lot_ids[2], v_co_ids[1], v_new, 100, true, make_date(v_year,1,1)),
    (gen_random_uuid(), v_lot_ids[3], v_co_ids[2], v_new, 100, true, make_date(v_year,1,1)),
    (gen_random_uuid(), v_lot_ids[4], v_co_ids[3], v_new, 100, true, make_date(v_year,1,1));

  -- 6) Clés : générale (tous lots) + eau (lot1,2) + ascenseur (lot3,4) — created_at décalé pour ordre déterministe
  INSERT INTO repartition_keys (id, copro_id, name, basis, is_active, coverage_mode, category, created_at) VALUES
    (v_key_gen, v_new, 'Clé générale',   'tantiemes', true, 'all_lots', 'general', now() - interval '3 min'),
    (v_key_eau, v_new, 'Clé eau',        'custom',    true, 'custom',   'special', now() - interval '2 min'),
    (v_key_asc, v_new, 'Clé ascenseur',  'custom',    true, 'custom',   'special', now() - interval '1 min');

  -- 7) key_lines : générale = tantièmes sur 4 lots ; eau = lot1,2 ; ascenseur = lot3,4
  INSERT INTO repartition_key_lines (id, key_id, copro_id, lot_id, weight)
  SELECT gen_random_uuid(), v_key_gen, v_new, v_lot_ids[i], 250 FROM generate_series(1,4) i;
  INSERT INTO repartition_key_lines (id, key_id, copro_id, lot_id, weight) VALUES
    (gen_random_uuid(), v_key_eau, v_new, v_lot_ids[1], 50),
    (gen_random_uuid(), v_key_eau, v_new, v_lot_ids[2], 50);
  INSERT INTO repartition_key_lines (id, key_id, copro_id, lot_id, weight) VALUES
    (gen_random_uuid(), v_key_asc, v_new, v_lot_ids[3], 50),
    (gen_random_uuid(), v_key_asc, v_new, v_lot_ids[4], 50);

  -- 8) Fournisseur + exercice ouvert
  INSERT INTO suppliers (id, copro_id, name, contact, is_active)
  VALUES (gen_random_uuid(), v_new, 'Prestataire Démo', '{}'::jsonb, true);
  INSERT INTO accounting_periods (id, copro_id, name, start_date, end_date, status)
  VALUES (v_period, v_new, 'Exercice '||v_year, make_date(v_year,1,1), make_date(v_year,12,31), 'open');

  RAISE NOTICE 'CLEAN copro % (period %) prête.', v_new, v_period;
  RETURN v_new;
END;
$function$;

COMMENT ON FUNCTION public.create_clean_test_copro(text) IS
  'Fixture de test PROPRE : copro fraîche + provision_copro_chart + structure synthétique (4 lots, 3 copros, 3 clés). Ne clone pas 22222222.';

-- ------------------------------------------------------------
-- Variante seedée : + seed_golden_loop (boucle financière canonique)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_clean_test_copro_seeded(
  p_tag text DEFAULT 'clean',
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
  v_copro := create_clean_test_copro(p_tag);
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  v_seed := seed_golden_loop(v_copro, v_period, p_budget_total, p_unpaid_count);
  RETURN jsonb_build_object('copro_id', v_copro, 'period_id', v_period, 'seed', v_seed);
END;
$function$;

COMMENT ON FUNCTION public.create_clean_test_copro_seeded(text, numeric, integer) IS
  'create_clean_test_copro + seed_golden_loop (boucle financière canonique). Renvoie {copro_id, period_id, seed}.';
