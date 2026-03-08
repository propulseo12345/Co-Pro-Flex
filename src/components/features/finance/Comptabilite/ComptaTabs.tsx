'use client';

import { FileText, BookOpen, Scale, Wallet, FileSpreadsheet, ClipboardList, HardHat, Users } from 'lucide-react';
import { TabCompta } from './types';
import styles from './Comptabilite.module.css';

interface ComptaTabsProps {
  activeTab: TabCompta;
  onTabChange: (tab: TabCompta) => void;
}

const TABS_CONFIG: { id: TabCompta; label: string; icon: React.ReactNode }[] = [
  { id: 'grand-livre', label: 'Grand Livre', icon: <FileText size={18} aria-hidden="true" /> },
  { id: 'livre-comptable', label: 'Livre comptable', icon: <BookOpen size={18} aria-hidden="true" /> },
  { id: 'balance', label: 'Balance', icon: <Scale size={18} aria-hidden="true" /> },
  { id: 'compte-gestion', label: 'Compte de gestion', icon: <Wallet size={18} aria-hidden="true" /> },
  { id: 'annexe-1', label: 'Annexe 1', icon: <FileSpreadsheet size={16} aria-hidden="true" /> },
  { id: 'annexe-2', label: 'Annexe 2', icon: <FileSpreadsheet size={16} aria-hidden="true" /> },
  { id: 'annexe-3', label: 'Annexe 3', icon: <ClipboardList size={16} aria-hidden="true" /> },
  { id: 'annexe-4', label: 'Annexe 4', icon: <HardHat size={16} aria-hidden="true" /> },
  { id: 'annexe-5', label: 'Annexe 5', icon: <Users size={16} aria-hidden="true" /> },
];

export function ComptaTabs({ activeTab, onTabChange }: ComptaTabsProps) {
  return (
    <div className={styles.tabs}>
      {TABS_CONFIG.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''} ${tab.id.startsWith('annexe') ? styles.tabSmall : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
