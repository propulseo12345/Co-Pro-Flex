'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { mailSupabaseService } from '@/lib/services/mail-supabase.service';
import type { TabType } from '@/components/features/communication/mail/MailTabs';
import type { Mail } from '@/types/models/mail';

// Folder types (kept client-side for now) - exported for use in pages
export interface MailFolder {
  id: string;
  name: string;
  color: string;
  order: number;
}

export const DEFAULT_FOLDERS: MailFolder[] = [];

export const FOLDER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
];

// Map Supabase Mail to UI expected format - exported for use in pages/components
export interface LegacyEmailMessage {
  id: number;
  originalId: string; // Keep original Supabase UUID for navigation
  subject: string;
  preview: string;
  sender?: string;
  recipients: string[];
  recipientType: 'all' | 'group' | 'individual';
  date: string;
  isRead?: boolean;
  hasAttachment: boolean;
  status: 'draft' | 'sending' | 'sent' | 'opened' | 'delivered' | 'failed' | 'received';
  template?: string;
  stats?: { sent: number; opened: number; received: number };
  deletedAt?: string;
  originalTab?: TabType;
  body?: string;
  folderId?: string;
  attachments?: { name: string; size: string; type: string }[];
}

function mapMailToLegacy(mail: Mail): LegacyEmailMessage {
  // Map recipient type
  let recipientType: 'all' | 'group' | 'individual' = 'individual';
  if (mail.recipientType === 'all') {
    recipientType = 'all';
  } else if (mail.recipientType === 'group') {
    recipientType = 'group';
  }

  return {
    id: parseInt(mail.id.replace(/[^0-9]/g, '').slice(0, 8) || '0', 10) || Math.floor(Math.random() * 100000),
    originalId: mail.id, // Keep original Supabase UUID
    subject: mail.subject,
    preview: mail.preview || mail.body.substring(0, 100),
    sender: mail.statut === 'received' ? (mail.sender?.nom || undefined) : undefined,
    recipients: mail.recipients.map(r => r.nom),
    recipientType,
    date: mail.dateEnvoi || mail.dateCreation,
    isRead: mail.isRead,
    hasAttachment: mail.hasAttachment,
    status: mail.statut === 'draft' ? 'draft' :
            mail.statut === 'sent' ? 'sent' :
            mail.statut === 'opened' ? 'opened' :
            mail.statut === 'received' ? 'received' : 'sent',
    template: mail.template,
    stats: mail.stats,
    body: mail.body,
  };
}

