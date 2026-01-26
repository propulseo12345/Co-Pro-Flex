'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TabType } from '@/components/features/communication/mail/MailTabs';
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

const MAIL_STORAGE_KEY = 'mail-copro-data';

interface MailStorageData {
  sent: LegacyEmailMessage[];
  inbox: LegacyEmailMessage[];
  drafts: LegacyEmailMessage[];
  archived: LegacyEmailMessage[];
  emails: Record<string, LegacyEmailMessage>;
  inboxReadState?: Record<number, boolean>;
  deletedIds?: number[];
  folders?: MailFolder[];
  emailFolders?: Record<number, string>;
}

const DEFAULT_MAIL_DATA: MailStorageData = { sent: [], inbox: [], drafts: [], archived: [], emails: {} };

const getStoredData = (): MailStorageData => {
  if (typeof window === 'undefined') return DEFAULT_MAIL_DATA;
  const stored = localStorage.getItem(MAIL_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as MailStorageData;
      if (parsed && typeof parsed === 'object') {
        return {
          sent: Array.isArray(parsed.sent) ? parsed.sent : [],
          inbox: Array.isArray(parsed.inbox) ? parsed.inbox : [],
          drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
          archived: Array.isArray(parsed.archived) ? parsed.archived : [],
          emails: parsed.emails && typeof parsed.emails === 'object' ? parsed.emails : {},
          inboxReadState: parsed.inboxReadState || {},
          deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
          folders: Array.isArray(parsed.folders) ? parsed.folders : undefined,
          emailFolders: parsed.emailFolders && typeof parsed.emailFolders === 'object' ? parsed.emailFolders : undefined
        };
      }
    } catch {
      return DEFAULT_MAIL_DATA;
    }
  }
  return DEFAULT_MAIL_DATA;
};

const saveStoredData = (data: MailStorageData) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MAIL_STORAGE_KEY, JSON.stringify(data));
  }
};

