# Session State — 2026-06-15 (J5 cadré + 0069/0070/T0 livrés — reprise AUTONOME T1→T6)

## Branch / Commit
`nuit-2026-06-15` @ `fc4bcfc` (working tree propre côté suivi ; **51 déchets racine non suivis — NE JAMAIS `git add .`**). NON poussée (Option A).

## Completed This Session
- **0069** (662 agios→courant) + **0070** (idempotence banque import/pointage + notaire atomique) — commités, `db:test` 27/27, revue adversariale (0 cascade), preuves gates (delta 662 ; pointage partiel).
- **J5 ENTIÈREMENT CADRÉ** : `.planning/PLAN_J5_2026-06-15.md` (ordre T0→T6, migrations 0071+, critères F10) + **24 arbitrages TRANCHÉS (§5)** + `.planning/FACSIMILE_ANNEXES_2026-06-15.md` (structure 5 annexes + 5 gates de cohérence).
- **T0 livré** (libellés légaux des 5 annexes, front pur, tsc 0). Correction expert : cotisation ALUR = **min 5 % budget annuel** (mémoire corrigée).

## Next Task — DÉROULER T1→T6 EN AUTONOMIE (suivre `.planning/PLAN_J5_2026-06-15.md`)
- **Tous les arbitrages sont tranchés (§5) — NE PAS re-questionner.** Ordre : T1 F9 contre-passation (**0071**, inclut fix `createCall`→`post_budget_call_for_funds`) → T2 paiements C2/C3 (**0072**) → T3 E9 operation_id (**0073/0074**) → T4 annexes E7/E8 (**0075**, ultracode conseillé) → T5 état daté H2/H3 (**0076**) → T6 reprise mandat F8 (**0077/0078**).
- **Cadence par tranche** : migration + gate SQL + grep des appelants AVANT figer une RPC + appliquer en local (`docker cp` + `psql -f`) + `npm run db:test` (viser 27/27, le code retour du runner ment → LIRE le résumé) + tsc 0 + **mini-revue du diff** + **commit séparé**. AVANT T5 : vérifier l'enum `mutation_status` (0003).
- Effort : `Max` par tranche ; `ultracode` sur T4 (gates croisées).

## Blockers
- DB locale = conteneur SEUL : `docker start supabase_db_Co-Pro-Flex` (jamais `supabase start` = OOM). Cf. [[local_db_seule_supabase_start_oom]].
- T6 #23 : pas d'exemple de balance d'un syndic sortant → faire un gabarit maison, ne pas bloquer.

## Key Context
- **Option A** : NE PAS pousser ni appliquer sur le live ; commits locaux sur la branche, tests en local.
- Règles dures : GL immuable (correction = contre-passation), lot-centric, RPC DEFINER gardées `is_service_call() OR user_*`, PK `pk_<table>`.
- Décisions métier clés : 662 courant ; ALUR min 5 % budget ; état daté P3 = courant+travaux votés ; annexe 2 : 68/677/678 = travaux ; FIFO paiement défaut courant→travaux (ALUR jamais auto).
