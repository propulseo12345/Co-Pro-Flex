import { ChevronDown } from 'lucide-react';
import styles from './FaqAccordion.module.css';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: readonly FaqItem[] | FaqItem[];
  title?: string;
  variant?: 'flat' | 'card';
}

export function FaqAccordion({ items, title, variant = 'flat' }: FaqAccordionProps) {
  return (
    <section className={`${styles.faqSection} ${variant === 'card' ? styles.card : ''}`}>
      {title && <h2 className={styles.faqTitle}>{title}</h2>}
      <div className={styles.faqList}>
        {items.map((item) => (
          <details key={item.question} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>{item.question}</span>
              <ChevronDown size={18} className={styles.faqChevron} />
            </summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
