# Session State — 2026-06-29 (terrain 0001 assaini + brouillons migrations 0001/0002 + plan)

## Branch / Commit
- **Co-Pro-Flex** (docs) : `refonte-v2-cadrage` @ `b0e422b` (+ commit SESSION/CHANTIERS en cours) — poussé.
- **coproflex-v2** (code) : `socle-connaissance-v2` @ `c0bbe5b` — poussé (brouillons 0001/0002 + plan).

## Completed This Session
- **Garde-fou anti-copie** (cause pb session précédente) : plan pilote ADDITIF + bannières voie 1/2 sur qqfq-extract.
- **Registre d'inclusion 0001 tranché** (workflow ultracode `wwidv6rkf`, 403 retenus/229 exclus) ; 3 blockers + flags factuels résolus par lecture des corps de RPC qqfq ; **4 décisions métier** (avoir inclus · budget complémentaire=version · état daté différé · payment_method 4 valeurs). Consigné REFONTE_DECISIONS/CHANTIERS.
- **Brouillons migrations** poussés : `0001_enums_and_socle.sql` (20 enums + 13 tables socle), `0002_finance_tables.sql` (14 tables finance bigint), `PLAN_MIGRATION_0001-0004.md` (recette complète 0003/0004). **NON appliqués.**

## Next Task
- **Écrire 0003** (`0003_finance_rpc.sql`) : helpers sécurité (C16-4) + triggers d'intégrité GL + RPC finance — **fetch des corps qqfq (boucle principale)** + adaptation `numeric(14,2) → bigint` centimes. Puis **0004** (RLS FORCE + policies + revoke anon + vues de preuve, dont `v_call_lines_by_lot_gl`).
- PUIS **revue cascade ultracode** (au retour de Lyes) → BEGIN/ROLLBACK → revue Lyes → apply `oio`.
- Effort : `Max` (rédaction 0003/0004) ; `ultracode` pour la revue cascade.

## Blockers
- 3 points à CONFIRMER en revue cascade (flagués dans le SQL + plan) : (A) `opening_balance_residual_items` déféré vs registre · (B) `call_for_funds_lines` sans `amount_paid`/`status` (dérivés vue) · (C) avoir fournisseur inclus.

## Key Context
- Migrations = `coproflex-v2/supabase/migrations/0001..0004` ; recette = `coproflex-v2/.planning/PLAN_MIGRATION_0001-0004.md` ; spec objets = `REGISTRE_INCLUSION_0001.md`.
- **Argent = bigint centimes** (REGLES_CODE F1) → toute RPC qqfq copiée doit être adaptée à l'arithmétique entière.
- `oio` = base neuve cible (vide) · `qqfq` = live gelé (lecture corps RPC = **boucle principale only**).
- Mineurs ouverts : set final `ledger_source_type` (vs 0003) · `lot_type` valeurs/garage↔parking · `budget_lines.code` · montants HT/TVA informatifs.
