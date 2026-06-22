# PROGRESS — Campagne de test E2E « prêt pour un vrai syndic »

> Suivi long terme. Cadrage : mémoire [[test_campaign_cadrage]] + `.planning/CADRAGE_CAMPAGNE_TEST_2026-06-21.md` + catalogue `.planning/tests/PLAN_TEST_MASTER.md` (327 cas).
> Leçons réutilisables : `.planning/tests/LECONS.md`. Bugs : `.planning/tests/BUGS.md`.

## Infra (faite)
- Playwright **1.61** (navigateur en cache), `playwright.config` : `workers:1` + `fullyParallel:false` (base cloud partagée) + `actionTimeout:15s`.
- Helpers `e2e/support/` : `login`, `getAdminClient` (service-role), `stepBlock` (⚠️ à éviter, cf. L07), **`onboardCopro`** (wizard A→8, réutilisable).
- Isolation : copros préfixées `E2E-` ; **pas de teardown auto** (inspection) ; purge à la demande `.planning/tests/purge_test_copros.sql` (admin MCP, replica).

## Test « héros » pluriannuel (`e2e/cycle-annuel-hero.spec.ts`)
- [x] **Acte 1 — Onboarding** (copro + budget validé + appel posté ; preuve écran + GL audit=0) — **VERT**
- [ ] Acte 2 — Encaissement des appels (D512/C450)
- [ ] Acte 3 — Facture fournisseur + paiement (D6xx/C401, D401/C512)
- [ ] Acte 4 — Clôture 2026 + 5 annexes + affectation résultat
- [ ] Acte 5 — Passage 2027 (open_next_period) : report à-nouveaux
- [ ] Acte 6 — Exercice 2027 : continuité (budget N-1, impayés reportés)

## Bugs trouvés
- **BUG-001** ✅ corrigé : `ledger_transactions.created_at` inexistant → onboarding bloqué étape Budget (PR #35).
- **BUG-002** 🔴 à corriger (PRIORITÉ prochaine session) : portefeuille affiche les copros en onboarding + clic → dashboard au lieu de `/onboarding/{id}`.

## Décisions / rappels
- Migrations appliquées par CLAUDE via MCP, protocole strict ([[migration_governance_test_campaign]]).
- Bugs : bloquant → corrigé pour débloquer ; non-bloquant → fiché + lot.
- vibe-library : enrichissement **après l'Acte 6** (décision Lyes 2026-06-22).
