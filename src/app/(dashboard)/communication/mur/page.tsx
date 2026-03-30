'use client';

import { useMur } from '@/features/communication/mur/hooks';
import { MurSidebar, PostFeed, PostEditor, PostComments } from '@/features/communication/mur/components';
import styles from './mur.module.css';

export default function MurCoproPage() {
  const mur = useMur();

  return (
    <div className={`${styles.page} ${mur.selectedPostId ? styles.pageWithComments : ''}`}>
      {/* Sidebar */}
      <div className={styles.sidebarArea}>
        <MurSidebar
          categoryFilter={mur.categoryFilter}
          onCategoryChange={mur.setCategoryFilter}
          postCounts={mur.postCounts}
        />
      </div>

      {/* Feed */}
      <div className={styles.feedArea}>
        <div className={styles.feedInner}>
          <PostFeed
            pinnedPosts={mur.pinnedPosts}
            posts={mur.posts}
            selectedPostId={mur.selectedPostId}
            searchTerm={mur.searchTerm}
            onSearchChange={mur.setSearchTerm}
            onSelectPost={mur.selectPost}
            onToggleLike={mur.toggleLike}
            onTogglePin={mur.togglePin}
            onOpenEditor={mur.openEditor}
          />
        </div>
      </div>

      {/* Comments panel — right column */}
      <div className={mur.selectedPostId ? styles.commentsArea : styles.commentsAreaHidden}>
        {mur.selectedPostId && (
          <PostComments
            comments={mur.comments}
            postId={mur.selectedPostId}
            onAddComment={mur.addComment}
          />
        )}
      </div>

      {/* Editor modal */}
      <PostEditor
        isOpen={mur.isEditorOpen}
        onClose={mur.closeEditor}
        onSubmit={mur.createPost}
      />
    </div>
  );
}
