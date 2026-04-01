import { ThemeProvider } from '@/providers/ThemeProvider';
import { SidebarProvider } from '@/providers/SidebarContext';
import { GestionnaireSidebar } from '@/components/layout/GestionnaireSidebar';
import { AppBody } from '@/components/layout/AppBody';

export default function GestionnaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
