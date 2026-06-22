# Session State — 2026-06-22 (décision migration TanStack Start + POC concluant)

## Branch / Commit
`refonte-wizard-onboarding` @ `3858e34` (dirty : 14 fichiers — dont fixes BUG-003/005 non commités)

## Completed This Session
- **BUG-002** (portefeuille listait les copros en onboarding) : corrigé + revue cascade + **prouvé via MCP Playwright** + 3 commits (`bba090b` idempotence onboarding, `766c746` enum lot_type+a11y, `3858e34` portefeuille).
- **BUG-003** (`/ag/new` crée 2 brouillons AG, StrictMode) + **BUG-005** (406 `.single`→`.maybeSingle` sur useAgDraftEdit + useAgEditPage) : corrigés, **type-check vert, NON commités**.
- **BUG-004** (dates AG calculées via l'horloge au lieu de l'AG, pattern ~14 endroits) : cartographié + fiché BUGS.md, **non corrigé** (rattaché au rebuild).
- Campagne golden : BUG-002 fiché résolu, listeners diag retirés de `onboardGolden.ts`. Acte 2 (AGO) suspendu.
- **DÉCISION MAJEURE** : migrer le front Next.js → **TanStack Start** (Supabase conservé). **POC concluant** (`Flex/poc-tanstack-start/`) : auth Supabase SSR + data réelle (RLS) + CSS Modules + build, tous ✅ sur le live.

## Next Task
- Écrire la **spec de migration TanStack Start** (`docs/superpowers/specs/`) puis le plan (par zones, strangler, golden = filet de parité).
- 👉 Effort conseillé : **Max** (cadrage en dialogue ; fan-out inutile à ce stade).

## Blockers
- None (le POC a levé le risque n°1 : auth SSR fonctionne).

## Key Context
- POC : `Flex/poc-tanstack-start` (hors Co-Pro-Flex), serveur dev **en background sur :3002 — à couper**. TanStack Start est **alpha** (épingler les versions au vrai projet ; retirer Tailwind ; garder CSS Modules + RHF/Zod).
- Co-Pro-Flex inchangé : le Next **vit pendant la migration**. Fixes BUG-003/005 à committer (`useAgDraftEdit.ts`, `useAgEditPage.ts`).
- Live Supabase `qqfqrcolzmcbsvfaumiq` (18 copros). Golden Acte 1 sur `E2E-GOLDEN-1782149200395`. Brouillon AG orphelin `b1644229` à supprimer via l'UI.
- Durable → mémoires [[migration_tanstack_start]], [[golden_exhaustif_plan]], [[verify_before_create_db]].
