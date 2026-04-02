# Session State — 2026-04-03 01:30

## Branch
v2

## Completed This Session
- Step1: autocomplétion adresse BAN/IGN + pills période construction
- Migrations DB: annee_construction, exercice_debut, cabinet_id, is_resident, banque/iban/bic/initial_balance, onboarding_step/max_step
- Alignement API: noms colonnes (buildings_count, siret, code, name, address_line1, prefers_email/paper)
- Fix CoproContext: setCurrentCoproId fonctionnel (override local + cache + reload)
- Step3: boutons +Lot/+Clé, modales, KPI, auto-création clé "Charges générales", auto-sync poids tantièmes
- Step4: flow connexion bancaire GoCardless (API routes + hook) + saisie manuelle
- Step5: dropdown postes prédéfinis (pick & choose, pas tous imposés)
- Step6: flow 3 phases (config → preview dates éditables → création restants uniquement)
- Persistance display:none (state conservé entre étapes)
- Refactor onboarding: /onboarding (gestion) + /onboarding/[id] (wizard) + /onboarding/create
- Persistance DB: onboarding_step/max_step remplace localStorage
- Fix account_type enum (bank→asset, receivable→asset, revenue→income)
- Récupération budgetId/periodId au mount du wizard (reprendre step 6+)

## Next Task
1. CHECK: vérifier que la création d'appels de fonds pendant l'onboarding ne crée que les restants (pas de doublons) — tester le flow complet
2. FEATURE: ajouter la possibilité d'importer des archives/documents pendant l'onboarding (StepDocuments réactivé ou nouvelle étape)

## Blockers
- GoCardless API keys pas configurées (connexion bancaire non testable en prod)

## Key Context
- Les étapes parallèles (Contrats, Documents, Carnet) sont masquées du wizard — à réintégrer proprement
- 3 copros de test en base avec onboarding_step renseigné (2e34=step4, fd41=step6, 075c=step3)
- La copro fd41 a des appels T3/T4 brouillon à 485€ — données de test nettoyées
