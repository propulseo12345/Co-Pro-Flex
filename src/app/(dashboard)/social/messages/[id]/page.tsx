'use client';

import { ArrowLeft, Send, User, Loader2, Users } from 'lucide-react';
import styles from './conversation.module.css';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import { useConversationDetailPage } from '@/features/communication/hooks/useConversationDetailPage';

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;

  const {
    conversation,
    messages,
    newMessage,
    setNewMessage,
    isLoading,
    isSending,
    error,
    messagesEndRef,
    getConversationDisplayName,
    formatMessageDate,
    sendMessage,
    goBack,
  } = useConversationDetailPage(conversationId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} aria-hidden="true" />
          <span>Chargement de la conversation...</span>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="container">
        <div className={styles.errorState}>
          <p>{error || 'Conversation non trouvée.'}</p>
          <button onClick={goBack} className="btn btn-secondary">
            Retour aux messages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <button onClick={goBack} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Retour aux messages
      </button>

      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.avatar}>
            {conversation.is_group ? (
              <Users size={24} aria-hidden="true" />
            ) : (
              <User size={24} aria-hidden="true" />
            )}
          </div>
          <div>
            <h1 className={styles.title}>{getConversationDisplayName()}</h1>
            {conversation.other_members && (
              <p className={styles.participantsCount}>
                {conversation.other_members.length + 1} participant
                {conversation.other_members.length > 0 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.messagesList}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Aucun message. Commencez la conversation !</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                styles.messageItem,
                msg.is_mine && styles.myMessage
              )}
            >
              {!msg.is_mine && (
                <div className={styles.messageAvatar}>
                  <User size={16} aria-hidden="true" />
                </div>
              )}
              <div className={styles.messageContent}>
                {!msg.is_mine && (
                  <span className={styles.messageAuthor}>
                    {msg.author_name || 'Utilisateur'}
                  </span>
                )}
                <p className={styles.messageText}>{msg.content || ''}</p>
                <span className={styles.messageDate}>
                  {msg.created_at ? formatMessageDate(msg.created_at) : ''}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.replyBox} onSubmit={handleSubmit}>
        <div className={styles.replyInputWrapper}>
          <input
            type="text"
            className={styles.replyInput}
            placeholder="Votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <button
            type="submit"
            className="btn btn-primary"
            aria-label="Envoyer"
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
            ) : (
              <Send size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
