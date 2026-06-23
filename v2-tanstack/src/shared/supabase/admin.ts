import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase service-role : BYPASSE la RLS (droits illimités).
 * Usage SERVEUR strict uniquement (webhooks, tâches d'administration).
 * Ne JAMAIS importer dans du code qui peut s'exécuter côté navigateur.
 */
export function getAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getAdminClient() interdit côté navigateur (service-role)')
  }
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (serveur)')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
