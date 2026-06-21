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

### Étape 2 — Garde-fou anti-récidive RLS — ✅ FAIT (appliqué LIVE + testé)
- Migration `0086` : fonction `assert_public_tables_have_rls()` (lève si une table `public` n'a pas la RLS).
- **Choix de sécurité** : j'ai écarté la reco du sous-agent de RÉÉCRIRE `apply_rls_environment` (liste de 88 tables reconstituée de mémoire = trop risqué : une omission désactiverait une RLS) ET la liste de tables attendues (fragile). → vérif directe de la propriété, **liste blanche vide** (0 table sans RLS aujourd'hui).
- **Appliquée** + **testée** : positif (passe) ET négatif (table sonde sans RLS → détectée `42501`, sonde droppée).
- ⚠️ À exécuter **contre le CLOUD** (RLS ON), PAS `db:test` local (RLS off volontaire en dev, décision F5 — c'est pourquoi les gates RLS sont déjà en `DEFERRED_GATES` non bloquantes).
- **TODO infra (non bloquant)** : brancher `select public.assert_public_tables_have_rls();` (ou `get_advisors security`) dans un check **cloud pré-déploiement / job CI cloud** pour automatiser la prévention.

### Étape 3 — Séparation des rôles (espace gestionnaire) — ✅ FAIT (code + type-check ; runtime copro différé)
- `src/app/(gestionnaire)/layout.tsx` : garde de rôle ajoutée — user authentifié sans membership `gestionnaire`/`platform_admin` → redirigé vers `/dashboard`.
- **Préconditions vérifiées en base (anti-régression)** : `lyes.triki` a bien `role=gestionnaire` (passe) ; RLS `memberships` a `p_own_select (user_id=auth.uid())` → self-read OK ; `/dashboard` existe (≠ `/portefeuille-immobilier` qui N'existe PAS — erreur du sous-agent évitée) → pas de 404 ni boucle.
- `(dashboard)` NON modifié (espace partagé copro+gestionnaire, RLS filtre les données).
- **type-check : 0 erreur**.
- ⚠️ **Test runtime différé** : aucun user `coproprietaire` n'existe (portail pas construit) → garde préventive ; à prouver via Playwright quand un user copro existera.

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
