# Session State — 2026-06-15 (J5 AUTONOME — T1/T2/T3 livrés, T4 en cours)

## Branch / Commit
`nuit-2026-06-15` @ `e743646` (T1+T2+T3 livrés ; déchets racine non suivis — **NE JAMAIS `git add .`**). NON poussée (Option A).

## Completed This Session
- **T1 / F9 contre-passation** (0071) : reverse_ledger_transaction + cancel_call_for_funds + colonnes v_general_ledger + v_lot_vs_gl_mismatch compte les 'od'. Commits `39445b3`+`1c7acf0`.
- **T2 / paiements C2/C3** (0072) : allocate_payment cloisonné par défaut (courant→travaux, ALUR jamais auto) + v_lot_advance_balance + UI avance. Commits `95e481a`+`7fb16e9`.
- **T3 / E9 operation_id** (0073) : operation_id saisie→GL (post+validate facture), filet v_works_entries_unlinked, close_works_operation (garde dure copro-wide, lecture directe tables). Commits `06996cc`+`e743646`. **Sélecteur saisie DIFFÉRÉ** (modale facture mock-shaped).
- Chaque tranche : gate dédié + **db:test 30/30** + tsc 0 + revue adversariale traitée + commits séparés.

## Next Task — T4 (annexes E7/E8, migration 0075) — `ultracode` conseillé
- Réécrire les 6 `fn_annexe_*` (1, 1_detail_copros, 2, 3, 4, 5) au format riche attendu par le front + réparer crash PDF (.map sur scalaire). DROP arité fn_annexe_2/3 (2→4 args) AVANT CREATE. Données works/450-5/débiteur-créditeur À POSER DANS LE CORPS DU GATE (seed golden loop ne les fournit pas). Corriger prev/next période dans `useAnnexeData` ET `useConvocationAccountingData` + centraliser `getAdjacentPeriods`.
- Arbitrages actés : #11 fn_annexe_1_detail_copros = format FRONT {copros[],total} ; #12 68/677/678→travaux ; #13 N+1=budget courant voté/N+2=brouillon ; #14 annexe5 col.D=702+712+131/711+705 ; #16 ALUR min 5% budget.
- Puis T5 (état daté 0076 ; **vérifier enum mutation_status 0003 AVANT**), T6 (reprise 0077/0078 ; vérifier tables similaires avant CREATE).

## Blockers
- DB locale = conteneur SEUL `supabase_db_Co-Pro-Flex` (UP healthy) ; jamais `supabase start` (OOM).

## Key Context
- **Option A** : NE PAS pousser/appliquer sur le live. Commits locaux + tests local. Prochain n° migration libre : **0075** (0074 non utilisé, fusionné dans 0073).
- Règles dures : GL immuable, lot-centric, RPC DEFINER gardées, PK `pk_<table>`. **Vérifier table similaire avant tout CREATE TABLE (instruction Lyes, T6).**
- Briques dispo : reverse_ledger_transaction (0071) sert au rattachement E9 ; create_clean_test_copro_seeded = golden loop (courant only, pas de works/450-5).
