-- ============================================================================
-- WP5.1 — Normalisation des comptes de report (110/120)
-- ============================================================================
-- Aucun doublon intra-copro possible (UNIQUE(copro_id, code)). On (1) uniformise
-- le libellé du compte 120 selon le décret 2005-240, (2) crée le compte 110
-- manquant sur les copros qui ont un 120 mais pas de 110, afin que
-- open_next_period (WP5.1) trouve toujours ses comptes de report.
-- Idempotent : ré-exécutable sans effet de bord.
-- ============================================================================

-- 1) Libellé canonique du 120 (opérations courantes)
UPDATE public.accounts
SET name = 'Solde en attente sur opérations courantes', updated_at = now()
WHERE code = '120'
  AND name <> 'Solde en attente sur opérations courantes';

-- 2) Libellé canonique du 110 (travaux & opérations exceptionnelles)
UPDATE public.accounts
SET name = 'Solde en attente sur travaux et opérations exceptionnelles', updated_at = now()
WHERE code = '110'
  AND name <> 'Solde en attente sur travaux et opérations exceptionnelles';

-- 3) Créer le 110 manquant pour toute copro disposant d'un 120 mais pas d'un 110.
--    account_type = 'equity' (capitaux propres / report à nouveau), comme le 120.
INSERT INTO public.accounts (copro_id, code, name, account_type, is_system, is_active)
SELECT a120.copro_id, '110',
       'Solde en attente sur travaux et opérations exceptionnelles',
       'equity', false, true
FROM public.accounts a120
WHERE a120.code = '120'
  AND NOT EXISTS (
    SELECT 1 FROM public.accounts a110
    WHERE a110.copro_id = a120.copro_id AND a110.code = '110'
  );
