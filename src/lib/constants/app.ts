/**
 * Configuration globale CoProFlex
 * Ces valeurs sont fixes et non modifiables - France uniquement
 */

export const APP_CONFIG = {
  // Timezone - FRANCE UNIQUEMENT
  TIMEZONE: 'Europe/Paris',
  LOCALE: 'fr-FR',

  // Format de dates standard
  DATE_FORMAT: {
    short: 'dd/MM/yyyy',           // 19/01/2026
    long: 'EEEE d MMMM yyyy',      // dimanche 19 janvier 2026
    withTime: 'dd/MM/yyyy HH:mm',  // 19/01/2026 19:08
    time: 'HH:mm',                 // 19:08
    iso: "yyyy-MM-dd'T'HH:mm:ssXXX", // 2026-01-19T19:08:00+01:00
  },

  // Devise
  CURRENCY: 'EUR',
  CURRENCY_LOCALE: 'fr-FR',
} as const

// Type pour autocomplétion
export type AppConfig = typeof APP_CONFIG
