# Session State — 2026-06-29 (baseline v2 : 0001-0003 écrits/poussés, 0004-0007 = workflow d'authoring)

## Branch / Commit
- **Co-Pro-Flex** (docs) : `refonte-v2-cadrage` @ `78b3dd8` (+ ce commit SESSION) — poussé.
- **coproflex-v2** (code) : `socle-connaissance-v2` @ `220ea55` — poussé.

## Completed This Session
- **Garde-fou anti-copie** + **registre d'inclusion 0001 tranché** (403/229) + **décisions métier** (avoir inclus · budget=version · état daté différé · payment_method 4 · **reprise de mandat TOUT différée**) + factuel résolu par lecture des corps qqfq.
- **Migrations écrites + poussées (brouillons, NON appliqués)** : `0001` (19 enums + 13 tables socle), `0002` (14 tables finance bigint), `0003` (sécurité C16-4 + intégrité GL). Plan = `coproflex-v2/.planning/PLAN_MIGRATION_0001-0004.md` (réorganisé 0001→0007).

## Next Task — RESUME PROPRE (session fraîche conseillée)
- **Workflow d'authoring** des RPC (Lyes a choisi cette voie) en **2 rounds** : round 1 = `0004` (GL core/périodes/plan de comptes/répartition) + `0005` (appels/paiements) ; round 2 = `0006` (fournisseurs/cut-off/audit) + `0007` (RLS/vues).
- **Recette** : (1) prélever les corps qqfq en BOUCLE PRINCIPALE (les sous-agents sont bloqués sur la prod) — requêtes `pg_get_functiondef` par groupe ; (2) poser les corps dans des fichiers locaux ; (3) workflow où chaque agent lit son fichier de corps + le plan + le registre → écrit la migration (copie + **adaptation numeric→bigint centimes** + réécritures : `create_ledger_transaction` retirer WHEN OTHERS, `validate_supplier_invoice` fin double-posting, `allocate_payment`/`reverse_payment` sans cache `amount_paid`, `resolve_lot_tiers_account` 4 natures). NE PAS copier `update_call_status` (statut dérivé en vue).
- ⚠️ `provision_copro_chart` : seeder les **codes légaux** (601 eau, 602 élec, 603 chauffage, 621 syndic, 624 CS) — la version qqfq a déjà 601/602/603 corrects MAIS garde 450-4/459 (loan/doubtful) → **les retirer** (natures différées). Argent du chart = pas concerné (pas de montant), mais convertir tous les `amount` des RPC en bigint.
- PUIS **revue cascade ultracode** (avec Lyes) → BEGIN/ROLLBACK → apply `oio`.

## Blockers
- 3 points à confirmer en revue cascade (déjà flagués dans le SQL + plan) : (A) reprise différée [TRANCHÉ défer] · (B) `call_for_funds_lines` sans `amount_paid`/`status` · (C) avoir inclus.

## Key Context
- `oio` = base neuve cible (vide) · `qqfq` = live gelé (lecture corps = **boucle principale only**).
- Migrations = `coproflex-v2/supabase/migrations/0001..` · spec objets = `REGISTRE_INCLUSION_0001.md` · recette = `PLAN_MIGRATION_0001-0004.md`.
- **Argent = bigint centimes** (REGLES_CODE F1) : toute RPC copiée doit passer en arithmétique entière.
