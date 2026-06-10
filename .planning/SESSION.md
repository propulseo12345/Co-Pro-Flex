# Session State — 2026-06-10 nuit (J1 sécurité/RLS — cœur livré)

## Branch / Commit
`j1-rls-securite` (PR #5 vers `main`, **CI verte**) · base `main` @ `5c8209e` (J0 clos).

## Completed This Session
- **B1 + M2** : bascule RLS **fail-safe** (`apply_rls_environment()` 0034, RLS ON + FORCE GL par défaut, OFF si `app.environment='development'` posé par seed.sql) + assertion REVOKE anon durcie.
- **7 fuites `SECURITY DEFINER` fermées** (audit adversarial ultracode → migration **0045**) : RPC DEFINER sans garde = IDOR cross-tenant ; garde `is_service_call() OR user_has_copro_access/manager`.
- **2 gates RLS** : `gate_rls_multitenant_isolation` (A ⊀ B) + `gate_rls_definer_guards` (42501 cross-tenant). db:test **11/11**.
- **`owner_id` → session** : 6 fichiers comm + nouveau `lib/supabase/admin.ts` (webhook inbound = service_role + gestionnaire de la copro).
- Preuves : rebaseline **45/45**, vitest **97/97**, tsc/eslint **0 erreur**. 4 commits, PR #5, mémoire `[[rls-phase0-model]]` à jour.

## Next Task
- **Merge PR #5** (attente Lyes) puis enchaîner **J2 — recâblage hors-finance** (2.1 Budget front en premier).
- Avant cloud J6 : poser `SUPABASE_SERVICE_ROLE_KEY` + `MAIL_INBOUND_COPRO_ID` ; mapping fin adresse→copro du webhook mail = J2.5.
- 👉 Effort conseillé : **`Max`** (J2 = méthode séquentielle par module + gate SQL ; `ultracode` ponctuel sur revues à enjeu).

## Blockers
- None.

## Key Context
- **`mails` cloisonné par copro** (policy = `user_is_copro_manager`, pas owner_id) → boîte partagée, owner_id = provenance.
- Webhook inbound : sous RLS, insert anon BLOQUÉ → client service_role obligatoire (`lib/supabase/admin.ts`, lève si clé absente).
- `ensure_dev_membership` = fonction morte (aucun appelant) ; comptes démo déjà semés par seed.sql.
- CI : `db:test` bloquant applique 0001→0045 + seed (RLS OFF en CI car seed pose le marqueur dev) ; gates forcent leur propre RLS en savepoint.
