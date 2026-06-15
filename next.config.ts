import type { NextConfig } from "next";

// ============================================================================
// En-têtes de sécurité HTTP
// ----------------------------------------------------------------------------
// Source unique de vérité (appliqués en dev ET en prod, parité garantie).
//
// CSP : **ACTIVE (bloquante)** depuis J4 (2026-06-13). Politique permissive
// vérifiée sans risque de casse (polices auto-hébergées via next/font, Supabase
// couvert, pas de CDN tiers). Étape suivante de durcissement : passer script-src
// à un nonce et retirer 'unsafe-inline'/'unsafe-eval' (passe dédiée).
// ============================================================================

// Politique CSP de départ, calquée sur les sources réelles de l'app :
// - Next injecte des scripts/styles inline → 'unsafe-inline' (et 'unsafe-eval'
//   requis par certaines libs : pdfjs-dist, etc.) ; à durcir via nonce plus tard.
// - Supabase : REST/Auth/Storage en https + Realtime en websocket (wss).
// - pdf.js / jsPDF : workers et aperçus via blob:.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // data.geopf.fr : géocodeur BAN/IGN (gratuit) de l'autocomplétion d'adresse (useGoogleMapsAutocomplete).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://data.geopf.fr",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // Force HTTPS pendant 2 ans (ignoré en local http, donc sans effet en dev).
  // Pas de `preload` volontairement : engagement difficilement réversible.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Anti-clickjacking (l'app ne doit pas être embarquée en iframe tierce).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Empêche le navigateur de "deviner" un type MIME (anti-sniffing).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ne fuite pas l'URL complète vers les domaines tiers.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Coupe les API navigateur non utilisées par l'app.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // CSP ACTIVE (bloquante) — voir commentaire en tête de fichier.
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Toutes les routes (pages, API, assets).
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

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
