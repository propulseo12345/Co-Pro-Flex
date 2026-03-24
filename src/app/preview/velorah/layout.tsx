import type { Metadata } from 'next';

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
