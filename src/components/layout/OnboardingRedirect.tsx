'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';

/**
 * OnboardingRedirect
 *
 * - Si la copro active n'est PAS finalisée (onboarding_step != null) → reprendre
 *   l'assistant sur /onboarding/{id} plutôt que d'afficher un dashboard vide.
 *   (Filet contre un cache sessionStorage pollué par un onboarding à moitié fait.)
 * - Si aucune copro n'existe ET aucune n'est sélectionnée → /onboarding.
 * Doit être rendu à l'intérieur du CoproProvider.
 */
export function OnboardingRedirect() {
  const { currentCopro, isLoading, currentCoproId } = useCopro();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Ne pas agir si encore en chargement ou déjà sur une page onboarding.
    if (isLoading) return;
    if (pathname.startsWith('/onboarding')) return;

    // Filet : copro active connue mais pas finalisée → reprendre l'assistant.
    if (currentCopro && currentCopro.onboarding_step !== null) {
      router.push(`/onboarding/${currentCopro.id}`);
      return;
    }

    // Une copro finalisée est active (contexte ou ID en cache) → rien à faire.
    if (currentCopro || currentCoproId) return;

    // Vérifier aussi le sessionStorage (copro sélectionnée depuis portefeuille)
    const storedId = typeof window !== 'undefined'
      ? sessionStorage.getItem('coproflex_active_copro_id')
      : null;
    if (storedId) return;

    router.push('/onboarding');
  }, [isLoading, currentCopro, currentCoproId, pathname, router]);

  return null;
}
