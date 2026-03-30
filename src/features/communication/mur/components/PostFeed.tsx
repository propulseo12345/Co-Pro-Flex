'use client';

import { Plus, Search, Pin, MessageSquare } from 'lucide-react';
import type { IWallPost } from '@/features/communication/mur/domain/types';
import { PostCard } from './PostCard';
import styles from './PostFeed.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface PostFeedProps {
  pinnedPosts: IWallPost[];
  posts: IWallPost[];
  selectedPostId: string | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectPost: (id: string) => void;
  onToggleLike: (id: string) => void;
  onTogglePin: (id: string) => void;
  onOpenEditor: () => void;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function PostFeed({
  pinnedPosts,
  posts,
  selectedPostId,
  searchTerm,
  onSearchChange,
  onSelectPost,
  onToggleLike,
  onTogglePin,
  onOpenEditor,
}: PostFeedProps) {
  const hasNoPosts = pinnedPosts.length === 0 && posts.length === 0;

  return (
    <div className={styles.feed}>
      {/* New post button */}
      <button className={styles.newPostBtn} onClick={onOpenEditor}>
        <Plus size={18} />
        Nouvelle publication
      </button>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Rechercher une publication..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Pinned posts */}
      {pinnedPosts.length > 0 && (
        <div className={styles.pinnedSection}>
          <h2 className={styles.sectionLabel}>
            <Pin size={14} />
            Publications epinglees
          </h2>
          <div className={styles.postsList}>
            {pinnedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isSelected={selectedPostId === post.id}
                onSelect={onSelectPost}
                onToggleLike={onToggleLike}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular posts */}
      {posts.length > 0 && (
        <div className={styles.postsList}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isSelected={selectedPostId === post.id}
              onSelect={onSelectPost}
              onToggleLike={onToggleLike}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {hasNoPosts && (
        <div className={styles.emptyState}>
          <MessageSquare size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>Aucune publication trouvee</p>
        </div>
      )}
    </div>
  );
}