export function useMailListPage() {
  const [selectedTab, setSelectedTab] = useState<TabType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<number[]>([]);
  const [sentEmails, setSentEmails] = useState<LegacyEmailMessage[]>(MOCK_SENT);
  const [inboxEmails, setInboxEmails] = useState<LegacyEmailMessage[]>(MOCK_INBOX);
  const [draftEmails, setDraftEmails] = useState<LegacyEmailMessage[]>(MOCK_DRAFTS);
  const [archivedEmails, setArchivedEmails] = useState<LegacyEmailMessage[]>(MOCK_ARCHIVED);
  const [trashEmails, setTrashEmails] = useState<LegacyEmailMessage[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  // Folder state
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

  // Load from localStorage
  useEffect(() => {
    const data = getStoredData();
    const storedDeletedIds = data.deletedIds || [];
    setDeletedIds(storedDeletedIds);

    const filterDeleted = (emails: LegacyEmailMessage[]) =>
      emails.filter(e => !storedDeletedIds.includes(e.id));

    if (data.sent?.length > 0) {
      const sentIds = new Set(data.sent.map(e => e.id));
      const uniqueMockSent = MOCK_SENT.filter(e => !sentIds.has(e.id));
      setSentEmails(filterDeleted([...data.sent, ...uniqueMockSent]));
    } else {
      setSentEmails(filterDeleted(MOCK_SENT));
    }

    const readState = data.inboxReadState;
    const filteredInbox = filterDeleted(MOCK_INBOX).map(email => ({
      ...email,
      isRead: readState?.[email.id] ?? email.isRead
    }));
    setInboxEmails(filteredInbox);

    if (data.drafts?.length > 0) {
      const storedDraftIds = new Set(data.drafts.map(d => d.id));
      const mockDraftsFiltered = MOCK_DRAFTS.filter(d => !storedDraftIds.has(d.id));
      setDraftEmails(filterDeleted([...data.drafts, ...mockDraftsFiltered]));
    } else {
      setDraftEmails(filterDeleted(MOCK_DRAFTS));
    }

    if (data.archived?.length > 0) {
      const archivedIds = new Set(data.archived.map(e => e.id));
      const uniqueMockArchived = MOCK_ARCHIVED.filter(e => !archivedIds.has(e.id));
      setArchivedEmails(filterDeleted([...data.archived, ...uniqueMockArchived]));
    } else {
      setArchivedEmails(filterDeleted(MOCK_ARCHIVED));
    }

    if (data.folders?.length) setFolders(data.folders);
    if (data.emailFolders) setEmailFolders(data.emailFolders);
  }, []);

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

  // Folder actions
  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const newFolder: MailFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      color: newFolderColor,
      order: folders.length,
    };
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    const data = getStoredData();
    data.folders = updatedFolders;
    saveStoredData(data);
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0]);
    setShowFolderModal(false);
  }, [newFolderName, newFolderColor, folders]);

  const handleRenameFolder = useCallback(() => {
    if (!editingFolder || !newFolderName.trim()) return;
    const updatedFolders = folders.map(f =>
      f.id === editingFolder.id ? { ...f, name: newFolderName.trim(), color: newFolderColor } : f
    );
    setFolders(updatedFolders);
    const data = getStoredData();
    data.folders = updatedFolders;
    saveStoredData(data);
    setEditingFolder(null);
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0]);
    setShowRenameFolderModal(false);
  }, [editingFolder, newFolderName, newFolderColor, folders]);

  const handleDeleteFolder = useCallback(() => {
    if (!editingFolder) return;
    const updatedFolders = folders.filter(f => f.id !== editingFolder.id);
    setFolders(updatedFolders);
    const updatedEmailFolders = { ...emailFolders };
    Object.keys(updatedEmailFolders).forEach(emailId => {
      if (updatedEmailFolders[Number(emailId)] === editingFolder.id) {
        delete updatedEmailFolders[Number(emailId)];
      }
    });
    setEmailFolders(updatedEmailFolders);
    if (selectedFolder === editingFolder.id) setSelectedFolder(null);
    const data = getStoredData();
    data.folders = updatedFolders;
    data.emailFolders = updatedEmailFolders;
    saveStoredData(data);
    setEditingFolder(null);
    setShowDeleteFolderModal(false);
  }, [editingFolder, folders, emailFolders, selectedFolder]);

  const handleMoveToFolder = useCallback((folderId: string | null) => {
    if (selectedEmails.length === 0) return;
    const updatedEmailFolders = { ...emailFolders };
    selectedEmails.forEach(emailId => {
      if (folderId) updatedEmailFolders[emailId] = folderId;
      else delete updatedEmailFolders[emailId];
    });
    setEmailFolders(updatedEmailFolders);
    const data = getStoredData();
    data.emailFolders = updatedEmailFolders;
    saveStoredData(data);
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

  // Mail actions
  const handleMarkAsRead = useCallback(() => {
    if (selectedTab !== 'inbox' || selectedEmails.length === 0) return;
    const updatedInbox = inboxEmails.map(email =>
      selectedEmails.includes(email.id) ? { ...email, isRead: true } : email
    );
    setInboxEmails(updatedInbox);
    const data = getStoredData();
    const newReadState = data.inboxReadState || {};
    selectedEmails.forEach(id => { newReadState[id] = true; });
    data.inboxReadState = newReadState;
    saveStoredData(data);
    setSelectedEmails([]);
  }, [selectedTab, selectedEmails, inboxEmails]);

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
      const data = getStoredData();
      data.archived = [...emailsToArchive, ...(data.archived || [])];
      saveStoredData(data);
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
    const data = getStoredData();
    data.deletedIds = [...(data.deletedIds || []), ...selectedEmails];
    saveStoredData(data);
    setToastMessage(selectedEmails.length > 1 ? `${selectedEmails.length} mails supprimés définitivement` : 'Mail supprimé définitivement');
    setSelectedEmails([]);
    setShowPermanentDeleteModal(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }, [selectedEmails]);

  const handleEmptyTrash = useCallback(() => {
    const count = trashEmails.length;
    const trashIds = trashEmails.map(e => e.id);
    const data = getStoredData();
    data.deletedIds = [...(data.deletedIds || []), ...trashIds];
    saveStoredData(data);
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
  };
}
