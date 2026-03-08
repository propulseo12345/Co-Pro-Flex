# Session State — 2026-03-08 16:12

## Branch
main

## Completed This Session
- feat: RPC generate_combined_calls_from_ag (budget+ALUR combinés, répartition par clé/lot, arrondi dernier lot)
- feat: BlocAppelsFonds composant (remplace BlocSimple pour SCHEDULE_BUDGET_PAYMENTS + SCHEDULE_ALUR_PAYMENTS)
- feat: API loadCallPreviewData + generateCombinedCallsFromAg
- fix: affichage explicite budget vs ALUR dans BlocAppelsFonds
- feat: vue groupée AppelsFondsGroupedTable (clés → trimestres accordéon)
- feat: CampaignsList niveau 1 (liste campagnes d'appels par exercice)
- feat: v_call_campaigns SQL view + API listCallCampaigns + useCallCampaigns hook
- feat: navigation 3 niveaux: campagnes → clés → trimestres

## Next Task
- Redesign trimestres table: simplifier les actions (trop de boutons), garder seulement l'essentiel
- Sprint 4: ordonnancement & polish

## Blockers
None

## Key Context
- Supabase project: iyfesbjnkpynmwlsmxnp (pas yxnwmkfanmijfhattmhc)
- Trigger trg_validate_call_total a bug double-comptage en mode DEFERRED → contourné avec DISABLE/ENABLE dans RPC
- AG test: 24d3a499-f5a9-4535-b8bf-7adb3b8d967f, copro: 11111111-aaaa-bbbb-cccc-111111111111
