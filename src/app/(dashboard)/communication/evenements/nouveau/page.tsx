'use client';

import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Send, AlertCircle, X, FileText, Paperclip, Bell, User, Save, Download, Check, Search, Image, File } from 'lucide-react';
import clsx from 'clsx';
import { useEventEditorPage, CATEGORIES, ORGANISATEURS, COPROPRIETAIRES } from '@/features/communication/hooks';
import styles from './nouveau-evenement.module.css';

export default function NouvelEvenementPage() {
  const page = useEventEditorPage();

  const getFileIcon = (type: 'pdf' | 'image' | 'document') => {
    switch (type) {
      case 'pdf': return <FileText size={16} aria-hidden="true" />;
      case 'image': return <Image size={16} aria-hidden="true" />;
      default: return <File size={16} aria-hidden="true" />;
    }
  };

  if (page.isLoading) {
    return (
      <div className="container">
        <div className={styles.header}>
          <Link href="/communication/evenements" className={styles.backButton}><ArrowLeft size={20} aria-hidden="true" /><span>Retour</span></Link>
          <div className={styles.headerContent}><div><h1 className={styles.title}>Chargement...</h1><p className={styles.subtitle}>Récupération de l'événement</p></div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <Link href={page.isEditMode ? `/communication/evenements/${page.editId}` : "/communication/evenements"} className={styles.backButton}><ArrowLeft size={20} aria-hidden="true" /><span>Retour</span></Link>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>{page.isEditMode ? 'Modifier l\'événement' : 'Créer un événement'}</h1>
            <p className={styles.subtitle}>{page.isEditMode ? 'Modifiez les informations de l\'événement' : 'Planifiez un événement pour la copropriété'}</p>
          </div>
          <button className={styles.exportBtn} onClick={page.handleExportICS} type="button"><Download size={16} aria-hidden="true" />Exporter ICS</button>
        </div>
      </div>

      <div className={styles.formContainer}>
        {page.error && (<div className={styles.error}><AlertCircle size={18} aria-hidden="true" /><span>{page.error}</span><button onClick={() => page.setError(null)}><X size={16} aria-hidden="true" /></button></div>)}

        <div className={styles.formGrid}>
          <div className={styles.mainColumn}>
            <div className={styles.section}>
              <label className={styles.label} htmlFor="title">Titre de l'événement *</label>
              <input id="title" type="text" className={styles.input} placeholder="Ex: Assemblée Générale Ordinaire 2025" value={page.title} onChange={(e) => page.setTitle(e.target.value)} />
            </div>

            <div className={styles.section}>
              <label className={styles.label}><Calendar size={18} aria-hidden="true" />Type d'événement</label>
              <div className={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <button key={cat.id} type="button" className={clsx(styles.categoryBtn, page.category === cat.id && styles.active)} style={{ '--category-color': cat.color } as React.CSSProperties} onClick={() => page.setCategory(cat.id)}>{cat.label}</button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <label className={styles.label}><Clock size={18} aria-hidden="true" />Date et heure *</label>
              <div className={styles.dateTimeGrid}>
                <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Date de début</label><input type="date" className={styles.input} value={page.date} onChange={(e) => page.setDate(e.target.value)} /></div>
                <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Heure de début</label><input type="time" className={styles.input} value={page.time} onChange={(e) => page.setTime(e.target.value)} /></div>
                <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Date de fin (optionnel)</label><input type="date" className={styles.input} value={page.endDate} onChange={(e) => page.setEndDate(e.target.value)} /></div>
                <div className={styles.fieldGroup}><label className={styles.fieldLabel}>Heure de fin (optionnel)</label><input type="time" className={styles.input} value={page.endTime} onChange={(e) => page.setEndTime(e.target.value)} /></div>
              </div>
            </div>

            <div className={styles.section}>
              <label className={styles.label} htmlFor="location"><MapPin size={18} aria-hidden="true" />Lieu *</label>
              <input id="location" type="text" className={styles.input} placeholder="Ex: Salle de réunion - RDC" value={page.location} onChange={(e) => page.setLocation(e.target.value)} />
            </div>

            <div className={styles.section}>
              <label className={styles.label}><User size={18} aria-hidden="true" />Organisateur / Responsable</label>
              <select className={styles.select} value={page.organizer} onChange={(e) => page.setOrganizer(e.target.value)}>
                {ORGANISATEURS.map((org) => (<option key={org.id} value={org.id}>{org.name} ({org.role})</option>))}
              </select>
            </div>

            <div className={styles.section}>
              <label className={styles.label} htmlFor="description"><FileText size={18} aria-hidden="true" />Description / Notes complémentaires</label>
              <textarea id="description" className={styles.textarea} placeholder="Décrivez l'événement, l'ordre du jour, les informations importantes..." rows={6} value={page.description} onChange={(e) => page.setDescription(e.target.value)} />
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
          </div>

          <div className={styles.sideColumn}>
            <div className={styles.sideSection}>
              <h3 className={styles.sideSectionTitle}><Users size={18} aria-hidden="true" />Participants</h3>
              <div className={styles.invitationTabs}>
                <button type="button" className={clsx(styles.invitationTab, page.invitationType === 'all' && styles.active)} onClick={() => page.setInvitationType('all')}>Tous (42)</button>
                <button type="button" className={clsx(styles.invitationTab, page.invitationType === 'cs' && styles.active)} onClick={() => page.setInvitationType('cs')}>CS (5)</button>
                <button type="button" className={clsx(styles.invitationTab, page.invitationType === 'custom' && styles.active)} onClick={() => page.setInvitationType('custom')}>Personnalisé</button>
              </div>
              {page.invitationType === 'custom' && (
                <div className={styles.customParticipants}>
                  <div className={styles.participantSearch}><Search size={16} aria-hidden="true" /><input type="text" placeholder="Rechercher..." value={page.participantSearch} onChange={(e) => page.setParticipantSearch(e.target.value)} /></div>
                  <div className={styles.participantList}>
                    {page.filteredParticipants.map(user => (
                      <label key={user.id} className={clsx(styles.participantItem, page.selectedParticipants.includes(user.id) && styles.selected)}>
                        <input type="checkbox" checked={page.selectedParticipants.includes(user.id)} onChange={() => page.handleParticipantToggle(user.id)} />
                        <div className={styles.participantInfo}><span className={styles.participantName}>{user.name}</span><span className={styles.participantLot}>{user.lot}</span></div>
                        {page.selectedParticipants.includes(user.id) && <Check size={16} className={styles.checkIcon} aria-hidden="true" />}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.participantSummary}><Users size={16} aria-hidden="true" /><span>{page.getParticipantCount()} participant(s) invité(s)</span></div>
              <label className={styles.checkboxOption}>
                <input type="checkbox" checked={page.sendInvitations} onChange={(e) => page.setSendInvitations(e.target.checked)} />
                <div><span className={styles.checkboxLabel}>Envoyer les invitations par mail</span><span className={styles.checkboxDesc}>Les participants recevront une invitation</span></div>
              </label>
            </div>

            <div className={styles.sideSection}>
              <h3 className={styles.sideSectionTitle}><Bell size={18} aria-hidden="true" />Rappels</h3>
              <label className={styles.checkboxOption}>
                <input type="checkbox" checked={page.sendReminder} onChange={(e) => page.setSendReminder(e.target.checked)} />
                <div><span className={styles.checkboxLabel}>Envoyer un rappel automatique</span><span className={styles.checkboxDesc}>Notification avant l'événement</span></div>
              </label>
              {page.sendReminder && (
                <div className={styles.reminderSelect}>
                  <label>Envoyer le rappel</label>
                  <select value={page.reminderDays} onChange={(e) => page.setReminderDays(e.target.value)} className={styles.select}>
                    <option value="1">1 jour avant</option><option value="2">2 jours avant</option><option value="3">3 jours avant</option><option value="7">1 semaine avant</option>
                  </select>
                </div>
              )}
            </div>

            {(page.title || page.date) && (
              <div className={styles.sideSection}>
                <h3 className={styles.sideSectionTitle}>Aperçu</h3>
                <div className={styles.previewCard}>
                  <div className={styles.previewDate} style={{ background: page.selectedCategory?.color || '#6b7280' }}>
                    {page.date ? (<><span className={styles.previewDay}>{new Date(page.date).getDate()}</span><span className={styles.previewMonth}>{new Date(page.date).toLocaleDateString('fr-FR', { month: 'short' })}</span></>) : (<><span className={styles.previewDay}>--</span><span className={styles.previewMonth}>---</span></>)}
                  </div>
                  <div className={styles.previewContent}>
                    <h4 className={styles.previewTitle}>{page.title || 'Titre de l\'événement'}</h4>
                    <div className={styles.previewMeta}>
                      {page.time && <span><Clock size={12} aria-hidden="true" /> {page.time}</span>}
                      {page.location && <span><MapPin size={12} aria-hidden="true" /> {page.location}</span>}
                    </div>
                    {page.selectedOrganizer && <span className={styles.previewOrganizer}><User size={12} aria-hidden="true" /> {page.selectedOrganizer.name}</span>}
                    {page.selectedCategory && <span className={styles.previewCategory} style={{ background: `${page.selectedCategory.color}20`, color: page.selectedCategory.color }}>{page.selectedCategory.label}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={page.isEditMode ? `/communication/evenements/${page.editId}` : "/communication/evenements"} className={styles.cancelButton}>Annuler</Link>
          {!page.isEditMode && (
            <button type="button" className={styles.draftButton} onClick={page.handleSaveDraft} disabled={page.isSavingDraft}>
              {page.isSavingDraft ? (<><span className={styles.spinner}></span>Enregistrement...</>) : (<><Save size={18} aria-hidden="true" />Enregistrer en brouillon</>)}
            </button>
          )}
          <button type="button" className={styles.createButton} onClick={page.handleCreate} disabled={page.isCreating}>
            {page.isCreating ? (<><span className={styles.spinner}></span>{page.isEditMode ? 'Mise à jour...' : 'Création en cours...'}</>) : (<><Send size={18} aria-hidden="true" />{page.isEditMode ? 'Enregistrer les modifications' : 'Publier l\'événement'}</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
