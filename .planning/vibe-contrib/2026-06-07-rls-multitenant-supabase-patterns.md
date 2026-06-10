# Pattern généralisé — RLS multi-tenant Supabase (à pousser sur vibe-library, validation requise)

> Brouillon de contribution issu de la session 2026-06-07 (pose RLS « Phase 0 »).
> **Anonymisé** (aucun specific produit). **Tag stack** : SQL/Postgres/Supabase générique — la divergence
> front (projet réel = npm/ESLint/CSS Modules ≠ library pnpm/Biome/Tailwind) ne s'applique pas ici (SQL pur).
> Axe = DB/sécurité/RLS (forte valeur library). Cible de publication : `templates--audit--02-securite-supabase`
> (complément) ou nouveau `references--rls-multitenant-patterns`.

## 1. Patron de policy : donnée COLLECTIVE vs BACK-OFFICE
Piège racine : un helper d'accès « membre de l'org » (`user_has_org_access`) renvoie TRUE pour **tout** rôle
(manager ET utilisateur simple). L'utiliser en SELECT sur une table back-office **expose** ces données à l'utilisateur simple.
- Donnée **collective** (lisible par tout membre) → `SELECT using (user_has_org_access(org_id))`.
- Donnée **back-office / sensible** (manager only) → `SELECT using (user_is_org_manager(org_id))` + éventuel volet « own » fin.
- Écriture → `user_is_org_manager`. `anon` = aucune policy. `service_role` bypasse.

## 2. Piège RÉCURSION RLS (cause de 42P17 en prod, invisible en dev RLS OFF)
Une policy `USING exists(select … from autre_table …)` est **soumise à la RLS de l'autre table**. Si deux tables
s'interrogent mutuellement → récursion infinie `42P17` en production. **Fix** : router au moins un côté par une
fonction `SECURITY DEFINER` (qui bypasse la RLS de la table jointe). Règle : toute sous-requête inter-tables dans
une policy passe par un helper DEFINER, ou prouver l'absence de cycle.

## 3. Masquer des COLONNES sensibles (RLS est ligne-par-ligne, pas colonne-par-colonne)
Pour exposer un annuaire sans les colonnes sensibles (IBAN, SIRET…) : table de base **manager-only** + **vue
`security_invoker = false` (DEFINER)** qui projette les colonnes safe et porte son propre filtre d'accès interne
(`where user_has_org_access(org_id)`). Une vue `security_invoker = true` n'isole RIEN (hérite la RLS de la base).

## 4. Bascule ENABLE/DISABLE par environnement — attention au FAIL-OPEN
`current_setting('app.environment', true) = 'production'` : si le GUC est absent → NULL ≠ 'production' → RLS DISABLE
**silencieux**. Acceptable en dev (RLS OFF voulu), DANGEREUX en prod si le GUC n'est pas posé. Runbook prod :
`alter database <db> set app.environment='production'` (ou fonction `assert_production_rls()` au cutover). `FORCE ROW
LEVEL SECURITY` sur les tables comptables (même le propriétaire reste soumis aux policies).

## 5. Gate de cloisonnement multi-tenant (begin/rollback, jetable)
Tester l'isolation alors que la RLS est OFF en dev : dans une transaction, `enable row level security` sur les tables
testées + `set local role authenticated` (rôle non-BYPASSRLS) + `set_config('request.jwt.claims', …, true)` pour
simuler tenant A vs tenant B. Prouver : (a) tenant B reçoit `42501` sur les RPC du tenant A (gardes in-function),
(b) `select … where org = A` renvoie 0 ligne pour B (RLS SELECT), (c) INSERT cross-tenant refusé. `rollback`.
Setup via une fonction `provision_demo_tenant()` (G-SVC, UUIDs fixes, idempotente) qui crée 2 tenants + identités câblées.

## Principes à garder (jeter le tooling) — adapter `org_id` à la racine de tenance réelle du projet cible.
