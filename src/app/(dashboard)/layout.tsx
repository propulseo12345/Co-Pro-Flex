export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { CoproProvider } from '@/providers/CoproContext';
import { AnnexeProvider } from '@/providers/AnnexeContext';
import { ToastProvider } from '@/providers/ToastProvider';
import { SidebarProvider } from '@/providers/SidebarContext';
import { AppBody } from '@/components/layout/AppBody';
import { OnboardingRedirect } from '@/components/layout/OnboardingRedirect';
import { ResolutionTemplatesProvider } from '@/providers/ResolutionTemplatesProvider';

function LoadingFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--success)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Défense en profondeur (audit 2026-06-12) : même si le middleware oublie un
  // préfixe, aucune page de ce groupe ne se rend sans session.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  return (
    <ThemeProvider>
      <CoproProvider>
        <ResolutionTemplatesProvider>
        <OnboardingRedirect />
        <AnnexeProvider>
          <ToastProvider>
            <SidebarProvider>
              <div className="app-container">
                <UnifiedSidebar />
                <AppBody>
                  <main className="main-content">
                    <Suspense fallback={<LoadingFallback />}>
                      {children}
                    </Suspense>
                  </main>
                </AppBody>
              </div>
            </SidebarProvider>
          </ToastProvider>
        </AnnexeProvider>
        </ResolutionTemplatesProvider>
      </CoproProvider>
    </ThemeProvider>
  );
}
