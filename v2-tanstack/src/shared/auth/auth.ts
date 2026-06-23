import { createServerFn } from '@tanstack/react-start'
import { getServerClient } from '@/shared/supabase/server'

/** Connexion email/mot de passe : pose la session dans les cookies (SSR). */
export const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    return error ? { ok: false as const, message: error.message } : { ok: true as const }
  })

/** Utilisateur courant (validé serveur via getUser, jamais getSession). null si anonyme. */
export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null
})

/** Déconnexion. */
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getServerClient()
  await supabase.auth.signOut()
})
