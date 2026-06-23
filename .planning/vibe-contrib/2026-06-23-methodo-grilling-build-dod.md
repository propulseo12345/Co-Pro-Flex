# Contribution vibe-library (BROUILLON — à valider avant push)

**Pattern généralisé** : un skill-méthode réutilisable « cadrer → construire → vérifier » pour agent de code, + un hook anti-dérive. Anonymisé (aucune spécificité CoProFlex).

> ⚠️ **Divergence de stack** : extrait d'un projet **npm / ESLint / CSS Modules / Next→TanStack / Supabase**. NE PAS importer la stack de la library (pnpm / Biome / Tailwind / shadcn). Ne garder que les **principes de process**, pas l'outillage.

## 1. Skill-méthode « grilling → autonomous build → strict DoD »

Un seul skill qui encapsule tout le cycle de travail d'un agent sur un produit à enjeu (ici : comptable). Le rendre **autonome** (inliner le process de grilling) pour ne pas dépendre d'un skill externe.

- **Phase 1 — Cadrer (grilling exhaustif)** : interroger sans relâche, **une question à la fois**, descendre l'arbre de décision branche par branche, **toujours donner sa reco**, et **explorer le code/la base plutôt que demander** quand la réponse y est. Poser le contexte vulgarisé AVANT chaque question. Consigner chaque décision au fil.
- **Phase 2 — Construire (autonomie + boucle de tests)** : tranches verticales ; **boucle d'auto-réparation** (corriger la cause → re-tester jusqu'au vert RÉEL) avec **garde-fous** : jamais désactiver/truquer un test (sinon rouge + signal) ; limite de tentatives par point ; distinguer « code faux » (corriger) de « attendu ambigu » (s'arrêter + demander) ; compte-rendu en fin de run.
- **Phase 3 — Simplifier & relire** : passe de simplification (réutilisation/lisibilité) → re-test → revue (idéalement multi-agents).
- **Phase 4 — Definition of Done stricte** : test e2e qui **PROUVE l'effet en base** (jamais un simple 200) + **non-régression complète** + checks spécifiques (migrations : revue d'impact + rollback + advisor ; finance : invariant d'intégrité + parité golden).

## 2. Hook anti-dérive (rules-injection)

Sur une longue conversation, l'agent dérive (le contexte se compacte). Mécanisme déterministe : un hook `UserPromptSubmit` qui **réinjecte les règles d'or + la DoD à chaque message** (le harnais, pas la mémoire de l'agent).

- Fichier de règles court (≤ ~25 lignes) + petit script qui l'encode en JSON `additionalContext`.
- Si `jq` absent : encoder via Node/Python (éviter le quoting shell fragile).
- Doubler avec une section « règles » en tête du fichier d'instructions projet (ceinture + bretelles).
- Règle de maintenance : décision de **méthode** → mettre à jour le skill + le fichier de règles ; décision **produit** → le doc de décisions.

## 3. Leçon « un chantier = un préfixe unique »

Numéroter les décisions d'un chantier avec un préfixe **distinct** (ex. slugs parlants `UX-HUBS`) ; ne jamais réutiliser une lettre/numéro déjà pris par un autre chantier (sinon une même étiquette désigne plusieurs choses → confusion en lecture).
