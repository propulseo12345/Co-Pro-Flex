'use client';

import {
  FileText, BookOpen, Scale, Wallet,
  FileSpreadsheet, ClipboardList, HardHat, Users,
  Lock, History
} from 'lucide-react';
import type { TabCompta } from './types';
import styles from './ComptaSidebar.module.css';

interface ComptaSidebarProps {
  activeTab: TabCompta;
  onTabChange: (tab: TabCompta) => void;
  onShowCloture?: () => void;
  onShowHistorique?: () => void;
  isReadOnly?: boolean;
}

const MAIN_ITEMS: { id: TabCompta; label: string; icon: React.ReactNode }[] = [
  { id: 'grand-livre', label: 'Grand Livre', icon: <FileText size={16} /> },
  { id: 'livre-comptable', label: 'Livre comptable', icon: <BookOpen size={16} /> },
  { id: 'balance', label: 'Balance', icon: <Scale size={16} /> },
];

const DOC_ITEMS: { id: TabCompta; label: string; icon: React.ReactNode }[] = [
  { id: 'compte-gestion', label: 'Compte de gestion', icon: <Wallet size={16} /> },
  { id: 'annexe-1', label: 'Annexe 1 — État financier', icon: <FileSpreadsheet size={14} /> },
  { id: 'annexe-2', label: 'Annexe 2 — Gestion', icon: <FileSpreadsheet size={14} /> },
  { id: 'annexe-3', label: 'Annexe 3 — Clés', icon: <ClipboardList size={14} /> },
  { id: 'annexe-4', label: 'Annexe 4 — Travaux', icon: <HardHat size={14} /> },
  { id: 'annexe-5', label: 'Annexe 5 — Non clôturés', icon: <Users size={14} /> },
];

export function ComptaSidebar({
  activeTab,
  onTabChange,
  onShowCloture,
  onShowHistorique,
  isReadOnly,
}: ComptaSidebarProps) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.sidebarTitle}>Comptabilité</div>

      {MAIN_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`${styles.sidebarItem} ${activeTab === item.id ? styles.active : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className={styles.divider} />
      <div className={styles.sectionLabel}>Documents légaux</div>

      {DOC_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`${styles.sidebarItem} ${activeTab === item.id ? styles.active : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className={styles.divider} />

      {!isReadOnly && onShowCloture && (
        <button className={styles.sidebarItem} onClick={onShowCloture}>
          <span className={styles.icon}><Lock size={16} /></span>
          Clôture exercice
        </button>
      )}
      {onShowHistorique && (
        <button className={styles.sidebarItem} onClick={onShowHistorique}>
          <span className={styles.icon}><History size={16} /></span>
          Historique
        </button>
      )}
    </nav>
  );
}
