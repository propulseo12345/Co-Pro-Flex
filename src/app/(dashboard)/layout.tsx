import { Suspense } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { VentesProvider } from '@/providers/VentesProvider';
import { CoproProvider } from '@/providers/CoproContext';
import { AnnexeProvider } from '@/providers/AnnexeContext';

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
            <div className="app-container">
              <Sidebar aria-hidden="true" />
              <div className="main-wrapper">
                <Header />
                <main className="main-content">
                  <Suspense fallback={<LoadingFallback />}>
                    {children}
                  </Suspense>
                </main>
              </div>
            </div>
          </VentesProvider>
        </AnnexeProvider>
      </CoproProvider>
    </ThemeProvider>
  );
}
