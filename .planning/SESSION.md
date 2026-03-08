# Session State — 2026-03-08 17:30

## Branch
main

## Completed This Session
- fix(emission): "Émettre l'appel" navigue vers page copropriétaires + persiste statut issued en DB
- fix(api): table `call_for_funds` (singulier), updateCallStatus + émet tous siblings du trimestre
- feat(campaigns): compteur = nb trimestres, badge "1/4 envoyé", section "Exercices clos" repliable
- refactor(recouvrement): alerte compactée en bandeau horizontal
- db: vue v_call_campaigns enrichie (total_trimesters, trimesters_issued)

## Next Task
Comptabilité — refactoring complet:
1. Filtrer grand livre par periodId (useGeneralLedger ne filtre pas → écritures 2025 sur page 2027)
2. Ajouter sélecteur d'exercice (dropdown) sur page comptabilité
3. Onglet "Livre comptable" : tous comptes table `accounts` avec lignes 0€ même sans écritures
4. Onglet "Comptabilité" : aucune ligne si pas d'écritures
5. Exercices démarrent à zéro (pas de report à-nouveaux)
6. Nettoyer doublons périodes DB (2× Exercice 2025, 2× Exercice 2026)

## Blockers
- Doublons périodes en DB à nettoyer avant de brancher le sélecteur

## Key Context
- Table = `call_for_funds` (singulier) — Supabase project: iyfesbjnkpynmwlsmxnp
- RPC mark_ag_action_activated = simple UPDATE (APPROVE_ACCOUNTS pas implémenté)
- Plan comptable dans table `accounts` (classes 1-7, décret 2005-240)
- Dark-first: --surface/--bg-secondary, jamais de fallbacks clairs
