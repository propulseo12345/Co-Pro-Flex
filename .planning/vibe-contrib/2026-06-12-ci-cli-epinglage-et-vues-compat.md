# Brouillon vibe-library — 2 patterns généralisés (2026-06-12)

> Tag stack : projet source npm / ESLint / CSS Modules / Supabase CLI — ≠ stack
> library (pnpm/Biome/Tailwind). Patterns SQL/CI transposables tels quels.

## Pattern 1 — Épingler la CLI Supabase en CI (et partout)
**Symptôme** : la CI passe au rouge sur TOUTES les branches (même des PR
docs-only), erreurs `permission denied for table X` dans des tests qui font
`SET ROLE authenticated`. Localement tout est vert.
**Cause** : `supabase/setup-cli@v1` avec `version: latest` — une release de la
CLI change le comportement du stack local (droits par défaut des rôles). Le
rejeu CI n'est plus reproductible ; les merges « en force » masquent le rouge.
**Règle** : épingler LA MÊME version de CLI en CI que celle du poste de
référence (`version: 2.105.0`), avec un commentaire datant l'incident. Toute
montée de version = commit dédié + rejeu complet vert.

## Pattern 2 — Rebrancher un front sur une base recréée (vues de compat)
Méthode éprouvée sur 3 migrations successives :
1. **Contrat = l'ancien fichier de types généré committé** (`git show <hash>:types.ts`),
   PAS le SQL historique (souvent jamais committé : objets nés en live).
2. **Périmètre = les appelants RÉELS** (grep `.from('...')` / `.rpc('...')`) —
   on découvre des objets morts (à NE PAS recréer) et des objets vivants absents
   du plan. Sur un lot « 7 vues + 11 RPC », seuls 6 vues + 1 RPC étaient vivants.
3. **Une migration = vues `security_invoker` au contrat STRICT** (mêmes noms de
   colonnes, ni plus ni moins) + RPC avec gardes (service_call OU rôle métier).
4. **Une gate SQL auto-rollback durcie** : égalité STRICTE des listes de colonnes
   (information_schema), assertions en VALEUR sur données de harnais (triggers
   compris), bascule de claims JWT pour tester les colonnes `auth.uid()`,
   tests NÉGATIFS (anciens noms absents, objets morts interdits de retour).
5. **Pièges récurrents** : colonnes dénormalisées recalculées par trigger (fournir
   les données sources, asserter le résultat du trigger) ; totaux à dériver de la
   source canonique actuelle (pas des colonnes droppées) ; erreurs avalées côté
   front qui masquent le drift depuis des mois (edge function qui `continue anyway`).
