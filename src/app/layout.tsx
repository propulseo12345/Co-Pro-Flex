import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope"
});

export const metadata: Metadata = {
  title: "CoProFlex - Gestion de Copropriété",
  description: "Plateforme SaaS de gestion de copropriété : finances, maintenance, assemblées générales, documents et communication.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10B981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
