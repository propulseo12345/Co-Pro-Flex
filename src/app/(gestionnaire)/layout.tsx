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
