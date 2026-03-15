# Session State — 2026-03-15 18:25

## Branch
v2

## Completed This Session
- Refonte comptabilité Pennylane: TopBar sticky, NavBar tabs, KPI strip, ViewSwitcher, GrandLivreTable groupé
- Sidebar collapsible (toggle button, 220px → 52px)
- Refonte budget Qonto: TopBar, NavBar, OverviewHero donut, ProjectionCard, PostesList accordéon
- Budget travaux: groupement par statut (brouillon/en cours/finalisé), rows compactes expandables
- Suivi appels de fonds travaux: données réelles Supabase via budget_id
- Wizard appels de fonds: types Exceptionnel/Travaux avec dropdown budget filtré
- Fix création budget: auto-increment version (contrainte UNIQUE), budget_line avec montant
- Restyle modales (DepenseDetailModal dark theme)

## Next Task
Refonte modale détail travaux (TravauxDetailModal): restyle Qonto + empty states pour Historique/Étapes/Prestataires/Documents. Le PDF uploadé à la création du budget ne s'enregistre pas en DB (devis non persisté).

## Blockers
None

## Key Context
- budgets table: UNIQUE(copro_id, period_id, budget_type, version) — createBudget auto-incrémente version
- budget_lines: le montant total vient de SUM(amount) via v_budgets_overview, pas d'un champ sur budgets
- Travaux budgets chargés tous exercices confondus (loadAllWorks séparé)
- Les devis uploadés dans CreateBudgetModal ne sont pas persistés en DB (juste frontend)
