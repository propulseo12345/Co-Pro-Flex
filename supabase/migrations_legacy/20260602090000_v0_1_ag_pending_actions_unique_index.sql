-- ============================================================
-- V0.1 — Filet anti-doublon sur les actions AG en attente
-- PLAN_CORRECTION_VALIDE.md §3.1 item 0.1 ([best])
-- ============================================================
-- Contexte : prepare_ag_decisions n'émet qu'UNE action par résolution
-- (CASE exclusif) et possède déjà un garde-fou applicatif IF EXISTS.
-- resolution_id est NOT NULL (colonne + FK) et 0 doublon en base au 2026-06-02
-- -> index UNIQUE simple (non partiel). Sert de filet base couvrant les
--    appels concurrents que le IF EXISTS applicatif ne protège pas.
-- Unicité sur (ag_id, resolution_id) SEUL : ajouter action_type serait plus
-- laxiste (laisserait 2 actions de types différents pour la même résolution).

CREATE UNIQUE INDEX IF NOT EXISTS ux_ag_pending_actions_ag_resolution
  ON public.ag_pending_actions (ag_id, resolution_id);
