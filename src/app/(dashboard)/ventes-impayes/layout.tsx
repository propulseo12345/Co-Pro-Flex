import { VentesProvider } from '@/providers/VentesProvider';

/**
 * Le VentesProvider (useSalesList → fetch des ventes) ne monte que sur le
 * segment ventes-impayés : descendu du layout dashboard global pour éviter
 * un fetch ventes sur toutes les pages (audit 2026-06-12).
 */
export default function VentesImpayesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VentesProvider>{children}</VentesProvider>;
}
