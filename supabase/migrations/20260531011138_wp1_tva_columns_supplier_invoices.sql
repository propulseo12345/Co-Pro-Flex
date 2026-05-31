-- ============================================================================
-- WP1.3 (partiel) — Colonnes TVA sur les factures fournisseurs (briques HT/TVA)
-- ============================================================================
-- TVA hors champ (TTC en compta copro) mais on capture les briques HT/TVA/taux
-- sur la pièce, pas sur le grand livre.
-- (Rapatriée : appliquée en direct le 2026-05-31, reconstruite à l'identique.)
ALTER TABLE public.supplier_invoices
  ADD COLUMN IF NOT EXISTS montant_ht  numeric,
  ADD COLUMN IF NOT EXISTS montant_tva numeric,
  ADD COLUMN IF NOT EXISTS taux_tva    numeric;

ALTER TABLE public.supplier_invoice_lines
  ADD COLUMN IF NOT EXISTS amount_ht  numeric,
  ADD COLUMN IF NOT EXISTS amount_tva numeric,
  ADD COLUMN IF NOT EXISTS taux_pct   numeric;
