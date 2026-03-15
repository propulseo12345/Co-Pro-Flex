# Session State — 2026-03-15 14:15

## Branch
v2

## Completed This Session
- Blockers wizard appels de fonds: migration DB appliquée + budgets câblés
- Edge Function generate_call_for_funds: remplacée par appel direct client (3 bugs corrigés)
- Trigger validate_call_for_funds_total: corrigé (double-comptage AFTER trigger)
- Vue globale appels de fonds: refonte accordéon (Budget Courant / Budget Travaux / sous-groupes par budget)
- Onglet "Tous les appels" ajouté puis retiré, refresh après création câblé
- Recherche UI comptabilité: 3 previews HTML créées, V1 Pennylane choisie

## Next Task
Implémenter la refonte comptabilité V1 (Pennylane Style): sidebar verticale dédiée + top bar sticky + multi-vues Grand Livre + filtres riches. Preview: .planning/preview-compta-v1.html

## Blockers
None

## Key Context
- createCall dans lib/finance/api.ts: appel direct Supabase (plus d'Edge Function), workflow draft→entries→post→call→lines
- Trigger validate_call_for_funds_total: AFTER DEFERRED, juste SUM sans +NEW (corrigé en DB)
- Constraint chk_posted_consistency: posted_at requis quand status='posted'
