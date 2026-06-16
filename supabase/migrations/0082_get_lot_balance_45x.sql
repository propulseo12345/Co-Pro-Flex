-- 0082_get_lot_balance_45x.sql — Solde 45x d'un lot (lecture seule)
-- ============================================================================================
-- BUT : exposer le solde RÉEL des comptes copropriétaires (45x) d'un lot, lu DIRECTEMENT du grand
--   livre, pour alimenter l'AVERTISSEMENT « solde vendeur non soldé » avant validate_mutation
--   (V2 du chantier câblage). Décision USER 2026-06-16 : on PRÉVIENT, on ne BLOQUE pas — une dette
--   peut être réglée à la vente (retenue par le notaire, reprise par l'acquéreur…).
--
-- Formule IDENTIQUE à generate_etat_date_payload (0076 L.72-79) : round-then-sum PAR COMPTE 45x
--   (somme signée debit-credit arrondie à 2 décimales par compte), puis somme des soldes par compte.
--   Débiteur > 0 (le vendeur DOIT) ; créditeur < 0 (le syndicat lui doit). Seule différence assumée :
--   AUCUN cut-off à la date d'effet — on lit le solde LIVE au moment de la validation (le plus
--   honnête : « le compte est-il soldé MAINTENANT ? »).
--
-- Inclut 450-5 (ALUR) : un appel ALUR impayé (450-5 débiteur) est bien une somme due ; une cotisation
--   ALUR réglée nette à 0 (D450-5 à l'appel / C450-5 au paiement) ne pèse pas sur le solde.
--
-- LECTURE SEULE (aucune écriture GL). G-DEF : DEFINER + is_service_call() OR user_is_copro_manager
--   + revoke public/anon.

create or replace function public.get_lot_balance_45x(
  p_copro_id uuid,
  p_lot_id   uuid
)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_bal numeric;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis (lot %)', p_lot_id using errcode = '42501';
  end if;
  if p_lot_id is null then
    raise exception 'get_lot_balance_45x: p_lot_id requis' using errcode = '22004';
  end if;

  -- Round-then-sum par compte (identique à 0076) : on arrondit le solde de CHAQUE compte 45x à
  -- 2 décimales, puis on somme. Évite toute divergence d'un centième avec l'état daté.
  select coalesce(sum(s.bal), 0)
    into v_bal
  from (
    select round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) as bal
    from public.ledger_entries e
    join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
    join public.accounts a on a.id = e.account_id
    where e.copro_id = p_copro_id
      and e.lot_id = p_lot_id
      and a.code like '45%'
    group by a.code
  ) s;

  return v_bal;
end; $$;
revoke execute on function public.get_lot_balance_45x(uuid, uuid) from public, anon;
grant execute on function public.get_lot_balance_45x(uuid, uuid) to authenticated, service_role;
