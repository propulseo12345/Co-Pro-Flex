'use client';

import styles from './LogoCarousel.module.css';

const LOGOS = Array.from({ length: 8 }, (_, i) => `Partenaire ${i + 1}`);

export function LogoCarousel() {
  return (
    <section className={styles.section}>
      <p className={styles.title}>Rejoint par plus de 500+ copropriétés</p>
      <div className={styles.track}>
        {[...LOGOS, ...LOGOS].map((name, i) => (
          <div key={i} className={styles.logo}>
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
