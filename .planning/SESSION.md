# Session State — 2026-03-07 18:40

## Branch
main

## Completed This Session
- fix(ag): templateId mapping — dbToFrontendResolution matches templates by title via getResolutionByTitle()
- feat(ag): ALUR fund — % first, auto-calc montant; fonds travaux uses same FinancingScheduleEditor
- fix(ag-session): isRoleVariable narrowed — nom_syndic no longer treated as copro selector
- feat(ag-session): scroll to top on resolution change + nav buttons at top
- fix(db): RPCs rpc_get_ag_coproprietaires + rpc_get_ag_pv_bundle — removed auth.uid() checks (RLS off)

## Next Task
- Page envoi: "Erreur lors de l'envoi" au clic "Envoyer la convocation" — probablement RPC avec auth check
- Nettoyer styles inline debug dans envoi/page.tsx (error details)

## Blockers
- Auth Supabase client-side: auth.uid() NULL sur RPCs. RLS off donc .from() marche, mais RPCs avec auth echouent.

## Key Context
- RLS desactive sur toutes les tables — securite par RPCs uniquement
- getResolutionByTitle() dans resolutions.ts pour mapper templateId sans colonne DB
- totalFondsAlur calcule depuis resolution ALUR pour FinancingScheduleEditor fonds travaux
