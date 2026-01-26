'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Clock, Tag, Pin, Lock, ThumbsUp, MessageCircle, Share2, MoreVertical, Send, Paperclip, Download, FileText, Image as ImageIcon, Edit, Trash2, Heart, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useWallDetailPage } from '@/features/communication/hooks';
import styles from './publication.module.css';

export default function PublicationPage() {
  const params = useParams();
  const page = useWallDetailPage({ publicationId: params.id as string });

  const getFileIcon = (type: 'pdf' | 'image' | 'document') => {
    switch (type) {
      case 'pdf': return <FileText size={18} aria-hidden="true" />;
      case 'image': return <ImageIcon size={18} />;
      default: return <FileText size={18} aria-hidden="true" />;
    }
  };

  if (page.loading) {
    return <div className="container"><div className={styles.notFound}><p>Chargement...</p></div></div>;
  }

  if (!page.publication) {
    return (
      <div className="container">
        <div className={styles.notFound}>
          <AlertCircle size={64} aria-hidden="true" />
          <h2>Publication non trouvée</h2>
          <p>Cette publication n'existe pas ou a été supprimée.</p>
          <Link href="/communication/mur" className="btn btn-primary">Retour au mur</Link>
        </div>
      </div>
    );
  }

  const roleBadge = page.getRoleBadge(page.publication.authorRole);
  const categoryColor = page.getCategoryColor(page.publication.category);

  return (
    <div className="container">
      <div className={styles.header}>
        <Link href="/communication/mur" className={styles.backButton}><ArrowLeft size={20} aria-hidden="true" /><span>Retour au mur</span></Link>
      </div>

      <article className={styles.article}>
        <div className={styles.articleHeader}>
          <div className={styles.authorSection}>
            <div className={styles.avatar}><User size={28} aria-hidden="true" /></div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>{page.publication.author}<span className={styles.roleBadge} style={{ background: `${roleBadge.color}20`, color: roleBadge.color }}>{roleBadge.label}</span></div>
              <div className={styles.meta}><Clock size={14} aria-hidden="true" /><span>{page.formatDate(page.publication.date)}</span><span className={styles.categoryBadge} style={{ background: `${categoryColor}20`, color: categoryColor }}><Tag size={12} aria-hidden="true" />{page.getCategoryLabel(page.publication.category)}</span></div>
            </div>
          </div>
          <div className={styles.headerActions}>
            {page.publication.isPinned && <span className={styles.pinnedBadge}><Pin size={14} aria-hidden="true" />Épinglé</span>}
            {page.publication.isLocked && <span className={styles.lockedBadge}><Lock size={14} aria-hidden="true" />Verrouillé</span>}
            <div className={styles.moreActions}>
              <button className={styles.actionBtn} onClick={() => page.setShowActions(!page.showActions)}><MoreVertical size={20} aria-hidden="true" /></button>
              {page.showActions && (
                <div className={styles.actionsDropdown}>
                  <button onClick={page.handleEditPublication}><Edit size={16} aria-hidden="true" />Modifier le message</button>
                  <button onClick={page.handleDeletePublication} className={styles.deleteBtn}><Trash2 size={16} aria-hidden="true" />Supprimer le message</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <h1 className={styles.title}>{page.publication.title}</h1>

        {page.publication.tags.length > 0 && (
          <div className={styles.tags}>{page.publication.tags.map(tag => (<span key={tag} className={styles.tag}>#{tag}</span>))}</div>
        )}

        <div className={styles.content}>{page.publication.content.split('\n').map((paragraph, index) => (<p key={index}>{paragraph || <br />}</p>))}</div>

        {page.publication.attachments.length > 0 && (
          <div className={styles.attachments}>
            <h3 className={styles.attachmentsTitle}><Paperclip size={18} aria-hidden="true" />Pièces jointes ({page.publication.attachments.length})</h3>
            <div className={styles.attachmentsList}>
              {page.publication.attachments.map(attachment => (
                <a key={attachment.id} href={attachment.url} className={styles.attachmentItem} download>
                  <div className={styles.attachmentIcon}>{getFileIcon(attachment.type)}</div>
                  <div className={styles.attachmentInfo}><span className={styles.attachmentName}>{attachment.name}</span><span className={styles.attachmentSize}>{attachment.size}</span></div>
                  <Download size={18} className={styles.downloadIcon} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className={styles.interactions}>
          <button className={clsx(styles.interactionBtn, page.isLiked && styles.liked)} onClick={page.handleLike}>
            {page.isLiked ? <Heart size={20} fill="currentColor" aria-hidden="true" /> : <ThumbsUp size={20} aria-hidden="true" />}
            <span>{page.likesCount} J'aime</span>
          </button>
          <button className={styles.interactionBtn}><MessageCircle size={20} aria-hidden="true" /><span>{page.comments.length} Commentaires</span></button>
          <div className={styles.shareWrapper}>
            <button className={styles.interactionBtn} onClick={() => page.setShowShareMenu(!page.showShareMenu)}><Share2 size={20} /><span>Partager</span></button>
            {page.showShareMenu && (
              <div className={styles.shareDropdown}>
                <button onClick={() => page.handleShare('copy')}>Copier le lien</button>
                <button onClick={() => page.handleShare('email')}>Envoyer par email</button>
              </div>
            )}
          </div>
        </div>
      </article>

      <section className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}><MessageCircle size={22} aria-hidden="true" />Commentaires ({page.comments.length})</h2>

        {!page.publication.isLocked ? (
          <div className={styles.newComment}>
            <div className={styles.commentAvatar}><User size={20} aria-hidden="true" /></div>
            <div className={styles.commentForm}>
              <textarea placeholder="Écrire un commentaire..." value={page.newComment} onChange={(e) => page.setNewComment(e.target.value)} rows={3} />
              <div className={styles.commentFormActions}>
                <button className="btn btn-primary" onClick={page.handleCommentSubmit} disabled={page.isSubmitting || !page.newComment.trim()}>
                  {page.isSubmitting ? (<><span className={styles.spinner}></span>Envoi...</>) : (<><Send size={16} aria-hidden="true" />Commenter</>)}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.lockedComments}><Lock size={20} aria-hidden="true" /><span>Les commentaires sont verrouillés pour cette publication</span></div>
        )}

        <div className={styles.commentsList}>
          {page.comments.map(comment => {
            const commentRoleBadge = page.getRoleBadge(comment.authorRole);
            return (
              <div key={comment.id} className={styles.comment}>
                <div className={styles.commentAvatar}><User size={18} aria-hidden="true" /></div>
                <div className={styles.commentContent}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentAuthor}>{comment.author}<span className={styles.commentRoleBadge} style={{ background: `${commentRoleBadge.color}20`, color: commentRoleBadge.color }}>{commentRoleBadge.label}</span></span>
                    <span className={styles.commentDate}>{page.formatDate(comment.date)}</span>
                  </div>
                  <p className={styles.commentText}>{comment.content}</p>
                  <div className={styles.commentActions}>
                    <button className={clsx(styles.commentLikeBtn, comment.isLiked && styles.liked)} onClick={() => page.handleLikeComment(comment.id)}><ThumbsUp size={14} aria-hidden="true" />{comment.likes}</button>
                    <button className={styles.commentReplyBtn} onClick={() => page.handleReply(comment.id)}>Répondre</button>
                  </div>
                  {page.replyingTo === comment.id && (
                    <div className={styles.replyForm}>
                      <input type="text" placeholder={`Répondre à ${comment.author}...`} value={page.replyContent} onChange={(e) => page.setReplyContent(e.target.value)} className={styles.replyInput} />
                      <div className={styles.replyActions}>
                        <button className="btn btn-secondary btn-sm" onClick={() => page.handleReply(comment.id)}>Annuler</button>
                        <button className="btn btn-primary btn-sm" onClick={() => page.handleSubmitReply(comment.id)} disabled={page.isSubmitting || !page.replyContent.trim()}>Répondre</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
