# Banque de résolutions AG éditable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer la banque de modèles de résolutions AG d'une constante TypeScript figée (`RESOLUTIONS_BANK`, 100 modèles) vers une table Supabase `resolution_templates` éditable par cabinet et par copropriété, lue via un cache mémoire.

**Architecture:** Table calquée sur `email_templates` (système = `cabinet_id NULL`, unicité partielle, policies env-gated OFF en dev). 3 niveaux : système / cabinet / cabinet+copro (`copro_id`). Les écrans lisent un snapshot mémoire chargé une fois par un provider React et rafraîchi après chaque mutation. Les helpers de lecture deviennent purs (liste injectée). La création d'AG lit directement les obligatoires système (pas de cache requis).

**Tech Stack:** Supabase (PostgreSQL, migrations SQL), Next.js 16 / React 19 / TypeScript strict, CSS Modules, vitest (logique pure), gates SQL auto-rollback (`npm run db:test`).

**Spec de référence :** `docs/superpowers/specs/2026-06-09-banque-resolutions-editable-design.md`

---

## Conventions & commandes (lire avant de commencer)

- **Base locale** : conteneur Docker `supabase_db_Co-Pro-Flex`, DB `postgres`/`postgres` sur `127.0.0.1:54322`.
- **Appliquer les migrations** : `supabase db reset` (rejoue `0001→00NN` + seeds). ⚠️ vide `auth.users`.
- **Gates SQL** : fichiers auto-rollback dans `supabase/tests/*.sql` (pattern `DO $$ … RAISE EXCEPTION 'ROLLBACK_TEST_OK'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF; END $$;`). Lancés par `scripts/db-test.mjs` (liste `GATES`) via `npm run db:test`. Le runner préfixe le contexte `service_role` (bypass RLS).
- **Tests purs** : `npm run test` (vitest run) ; focalisé : `npx vitest run <chemin>`. Tests dans des dossiers `__tests__/`.
- **Type-check** : `npx tsc --noEmit`. **Lint** : `npm run lint`.
- **Helper d'isolation SQL** : `create_clean_test_copro('label')` crée une copro (+ cabinet) jetable.
- **TS strict, jamais `any`** ; imports en alias `@/…` ; pas de styles inline (CSS Modules).

---

## File Structure

**Créés :**
- `supabase/migrations/0042_resolution_templates.sql` — table + helper `user_is_cabinet_manager` + trigger copro∈cabinet + policies RLS (env-gated).
- `supabase/migrations/0043_seed_resolution_templates.sql` — seed des 100 modèles système (généré).
- `supabase/tests/gate_0042_resolution_templates.sql` — gate structure/contraintes/trigger/helper.
- `supabase/tests/gate_0043_seed_resolution_templates.sql` — gate cardinalité + catégories ∈ CHECK.
- `src/lib/ag/resolutionTemplates/types.ts` — types DB (`ResolutionTemplateRow`, payloads CRUD).
- `src/lib/ag/resolutionTemplates/seed.ts` — `CLEANUPS`, `buildSystemSeed()`, `toSeedSql()` (purs).
- `src/lib/ag/resolutionTemplates/api.ts` — fetch + CRUD (fetch/create/update/duplicate/delete).
- `src/lib/ag/resolutionTemplates/__tests__/seed.test.ts` — parité champ-à-champ + cardinalité.
- `src/lib/ag/resolutionTemplates/__tests__/api.test.ts` — CRUD (client Supabase mocké).
- `src/providers/ResolutionTemplatesProvider.tsx` — provider + `useResolutionTemplates()`.
- `src/lib/constants/__tests__/resolutions.helpers.test.ts` — helpers purs.

**Modifiés :**
- `src/lib/constants/resolutions.ts` — helpers rendus purs ; `RESOLUTIONS_STATS` supprimé.
- `src/lib/utils/ag-resolutions.ts` — wrappers reçoivent la liste.
- `src/lib/ag/create-standard-resolutions.ts` — fetch obligatoires système.
- `src/features/ag/new/hooks/useAgCreateForm.ts`, `src/features/ag/hooks/useAgNewPage.ts`, `…/InfoBox.tsx` — appelants.
- `src/hooks/modules/useResolutionLibrary.ts` — source = snapshot, deps.
- `src/features/ag/hooks/useAgAgendaPage.ts` — `getResolutionByTitle(templates, …)`.
- `src/features/ag/hooks/useAgResolutionsPage.ts` — abandon `custom-resolutions-library`.
- `src/components/features/ag/BibliothequeResolutions/BibliothequeResolutions.tsx` + `ResolutionCard.tsx` — badges + actions CRUD.
- `src/providers/CoproContext.tsx` — exposer `cabinetId` (`profiles.cabinet_id`).
- `src/app/(dashboard)/layout.tsx` — monter `ResolutionTemplatesProvider`.
- `scripts/db-test.mjs` — ajouter les 2 gates à `GATES`.

---

## Task 1 : Migration 0042 — table + helper + trigger + policies

**Files:**
- Create: `supabase/tests/gate_0042_resolution_templates.sql`
- Create: `supabase/migrations/0042_resolution_templates.sql`
- Modify: `scripts/db-test.mjs` (array `GATES`)
- Reference: `supabase/migrations/0016_budgets_appels.sql:197-227` (email_templates), `0023_authz_helpers.sql:132-162` (user_is_copro_manager), `0034_revoke_rls_seed.sql:783-796` (policies hybrides).

- [ ] **Step 1 : Lire les références** — ouvrir `0016` (lignes 197-227), `0023` (132-162), `0034` (783-796) pour copier le style exact (PK `pk_<table>`, unicité partielle, `security definer set search_path`, `revoke/grant`, policies).

- [ ] **Step 2 : Écrire la gate (le test) `supabase/tests/gate_0042_resolution_templates.sql`**

