'use client';

import styles from './LogoCarousel.module.css';

const LOGOS = Array.from({ length: 8 }, (_, i) => `Partenaire ${i + 1}`);

export function LogoCarousel() {
  return (
    <section className={styles.section}>
      <p className={styles.title}>Rejoint par plus de 500+ copropriétés</p>
      <div className={styles.track}>
        {/* Liste statique dupliquée volontairement (effet boucle) : labels non uniques */}
        {[...LOGOS, ...LOGOS].map((name, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className={styles.logo}>
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
