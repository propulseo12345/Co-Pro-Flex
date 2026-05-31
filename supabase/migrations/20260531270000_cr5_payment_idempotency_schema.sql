-- Revue de code #5 [moyen] : idempotence des paiements — schéma
--
-- Problème : post_owner_payment / post_supplier_payment insèrent un paiement
--   sans aucune protection. Un double-clic, un retry réseau ou deux onglets
--   créent deux paiements et deux écritures au grand livre (double encaissement).
--
-- Fix (couche 1/4) : une "clé d'idempotence" = un identifiant unique généré
--   une seule fois côté client par tentative de paiement. On l'enregistre sur
--   le paiement et un index unique partiel garantit qu'une même clé ne peut
--   pas créer deux paiements (filet anti-course concurrente).
--
-- Colonne nullable -> 100% rétro-compatible (paiements sans clé = comportement
--   actuel inchangé). Idempotent (IF NOT EXISTS).

ALTER TABLE public.payments          ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_idempotency
  ON public.payments (copro_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_supplier_payments_idempotency
  ON public.supplier_payments (copro_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