```sql
-- Gate 0042 : table resolution_templates + contraintes + trigger copro∈cabinet + helper + policies.
-- Auto-rollback (ROLLBACK_TEST_OK). Lancé par db-test.mjs (contexte service_role préfixé).
DO $$
DECLARE
  v_copro uuid; v_cabinet uuid; v_other_cabinet uuid; v_id uuid; v_a uuid; v_b uuid; v_n int;
BEGIN
  v_copro := create_clean_test_copro('restpl');
  SELECT cabinet_id INTO v_cabinet FROM public.copros WHERE id = v_copro;
  INSERT INTO public.cabinets (name) VALUES ('AUTRE CABINET TEST') RETURNING id INTO v_other_cabinet;

  -- (1) Table présente avec colonnes clés
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='resolution_templates'
     AND column_name IN ('id','cabinet_id','copro_id','code','titre','categorie','majorite','scope','status');
  IF v_n <> 9 THEN RAISE EXCEPTION 'ASSERT FAIL : colonnes %/9', v_n; END IF;

  -- (2) Helper cabinet présent
  IF to_regprocedure('public.user_is_cabinet_manager(uuid)') IS NULL THEN
    RAISE EXCEPTION 'ASSERT FAIL : user_is_cabinet_manager absent';
  END IF;

  -- (3) Insert système OK (cabinet_id NULL + code + scope system)
  INSERT INTO public.resolution_templates (code, titre, categorie, texte, majorite, scope)
  VALUES ('test-sys-1','T','Divers','x','ART_24','system') RETURNING id INTO v_id;

  -- (4) CHECK scope : système avec scope 'org' rejeté
  BEGIN
    INSERT INTO public.resolution_templates (titre, categorie, texte, majorite, scope)
    VALUES ('bad','Divers','x','ART_24','org');
    RAISE EXCEPTION 'ASSERT FAIL : scope org sans cabinet accepté';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (5) CHECK code : modèle cabinet AVEC code rejeté
  BEGIN
    INSERT INTO public.resolution_templates (cabinet_id, code, titre, categorie, texte, majorite, scope)
    VALUES (v_cabinet,'x-code','T','Divers','x','ART_24','org');
    RAISE EXCEPTION 'ASSERT FAIL : code sur modèle cabinet accepté';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (6) Unicité code système
  BEGIN
    INSERT INTO public.resolution_templates (code, titre, categorie, texte, majorite, scope)
    VALUES ('test-sys-1','dup','Divers','x','ART_24','system');
    RAISE EXCEPTION 'ASSERT FAIL : code système dupliqué accepté';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- (7) Trigger copro∈cabinet : copro d'un autre cabinet rejetée
  BEGIN
    INSERT INTO public.resolution_templates (cabinet_id, copro_id, titre, categorie, texte, majorite, scope)
    VALUES (v_other_cabinet, v_copro, 'T','Divers','x','ART_24','org'); -- v_copro ∉ v_other_cabinet
    RAISE EXCEPTION 'ASSERT FAIL : copro étrangère au cabinet acceptée';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%n''appartient pas%' THEN NULL; ELSE RAISE; END IF;
  END;

  -- (8) deprecated_by ON DELETE SET NULL
  INSERT INTO public.resolution_templates (cabinet_id, titre, categorie, texte, majorite, scope)
  VALUES (v_cabinet,'A','Divers','x','ART_24','org') RETURNING id INTO v_a;
  INSERT INTO public.resolution_templates (cabinet_id, titre, categorie, texte, majorite, scope, deprecated_by)
  VALUES (v_cabinet,'B','Divers','x','ART_24','org', v_a) RETURNING id INTO v_b;
  DELETE FROM public.resolution_templates WHERE id = v_a;            -- ne doit PAS être bloqué
  SELECT count(*) INTO v_n FROM public.resolution_templates WHERE id = v_b AND deprecated_by IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'ASSERT FAIL : deprecated_by non remis à NULL'; END IF;

  -- (9) 4 policies présentes
  SELECT count(*) INTO v_n FROM pg_policies
   WHERE schemaname='public' AND tablename='resolution_templates';
  IF v_n <> 4 THEN RAISE EXCEPTION 'ASSERT FAIL : %/4 policies', v_n; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 3 : Ajouter la gate au runner** — dans `scripts/db-test.mjs`, ajouter `'supabase/tests/gate_0042_resolution_templates.sql',` à la fin du tableau `GATES`.

- [ ] **Step 4 : Lancer la gate → échec attendu** — `npm run db:test`
  Expected : `✗ gate_0042_resolution_templates.sql` avec `ERROR … relation "resolution_templates" does not exist` (la table n'existe pas encore).

- [ ] **Step 5 : Écrire la migration `supabase/migrations/0042_resolution_templates.sql`**

```sql
-- 0042_resolution_templates.sql — banque de résolutions AG éditable (système / cabinet / copro).
-- Spec : docs/superpowers/specs/2026-06-09-banque-resolutions-editable-design.md
-- Calque email_templates (0016). cabinet_id NULL = système. copro_id = propre à une copro.

create table public.resolution_templates (
  id                uuid        not null default gen_random_uuid(),
  cabinet_id        uuid                 references public.cabinets(id) on delete cascade,
  copro_id          uuid                 references public.copros(id)   on delete cascade,
  code              text,
  titre             text        not null,
  categorie         text        not null,
  texte             text        not null,
  majorite          text        not null,
  is_information     boolean     not null default false,
  applicable_ag     text[],
  obligatoire_pour  text[]      not null default '{}',
  ordre_suggere     int,
  tags              text[]      not null default '{}',
  variables         text[]      not null default '{}',
  variables_typees  jsonb       not null default '[]'::jsonb,
  scope             text        not null default 'system',
  status            text        not null default 'active',
  legal_ref         text,
  version           text        not null default '1.0',
  deprecated_by     uuid                 references public.resolution_templates(id) on delete set null,
  action_type       text,
  usage_count       int         not null default 0,
  created_by        uuid                 references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint pk_resolution_templates primary key (id),
  constraint ck_resolution_template_scope  check ((cabinet_id is null) = (scope = 'system')),
  constraint ck_resolution_template_copro  check (copro_id is null or cabinet_id is not null),
  constraint ck_resolution_template_code   check ((cabinet_id is null and code is not null) or (cabinet_id is not null and code is null)),
  constraint ck_resolution_template_majorite check (majorite in ('ART_24','ART_25','ART_25_1','ART_26','ART_26_1','UNANIMITE','INFORMATION')),
  constraint ck_resolution_template_scope_vals check (scope in ('system','org')),
  constraint ck_resolution_template_status check (status in ('active','deprecated','draft')),
  constraint ck_resolution_template_categorie check (categorie in (
    'Assemblée Générale','Travaux','Finances','Conseil syndical et syndic','Contrats',
    'Action en justice','Impayés','Modification du règlement','Compteurs',
    'Règles de bonne conduite','Sécurité et conformité','Énergie et environnement',
    'Parking et espaces communs','Assurances','Copropriétaires','Divers'
  ))
);

create unique index uq_resolution_templates_code_system
  on public.resolution_templates (code) where cabinet_id is null;
