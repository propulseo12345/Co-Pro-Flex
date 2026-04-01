'use client';

import styles from './onboarding.module.css';

export default function OnboardingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nouvelle copropriete</h1>
        <p className={styles.subtitle}>Configurez votre copropriete etape par etape</p>
      </div>
      <div className={styles.stepContent}>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
          Wizard en cours de construction...
        </p>
      </div>
    </div>
  );
}
