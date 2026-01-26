'use client';

import { AlertCircle } from 'lucide-react';
import type { LegacyEmailMessage } from '@/data/mock/mail.mock';
import type { TabType } from './MailTabs';
import { MailListItem } from './MailListItem';
import styles from './mail-components.module.css';

interface MailListProps {
  emails: LegacyEmailMessage[];
  selectedEmails: number[];
  onToggleSelect: (id: number) => void;
  selectedTab: TabType;
  searchQuery: string;
  selectedFolder: string | null;
}

export function MailList({
  emails,
  selectedEmails,
  onToggleSelect,
  selectedTab,
  searchQuery,
  selectedFolder,
}: MailListProps) {
  if (emails.length === 0) {
    return (
      <div className={styles.emptyState}>
        <AlertCircle size={48} aria-hidden="true" />
        <p>
          {searchQuery
            ? 'Aucun mail trouvé pour cette recherche'
            : selectedFolder
              ? 'Aucun mail dans ce dossier'
              : selectedTab === 'inbox'
                ? 'Aucun mail reçu'
                : selectedTab === 'drafts'
                  ? 'Aucun brouillon'
                  : selectedTab === 'archived'
                    ? 'Aucun mail archivé'
                    : selectedTab === 'trash'
                      ? 'La corbeille est vide'
                      : 'Aucun mail envoyé'}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.emailList}>
      {emails.map((email) => (
        <MailListItem
          key={email.id}
          email={email}
          isSelected={selectedEmails.includes(email.id)}
          onToggleSelect={onToggleSelect}
          selectedTab={selectedTab}
        />
      ))}
    </div>
  );
}
