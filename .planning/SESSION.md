# Session State — 2026-06-10 (matin : décisions actées + drifts corrigés)

## Branch / Commit
`finance-drift-rebranchement` @ `39d7339` (PR #2 ouverte, non touchée). Nuit = 2 gates E2E + rebranch fournisseurs + infra CI ; matin = 4 fix + décisions G1-G5.

## Décisions actées ce matin (DECISIONS.md §G)
- **G1** bêta AVEC portail copro (→ portail dans le chemin critique) · **G2** cloud = projet NEUF + re-baseline · **G3** wizard appel masqué (fait) · **G4** facture « validée »=posted (fait) · **G5** avoirs = type dédié (spec écrite, 3 Q métier à confirmer).
## Fait ce matin (vérifié)
- Docker relancé, **db:test 8/8** · `tsc`=0 · `vitest`=97/97.
- Drift A (edge `p_tiers_id`/`p_service_order_id`), Drift B (statuts facture + code mort), wizard masqué. 3 commits fix + 1 doc.

## Completed This Session
- ✅ **Gate E2E boucle finance** (`gate_finance_loop_e2e.sql`) : 8 invariants chiffrés date-indépendants (audit=0, GL équilibré, 701=appel, ventilation, 450-1 GL=relevé, 1 impayé, banque=encaissements−décaissements, facture réglée).
- ✅ **Gate E2E clôture/affectation** (`gate_cloture_affectation_e2e.sql`) : prouve le HAUT de la boucle (close→open_next→regularize→approve) jusqu'ici non prouvé — 9 invariants (à-nouveau équilibré, banque reportée, 120=−résultat puis soldé, invariant 110/120 conforme non vacant, affectation 450-1 par quote-part). N'utilise PAS audit_finance_integrity (piège per-lot).
- ✅ Les **deux gates durcis après revue adversariale** (sous-agents). **db:test 8/8** · `tsc`=0 · `vitest`=0.
- 🔎 Diagnostic drift finance front : `createCall`→RPC morte (différé F4), `suppliers`→`tiers` (rebranch à faire), enum `bank_transfer`=faux problème (types périmés). Détail : `RESULTATS_FINANCE_2026-06-10.md`.
- 📋 `ROADMAP_FINALISATION_BETA.md` (phases 0→4) + `PLAN_TRAVAUX_PARALLELES.md` (dispatch multi-sessions sans collision).

## Next Task (au choix USER)
- **(a) Re-baseline reproductible** (prérequis G2 : projet cloud neuf + débloque CI db:test) — fondation.
- **(b) Phase 1 sécurité** : RLS on (~71 tables, policies écrites) + `owner_id`→`auth.uid()` — mur pré-bêta, `ultracode` reco (revue adversariale RLS).
- **(c) Portail copropriétaire** (désormais dans le périmètre bêta, G1) — `PLAN_MAITRE_VUE_COPROPRIETAIRE.md`.
- **(d) Avoirs** (G5) : confirmer les 3 Q métier de `SPEC_AVOIRS_FOURNISSEURS.md` puis coder sur la nouvelle base.

## Blockers
- Avoirs (G5) : 3 questions métier à confirmer avant de coder la migration (cf. spec).
- Re-baseline non faite → CI `db:test` reste non-bloquant ; migration cloud sur GO explicite.

## Key Context
- `0043` & `SESSION.md` « modifiés » dans git = bruit EOL (LF↔CRLF), 0 contenu — ne pas committer.
- Helpers test : `create_clean_test_copro_seeded('x')` déroule toute la boucle (audit=0). Pattern gate : asserts via `RAISE EXCEPTION 'ASSERT FAIL'` + `ROLLBACK_TEST_OK`.
- Travail parallèle USER : worktree off `finance-drift-rebranchement` (pas `main`). Zone Claude = `supabase/tests/`, `scripts/`, `.planning/` ; `src/` libre.
