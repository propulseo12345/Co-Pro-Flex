# Session State — 2026-06-16 (V1/V2/V3 câblage + onboarding débloqué)

## Branch / Commit
`chantier-vente-cablage` @ `c1b0e1f` (clean) — **57 commits d'avance sur origin/main, NON poussée**

## Completed This Session
- **V1** (`f3ae6a0`) : `/finance/etats-dates` mock → redirige vers parcours canonique mutations + menu/recherche repointés.
- **V2** (`f2addc3`) : état daté PDF complet (signature + certificat art.20 conditionnel au solde), archivage GED, **avertissement solde vendeur** (RPC `get_lot_balance_45x`, mig **0082**) — revue adversariale passée.
- **V3** (`3d59226`) : écran impayés dé-dupliqué → `/contentieux/impayes` (gardes loading/error portées, liens repointés).
- **Onboarding débloqué** : cabinet créé + profil rattaché (data live) ; `create_copro` (mig **0083**) ; fixes ajout copropriétaire (erreur visible) + suppression copro réparée (`delete_onboarding_copro`, mig **0084**) + stepper (`1484888`, `c1b0e1f`).
- **Migrations 0082/0083/0084 APPLIQUÉES au cloud live** (MCP apply_migration) ; 2 copros test en double supprimées.

## Next Task
- **NOUVELLE SESSION** : audit anti-cascade exhaustif (read-only) **+** harnais de cycle de vie dans `db:test`.
- Tout le cadrage + ce que j'ai déjà trouvé : **`.planning/PROMPT_AUDIT_CASCADE.md`** (à ouvrir en 1er).
- Effort conseillé : **ultracode** (fan-out audit schéma + scan front).

## Blockers
- Aucun. Onboarding à re-tester par USER (créer copro → ajouter copropriétaires → étapes → suppression).

## Key Context
- Cloud live `qqfqrcolzmcbsvfaumiq` **à 0084** ; demo `lyes.triki@coproflex.fr` / `password123`.
- Dump `get_advisors` (sécurité, 188k car.) sauvé dans `.claude/.../tool-results/mcp-supabase-get_advisors-*.txt`.
- Push branche (57 commits) toujours en attente d'une stratégie USER.
