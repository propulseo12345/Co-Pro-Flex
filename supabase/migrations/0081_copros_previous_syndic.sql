-- 0081_copros_previous_syndic.sql — onboarding : NOM du syndic sortant (reprise de mandat)
-- ============================================================================================
-- Décision USER (2026-06-16) : à l'onboarding d'une copro reprise à un confrère, on conserve le
-- NOM de l'ancien syndic (et non son SIRET, jugé inutile à ce stade) — utile en reprise de mandat
-- (correspondance, transfert d'archives, état daté). Colonne nullable, LECTURE SEULE, aucun GL.
alter table public.copros add column if not exists previous_syndic_name text;
comment on column public.copros.previous_syndic_name is
  'Nom du syndic sortant (reprise de mandat), saisi à l''onboarding. Remplace l''ancien champ « SIRET du syndic ».';

-- FIN 0081_copros_previous_syndic.sql
