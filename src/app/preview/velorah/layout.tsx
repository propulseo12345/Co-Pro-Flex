import type { Metadata } from 'next';
import { DM_Serif_Display, Instrument_Serif, Inter } from 'next/font/google';

const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--pg-font-display' });
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--pg-font-body' });

export const metadata: Metadata = {
  title: 'CoProFlex — La gestion de copropriété, simplifiée',
  description: 'L\'outil qui simplifie la copropriété pour les syndics, gestionnaires et copropriétaires.',
};

export default function VelorahLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${dmSerif.variable} ${instrumentSerif.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