create index idx_resolution_templates_cabinet_copro on public.resolution_templates (cabinet_id, copro_id);
create index idx_resolution_templates_categorie     on public.resolution_templates (categorie);
create index idx_resolution_templates_scope_status  on public.resolution_templates (scope, status);

create trigger trg_resolution_templates_updated
  before update on public.resolution_templates
  for each row execute function public.set_updated_at();

-- Trigger : une copro référencée doit appartenir au cabinet propriétaire.
create or replace function public.enforce_template_copro_cabinet()
returns trigger language plpgsql as $$
begin
  if NEW.copro_id is not null then
    if not exists (
      select 1 from public.copros c where c.id = NEW.copro_id and c.cabinet_id = NEW.cabinet_id
    ) then
      raise exception 'resolution_templates: copro_id % n''appartient pas au cabinet %', NEW.copro_id, NEW.cabinet_id;
    end if;
  end if;
  return NEW;
end $$;
create trigger trg_resolution_templates_copro_cabinet
  before insert or update on public.resolution_templates
  for each row execute function public.enforce_template_copro_cabinet();

-- Helper RLS cabinet (calqué sur user_is_copro_manager, 0023). Le gestionnaire pilote SON cabinet.
create or replace function public.user_is_cabinet_manager(p_cabinet_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if public.user_is_platform_admin() then return true; end if;
  return exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.cabinet_id = p_cabinet_id
  );
end $$;
revoke execute on function public.user_is_cabinet_manager(uuid) from public, anon;
grant execute on function public.user_is_cabinet_manager(uuid) to authenticated, service_role;

-- Policies (classe hybride système/cabinet). Système = lecture publique authentifiée ; écriture = cabinet.
alter table public.resolution_templates enable row level security;
create policy p_sel_restpl on public.resolution_templates
  for select to authenticated
  using (cabinet_id is null or public.user_is_cabinet_manager(cabinet_id));
create policy p_ins_restpl on public.resolution_templates
  for insert to authenticated
  with check (cabinet_id is not null and public.user_is_cabinet_manager(cabinet_id));
create policy p_upd_restpl on public.resolution_templates
  for update to authenticated
  using (cabinet_id is not null and public.user_is_cabinet_manager(cabinet_id))
  with check (cabinet_id is not null and public.user_is_cabinet_manager(cabinet_id));
create policy p_del_restpl on public.resolution_templates
  for delete to authenticated
  using (cabinet_id is not null and public.user_is_cabinet_manager(cabinet_id));

-- Bascule env (OFF en dev, comme 0034). RLS active uniquement en production.
do $$
begin
  if current_setting('app.environment', true) = 'production' then
    execute 'alter table public.resolution_templates enable row level security';
  else
    execute 'alter table public.resolution_templates disable row level security';
  end if;
end $$;
```

- [ ] **Step 6 : Appliquer + relancer la gate → succès attendu** — `supabase db reset && npm run db:test`
  Expected : `✓ gate_0042_resolution_templates.sql` et `db:test — N/N gates OK.`

- [ ] **Step 7 : Commit**

```bash
git -C Co-Pro-Flex add supabase/migrations/0042_resolution_templates.sql supabase/tests/gate_0042_resolution_templates.sql scripts/db-test.mjs
git -C Co-Pro-Flex commit -m "feat(ag): table resolution_templates + helper cabinet + RLS (0042)"
```

---

## Task 2 : Builders du seed (purs) + parité (vitest)

**Files:**
- Create: `src/lib/ag/resolutionTemplates/seed.ts`
- Create: `src/lib/ag/resolutionTemplates/__tests__/seed.test.ts`
- Reference: `src/lib/constants/resolutions.ts` (constante + interface `ResolutionTemplate`).

- [ ] **Step 1 : Écrire le test de parité (échoue) `__tests__/seed.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { RESOLUTIONS_BANK } from '@/lib/constants/resolutions';
import { buildSystemSeed } from '@/lib/ag/resolutionTemplates/seed';

describe('buildSystemSeed', () => {
  const seed = buildSystemSeed(RESOLUTIONS_BANK);
  const ALLOWED = new Set([
    'Assemblée Générale','Travaux','Finances','Conseil syndical et syndic','Contrats',
    'Action en justice','Impayés','Modification du règlement','Compteurs',
    'Règles de bonne conduite','Sécurité et conformité','Énergie et environnement',
    'Parking et espaces communs','Assurances','Copropriétaires','Divers',
  ]);

  it('toutes les catégories ∈ liste autorisée (corrige reglement-*)', () => {
    const bad = seed.filter((r) => !ALLOWED.has(r.categorie)).map((r) => r.code);
    expect(bad).toEqual([]);
  });

  it('renomme la catégorie longue des reglement-*', () => {
    expect(seed.find((r) => r.code === 'reglement-01')?.categorie).toBe('Modification du règlement');
  });

  it('applique les majorités légales (D-A)', () => {
    for (const code of ['cs-02', 'cs-04', 'cs-05']) {
      expect(seed.find((r) => r.code === code)?.majorite).toBe('ART_25');
    }
  });

  it('requalifie fin-10 en INFORMATION sans le mot quitus', () => {
    const r = seed.find((x) => x.code === 'fin-10');
    expect(r?.majorite).toBe('INFORMATION');
    expect(r?.titre.toLowerCase()).not.toContain('quitus');
  });

  it('cardinalité figée (100 modèles, 0 dédoublonnage de code)', () => {
    expect(seed.length).toBe(100);
    expect(new Set(seed.map((r) => r.code)).size).toBe(100);
  });

  it('parité champ-à-champ avec la constante pour les champs non nettoyés', () => {
    const bankById = new Map(RESOLUTIONS_BANK.map((r) => [r.id, r]));
    const TOUCHED = new Set(['reglement-01','reglement-02','reglement-03','reglement-04','reglement-05','cs-02','cs-04','cs-05','fin-10']);
    for (const row of seed.filter((r) => !TOUCHED.has(r.code!))) {
      const src = bankById.get(row.code!);
      expect(src, `source ${row.code}`).toBeDefined();
      expect(row.titre).toBe(src!.titre);
      expect(row.categorie).toBe(src!.categorie);
      expect(row.majorite).toBe(src!.majorite);
      expect(row.action_type ?? null).toBe(src!.action_type ?? null);
      expect(row.obligatoire_pour ?? []).toEqual(src!.obligatoire_pour ?? []);
    }
  });
});
```

- [ ] **Step 2 : Lancer → échec** — `npx vitest run src/lib/ag/resolutionTemplates`
  Expected : FAIL `Cannot find module '…/seed'`.

- [ ] **Step 3 : Écrire `src/lib/ag/resolutionTemplates/seed.ts`**

```ts
import type { ResolutionTemplate } from '@/lib/constants/resolutions';

