# Session State — 2026-06-29 (baseline v2 : 0001-0003 écrits + REVUS + corrigés ; 0004-0007 = workflow authoring)

## Branch / Commit
- **Co-Pro-Flex** (docs) : `refonte-v2-cadrage` @ `f5f9e0d` (+ ce commit) — poussé.
- **coproflex-v2** (code) : `socle-connaissance-v2` @ `6eab1ad` — poussé.

## Completed This Session
- **Garde-fou anti-copie** + **registre 0001 tranché** (403/229) + **décisions** (avoir inclus · budget=version · état daté différé · payment_method 4 · **reprise de mandat TOUT différée**) + factuel résolu (lecture corps qqfq).
- **Migrations brouillon ÉCRITES (NON appliquées)** : `0001` (enums+socle), `0002` (tables finance bigint), `0003` (sécurité C16-4 + intégrité GL).
- **REVUE de conformité multi-agents** (workflow, verdict « écarts à corriger », 35/51 confirmations) → **4 corrections appliquées + VALIDÉES par Lyes** : garde-fou équilibre au post (trigger), 3 gardes GL étendus à l'UPDATE, `lot_type` `commerce`→`local_commercial` (garage gardé), registre rendu cohérent. Tout poussé (`6eab1ad`).
- **NOUVELLE RÈGLE gravée** (methodo + rules-v2 + mémoire `review_triage_before_fix`) : retours de revue → `AskUserQuestion` → tri Lyes → SEULEMENT après je corrige.

## Next Task — session FRAÎCHE conseillée (contexte actuel lourd)
- **Workflow d'authoring** RPC, 2 rounds : R1 = `0004` (GL core/périodes/plan de comptes/répartition) + `0005` (appels/paiements) ; R2 = `0006` (fournisseurs/cut-off/audit) + `0007` (RLS/vues).
- Recette détaillée = `coproflex-v2/.planning/PLAN_MIGRATION_0001-0004.md` (prélever corps qqfq en BOUCLE PRINCIPALE → fichiers locaux → workflow d'adaptation bigint + réécritures). PUIS revue cascade (avec tri Lyes) → BEGIN/ROLLBACK → apply `oio`.

## Blockers
- None. (3 points autrefois flagués = tranchés : reprise différée, call lines sans amount_paid, avoir inclus.)

## Key Context
- `oio` = base neuve cible (vide) · `qqfq` = live gelé (lecture corps = **boucle principale only**).
- **Argent = bigint centimes** : toute RPC qqfq copiée passe en arithmétique entière. Statut payé/partiel = dérivé en vue (jamais stocké).
- Migrations = `coproflex-v2/supabase/migrations/0001..0003` (+ 0004-0007 à venir).
