import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { coprosCountFn, getUserFn, logoutFn } from '../server/auth'
import styles from './dashboard.module.css'

export const Route = createFileRoute('/dashboard')({
  // Protection SSR : pas de session => redirection login (filet côté serveur).
  beforeLoad: async () => {
    const email = await getUserFn()
    if (!email) throw redirect({ to: '/login' })
    return { email }
  },
  // Lecture de vraies données derrière auth (RLS appliquée).
  loader: async () => ({ copros: await coprosCountFn() }),
  component: Dashboard,
})

function Dashboard() {
  const router = useRouter()
  const { email } = Route.useRouteContext()
  const { copros } = Route.useLoaderData()

  async function handleLogout() {
    await logoutFn()
    router.navigate({ to: '/login' })
  }

  return (
    <main style={{ padding: 40 }}>
      <div className={styles.card}>
        <h1 className={styles.title}>POC — Tableau de bord protégé</h1>
        <p>
          Connecté : <span className={styles.badge}>{email}</span>
        </p>
        <p>
          Copros visibles (RLS appliquée) :{' '}
          <strong>{copros.error ? `Erreur : ${copros.error}` : copros.count}</strong>
        </p>
        <button onClick={handleLogout} type="button">Se déconnecter</button>
      </div>
    </main>
  )
}
