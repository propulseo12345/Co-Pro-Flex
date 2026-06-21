/**
 * Configuration centralisée des tests e2e Playwright.
 *
 * Les valeurs sensibles (URL Supabase, clé service-role) viennent de `.env.local`,
 * chargé dans `process.env` par `playwright.config.ts` (via dotenv) AVANT l'exécution
 * des specs. Les identifiants ont un défaut surchargeable par variable d'environnement.
 */

/** URL du projet Supabase (cloud live). Requis pour les assertions DB en service-role. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Clé service-role : contourne la RLS pour vérifier la vérité en base.
 * Ne JAMAIS l'exposer côté client — réservée aux assertions de test.
 */
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Compte de connexion. Défaut = compte démo réel (bouton 1-clic sur /auth/login). */
export const LOGIN_EMAIL = process.env.E2E_USER_EMAIL ?? 'lyes.triki@coproflex.fr';
export const LOGIN_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'password123';

/**
 * Destinataire des e-mails déclenchés par les tests (convocations, relances, PV…).
 * Pointé sur une vraie boîte pour vérifier humainement la réception. Surchargeable par env.
 */
export const NOTIFY_EMAIL = process.env.E2E_NOTIFY_EMAIL ?? 'lyestriki@gmail.com';

/** Copropriété de référence du pilote (lecture seule). Résolue par son nom en base. */
export const COPRO_MARTIN_NAME = 'Résidence Martin';
