# Session State — 2026-04-03 21:50

## Branch
v2

## Completed This Session
- Portefeuille branché v_dashboard_kpis (solde, impayés, prochaine AG réels)
- Onboarding déplacé de (dashboard) vers (gestionnaire) — indépendant du CoproProvider
- Hooks lots refactorés avec coproId optionnel + useCoproSafe()
- Step7 branché sur listLotsWithOwners (lots visibles)
- Membership admin auto-créé à la création de copro (fix RLS)
- saveRepriseSoldes : draft → entries → posted (fix trigger)

## Next Task
Fix vue copropriétaires : le solde utilise v_owner_financial_summary (basé sur call_for_funds_lines) au lieu de ledger_entries. Migrer vers v_lot_balance ou créer une vue qui somme les ledger_entries par lot/copropriétaire.

## Blockers
None

## Key Context
- v_owner_financial_summary JOIN call_for_funds_lines → ne voit pas les ledger_entries de reprise de soldes
- v_lot_balance (migration 20260125) calcule déjà debit/credit par lot depuis ledger_entries — réutilisable
- user_is_copro_manager vérifie table memberships (pas copro_members)
