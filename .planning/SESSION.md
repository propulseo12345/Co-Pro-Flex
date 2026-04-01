# Session State — 2026-04-01 22:00

## Branch
v2

## Completed This Session
- Navigation deux niveaux : layout gestionnaire, GestionnaireSidebar, 6 pages placeholder, bouton retour sidebar copro
- Portefeuille refonte DA Stitch : PortefeuilleSummary (Variant B: KPI strip + 3 colonnes), PortefeuilleList (rows compactes), PortefeuilleCoproRow
- Font Manrope ajoutée dans layout.tsx
- Finance-v2 : CSS partagé (finance-v2.module.css) + 5 pages créées (comptabilite, factures, budgets, appels-fonds, mouvements-bancaires)
- OnboardingRedirect : exclusion route /finance-v2
- Previews HTML : portefeuille-stitch, portefeuille-3-variantes, finance-da-preview, budgets-3da

## Next Task
Réécrire les 4 pages finance-v2 (comptabilite, factures, appels-fonds, mouvements-bancaires) pour utiliser les VRAIS hooks existants au lieu de données mockées en dur. La page budgets/page.tsx est OK (à prendre comme modèle). Chaque page doit importer son hook réel et reproduire exactement la même structure que la v1 avec la nouvelle DA.

## Blockers
- CoproProvider + Supabase requis pour que les hooks compta/factures/appels/mouvements fonctionnent
- Le portefeuille utilise des IDs mockés (copro-1, etc.) qui n'existent pas en Supabase

## Key Context
- DA validée = palette Stitch (fond #0f1117, accent #adc6ff, Manrope headlines, KPIs bordure top 3px + icônes)
- Les pages v2 sont dans src/app/(dashboard)/finance-v2/ et utilisent le CSS partagé src/components/features/finance-v2/finance-v2.module.css
- Hooks à brancher : useComptabilitePage, useFacturesPageV2, useAppelsFondsPage, useMouvementsBancairesPage
