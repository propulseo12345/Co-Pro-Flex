'use client';

import { useState, useCallback, useMemo } from 'react';
import type { IMail, IMailFolder, IMailLabel, IDraftData } from '@/features/communication/mail/domain/types';
import { MOCK_MAILS, MOCK_FOLDERS, MOCK_LABELS } from '@/features/communication/mail/domain/mock-data';

// ----------------------------------------------------------------------------
// Types du hook
// ----------------------------------------------------------------------------

export type MailboxFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam' | 'starred';

export interface UseMailboxReturn {
  // State
  mails: IMail[];
  selectedMail: IMail | null;
  currentFolder: MailboxFolder;
  labels: IMailLabel[];
  folders: IMailFolder[];
  searchTerm: string;
  isLoading: boolean;
  unreadCount: number;
  isComposeOpen: boolean;
  replyTo: IMail | null;

  // Actions
  selectMail: (id: string) => void;
  setFolder: (folder: string) => void;
  setSearchTerm: (term: string) => void;
  sendMail: (draft: IDraftData) => void;
  saveDraft: (draft: IDraftData) => void;
  deleteMail: (id: string) => void;
  archiveMail: (id: string) => void;
  toggleStar: (id: string) => void;
  toggleRead: (id: string) => void;
  addLabel: (mailId: string, labelId: string) => void;
  removeLabel: (mailId: string, labelId: string) => void;
  moveToFolder: (mailId: string, folderId: string) => void;
  createLabel: (name: string, color: string) => void;
  createFolder: (name: string) => void;
  openCompose: () => void;
  openReply: (mail: IMail) => void;
  closeCompose: () => void;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function generateId(): string {
  return `m${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useMailbox(): UseMailboxReturn {
  const [allMails, setAllMails] = useState<IMail[]>(MOCK_MAILS);
  const [folders, setFolders] = useState<IMailFolder[]>(MOCK_FOLDERS);
  const [labels, setLabels] = useState<IMailLabel[]>(MOCK_LABELS);
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<MailboxFolder>('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<IMail | null>(null);

  // -- Dossiers système (lookup par folderType) --
  const folderByType = useMemo(() => {
    const map: Record<string, IMailFolder> = {};
    for (const f of folders) {
      map[f.folderType] = f;
    }
    return map;
  }, [folders]);

  // -- Filtrage des mails selon le dossier courant --
  const filteredMails = useMemo(() => {
    let result: IMail[];

    switch (currentFolder) {
      case 'inbox':
        result = allMails.filter(
          (m) =>
            m.folderId === folderByType.inbox?.id &&
            !m.isDraft &&
            m.status !== 'archived' &&
            m.status !== 'trash'
        );
        break;
      case 'sent':
        result = allMails.filter(
          (m) =>
            m.folderId === folderByType.sent?.id &&
            m.status !== 'trash'
        );
        break;
      case 'drafts':
        result = allMails.filter(
          (m) => m.isDraft && m.status !== 'trash'
        );
        break;
      case 'archive':
        result = allMails.filter(
          (m) => m.status === 'archived'
        );
        break;
      case 'trash':
        result = allMails.filter(
          (m) => m.status === 'trash'
        );
        break;
      case 'spam':
        result = allMails.filter(
          (m) => m.folderId === folderByType.spam?.id && m.status !== 'trash'
        );
        break;
      case 'starred':
        result = allMails.filter(
          (m) => m.isStarred && m.status !== 'trash'
        );
        break;
      default:
        result = [];
    }

    // Filtre par recherche
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.from.name.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
      );
    }

    // Tri par date décroissante
    return result.sort((a, b) => {
      const da = a.sentAt || a.createdAt;
      const db = b.sentAt || b.createdAt;
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }, [allMails, currentFolder, searchTerm, folderByType]);

  // -- Mail sélectionné --
  const selectedMail = useMemo(
    () => filteredMails.find((m) => m.id === selectedMailId) ?? null,
    [filteredMails, selectedMailId]
  );

  // -- Nombre de non-lus (inbox) --
  const unreadCount = useMemo(
    () =>
      allMails.filter(
        (m) =>
          m.folderId === folderByType.inbox?.id &&
          !m.isDraft &&
          m.status === 'unread'
      ).length,
    [allMails, folderByType]
  );

  // -- Actions --

  const selectMail = useCallback(
    (id: string) => {
      setSelectedMailId(id);
      // Marquer comme lu
      setAllMails((prev) =>
        prev.map((m) =>
          m.id === id && m.status === 'unread' ? { ...m, status: 'read' as const, updatedAt: nowISO() } : m
        )
      );
    },
    []
  );

  const setFolder = useCallback((folder: string) => {
    setCurrentFolder(folder as MailboxFolder);
    setSelectedMailId(null);
  }, []);

  const setSearchTermCb = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const sendMail = useCallback(
    (draft: IDraftData) => {
      const sentFolder = folderByType.sent;
      const now = nowISO();
      const newMail: IMail = {
        id: generateId(),
        coproprieteId: 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
        folderId: sentFolder?.id ?? '',
        from: { name: 'Syndic — Résidence Haussmann', email: 'copro.haussmann@coproflex.fr' },
        to: draft.to,
        cc: draft.cc,
        subject: draft.subject,
        body: draft.body,
        bodyPreview: draft.body.slice(0, 100) + '...',
        status: 'read',
        isStarred: false,
        isDraft: false,
        hasAttachments: (draft.attachments?.length ?? 0) > 0,
        attachments: draft.attachments ?? [],
        labelIds: draft.labelIds ?? [],
        replyToId: draft.replyToId,
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      };
      setAllMails((prev) => [newMail, ...prev]);
      setIsComposeOpen(false);
      setReplyTo(null);
    },
    [folderByType]
  );

  const saveDraft = useCallback(
    (draft: IDraftData) => {
      const draftsFolder = folderByType.drafts;
      const now = nowISO();
      const newDraft: IMail = {
        id: generateId(),
        coproprieteId: 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
        folderId: draftsFolder?.id ?? '',
        from: { name: 'Syndic — Résidence Haussmann', email: 'copro.haussmann@coproflex.fr' },
        to: draft.to,
        cc: draft.cc,
        subject: draft.subject,
        body: draft.body,
        bodyPreview: draft.body.slice(0, 100) + '...',
        status: 'read',
        isStarred: false,
        isDraft: true,
        hasAttachments: (draft.attachments?.length ?? 0) > 0,
        attachments: draft.attachments ?? [],
        labelIds: draft.labelIds ?? [],
        replyToId: draft.replyToId,
        sentAt: null,
        createdAt: now,
        updatedAt: now,
      };
      setAllMails((prev) => [newDraft, ...prev]);
    },
    [folderByType]
  );

  const deleteMail = useCallback((id: string) => {
    setAllMails((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: 'trash' as const, updatedAt: nowISO() } : m
      )
    );
    setSelectedMailId((prev) => (prev === id ? null : prev));
  }, []);

  const archiveMail = useCallback((id: string) => {
    setAllMails((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: 'archived' as const, updatedAt: nowISO() } : m
      )
    );
    setSelectedMailId((prev) => (prev === id ? null : prev));
  }, []);

  const toggleStar = useCallback((id: string) => {
    setAllMails((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isStarred: !m.isStarred, updatedAt: nowISO() } : m
      )
    );
  }, []);

  const toggleRead = useCallback((id: string) => {
    setAllMails((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const newStatus = m.status === 'unread' ? 'read' as const : 'unread' as const;
        return { ...m, status: newStatus, updatedAt: nowISO() };
      })
    );
  }, []);

  const addLabel = useCallback((mailId: string, labelId: string) => {
    setAllMails((prev) =>
      prev.map((m) =>
        m.id === mailId && !m.labelIds.includes(labelId)
          ? { ...m, labelIds: [...m.labelIds, labelId], updatedAt: nowISO() }
          : m
      )
    );
  }, []);

  const removeLabel = useCallback((mailId: string, labelId: string) => {
    setAllMails((prev) =>
      prev.map((m) =>
        m.id === mailId
          ? { ...m, labelIds: m.labelIds.filter((l) => l !== labelId), updatedAt: nowISO() }
          : m
      )
    );
  }, []);

  const moveToFolder = useCallback((mailId: string, folderId: string) => {
    setAllMails((prev) =>
      prev.map((m) =>
        m.id === mailId ? { ...m, folderId, updatedAt: nowISO() } : m
      )
    );
  }, []);

  const createLabel = useCallback((name: string, color: string) => {
    const newLabel: IMailLabel = {
      id: `l${Date.now()}`,
      coproprieteId: 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
      name,
      color,
      sortOrder: labels.length,
    };
    setLabels((prev) => [...prev, newLabel]);
  }, [labels.length]);

  const createFolder = useCallback((name: string) => {
    const newFolder: IMailFolder = {
      id: `f${Date.now()}`,
      coproprieteId: 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
      userId: 'u1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
      name,
      folderType: 'inbox', // custom folders default type
      icon: 'Folder',
      isSystem: false,
      sortOrder: folders.length,
      unreadCount: 0,
    };
    setFolders((prev) => [...prev, newFolder]);
  }, [folders.length]);

  const openCompose = useCallback(() => {
    setIsComposeOpen(true);
    setReplyTo(null);
  }, []);

  const openReply = useCallback((mail: IMail) => {
    setIsComposeOpen(true);
    setReplyTo(mail);
  }, []);

  const closeCompose = useCallback(() => {
    setIsComposeOpen(false);
    setReplyTo(null);
  }, []);

  return {
    mails: filteredMails,
    selectedMail,
    currentFolder,
    labels,
    folders,
    searchTerm,
    isLoading: false,
    unreadCount,
    isComposeOpen,
    replyTo,
    selectMail,
    setFolder,
    setSearchTerm: setSearchTermCb,
    sendMail,
    saveDraft,
    deleteMail,
    archiveMail,
    toggleStar,
    toggleRead,
    addLabel,
    removeLabel,
    moveToFolder,
    createLabel,
    createFolder,
    openCompose,
    openReply,
    closeCompose,
  };
}
