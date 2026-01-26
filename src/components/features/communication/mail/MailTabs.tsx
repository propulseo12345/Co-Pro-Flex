'use client';

import { Inbox, Send, FileText, Archive, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import styles from './mail-components.module.css';

export type TabType = 'inbox' | 'sent' | 'drafts' | 'archived' | 'trash';

interface MailTabsProps {
  selectedTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unreadCount: number;
  draftsCount: number;
  trashCount: number;
}

export function MailTabs({
  selectedTab,
  onSelectTab,
  unreadCount,
  draftsCount,
  trashCount,
}: MailTabsProps) {
  return (
    <div className={styles.tabs}>
      <button
        className={clsx(styles.tab, selectedTab === 'inbox' && styles.tabActive)}
        onClick={() => onSelectTab('inbox')}
      >
        <Inbox size={16} aria-hidden="true" />
        Boîte de réception
        {unreadCount > 0 && <span className={styles.tabBadge}>{unreadCount}</span>}
      </button>
      <button
        className={clsx(styles.tab, selectedTab === 'sent' && styles.tabActive)}
        onClick={() => onSelectTab('sent')}
      >
        <Send size={16} aria-hidden="true" />
        Envoyés
      </button>
      <button
        className={clsx(styles.tab, selectedTab === 'drafts' && styles.tabActive)}
        onClick={() => onSelectTab('drafts')}
      >
        <FileText size={16} aria-hidden="true" />
        Brouillons
        {draftsCount > 0 && <span className={styles.tabBadgeDraft}>{draftsCount}</span>}
      </button>
      <button
        className={clsx(styles.tab, selectedTab === 'archived' && styles.tabActive)}
        onClick={() => onSelectTab('archived')}
      >
        <Archive size={16} aria-hidden="true" />
        Archivés
      </button>
      <button
        className={clsx(styles.tab, styles.tabTrash, selectedTab === 'trash' && styles.tabActive)}
        onClick={() => onSelectTab('trash')}
      >
        <Trash2 size={16} aria-hidden="true" />
        Corbeille
        {trashCount > 0 && <span className={styles.tabBadgeTrash}>{trashCount}</span>}
      </button>
    </div>
  );
}
