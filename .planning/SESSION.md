# Session State — 2026-06-28 (cadrage baseline DB v2 : BL-01→BL-09 + audit from-scratch)

## Branch / Commit
- **coproflex-v2** : `socle-connaissance-v2` @ `3d46bf1` — dirty (README + PLAN_PILOTE corrigés BL-09, **non commités**).
- **Co-Pro-Flex** (docs) : `refonte-v2-cadrage` @ `3940fc6` — dirty (REFONTE_DECISIONS + rules-v2 + 2 docs BL + `qqfq-extract/`, **non commités**).

## Completed This Session
- **Cadrage baseline (lot 0001-0004)** : 9 décisions `BL-01→BL-09` + addendum (PE-1→7, ruling chart, audit, BL-MIN) consignés dans REFONTE_DECISIONS.
- **2 règles méthode gravées** (seed = aval Playwright ; copie à 2 voies) dans `methodo` + `rules-v2`. **Pré-vol BL-09** fait (README v2 + anti-piège=0).
- **qqfq extrait** (`.planning/qqfq-extract/` : enums/tables/fonctions/vues) ; **consolidation** + **re-audit from-scratch** (~30 rouilles débusquées → direction MAIGRE confirmée).
- **Tous les flags tranchés** (PE-1→7 + 5 mineurs) ; chart : **décret 14 mars 2005 fait foi** (601 eau/602 élec/603 chauffage/621 syndic), golden à corriger.

## Next Task
- **Résoudre les flags FACTUELS** par lecture de corps de RPC qqfq (boucle principale) : set exact `ledger_source_type` · ALUR table vs GL-pur · `commitments` 408/486 · séquences pièces · `validate_budget_expense` disparaît. **+ corriger codes classe 6 du PLAN_GOLDEN** (montants inchangés). PUIS écrire le lot **0001-0004** (palier socle : plan validé → revue cascade → BEGIN/ROLLBACK → revue Lyes → apply oio).
- Effort conseillé : **`Max`** (lecture ciblée + rédaction plan migration ; gravure SQL supervisée).

## Blockers
- None (cadrage complet ; reste = factuel + écriture).

## Key Context
- Réfs : `.planning/BL_POINT_ENSEMBLE_2026-06-28.md`, `BL_AUDIT_FROMSCRATCH_2026-06-28.md`, `qqfq-extract/`, REFONTE_DECISIONS bloc `BL`.
- **oio** = base neuve cible (vide) · **qqfq** = live gelé (lecture OK en boucle principale seulement). Docs/v2 dirty **non commités** (au choix de Lyes).
