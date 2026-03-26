'use client';

import { Check } from 'lucide-react';
import styles from './CtaSection.module.css';

const TRUST_ITEMS = [
  'Sans engagement, résiliez à tout moment',
  'Migration de données incluse',
  'Hébergement en France, RGPD',
  'Support dédié < 2h',
] as const;

export function CtaSection() {
  return (
    <section className={styles.outer}>
      <div className={styles.split}>
        <div className={styles.left}>
          <h2 className={styles.title}>Simplifiez votre copropriété dès aujourd&rsquo;hui</h2>
          <p className={styles.description}>
            Remplissez ce formulaire et un expert vous contacte sous 24h pour une démo personnalisée de 30 minutes.
          </p>
          <div className={styles.trust}>
            {TRUST_ITEMS.map((item) => (
              <div key={item} className={styles.trustItem}>
                <Check size={18} className={styles.trustIcon} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label className={styles.label}>Nom complet</label>
            <input className={styles.input} placeholder="Jean Dupont" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email professionnel</label>
            <input className={styles.input} type="email" placeholder="jean@syndic.fr" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Téléphone</label>
            <input className={styles.input} type="tel" placeholder="+33 6 12 34 56 78" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nombre de lots gérés</label>
            <input className={styles.input} placeholder="ex: 150" />
          </div>
          <button className={styles.formBtn} type="submit">Demander ma démo gratuite</button>
        </form>
      </div>
    </section>
  );
}
