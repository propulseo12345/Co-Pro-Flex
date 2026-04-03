'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './InteractiveSlider.module.css';

const TABS = [
  { id: 1, label: 'Dashboard' },
  { id: 2, label: 'Finance' },
  { id: 3, label: 'AG' },
  { id: 4, label: 'Maintenance' },
  { id: 5, label: 'Documents' },
  { id: 6, label: 'Communication' },
  { id: 7, label: 'Copropriétaires' },
];

export function InteractiveSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? TABS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === TABS.length - 1 ? 0 : prev + 1));
  };

  const activeTab = TABS[activeIndex];

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Gérez votre copropriété facilement</h2>

      <div className={styles.tabBar}>
        <button
          className={styles.arrowBtn}
          onClick={handlePrev}
          aria-label="Onglet précédent"
        >
          <ChevronLeft size={20} />
        </button>

        <div className={styles.tabsWrapper} role="tablist">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={index === activeIndex}
              className={`${styles.tab} ${index === activeIndex ? styles.tabActive : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          className={styles.arrowBtn}
          onClick={handleNext}
          aria-label="Onglet suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className={styles.screenshotWrapper}>
        <div className={styles.screenshotFrame}>
          <Image
            src={`/velorah/screenshots/screenshot-${activeTab.id}.svg`}
            alt={`Capture d'écran — ${activeTab.label}`}
            width={1100}
            height={680}
            className={styles.screenshot}
            priority={activeIndex === 0}
          />
        </div>
      </div>
    </section>
  );
}
