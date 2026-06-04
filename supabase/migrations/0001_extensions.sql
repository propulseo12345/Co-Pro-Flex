-- 0001_extensions.sql — extensions PostgreSQL requises par le schéma cible CoProFlex
-- Source blueprint : conventions transverses (UUID gen_random_uuid(), gen_random_bytes pour
-- les tokens d'invitation 01 §1.10, full-text FR 06 §1.1).

create extension if not exists pgcrypto;      -- gen_random_uuid(), gen_random_bytes (copro_invitations.token)
create extension if not exists "uuid-ossp";   -- compat éventuelle (uuid_generate_v4)

-- Full-text français : assuré par to_tsvector('french', ...) — la configuration 'french'
-- est livrée par défaut avec PostgreSQL, aucune extension supplémentaire requise.
