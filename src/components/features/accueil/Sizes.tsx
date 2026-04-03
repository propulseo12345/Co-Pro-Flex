import Image from 'next/image';
import styles from './Sizes.module.css';

interface SizeCard {
  title: string;
  subtitle: string;
  illustration: string;
}

const CARDS: SizeCard[] = [
  {
    title: 'Petite copropriété',
    subtitle: 'Moins de 20 lots',
    illustration: '/velorah/illustrations/illustration-small-copro.svg',
  },
  {
    title: 'Moyenne copropriété',
    subtitle: '20 à 50 lots',
    illustration: '/velorah/illustrations/illustration-medium-copro.svg',
  },
  {
    title: 'Grande copropriété',
    subtitle: '50 à 200 lots',
    illustration: '/velorah/illustrations/illustration-large-copro.svg',
  },
  {
    title: 'Résidence',
    subtitle: 'Multi-bâtiments',
    illustration: '/velorah/illustrations/illustration-residence.svg',
  },
  {
    title: 'ASL / AFUL',
    subtitle: 'Associations foncières',
    illustration: '/velorah/illustrations/illustration-mixed.svg',
  },
  {
    title: 'Immeuble mixte',
    subtitle: 'Commerce + habitation',
    illustration: '/velorah/illustrations/illustration-mixed.svg',
  },
];

export function Sizes() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Adapté à toutes les copropriétés</h2>
        <div className={styles.headerRight}>
          <p className={styles.description}>
            Que vous gériez un immeuble de 10 lots ou une résidence de plusieurs centaines
            d&rsquo;appartements, CoProFlex s&rsquo;adapte à votre structure.
          </p>
          <button className={styles.ctaBtn}>En savoir plus</button>
        </div>
      </div>

      <div className={styles.grid}>
        {CARDS.map((card) => (
          <div key={card.title} className={styles.card}>
            <div className={styles.illustrationWrapper}>
              <Image
                src={card.illustration}
                alt={card.title}
                width={200}
                height={140}
                className={styles.illustration}
              />
            </div>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <p className={styles.cardSubtitle}>{card.subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
