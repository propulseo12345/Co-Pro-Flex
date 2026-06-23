import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { getCurrentUserFn } from '@/shared/auth/auth'
import styles from './route.module.css'

export const Route = createFileRoute('/_app')({
  // Garde deny-by-default au niveau du layout protégé (espace gestionnaire).
  // TODO durcissement (décision B3/B4) : porter cette garde en requestMiddleware GLOBAL
  // (deny-by-default réel, pas une denylist par route), puis test e2e : toute route
  // protégée — y compris une route oubliée — renvoie /login en anonyme. La RLS = dernier rempart.
  beforeLoad: async () => {
    const user = await getCurrentUserFn()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className={styles.shell}>
      {/* TODO châssis : Sidebar + Header (manager-first) + sélecteur de copro active */}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
