# Session State — 2026-03-14 11:45

## Branch
v2

## Completed This Session
- autoFileToGED: branchement sur 10 call sites PDF (PV, convocation, relance, vente, résiliation, docs techniques, assurances)
- GED refresh: visibilitychange listener pour rafraîchir silencieusement quand l'utilisateur revient sur l'onglet
- Fix checkboxes envoi: supprimé re-fetch post-save qui écrasait l'état optimiste + debounce 500ms
- Fix budget import: champ Exercice changé en input number libre (plus de select limité)
- Spec envoi convocations: docs/superpowers/specs/2026-03-14-convocation-dispatch-design.md
- Plan envoi convocations: docs/superpowers/plans/2026-03-14-convocation-dispatch.md (7 chunks, 10 tasks)

## Next Task
Exécuter le plan d'implémentation: Chunk 1 Task 1 — migration Supabase (table ag_envoi_tracking + RPCs + bundle RPC)

## Blockers
None

## Key Context
- Schema DB: coproprietaires a first_name/last_name/address_line1/address_line2/city/postal_code (pas prenom/nom/adresse)
- Lots via junction table lot_owners (pas owner_id direct sur lots)
- useDeliveryConfig déprécié au profit de useAgEnvoiPage pour cette feature
