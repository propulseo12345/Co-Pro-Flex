-- Gate 0065 : RPC pouvoirs AG (get/save/delete/update_justificatif) sur ag_attendance.
-- Prouve : (1) save_ag_pouvoir crée une ligne proxy (mandant représenté par mandataire) ;
-- (2) get_ag_pouvoirs relit au format PouvoirDB (mandant/mandataire ids+noms+tantiemes,
-- signed_at) ; (3) garde art.22 : le 4e pouvoir d'un MÊME mandataire est REFUSÉ (23514) ;
-- (4) UPSERT sur (ag_id, mandant) ne duplique pas la ligne mandant ET préserve une présence
-- réelle existante (lot_ids/tantiemes intacts, juste basculée en proxy) ; (5) delete_ag_pouvoir
-- révoque (presence -> 'absent', champs mandat vidés) sans perdre la ligne ; (6) justificatif
-- crée un document GED et pointe proxy_document_id ; (7) anti-vacuité. Auto-rollback.
-- Contexte service_role posé par le runner.
DO $$
DECLARE
  v_copro uuid;
  v_ag    uuid;
  v_mand  uuid;                       -- le mandataire (reçoit les pouvoirs)
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_m4 uuid;  -- 4 mandants distincts
  v_lot uuid;
  v_res jsonb;
  v_pid1 uuid; v_pid2 uuid; v_att_id uuid;
  v_n int;
  v_signed timestamptz := timestamptz '2026-05-01 10:00:00+00';
  v_rec record;
  v_doc uuid;
  v_key uuid;
