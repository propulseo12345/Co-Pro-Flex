import type { ComponentType, ReactNode } from 'react';
import Image from 'next/image';
import styles from './FeatureGrid.module.css';
import { DemoThemeWrapper } from './DemoThemeWrapper';
import { DemoThemeToggle } from './DemoThemeToggle';

interface FeatureGridProps {
  label: string;
  labelColor: string;
  title: string;
  description: string;
  background?: 'cream' | 'white';
  testimonial: {
    quote: string;
    author: string;
    role: string;
    bgColor: string;
  };
  cards: Array<{
    type: 'large' | 'small';
    title: string;
    description?: string;
    screenshot?: string;
    demo?: ReactNode;
    icon?: ComponentType<{ size?: number; className?: string }>;
  }>;
}

export function FeatureGrid({
  label,
  labelColor,
  title,
  description,
  background = 'white',
  testimonial,
  cards,
}: FeatureGridProps) {
  const bgClass = background === 'cream' ? styles.sectionBgCream : styles.sectionBgWhite;
  const hasDemo = cards.some((c) => c.demo);

  return (
    <section className={`${styles.section} ${bgClass}`}>
      <div className={styles.header}>
        <span
          className={styles.label}
          style={{ '--label-color': labelColor } as React.CSSProperties}
        >
          {label}
        </span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
        {hasDemo && <DemoThemeToggle labelColor={labelColor} />}
      </div>

      <div className={styles.grid}>
        <div
          className={styles.cardTestimonial}
          style={{ '--testimonial-bg': testimonial.bgColor } as React.CSSProperties}
        >
          <blockquote className={styles.quote}>
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>
          <div className={styles.author}>
            <strong>{testimonial.author}</strong>
            <span>{testimonial.role}</span>
          </div>
        </div>

        {cards.map((card) => {
          if (card.type === 'large') {
            return (
              <div key={card.title} className={styles.cardLarge}>
                {card.demo ? (
                  <DemoThemeWrapper className={styles.cardDemo}>
                    {card.demo}
                  </DemoThemeWrapper>
                ) : card.screenshot ? (
                  <Image
                    className={styles.cardImage}
                    src={card.screenshot}
                    alt={card.title}
                    width={600}
                    height={400}
                  />
                ) : null}
                <div className={styles.cardBody}>
                  <h3>{card.title}</h3>
                  {card.description && <p>{card.description}</p>}
                </div>
              </div>
            );
          }
          const IconComponent = card.icon;
          return (
            <div key={card.title} className={styles.cardSmall}>
              {IconComponent && <IconComponent size={24} className={styles.cardIcon} />}
              <h3>{card.title}</h3>
              {card.description && <p>{card.description}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
