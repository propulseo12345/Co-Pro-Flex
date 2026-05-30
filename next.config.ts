import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redirections des pages doublons (anciennes routes EN / orphelines) vers la page
  // canonique (celle de la sidebar). Les anciens fichiers restent mais deviennent
  // inaccessibles — évite les doublons à l'usage sans casser les imports croisés.
  async redirects() {
    return [
      { source: '/finance/invoices', destination: '/finance/factures', permanent: false},
      { source: '/finance/invoices/:path*', destination: '/finance/factures', permanent: false},
      { source: '/finance/bank-movements', destination: '/finance/mouvements-bancaires', permanent: false},
      { source: '/finance/transactions', destination: '/finance/mouvements-bancaires', permanent: false},
      { source: '/finance/budget-current', destination: '/finance/budgets', permanent: false},
      { source: '/finance/budget-works', destination: '/finance/budgets', permanent: false},
      // /finance/unpaid (exact) -> impayés canoniques ; /finance/unpaid/reminders reste (feature relances)
      { source: '/finance/unpaid', destination: '/contentieux/impayes', permanent: false},
      { source: '/ventes-impayes/impayes', destination: '/contentieux/impayes', permanent: false},
      { source: '/legal/disputes', destination: '/contentieux/litiges', permanent: false},
      { source: '/maintenance/directory', destination: '/maintenance/providers', permanent: false},
      // Module /social supprimé (fantôme) -> Communication
      { source: '/social', destination: '/communication', permanent: false},
      { source: '/social/:path*', destination: '/communication', permanent: false},
    ];
  },
};

export default nextConfig;
