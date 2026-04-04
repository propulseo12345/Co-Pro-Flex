'use client';

import { useState } from 'react';
import { categories } from './data';
import { FaqAccordion } from '@/components/features/marketing/FaqAccordion';
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
      <FaqAccordion items={activeCat.items} />
    </>
  );
}
