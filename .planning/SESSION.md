# Session State — 2026-06-27 (Phase 3 socle v2 : registre 107 + règles de code + double-check)

## Branch / Commit
- **ANCIEN repo** (v1 gelé + cadrage) : `refonte-v2-cadrage` @ `dfb8986` (dirty : `v2-tanstack/src/env.d.ts` orphelin, à jeter).
- **NOUVEAU repo v2** : `coproflex-v2` → `socle-connaissance-v2` @ `0bc1b86` (**clean, NON poussé**).

## Completed This Session
- **Registre de disposition des 107 findings** (107/107 étiquetés ; 59 neutralisés par non-migration ; 6 canoniques à corriger + 18 bandeaux db-cible). 4 contestés ratifiés.
- **Double-check expert adversarial** (Légifrance) des 4 : 008 confirmé · 023 nuancé (art.6-2 = **décret 67-223** ; EXP-5 ventilé) · 028 confirmé (+ **FORCE manquant** 8 tables comm, garde 0086 à durcir) · 030 nuancé (**double plancher** MAX(5% budget ; 2,5% PPT), exemptions post-2023).
- **Grilling règles de code A→G ACTÉ** (7 dimensions) → `coproflex-v2/docs/REGLES_CODE.md`.
- Recherche web skills (workflow `wmkakw048`) → catalogue 27 + socle à installer.
- Branche + arbo + **3 docs-socle committés** (`0bc1b86`).

## Next Task
- **Phase 3 suite** : faire atterrir les **6 fichiers canoniques nettoyés** + les **18 bandeaux db-cible** (→ WORKFLOW), puis **dossier des arbitrages ouverts** + **re-grep anti-piège = 0**. Détail : `coproflex-v2/.planning/PLAN_SOCLE_CONNAISSANCE_v2.md`.
- Effort conseillé : **`ultracode`** (fan-out fichier par fichier). ⚠️ **1 workflow à la fois** (2 en parallèle = throttle serveur).

## Blockers
- None. (push nouveau repo via git HTTPS compte `propulsFlex` ; gh CLI absent.)

## Key Context
- Bascule du dossier de travail → `coproflex-v2` **seulement en Phase 4** (mémoire + règles vivent encore dans l'ancien repo).
- Registre = `coproflex-v2/.planning/REGISTRE_DISPOSITION_107.md` · règles de code = `coproflex-v2/docs/REGLES_CODE.md`.
- Leçon workflow : 2 workflows simultanés = throttle Anthropic transitoire → résolu par `resumeFromRunId` + lots allégés.
