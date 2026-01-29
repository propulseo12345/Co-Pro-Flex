'use client';

import { MessageSquare, Plus, Search, User, Loader2, Pin, AlertCircle } from 'lucide-react';
import styles from './forum.module.css';
import clsx from 'clsx';
import { useForumPage } from '@/features/communication/hooks';

export default function ForumPage() {
  const {
    topics,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    categories,
    getCategoryInfo,
    formatDate,
    openTopic,
    createNewTopic,
  } = useForumPage();

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Forum de discussion</h1>
          <p className={styles.subtitle}>
            Échangez avec vos voisins et le conseil syndical.
          </p>
        </div>
        <div className={styles.actions}>
          <button onClick={createNewTopic} className="btn btn-primary">
            <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Nouvelle discussion
          </button>
        </div>
      </div>

      <div className="card">
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher un sujet..."
              className={styles.searchInput}
              aria-label="Rechercher un sujet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.filters}>
            <button
              className={clsx(styles.filterBtn, selectedCategory === 'all' && styles.active)}
              onClick={() => setSelectedCategory('all')}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={clsx(styles.filterBtn, selectedCategory === cat.id && styles.active)}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  borderColor: selectedCategory === cat.id ? cat.color : undefined,
                  backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
                  color: selectedCategory === cat.id ? 'white' : undefined,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} aria-hidden="true" />
            <span>Chargement des discussions...</span>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <AlertCircle size={24} aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className={styles.topicList}>
            {topics.map((topic) => {
              const catInfo = getCategoryInfo(topic.category);
              return (
                <button
                  key={topic.id}
                  onClick={() => openTopic(topic.id)}
                  className={styles.topicItem}
                >
                  <div className={styles.topicMain}>
                    <div className={styles.topicIcon}>
                      {topic.is_pinned ? (
                        <Pin size={24} aria-hidden="true" />
                      ) : (
                        <MessageSquare size={24} aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <h3 className={styles.topicTitle}>
                        {topic.is_pinned && <span className={styles.pinnedBadge}>Épinglé</span>}
                        {topic.title}
                      </h3>
                      <div className={styles.topicMeta}>
                        <span className={styles.topicAuthor}>Par {topic.author_name || 'Anonyme'}</span>
                        <span className={styles.topicDate}>• {formatDate(topic.created_at)}</span>
                        <span
                          className={styles.topicCategory}
                          style={{ backgroundColor: catInfo.color }}
                        >
                          {catInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.topicStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{topic.replies_count}</span>
                      <span className={styles.statLabel}>réponse{topic.replies_count !== 1 ? 's' : ''}</span>
                    </div>
                    {topic.last_reply_at && (
                      <div className={styles.lastActivity}>
                        <div className={styles.lastActivityUser}>
                          <User size={12} aria-hidden="true" /> {topic.last_reply_by_name || 'Anonyme'}
                        </div>
                        <div className={styles.lastActivityDate}>
                          {formatDate(topic.last_reply_at)}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {topics.length === 0 && (
              <div className={styles.emptyState}>
                <MessageSquare size={48} className={styles.emptyIcon} aria-hidden="true" />
                <p>Aucune discussion pour le moment.</p>
                <button onClick={createNewTopic} className="btn btn-secondary">
                  Créer la première discussion
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
