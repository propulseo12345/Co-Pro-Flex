# Session State — 2026-04-01 23:50

## Branch
v2

## Completed This Session
- Phase 1 : Wizard onboarding 7 étapes (copro, copropriétaires, lots+clés, comptes, budget, AG+appels, reprise soldes)
- Phase 2 : Finance & AG connectés (budget→vote→appels de fonds, v_lot_balance SQL)
- Phase 3 : Maintenance migrée mock→Supabase (25 fichiers, API + hooks + constantes)
- Phase 4 : Ventes + Impayés (tables sales créées, API, vues v_unpaid_by_lot, mutation→journal)
- Phase 5 : Communication migrée, Conseil Syndical migré, 7 mocks supprimés, 2 steps onboarding ajoutés

## Next Task
Review des 5 phases avec l'utilisateur. Restent ~30 fichiers qui importent encore src/data/mock/index.ts (AG, finance settings, legal). Erreurs TS préexistantes (21) à corriger.

## Blockers
None

## Key Context
- src/data/mock/index.ts encore importé par ~30 fichiers (AG surtout) — nettoyage v2
- 0 nouvelles erreurs TS introduites par les 5 phases
- 21 erreurs TS préexistantes (useLogbook, useLogbookPage, lots/page, useGlobalVariables)
- Wizard onboarding : 7 étapes principales + 3 steps optionnels (contrats, documents, carnet)
