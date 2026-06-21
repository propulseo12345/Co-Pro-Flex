# Débrief autonomie — 2026-06-21 (soir)

> Travail mené en autonomie pendant l'absence de Lyes. Mandat : corriger les bloquants de
> l'audit `AUDIT_FONDATIONS_ROUGES_2026-06-21.md`, **dans l'ordre recommandé, le plus loin possible**.

## Règles de la session (rappel)
- **Au fil de l'eau, y compris sur le LIVE** (`qqfqrcolzmcbsvfaumiq`), avec un **test à chaque correction**.
- **GROSSE REVUE D'IMPACT EN CASCADE AVANT CHAQUE MIGRATION** (consigne Lyes) — voir mémoire `cascade_review_before_migration`.
- Compte démo `password123` **gardé** (nécessaire aux tests) — à retirer avant le vrai client.
- Live à **0084** au démarrage → migrations à partir de **0085**.
- Branche `chantier-vente-cablage`. Commits + push au fil de l'eau.

---

## Avancement

### Étape 1 — Sécurité RLS : 2 tables sans serrure — ✅ FAIT (appliqué LIVE + prouvé)
Tables `opening_balance_residual_items` (0077) + `supplier_advances` (0078).
- **AVANT** : `rls=false`, `0 policy`, `anon` SELECT+INSERT+DELETE+TRUNCATE=true (fuite + destruction anonyme cross-cabinet).
- **Revue cascade (sous-agent)** : verdict SÛR — aucun accès direct front, les 4 RPC d'accès toutes `SECURITY DEFINER` (non affectées), `0084 delete_onboarding_copro` OK (DELETE via DEFINER), 0 vue / 0 trigger / 0 FK entrante.
- **Migration `0085` appliquée sur le LIVE** (`apply_migration` → success).
- **APRÈS (prouvé en base)** : `rls=true`, `1 policy p_mgr_all`, `anon SELECT/TRUNCATE=false`, `auth SELECT=true / TRUNCATE=false`.
- **Advisor sécurité** : les 2 `rls_disabled_in_public` ont DISPARU. Reste `security_definer_view` ×3 = vue `tiers_directory` → **faux-positif assumé** (DEFINER délibéré qui masque les RIB, filtre `user_has_copro_access`).
- ✅ **Faille fermée.**

### Étape 2 — Garde-fou anti-récidive RLS — ⏳ À FAIRE
Ajouter les 2 tables au registre `apply_rls_environment()` (0034) + gate « toute table public sans RLS = échec » + advisor à zéro.

### Étape 3 — Séparation des rôles (layouts dashboard/gestionnaire) — ⏳ À FAIRE
Un copropriétaire connecté peut charger l'UI gestionnaire (layouts ne testent que `user != null`).

### Étape 4 — Hygiène comptes — ⏳ À FAIRE
Reset mot de passe (absent), leaked password protection, valider `next` du callback. (Démo gardé.)

### Étape 5 — Intégrité comptable — ⏳ À FAIRE
`reverse_payment` (nettoie payment_allocations + amount_paid), `cancel_supplier_invoice`, `unallocate_payment` + bridage gate front `canReverseSelected`.

### Étape 6 — Conformité annexes — ⏳ À FAIRE
Gate d'équilibre annexe 1, ligne « Solde affecté aux copropriétaires » + bloc travaux annexe 2, réalisé par clé annexe 3. (Note mémoire `annexes_drift_readonly` à corriger : câblage OK, contenu en cause.)

### Étape 7 — Vérif bout en bout — ⏳ À FAIRE
Rejouer les cas P0 (Playwright front + SQL RPC/RLS) sur la golden loop.

---

## Décisions / notes
- Glob cassé sur ce système (rate `.claude/skills`, les migrations) → utiliser PowerShell/Read pour lister les fichiers.
- TRUNCATE n'est PAS filtré par la RLS (privilège table-level) → révoquer `truncate` de anon/authenticated est nécessaire, pas cosmétique. **Point systémique potentiel** : à généraliser à toutes les tables dans l'étape 2 (garde-fou).
