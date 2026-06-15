-- 0068_set_account_charge_nature.sql
-- ============================================================================================
-- T11 (J5) — RPC manager set_account_charge_nature : filet de réversibilité de la classification.
--
-- E3 (0059) a posé accounts.charge_nature ('courant'|'travaux') comme SOURCE UNIQUE de la
-- classification courant/travaux (lue par open_next_period et v_result_allocation_split), avec un
-- backfill dérivé du code de compte. Cette dérivation par code couvre le cas général, mais certaines
-- copros peuvent légitimement vouloir surcharger un compte (ex. 711 subventions par défaut 'courant'
-- à rebasculer en 'travaux' selon l'opération). On expose donc un RPC gestionnaire qui réécrit
-- charge_nature pour UN compte d'UNE copro, en respectant le CHECK miroir ck_accounts_charge_nature
-- (0059 : charge_nature obligatoire SSI le code commence par '6'/'7', interdite ailleurs).
--
-- Le RPC ANTICIPE le CHECK : il refuse proprement (message métier explicite) un compte hors classe
-- 6/7 au lieu de laisser remonter la violation brute de contrainte. Traçabilité = un commentaire
-- d'audit (aucune table d'audit générique n'existe ; on ne crée pas d'usine à gaz pour ce filet).
-- ============================================================================================

create or replace function public.set_account_charge_nature(
  p_copro_id      uuid,
  p_account_code  text,
  p_nature        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_class1 text;
  v_found       boolean;
begin
  -- ── Garde d'accès : service interne OU gestionnaire de la copro ────────────────────────────
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- ── Validation de la nature demandée ───────────────────────────────────────────────────────
  if p_nature is null or p_nature not in ('courant', 'travaux') then
    raise exception 'set_account_charge_nature: nature % invalide (attendu ''courant'' ou ''travaux'')', coalesce(p_nature, 'NULL')
      using errcode = '22023';
  end if;

  -- ── Le compte doit exister dans la copro ───────────────────────────────────────────────────
  select (substr(code, 1, 1)) into v_code_class1
  from public.accounts
  where copro_id = p_copro_id and code = p_account_code;
  get diagnostics v_found = row_count;

  if not v_found then
    raise exception 'set_account_charge_nature: compte % introuvable pour la copro %', p_account_code, p_copro_id
      using errcode = '23503';
  end if;

  -- ── Anticipation du CHECK miroir : charge_nature interdite hors classe 6/7 ─────────────────
  -- On refuse proprement (message métier) plutôt que de laisser remonter la violation de contrainte.
  if v_code_class1 not in ('6', '7') then
    raise exception 'set_account_charge_nature: le compte % n''est pas de classe 6/7 — la nature de charge n''a de sens que pour les comptes de charges (6) et de produits (7)', p_account_code
      using errcode = '0A000';
  end if;

  -- ── Surcharge ──────────────────────────────────────────────────────────────────────────────
  update public.accounts
     set charge_nature = p_nature
   where copro_id = p_copro_id and code = p_account_code;
end;
$$;

revoke execute on function public.set_account_charge_nature(uuid, text, text) from public, anon;
grant execute on function public.set_account_charge_nature(uuid, text, text) to authenticated, service_role;

comment on function public.set_account_charge_nature(uuid, text, text) is
  'T11 (audit) : surcharge manager de accounts.charge_nature pour 1 compte d''1 copro (filet de réversibilité de la classification E3). Garde is_service_call() OR user_is_copro_manager. Valide nature in (courant,travaux) [22023], compte existant [23503], refuse hors classe 6/7 avant le CHECK [0A000].';

-- FIN 0068_set_account_charge_nature.sql
