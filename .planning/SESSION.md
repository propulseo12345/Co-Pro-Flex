# Session State — 2026-03-08 13:25

## Branch
main

## Completed This Session
- fix: opening_notes NULL → fallbacks heure (extractTimeFromISO), adresse (parseLocationToAdresse)
- fix: budget checkbox + montant récupérés depuis ag_resolutions.variables
- feat: budget_postes sauvés dans ag_resolutions.variables au submit étape 1
- feat: BudgetSection readOnly quand status ≥ convoked (masque ajout/edit/delete)
- chore: ajout règle FORMAT DE RETOUR dans CLAUDE.md (problème/solution)

## Next Task
Les postes détaillés ne s'affichent toujours pas (1 seul poste "récupéré" car budget_postes absent de ag_resolutions.variables pour les AG existantes). Soit peupler budget_postes via migration SQL, soit forcer l'import au prochain passage étape 1.

## Blockers
None

## Key Context
- Source de vérité budget: ag_resolutions.variables.budget_postes (résolution "Approbation du budget prévisionnel")
- AG 365dcaa9: budget_postes absent des variables → fallback crée 1 poste "récupéré" à 26300€
- CLAUDE.md: nouvelle règle FORMAT DE RETOUR obligatoire (🔴 Problème / 🟢 Solution)
