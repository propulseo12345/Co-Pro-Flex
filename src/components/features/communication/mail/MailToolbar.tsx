'use client';

import { Search } from 'lucide-react';
import type { TabType } from './MailTabs';
import styles from './mail-components.module.css';

interface MailToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTab: TabType;
}

export function MailToolbar({ searchQuery, onSearchChange, selectedTab }: MailToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="text"
          placeholder={
            selectedTab === 'inbox'
              ? 'Rechercher par expéditeur, sujet...'
              : 'Rechercher par sujet, destinataire...'
          }
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {selectedTab !== 'inbox' && (
        <select className={styles.select} aria-label="Sélectionner une option">
          <option>Tous les destinataires</option>
          <option>Tous les copropriétaires</option>
          <option>Conseil syndical</option>
          <option>Par étage</option>
        </select>
      )}
    </div>
  );
}
