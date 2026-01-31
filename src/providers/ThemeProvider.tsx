'use client';

import { ReactNode } from 'react';

/**
 * ThemeProvider simplifié - Application dark-only
 * Conservé pour compatibilité avec les composants existants
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Hook useTheme - Retourne toujours 'dark'
 * @deprecated L'application est désormais dark-only
 */
export function useTheme() {
  return {
    theme: 'dark' as const,
    toggleTheme: () => {}, // No-op
    mounted: true,
  };
}
