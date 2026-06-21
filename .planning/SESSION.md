# Session State — 2026-06-21 (campagne de test Playwright + correctif lots)

## Branch / Commit
`chantier-vente-cablage` @ `941a370` (dirty : 65 fichiers — chantier étape 3 + .planning/tests + .agents/skills + fichiers parasites)

## Completed This Session
- **Correctif étape 3 onboarding « Lots & Clés »** (10 fichiers, tsc vert, NON commité) : amorçage 1 lot/copropriétaire ; fusion colonne Tantièmes = clé générale (source unique) ; clés « certains lots » (subset) + fix `category` ; fix inserts colonnes dérivées (createLot/updateLot/initializeRepartitionKeyLines) ; surfaçage erreur Step2. Revue adversariale passée.
- **Catalogue de test** : `.planning/tests/` = `PLAN_TEST_MASTER.md` + 13 fichiers `TC_*.md` = **327 cas** (P0=104/P1=127/P2=85/P3=11).
- **Skills installés** : `qa-test-planner` (audit Gen High Risk — scripts inoffensifs, inspectés) + `playwright-generate-test` (safe). Dans `.agents/skills/`.
- **PILOTE Playwright** déroulé en vrai (MCP) sur Résidence Martin → correctif lots **validé en client réel** + **4 incohérences** trouvées → `.planning/tests/PILOTE_FINDINGS_2026-06-21.md`.

## Next Task
- **Figer l'infra Playwright** (helper login `lyes.triki`, charger `.env.local`, baseURL :3100) + **spec pilote lots**, puis dérouler les domaines (UI + base + **prisme expert copro**, alerte immédiate). Cf. mémoire [[playwright-first-testing]].
- Effort conseillé : `ultracode` (fan-out specs par domaine) — activé.

## Blockers
- **Port 3000 occupé par une AUTRE app « TropPayé »** → CoProFlex lancé sur **:3100** (`npm run dev -- -p 3100`, log `.planning/dev-3100.log`). Adapter playwright baseURL.
- Specs e2e existantes : login défaut `admin@coproflex.fr` = INEXISTANT (seul user = `lyes.triki@coproflex.fr`).

## Key Context
- Cloud live `qqfqrcolzmcbsvfaumiq`. Résidence Martin `c0edd2b9` + Paris Ivry `7e17ea99` = TOUTES DEUX en onboarding (step 3) → d'où compteurs 0 + 406 dashboard (voir PILOTE_FINDINGS).
- Reste en attente : commit/push chantier étape 3 ; re-test onboarding 4→8 ; audit cascade ; ménage ~30 fichiers parasites racine.
