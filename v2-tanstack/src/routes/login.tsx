import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { loginFn } from '@/shared/auth/auth'
import styles from './login.module.css'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await loginFn({ data: { email, password } })
    setLoading(false)
    if (!res.ok) {
      setError(res.message ?? 'Échec de connexion')
      return
    }
    await router.navigate({ to: '/dashboard' })
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>CoProFlex</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
        />
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          autoComplete="current-password"
        />
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
