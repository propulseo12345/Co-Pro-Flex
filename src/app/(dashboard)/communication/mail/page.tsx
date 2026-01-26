'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Plus } from 'lucide-react';
import Link from 'next/link';
import styles from './mail.module.css';

import {
  MailFolderSidebar,
  MailTabs,
  MailToolbar,
  BulkActionsBar,
  MailList,
  ConfirmModal,
  Toast,
  CreateFolderModal,
  RenameFolderModal,
  DeleteFolderModal,
  MoveToFolderModal,
  TrashActions,
  type TabType,
} from '@/components/features/communication/mail';

import {
  type LegacyEmailMessage,
  type MailFolder,
  DEFAULT_FOLDERS,
  FOLDER_COLORS,
  MOCK_INBOX,
  MOCK_SENT,
  MOCK_DRAFTS,
  MOCK_ARCHIVED,
} from '@/data/mock/mail.mock';

import { useMailListPage } from '@/hooks/modules/useMailListPage';

export default function MailCoproPage() {
  const searchParams = useSearchParams();
  const {
    // State
    selectedTab, setSelectedTab,
    searchQuery, setSearchQuery,
    selectedEmails, setSelectedEmails,
    sentEmails, inboxEmails, draftEmails, archivedEmails, trashEmails,
    showSuccessToast, setShowSuccessToast,
    toastMessage,
    // Folders
    folders, selectedFolder, setSelectedFolder,
    showFolderModal, setShowFolderModal,
    showRenameFolderModal, setShowRenameFolderModal,
    showDeleteFolderModal, setShowDeleteFolderModal,
    showMoveToFolderModal, setShowMoveToFolderModal,
    editingFolder,
    newFolderName, setNewFolderName,
    newFolderColor, setNewFolderColor,
    folderMenuOpen,
    // Modals
    showDeleteModal, setShowDeleteModal,
    showPermanentDeleteModal, setShowPermanentDeleteModal,
    // Actions
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveToFolder,
    openFolderMenu,
    openRenameModal,
    openDeleteModal,
    handleMarkAsRead,
    handleArchive,
    handleDeleteClick,
    handleConfirmDelete,
    handleRestore,
    handlePermanentDelete,
    handleEmptyTrash,
    handleExportPDF,
    // Helpers
    getEmailsForTab,
    getEmailCountForFolder,
    toggleEmailSelection,
  } = useMailListPage();

  useEffect(() => {
    if (searchParams.get('deleted') === 'true') {
      window.history.replaceState({}, '', '/communication/mail');
    }
  }, [searchParams]);

  const filteredEmails = getEmailsForTab().filter(email =>
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (email.sender && email.sender.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const unreadCount = inboxEmails.filter(e => !e.isRead).length;

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mail de la copropriété</h1>
          <p className={styles.subtitle}>
            Gérez tous les mails officiels envoyés aux copropriétaires avec suivi et traçabilité
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/communication/mail/nouveau" className="btn btn-primary">
            <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Rédiger un mail
          </Link>
        </div>
      </div>

      <div className={styles.emailAddress}>
        <Mail size={16} aria-hidden="true" />
        <span>copro.10-rue-septembre@copro-manager.fr</span>
        <span className={styles.badge}>Adresse officielle</span>
      </div>

      <div className={styles.mailLayout}>
        <MailFolderSidebar
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onCreateFolder={() => setShowFolderModal(true)}
          onRenameFolder={openRenameModal}
          onDeleteFolder={openDeleteModal}
          getEmailCountForFolder={getEmailCountForFolder}
          folderMenuOpen={folderMenuOpen}
          onToggleFolderMenu={openFolderMenu}
        />

        <div className="card">
          <MailTabs
            selectedTab={selectedTab}
            onSelectTab={(tab) => { setSelectedTab(tab); setSelectedEmails([]); }}
            unreadCount={unreadCount}
            draftsCount={draftEmails.length}
            trashCount={trashEmails.length}
          />

          <MailToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTab={selectedTab}
          />

          <BulkActionsBar
            selectedCount={selectedEmails.length}
            selectedTab={selectedTab}
            onMarkAsRead={selectedTab === 'inbox' ? handleMarkAsRead : undefined}
            onMoveToFolder={() => setShowMoveToFolderModal(true)}
            onArchive={handleArchive}
            onExportPDF={handleExportPDF}
            onDelete={handleDeleteClick}
            onRestore={handleRestore}
            onPermanentDelete={() => setShowPermanentDeleteModal(true)}
          />

          {selectedTab === 'trash' && selectedEmails.length === 0 && (
            <TrashActions trashCount={trashEmails.length} onEmptyTrash={handleEmptyTrash} />
          )}

          <MailList
            emails={filteredEmails}
            selectedEmails={selectedEmails}
            onToggleSelect={toggleEmailSelection}
            selectedTab={selectedTab}
            searchQuery={searchQuery}
            selectedFolder={selectedFolder}
          />
        </div>
      </div>

      <CreateFolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onCreate={handleCreateFolder}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        folderColor={newFolderColor}
        onFolderColorChange={setNewFolderColor}
      />

      <RenameFolderModal
        isOpen={showRenameFolderModal}
        onClose={() => setShowRenameFolderModal(false)}
        onRename={handleRenameFolder}
        folder={editingFolder}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        folderColor={newFolderColor}
        onFolderColorChange={setNewFolderColor}
      />

      <DeleteFolderModal
        isOpen={showDeleteFolderModal}
        onClose={() => setShowDeleteFolderModal(false)}
        onDelete={handleDeleteFolder}
        folder={editingFolder}
      />

      <MoveToFolderModal
        isOpen={showMoveToFolderModal}
        onClose={() => setShowMoveToFolderModal(false)}
        onMove={handleMoveToFolder}
        folders={folders}
        selectedCount={selectedEmails.length}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmer la suppression"
        message={<>Êtes-vous sûr de vouloir supprimer {selectedEmails.length} mail{selectedEmails.length > 1 ? 's' : ''} ?<br />Cette action est irréversible.</>}
        confirmLabel="Supprimer"
      />

      <ConfirmModal
        isOpen={showPermanentDeleteModal}
        onClose={() => setShowPermanentDeleteModal(false)}
        onConfirm={handlePermanentDelete}
        title="Supprimer définitivement ?"
        message={<><strong>Cette action est irréversible.</strong><br />{selectedEmails.length > 1 ? `${selectedEmails.length} mails seront supprimés de façon permanente.` : 'Ce mail sera supprimé de façon permanente.'}</>}
        confirmLabel="Supprimer définitivement"
      />

      <Toast isVisible={showSuccessToast} message={toastMessage} />
    </div>
  );
}
