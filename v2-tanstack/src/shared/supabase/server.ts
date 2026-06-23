import { getCookies, setCookie } from '@tanstack/react-start/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Client Supabase côté SERVEUR (SSR + server functions).
 * Lit/écrit la session dans les cookies de la requête (auth SSR).
 * La RLS s'applique : ce client n'a que les droits de l'utilisateur connecté.
 */
export function getServerClient() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value: value ?? '',
          }))
        },
        setAll(cookies) {
          cookies.forEach((cookie) => setCookie(cookie.name, cookie.value))
        },
      },
    },
  )
}
