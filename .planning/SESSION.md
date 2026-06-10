# Session State — 2026-06-10 (avoirs G5 + re-baseline G2 + design portail copro)

## Branch / Commit
`finance-drift-rebranchement` @ `b0ee3c0` (clean hors bruit EOL ; PR #2 ouverte, non touchée).

## Completed This Session
- **Nuit (autonome)** : 2 gates E2E (boucle finance + clôture/à-nouveau/affectation), rebranch fournisseurs `suppliers→tiers`, infra CI + headers sécu, 4 docs planning. Tout revu adversarialement.
- **Matin** : 4 drifts finance (edge `p_tiers_id`, statuts facture `validée=posted` + code mort, wizard appel manuel masqué) ; décisions **G1-G5** actées (DECISIONS.md §G).
- **Avoirs fournisseurs G5 LIVRÉS** (migration `0044`) : type dédié, écriture inverse C6xx/D401, vue nette, paiement avoir-aware (B1/B2/B3 de la revue corrigés). Gate `gate_avoir_fournisseur_e2e.sql`. **db:test 9/9**, tsc=0, vitest=97/97.
- **Re-baseline G2 PROUVÉE** : 0001→0044 rejoue à 0 erreur (même en transaction/fichier) + smoke audit=0 ; `scripts/rebaseline-check.sh` ; **CI db:test passée BLOQUANTE** ; rapport `RE-BASELINE_READINESS.md`.
- **Design portail copropriétaire VALIDÉ** (brainstorm) : contrats des 8 pages vérifiés vs schéma réel (fan-out 5 agents), 6 écarts vs plan corrigés ; filtre `listPendingInvoices`→`['posted']` (ecaab1f). Spec committée → voir Next Task.

## Next Task (sessions séparées, choix USER)
- **Phase 1 sécurité/RLS** (session neuve) : corriger **B1** (RLS off en prod, `app.environment` jamais posé) + M2 (assertion anon) dans 0034/0042. Effort conseillé : **`ultracode`** (enjeu fuite de données, revue adversariale).
- **Portail copropriétaire** (session séparée) : **spec prête** → `/writing-plans` puis implémentation. V1 zéro-migration, 100% parallèle. Effort : **`Max`** (cadrage/plan) + **`ultracode`** ponctuel (revues SQL/RLS au moment du gate de lancement).
- **Déploiement cloud neuf** : sur GO user, après RLS.

## Blockers
- B1 (RLS OFF en prod) = différé session RLS — non négociable avant 1er cabinet. Détail : `RE-BASELINE_READINESS.md`.

## Key Context
- db:test 9 gates ; `bash scripts/rebaseline-check.sh` re-prouve la repro (non destructif).
- Décisions canoniques = `DECISIONS.md §G`. Avoirs : 3 Q métier validées (Q1/Q2/Q3).
- Sessions parallèles USER actives dans `src/` (lane B/C committées) — zone Claude = supabase/tests, scripts, .planning.
- **Spec portail** = `docs/superpowers/specs/2026-06-10-portail-coproprietaire-design.md` (contrats vérifiés, server-first RSC, V1 zéro-migration, RLS=gate de lancement). NB : re-baseline SQL = DÉJÀ FAITE (reste = cutover cloud + drift de contrat hors-finance).
