'use client';

import { ArrowLeft, Send, User, Loader2, AlertCircle } from 'lucide-react';
import styles from './topic.module.css';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import { useForumDetailPage } from '@/features/communication/hooks';

export default function ForumTopicPage() {
  const params = useParams();
  const topicId = params.id as string;

  const {
    topic,
    messages,
    newMessage,
    setNewMessage,
    isLoading,
    isSending,
    error,
    messagesEndRef,
    getCategoryInfo,
    formatDate,
    sendMessage,
    goBack,
  } = useForumDetailPage(topicId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} aria-hidden="true" />
          <span>Chargement du sujet...</span>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="container">
        <div className={styles.errorState}>
          <AlertCircle size={24} aria-hidden="true" />
          <p>{error || 'Sujet non trouvé.'}</p>
          <button onClick={goBack} className="btn btn-secondary">
            Retour au forum
          </button>
        </div>
      </div>
    );
  }

  const catInfo = getCategoryInfo(topic.category);

  return (
    <div className="container">
      <button onClick={goBack} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Retour au forum
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>{topic.title}</h1>
        <div className={styles.meta}>
          <span
            className={styles.category}
            style={{ backgroundColor: catInfo.color }}
          >
            {catInfo.label}
          </span>
          <span className={styles.date}>
            Créé le {formatDate(topic.created_at)} par {topic.author_name || 'Anonyme'}
          </span>
        </div>
      </div>

      {/* Original topic content */}
      <div className={styles.topicContent}>
        <div className={styles.messageItem}>
          <div className={styles.messageAvatar}>
            <User size={20} aria-hidden="true" />
          </div>
          <div className={styles.messageContent}>
            <div className={styles.messageHeader}>
              <span className={styles.messageAuthor}>{topic.author_name || 'Anonyme'}</span>
              <span className={styles.messageDate}>{formatDate(topic.created_at)}</span>
            </div>
            <p className={styles.messageText}>{topic.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      {messages.length > 0 && (
        <div className={styles.repliesSection}>
          <h2 className={styles.repliesTitle}>
            {messages.length} réponse{messages.length !== 1 ? 's' : ''}
          </h2>
          <div className={styles.messagesList}>
            {messages.map((msg) => (
              <div key={msg.id} className={styles.messageItem}>
                <div className={styles.messageAvatar}>
                  <User size={20} aria-hidden="true" />
                </div>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageAuthor}>{msg.author_name || 'Anonyme'}</span>
                    <span className={styles.messageDate}>
                      {formatDate(msg.created_at)}
                      {msg.is_edited && <span className={styles.editedBadge}>(modifié)</span>}
                    </span>
                  </div>
                  <p className={styles.messageText}>{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Reply form */}
      <form className={styles.replyBox} onSubmit={handleSubmit}>
        <div className="card">
          <h3 className={styles.replyTitle}>Répondre</h3>
          <div className={styles.replyInputWrapper}>
            <textarea
              className={styles.replyInput}
              rows={3}
              placeholder="Votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? (
                <Loader2 size={16} className={styles.spinner} style={{ marginRight: 8 }} aria-hidden="true" />
              ) : (
                <Send size={16} style={{ marginRight: 8 }} aria-hidden="true" />
              )}
              Envoyer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
