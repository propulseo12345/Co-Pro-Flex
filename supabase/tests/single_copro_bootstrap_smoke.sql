-- ============================================================================
-- TEST: Single Copro Bootstrap Smoke Test
-- Purpose: Vérifier qu'une copro par défaut existe et que la fonction helper marche
-- Date: 2026-01-27
-- ============================================================================

-- Test 1: Au moins une copro existe
DO $$
DECLARE
  copro_count integer;
BEGIN
  SELECT COUNT(*) INTO copro_count FROM public.copros;

  IF copro_count = 0 THEN
    RAISE EXCEPTION 'FAIL: Aucune copropriété trouvée. Le bootstrap a échoué.';
  END IF;

  RAISE NOTICE 'PASS: % copropriété(s) trouvée(s)', copro_count;
END $$;

-- Test 2: La fonction get_default_copro_id() retourne un ID valide
DO $$
DECLARE
  default_id uuid;
  copro_name text;
BEGIN
  SELECT public.get_default_copro_id() INTO default_id;

  IF default_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: get_default_copro_id() a retourné NULL';
  END IF;

  SELECT name INTO copro_name FROM public.copros WHERE id = default_id;

  IF copro_name IS NULL THEN
    RAISE EXCEPTION 'FAIL: L''ID retourné par get_default_copro_id() ne correspond à aucune copro';
  END IF;

  RAISE NOTICE 'PASS: Default copro ID = %, name = "%"', default_id, copro_name;
END $$;

-- Test 3: La première copro (par created_at) est bien celle retournée
DO $$
DECLARE
  first_copro_id uuid;
  function_copro_id uuid;
BEGIN
  SELECT id INTO first_copro_id FROM public.copros ORDER BY created_at ASC LIMIT 1;
  SELECT public.get_default_copro_id() INTO function_copro_id;

  IF first_copro_id != function_copro_id THEN
    RAISE EXCEPTION 'FAIL: get_default_copro_id() ne retourne pas la première copro. Expected %, got %', first_copro_id, function_copro_id;
  END IF;

  RAISE NOTICE 'PASS: get_default_copro_id() retourne correctement la première copro';
END $$;

-- Résumé final
SELECT
  'Single Copro Bootstrap Test Summary' as test_suite,
  (SELECT COUNT(*) FROM public.copros) as total_copros,
  (SELECT public.get_default_copro_id()) as default_copro_id,
  (SELECT name FROM public.copros WHERE id = public.get_default_copro_id()) as default_copro_name;
