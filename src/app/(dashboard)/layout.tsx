import { Suspense } from 'react';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { VentesProvider } from '@/providers/VentesProvider';
import { CoproProvider } from '@/providers/CoproContext';
import { AnnexeProvider } from '@/providers/AnnexeContext';
import { ToastProvider } from '@/providers/ToastProvider';
import { SidebarProvider } from '@/providers/SidebarContext';
import { AppBody } from '@/components/layout/AppBody';
import { OnboardingRedirect } from '@/components/layout/OnboardingRedirect';

function LoadingFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--success)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <CoproProvider>
        <OnboardingRedirect />
        <AnnexeProvider>
          <VentesProvider>
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
          </VentesProvider>
        </AnnexeProvider>
      </CoproProvider>
    </ThemeProvider>
  );
}
