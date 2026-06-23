import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { loginFn } from '../server/auth'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const router = useRouter()
  // Compte démo du live (cf. mémoire demo_account_login)
  const [email, setEmail] = useState('lyes.triki@coproflex.fr')
  const [password, setPassword] = useState('password123')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const res = await loginFn({ data: { email, password } })
    setLoading(false)
    if (!res.ok) {
      setMsg(res.message ?? 'Échec de connexion')
      return
    }
    router.navigate({ to: '/dashboard' })
  }

  return (
    <main style={{ padding: 40, maxWidth: 420 }}>
      <h1>POC — Connexion (auth SSR Supabase)</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
        />
        <button disabled={loading} type="submit">
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      {msg && <p style={{ color: 'crimson' }}>{msg}</p>}
    </main>
  )
}
