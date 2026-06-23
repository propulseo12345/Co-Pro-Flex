import { createFileRoute } from '@tanstack/react-router'
import styles from './dashboard.module.css'

export const Route = createFileRoute('/_app/dashboard')({ component: DashboardPage })

function DashboardPage() {
  const { user } = Route.useRouteContext()
  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Espace gestionnaire</h1>
      <p className={styles.subtitle}>Connecté : {user.email ?? '—'}</p>
      <p className={styles.note}>
        Squelette v2 — le contenu sera reconstruit catégorie par catégorie (finance, AG…).
      </p>
    </section>
  )
}