/** Ligne système prête pour le seed (sous-ensemble des colonnes de resolution_templates). */
export interface SeedRow {
  code: string;
  titre: string;
  categorie: string;
  texte: string;
  majorite: string;
  is_information: boolean;
  applicable_ag: string[] | null;
  obligatoire_pour: string[];
  ordre_suggere: number | null;
  tags: string[];
  variables: string[];
  variables_typees: unknown[];
  legal_ref: string | null;
  action_type: string | null;
}

/**
 * Corrections structurelles décidées (spec §4.2). Chaque entrée patche une ligne par `code`.
 * AUCUN nouvel action_type (gel assumé).
 */
const CLEANUPS: Record<string, Partial<SeedRow>> = {
  // (1) Catégorie hors-liste → libellé canonique court.
  'reglement-01': { categorie: 'Modification du règlement' },
  'reglement-02': { categorie: 'Modification du règlement' },
  'reglement-03': { categorie: 'Modification du règlement' },
  'reglement-04': { categorie: 'Modification du règlement' },
  'reglement-05': { categorie: 'Modification du règlement' },
  // (2) Dédoublonnage quitus : fin-10 requalifiée en prise d'acte (le quitus reste porté par ag-05).
  'fin-10': {
    titre: 'Prise d’acte de la situation de trésorerie',
    majorite: 'INFORMATION',
    is_information: true,
    ordre_suggere: null, // lève la collision ordre_suggere=6 avec ag-05
  },
  // (3) Majorités légales (loi 10/07/1965 art. 25 ; passerelle 25-1 gérée au vote).
  'cs-02': { majorite: 'ART_25', legal_ref: 'Loi du 10 juillet 1965, art. 25 (passerelle 25-1)' },
  'cs-04': { majorite: 'ART_25', legal_ref: 'Loi du 10 juillet 1965, art. 25 (passerelle 25-1)' },
  'cs-05': { majorite: 'ART_25', legal_ref: 'Loi du 10 juillet 1965, art. 25 (passerelle 25-1)' },
};

/** Convertit un modèle de la constante en ligne de seed, en appliquant les corrections. */
export function buildSystemSeed(bank: ResolutionTemplate[]): SeedRow[] {
  return bank.map((t) => {
    const base: SeedRow = {
      code: t.id,
      titre: t.titre,
      categorie: t.categorie,
      texte: t.texte,
      majorite: t.majorite,
      is_information: t.isInformation ?? t.majorite === 'INFORMATION',
      applicable_ag: t.applicable_ag ?? null,
      obligatoire_pour: t.obligatoire_pour ?? [],
      ordre_suggere: t.ordre_suggere ?? null,
      tags: t.tags ?? [],
      variables: t.variables ?? [],
      variables_typees: t.variablesTypees ?? [],
      legal_ref: t.legalRef ?? null,
      action_type: t.action_type ?? null,
    };
    return { ...base, ...CLEANUPS[t.id] };
  });
}

