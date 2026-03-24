'use client';

import { useState, type ReactNode, type ComponentType } from 'react';
import Image from 'next/image';
import {
  ChevronLeft, ChevronRight, Play,
  LayoutDashboard, Vote, PiggyBank, Wrench, FolderOpen, MessageCircle,
} from 'lucide-react';
import styles from './DiscoverSection.module.css';
import { DemoDashboard } from './demos/DemoDashboard';
import { DemoAg } from './demos/DemoAg';
import { DemoFinance } from './demos/DemoFinance';
import { DemoMaintenance } from './demos/DemoMaintenance';
import { DemoDocuments } from './demos/DemoDocuments';
import { DemoCommunication } from './demos/DemoCommunication';

interface TabDef {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  demo: ReactNode;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, demo: <DemoDashboard /> },
  { id: 'ag', label: 'AG', icon: Vote, demo: <DemoAg /> },
  { id: 'finance', label: 'Finance', icon: PiggyBank, demo: <DemoFinance /> },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, demo: <DemoMaintenance /> },
  { id: 'documents', label: 'Documents', icon: FolderOpen, demo: <DemoDocuments /> },
  { id: 'communication', label: 'Communication', icon: MessageCircle, demo: <DemoCommunication /> },
];

export function DiscoverSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className={styles.section}>
      <div className={styles.illustrationLeft}>
        <Image
          src="/velorah/illustrations/illustration-left.png"
          alt="Immeuble haussmannien avec gestionnaire"
          fill
          sizes="300px"
        />
      </div>
      <div className={styles.illustrationRight}>
        <Image
          src="/velorah/illustrations/illustration-right.png"
          alt="Bureau de gestion immobilière"
          fill
          sizes="300px"
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

        {TABS.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`${styles.tab} ${i === activeTab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(i)}
              role="tab"
              aria-selected={i === activeTab}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}

        <button
          className={styles.arrowBtn}
          onClick={() => setActiveTab((prev) => (prev + 1) % TABS.length)}
          aria-label="Onglet suivant"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.screenshotFrame}>
        {TABS[activeTab].demo}
      </div>

      <div className={styles.videoLink}>
        <Play size={20} className={styles.playIcon} />
        <span>Regarder la visite guidée · 10 min</span>
      </div>
    </section>
  );
}