BEGIN
  -- (1) Harnais léger : copro vide + AG + 5 copropriétaires (1 mandataire + 4 mandants)
  v_copro := create_clean_test_copro('g65');

  INSERT INTO public.coproprietaires (copro_id, is_company, first_name, last_name)
  VALUES (v_copro, false, 'Max',   'Mandataire') RETURNING id INTO v_mand;
  INSERT INTO public.coproprietaires (copro_id, is_company, first_name, last_name)
  VALUES (v_copro, false, 'Un',    'Mandant')    RETURNING id INTO v_m1;
  INSERT INTO public.coproprietaires (copro_id, is_company, first_name, last_name)
  VALUES (v_copro, false, 'Deux',  'Mandant')    RETURNING id INTO v_m2;
  INSERT INTO public.coproprietaires (copro_id, is_company, first_name, last_name)
  VALUES (v_copro, false, 'Trois', 'Mandant')    RETURNING id INTO v_m3;
  INSERT INTO public.coproprietaires (copro_id, is_company, first_name, last_name)
  VALUES (v_copro, false, 'Quatre','Mandant')    RETURNING id INTO v_m4;

  -- un lot (pour vérifier la préservation de présence à l'UPSERT)
  INSERT INTO public.lots (copro_id, ref, type, floor)
  VALUES (v_copro, 'P101', 'appartement', 1) RETURNING id INTO v_lot;

  -- clé générale active requise par trg_ag_attendance_tantiemes (tout INSERT ag_attendance)
  INSERT INTO public.repartition_keys (copro_id, name, basis, category, coverage_mode, is_active)
  VALUES (v_copro, 'Cle generale g65', 'tantiemes', 'general', 'all_lots', true)
  RETURNING id INTO v_key;
  INSERT INTO public.repartition_key_lines (key_id, lot_id, copro_id, weight)
  VALUES (v_key, v_lot, v_copro, 250);

  INSERT INTO public.ag_meetings (copro_id, title, meeting_type, meeting_date, status)
  VALUES (v_copro, 'AG G65', 'ordinary', current_date + 30, 'session_active')
  RETURNING id INTO v_ag;

  -- ────────────────────────────────────────────────────────────────────────
  -- (2) save_ag_pouvoir : m1 donne pouvoir à mandataire -> ligne proxy créée
  v_res := public.save_ag_pouvoir(v_ag, v_m1, v_mand, v_signed);
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERT FAIL : save m1 échoué (%)', v_res; END IF;
  v_pid1 := (v_res->>'pouvoir_id')::uuid;
  IF v_pid1 IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : save m1 pouvoir_id NULL'; END IF;

  SELECT presence_type, represented_by_id, proxy_signed_at
    INTO v_rec FROM public.ag_attendance WHERE id = v_pid1;
  IF v_rec.presence_type <> 'proxy' THEN
    RAISE EXCEPTION 'ASSERT FAIL : ligne mandant pas en proxy (%)', v_rec.presence_type; END IF;
  IF v_rec.represented_by_id <> v_mand THEN
    RAISE EXCEPTION 'ASSERT FAIL : represented_by_id <> mandataire'; END IF;
  IF v_rec.proxy_signed_at IS DISTINCT FROM v_signed THEN
    RAISE EXCEPTION 'ASSERT FAIL : proxy_signed_at non conservé'; END IF;

  -- (3) get_ag_pouvoirs : relit au format PouvoirDB
  SELECT * INTO v_rec FROM public.get_ag_pouvoirs(v_ag) WHERE mandant_id = v_m1;
  IF v_rec.id IS DISTINCT FROM v_pid1 THEN RAISE EXCEPTION 'ASSERT FAIL : get id <> pouvoir_id'; END IF;
  IF v_rec.ag_id IS DISTINCT FROM v_ag THEN RAISE EXCEPTION 'ASSERT FAIL : get ag_id faux'; END IF;
  IF v_rec.mandataire_id IS DISTINCT FROM v_mand THEN RAISE EXCEPTION 'ASSERT FAIL : get mandataire_id faux'; END IF;
  IF v_rec.mandant_name IS NULL OR v_rec.mandant_name = '' THEN
    RAISE EXCEPTION 'ASSERT FAIL : get mandant_name vide'; END IF;
  IF v_rec.mandataire_name NOT LIKE '%Mandataire%' THEN
    RAISE EXCEPTION 'ASSERT FAIL : get mandataire_name faux (%)', v_rec.mandataire_name; END IF;
  IF v_rec.signed_at IS DISTINCT FROM v_signed THEN RAISE EXCEPTION 'ASSERT FAIL : get signed_at faux'; END IF;
  IF v_rec.justificatif_filename IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL : justificatif inattendu avant upload'; END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- (4) art.22 : mandataire reçoit m2 et m3 (OK = 3 pouvoirs) puis m4 -> REFUSÉ
  IF (public.save_ag_pouvoir(v_ag, v_m2, v_mand, null)->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERT FAIL : save m2 échoué'; END IF;
  IF (public.save_ag_pouvoir(v_ag, v_m3, v_mand, null)->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERT FAIL : save m3 échoué'; END IF;
  -- 3 pouvoirs détenus -> le 4e doit être refusé (errcode 23514)
  BEGIN
    PERFORM public.save_ag_pouvoir(v_ag, v_m4, v_mand, null);
    RAISE EXCEPTION 'ASSERT FAIL : 4e pouvoir accepté (art.22 non appliqué)';
  EXCEPTION WHEN sqlstate '23514' THEN NULL;
  END;
  -- contrôle : exactement 3 lignes proxy pour ce mandataire
  SELECT count(*) INTO v_n FROM public.ag_attendance
   WHERE ag_id = v_ag AND presence_type = 'proxy' AND represented_by_id = v_mand;
  IF v_n <> 3 THEN RAISE EXCEPTION 'ASSERT FAIL : % pouvoirs (attendu 3 après refus)', v_n; END IF;

  -- (5) mandant = mandataire refusé (success=false, pas d'exception)
  v_res := public.save_ag_pouvoir(v_ag, v_m4, v_m4, null);
  IF (v_res->>'success')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'ASSERT FAIL : auto-mandat accepté'; END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- (6) UPSERT : présence RÉELLE préexistante d'un copro, puis save -> bascule
  --     en proxy SANS perdre lot_ids, et SANS dupliquer la ligne.
  --     On crée une présence réelle pour m4 avec un lot.
  INSERT INTO public.ag_attendance (ag_id, copro_id, coproprietaire_id, lot_ids, tantiemes, presence_type)
  VALUES (v_ag, v_copro, v_m4, ARRAY[v_lot]::uuid[], 250, 'present')
  RETURNING id INTO v_att_id;

  -- on prend un AUTRE mandataire (m1, qui ne détient encore aucun pouvoir) pour
  -- m4 afin de rester sous la limite art.22.
  v_res := public.save_ag_pouvoir(v_ag, v_m4, v_m1, null);  -- m1 devient mandataire de m4
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERT FAIL : UPSERT bascule présence échoué (%)', v_res; END IF;
  v_pid2 := (v_res->>'pouvoir_id')::uuid;
  IF v_pid2 <> v_att_id THEN
    RAISE EXCEPTION 'ASSERT FAIL : UPSERT a créé une nouvelle ligne (% <> %)', v_pid2, v_att_id; END IF;
  -- pas de doublon : une seule ligne pour (ag, m4)
  SELECT count(*) INTO v_n FROM public.ag_attendance WHERE ag_id = v_ag AND coproprietaire_id = v_m4;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : UPSERT a dupliqué la ligne mandant (%)', v_n; END IF;
  -- lot_ids / tantiemes préservés, presence basculée
  SELECT presence_type, lot_ids, tantiemes, represented_by_id INTO v_rec
    FROM public.ag_attendance WHERE id = v_att_id;
  IF v_rec.presence_type <> 'proxy' THEN RAISE EXCEPTION 'ASSERT FAIL : non basculée en proxy'; END IF;
  IF NOT (v_lot = ANY(v_rec.lot_ids)) THEN RAISE EXCEPTION 'ASSERT FAIL : lot_ids perdu à l''UPSERT'; END IF;
  IF v_rec.tantiemes <> 250 THEN RAISE EXCEPTION 'ASSERT FAIL : tantiemes écrasés (%)', v_rec.tantiemes; END IF;
  IF v_rec.represented_by_id <> v_m1 THEN RAISE EXCEPTION 'ASSERT FAIL : mandataire non posé'; END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- (7) justificatif : matérialise un document GED + pointe proxy_document_id
  v_res := public.update_ag_pouvoir_justificatif(v_pid1, 'mandat.pdf',
             'pouvoirs/'||v_ag||'/'||v_pid1||'/mandat.pdf', 12345);
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERT FAIL : justificatif échoué (%)', v_res; END IF;
  v_doc := (v_res->>'document_id')::uuid;
  IF v_doc IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : document_id NULL'; END IF;
  -- get relit le justificatif
  SELECT justificatif_filename, justificatif_path INTO v_rec FROM public.get_ag_pouvoirs(v_ag) WHERE id = v_pid1;
  IF v_rec.justificatif_filename <> 'mandat.pdf' THEN
    RAISE EXCEPTION 'ASSERT FAIL : justificatif_filename non relu (%)', v_rec.justificatif_filename; END IF;
  IF v_rec.justificatif_path IS NULL THEN RAISE EXCEPTION 'ASSERT FAIL : justificatif_path NULL'; END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- (8a) delete_ag_pouvoir d'une PURE ligne de pouvoir (m1, aucun signal de
  --      présence réelle) -> la ligne est SUPPRIMÉE.
  v_res := public.delete_ag_pouvoir(v_pid1);
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERT FAIL : delete pure échoué (%)', v_res; END IF;
  SELECT count(*) INTO v_n FROM public.ag_attendance WHERE id = v_pid1;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : delete pure n''a pas supprimé la ligne'; END IF;

  -- (8b) delete_ag_pouvoir d'une PRÉSENCE RÉELLE convertie (m4 : on marque la
  --      ligne signed=true) -> la ligne est CONSERVÉE, repassée en 'present',
  --      mandat vidé (présence non perdue).
  UPDATE public.ag_attendance SET signed = true, signed_at = now() WHERE id = v_att_id;
  v_res := public.delete_ag_pouvoir(v_att_id);
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERT FAIL : delete présence-réelle échoué (%)', v_res; END IF;
  SELECT presence_type, represented_by_id, proxy_document_id, lot_ids INTO v_rec
    FROM public.ag_attendance WHERE id = v_att_id;
  IF v_rec.presence_type <> 'present' THEN RAISE EXCEPTION 'ASSERT FAIL : présence non remise à present (%)', v_rec.presence_type; END IF;
  IF v_rec.represented_by_id IS NOT NULL THEN RAISE EXCEPTION 'ASSERT FAIL : mandat non vidé'; END IF;
  IF NOT (v_lot = ANY(v_rec.lot_ids)) THEN RAISE EXCEPTION 'ASSERT FAIL : lot_ids perdu au delete'; END IF;

  -- (9) delete d'un id inexistant -> success=false (pas d'exception)
  v_res := public.delete_ag_pouvoir(gen_random_uuid());
  IF (v_res->>'success')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'ASSERT FAIL : delete inexistant a renvoyé success'; END IF;

  -- (10) AG inexistante rejetée (get + save)
  BEGIN
    PERFORM public.get_ag_pouvoirs(gen_random_uuid());
    RAISE EXCEPTION 'ASSERT FAIL : get sur AG inexistante accepté';
  EXCEPTION WHEN sqlstate '23503' THEN NULL;
  END;
  BEGIN
    PERFORM public.save_ag_pouvoir(gen_random_uuid(), v_m1, v_mand, null);
    RAISE EXCEPTION 'ASSERT FAIL : save sur AG inexistante accepté';
  EXCEPTION WHEN sqlstate '23503' THEN NULL;
  END;

  -- (11) ANTI-VACUITÉ : il reste des pouvoirs actifs (m2 et m3 vers le mandataire ;
  --      m1 supprimé, m4 repassé en présence réelle)
  SELECT count(*) INTO v_n FROM public.get_ag_pouvoirs(v_ag);
  IF v_n <> 2 THEN RAISE EXCEPTION 'ASSERT FAIL : anti-vacuité, % pouvoirs (attendu 2)', v_n; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
