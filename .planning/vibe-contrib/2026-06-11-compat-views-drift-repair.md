# [Brouillon vibe-library] Workflow — Réparer un front câblé sur des objets DB disparus (vues de compat + revue adversariale)

> Statut : BROUILLON local, à pousser vers la library après validation (outil `create_library_document`).
> Tag stack : pattern SQL/process **agnostique** — né sur un projet npm/ESLint/CSS Modules (≠ stack library pnpm/Biome/Tailwind) ; rien à adapter côté tooling, tout est PostgreSQL/Supabase + méthode.

## Problème générique

Après une re-baseline de schéma (migrations réécrites au propre), le front « 100 % branché Supabase » continue de compiler et d'afficher… du vide : il interroge des **vues/tables qui n'existent plus**, le fichier de types généré historique (qui les déclare encore) masque tout au compilateur, et les casts `as unknown` cachent les écritures cassées. Symptôme : écrans vides silencieux, toasts « succès » mensongers.

## Workflow (éprouvé, ~1 journée pour un module)

1. **Diagnostic en 3 listes** : refs front (`grep .from(/.rpc(`) ↔ objets base vivante ↔ objets issus d'un rejeu pur des migrations. Les écarts entre les 3 disent : cassé au runtime / drift manuel non migré / fantômes de types.
2. **Le contrat de colonnes = l'ancien fichier de types committé** (ce contre quoi le front a compilé), pas le SQL d'origine : extraire les `Row` des vues mortes depuis `git show <commit>:types.ts`.
3. **Vues de COMPATIBILITÉ** `security_invoker` : exposer l'ancien contrat calculé depuis le nouveau schéma (renommages, FK inversées via `lateral`, champs dé-scopés en constantes). Vérifier la **classe RLS de chaque table jointe** : INNER JOIN vers une table plus restrictive = lignes qui disparaissent pour certains rôles → LEFT JOIN.
4. **Écritures** : couche de traduction unique dans le data-hook (slug→id avec erreur explicite, `[]` = désélection) ; **chasser les casts** qui masquent les payloads legacy.
5. **Types régénérés depuis un rejeu scratch** (base jetable rejouant 0001→N), jamais depuis la base vivante.
6. **Gate SQL anti-faux-vert** : assertions en valeur (pas `IS NOT NULL`), tests négatifs des filtres, croisement avec la source canonique, données seedées, échec dur si le référentiel manque. Tester la gate **par mutation** (redéfinir la vue cassée en transaction → la gate doit rougir).
7. **Revue adversariale multi-agents** avant merge : N reviewers par dimension (RLS/sécurité, sémantique métier, correction front, faux-verts du harnais), chaque finding contre-vérifié par 2 sceptiques (reproduction empirique + attaque du mécanisme). Sur ce chantier : 21 findings bruts → 18 confirmés dont 2 critiques invisibles à tsc.

## Ce que la revue attrape que les suites ratent

- Payloads legacy derrière `as unknown` (création d'entité cassée, tsc vert).
- Lateral « dernière ligne » sans filtre de statut (une ligne annulée masque la vraie).
- Compteurs désalignés avec un trigger métier qui réécrit les statuts.
- Gates qui restent vertes quand on mutile la vue (aucune assertion de valeur).
- Incohérences inter-vues sous RLS selon le rôle (sur-restriction silencieuse).
