import styles from './PageHero.module.css';

interface PageHeroProps {
  badge?: string;
  badgeColor?: string;
  title: string;
  subtitle?: string;
}

export function PageHero({ badge, badgeColor, title, subtitle }: PageHeroProps) {
  return (
    <section className={styles.hero}>
      {badge && (
        <span
          className={styles.badge}
          style={badgeColor ? { '--badge-color': badgeColor } as React.CSSProperties : undefined}
        >
          {badge}
        </span>
      )}
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </section>
  );
}
