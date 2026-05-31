# Session State — 2026-05-31 · WP1 + WP3 + WP4(cœur) faits & vérifiés

## Branch / Commit
`v2` @ `19f8c20` — **12 commits propres créés cette session** (WP1/WP3/WP4/sécu/WP2). Non poussés. Reste non commité = fichiers pré-existants hors session + noise `.planning/`.

## Completed This Session
- **WP1** socle grand livre : 4 RPC `post_*` + 4 edge wrappers (déployés), e2e OK (grand livre équilibré, 0 sans source_id). 2 bugs double-comptage corrigés + `source_type` supplier_payment.
- **WP3** clés & ventilation : category, versioning (valid_from/to), `repartition_key_is_complete` + blocage clés incomplètes, snapshot key_id/weight sur lignes d'appel. **Lot parasite « Test » supprimé** (OK user) → clés complètes (15 lots). **Appel ALUR réel testé** : 15× D 450-5 / C **105** = 1500,01 €.
- **WP4 (cœur)** : `fn_dashboard_kpis` 6 clés JSON corrigées (dashboard renvoie de vrais chiffres) ; `fn_annexe_2` exclut budgets `submitted` ; `v_general_ledger_by_account_class` + `v_budget_consumption_by_account` filtrent `status='posted'` (+ `closed`) ; `v_unpaid_by_lot` (impayé = appels échus non lettrés) confirmée correcte. **Grand livre équilibré global = 0**.
- **Sécurité** : `generate_call_for_funds` exige désormais un JWT (faille auth fermée ; v6).
- **WP2 — auto-propagation AG : FAIT & PROUVÉ.** Orchestrateur `finalize_and_activate_ag` (atomique + idempotent, activation à la notif PV). art.24 = exprimés. `generate_calls_from_ag_payload` route par `post_call_for_funds` (appels d'AG → grand livre + clés WP3). `prepare_ag_decisions` réutilise le budget de période. Prouvé sur AG de test (`22220000-…0001`) : vote → budget validated ; rejeu = 0 doublon. Migrations `…160000/170000/170500`. Note : démo « appels frais d'AG » masquée par un appel seed parasite sur le budget 2027 → propre au reseed WP6.
- Migrations : WP1 `…120000/120500/120800` + rapatriées `…011114/138/212` ; WP3 `…130000` ; WP4 `…140000/150000` ; WP2 `…160000/170000/170500`.

## Next Task
- **WP5** — clôture 408/486 (assistant semi-auto), régularisation Appelé≠Réalisé, transition N/N+1 (période multi-état, lever `enforce_single_open_period`).
- **WP6** — seed cohérent (permet aussi une démo propre AG→appels frais au grand livre) + parcours de test documenté.
- Refinements différés : WP2 (2.2 retirer EXCEPTION WHEN OTHERS restants, 2.4 RPC dédiées, 2.8 variables) ; WP4 (4.2/4.4/4.7/4.8 + brancher dashboard impayés sur `v_unpaid_by_lot`).
- Puis **WP5** (clôture 408/486) → **WP6** (seed propre + parcours).
- Refinements WP4 différés : 4.2 (v_dashboard_kpis période active si utilisé), 4.4 (casse severity côté consommateur), 4.7 (dé-dup dashboard), 4.8 (trésorerie 2 KPI), brancher dashboard `total_impayes` sur `v_unpaid_by_lot`.

## Blockers
- None.

## Key Context
- Copro test = `11111111-aaaa-bbbb-cccc-111111111111` ; période ouverte `0a808340-3ba6-4d3c-86cb-aa06a6c1f304`.
- Décision data : budget courant validé `95a19625` n'est pas rattaché à la période ouverte → budget_vote=0 au dashboard (à régler au seed WP6 / via WP2). Pas de solde bancaire d'ouverture (trésorerie négative normale en test).
- Ordre : WP1✅ WP3✅ WP4✅(cœur) → **WP2** → WP5 → WP6.
