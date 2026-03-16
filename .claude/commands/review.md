Analyse le fichier ou dossier `$ARGUMENTS` en vérifiant :

1. **Erreurs TypeScript** — types manquants, `any`, assertions non sûres
2. **Conventions CLAUDE.md** — nommage, imports avec alias, CSS Modules, structure composant
3. **Bugs potentiels** — logique incorrecte, states mal gérés, effets sans cleanup
4. **Sécurité** — XSS, injections, données non validées
5. **Performance** — re-renders inutiles, dépendances manquantes dans useEffect/useCallback

Pour chaque problème trouvé, indique :
- Fichier et ligne
- Sévérité (critique / warning / suggestion)
- Le fix recommandé

Ne corrige rien — liste uniquement les problèmes trouvés.
