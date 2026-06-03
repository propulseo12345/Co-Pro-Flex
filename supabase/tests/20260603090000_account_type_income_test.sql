DO $$
DECLARE v_has_income boolean;
BEGIN
  SELECT 'income' = ANY (enum_range(NULL::public.account_type)::text[]) INTO v_has_income;
  IF NOT v_has_income THEN
    RAISE EXCEPTION 'ASSERT FAIL : account_type ne contient pas income';
  END IF;
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
