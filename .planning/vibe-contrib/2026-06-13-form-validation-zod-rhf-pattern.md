# Pattern réutilisable — Validation de formulaires : Zod + React Hook Form + primitive Field

> Brouillon de contribution vibe-library (généralisé, anonymisé). À pousser via
> `create_library_document` APRÈS validation USER. **Divergence de stack à taguer** :
> projet d'origine = **npm / ESLint / CSS Modules / Next.js App Router** (≠ stack imposée
> library pnpm/Biome/Tailwind/shadcn — prendre les principes, pas le tooling).

## Quand l'utiliser
Migrer des formulaires gérés « à la main » (`useState` par champ + checks ad-hoc + `alert()`)
vers une validation typée, par champ, à source unique. Approche **pilote-first** : poser l'infra
+ 1 formulaire de bout en bout, puis dérouler.

## Stack
`react-hook-form` (v7, compatible React 19) + `zod` (v4) + `@hookform/resolvers` (v5, `zodResolver`).

## Recette
1. **Schémas** dans `lib/validation/<domaine>/<form>.ts` ; primitives partagées dans `common.ts`
   (montant positif via `z.coerce.number().refine(...)`, date ISO requise, texte optionnel `trim`).
2. **Tests d'abord (TDD)** sur le schéma : inspecter `schema.safeParse(x).error.issues` (robuste
   inter-versions, pas de `.flatten()`).
3. **Primitive `FormField`** (et `FormSelect`) : composant **`forwardRef`** (indispensable pour câbler
   le `ref` de `register`), props `{ label, error?, hint?, required? }` + spread des props HTML,
   a11y (`aria-invalid`, `aria-describedby` → id généré par `useId`). Usage : `<FormField label error={errors.x?.message} {...register('x')} />`.
4. **Composant** : `useForm<z.input<S>, unknown, z.output<S>>({ resolver: zodResolver(S), mode:'onTouched', defaultValues })`
   — les **3 génériques** gèrent la coercion entrée→sortie (le `handleSubmit` reçoit la sortie validée).
5. **Gotcha** : utiliser **`useWatch({ control, name })`**, jamais `watch()` — `watch()` n'est pas
   mémoïsable (avec React Compiler / la règle eslint `react-hooks/incompatible-library`).
6. **Invariant** : ne JAMAIS changer la logique de soumission/API — seuls l'état du form et la
   validation changent. Les avertissements métier (non bloquants) restent hors schéma ; l'erreur
   serveur (API) reste un state séparé du formulaire.

## Bénéfices
Erreurs par champ + focus auto, source unique de règles, montants/dates typés (fin des `NaN`),
schémas testables isolément, primitive Field cohérente et accessible réutilisée partout.
