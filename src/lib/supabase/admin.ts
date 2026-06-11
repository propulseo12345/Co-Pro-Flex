import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Client Supabase SERVICE_ROLE — réservé aux appels serveur de confiance SANS session
 * (webhooks entrants, callbacks machine). Il bypasse la RLS : ne JAMAIS l'exposer côté
 * client, ni l'utiliser dans un flux porté par un utilisateur (utiliser alors le client
 * SSR porteur de session, qui passe par la RLS).
 *
 * Lève si la clé n'est pas configurée (évite un fallback silencieux vers le client anon,
 * qui serait bloqué par la RLS).
 */
export function createAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY manquante : le client admin (webhooks) est indisponible.'
    );
  }
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
