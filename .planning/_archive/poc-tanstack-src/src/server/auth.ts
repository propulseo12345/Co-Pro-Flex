import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'

/** Connexion : pose la session dans les cookies (SSR). */
export const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  })

/** Utilisateur courant depuis la session (cookie). null si non connecté. */
export const getUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? null
})

/** Déconnexion. */
export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  await supabase.auth.signOut()
})

/** Lecture de vraies données derrière auth (RLS appliquée) : nb de copros visibles. */
export const coprosCountFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { count, error } = await supabase
    .from('copros')
    .select('*', { count: 'exact', head: true })
  if (error) return { error: error.message, count: null as number | null }
  return { error: null as string | null, count: count ?? 0 }
})
