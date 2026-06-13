import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Interdire console.log en production
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Avertir sur les any explicites
      "@typescript-eslint/no-explicit-any": "warn",

      // Forcer les keys dans les listes
      "react/jsx-key": "error",

      // Éviter les index comme key
      "react/no-array-index-key": "warn",

      // Apostrophes/guillemets dans le JSX : règle absurde pour une app française
      // (« l'AG », « d'une copropriété »…). Désactivée (décision projet 2026-06-09).
      "react/no-unescaped-entities": "off",

      // Famille de règles React Compiler (codebase pas encore compiler-ready) :
      // rétrogradées en warning pour ne pas bloquer le build, à traiter dans une
      // passe React Compiler dédiée (décision projet 2026-06-09). rules-of-hooks
      // reste en error (vrai bug). Les vrais signaux (Date.now en render…) restent visibles.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    // Scripts d'outillage Node (codemods, vérifs CSS…) : ce sont des fichiers
    // CommonJS exécutés par Node, pas du code applicatif Next/TS. `require()` et
    // `console.log` y sont légitimes — désactivés ici pour ne pas appliquer les
    // règles de l'app à de l'outillage (décision projet 2026-06-13, J4 lint bloquant).
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
