# Session State — 2026-06-29 (R1 finance : APPLIQUÉ sur oio + audit + reset propre + glossaire + commits)

## Branch / Commit
- **coproflex-v2** (code) : `socle-connaissance-v2` @ `1a1124d` (propre ; reste untracked `.planning/rpc-qqfq/` = scratch d'extraction). **4 commits R1 créés, NON poussés.**
- **Co-Pro-Flex** (docs) : `refonte-v2-cadrage` @ `<dernier docs(session)>` ; glossaire R1 commité (`ac3875d`). CHANTIERS/SESSION à committer. **NON poussé.**

## Completed This Session
- **APPLY réel `0001→0005` sur `oio`** (carnet option 2 : le runner inscrit `schema_migrations` dans la transaction). 26 tables RLS / 31 fn / 28 triggers.
- **Advisors triés avec Lyes** : `rls_disabled=0` ✅ ; **2 vrais défauts corrigés à la source + prouvés** (search_path `set_updated_at` ; `revoke is_ledger_regen_exempt FROM PUBLIC` — anon/auth seul était inopérant) ; **84 alertes différées** = future migration RLS+droits.
- **Audit adversarial** (workflow `wa4miyfis`, 17 agents) → verdict **`minor_only`, rien de cassé**. Triés : Q1=reset+reapply, Q2=garde-fou runner.
- **Reset + ré-apply propre d'`oio`** → carnet **fidèle** (0001=15973, 0003=19818), **Gate 1 re-vert**, 0 donnée. Apply à neuf PROUVÉ.
- **Runner durci** : garde-fou mono-shot (refuse si version au carnet) + cause d'échec affichée ; **scenario.mjs `--applied`**.
- **Glossaire R1** (CONTEXT « Imputation proposer/valider/graver » recadré + 2 entrées technique). **5 commits** (4 coproflex-v2 + 1 docs).

## Next Task — DRAFTER LA GOLDEN ÉLARGIE (session NEUVE, à froid)
- **Catalogue FAIT** : `wz781klp6` → `.planning/CATALOGUE_OPERATIONS_SYNDIC.md` (158 opérations ; 26 bâti / 96 conçu / 37 manquant). **Champ golden tranché = TOUT (P0+P1+P2 = 10 enrichissements)** : travaux facturés, grosses charges réalisées, recouvrement (450-6/459), opposition art.20 vente, annexes+balance, rapprochement bancaire, fonds ALUR affecté, poste en déficit.
- **PROCHAINE ACTION = drafter la golden élargie COMPLÈTE en doc** (tous domaines + montants recalculés cohérents depuis la base lockée) → Lyes relit section par section et valide → PUIS construire les briques finance STANDARD-COMPLÈTES (dépenses → cut-off → clôture/à-nouveau) prouvées contre la golden élargie. RLS + pilote front APRÈS.
- **Domaine A déjà LOCKÉ** (charges 2026) : tous postes ≈ budget, **chauffage 10 500** → résultat courant **+1 000** ; ravalement facturé **22 000** + toiture **37 600** → résultat travaux **+560**. (2027 portera le **déficit courant** + travaux à cheval.)
- **Forks comptables tranchés** : 450-6 (frais recouvrement) = sous-compte débiteur hors-FIFO + contrepartie **714** · honoraires état daté + plan d'apurement = **hors GL** (recette syndic ≠ syndicat) · travaux à cheval = **2e temps** (d'abord opé soldée dans l'exercice).
- Effort : `Max` (dérivation comptable soignée — chiffres interdépendants, PAS un fan-out).
- Branches R1 **poussées** ✅ ; PR-vers-main différée. Doctrine exhaustivité gravée dans `rules-v2.md` (1-ter) ; **TODO : synchroniser le skill methodo-coproflex** (emplacement non trouvé par glob).

## Blockers
- None (R1 socle sain et prouvé ; reste = décision push/PR).

## Key Context
- `oio` (oiozjlvlsfzvkmvltiue) appliqué à `0001→0005`, carnet fidèle, Gate 1 vert. Lanceurs : `runner.mjs` (apply mono-shot) · `scenario.mjs --applied <gate>` (preuve BEGIN/ROLLBACK). Gate 1 = `supabase/tests/gate1_golden_r1.sql`.
- Différés à rejuger : RLS+droits (84 WARN advisor) · `478 vs 120` · `711` · format carnet « bloc » (acté : on applique via le runner, pas la CLI).
- Détail vivant = `PROGRESS_v2-migrations.md`.
