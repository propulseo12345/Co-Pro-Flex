-- TEST : la dérivation des bornes d'exercice à partir de exercice_debut (MM-DD) est correcte.
-- Reproduit en SQL le calcul que fait le TS (start = year-MM-DD ; end = start + 1 an - 1 jour).
DO $$
DECLARE
  v_md text; v_year int := 2026;
  v_start date; v_end date;
BEGIN
  -- cas exercice civil
  v_md := '01-01';
  v_start := make_date(v_year, split_part(v_md,'-',1)::int, split_part(v_md,'-',2)::int);
  v_end   := (v_start + INTERVAL '1 year' - INTERVAL '1 day')::date;
  IF v_start <> DATE '2026-01-01' OR v_end <> DATE '2026-12-31' THEN
    RAISE EXCEPTION 'ASSERT FAIL : exercice civil borne KO start=% end=%', v_start, v_end;
  END IF;

  -- cas exercice décalé 06-01 -> 2026-06-01 .. 2027-05-31
  v_md := '06-01';
  v_start := make_date(v_year, split_part(v_md,'-',1)::int, split_part(v_md,'-',2)::int);
  v_end   := (v_start + INTERVAL '1 year' - INTERVAL '1 day')::date;
  IF v_start <> DATE '2026-06-01' OR v_end <> DATE '2027-05-31' THEN
    RAISE EXCEPTION 'ASSERT FAIL : exercice decale borne KO start=% end=%', v_start, v_end;
  END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
