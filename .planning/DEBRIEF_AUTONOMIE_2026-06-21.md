# Débrief autonomie — 2026-06-21 (soir)

> Travail mené en autonomie pendant l'absence de Lyes. Mandat : corriger les bloquants de
> l'audit `AUDIT_FONDATIONS_ROUGES_2026-06-21.md`, **dans l'ordre recommandé, le plus loin possible**.

## ⭐ SYNTHÈSE (état final)

| # | Étape | État |
|---|---|---|
| 1 | Faille RLS (2 tables ouvertes à anon en lecture **et suppression**) | ✅ appliqué + prouvé (advisor → 0 finding) |
| 2 | Garde-fou anti-récidive RLS | ✅ appliqué + testé (positif/négatif) |
| 3 | Séparation des rôles (espace gestionnaire) | ✅ code + type-check + préconditions en base |
| 4 | Hygiène comptes (open-redirect callback) | ✅ ; reset mdp + leaked password → à faire |
| 5 | Intégrité comptable (`reverse_payment`…) | ✅ appliqué + **PROUVÉ** (T1 : mismatch 0→0, plus de créance fantôme) |
| 6 | Annexes légales | 🟦 préparé — **arbitrage expert copro requis** |
| 7 | Vérif bout en bout / 327 cas | ⏳ débloqué (`create_test_copro_seeded`) mais à dérouler |

**Migrations appliquées sur le live : `0085` (RLS), `0086` (garde-fou), `0087` (RPC comptables, reverse_payment prouvée).**

### 👉 À toi (Lyes) au retour
1. **Activer « leaked password protection »** dans Supabase (Auth → Settings) — pas d'API MCP.
2. **Trancher l'arbitrage annexe 1** (s'équilibre-t-elle créances = dettes ? cf. `prepared/0088_annexes_NOTES.md`) avant de poser le gate.
3. **Confirmer l'arbitrage comptable** (`reverse_payment` sur un appel en période approuvée — reco : AUTORISER).
4. Reste à coder : reset mot de passe, câblage front des RPC `0087`, corrections annexes (gate + lignes légales), déroulé des 327 cas (via `create_test_copro_seeded`).

---

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

### Étape 4 — Hygiène comptes — 🟡 PARTIEL
- ✅ **Open-redirect callback OAuth corrigé** : `src/app/auth/callback/route.ts` n'accepte plus qu'un `next` interne (chemin `/…` sans `//` ni `/\`) — bloque `https://app@evil.com`.
- ⏳ **Reset mot de passe** : ABSENT (un vrai syndic en a besoin). Mini-feature front (page « mot de passe oublié » → `resetPasswordForEmail` + page de mise à jour `updateUser`). NON faite (runtime email à valider) → passe dédiée.
- ⏳ **Leaked password protection** : toggle **dashboard Supabase Auth → Settings** (pas d'API MCP) → **action manuelle Lyes**.
- ✅ Compte démo `password123` GARDÉ (besoin tests) — à retirer avant vrai client.

### Étape 5 — Intégrité comptable — ✅ APPLIQUÉE + PROUVÉE
- Workflow design + revue adversariale (6 agents) → verdict **corrections_mineures** ; immutabilité GL SOLIDE (délègue à l'extourne 'od'). 3 corrections intégrées (F-A scope, F-B TOCTOU, F-C avoir).
- **DÉBLOCAGE** : `create_test_copro_seeded` existe sur le cloud → test en `BEGIN/ROLLBACK` (rien persisté) sur copro seedée (3 paiements postés + 6 allocations).
- **`reverse_payment` PROUVÉE (T1)** : status=reversed, allocations=0, **`v_lot_vs_gl_mismatch` 0→0 (plus de créance fantôme)**, extourne 'od'=1. Re-test sur fonctions persistées : idem. Grants F-A OK (`unallocate_payment` inaccessible à `authenticated`).
- **Migration `0087` appliquée sur le live** (3 RPC). Repo : `supabase/migrations/0087_rpc_correction_comptable.sql`.
- ⏳ **Reste** : `cancel_supplier_invoice` appliquée mais NON testée fonctionnellement (0 facture dans le seed → T6-T9) ; **câblage front** (gate + routage, cf. `0087_NOTES.md`) ; arbitrage métier (reco AUTORISER) à confirmer.

### Étape 6 — Conformité annexes — 🟦 PRÉPARÉE (non appliquée — arbitrage métier)
- Workflow design + revue → verdict **corrections_mineures** MAIS **désaccord de fond** synthèse vs revues : **l'annexe 1 « après répartition » s'équilibre-t-elle (créances=dettes) ?** → arbitrage EXPERT COPRO requis (un gate dur mal calibré bloquerait l'envoi de TOUTES les convocations, y compris la boucle d'or).
- **NON APPLIQUÉE** : légalement sensible + gate non testable (cloud vierge) + SQL non auto-suffisant.
- Livrable : `.planning/prepared/0088_annexes_NOTES.md` (3 arbitrages métier, corrections par annexe, garde-fous).
- **Corrections SÛRES isolables** (sans le gate) : élargir couverture comptes annexe 1, rendre la ligne « Solde affecté » annexe 2 (déjà calculée), fallback défensif TS.
- ⚠️ Mémoire `annexes_drift_readonly` CONFIRMÉE obsolète sur le câblage (annexe 1 câblée) ; c'est le CONTENU qui pèche.

### Étape 7 — Vérif bout en bout — 🔴 BLOQUÉE (cloud vierge)
- Nécessite des DONNÉES (rejouer les cas P0 sur une copro avec cycle complet). Le cloud est **vierge** (0 transaction, 2 copros en onboarding).
- **BLOCAGE CENTRAL de toute la suite (étapes 5, 6, 7 + campagne de test)** : aucune donnée de test sur le cloud.
- **Voie de déblocage** : seeder une copro de test (boucle d'or / `create_test_copro_seeded` si dispo) OU dérouler un onboarding complet → puis dérouler les tests des RPC (0087), des annexes, et les 327 cas.

---

## Décisions / notes
- Glob cassé sur ce système (rate `.claude/skills`, les migrations) → utiliser PowerShell/Read pour lister les fichiers.
- TRUNCATE n'est PAS filtré par la RLS (privilège table-level) → révoquer `truncate` de anon/authenticated est nécessaire, pas cosmétique. **Point systémique potentiel** : à généraliser à toutes les tables dans l'étape 2 (garde-fou).
