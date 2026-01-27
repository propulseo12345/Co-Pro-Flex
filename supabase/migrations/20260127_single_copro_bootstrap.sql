-- ============================================================================
-- MIGRATION: Single Copro Bootstrap
-- Purpose: Garantir qu'une copropriété par défaut existe pour le mode "Single Copro"
-- Date: 2026-01-27
-- ============================================================================

-- Cette migration garantit qu'il existe au moins une copropriété dans le système.
-- Elle est idempotente: si une copro existe déjà, elle ne fait rien.

-- Insérer une copro par défaut SEULEMENT si aucune n'existe
INSERT INTO public.copros (id, name, address, city, postal_code)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'CoPro Demo 2026',
  '1 Place de la République',
  'Paris',
  '75011'
WHERE NOT EXISTS (SELECT 1 FROM public.copros LIMIT 1);

-- Créer un building par défaut lié à cette copro si aucun building n'existe
-- (Seulement si la table buildings existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings') THEN
    INSERT INTO public.buildings (id, copro_id, name, address)
    SELECT
      'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
      (SELECT id FROM public.copros ORDER BY created_at ASC LIMIT 1),
      'Bâtiment Principal',
      '1 Place de la République, 75011 Paris'
    WHERE NOT EXISTS (SELECT 1 FROM public.buildings LIMIT 1);
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTION: get_default_copro_id()
-- Retourne l'ID de la première copropriété (par date de création)
-- Utilisé par le frontend en mode Single Copro
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_default_copro_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.copros ORDER BY created_at ASC LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_default_copro_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_copro_id() TO anon;

COMMENT ON FUNCTION public.get_default_copro_id() IS
  'Returns the default copro ID for Single Copro mode. Used by frontend to auto-select copro.';
