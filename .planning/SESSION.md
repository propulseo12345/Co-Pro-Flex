# Session State — 2026-04-03 23:55

## Branch
v2

## Completed This Session
- Fix soldes copropriétaires: v_coproprietaires_overview basé sur v_lot_balance (ledger) au lieu de v_owner_financial_summary (appels de fonds)
- Fix trésorerie dashboard: v_dashboard_kpis cherche codes LIKE '512%'/'502%' au lieu de code exact (compat onboarding 512000/512100)
- LP illustrations: nouvelles images hero (gauche+droite) converties WebP lossless + illustration accompagnement WebP
- LP hero: taille illustrations ×1.95, image gauche décalée -50px
- Fix sidebar: lien Landing Page corrigé → / avec target _blank

## Next Task
Nettoyer fichiers inutiles dans public/velorah/illustrations/ (illustration-support.png/.svg, illustrations-sides.png, illustration-haussmann-left/garden-right anciens)

## Blockers
None

## Key Context
- v_lot_balance en base a des colonnes différentes du fichier migration local (balance vs solde, inclut coproprietaire_id)
- Next.js Image optimization détruit la transparence WebP → utiliser unoptimized prop
- Fichier migration locale 20260403_fix_coproprietaires_solde_ledger.sql corrigé mais décalé vs v_lot_balance réelle en base
