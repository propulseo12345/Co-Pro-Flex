'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, BookOpen, Scale, Wallet, FileSpreadsheet, ChevronDown } from 'lucide-react';
import type { TabCompta } from './types';
import styles from './ComptaNavBar.module.css';

interface ComptaNavBarProps {
  activeTab: TabCompta;
  onTabChange: (tab: TabCompta) => void;
}

const MAIN_TABS: { id: TabCompta; label: string; icon: React.ReactNode }[] = [
  { id: 'grand-livre', label: 'Grand Livre', icon: <FileText size={14} /> },
  { id: 'livre-comptable', label: 'Livre comptable', icon: <BookOpen size={14} /> },
  { id: 'balance', label: 'Balance', icon: <Scale size={14} /> },
  { id: 'compte-gestion', label: 'Compte de gestion', icon: <Wallet size={14} /> },
];

const ANNEXE_TABS: { id: TabCompta; label: string; shortLabel: string }[] = [
  { id: 'annexe-1', label: 'Annexe 1 — État financier', shortLabel: 'Annexe 1' },
  { id: 'annexe-2', label: 'Annexe 2 — Gestion', shortLabel: 'Annexe 2' },
  { id: 'annexe-3', label: 'Annexe 3 — Clés', shortLabel: 'Annexe 3' },
  { id: 'annexe-4', label: 'Annexe 4 — Travaux', shortLabel: 'Annexe 4' },
  { id: 'annexe-5', label: 'Annexe 5 — Non clôturés', shortLabel: 'Annexe 5' },
];

export function ComptaNavBar({ activeTab, onTabChange }: ComptaNavBarProps) {
  const [annexeOpen, setAnnexeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAnnexeActive = activeTab.startsWith('annexe-');
  const activeAnnexe = ANNEXE_TABS.find((t) => t.id === activeTab);

  // Close dropdown on outside click
  useEffect(() => {
    if (!annexeOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAnnexeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [annexeOpen]);

  return (
    <div className={styles.navbar}>
      <div className={styles.tabs}>
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        {/* Annexes dropdown */}
        <div className={styles.dropdownWrap} ref={dropdownRef}>
          <button
            className={`${styles.tab} ${isAnnexeActive ? styles.active : ''}`}
            onClick={() => setAnnexeOpen((prev) => !prev)}
          >
            <FileSpreadsheet size={14} />
            {isAnnexeActive && activeAnnexe ? activeAnnexe.shortLabel : 'Annexes'}
            <ChevronDown size={12} className={`${styles.chevron} ${annexeOpen ? styles.chevronOpen : ''}`} />
          </button>

          {annexeOpen && (
            <div className={styles.dropdown}>
              {ANNEXE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles.dropdownItem} ${activeTab === tab.id ? styles.dropdownItemActive : ''}`}
                  onClick={() => {
                    onTabChange(tab.id);
                    setAnnexeOpen(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
