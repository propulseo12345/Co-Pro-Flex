'use client';

import Link from 'next/link';
import { MessageSquare, Plus, Search, Pin, AlertCircle, Lock, Clock, FileEdit, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useWallPage, WALL_CATEGORIES } from '@/features/communication/hooks';
import { PublicationCard } from '@/features/communication/components';
import styles from './mur.module.css';

const ICONS = { MessageSquare, AlertCircle, Lock, Clock, Pin };

export default function MurCoproPage() {
  const page = useWallPage();

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mur de la copropriété</h1>
          <p className={styles.subtitle}>Espace collaboratif pour partager informations, annonces et discussions</p>
        </div>
        <div className={styles.actions}>
          <Link href="/communication/mur/nouveau" className="btn btn-primary">
            <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Nouvelle publication
          </Link>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Catégories</h3>
          <div className={styles.categories}>
            {WALL_CATEGORIES.map((cat) => {
              const IconComponent = ICONS[cat.icon as keyof typeof ICONS] || MessageSquare;
              return (
                <button key={cat.id} className={clsx(styles.categoryBtn, page.selectedCategory === cat.id && styles.active)} onClick={() => page.setSelectedCategory(cat.id)}>
                  <IconComponent size={18} aria-hidden="true" />{cat.label}
                </button>
              );
            })}
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Tags populaires</h3>
            <div className={styles.tags}>
              <span className={styles.tagItem}>Travaux 2026</span>
              <span className={styles.tagItem}>Événement</span>
              <span className={styles.tagItem}>Sécurité</span>
              <span className={styles.tagItem}>Convivialité</span>
            </div>
          </div>

          {page.drafts.length > 0 && (
            <div className={styles.sidebarSection}>
              <button className={styles.draftsToggle} onClick={() => page.setShowDrafts(!page.showDrafts)}>
                <FileEdit size={16} aria-hidden="true" />
                <span>Mes brouillons ({page.drafts.length})</span>
              </button>
              {page.showDrafts && (
                <div className={styles.draftsList}>
                  {page.drafts.map(draft => (
                    <div key={draft.id} className={styles.draftItem}>
                      <Link href={`/communication/mur/nouveau?edit=${draft.id}`} className={styles.draftLink}>
                        <span className={styles.draftTitle}>{draft.title}</span>
                        <span className={styles.draftDate}>{new Date(draft.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                      </Link>
                      <button className={styles.draftDeleteBtn} onClick={() => page.handleDeleteDraft(draft.id)} title="Supprimer le brouillon">
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        <div className={styles.main}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input type="text" placeholder="Rechercher une publication..." className={styles.searchInput} value={page.searchQuery} onChange={(e) => page.setSearchQuery(e.target.value)} />
          </div>

          {page.pinnedPubs.length > 0 && (
            <div className={styles.pinnedSection}>
              <h2 className={styles.sectionTitle}><Pin size={18} aria-hidden="true" />Publications épinglées</h2>
              {page.pinnedPubs.map((pub) => (
                <PublicationCard key={pub.id} publication={pub} getCategoryColor={page.getCategoryColor} getRoleBadge={page.getRoleBadge} onDelete={page.handleDeletePublication} onLike={page.handleLikePublication} onTogglePin={page.handleTogglePin} />
              ))}
            </div>
          )}

          <div className={styles.publications}>
            {page.regularPubs.map((pub) => (
              <PublicationCard key={pub.id} publication={pub} getCategoryColor={page.getCategoryColor} getRoleBadge={page.getRoleBadge} onDelete={page.handleDeletePublication} onLike={page.handleLikePublication} onTogglePin={page.handleTogglePin} />
            ))}
          </div>

          {page.filteredPublications.length === 0 && (
            <div className={styles.emptyState}><AlertCircle size={48} aria-hidden="true" /><p>Aucune publication trouvée</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
