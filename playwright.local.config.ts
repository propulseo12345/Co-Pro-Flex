import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * Config LOCALE (non commitée / non utilisée en CI).
 * Force l'usage du Google Chrome système (`channel: 'chrome'`) au lieu du binaire
 * chrome-headless-shell de Playwright — utile sur cette machine Windows où le
 * téléchargement du build figé (1208) reste bloqué par l'antivirus.
 *
 * Lancement : npx playwright test -c playwright.local.config.ts
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  ...base,
  // Next dev compile les routes à la demande : la 1re page peut être lente → on
  // laisse de la marge (compile + Chrome) plutôt que le défaut 30s.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    ...base.use,
    baseURL: BASE_URL,
    channel: 'chrome',
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },
  // Port dédié 3100 : le 3000 est occupé par un autre projet (TropPayé) sur cette
  // machine. On force un serveur CoProFlex frais et isolé, sans toucher l'autre.
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