/** Échappe une chaîne pour un littéral SQL simple-quote. */
function sql(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Échappe un tableau de texte → littéral array Postgres, ou NULL. */
function sqlArr(a: string[] | null): string {
  if (a === null) return 'NULL';
  return `ARRAY[${a.map(sql).join(',')}]::text[]`;
}

/** Émet les INSERT du seed système (cabinet_id NULL, scope 'system'). */
export function toSeedSql(rows: SeedRow[]): string {
  const values = rows.map((r) =>
    `  (${sql(r.code)}, ${sql(r.titre)}, ${sql(r.categorie)}, ${sql(r.texte)}, ${sql(r.majorite)}, ` +
    `${r.is_information}, ${sqlArr(r.applicable_ag)}, ${sqlArr(r.obligatoire_pour)}, ` +
    `${r.ordre_suggere ?? 'NULL'}, ${sqlArr(r.tags)}, ${sqlArr(r.variables)}, ` +
    `${sql(JSON.stringify(r.variables_typees))}::jsonb, ` +
    `${r.legal_ref ? sql(r.legal_ref) : 'NULL'}, ${r.action_type ? sql(r.action_type) : 'NULL'})`
  ).join(',\n');
  return (
    `-- 0043_seed_resolution_templates.sql — GÉNÉRÉ par seed.ts (ne pas éditer à la main).\n` +
    `insert into public.resolution_templates\n` +
    `  (code, titre, categorie, texte, majorite, is_information, applicable_ag, obligatoire_pour,\n` +
    `   ordre_suggere, tags, variables, variables_typees, legal_ref, action_type)\n` +
    `values\n${values};\n`
  );
}
```

- [ ] **Step 4 : Lancer → succès** — `npx vitest run src/lib/ag/resolutionTemplates`
  Expected : PASS (6 tests). Si la parité échoue sur un champ, c'est une correction oubliée → l'ajouter à `CLEANUPS`.

- [ ] **Step 5 : Commit**

```bash
git -C Co-Pro-Flex add src/lib/ag/resolutionTemplates/seed.ts src/lib/ag/resolutionTemplates/__tests__/seed.test.ts
git -C Co-Pro-Flex commit -m "feat(ag): builders + parité du seed resolution_templates"
```

---

## Task 3 : Migration 0043 (seed généré) + gate

**Files:**
- Create: `supabase/migrations/0043_seed_resolution_templates.sql` (généré)
- Create: `supabase/tests/gate_0043_seed_resolution_templates.sql`
- Modify: `src/lib/ag/resolutionTemplates/__tests__/seed.test.ts` (ajout d'un test d'émission), `scripts/db-test.mjs`.

- [ ] **Step 1 : Ajouter un test qui émet la migration** — à la fin de `seed.test.ts` :

```ts
import { writeFileSync } from 'node:fs';
import { toSeedSql } from '@/lib/ag/resolutionTemplates/seed';

it('émet 0043 (idempotent, source-contrôlé)', () => {
  const sqlText = toSeedSql(buildSystemSeed(RESOLUTIONS_BANK));
  writeFileSync('supabase/migrations/0043_seed_resolution_templates.sql', sqlText, 'utf8');
  expect(sqlText).toContain("insert into public.resolution_templates");
});
```

- [ ] **Step 2 : Générer le fichier** — `npx vitest run src/lib/ag/resolutionTemplates`
  Expected : PASS ; le fichier `supabase/migrations/0043_seed_resolution_templates.sql` existe et contient 100 lignes de valeurs.

- [ ] **Step 3 : Écrire la gate `supabase/tests/gate_0043_seed_resolution_templates.sql`**

```sql
-- Gate 0043 : seed système chargé, cardinalité, catégories ∈ CHECK, majorités corrigées.
DO $$
DECLARE v_n int; v_bad int; v_maj text;
BEGIN
  SELECT count(*) INTO v_n FROM public.resolution_templates WHERE cabinet_id IS NULL;
  IF v_n <> 100 THEN RAISE EXCEPTION 'ASSERT FAIL : %/100 modèles système', v_n; END IF;

  -- Aucune catégorie hors CHECK (le seed serait sinon rejeté à l'insert ; double sécurité ici)
  SELECT count(*) INTO v_bad FROM public.resolution_templates
   WHERE cabinet_id IS NULL AND categorie = 'Modification du règlement de copropriété et des lots';
  IF v_bad <> 0 THEN RAISE EXCEPTION 'ASSERT FAIL : catégorie longue non renommée (% lignes)', v_bad; END IF;

  -- Majorités légales corrigées
  SELECT string_agg(code || '=' || majorite, ',') INTO v_maj FROM public.resolution_templates
   WHERE code IN ('cs-02','cs-04','cs-05') AND majorite <> 'ART_25';
  IF v_maj IS NOT NULL THEN RAISE EXCEPTION 'ASSERT FAIL : majorités non corrigées : %', v_maj; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
```

- [ ] **Step 4 : Ajouter au runner** — `'supabase/tests/gate_0043_seed_resolution_templates.sql',` dans `GATES`.

- [ ] **Step 5 : Appliquer + gate** — `supabase db reset && npm run db:test`
  Expected : `✓ gate_0042…`, `✓ gate_0043…`, `db:test — N/N gates OK.`

- [ ] **Step 6 : Commit**

```bash
git -C Co-Pro-Flex add supabase/migrations/0043_seed_resolution_templates.sql supabase/tests/gate_0043_seed_resolution_templates.sql src/lib/ag/resolutionTemplates/__tests__/seed.test.ts scripts/db-test.mjs
git -C Co-Pro-Flex commit -m "feat(ag): seed 100 modèles système resolution_templates (0043)"
```

---

## Task 4 : Helpers de lecture rendus purs

**Files:**
- Modify: `src/lib/constants/resolutions.ts` (helpers + suppression `RESOLUTIONS_STATS`)
- Create: `src/lib/constants/__tests__/resolutions.helpers.test.ts`

Les helpers lisent aujourd'hui `RESOLUTIONS_BANK` en dur. On les transforme pour prendre la liste en 1er paramètre. **La constante `RESOLUTIONS_BANK` reste exportée** (source du seed + fixtures de test).

- [ ] **Step 1 : Écrire les tests purs (échouent) `resolutions.helpers.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  RESOLUTIONS_BANK,
  getResolutionsObligatoires,
  getResolutionById,
  getResolutionByTitle,
  getResolutionsByCategorieForAGType,
} from '@/lib/constants/resolutions';

const ALL = RESOLUTIONS_BANK;

describe('helpers purs (liste injectée)', () => {
  it('getResolutionsObligatoires filtre par type', () => {
    const r = getResolutionsObligatoires(ALL, 'ORDINAIRE');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.obligatoire_pour?.includes('ORDINAIRE'))).toBe(true);
  });
  it('getResolutionById', () => {
    expect(getResolutionById(ALL, 'ag-01')?.titre).toContain('président');
  });
  it('getResolutionByTitle', () => {
    const t = getResolutionById(ALL, 'ag-01')!.titre;
    expect(getResolutionByTitle(ALL, t)?.id).toBe('ag-01');
  });
  it('getResolutionsByCategorieForAGType groupe par catégorie', () => {
    const g = getResolutionsByCategorieForAGType(ALL, 'ORDINAIRE');
    expect(Object.keys(g).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2 : Lancer → échec** — `npx vitest run src/lib/constants/__tests__/resolutions.helpers.test.ts`
  Expected : FAIL (signatures actuelles à 1 argument).

- [ ] **Step 3 : Refactor des helpers dans `resolutions.ts`** — pour CHAQUE fonction lisant `RESOLUTIONS_BANK` (lignes ~1458-1707 : `getResolutionsByCategory`, `getResolutionById`, `getResolutionByTitle`, `getResolutionsForAGType`, `getResolutionsObligatoires`, `getResolutionsSuggerees`, `getResolutionsByCategorieForAGType`, `searchResolutions`, `getNombreResolutionsObligatoires`), ajouter `templates: ResolutionTemplate[]` comme **premier paramètre** et remplacer `RESOLUTIONS_BANK` par `templates` dans le corps. Exemple :

```ts
// AVANT
export function getResolutionById(id: string): ResolutionTemplate | undefined {
  return RESOLUTIONS_BANK.find(r => r.id === id);
}
// APRÈS
export function getResolutionById(templates: ResolutionTemplate[], id: string): ResolutionTemplate | undefined {
  return templates.find(r => r.id === id);
}
```

Et **supprimer** le bloc `export const RESOLUTIONS_STATS = { … }` (lignes ~1711-1717 ; 0 consommateur vivant).

- [ ] **Step 4 : Lancer → succès** — `npx vitest run src/lib/constants/__tests__/resolutions.helpers.test.ts`
  Expected : PASS.

- [ ] **Step 5 : Type-check (révèle tous les appelants à mettre à jour aux Tasks 5-7)** — `npx tsc --noEmit`
  Expected : erreurs « Expected N arguments » sur les appelants. **Les noter** : ce sont exactement les fichiers des Tasks 6-7. (On ne corrige PAS encore ici.)

- [ ] **Step 6 : Commit**

```bash
git -C Co-Pro-Flex add src/lib/constants/resolutions.ts src/lib/constants/__tests__/resolutions.helpers.test.ts
git -C Co-Pro-Flex commit -m "refactor(ag): helpers de résolutions purs (liste injectée)"
```

---

## Task 5 : Types + couche d'accès données (api.ts)

**Files:**
- Create: `src/lib/ag/resolutionTemplates/types.ts`
- Create: `src/lib/ag/resolutionTemplates/api.ts`
- Create: `src/lib/ag/resolutionTemplates/__tests__/api.test.ts`
- Reference: `src/lib/ag/api/resolutions.api.ts` (style `createUntypedClient`, `ApiResult`).

- [ ] **Step 1 : Écrire `types.ts`**

```ts
import type { ResolutionTemplate } from '@/lib/constants/resolutions';

/** Ligne telle que stockée (sur-ensemble runtime de ResolutionTemplate + dimensions de tenance). */
export interface ResolutionTemplateRow extends ResolutionTemplate {
  cabinet_id: string | null;
  copro_id: string | null;
}

export interface CreateTemplatePayload {
  titre: string;
  categorie: string;
  texte: string;
  majorite: string;
  applicable_ag?: string[] | null;
  obligatoire_pour?: string[];
  tags?: string[];
  variables?: string[];
  variables_typees?: unknown[];
  is_information?: boolean;
}

export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };
```

- [ ] **Step 2 : Écrire le test (échoue) `__tests__/api.test.ts`** — client Supabase mocké via `vi.mock`.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { updateTemplate, deleteTemplate } from '@/lib/ag/resolutionTemplates/api';

beforeEach(() => mockFrom.mockReset());

describe('api gardes système', () => {
  it('updateTemplate refuse un modèle système (cabinet_id NULL)', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { cabinet_id: null }, error: null }) }) }),
    });
    const r = await updateTemplate('id-sys', { titre: 'x' });
    expect(r.success).toBe(false);
  });

  it('deleteTemplate refuse un modèle système', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { cabinet_id: null }, error: null }) }) }),
    });
    const r = await deleteTemplate('id-sys');
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 3 : Lancer → échec** — `npx vitest run src/lib/ag/resolutionTemplates/__tests__/api.test.ts`
  Expected : FAIL `Cannot find module '…/api'`.

