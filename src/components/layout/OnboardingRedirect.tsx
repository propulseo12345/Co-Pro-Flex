'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';

/**
 * OnboardingRedirect
 *
 * Redirige vers /onboarding si aucune copropriété n'existe ET qu'aucune
 * n'est sélectionnée en sessionStorage (sélection portefeuille).
 * Doit être rendu à l'intérieur du CoproProvider.
 */
export function OnboardingRedirect() {
  const { currentCopro, isLoading, currentCoproId } = useCopro();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Ne pas rediriger si :
    // - Encore en chargement
    // - Une copro est active (contexte ou ID en cache)
    // - Déjà sur une page onboarding
    if (isLoading) return;
    if (currentCopro || currentCoproId) return;
    if (pathname.startsWith('/onboarding')) return;

    // Vérifier aussi le sessionStorage (copro sélectionnée depuis portefeuille)
    const storedId = typeof window !== 'undefined'
      ? sessionStorage.getItem('coproflex_active_copro_id')
      : null;
    if (storedId) return;

    router.push('/onboarding');
  }, [isLoading, currentCopro, currentCoproId, pathname, router]);

  return null;
}
