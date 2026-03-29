# Session State — 2026-03-29 23:45

## Branch
v2

## Completed This Session
- fix(os-detail): migration Supabase-first lecture/écriture OS (bypass Edge Functions → RPC directes)
- feat(os-create): createOrder via insert direct + generate_service_order_number RPC
- feat(os-delete): RPC delete_service_order + bouton suppression dans liste
- refonte(os-detail): page pipeline interactif inline (12 composants → 5 zones), timeline cliquable accordion
- feat(os-upload): upload PJ réel Supabase Storage + preview DocumentViewerModal
- fix: enum origin syndic, urgence boolean, domaines uppercase, labels historique lisibles
- dark-theme: modals EditProvider + AddIntervention
- migration: contrats renewals Supabase, AG résolutions saveDraft/loadDraft, listes ref Supabase

## Next Task
- Module PPT (contenu TravauxTab migré vers /maintenance/ppt)
- Connecter l'upload PJ lors de la création d'OS (pas seulement depuis le détail)
- Audit restant : Communication (messagerie/forum mock), Contentieux (litiges mock)

## Blockers
None

## Key Context
- Toutes les Edge Functions maintenance-workflow bypassées → RPC Supabase directes (anon key suffit)
- Upload PJ utilise uploadDocument() de lib/documents/api.ts avec serviceOrderId
- StatusUpdateModal.tsx encore présent mais plus utilisé (pipeline inline dans page détail)