- [ ] **Step 4 : Écrire `api.ts`**

```ts
import { createClient } from '@/lib/supabase/client';
import type { ResolutionTemplateRow, CreateTemplatePayload, ApiResult } from './types';

const TABLE = 'resolution_templates';
const SELECT = '*';

/** Système (cabinet_id NULL) + cabinet + copro active. Ne JAMAIS comparer cabinet_id = NULL. */
export async function fetchTemplatesForCabinet(
  cabinetId: string | null,
  coproId: string | null,
): Promise<ApiResult<ResolutionTemplateRow[]>> {
  const supabase = createClient();
  let query = supabase.from(TABLE).select(SELECT);
  if (cabinetId) {
    const coproClause = coproId ? `,and(cabinet_id.eq.${cabinetId},copro_id.eq.${coproId})` : '';
    query = query.or(`cabinet_id.is.null,and(cabinet_id.eq.${cabinetId},copro_id.is.null)${coproClause}`);
  } else {
    query = query.is('cabinet_id', null);
  }
  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ResolutionTemplateRow[] };
}

/** Obligatoires SYSTÈME pour un type d'AG (utilisé par la création d'AG, sans cabinet). */
export async function fetchSystemObligatoires(typeAG: string): Promise<ApiResult<ResolutionTemplateRow[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE).select(SELECT).is('cabinet_id', null).contains('obligatoire_pour', [typeAG]);
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ResolutionTemplateRow[] };
}

async function isSystem(supabase: ReturnType<typeof createClient>, id: string): Promise<boolean | null> {
  const { data, error } = await supabase.from(TABLE).select('cabinet_id').eq('id', id).single();
  if (error || !data) return null;
  return (data as { cabinet_id: string | null }).cabinet_id === null;
}

export async function createTemplate(
  cabinetId: string, payload: CreateTemplatePayload, coproId: string | null = null,
): Promise<ApiResult<ResolutionTemplateRow>> {
  if (!cabinetId) return { success: false, error: 'Aucun cabinet courant.' };
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLE)
    .insert({ ...payload, cabinet_id: cabinetId, copro_id: coproId, code: null, scope: 'org' })
    .select(SELECT).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ResolutionTemplateRow };
}

export async function updateTemplate(
  id: string, patch: Partial<CreateTemplatePayload>,
): Promise<ApiResult<ResolutionTemplateRow>> {
  const supabase = createClient();
  const sys = await isSystem(supabase, id);
  if (sys === null) return { success: false, error: 'Modèle introuvable.' };
  if (sys) return { success: false, error: 'Un modèle système est en lecture seule.' };
  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select(SELECT).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ResolutionTemplateRow };
}

export async function duplicateTemplate(
  fromId: string, cabinetId: string, coproId: string | null = null,
): Promise<ApiResult<ResolutionTemplateRow>> {
  if (!cabinetId) return { success: false, error: 'Aucun cabinet courant.' };
  const supabase = createClient();
  const { data: src, error: e1 } = await supabase.from(TABLE).select(SELECT).eq('id', fromId).single();
  if (e1 || !src) return { success: false, error: 'Modèle source introuvable.' };
  const s = src as ResolutionTemplateRow;
  const { data, error } = await supabase.from(TABLE).insert({
    cabinet_id: cabinetId, copro_id: coproId, code: null, scope: 'org',
    titre: `${s.titre} (copie)`, categorie: s.categorie, texte: s.texte, majorite: s.majorite,
    is_information: s.is_information, applicable_ag: s.applicable_ag, obligatoire_pour: s.obligatoire_pour,
    ordre_suggere: s.ordre_suggere, tags: s.tags, variables: s.variables, variables_typees: s.variables_typees,
    action_type: s.action_type,
  }).select(SELECT).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ResolutionTemplateRow };
}

export async function deleteTemplate(id: string): Promise<ApiResult<null>> {
  const supabase = createClient();
  const sys = await isSystem(supabase, id);
  if (sys === null) return { success: false, error: 'Modèle introuvable.' };
  if (sys) return { success: false, error: 'Un modèle système ne peut pas être supprimé.' };
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}
```

- [ ] **Step 5 : Lancer → succès** — `npx vitest run src/lib/ag/resolutionTemplates/__tests__/api.test.ts`
  Expected : PASS (2 tests).

- [ ] **Step 6 : Commit**

```bash
git -C Co-Pro-Flex add src/lib/ag/resolutionTemplates/types.ts src/lib/ag/resolutionTemplates/api.ts src/lib/ag/resolutionTemplates/__tests__/api.test.ts
git -C Co-Pro-Flex commit -m "feat(ag): couche data resolution_templates (fetch + CRUD gardé)"
```

---

## Task 6 : CoproContext (cabinetId) + Provider + hook

