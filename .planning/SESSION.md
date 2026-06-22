# Session State — 2026-06-22 (campagne test E2E : infra + Acte 1 héros + BUG-001)

## Branch / Commit
`test/campagne-onboarding-e2e` @ `29aaad6` (dirty : BUGS.md BUG-002 + ce SESSION.md, à committer)
PR **#35** ouverte vers `chantier-vente-cablage` (4 commits : fix + infra test).

## Completed This Session
- Cadrage campagne (grilling, 7 décisions) → mémoire [[test_campaign_cadrage]] ; gouvernance migrations → [[migration_governance_test_campaign]].
- Infra Playwright débloquée (1.61, navigateur OK), `workers:1`, helper `onboardCopro`, héros `cycle-annuel-hero` **Acte 1 VERT**.
- **BUG-001 corrigé** : `ledger_transactions.created_at` inexistant → `posted_at` (onboarding était bloqué à l'étape Budget pour tout syndic). tsc 0.
- Script purge `purge_test_copros.sql` (replica admin, préfixe E2E-/HARNESS) testé vert.
- Leçons L01→L08 (`.planning/tests/LECONS.md`) ; **BUG-002 documenté** (`BUGS.md`).

## Next Task
- **BUG-002 (portefeuille) EN PRIORITÉ** : filtrer `onboarding_step IS NULL` (`usePortefeuille`, `getActiveCopro`) + garde dashboard → redirige copro en onboarding vers `/onboarding/{id}` ; masquer du portefeuille. PR dédiée + test E2E.
- Puis **Acte 2 du héros** (encaissement D512/C450) — en session neuve.
- 👉 Effort conseillé : `Max` (fix front ciblé + garde + 1 spec E2E).

## Blockers
- Lyes : activer « leaked password » (Supabase Auth) avant vrais clients.
- 9 copros `E2E-CYCLE-*` en onboarding à purger (sauf la verte) via le script de purge.

## Key Context
- Cloud `qqfqrcolzmcbsvfaumiq`. Copro finalisée de test = `E2E-CYCLE-1782134483715` (onboarding_step NULL). Push via `gh auth switch lyestriki-29`. Tests SQL en BEGIN/ROLLBACK via MCP `execute_sql` + `set local request.jwt.claims='{"role":"service_role"}'`. PAS de vibe-library avant l'Acte 6 (décision Lyes).
