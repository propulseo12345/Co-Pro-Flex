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
    },
  },
]);

export default eslintConfig;
