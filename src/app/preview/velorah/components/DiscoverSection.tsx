'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode, type ComponentType } from 'react';
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

const AUTOPLAY_DURATION = 7000;
const CIRCLE_RADIUS = 22;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export function DiscoverSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const goNext = useCallback(() => {
    setActiveTab((prev) => (prev + 1) % TABS.length);
    setProgress(0);
    startTimeRef.current = Date.now();
  }, []);

  const goPrev = useCallback(() => {
    setActiveTab((prev) => (prev - 1 + TABS.length) % TABS.length);
    setProgress(0);
    startTimeRef.current = Date.now();
  }, []);

  const selectTab = useCallback((i: number) => {
    setActiveTab(i);
    setProgress(0);
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isPaused) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / AUTOPLAY_DURATION, 1);
      setProgress(pct);

      if (pct >= 1) {
        goNext();
      } else {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPaused, activeTab, goNext]);

  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  return (
    <section className={styles.section}>
      {/* Hero content */}
      <div className={styles.heroContent}>
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          La gestion de copropriété nouvelle génération
        </div>

        <h1 className={styles.heroTitle}>
          Le logiciel de copropriété que les gestionnaires{' '}
          <em>adorent utiliser</em>
        </h1>

        <p className={styles.heroDesc}>
          AG en quelques clics, finances en temps réel, documents centralisés
          — une seule plateforme pour le gestionnaire et les copropriétaires.
          Fini les appels, les mails perdus et les ressaisies.
        </p>

        <button className={styles.heroCta}>
          Demander une démo gratuite
        </button>

        <div className={styles.heroSocial}>
          <strong>30% de temps gagné</strong> en moyenne par nos gestionnaires
        </div>
      </div>

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

      <div
        className={styles.tabs}
        role="tablist"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          setIsPaused(false);
          startTimeRef.current = Date.now() - progress * AUTOPLAY_DURATION;
        }}
      >
        <button
          className={styles.arrowBtn}
          onClick={goPrev}
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
              onClick={() => selectTab(i)}
              role="tab"
              aria-selected={i === activeTab}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}

        <button
          className={`${styles.arrowBtn} ${styles.arrowBtnNext}`}
          onClick={goNext}
          aria-label="Onglet suivant"
        >
          <svg
            className={styles.progressRing}
            width="48"
            height="48"
            viewBox="0 0 48 48"
          >
            {/* Track */}
            <circle
              cx="24"
              cy="24"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="var(--pg-border)"
              strokeWidth="2.5"
            />
            {/* Progress */}
            <circle
              cx="24"
              cy="24"
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="var(--pg-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <ChevronRight size={18} className={styles.arrowIcon} />
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
