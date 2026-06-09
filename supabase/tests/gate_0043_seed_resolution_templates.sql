-- Gate 0043 : seed système chargé, cardinalité, catégories ∈ CHECK, majorités corrigées.
DO $$
DECLARE v_n int; v_bad int; v_maj text;
BEGIN
  SELECT count(*) INTO v_n FROM public.resolution_templates WHERE cabinet_id IS NULL;
  IF v_n <> 100 THEN RAISE EXCEPTION 'ASSERT FAIL : %/100 modèles système', v_n; END IF;

  -- Aucune catégorie hors CHECK (le seed serait sinon rejeté à l'insert ; double sécurité ici)
  SELECT count(*) INTO v_bad FROM public.resolution_templates
   WHERE cabinet_id IS NULL AND categorie = 'Modification du règlement de copropriété et des lots';
  IF v_bad <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : catégorie longue non renommée (% lignes)', v_bad; END IF;

  -- Majorités légales corrigées
  SELECT string_agg(code || '=' || majorite, ',') INTO v_maj FROM public.resolution_templates
   WHERE code IN ('cs-02','cs-04','cs-05') AND majorite <> 'ART_25';
  IF v_maj IS NOT NULL THEN RAISE EXCEPTION 'ASSERT FAIL : majorités non corrigées : %', v_maj; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
