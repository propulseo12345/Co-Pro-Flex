# Re-baseline — Rapport de readiness (2026-06-10)

> Décision **G2** : déployer le schéma `0001→0044` sur un **projet Supabase NEUF** + passer la CI `db:test` en **bloquant**. Ce doc = verdict + ce qui est fait + ce qui est **différé** (assigné à la bonne session). Audit = rejeu empirique + workflow ultracode (6 agents : 3 tranches migrations + ops + CI/seed + synthèse).

## Verdict

| Cible | Statut |
|---|---|
| **Reproductibilité de la chaîne** | ✅ **PROUVÉE** — `0001→0044` rejoue à **0 erreur** sur base neuve (env Supabase fidèle), **même en transaction par fichier** (comme `db push`), + smoke `audit_finance_integrity = 0`. Harnais re-jouable : `scripts/rebaseline-check.sh`. |
| **CI `db:test` bloquant** | ✅ **FAIT** — `continue-on-error` retiré (`.github/workflows/ci.yml`). |
| **Déploiement cloud neuf** | ⏳ **PRÊT côté plomberie**, sur **GO user** — 1 correctif sécurité (B1) à faire AVANT d'exposer un vrai cabinet (relève de la session RLS). |

> La mémoire « migrations non reproductibles » était **périmée** (d'avant la reconstruction propre). Le gros risque craint n'existe pas.

## Ce qui est FAIT (ne pas refaire)
- Chaîne 0001→0044 reproductible (prouvée empiriquement, autocommit ET transaction/fichier).
- Harnais `scripts/rebaseline-check.sh` (non destructif, base jetable + smoke audit=0).
- CI `db:test` passé en bloquant.
- Audit migrations **propre** sur : DDL transaction-safe, idempotence sur base neuve, forward-references (maîtrisées, documentées), dépendances de données (aucune au push).

## DIFFÉRÉ — à traiter dans la session **Phase 1 (sécurité/RLS)** ⚠️
- **B1 (BLOCKER avant tout cabinet prod) — RLS démarre OFF en production.** `0034` + `0042` activent la RLS via `current_setting('app.environment', true) = 'production'`, mais `app.environment` **n'est jamais positionné** → sur cloud neuf, `NULL = 'production'` = NULL = false → branche **dev** → RLS désactivée sur 79 tables + NO FORCE sur le GL + `resolution_templates` ouvert. **Les policies existent mais ne s'appliquent pas** → tout `authenticated` voit toutes les copros/cabinets.
  - **Fix (un seul couvre 0034 + 0042)** : défaut **fail-safe** `current_setting('app.environment', true) IS DISTINCT FROM 'development'` (RLS ON sauf dev explicite) **OU** `ALTER DATABASE postgres SET app.environment = 'production'` au provisioning cloud.
  - **Aligné avec la mémoire `rls_phase0_model` (« bascule fail-open prod »)** — le code actuel fait l'inverse de l'intention.
- **M2 (à faire avant le 1er `db push` cloud) — assertion REVOKE anon trop stricte** (`0034` ~l.828-844). Lève une EXCEPTION (casse le push) si une fonction `public.*` reste exécutable par `anon` ; sur cloud, des grants par défaut Supabase pourraient déclencher un **faux positif**. Fix : exclure les fonctions d'extensions (`NOT IN (SELECT objid FROM pg_depend WHERE deptype='e')`) + `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon` défensif. *(Touche 0034 → à grouper avec B1.)*

## DIFFÉRÉ — documentation / garde-fous (pas de code)
- **M1** — `provision_demo_tenant()` insère en direct dans `auth.users` (fragile : colonnes GoTrue + pas d'`auth.identities`). **Réservé aux env de test.** Pour un seed démo cloud : API Admin GoTrue, pas un INSERT SQL.
- **M3** — `is_service_call()` lit `request.jwt.claims` (posé par PostgREST). Hors PostgREST (psql/pg_cron/connexion directe) → renvoie false → les RPC machine lèvent 42501. **Tout appel machine cloud** passe par PostgREST (service key) ou pose `set_config('request.jwt.claims', …'service_role'…)`.
- **Invariant** « 1 écriture GL = 1 transaction » (trigger d'équilibre déféré au COMMIT, incident passé `482af64`) + règle « `ALTER TYPE ADD VALUE` seul dans sa migration » (futur) + dépendance rôle `postgres`/GoTrue pour le slice 0011/0024.

## MINEUR (noté, non corrigé)
- **m1** — `0001` crée pgcrypto/uuid-ossp **sans** `with schema extensions`. **No-op sur Supabase** (extensions pré-installées dans `extensions`). Marginal + touche la migration fondatrice → **non corrigé** (risque > bénéfice sur cible Supabase). À expliciter si un jour cible non-Supabase.
- **m4 (écarté empiriquement)** — l'`ALTER TYPE ADD VALUE` de `0044` : **prouvé sûr même en transaction** (harnais `-1`). Rien à faire.

## FAUX POSITIFS de l'audit (vérifiés contre le code/DB réels)
- **m2 — 0043 « sans on conflict »** : FAUX. La ligne 106 contient déjà `on conflict (code) where cabinet_id is null do nothing` (aligné sur l'index `uq_resolution_templates_code_system`). Déjà idempotent.

## Checklist déploiement cloud (sur GO user, après la session RLS)
1. Corriger B1 (+ M2) dans 0034/0042.
2. `supabase db push` sur le **projet neuf** (cloud actuel laissé intact).
3. **Vérifs post-push obligatoires** :
   - `SHOW app.environment;` (attendu : `production` ou défaut fail-safe RLS-on).
   - `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('ledger_entries','resolution_templates','coproprietaires');` → RLS **on** + FORCE sur le GL.
   - Test de cloisonnement réel : gestionnaire B refusé sur la copro du cabinet A.
