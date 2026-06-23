# Chantier hygiène repo — 2026-06-23 (préfixe `HY-`)

Objectif : repartir sur une base de travail propre **avant** la refonte v2, sans toucher
au code (v1 gelé, v2-tanstack en cours). Cadré par grilling (méthode `methodo-coproflex`).

## Constat (réel vérifié)

- `Flex/` (dossier ouvert dans l'éditeur) **n'est PAS un repo git** : simple coquille
  non versionnée autour du vrai projet.
- Le vrai projet = `Co-Pro-Flex/` (contient `.git`, `package.json`, les 4 commits du jour).
- La coquille `Flex/` est polluée : ~60 fichiers vides à noms absurdes (artefacts de
  commandes shell mal échappées), screenshots, logs, `node_modules` orphelin (pas de
  `package.json` à ce niveau), dossiers `Python/`, `poc-tanstack-start/`, `test-results/`,
  doublons `CLAUDE.md`/`AGENTS.md`/`.cursorrules`.
- Dans `Co-Pro-Flex/` : `.planning/` = **287 fichiers** (beaucoup périmés, certains encore
  référencés par la mémoire) + dossiers ressources (Ads Vidéo, Cours Syndic, Etudes…).

## Décisions

- **HY-1 — Périmètre** : nettoyage de l'environnement de travail **+** dé-imbrication.
  *(écarté : réorganiser le code v1 `src/` — il meurt gelé, le ranger = effort perdu + risque de recopier l'ancien.)*
- **HY-2 — Méthode de dé-imbrication** : « sûre ». `Co-Pro-Flex/` devient la racine de
  travail (rouvrir l'éditeur dessus) ; on **vide la coquille `Flex/`** ; **aucun fichier
  projet n'est déplacé** (zéro risque sur le `.git`).
  *(écarté : remonter physiquement `Co-Pro-Flex/` d'un cran — plus net visuellement mais nécessite de fermer l'éditeur pendant le déplacement, bénéfice surtout esthétique.)*
- **HY-3 — Contenu interne lourd** (`.planning` + ressources) : **archiver, pas supprimer**.
  Tri assisté (workflow multi-agents) ; périmé → `git mv` vers `_archive/`, ressources →
  `_ressources/`. Réversible à 100 %. Critère : *vivant* si référencé par
  MEMORY/SESSION/REFONTE_DECISIONS/CLAUDE **ou** chantier non clos ; sinon *périmé* ;
  doute = garder à plat.

## Plan d'exécution

0. **Sécuriser** — push `refonte-v2-cadrage` sur GitHub ✅ ; reporter permissions (bloqué
   par garde-fou harness → laissé à la main de Lyes via `/permissions`).
1. **Vider la coquille `Flex/`** — recenser, montrer la liste, puis supprimer (Max).
2. **Trier `.planning` (287) + ressources** — workflow ultracode, classement validé avant `git mv`.
3. **`.gitignore`** — screenshots, logs, scratch (`forms-rollout`, `lint-*`).
4. **Bascule** — Lyes rouvre l'éditeur dans `Co-Pro-Flex/` → le hook `UserPromptSubmit` s'active.

## État

- [x] HY-0a push branche (GitHub)
- [x] HY-0b report permissions (fait après autorisation explicite de Lyes)
- [x] HY-1 vider coquille Flex/ : **79 → 2 entrées** (Co-Pro-Flex/ + .claude/). POC archivé (`_archive/poc-tanstack-src/`) avant suppression.
- [x] HY-2 tri .planning : **127 → 46 fichiers à plat**, 83 archivés dans `_archive/2026-06-23/`. Workflow 9 agents + vérif adversariale + double-contrôle mécanique = **14 fichiers sauvés** (cités en dur par docs/ : AUDIT_DRIFT_*, CARTE_DOUBLONS, PROGRESS_REFONTE/V1/lot-fonctions/budget-trous, PLAN_MAITRE_VUE_COPRO, preview-compta-v1, preview-budget-v2, previews/, gate_0035/0037, DEFERRED_USER_DECISIONS).
- [x] HY-3 .gitignore : scratch lourd neutralisé (forms-rollout/lint-* ~2,5 Mo, sur disque hors git) + anti-récidive (screenshots/logs/dumps).
- [ ] HY-4 bascule : Lyes rouvre l'éditeur dans Co-Pro-Flex/ (active le hook).

## Commit (en attente GO Lyes)
Proposé : `chore(hygiene): archive 83 fichiers .planning perimes + gitignore scratch + doc HY-*`
(75 renames git, .gitignore, HYGIENE_REPO, _archive/poc-tanstack-src/, settings.local.json)
