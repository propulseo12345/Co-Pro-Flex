-- 0079_mutation_status_sent_to_notary.sql — étape « Envoyé au notaire » dans le workflow de mutation
-- ============================================================================================
-- Source : décision Lyes (échange J5) — « envoyé au notaire » est un vrai jalon métier distinct.
--
-- PROBLÈME : le front (useSalesMutations.sendToNotary, salesApi, VentesProvider) écrit le statut
--   'sent_to_notary', ABSENT de l'enum mutation_status réel {draft, pre_etat_generated, etat_generated,
--   signed, validated, cancelled} -> 22P02 (invalid input value) au runtime = mutation BLOQUÉE.
--
-- FIX : ajouter la valeur 'sent_to_notary' à l'enum, positionnée APRÈS 'etat_generated' (l'envoi au
--   notaire suit la génération de l'état daté, précède la signature) ; et l'inclure dans l'index
--   « une seule mutation ACTIVE par lot » (un dossier envoyé au notaire est toujours en cours).
--
-- NB : ALTER TYPE ADD VALUE s'exécute hors transaction (autocommit psql) ; l'index recréé ensuite
--   (statement séparé) voit la valeur committée. Idempotent via IF NOT EXISTS.

alter type public.mutation_status add value if not exists 'sent_to_notary' after 'etat_generated';

-- Recréer l'unicité « une seule mutation active par lot » en incluant le nouvel état actif.
drop index if exists public.uq_mutations_active_lot;
create unique index uq_mutations_active_lot
  on public.mutations (lot_id)
  where status in ('draft', 'pre_etat_generated', 'etat_generated', 'sent_to_notary', 'signed');

-- FIN 0079_mutation_status_sent_to_notary.sql
