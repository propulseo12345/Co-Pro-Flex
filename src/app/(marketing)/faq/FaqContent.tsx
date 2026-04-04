'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { categories } from './data';
import styles from './page.module.css';

export function FaqContent() {
  const [activeCategory, setActiveCategory] = useState('general');

  const activeCat = categories.find((c) => c.id === activeCategory) ?? categories[0];

  return (
    <>
      {/* Category Tabs */}
      <div className={styles.tabsWrapper}>
        <div className={styles.tabs}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.tab} ${activeCategory === cat.id ? styles.tabActive : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Items */}
      <section className={styles.faqSection}>
        <div className={styles.faqList}>
          {activeCat.items.map((item) => (
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
    </>
  );
}
