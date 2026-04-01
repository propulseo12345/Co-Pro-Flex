'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';

/**
 * OnboardingRedirect
 *
 * Redirige vers /onboarding si aucune copropriété n'existe.
 * Doit être rendu à l'intérieur du CoproProvider.
 */
export function OnboardingRedirect() {
  const { currentCopro, isLoading } = useCopro();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentCopro && !pathname.startsWith('/onboarding') && !pathname.startsWith('/finance-v2')) {
      router.push('/onboarding');
    }
  }, [isLoading, currentCopro, pathname, router]);

  return null;
}
