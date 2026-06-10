# Brouillon contribution vibe-library — 2026-06-08

> Patterns généralisés issus de la tranche T1 (rebranchement front↔back post-refonte DB).
> **À pousser vers la library après validation USER** (action sortante).
> ⚠️ TAG DIVERGENCE STACK : projet source = **npm / ESLint / CSS Modules / Next.js / Supabase local (Docker psql)**.
> La library impose pnpm / Biome / Tailwind → **prendre les principes, jeter le tooling**. Anonymisé (pas de code projet brut).

## Pattern 1 — Workflow "tranche verticale sur backend refactoré" (3 phases)
Quand un front existant doit être rebranché sur un schéma backend reconstruit/renommé (drift) :
1. **Comprendre (multi-agents, lecture seule)** : N explorateurs en parallèle cartographient l'état RÉEL (front: écran→hook→api→appel back ; back: objets DB réellement présents). Sortie structurée (schema JSON) → blueprint ordonné. NE PAS supposer ; vérifier chaque objet en base.
2. **Implémenter** la tranche en mono-agent séquentiel (les fichiers sont interdépendants → le fan-out créerait des conflits). Commits logiques séparés.
3. **Revue adversariale** (multi-agents) AVANT commit : reviewers par dimension → réfutation de chaque finding blocker/major par un 2e agent (« tente de prouver que c'est un faux positif »). Ne garder que les `is_real`.
- Leçon : la revue a rattrapé 2 bugs réels qu'une vérif tsc/test verte masquait (filtre d'audit pointant des constantes mortes = faux-vert ; fix d'écriture qui transformait « rien ne se sauve » en « la sauvegarde efface »).

## Pattern 2 — Gate SQL "auto-rollback" (test d'invariant sans pollution)
Bloc PL/pgSQL où le corps fait son scénario puis `RAISE EXCEPTION 'ROLLBACK_TEST_OK'` ; le `EXCEPTION WHEN OTHERS` transforme ce marqueur en `NOTICE` (succès) et re-`RAISE` toute autre erreur (échec). Le savepoint implicite du bloc EXCEPTION **annule toutes les écritures** → zéro pollution, exécutable en prod-like sans transaction externe.
- Piège attrapé : un filtre d'assertion sur des `issue_type` obsolètes passe TOUJOURS (count 0) = faux-vert. Toujours **prouver par mutation** (injecter une vraie anomalie → l'assertion doit virer au rouge).

## Pattern 3 — Runner de gates DB cross-plateforme
Petit script Node (`child_process`) qui pipe chaque fichier SQL (précédé du claim d'auth service) dans `docker exec psql -v ON_ERROR_STOP=1`, et échoue si exit≠0. Liste **curatée** (pas un glob) tant que des domaines restent driftés ; logguer ce qui n'est pas couvert (pas de cap silencieux). Branché en script `db:test` séparé du test unitaire.
