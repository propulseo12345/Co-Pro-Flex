-- 0038 — Suppression du doublon mort rpc_finalize_ag_session
-- Corps quasi identique à close_ag, zéro appelant (front + edge). close_ag reste la fonction canonique.
drop function if exists public.rpc_finalize_ag_session(uuid, text);
