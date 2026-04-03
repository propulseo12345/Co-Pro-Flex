'use client';

export const dynamic = 'force-dynamic';

import { MailSidebar, MailList, MailReader, ComposeModal } from '@/features/communication/mail/components';
import { useMailbox } from '@/features/communication/mail/hooks';
import styles from './mail.module.css';

export default function MailPage() {
  const {
    mails,
    selectedMail,
    currentFolder,
    labels,
    folders,
    searchTerm,
    unreadCount,
    isComposeOpen,
    replyTo,
    selectMail,
    setFolder,
    setSearchTerm,
    sendMail,
    saveDraft,
    deleteMail,
    archiveMail,
    toggleStar,
    openCompose,
    openReply,
    closeCompose,
  } = useMailbox();

  return (
    <div className={styles.pageContainer}>
      {/* Sidebar — dossiers et labels */}
      <div className={styles.sidebarColumn}>
        <MailSidebar
          folders={folders}
          labels={labels}
          currentFolder={currentFolder}
          unreadCount={unreadCount}
          onFolderChange={setFolder}
          onCompose={openCompose}
        />
      </div>

      {/* Liste des mails */}
      <div className={styles.listColumn}>
        <MailList
          mails={mails}
          selectedMailId={selectedMail?.id ?? null}
          searchTerm={searchTerm}
          onSelectMail={selectMail}
          onSearchChange={setSearchTerm}
          onToggleStar={toggleStar}
        />
      </div>

      {/* Lecteur de mail */}
      <div className={styles.readerColumn}>
        <MailReader
          mail={selectedMail}
          onReply={openReply}
          onArchive={archiveMail}
          onDelete={deleteMail}
          onToggleStar={toggleStar}
        />
      </div>

      {/* Modal de composition */}
      <ComposeModal
        isOpen={isComposeOpen}
        replyTo={replyTo}
        onClose={closeCompose}
        onSend={sendMail}
        onSaveDraft={saveDraft}
      />
    </div>
  );
}
