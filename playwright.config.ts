import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Playwright E2E test configuration for CoProFlex
 * Run: npx playwright test
 */

// Charge `.env.local` (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, identifiants…)
// dans process.env, pour que les specs ET les assertions DB en service-role y aient accès.
// dotenv n'écrase PAS une variable déjà définie (ex. valeurs injectées en CI).
dotenv.config({ path: '.env.local' });

// Le port 3000 peut être occupé par une autre app en local -> CoProFlex tourne sur 3100.
// Surchargeable via E2E_BASE_URL (ex. environnement CI).
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- -p 3100',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
