import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { SidebarProvider } from '@/providers/SidebarContext';
import { GestionnaireSidebar } from '@/components/layout/GestionnaireSidebar';
import { AppBody } from '@/components/layout/AppBody';

export default async function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Défense en profondeur (audit 2026-06-12) : ce groupe (agenda, facturation,
  // reporting, paramètres cabinet…) n'était couvert ni par le middleware ni par
  // un garde de layout — chargeable par un anonyme.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // Garde de RÔLE (audit fondations 2026-06-21) : cet espace est réservé aux gestionnaires.
  // Un utilisateur authentifié SANS rôle gestionnaire/platform_admin (ex. copropriétaire) ne
  // doit PAS charger l'UI gestionnaire — on ne se repose pas uniquement sur la RLS des données.
  // Lecture de SES propres memberships via la policy `p_own_select` (user_id = auth.uid()).
  // Cible /dashboard : sous (dashboard), accessible aux copros, hors (gestionnaire) -> pas de boucle.
  const { data: managerMembership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['gestionnaire', 'platform_admin'])
    .limit(1)
    .maybeSingle();
  if (!managerMembership) {
    redirect('/dashboard');
  }

  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="app-container">
          <GestionnaireSidebar />
          <AppBody>
            <main className="main-content">
              {children}
            </main>
          </AppBody>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
