'use client';

import { MessageCircle, Search, User, Plus, Loader2 } from 'lucide-react';
import styles from './messages.module.css';
import Link from 'next/link';
import clsx from 'clsx';
import { useConversationsPage } from '@/features/communication/hooks/useConversationsPage';

export default function MessagesPage() {
  const {
    conversations,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    totalUnread,
    getConversationDisplayName,
    formatDate,
    openConversation,
    createNewConversation,
  } = useConversationsPage();

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Messagerie privée
            {totalUnread > 0 && (
              <span className={styles.unreadBadge}>{totalUnread}</span>
            )}
          </h1>
          <p className={styles.subtitle}>
            Vos échanges directs avec les autres copropriétaires.
          </p>
        </div>
        <div className={styles.actions}>
          <button onClick={createNewConversation} className="btn btn-primary">
            <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Nouvelle conversation
          </button>
        </div>
      </div>

      <div className="card">
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              className={styles.searchInput}
              aria-label="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading && (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} aria-hidden="true" />
            <span>Chargement des conversations...</span>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className={styles.conversationList}>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv.id)}
                className={clsx(
                  styles.conversationItem,
                  conv.my_unread_count > 0 && styles.unread
                )}
              >
                <div className={styles.avatar}>
                  {conv.is_group ? (
                    <MessageCircle size={24} aria-hidden="true" />
                  ) : (
                    <User size={24} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.conversationContent}>
                  <div className={styles.conversationHeader}>
                    <span className={styles.participants}>
                      {getConversationDisplayName(conv)}
                    </span>
                    <span className={styles.date}>
                      {formatDate(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={styles.lastMessage}>
                    {conv.last_message_preview || 'Aucun message'}
                  </p>
                </div>
                {conv.my_unread_count > 0 && (
                  <div className={styles.unreadDot}>
                    {conv.my_unread_count > 9 ? '9+' : conv.my_unread_count}
                  </div>
                )}
              </button>
            ))}

            {conversations.length === 0 && (
              <div className={styles.emptyState}>
                <MessageCircle size={48} className={styles.emptyIcon} aria-hidden="true" />
                <p>Aucune conversation.</p>
                <button onClick={createNewConversation} className="btn btn-secondary">
                  Démarrer une conversation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