**Files:**
- Modify: `src/providers/CoproContext.tsx`
- Create: `src/providers/ResolutionTemplatesProvider.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1 : Exposer `cabinetId` dans `CoproContext`** — dans `loadCoproDetails`, après avoir chargé la copro, récupérer le cabinet du gestionnaire :

```ts
// dans CoproContextValue (interface) : ajouter
cabinetId: string | null;
```

```ts
// dans CoproProvider : nouvel état + récupération
const [cabinetId, setCabinetId] = useState<string | null>(null);
// dans loadCoproDetails, après getUser():
if (user) {
  const { data: profile } = await supabase
    .from('profiles').select('cabinet_id').eq('id', user.id).maybeSingle();
  setCabinetId((profile as { cabinet_id: string | null } | null)?.cabinet_id ?? null);
}
```

Et ajouter `cabinetId` à l'objet `value` retourné.

- [ ] **Step 2 : Écrire `ResolutionTemplatesProvider.tsx`**

```tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { fetchTemplatesForCabinet } from '@/lib/ag/resolutionTemplates/api';
import type { ResolutionTemplateRow } from '@/lib/ag/resolutionTemplates/types';

interface Ctx {
  templates: ResolutionTemplateRow[];
  isLoading: boolean;
  error: string | null;
  cabinetId: string | null;
  coproId: string | null;
  refresh: () => Promise<void>;
}

const ResolutionTemplatesContext = createContext<Ctx | undefined>(undefined);

export function ResolutionTemplatesProvider({ children }: { children: ReactNode }) {
  const { cabinetId, currentCoproId } = useCopro();
  const [templates, setTemplates] = useState<ResolutionTemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchTemplatesForCabinet(cabinetId, currentCoproId);
    if (res.success) { setTemplates(res.data); setError(null); }
    else setError(res.error); // snapshot précédent conservé
    setIsLoading(false);
  }, [cabinetId, currentCoproId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ResolutionTemplatesContext.Provider
      value={{ templates, isLoading, error, cabinetId, coproId: currentCoproId, refresh: load }}>
      {children}
    </ResolutionTemplatesContext.Provider>
  );
}

export function useResolutionTemplates(): Ctx {
  const ctx = useContext(ResolutionTemplatesContext);
  if (!ctx) throw new Error('useResolutionTemplates must be used within ResolutionTemplatesProvider');
  return ctx;
}
```

- [ ] **Step 3 : Monter le provider** — dans `src/app/(dashboard)/layout.tsx`, envelopper les enfants **à l'intérieur** de `CoproProvider` :

```tsx
<CoproProvider>
  <ResolutionTemplatesProvider>
    {/* …contenu existant… */}
  </ResolutionTemplatesProvider>
