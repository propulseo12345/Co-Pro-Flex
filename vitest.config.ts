import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // On pointe le plugin vers `tsconfig.vitest.json` : il étend le tsconfig de base
  // (donc reprend les alias @/...) mais réintègre les fichiers de test dans son `include`,
  // que le tsconfig principal exclut. Sinon le plugin refuse de remapper les imports `@/...`
  // dans les fichiers de test (configMismatch) et la résolution échoue à l'exécution.
  plugins: [tsconfigPaths({ projects: ['./tsconfig.vitest.json'] })],
  test: {
    globals: true,
    environment: 'node',
    // vitest 4.1.x : le pool de threads par défaut corrompt le contexte de test partagé
    // entre fichiers exécutés en parallèle (chaque fichier sauf le premier échoue avec
    // « Cannot read properties of undefined (reading 'config') »). On force le pool `forks`
    // sans parallélisme de fichiers : suite stable et verte. À réévaluer si vitest corrige.
    pool: 'forks',
    fileParallelism: false,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/__tests__/**/*.ts',
      'src/**/__tests__/**/*.tsx',
    ],
  },
});
