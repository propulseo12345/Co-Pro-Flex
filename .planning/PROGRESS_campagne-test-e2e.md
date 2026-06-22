# PROGRESS — Campagne de test E2E « prêt pour un vrai syndic »

> Suivi long terme. Cadrage : mémoire [[test_campaign_cadrage]] + `.planning/CADRAGE_CAMPAGNE_TEST_2026-06-21.md` + catalogue `.planning/tests/PLAN_TEST_MASTER.md` (327 cas).
> **Plan EXHAUSTIF (golden + valeurs attendues vérifiées) : `.planning/tests/PLAN_GOLDEN_EXHAUSTIF.md` (grilling 2026-06-22, 12 décisions + audit adversarial).**
> Leçons réutilisables : `.planning/tests/LECONS.md`. Bugs : `.planning/tests/BUGS.md`.

## Plan golden exhaustif (2026-06-22, EN ATTENTE GO USER avant code)
- **Audit héros préalable** : Acte 1 actuel = onboarding squelette (3 étapes traversées à vide : banque, reprise, budget mono-ligne) ; assertions trop maigres. → on refait riche.
- **Golden « E2E-GOLDEN Domaine des Tilleuls »** : 18 lots / 2 bâtiments / 10 copro (3 multi-lots) / base 10000 / **7 clés** (générale, ascenseur subset pondéré, bât A, bât B, eau base surface, chauffage subset, ALUR).
- **2 exercices (2026→2027), 3 AG** (AGO 2026 set complet + AGE 2026 garde budget + AGO 2027 affectation/continuité) ; cycle financier riche (impayés, cut-off, multi-factures, 5 annexes, affectation, report, état daté art.5 sur vente B-101).
- **Preuve = valeurs attendues pré-calculées + double preuve écran/base + audit=0 après chaque acte ; zéro dette immédiate.**
- **2 corrections de l'audit adversarial** : (1) cents par lot du courant **non déterministes** en trimestriel (K1/K5 résidu demi-cent) → **appel courant annuel unique** recommandé pour seed déterministe ; (2) impayé GL strict = **10 207,50** (≠ scénario 6 337,50), cumul clôture = **219 157,50**.
- **NEXT** : valider le plan avec USER → mettre `create_test_copro_seeded` à la forme golden → écrire `golden-from-scratch.spec.ts` (narratif sériel) puis specs ciblées puis `reprise-mandat.spec.ts`.

## Refonte wizard onboarding (2026-06-22, LIVRÉE — tsc + 168 tests verts)
- **Décision USER** : enrichir le wizard AVANT la campagne (besoins vrai syndic), après revue de cascade (3 agents) prouvant que tout est déjà en base → **0 migration**.
- **Surface** : champ ajouté à `CreateLotModal`/`EditLotModal` (colonne `lots.surface` existait).
- **Base surface (clés)** : ajoutée à `BASIS_OPTIONS` de `CreateKeyModal`/`EditKeyModal`.
- **Bâtiments** : `src/lib/buildings/api.ts` (CRUD, RLS déjà OK) + hook `useBuildings` + composant `BuildingsManager` + sélecteur bâtiment dans les 2 modales de lot + bloc en haut de l'**étape 3** + intégration **settings/info**.
- **Clé ALUR ABANDONNÉE** : aucun code ne lit `category='alur'` (ALUR via `budget_type='alur'`) → ne pas créer.
- **Gaps produit fichés (backlog, hors scope)** : sélecteur bâtiment dans `LotsSection` de settings (modèle séparé), JOIN buildings dans `v_unpaid_by_lot` (affichage bâtiment des impayés), colonnes surface/bâtiment dans `LotTable`/grille/détail lot.
- **Vérif runtime à faire par USER** : `npm run dev` → onboarding étape 3 (créer bâtiment, lot avec surface + bâtiment) ; créer une clé base surface ; settings/info bâtiments.

## Infra (faite)
- Playwright **1.61** (navigateur en cache), `playwright.config` : `workers:1` + `fullyParallel:false` (base cloud partagée) + `actionTimeout:15s`.
- Helpers `e2e/support/` : `login`, `getAdminClient` (service-role), `stepBlock` (⚠️ à éviter, cf. L07), **`onboardCopro`** (wizard A→8, réutilisable).
- Isolation : copros préfixées `E2E-` ; **pas de teardown auto** (inspection) ; purge à la demande `.planning/tests/purge_test_copros.sql` (admin MCP, replica).

## Test « héros » pluriannuel (`e2e/cycle-annuel-hero.spec.ts`)
- [x] **Acte 1 — Onboarding** (copro + budget validé + appel posté ; preuve écran + GL audit=0) — **VERT**
- [ ] Acte 2 — Encaissement des appels (D512/C450)
- [ ] Acte 3 — Facture fournisseur + paiement (D6xx/C401, D401/C512)
- [ ] Acte 4 — Clôture 2026 + 5 annexes + affectation résultat
- [ ] Acte 5 — Passage 2027 (open_next_period) : report à-nouveaux
- [ ] Acte 6 — Exercice 2027 : continuité (budget N-1, impayés reportés)

## Bugs trouvés
- **BUG-001** ✅ corrigé : `ledger_transactions.created_at` inexistant → onboarding bloqué étape Budget (PR #35).
- **BUG-002** 🔴 à corriger (PRIORITÉ prochaine session) : portefeuille affiche les copros en onboarding + clic → dashboard au lieu de `/onboarding/{id}`.

## Décisions / rappels
- Migrations appliquées par CLAUDE via MCP, protocole strict ([[migration_governance_test_campaign]]).
- Bugs : bloquant → corrigé pour débloquer ; non-bloquant → fiché + lot.
- vibe-library : enrichissement **après l'Acte 6** (décision Lyes 2026-06-22).
