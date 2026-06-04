-- ============================================================================
-- LOT 1.3 — ensure_dev_membership : remettre la fonction en migration
-- ============================================================================
-- Contexte : cette RPC est appelée par le front (portefeuille, activeCopro,
-- useAgDrafts, useConvocationAg) mais n'était présente QUE sur la base distante,
-- absente des migrations -> un `supabase db reset` local cassait le portefeuille
-- (erreur "function ensure_dev_membership does not exist").
--
-- Définition reprise FIDÈLEMENT depuis la fonction déployée (pg_get_functiondef),
-- donc aucun changement de comportement sur la base distante (CREATE OR REPLACE
-- idempotent). But unique : reproductibilité d'un environnement local.
--
-- NB (dette LOT 2) : helper de phase DEV. Crée/force un membership 'admin' pour
-- l'utilisateur courant. À retirer / restreindre quand l'auth réelle + le système
-- d'invitation seront en place.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_dev_membership(p_copro_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_copro_id uuid;
  v_copro_name text;
BEGIN
  -- 1. Get current user
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Determine copro_id
  IF p_copro_id IS NOT NULL THEN
    -- Use provided copro_id
    v_copro_id := p_copro_id;
  ELSE
    -- Try get_default_copro_id first
    BEGIN
      v_copro_id := get_default_copro_id();
    EXCEPTION WHEN OTHERS THEN
      v_copro_id := NULL;
    END;

    -- If still null, get first existing copro
    IF v_copro_id IS NULL THEN
      SELECT id INTO v_copro_id
      FROM copros
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    -- If still null, create a minimal copro
    IF v_copro_id IS NULL THEN
      INSERT INTO copros (name, address, postal_code, city, siret)
      VALUES ('Copropriété Dev', '1 Rue du Développement', '75001', 'Paris', '00000000000000')
      RETURNING id INTO v_copro_id;

      RAISE NOTICE '[DEV] Created minimal copro: %', v_copro_id;
    END IF;
  END IF;

  -- 3. Verify copro exists
  SELECT name INTO v_copro_name FROM copros WHERE id = v_copro_id;
  IF v_copro_name IS NULL THEN
    RAISE EXCEPTION 'Copropriété % not found', v_copro_id;
  END IF;

  -- 4. Upsert membership with admin role (highest access for dev)
  INSERT INTO memberships (user_id, copro_id, role)
  VALUES (v_uid, v_copro_id, 'admin'::membership_role)
  ON CONFLICT (user_id, copro_id)
  DO UPDATE SET role = 'admin'::membership_role;

  RAISE NOTICE '[DEV] Ensured membership for user % on copro % (%)', v_uid, v_copro_id, v_copro_name;

  RETURN v_copro_id;
END;
$function$;
