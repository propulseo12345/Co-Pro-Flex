-- Ajoute le prélèvement automatique SEPA aux modes de paiement.
-- Mode le plus courant pour les provisions trimestrielles en copropriété
-- (mandat SEPA) — il manquait à l'enum. Idempotent (ADD VALUE IF NOT EXISTS).

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'direct_debit';
