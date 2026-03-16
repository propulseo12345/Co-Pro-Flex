Corrige les erreurs TypeScript dans `$ARGUMENTS` (fichier ou dossier).

Étapes :
1. Lance `npx tsc --noEmit` pour identifier les erreurs
2. Pour chaque erreur dans le scope demandé, propose le fix
3. Attends ma validation avant d'appliquer les corrections

Règles :
- Jamais de `any` — utiliser le type correct ou `unknown`
- Jamais de `@ts-ignore` ou `@ts-expect-error` sauf cas documenté
- Préférer les types stricts aux assertions (`as`)
- Utiliser les interfaces existantes dans `src/types/`
