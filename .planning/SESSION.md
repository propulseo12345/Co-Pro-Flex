# Session State — 2026-05-31 · WP1 + WP3 + WP4(cœur) faits & vérifiés

## Branch / Commit
`v2` @ `51c2ea7` (dirty : ~55 fichiers — aucun commit, en attente validation user)

## Completed This Session
- **WP1** socle grand livre : 4 RPC `post_*` + 4 edge wrappers (déployés), e2e OK (grand livre équilibré, 0 sans source_id). 2 bugs double-comptage corrigés + `source_type` supplier_payment.
- **WP3** clés & ventilation : category, versioning (valid_from/to), `repartition_key_is_complete` + blocage clés incomplètes, snapshot key_id/weight sur lignes d'appel. **Lot parasite « Test » supprimé** (OK user) → clés complètes (15 lots). **Appel ALUR réel testé** : 15× D 450-5 / C **105** = 1500,01 €.
- **WP4 (cœur)** : `fn_dashboard_kpis` 6 clés JSON corrigées (dashboard renvoie de vrais chiffres) ; `fn_annexe_2` exclut budgets `submitted` ; `v_general_ledger_by_account_class` + `v_budget_consumption_by_account` filtrent `status='posted'` (+ `closed`) ; `v_unpaid_by_lot` (impayé = appels échus non lettrés) confirmée correcte. **Grand livre équilibré global = 0**.
- Migrations : `…120000/120500/120800` (WP1), `…011114/011138/011212` (rapatriées), `…130000` (WP3), `…140000/150000` (WP4).

## Next Task
- **WP2** — auto-propagation AG : orchestrateur `finalize_and_activate_ag` (vote calculé → préparation → notif PV → activation idempotente + gel), art.24 sur exprimés, unifier les 2 générateurs d'appels. ⚠️ nuances métier à confirmer.
- Puis **WP5** (clôture 408/486) → **WP6** (seed propre + parcours).
- Refinements WP4 différés : 4.2 (v_dashboard_kpis période active si utilisé), 4.4 (casse severity côté consommateur), 4.7 (dé-dup dashboard), 4.8 (trésorerie 2 KPI), brancher dashboard `total_impayes` sur `v_unpaid_by_lot`.

## Blockers
- None.

## Key Context
- Copro test = `11111111-aaaa-bbbb-cccc-111111111111` ; période ouverte `0a808340-3ba6-4d3c-86cb-aa06a6c1f304`.
- Décision data : budget courant validé `95a19625` n'est pas rattaché à la période ouverte → budget_vote=0 au dashboard (à régler au seed WP6 / via WP2). Pas de solde bancaire d'ouverture (trésorerie négative normale en test).
- Ordre : WP1✅ WP3✅ WP4✅(cœur) → **WP2** → WP5 → WP6.
