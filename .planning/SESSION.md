# Session State — 2026-06-15 (J5 AUTONOME en cours — T1 livré, T2 en cours)

## Branch / Commit
`nuit-2026-06-15` @ `1c7acf0` (T1 livré ; déchets racine non suivis — **NE JAMAIS `git add .`**). NON poussée (Option A).

## Completed This Session
- **T0** (libellés annexes) déjà livré avant cette session.
- **T1 / F9 contre-passation** — ✅ migration **0071** (`reverse_ledger_transaction` + `cancel_call_for_funds` + resserrement `tr_cff_ledger_required` + colonnes `reversal_of`/`is_reversed` sur `v_general_ledger` + `v_lot_vs_gl_mismatch` compte les extournes 'od') + gate 0071 (8 axes) + front (fix `createCall`→`post_budget_call_for_funds`, bouton « Contre-passer » modale compta). **db:test 28/28, tsc 0**, revue adversariale traitée (4 fixes). Commits `39445b3` (SQL) + `1c7acf0` (front).

## Next Task — DÉROULER T2→T6 (suivre `.planning/PLAN_J5_2026-06-15.md`)
- **T2 (paiements C2/C3, migration 0072)** EN COURS : cloisonnement par nature défaut de `allocate_payment` (current→works, ALUR exclu), reliquat→avance 450-3, vue `v_lot_advance_balance`, fix type retour `recordPayment` (FAUX : expose `allocations` inexistant ; vrai = {success,payment_id,ledger_tx_id,allocated,overpayment}), libellés UX PaymentModal, affichage avance. Volet « avis d'appel » DIFFÉRÉ (#2).
- Cadence par tranche : migration + gate + grep appelants + appliquer local (`docker exec -i ... psql`) + `npm run db:test` (LIRE le résumé) + tsc 0 + revue adversariale (subagent code-reviewer) + commit séparé.
- Effort : `Max` (T2/T3/T5/T6) ; `ultracode` sur T4 (annexes, gates croisées).

## Blockers
- DB locale = conteneur SEUL `supabase_db_Co-Pro-Flex` (déjà UP healthy) ; jamais `supabase start` (OOM).
- Avant T5 : vérifier l'enum `mutation_status` (0003) en base (#24).
- T6 : pas d'exemple de balance syndic sortant → gabarit maison.

## Key Context
- **Option A** : NE PAS pousser ni appliquer sur le live. Tout en local + commits sur la branche.
- Règles dures : GL immuable (correction = contre-passation, désormais dispo via 0071), lot-centric, RPC DEFINER gardées `is_service_call() OR user_*`, PK `pk_<table>`. **Vérifier qu'une table similaire n'existe pas avant tout CREATE TABLE (instruction Lyes, crucial T6).**
- Prochain numéro migration libre : **0072**.
