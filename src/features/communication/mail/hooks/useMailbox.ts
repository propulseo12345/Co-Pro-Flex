'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { useSupabase } from '@/hooks/useSupabase';
import type { IMail, IMailFolder, IMailLabel, IDraftData } from '@/features/communication/mail/domain/types';
import { DEFAULT_FOLDERS, DEFAULT_LABELS } from '@/features/communication/mail/domain/constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// La boîte mail est PARTAGÉE par copro (la RLS `mails` gate sur user_is_copro_manager(copro_id),
// pas sur owner_id) : on filtre par copro, et owner_id = utilisateur de session (provenance).
const SYNDIC_EMAIL = 'copro.haussmann@coproflex.fr';
const SYNDIC_NAME = 'Syndic — Résidence Haussmann';

// ----------------------------------------------------------------------------
// Types du hook
// ----------------------------------------------------------------------------

export type MailboxFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam' | 'starred';

export interface UseMailboxReturn {
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
  selectMail: (id: string) => void;
  setFolder: (folder: string) => void;
  setSearchTerm: (term: string) => void;
  sendMail: (draft: IDraftData) => Promise<void>;
  saveDraft: (draft: IDraftData) => Promise<void>;
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
// Mapper ligne DB → IMail
// ----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): IMail {
  return {
    id: row.id,
    coproprieteId: row.copro_id,
    folderId: row.status === 'sent' ? 'sent' : row.status === 'draft' ? 'drafts' : 'inbox',
    from: { name: row.from_name, email: row.from_email },
    to: row.to_emails ?? [],
    cc: row.cc_emails ?? [],
    subject: row.subject,
    body: row.body,
    bodyPreview: (row.body as string).slice(0, 120),
    status: row.status,
    isRead: row.is_read,
    isArchived: row.is_archived,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at ?? null,
    isStarred: row.is_starred,
    hasAttachments: Array.isArray(row.attachments) && row.attachments.length > 0,
    attachments: row.attachments ?? [],
    labelIds: row.label_ids ?? [],
    replyToId: row.in_reply_to ?? undefined,
    threadId: row.thread_id ?? undefined,
    sentAt: row.sent_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useMailbox(): UseMailboxReturn {
  const { currentCoproId } = useCopro();
  const { user } = useSupabase();
  const currentUserId = user?.id ?? null;
  const supabase = useMemo(() => createUntypedClient(), []);

  const [allMails, setAllMails] = useState<IMail[]>([]);
  const [folders, setFolders] = useState<IMailFolder[]>(DEFAULT_FOLDERS);
  const [labels, setLabels] = useState<IMailLabel[]>(DEFAULT_LABELS);
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<MailboxFolder>('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<IMail | null>(null);

  // Ref pour éviter les boucles infinies
  const fetchRef = useRef<(() => Promise<void>) | null>(null);

  // ── Chargement initial ──────────────────────────────────────────────────────

  const fetchMails = useCallback(async () => {
    if (!currentCoproId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mails')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllMails(data.map(mapRow));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, supabase]);

  fetchRef.current = fetchMails;

  useEffect(() => {
    fetchRef.current?.();
  }, [currentCoproId]);

  // ── Realtime : nouveaux emails reçus ───────────────────────────────────────

  useEffect(() => {
    if (!currentCoproId) return;

    const channel = supabase
      .channel('mails-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mails',
          filter: `copro_id=eq.${currentCoproId}`,
        },
        (payload: { new: unknown }) => {
          setAllMails((prev) => [mapRow(payload.new), ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCoproId, supabase]);

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const filteredMails = useMemo(() => {
    let result: IMail[];

    switch (currentFolder) {
      case 'inbox':
        result = allMails.filter((m) => m.status === 'received' && !m.isArchived && !m.isDeleted);
        break;
      case 'sent':
        result = allMails.filter((m) => m.status === 'sent' && !m.isDeleted);
        break;
      case 'drafts':
        result = allMails.filter((m) => m.status === 'draft' && !m.isDeleted);
        break;
      case 'archive':
        result = allMails.filter((m) => m.isArchived && !m.isDeleted);
        break;
      case 'trash':
        result = allMails.filter((m) => m.isDeleted);
        break;
      case 'starred':
        result = allMails.filter((m) => m.isStarred && !m.isDeleted);
        break;
      default:
        result = allMails.filter((m) => !m.isDeleted);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.from.name.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      const da = a.sentAt || a.createdAt;
      const db = b.sentAt || b.createdAt;
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }, [allMails, currentFolder, searchTerm]);

  const selectedMail = useMemo(
    () => filteredMails.find((m) => m.id === selectedMailId) ?? null,
    [filteredMails, selectedMailId]
  );

  const unreadCount = useMemo(
    () => allMails.filter((m) => m.status === 'received' && !m.isRead && !m.isArchived && !m.isDeleted).length,
    [allMails]
  );

  // ── Mutations ───────────────────────────────────────────────────────────────

  const selectMail = useCallback(async (id: string) => {
    setSelectedMailId(id);
    setAllMails((prev) => prev.map((m) => (m.id === id && !m.isRead ? { ...m, isRead: true } : m)));
    await supabase.from('mails').update({ is_read: true }).eq('id', id);
  }, [supabase]);

  const setFolder = useCallback((folder: string) => {
    setCurrentFolder(folder as MailboxFolder);
    setSelectedMailId(null);
  }, []);

  const setSearchTermCb = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const sendMail = useCallback(async (draft: IDraftData) => {
    if (!currentCoproId) return;

    const res = await fetch('/api/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: draft.to,
        cc: draft.cc,
        subject: draft.subject,
        body: draft.body,
        coproId: currentCoproId,
        replyToId: draft.replyToId,
      }),
    });

    if (res.ok) {
      const { id } = await res.json();
      // Recharger le mail envoyé depuis la DB pour avoir les données exactes
      const { data } = await supabase.from('mails').select('*').eq('id', id).single();
      if (data) {
        setAllMails((prev) => [mapRow(data), ...prev]);
      }
    }

    setIsComposeOpen(false);
    setReplyTo(null);
  }, [currentCoproId, supabase]);

  const saveDraft = useCallback(async (draft: IDraftData) => {
    if (!currentCoproId || !currentUserId) return;

    const now = new Date().toISOString();
    const { data } = await supabase
      .from('mails')
      .insert({
        copro_id: currentCoproId,
        owner_id: currentUserId,
        from_email: SYNDIC_EMAIL,
        from_name: SYNDIC_NAME,
        to_emails: draft.to,
        cc_emails: draft.cc ?? [],
        subject: draft.subject,
        body: draft.body,
        body_html: null,
        attachments: null,
        status: 'draft',
        is_read: true,
        is_starred: false,
        is_archived: false,
        is_deleted: false,
        label_ids: null,
        in_reply_to: draft.replyToId ?? null,
        thread_id: null,
        resend_id: null,
        sent_at: null,
        received_at: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (data) {
      setAllMails((prev) => [mapRow(data), ...prev]);
    }
  }, [currentCoproId, currentUserId, supabase]);

  const deleteMail = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setAllMails((prev) => prev.map((m) => (m.id === id ? { ...m, isDeleted: true, deletedAt: now } : m)));
    setSelectedMailId((prev) => (prev === id ? null : prev));
    await supabase.from('mails').update({ is_deleted: true, deleted_at: now }).eq('id', id);
  }, [supabase]);

  const archiveMail = useCallback(async (id: string) => {
    setAllMails((prev) => prev.map((m) => (m.id === id ? { ...m, isArchived: true } : m)));
    setSelectedMailId((prev) => (prev === id ? null : prev));
    await supabase.from('mails').update({ is_archived: true }).eq('id', id);
  }, [supabase]);

  const toggleStar = useCallback(async (id: string) => {
    const mail = allMails.find((m) => m.id === id);
    if (!mail) return;
    const newVal = !mail.isStarred;
    setAllMails((prev) => prev.map((m) => (m.id === id ? { ...m, isStarred: newVal } : m)));
    await supabase.from('mails').update({ is_starred: newVal }).eq('id', id);
  }, [allMails, supabase]);

  const toggleRead = useCallback(async (id: string) => {
    const mail = allMails.find((m) => m.id === id);
    if (!mail) return;
    const newVal = !mail.isRead;
    setAllMails((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: newVal } : m)));
    await supabase.from('mails').update({ is_read: newVal }).eq('id', id);
  }, [allMails, supabase]);

  const addLabel = useCallback((mailId: string, labelId: string) => {
    setAllMails((prev) =>
      prev.map((m) =>
        m.id === mailId && !m.labelIds.includes(labelId)
          ? { ...m, labelIds: [...m.labelIds, labelId] }
          : m
      )
    );
  }, []);

  const removeLabel = useCallback((mailId: string, labelId: string) => {
    setAllMails((prev) =>
      prev.map((m) =>
        m.id === mailId ? { ...m, labelIds: m.labelIds.filter((l) => l !== labelId) } : m
      )
    );
  }, []);

  const moveToFolder = useCallback((mailId: string, folderId: string) => {
    setAllMails((prev) =>
      prev.map((m) => (m.id === mailId ? { ...m, folderId } : m))
    );
  }, []);

  const createLabel = useCallback((name: string, color: string) => {
    const newLabel: IMailLabel = {
      id: `l${Date.now()}`,
      coproprieteId: currentCoproId ?? '',
      name,
      color,
      sortOrder: labels.length,
    };
    setLabels((prev) => [...prev, newLabel]);
  }, [currentCoproId, labels.length]);

  const createFolder = useCallback((name: string) => {
    const newFolder: IMailFolder = {
      id: `f${Date.now()}`,
      coproprieteId: currentCoproId ?? '',
      userId: currentUserId ?? '',
      name,
      folderType: null,
      icon: 'Folder',
      isSystem: false,
      sortOrder: folders.length,
      unreadCount: 0,
    };
    setFolders((prev) => [...prev, newFolder]);
  }, [currentCoproId, currentUserId, folders.length]);

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
    isLoading,
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