</CoproProvider>
```

- [ ] **Step 4 : Type-check** — `npx tsc --noEmit`
  Expected : pas de nouvelle erreur sur ces 3 fichiers (les erreurs restantes = appelants des helpers, Task 7).

- [ ] **Step 5 : Commit**

```bash
git -C Co-Pro-Flex add src/providers/CoproContext.tsx src/providers/ResolutionTemplatesProvider.tsx "src/app/(dashboard)/layout.tsx"
git -C Co-Pro-Flex commit -m "feat(ag): provider cache resolution_templates + cabinetId dans CoproContext"
```

---

## Task 7 : Rebrancher les consommateurs

**Files (chacun = un sous-commit) :**

- [ ] **Step 1 : `create-standard-resolutions.ts` → fetch système** — remplacer l'appel synchrone `getResolutionsObligatoires(typeAG)` par le fetch système (les obligatoires sont système, pas besoin de cabinet) :

```ts
import { fetchSystemObligatoires } from '@/lib/ag/resolutionTemplates/api';
// …dans createStandardResolutions, au lieu de getResolutionsObligatoires(typeAG) :
const res = await fetchSystemObligatoires(typeAG);
if (!res.success) return { success: false, resolutionsCreated: 0, results: [], error: res.error };
const templatesObligatoires = res.data;
```

Adapter les usages en aval (`template.titre`, `template.texte`, `template.action_type`, `template.ordre_suggere`, `extractVariableNames(template.texte)`) — les champs existent sur `ResolutionTemplateRow`.

- [ ] **Step 2 : Run + commit** — `npx tsc --noEmit` (ce fichier OK) puis
  `git -C Co-Pro-Flex commit -am "refactor(ag): création d'AG lit les obligatoires système en base"`

- [ ] **Step 3 : `ag-resolutions.ts` (wrappers) + appelants** — les wrappers reçoivent la liste. Pour `useAgNewPage.ts` et `InfoBox.tsx`, la liste vient de `useResolutionTemplates()`. Exemple wrapper :

```ts
// AVANT
export function genererResolutionsObligatoires(typeAG: TypeAG): Resolution[] {
  const templates = getResolutionsObligatoires(typeAG);
  // …
// APRÈS
export function genererResolutionsObligatoires(templates: ResolutionTemplate[], typeAG: TypeAG): Resolution[] {
  const obligatoires = getResolutionsObligatoires(templates, typeAG);
  // … (utiliser `obligatoires`)
```

`InfoBox.tsx` (compte synchrone) : remplacer `getNombreResolutionsAGOrdinaire()` par une valeur dérivée du snapshot :

```tsx
const { templates } = useResolutionTemplates();
const nb = getResolutionsObligatoires(templates, 'ORDINAIRE').length;
```

- [ ] **Step 4 : Run + commit** — `npx tsc --noEmit` (ces fichiers OK) puis
  `git -C Co-Pro-Flex commit -am "refactor(ag): wrappers résolutions + InfoBox/useAgNewPage sur snapshot"`

- [ ] **Step 5 : `useAgAgendaPage.ts` → `getResolutionByTitle(templates, …)`** — injecter la liste du hook :

```ts
const { templates } = useResolutionTemplates();
// remplacer getResolutionByTitle(dbRes.title) par :
const matchedTemplate = getResolutionByTitle(templates, dbRes.title);
```

- [ ] **Step 6 : `useResolutionLibrary.ts` → source snapshot + deps** — remplacer les lectures de `RESOLUTIONS_BANK` par `templates` (param ou via hook), et **ajouter `templates` aux tableaux de dépendances** des `useMemo`/`useCallback` (lignes ~188, 192, 348, 356, 377). Option simple : accepter `templates` en option du hook et l'utiliser partout où `RESOLUTIONS_BANK` apparaît.

- [ ] **Step 7 : `useAgResolutionsPage.ts` → abandon `custom-resolutions-library`** — supprimer la lecture/écriture du localStorage `custom-resolutions-library` ; les modèles personnalisés viennent désormais de `useResolutionTemplates()` filtrés `scope === 'org'`.

- [ ] **Step 8 : Type-check global + tests** — `npx tsc --noEmit && npm run test`
  Expected : 0 erreur TS ; vitest vert (dont parité + helpers + api).

- [ ] **Step 9 : Commit**

```bash
git -C Co-Pro-Flex add src/features/ag/hooks/useAgAgendaPage.ts src/hooks/modules/useResolutionLibrary.ts src/features/ag/hooks/useAgResolutionsPage.ts
git -C Co-Pro-Flex commit -m "refactor(ag): bibliothèque + agenda + page résolutions sur le snapshot"
```

---

## Task 8 : UI CRUD (badges + actions + modale éditeur)

**Files:**
- Modify: `src/components/features/ag/BibliothequeResolutions/BibliothequeResolutions.tsx`
- Modify: `src/features/ag/components/resolutions/ResolutionCard.tsx`
- Create: `src/components/features/ag/BibliothequeResolutions/TemplateEditorModal.tsx` (+ `.module.css`)

- [ ] **Step 1 : Badges 3 niveaux sur `ResolutionCard`** — dériver le niveau d'une ligne :

```tsx
const niveau = row.cabinet_id == null ? 'Système' : row.copro_id ? 'Cette copro' : 'Cabinet';
```

Afficher un badge (classes CSS Modules `badgeSystem` / `badgeCabinet` / `badgeCopro`, couleurs du design system : système = neutre, cabinet = info, copro = success). Boutons **Modifier / Supprimer** rendus **uniquement si `row.cabinet_id != null`** ; **Dupliquer** toujours.

- [ ] **Step 2 : Câbler les actions dans `BibliothequeResolutions`** — `useResolutionTemplates()` (`refresh`, `cabinetId`, `coproId`) + `api` :

```tsx
const { refresh, cabinetId, coproId } = useResolutionTemplates();
const onDuplicate = async (id: string, pourCopro: boolean) => {
  const r = await duplicateTemplate(id, cabinetId!, pourCopro ? coproId : null);
  if (r.success) await refresh(); else toastError(r.error);
};
const onDelete = async (id: string) => {
  if (!confirm('Supprimer ce modèle ?')) return;
  const r = await deleteTemplate(id);
  if (r.success) await refresh(); else toastError(r.error);
};
```

Désactiver la création/duplication si `cabinetId == null` (afficher un message « Aucun cabinet associé »).

- [ ] **Step 3 : Modale éditeur `TemplateEditorModal.tsx`** — formulaire (titre, catégorie [select sur les 16], texte, majorité [select], variables via `VariableEditor`) + sélecteur **« pour mon cabinet » / « pour cette copropriété seulement »** (positionne `coproId`). À la validation : `createTemplate(cabinetId, payload, pourCopro ? coproId : null)` ou `updateTemplate(id, patch)`, puis `refresh()`. Styles en CSS Modules (design system : modal overlay `rgba(0,0,0,0.5)`, content `#1a1d2e` radius 12px, bouton primary `#3b82f6`).

- [ ] **Step 4 : Vérifs automatiques** — `npx tsc --noEmit && npm run lint && npm run test`
  Expected : 0 erreur TS, 0 erreur ESLint, vitest vert.

- [ ] **Step 5 : Vérification runtime (USER)** — proposer à l'utilisateur :
  « Lance `npm run dev`, ouvre la bibliothèque de résolutions : badge Système/Cabinet/Cette copro, Dupliquer → édite → apparaît ; Modifier/Supprimer seulement sur tes modèles ; crée un modèle ‘pour cette copro’. »
  (Ne pas lancer le navigateur soi-même — l'USER fait ses vérifs runtime.)

- [ ] **Step 6 : Commit**

```bash
git -C Co-Pro-Flex add src/components/features/ag/BibliothequeResolutions/ src/features/ag/components/resolutions/ResolutionCard.tsx
git -C Co-Pro-Flex commit -m "feat(ag): UI CRUD banque de résolutions (badges, dupliquer/éditer/supprimer)"
```

---

## Task 9 : Vérification finale d'ensemble

- [ ] **Step 1 : Suite complète**
  - `npx tsc --noEmit` → 0 erreur.
  - `npm run lint` → 0 erreur.
  - `npm run test` → vert (parité, helpers, api).
  - `supabase db reset && npm run db:test` → gates 0042 + 0043 + existantes vertes.

- [ ] **Step 2 : Preuve anti-régression** — confirmer que la création d'une AG génère les mêmes résolutions obligatoires qu'avant (parité I2 verte) ; la boucle d'or finance inchangée (`22222222`).

- [ ] **Step 3 : Mémoire & SESSION** — proposer à l'USER de mettre à jour la mémoire `[[ag-resolutions-bank]]` (chantier #3 livré) et `.planning/SESSION.md`.

---

## Self-Review (rempli)

**Couverture spec :** §4.1 table → Task 1 ; helper RLS + policies → Task 1 ; trigger copro∈cabinet → Task 1 ; §4.2 seed + nettoyage nommé (catégories, quitus, majorités D-A, dette action_type) → Tasks 2-3 ; §5.2 helpers purs (dont `getResolutionByTitle`, suppression `RESOLUTIONS_STATS`) → Task 4 ; §5.3 fetch système création d'AG → Task 7.1 ; §6 api CRUD gardé + dimension copro → Task 5 ; §5.1 provider/cache + cabinet via `profiles.cabinet_id` → Task 6 ; §5.4 deps `useResolutionLibrary` → Task 7.6 ; §6.3 abandon `custom-resolutions-library` → Task 7.7 ; §6.2 UI 3 niveaux + sélecteur → Task 8 ; invariants I1b (deprecated_by) / I2 (parité) / I4 (CHECK) / I5 (delete système refusé) → gates 0042/0043 + tests.

**Placeholders :** aucun « TBD/TODO » ; code complet pour DDL, helper, trigger, policies, gate, builders, api, provider. Le seed 100 lignes est **généré** par `toSeedSql` (Task 3), pas un placeholder.

**Cohérence des types :** `ResolutionTemplateRow` (Task 5) étend `ResolutionTemplate` + `cabinet_id`/`copro_id` ; `fetchSystemObligatoires`/`fetchTemplatesForCabinet` (Task 5) consommés Tasks 6-7 ; helpers à signature `(templates, …)` (Task 4) appelés avec `templates` partout (Tasks 7) ; `useResolutionTemplates()` expose `templates/refresh/cabinetId/coproId` (Task 6) utilisés Tasks 7-8.
