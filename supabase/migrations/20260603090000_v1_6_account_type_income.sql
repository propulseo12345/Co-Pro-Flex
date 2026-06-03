-- V1.6 — Régularise l'enum account_type : ajoute 'income' (présent en live, jamais
-- ajouté par migration -> un db reset propre échouait sur provision_copro_chart qui
-- caste 'income'). Idempotent. 'revenue' (inutilisé) laissé en alias mort.
-- NB : ADD VALUE IF NOT EXISTS est autorisé en transaction tant que la valeur n'est
-- pas UTILISÉE dans la même transaction (PG 12+). Ici on ne fait qu'ajouter.
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'income';
