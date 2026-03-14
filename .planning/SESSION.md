# Session State — 2026-03-14 15:30

## Branch
v2

## Completed This Session
- Brainstorm + design spec appels de fonds (3 onglets: vue globale, budget courant, travaux)
- Plan d'implémentation (17 tasks, 7 chunks)
- Implémentation complète via subagents (9 batches)
- Migration DB: tantièmes dans v_call_lines_detailed
- 15 composants + 5 CSS modules + 3 hooks + 2 pages + 1 service
- Nettoyage legacy: 60 fichiers supprimés (12 673 lignes)
- Build OK

## Next Task
- Tester visuellement le module dans le navigateur
- Brancher les actions (emitCall, generateCalls) dans les composants
- Appliquer la migration SQL en DB Supabase

## Blockers
None

## Key Context
- budget_type DB: 'current' (pas 'previsionnel'), 'works', 'alur'
- useCreateCall.mutate accepte Omit<CreateCallPayload, 'copro_id'> (copro_id injecté par contexte)
- Service PDF adapté aux types API (CallForFundsOverview, CallLineDetailed)
- Fonds ALUR hors scope de ce module
