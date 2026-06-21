/**
 * Helpers partagés des tests e2e Playwright.
 *
 * Mutualise ce qui était copié-collé dans chaque spec (client service-role, login,
 * scope d'étape de wizard) — source unique, et surtout un seul endroit pour le compte
 * de connexion (auparavant un défaut `admin@coproflex.fr` inexistant dans chaque spec).
 */

import { expect, type Page, type Locator } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, LOGIN_EMAIL, LOGIN_PASSWORD } from './config';

/**
 * Client Supabase en service-role : contourne la RLS pour asserter la vérité en base.
 * (Était dupliqué à l'identique dans les 4 specs.)
 */
export function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Connexion via la VRAIE page de login de l'app (aucun helper d'auth applicatif n'existe).
 * Reproduit src/app/auth/login/page.tsx (#email, #password, bouton « Se connecter »),
 * qui redirige vers /portefeuille en cas de succès.
 */
export async function login(
  page: Page,
  email: string = LOGIN_EMAIL,
  password: string = LOGIN_PASSWORD,
): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/portefeuille/, { timeout: 30000 });
}

/**
 * Scope un bloc d'étape VISIBLE d'un wizard multi-step (onboarding) par son titre.
 * Le wizard rend toutes les étapes atteintes mais masque les inactives (display:none) :
 * ce filtre évite les violations strict-mode (boutons « Continuer »/« Retour » dupliqués).
 */
export function stepBlock(page: Page, headingText: string): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: headingText }) })
    .filter({ visible: true })
    .last();
}
