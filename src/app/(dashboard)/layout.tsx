import { Suspense } from 'react';
import { HighBar } from '@/components/layout/HighBar';
import { ModuleSidebar } from '@/components/layout/ModuleSidebar';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { VentesProvider } from '@/providers/VentesProvider';
import { CoproProvider } from '@/providers/CoproContext';
import { AnnexeProvider } from '@/providers/AnnexeContext';
import { ToastProvider } from '@/providers/ToastProvider';

function LoadingFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
        <AnnexeProvider>
          <VentesProvider>
            <ToastProvider>
              <div className="app-container">
                <HighBar />
                <div className="app-body">
                  <ModuleSidebar />
                  <main className="main-content">
                    <Suspense fallback={<LoadingFallback />}>
                      {children}
                    </Suspense>
                  </main>
                </div>
              </div>
            </ToastProvider>
          </VentesProvider>
        </AnnexeProvider>
      </CoproProvider>
    </ThemeProvider>
  );
}
