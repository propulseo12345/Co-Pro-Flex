'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  FileText,
  Image,
  File,
  ClipboardList,
  User,
  CheckCheck,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

import type {
  IConversation,
  IMessage,
  IMessageAttachment,
} from '@/features/communication/messagerie/domain/types';
import { ROLE_COLORS } from '@/features/communication/messagerie/domain/constants';
import { getInitials } from '@/features/communication/shared/utils';
import styles from './ChatPanel.module.css';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getAttachmentIcon(type: IMessageAttachment['type']) {
  switch (type) {
    case 'pdf':
      return FileText;
    case 'image':
      return Image;
    default:
      return File;
  }
}

/** Group messages by date for date separators */
function groupByDate(messages: IMessage[]): { date: string; messages: IMessage[] }[] {
  const groups: { date: string; messages: IMessage[] }[] = [];
  let currentDate = '';

  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== currentDate) {
      currentDate = d;
      groups.push({ date: msg.createdAt, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }

  return groups;
}

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------

interface ChatPanelProps {
  conversation: IConversation | null;
  messages: IMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function ChatPanel({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!draft.trim()) return;
    onSendMessage(draft);
    setDraft('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [draft, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // -- Empty state --
  if (!conversation) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <MessageSquare size={48} className={styles.emptyIcon} aria-hidden="true" />
          <h3 className={styles.emptyTitle}>Selectionnez une conversation</h3>
          <p className={styles.emptySubtitle}>
            Choisissez une conversation dans la liste pour commencer
          </p>
        </div>
      </div>
    );
  }

  // -- Derive header info --
  const otherMember = conversation.members.find((m) => m.userId !== currentUserId);
  const title = conversation.title ?? otherMember?.userName ?? 'Conversation';
  const memberCount = conversation.members.length;
  const avatarColor =
    conversation.type === 'prestataire'
      ? ROLE_COLORS.prestataire
      : conversation.type === 'group'
        ? ROLE_COLORS.conseil
        : ROLE_COLORS.copro;

  const dateGroups = groupByDate(messages);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerAvatar} style={{ '--avatar-bg': avatarColor } as React.CSSProperties}>
            {getInitials(title)}
          </div>
          <div className={styles.headerInfo}>
            <h3 className={styles.headerName}>{title}</h3>
            <p className={styles.headerMeta}>
              {conversation.type === 'group'
                ? `${memberCount} membres`
                : otherMember?.userRole === 'prestataire'
                  ? 'Prestataire'
                  : 'Copropriétaire'}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {conversation.type === 'prestataire' && (
            <button className={styles.headerBtn} type="button">
              <ClipboardList size={14} aria-hidden="true" />
              Créer OS
            </button>
          )}
          {conversation.type === 'direct' && (
            <button className={styles.headerBtn} type="button">
              <User size={14} aria-hidden="true" />
              Fiche copro
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesArea}>
        {dateGroups.map((group) => (
          <div key={group.date}>
            <div className={styles.dateSeparator}>
              <span className={styles.dateLabel}>{formatDate(group.date)}</span>
            </div>

            {group.messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className={styles.systemMessage}>
                    {msg.content}
                  </div>
                );
              }

              const isMine = msg.senderId === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={clsx(
                    styles.messageRow,
                    isMine ? styles.messageRowMine : styles.messageRowOther,
                  )}
                >
                  {/* Avatar (others only) */}
                  {!isMine && (
                    <div
                      className={styles.messageAvatar}
                      style={{ '--avatar-bg': ROLE_COLORS[msg.senderRole] } as React.CSSProperties}
                    >
                      {getInitials(msg.senderName)}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={clsx(styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther)}>
                    {!isMine && (
                      <p className={styles.bubbleSender} style={{ '--sender-color': ROLE_COLORS[msg.senderRole] } as React.CSSProperties}>
                        {msg.senderName}
                      </p>
                    )}

                    <p className={styles.bubbleText}>{msg.content}</p>

                    {/* Attachments */}
                    {msg.attachments.length > 0 && (
                      <div className={styles.attachments}>
                        {msg.attachments.map((att) => {
                          const AttIcon = getAttachmentIcon(att.type);
                          return (
                            <div key={att.id} className={styles.attachment}>
                              <AttIcon size={14} className={styles.attachmentIcon} aria-hidden="true" />
                              <div className={styles.attachmentInfo}>
                                <span className={styles.attachmentName}>{att.name}</span>
                                <span className={styles.attachmentSize}>{att.size}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Footer */}
                    <div className={styles.bubbleFooter}>
                      <span className={styles.bubbleTime}>{formatTime(msg.createdAt)}</span>
                      {isMine && (
                        <span className={styles.readStatus}>
                          <CheckCheck size={12} aria-hidden="true" />
                        </span>
                      )}
                      {!isMine && (
                        <span className={styles.readStatus}>
                          <Check size={12} aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply area */}
      <div className={styles.replyArea}>
        <div className={styles.replyWrapper}>
          <div className={styles.replyTools}>
            <button className={styles.toolBtn} type="button" title="Pièce jointe">
              <Paperclip size={16} aria-hidden="true" />
            </button>
            <button className={styles.toolBtn} type="button" title="Emoji">
              <Smile size={16} aria-hidden="true" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            className={styles.replyInput}
            placeholder="Votre message..."
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
          />

          <button
            className={styles.sendBtn}
            type="button"
            onClick={handleSend}
            disabled={!draft.trim()}
            title="Envoyer"
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
