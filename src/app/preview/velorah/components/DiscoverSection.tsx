'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import styles from './DiscoverSection.module.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', screenshot: '/velorah/screenshots/screenshot-dashboard.svg' },
  { id: 'ag', label: 'AG', screenshot: '/velorah/screenshots/screenshot-ag.svg' },
  { id: 'finance', label: 'Finance', screenshot: '/velorah/screenshots/screenshot-finance-budget.svg' },
  { id: 'maintenance', label: 'Maintenance', screenshot: '/velorah/screenshots/screenshot-maintenance.svg' },
  { id: 'documents', label: 'Documents', screenshot: '/velorah/screenshots/screenshot-documents.svg' },
  { id: 'communication', label: 'Communication', screenshot: '/velorah/screenshots/screenshot-communication.svg' },
];

export function DiscoverSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className={styles.section}>
      <div className={styles.illustrationLeft}>
        <Image
          src="/velorah/illustrations/illustration-haussmann-left.svg"
          alt="Immeuble haussmannien"
          fill
          sizes="280px"
        />
      </div>
      <div className={styles.illustrationRight}>
        <Image
          src="/velorah/illustrations/illustration-garden-right.svg"
          alt="Jardin de copropriété"
          fill
          sizes="280px"
        />
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          className={styles.arrowBtn}
          onClick={() => setActiveTab((prev) => (prev - 1 + TABS.length) % TABS.length)}
          aria-label="Onglet précédent"
        >
          <ChevronLeft size={18} />
        </button>

        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${i === activeTab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(i)}
            role="tab"
            aria-selected={i === activeTab}
          >
            {tab.label}
          </button>
        ))}

        <button
          className={styles.arrowBtn}
          onClick={() => setActiveTab((prev) => (prev + 1) % TABS.length)}
          aria-label="Onglet suivant"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.screenshotFrame}>
        <Image
          className={styles.screenshotImg}
          src={TABS[activeTab].screenshot}
          alt={`Module ${TABS[activeTab].label} de CoProFlex`}
          width={1200}
          height={800}
          priority={activeTab === 0}
        />
      </div>

      <div className={styles.videoLink}>
        <Play size={20} className={styles.playIcon} />
        <span>Regarder la visite guidée · 10 min</span>
      </div>
    </section>
  );
}
