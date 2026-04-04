import type { Metadata } from 'next';
import { DM_Serif_Display, Instrument_Serif, Inter } from 'next/font/google';
import { LpNav } from '@/components/features/marketing/LpNav';
import { Footer } from '@/components/features/marketing/Footer';
import styles from './layout.module.css';

const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--pg-font-display' });
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--pg-font-body' });

export const metadata: Metadata = {
  metadataBase: new URL('https://coproflex.fr'),
  title: {
    template: '%s — CoProFlex',
    default: 'CoProFlex — Gestion de copropriété nouvelle génération',
  },
  description: 'AG en quelques clics, finances en temps réel, documents centralisés. La plateforme tout-en-un pour syndics et copropriétaires.',
  openGraph: {
    siteName: 'CoProFlex',
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${dmSerif.variable} ${instrumentSerif.variable} ${inter.variable} ${styles.lpShell}`}>
      <LpNav />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
