'use client';

import Link from 'next/link';
import { ArrowLeft, Send, Paperclip, X, FileText, Image, Tag, Pin, Lock, MessageSquare, AlertCircle, Clock, Users, Sparkles, Eye, Building, Save } from 'lucide-react';
import clsx from 'clsx';
import { useWallEditorPage, WALL_EDITOR_CATEGORIES, POPULAR_TAGS, VISIBILITY_OPTIONS, ETAGES_BATIMENTS } from '@/features/communication/hooks';
import styles from './nouveau-publication.module.css';

const ICONS = { MessageSquare, AlertCircle, Users, Lock, Clock, Building };

export default function NouvellePublicationPage() {
  const page = useWallEditorPage();

  const getFileIcon = (type: 'pdf' | 'image' | 'document') => {
    switch (type) {
      case 'pdf': return <FileText size={16} aria-hidden="true" />;
      case 'image': return <Image size={16} aria-hidden="true" />;
      default: return <FileText size={16} aria-hidden="true" />;
    }
  };

  if (page.isLoading) {
    return (
      <div className="container">
        <div className={styles.header}>
          <Link href="/communication/mur" className={styles.backButton}><ArrowLeft size={20} aria-hidden="true" /><span>Retour</span></Link>
          <div><h1 className={styles.title}>Chargement...</h1><p className={styles.subtitle}>Récupération de la publication</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <Link href="/communication/mur" className={styles.backButton}><ArrowLeft size={20} aria-hidden="true" /><span>Retour</span></Link>
        <div>
          <h1 className={styles.title}>{page.isEditMode ? 'Modifier la publication' : 'Nouvelle publication'}</h1>
          <p className={styles.subtitle}>{page.isEditMode ? 'Modifiez le contenu de votre publication' : 'Partagez une information avec la copropriété'}</p>
        </div>
      </div>

      <div className={styles.formContainer}>
        {page.error && (<div className={styles.error}><AlertCircle size={18} aria-hidden="true" /><span>{page.error}</span><button onClick={() => page.setError(null)}><X size={16} aria-hidden="true" /></button></div>)}

        <div className={styles.section}>
          <label className={styles.label}><Tag size={18} aria-hidden="true" />Catégorie</label>
          <div className={styles.categoryGrid}>
            {WALL_EDITOR_CATEGORIES.map((cat) => {
              const IconComponent = ICONS[cat.icon as keyof typeof ICONS] || MessageSquare;
              return (
                <button key={cat.id} type="button" className={clsx(styles.categoryBtn, page.category === cat.id && styles.active)} style={{ '--category-color': cat.color } as React.CSSProperties} onClick={() => page.setCategory(cat.id)}>
                  <IconComponent size={20} aria-hidden="true" /><span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label} htmlFor="title">Titre de la publication</label>
          <input id="title" type="text" className={styles.input} placeholder="Ex: Information importante concernant..." value={page.title} onChange={(e) => page.setTitle(e.target.value)} />
        </div>

        <div className={styles.section}>
          <label className={styles.label} htmlFor="content">Contenu</label>
          <textarea id="content" className={styles.textarea} placeholder="Rédigez votre publication..." rows={12} value={page.content} onChange={(e) => page.setContent(e.target.value)} />
        </div>

        <div className={styles.section}>
          <label className={styles.label}><Sparkles size={18} aria-hidden="true" />Tags (optionnel)</label>
          <div className={styles.tagsContainer}>
            <div className={styles.popularTags}>
              <span className={styles.tagLabel}>Tags populaires :</span>
              {POPULAR_TAGS.map(tag => (
                <button key={tag} type="button" className={clsx(styles.tagBtn, page.tags.includes(tag) && styles.selected)} onClick={() => page.handleTagToggle(tag)}>#{tag}</button>
              ))}
            </div>
            <div className={styles.customTagInput}>
              <input type="text" placeholder="Ajouter un tag personnalisé..." value={page.customTag} onChange={(e) => page.setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), page.handleAddCustomTag())} />
              <button type="button" onClick={page.handleAddCustomTag}>Ajouter</button>
            </div>
            {page.tags.length > 0 && (
              <div className={styles.selectedTags}>
                <span className={styles.tagLabel}>Tags sélectionnés :</span>
                {page.tags.map(tag => (
                  <span key={tag} className={styles.selectedTag}>#{tag}<button type="button" onClick={() => page.handleRemoveTag(tag)}><X size={14} aria-hidden="true" /></button></span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Options</label>
          <div className={styles.optionsGrid}>
            <label className={styles.optionCheckbox}>
              <input type="checkbox" checked={page.isPinned} onChange={(e) => page.setIsPinned(e.target.checked)} />
              <Pin size={18} className={styles.optionIcon} aria-hidden="true" />
              <div><span className={styles.optionTitle}>Épingler la publication</span><span className={styles.optionDesc}>La publication restera en haut du mur</span></div>
            </label>
            <label className={styles.optionCheckbox}>
              <input type="checkbox" checked={page.isLocked} onChange={(e) => page.setIsLocked(e.target.checked)} />
              <Lock size={18} className={styles.optionIcon} aria-hidden="true" />
              <div><span className={styles.optionTitle}>Verrouiller les commentaires</span><span className={styles.optionDesc}>Empêche les réponses à cette publication</span></div>
            </label>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}><Eye size={18} aria-hidden="true" />Visibilité</label>
          <div className={styles.visibilityOptions}>
            {VISIBILITY_OPTIONS.map((option) => {
              const IconComponent = ICONS[option.icon as keyof typeof ICONS] || Users;
              return (
                <button key={option.id} type="button" className={clsx(styles.visibilityBtn, page.visibility === option.id && styles.active)} onClick={() => page.setVisibility(option.id as 'tous' | 'conseil' | 'etage')}>
                  <IconComponent size={20} aria-hidden="true" />
                  <div className={styles.visibilityBtnContent}><span className={styles.visibilityBtnTitle}>{option.label}</span><span className={styles.visibilityBtnDesc}>{option.description}</span></div>
                </button>
              );
            })}
          </div>
          {page.visibility === 'etage' && (
            <div className={styles.groupSelection}>
              <span className={styles.groupLabel}>Sélectionnez les groupes :</span>
              <div className={styles.groupGrid}>
                {ETAGES_BATIMENTS.map((group) => (
                  <label key={group.id} className={styles.groupCheckbox}>
                    <input type="checkbox" checked={page.selectedGroups.includes(group.id)} onChange={() => page.handleGroupToggle(group.id)} /><span>{group.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <label className={styles.label}><Paperclip size={18} aria-hidden="true" />Pièces jointes</label>
          <div className={styles.attachmentsArea}>
            <input ref={page.fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif" onChange={page.handleFileSelect} className={styles.fileInput} id="file-upload" />
            <label htmlFor="file-upload" className={styles.uploadButton}><Paperclip size={20} aria-hidden="true" /><span>Ajouter des fichiers</span><span className={styles.fileHint}>PDF, images, documents (max 10 MB)</span></label>
            {page.attachments.length > 0 && (
              <div className={styles.attachmentsList}>
                {page.attachments.map(attachment => (
                  <div key={attachment.id} className={styles.attachmentItem}>
                    <div className={styles.attachmentIcon}>{getFileIcon(attachment.type)}</div>
                    <div className={styles.attachmentInfo}><span className={styles.attachmentName}>{attachment.name}</span><span className={styles.attachmentSize}>{attachment.size}</span></div>
                    <button type="button" className={styles.removeAttachment} onClick={() => page.removeAttachment(attachment.id)}><X size={16} aria-hidden="true" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(page.title || page.content) && (
          <div className={styles.preview}>
            <h3 className={styles.previewTitle}>Aperçu</h3>
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <div className={styles.previewAvatar}>JD</div>
                <div className={styles.previewAuthor}><span className={styles.previewName}>Jean DUPONT</span><span className={styles.previewRole}>Président CS</span></div>
                {page.selectedCategory && <span className={styles.previewCategory} style={{ background: `${page.selectedCategory.color}20`, color: page.selectedCategory.color }}>{page.selectedCategory.label}</span>}
              </div>
              <h4 className={styles.previewPubTitle}>{page.title || 'Titre de la publication'}</h4>
              <p className={styles.previewContent}>{page.content || 'Contenu de la publication...'}</p>
              {page.tags.length > 0 && (<div className={styles.previewTags}>{page.tags.map(tag => (<span key={tag} className={styles.previewTag}>#{tag}</span>))}</div>)}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Link href="/communication/mur" className={styles.cancelButton}>Annuler</Link>
          <button type="button" className={styles.draftButton} onClick={page.handleSaveDraft} disabled={page.isSavingDraft || page.isPublishing}>
            {page.isSavingDraft ? (<><span className={styles.spinner}></span>Sauvegarde...</>) : (<><Save size={18} aria-hidden="true" />Brouillon</>)}
          </button>
          <button type="button" className={styles.publishButton} onClick={page.handlePublish} disabled={page.isPublishing || page.isSavingDraft}>
            {page.isPublishing ? (<><span className={styles.spinner}></span>{page.isEditMode ? 'Mise à jour...' : 'Publication en cours...'}</>) : (<><Send size={18} aria-hidden="true" />{page.isEditMode ? 'Mettre à jour' : 'Publier'}</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
