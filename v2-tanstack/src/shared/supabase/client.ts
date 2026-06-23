import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase côté NAVIGATEUR (composants client).
 * Clé publiable uniquement (jamais la service-role). RLS appliquée.
 */
export function getBrowserClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )
}