export function useMailListPage() {
  const { currentCoproId } = useCopro();
  const [selectedTab, setSelectedTab] = useState<TabType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<number[]>([]);
  const [sentEmails, setSentEmails] = useState<LegacyEmailMessage[]>([]);
  const [inboxEmails, setInboxEmails] = useState<LegacyEmailMessage[]>([]);
  const [draftEmails, setDraftEmails] = useState<LegacyEmailMessage[]>([]);
  const [archivedEmails, setArchivedEmails] = useState<LegacyEmailMessage[]>([]);
  const [trashEmails, setTrashEmails] = useState<LegacyEmailMessage[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Folder state (client-side only)
  const [folders, setFolders] = useState<MailFolder[]>(DEFAULT_FOLDERS);
  const [emailFolders, setEmailFolders] = useState<Record<number, string>>({});
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [showMoveToFolderModal, setShowMoveToFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MailFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);

  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);

  // Fetch mails from Supabase
  const fetchMails = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch all tabs in parallel
      const [inbox, sent, drafts, archived, trash] = await Promise.all([
        mailSupabaseService.getMails(currentCoproId, { onglet: 'inbox', recherche: '' }),
        mailSupabaseService.getMails(currentCoproId, { onglet: 'sent', recherche: '' }),
        mailSupabaseService.getMails(currentCoproId, { onglet: 'drafts', recherche: '' }),
        mailSupabaseService.getMails(currentCoproId, { onglet: 'archived', recherche: '' }),
        mailSupabaseService.getMails(currentCoproId, { onglet: 'trash', recherche: '' }),
      ]);

      setInboxEmails(inbox.map(mapMailToLegacy));
      setSentEmails(sent.map(mapMailToLegacy));
      setDraftEmails(drafts.map(mapMailToLegacy));
      setArchivedEmails(archived.map(mapMailToLegacy));
      setTrashEmails(trash.map(mapMailToLegacy));
    } catch (err) {
      console.error('Error fetching mails:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  // Initial fetch
  useEffect(() => {
    fetchMails();
  }, [fetchMails]);

  const getEmailsForTab = useCallback((): LegacyEmailMessage[] => {
    let emails: LegacyEmailMessage[];
    switch (selectedTab) {
      case 'inbox': emails = inboxEmails; break;
      case 'sent': emails = sentEmails; break;
      case 'drafts': emails = draftEmails; break;
      case 'archived': emails = archivedEmails; break;
      case 'trash': emails = trashEmails; break;
      default: emails = [];
    }
    if (selectedFolder) {
      return emails.filter(email => emailFolders[email.id] === selectedFolder);
    }
    return emails;
  }, [selectedTab, inboxEmails, sentEmails, draftEmails, archivedEmails, trashEmails, selectedFolder, emailFolders]);

  const getEmailCountForFolder = useCallback((folderId: string): number => {
    const allEmails = [...inboxEmails, ...sentEmails];
    return allEmails.filter(email => emailFolders[email.id] === folderId).length;
  }, [inboxEmails, sentEmails, emailFolders]);

  const toggleEmailSelection = useCallback((id: number) => {
    setSelectedEmails(prev =>
      prev.includes(id) ? prev.filter(emailId => emailId !== id) : [...prev, id]
    );
  }, []);

  // Folder actions (client-side)
  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const newFolder: MailFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      color: newFolderColor,
      order: folders.length,
    };
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0]);
    setShowFolderModal(false);
  }, [newFolderName, newFolderColor, folders]);

  const handleRenameFolder = useCallback(() => {
    if (!editingFolder || !newFolderName.trim()) return;
    setFolders(folders.map(f =>
      f.id === editingFolder.id ? { ...f, name: newFolderName.trim(), color: newFolderColor } : f
    ));
    setEditingFolder(null);
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0]);
    setShowRenameFolderModal(false);
  }, [editingFolder, newFolderName, newFolderColor, folders]);

  const handleDeleteFolder = useCallback(() => {
    if (!editingFolder) return;
    setFolders(folders.filter(f => f.id !== editingFolder.id));
    const updated = { ...emailFolders };
    Object.keys(updated).forEach(emailId => {
      if (updated[Number(emailId)] === editingFolder.id) {
        delete updated[Number(emailId)];
      }
    });
    setEmailFolders(updated);
    if (selectedFolder === editingFolder.id) setSelectedFolder(null);
    setEditingFolder(null);
    setShowDeleteFolderModal(false);
  }, [editingFolder, folders, emailFolders, selectedFolder]);

  const handleMoveToFolder = useCallback((folderId: string | null) => {
    if (selectedEmails.length === 0) return;
    const updated = { ...emailFolders };
    selectedEmails.forEach(emailId => {
      if (folderId) updated[emailId] = folderId;
      else delete updated[emailId];
    });
    setEmailFolders(updated);
    setSelectedEmails([]);
    setShowMoveToFolderModal(false);
  }, [selectedEmails, emailFolders]);

  const openFolderMenu = useCallback((folderId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderMenuOpen(folderMenuOpen === folderId ? null : folderId);
  }, [folderMenuOpen]);

  const openRenameModal = useCallback((folder: MailFolder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderColor(folder.color);
    setFolderMenuOpen(null);
    setShowRenameFolderModal(true);
  }, []);

  const openDeleteModal = useCallback((folder: MailFolder) => {
    setEditingFolder(folder);
    setFolderMenuOpen(null);
    setShowDeleteFolderModal(true);
  }, []);

  // Mail actions (via Supabase)
  const handleMarkAsRead = useCallback(async () => {
    if (selectedTab !== 'inbox' || selectedEmails.length === 0) return;

    // For now, just update local state (Supabase integration would need mail IDs mapping)
    setInboxEmails(prev => prev.map(email =>
      selectedEmails.includes(email.id) ? { ...email, isRead: true } : email
    ));
    setSelectedEmails([]);
  }, [selectedTab, selectedEmails]);

  const handleArchive = useCallback(() => {
    if (selectedEmails.length === 0) return;
    const emailsToArchive = getEmailsForTab().filter(email => selectedEmails.includes(email.id));

    if (selectedTab === 'archived') {
      emailsToArchive.forEach(email => {
        if (email.sender) setInboxEmails(prev => [email, ...prev.filter(e => e.id !== email.id)]);
        else setSentEmails(prev => [email, ...prev.filter(e => e.id !== email.id)]);
      });
      setArchivedEmails(prev => prev.filter(email => !selectedEmails.includes(email.id)));
    } else {
      setArchivedEmails(prev => [...emailsToArchive, ...prev]);
      switch (selectedTab) {
        case 'inbox': setInboxEmails(prev => prev.filter(email => !selectedEmails.includes(email.id))); break;
        case 'sent': setSentEmails(prev => prev.filter(email => !selectedEmails.includes(email.id))); break;
        case 'drafts': setDraftEmails(prev => prev.filter(email => !selectedEmails.includes(email.id))); break;
      }
    }
    setSelectedEmails([]);
  }, [selectedEmails, selectedTab, getEmailsForTab]);

  const handleDeleteClick = useCallback(() => {
    if (selectedEmails.length === 0) return;
    setShowDeleteModal(true);
  }, [selectedEmails]);

  const handleConfirmDelete = useCallback(() => {
    const emailsToTrash = getEmailsForTab().filter(email => selectedEmails.includes(email.id));
    const trashedEmails = emailsToTrash.map(email => ({
      ...email,
      deletedAt: new Date().toISOString(),
      originalTab: selectedTab
    }));
    setTrashEmails(prev => [...trashedEmails, ...prev]);
    switch (selectedTab) {
      case 'inbox': setInboxEmails(prev => prev.filter(email => !selectedEmails.includes(email.id))); break;
      case 'sent': setSentEmails(prev => prev.filter(email => !selectedEmails.includes(email.id))); break;
      case 'drafts': setDraftEmails(prev => prev.filter(email => !selectedEmails.includes(email.id))); break;
      case 'archived': setArchivedEmails(prev => prev.filter(email => !selectedEmails.includes(email.id))); break;
    }
    setToastMessage(selectedEmails.length > 1 ? `${selectedEmails.length} mails déplacés vers la corbeille` : 'Mail déplacé vers la corbeille');
    setShowDeleteModal(false);
    setSelectedEmails([]);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }, [selectedEmails, selectedTab, getEmailsForTab]);

  const handleRestore = useCallback(() => {
    if (selectedEmails.length === 0) return;
    const emailsToRestore = trashEmails.filter(email => selectedEmails.includes(email.id));
    setInboxEmails(prev => [...emailsToRestore, ...prev]);
    setTrashEmails(prev => prev.filter(email => !selectedEmails.includes(email.id)));
    setToastMessage(selectedEmails.length > 1 ? `${selectedEmails.length} mails restaurés` : 'Mail restauré');
    setSelectedEmails([]);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }, [selectedEmails, trashEmails]);

  const handlePermanentDelete = useCallback(() => {
    if (selectedEmails.length === 0) return;
    setTrashEmails(prev => prev.filter(email => !selectedEmails.includes(email.id)));
    setToastMessage(selectedEmails.length > 1 ? `${selectedEmails.length} mails supprimés définitivement` : 'Mail supprimé définitivement');
    setSelectedEmails([]);
    setShowPermanentDeleteModal(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }, [selectedEmails]);

  const handleEmptyTrash = useCallback(() => {
    const count = trashEmails.length;
    setTrashEmails([]);
    setToastMessage(`Corbeille vidée (${count} mails)`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }, [trashEmails]);

  const handleExportPDF = useCallback(() => {
    if (selectedEmails.length === 0) return;
    const emailsToExport = getEmailsForTab().filter(email => selectedEmails.includes(email.id));
    const printContent = `
      <!DOCTYPE html><html><head><title>Export Mails</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}.email{border:1px solid #ddd;padding:15px;margin-bottom:15px;border-radius:8px}.subject{font-size:18px;font-weight:bold;margin-bottom:8px}.meta{color:#666;font-size:14px;margin-bottom:10px}.preview{color:#333}</style>
      </head><body><h1>Export des mails</h1><p>Date d'export: ${new Date().toLocaleDateString('fr-FR')}</p>
      ${emailsToExport.map(email => `<div class="email"><div class="subject">${email.subject}</div><div class="meta">${email.sender ? `De: ${email.sender}` : `À: ${email.recipients.join(', ')}`}<br>Date: ${new Date(email.date).toLocaleDateString('fr-FR')}</div><div class="preview">${email.preview}</div></div>`).join('')}
      </body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    setSelectedEmails([]);
  }, [selectedEmails, getEmailsForTab]);

  return {
    selectedTab, setSelectedTab,
    searchQuery, setSearchQuery,
    selectedEmails, setSelectedEmails,
    sentEmails, inboxEmails, draftEmails, archivedEmails, trashEmails,
    showSuccessToast, setShowSuccessToast,
    toastMessage,
    isLoading,
    folders, selectedFolder, setSelectedFolder,
    showFolderModal, setShowFolderModal,
    showRenameFolderModal, setShowRenameFolderModal,
    showDeleteFolderModal, setShowDeleteFolderModal,
    showMoveToFolderModal, setShowMoveToFolderModal,
    editingFolder,
    newFolderName, setNewFolderName,
    newFolderColor, setNewFolderColor,
    folderMenuOpen,
    showDeleteModal, setShowDeleteModal,
    showPermanentDeleteModal, setShowPermanentDeleteModal,
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
    getEmailsForTab,
    getEmailCountForFolder,
    toggleEmailSelection,
    refetch: fetchMails,
  };
}
