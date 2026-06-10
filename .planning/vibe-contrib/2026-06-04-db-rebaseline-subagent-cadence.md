# Pattern — Re-baseline d'un schéma DB depuis un blueprint, en cadence subagent-driven

> Pattern généralisé/anonymisé extrait d'un chantier réel de reconstruction de base.
> ⚠️ **Divergence stack** : projet source = npm / Supabase CLI local / SQL brut. La library
> cible pnpm/Biome/Tailwind — ce pattern est **backend/DB, agnostique au front**. Un seul
> point est Supabase-spécifique (numérotation des fichiers de migration).
> Statut : contribution à transformer en prompts curatés + workflow library.

## Quand l'utiliser
Le dépôt de migrations n'est plus reproductible, ou tu veux **reconstruire un schéma
proprement** à partir d'un blueprint écrit (spec de la base cible), migration par migration,
avec un haut niveau de garantie de justesse. Complète « Migration mock → Supabase » (qui câble
le front aux tables) : ici on **reconstruit le schéma lui-même**.

## Pré-requis
- Un **blueprint canonique** = source de vérité (tables/colonnes/contraintes/index décrits,
  idéalement générable, « 0 trou mécanique »).
- Un **plan d'exécution** ordonné par dépendances : extensions → enums → socle (tenant/entités
  racines) → domaines → helpers d'autorisation → triggers d'intégrité → vues → sécurité (RLS).
- Un environnement de test **local** où l'on peut **rejouer toute la chaîne depuis zéro** (reset).

## La cadence, par migration (trio STRICT)
1. **Implémenteur** (subagent, modèle rapide) : écrit UN fichier de migration depuis le
   blueprint, applique les conventions de nommage du projet. Ne teste/commit rien.
2. **Relecteur conformité** (subagent) : fidélité au blueprint, colonne par colonne (types,
   nullabilité, FK + clause `on delete`, CHECK, index, y compris partiels/GIN) → sortie
   **structurée** (schéma : booléens de vérification + liste d'issues classées blocker/major/minor).
3. **Relecteur qualité** (subagent, en parallèle du conformité) : style, cohérence transverse,
   replay-safety (ordre intra-fichier, dépendances satisfaites en amont), bonnes pratiques →
   sortie structurée.
4. **Orchestrateur** (humain ou agent principal) : trie vrai/faux positif, applique les vrais
   fixes, **rejoue la chaîne complète en local**, vérifie via requêtes structurelles **+ tests
   fonctionnels** (insérer une donnée qui viole la contrainte, en **transaction annulée**, et
   prouver le rejet par le bon code d'erreur), puis **commit isolé** (un commit par migration).

**Variante batch** pour le socle léger (micro-tables, fonctions triviales) : 1 implémenteur
écrit le lot entier, puis relecture conformité (1 relecteur/table en parallèle) + 1 relecteur
qualité transverse. Réserver le **trio STRICT** aux migrations grosses ou sensibles (cœur
comptable, sécurité, intégrité).

## Principes appris (les pièges qui comptent vraiment)
- **Blueprint > plan.** Le plan d'exécution peut dériver (oublier un index pourtant listé au
  blueprint) ; le blueprint fait foi → rattraper l'écart. À l'inverse, **ne pas ajouter** un
  objet absent du blueprint juste « pour homogénéiser » (sauf si le blueprint l'exige).
- **Conventions de nommage explicites, décidées tôt** (la 1ʳᵉ table fait précédent) : préfixer
  PK / UNIQUE / CHECK / index de façon homogène (`pk_`, `uq_`, `ck_`, `idx_`). Normaliser même
  quand la source mélange les préfixes ou laisse des contraintes anonymes.
- **Artefacts d'échappement markdown** : le SQL inline d'un document peut contenir des
  placeholders doublés (`%%`) → bug **latent** en plpgsql (le reset passe, mais le trigger
  plante à l'exécution car le placeholder n'est pas substitué). Toujours réécrire en placeholder
  simple (`%`), et le **prouver fonctionnellement**.
- **Numérotation purement numérique** des fichiers (pas de suffixe alpha type `0013b`) —
  certains CLI (Supabase) refusent : « file name must match `<timestamp>_name.sql` ». Prévoir un
  **décalage propre** (renuméroter la suite) plutôt qu'un « insert entre deux » impossible.
- **FK différées** : quand B référence A mais est créée avant, mettre la colonne en `uuid` nu +
  ajouter la **FK rétroactive** (`ALTER … ADD CONSTRAINT`) dans une migration ultérieure, pour
  respecter l'ordre de création. Documenter le numéro de migration cible dans un commentaire.
- **Tester le comportement, pas l'application.** Une migration « qui s'applique » ne prouve pas
  que ses garde-fous marchent. Tester chaque CHECK / UNIQUE partiel / trigger par une **violation
  attendue** en transaction `rollback`, et vérifier le message/erreur réel.
- **Commits isolés et reproductibles** : un commit par migration, message qui cite la source
  blueprint et les écarts traités. La chaîne `0001 → N` doit se rejouer à neuf sans erreur.

## Anti-patterns
- Faire écrire **ET** tester **ET** committer par le même agent, sans relecture croisée.
- Faire confiance au SQL inline du plan sans recouper le blueprint canonique.
- Valider une migration sur « le reset passe » sans **test fonctionnel** des contraintes.
- Ajouter des index/objets non spécifiés « par prudence » → diverge du blueprint, gonfle l'écart.

## Sorties structurées recommandées (pour les relecteurs subagents)
- **Conformité** : `{ conforms, <booléens ciblés par table/règle>, issues:[{severity,location,problem,expected,fix}], summary }`
- **Qualité** : `{ style_consistent, naming_consistent, replay_safe, issues:[{severity,location,problem,fix}], summary }`

Forcer une **sortie structurée** (schéma JSON) côté relecteur évite le « tout va bien » vague et
rend le tri vrai/faux positif mécanique.
