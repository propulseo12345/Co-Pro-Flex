'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Send, Save, Users, Paperclip, X, FileText,
  Clock, Mail, ChevronDown, Check, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import styles from './nouveau-mail.module.css';
import clsx from 'clsx';
import { useComposeForm } from '@/hooks/modules/useComposeForm';
import { formatTailleFichier } from '@/types/models/mail';

function NouveauMailContent() {
  const {
    recipientType, setRecipientType, selectedGroups, setSelectedGroups, selectedIndividuals,
    subject, setSubject, body, setBody, attachments,
    showTemplates, setShowTemplates, selectedTemplate, isSending,
    individualSearch, setIndividualSearch, editingDraftId,
    saveStatus, errorMessage, setErrorMessage,
    handleTemplateSelect, handleGroupToggle, handleIndividualToggle,
    handleFileUpload, removeAttachment, getRecipientCount,
    handleSend, handleSaveDraft,
    filteredIndividuals, formatLastSaved,
    EMAIL_TEMPLATES, RECIPIENT_GROUPS
  } = useComposeForm();

  return (
    <div className="container">
      <div className={styles.header}>
        <Link href="/communication/mail" className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" /> Retour
        </Link>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{editingDraftId ? 'Modifier le brouillon' : 'Rédiger un mail'}</h1>
          <div className={styles.saveIndicator}>
            {saveStatus === 'saving' && <span className={styles.saving}><Loader2 size={14} className={styles.spinning} aria-hidden="true" />Sauvegarde...</span>}
            {saveStatus === 'saved' && <span className={styles.saved}><CheckCircle2 size={14} aria-hidden="true" />Sauvegardé {formatLastSaved()}</span>}
            {saveStatus === 'error' && <span className={styles.saveError}><AlertCircle size={14} aria-hidden="true" />Erreur de sauvegarde</span>}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className={styles.closeError}><X size={16} aria-hidden="true" /></button>
        </div>
      )}

      <div className={styles.formContainer}>
        {/* Recipients */}
        <div className={styles.section}>
          <label className={styles.label}><Users size={18} aria-hidden="true" />Destinataires</label>
          <div className={styles.recipientTabs}>
            <button className={clsx(styles.recipientTab, recipientType === 'all' && styles.active)} onClick={() => { setRecipientType('all'); setSelectedGroups(['all']); }}>Tous les copropriétaires</button>
            <button className={clsx(styles.recipientTab, recipientType === 'group' && styles.active)} onClick={() => { setRecipientType('group'); setSelectedGroups([]); }}>Par groupe / étage</button>
            <button className={clsx(styles.recipientTab, recipientType === 'individual' && styles.active)} onClick={() => setRecipientType('individual')}>Individuel</button>
          </div>

          {recipientType === 'group' && (
            <div className={styles.groupSelection}>
              {RECIPIENT_GROUPS.filter(g => g.id !== 'all').map(group => (
                <label key={group.id} className={styles.groupCheckbox}>
                  <input type="checkbox" checked={selectedGroups.includes(group.id)} onChange={() => handleGroupToggle(group.id)} />
                  <span className={styles.checkboxLabel}>{group.label}<span className={styles.count}>({group.count})</span></span>
                </label>
              ))}
            </div>
          )}

          {recipientType === 'individual' && (
            <div className={styles.individualSelection}>
              <input type="text" placeholder="Rechercher un copropriétaire..." className={styles.searchInput} value={individualSearch} onChange={(e) => setIndividualSearch(e.target.value)} />
              <div className={styles.individualList}>
                {filteredIndividuals.map(user => (
                  <label key={user.id} className={styles.individualItem}>
                    <input type="checkbox" checked={selectedIndividuals.includes(user.id)} onChange={() => handleIndividualToggle(user.id)} />
                    <div className={styles.individualInfo}>
                      <span className={styles.individualName}>{user.nom}</span>
                      <span className={styles.individualLot}>{user.lot} - {user.email}</span>
                    </div>
                  </label>
                ))}
              </div>
              {selectedIndividuals.length > 0 && <div className={styles.selectedCount}>{selectedIndividuals.length} destinataire(s) sélectionné(s)</div>}
            </div>
          )}

          <div className={styles.recipientSummary}><Mail size={16} aria-hidden="true" /><span>{getRecipientCount()} destinataire(s)</span></div>
        </div>

        {/* Template */}
        <div className={styles.section}>
          <label className={styles.label}><FileText size={18} aria-hidden="true" />Modèle de mail (optionnel)</label>
          <div className={styles.templateSelector}>
            <button className={styles.templateButton} onClick={() => setShowTemplates(!showTemplates)}>
              {selectedTemplate ? EMAIL_TEMPLATES.find(t => t.id === selectedTemplate)?.name : 'Sélectionner un modèle'}
              <ChevronDown size={18} className={clsx(showTemplates && styles.rotated)} aria-hidden="true" />
            </button>
            {showTemplates && (
              <div className={styles.templateDropdown}>
                {EMAIL_TEMPLATES.map(template => (
                  <button key={template.id} className={clsx(styles.templateOption, selectedTemplate === template.id && styles.selected)} onClick={() => handleTemplateSelect(template)}>
                    <FileText size={16} aria-hidden="true" />{template.name}{selectedTemplate === template.id && <Check size={16} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className={styles.section}>
          <label className={styles.label} htmlFor="subject">Objet</label>
          <input id="subject" type="text" className={styles.input} placeholder="Objet du mail..." value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        {/* Body */}
        <div className={styles.section}>
          <label className={styles.label} htmlFor="body">Message</label>
          <textarea id="body" className={styles.textarea} placeholder="Rédigez votre message..." rows={15} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        {/* Attachments */}
        <div className={styles.section}>
          <label className={styles.label}><Paperclip size={18} aria-hidden="true" />Pièces jointes</label>
          <div className={styles.attachmentsArea}>
            <input type="file" id="file-upload" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" className={styles.fileInput} onChange={handleFileUpload} />
            <label htmlFor="file-upload" className={styles.uploadButton}><Paperclip size={20} aria-hidden="true" />Ajouter des fichiers</label>
            <span className={styles.uploadHint}>PDF, images (max 10 Mo par fichier)</span>
            {attachments.length > 0 && (
              <div className={styles.attachmentsList}>
                {attachments.map(attachment => (
                  <div key={attachment.id} className={styles.attachmentItem}>
                    <FileText size={18} aria-hidden="true" />
                    <span className={styles.attachmentName}>{attachment.nom}</span>
                    <span className={styles.attachmentSize}>{formatTailleFichier(attachment.taille)}</span>
                    <button className={styles.removeAttachment} onClick={() => removeAttachment(attachment.id)} title="Supprimer"><X size={16} aria-hidden="true" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.draftButton} onClick={handleSaveDraft} disabled={saveStatus === 'saving'}><Save size={18} aria-hidden="true" />Enregistrer en brouillon</button>
          <button className={styles.sendButton} onClick={handleSend} disabled={isSending}>
            {isSending ? <><Clock size={18} className={styles.spinning} aria-hidden="true" />Envoi en cours...</> : <><Send size={18} aria-hidden="true" />Envoyer ({getRecipientCount()} destinataires)</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="container">
      <div className={styles.header}>
        <Link href="/communication/mail" className={styles.backButton}><ArrowLeft size={20} aria-hidden="true" />Retour</Link>
        <h1 className={styles.title}>Rédiger un mail</h1>
      </div>
      <div className={styles.formContainer}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
          <Loader2 size={32} className={styles.spinning} style={{ color: 'var(--primary-color)' }} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export default function NouveauMailPage() {
  return <Suspense fallback={<LoadingFallback />}><NouveauMailContent /></Suspense>;
}
