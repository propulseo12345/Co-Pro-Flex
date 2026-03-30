# Session State — 2026-03-30 18:00

## Branch
v2

## Completed This Session
- Audit complet plateforme : modules, backend, mocks, UI, infra
- Migration AG : useAGContext, useGlobalVariables, useResolutionVariables → Supabase
- Création useSyndicContract + syndic-contract.api.ts (requête contrat syndic)
- Migration Maintenance : useContracts (constantes), suppression ContractsProvider (code mort)
- Migration useLogbook : 4 mocks → 3 nouvelles tables Supabase + CoproContext
- Création migration SQL : technical_documents, planned_works, insurance_policies + colonnes copros
- Audit JSONB : 6 risques identifiés (vote_details AG = critique)
- Ajout règle CLAUDE.md : explications en français simple obligatoires

## Next Task
Phase 2 audit : modules non retravaillés (Communication, Ventes, Recouvrement, Social, Documents, Copropriétaires) — à retravailler avant de migrer leurs mocks

## Blockers
None

## Key Context
- Modules retravaillés (AG, Finance, Maintenance) : mocks purgés sauf useBudget (type only)
- Modules NON retravaillés : Communication, Ventes, Recouvrement, Social — garder mocks jusqu'à refonte
- Tables vides : technical_documents, planned_works, insurance_policies — à peupler via UI
- JSONB P1 : ag_resolutions.vote_details nécessite CHECK constraint (données légales)
