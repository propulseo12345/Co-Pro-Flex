-- 0004_work_domain.sql — référentiel corps de métier (07 §1.12, ENUMS §2.1)
-- Source : .planning/db-cible/07-maintenance-tiers.md §1.12
--          .planning/db-cible/ENUMS.md §2.1 (28 slugs seedés)
-- Remplace les 3 enums legacy supprimés : contract_type, provider_domain, planned_work_type
-- Possédée par le domaine 07 ; consommée en lecture via FK par tous les domaines.
-- RLS : appliquée centralement en 0026_rls.sql (ENABLE/FORCE + policies 3 rôles, bascule env, OFF en dev) — non posée ici.

create table public.work_domain (
  id         uuid        not null default gen_random_uuid(),
  slug       text        not null,
  label      text        not null,
  is_active  boolean     not null default true,
  sort_order integer     not null default 0,
  created_at timestamptz not null default now(),
  constraint pk_work_domain primary key (id),
  constraint uq_work_domain_slug unique (slug)
);

create index idx_work_domain_active on public.work_domain (is_active, sort_order);

-- Seed : 28 slugs du socle unifié (ENUMS §2.1 — correspondance exhaustive legacy → work_domain)
-- sort_order : multiples de 10, 'autre' en fin (999) conformément au plan §4 Task 4
insert into public.work_domain (slug, label, sort_order) values
  ('plomberie',          'Plomberie',             10),
  ('electricite',        'Électricité',            20),
  ('chauffage',          'Chauffage',              30),
  ('climatisation',      'Climatisation',          40),
  ('ascenseur',          'Ascenseur',              50),
  ('menage',             'Ménage',                 60),
  ('espaces_verts',      'Espaces verts',          70),
  ('serrurerie',         'Serrurerie',             80),
  ('peinture',           'Peinture',               90),
  ('toiture',            'Toiture',               100),
  ('facade',             'Façade',                110),
  ('etancheite',         'Étanchéité',            120),
  ('isolation',          'Isolation',             130),
  ('menuiserie',         'Menuiserie',            140),
  ('interphone',         'Interphone',            150),
  ('portail',            'Portail',               160),
  ('securite',           'Sécurité',              170),
  ('securite_incendie',  'Sécurité incendie',     180),
  ('accessibilite',      'Accessibilité',         190),
  ('parking',            'Parking',               200),
  ('assurance',          'Assurance',             210),
  ('juridique',          'Juridique',             220),
  ('architecture',       'Architecture',          230),
  ('eau',                'Eau',                   240),
  ('electricite_commune','Électricité commune',   250),
  ('syndic',             'Syndic',                260),
  ('maintenance',        'Maintenance',           270),
  ('autre',              'Autre',                 999);
