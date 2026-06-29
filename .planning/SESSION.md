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

## Next Task
- **PUSH + PR** : décision de stratégie de branche EN ATTENTE (branches très en avance de main : v2=~22 commits, docs=126). Push via `gh auth switch lyestriki-29` (seul autorisé).
- PUIS prochaine grande tranche DB = **migration RLS + droits** (policies + `revoke execute from public` généralisé + FORCE) = périmètre des 84 advisors différés.
- Effort : `Max`.

## Blockers
- None (R1 socle sain et prouvé ; reste = décision push/PR).

## Key Context
- `oio` (oiozjlvlsfzvkmvltiue) appliqué à `0001→0005`, carnet fidèle, Gate 1 vert. Lanceurs : `runner.mjs` (apply mono-shot) · `scenario.mjs --applied <gate>` (preuve BEGIN/ROLLBACK). Gate 1 = `supabase/tests/gate1_golden_r1.sql`.
- Différés à rejuger : RLS+droits (84 WARN advisor) · `478 vs 120` · `711` · format carnet « bloc » (acté : on applique via le runner, pas la CLI).
- Détail vivant = `PROGRESS_v2-migrations.md`.
