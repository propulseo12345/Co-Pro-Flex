'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import { Step1Copropriete } from '@/components/features/onboarding/steps/Step1Copropriete';
import styles from '../onboarding.module.css';

export default function OnboardingCreatePage() {
  const router = useRouter();

  const handleComplete = useCallback((coproId: string, coproName: string) => {
    // Mémoriser la copro créée pour les étapes suivantes
    setActiveCopro(coproId, coproName);
    // Rediriger vers le wizard
    router.replace(`/onboarding/${coproId}`);
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nouvelle copropriété</h1>
        <p className={styles.subtitle}>Renseignez les informations de base pour commencer.</p>
      </div>
      <Step1Copropriete
        onComplete={handleComplete}
        existingCoproId={null}
      />
    </div>
  );
}
