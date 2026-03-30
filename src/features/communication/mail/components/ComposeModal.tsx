'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Send, Paperclip } from 'lucide-react';
import type { IMail, IDraftData } from '@/features/communication/mail/domain/types';
import styles from './ComposeModal.module.css';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface ComposeModalProps {
  isOpen: boolean;
  replyTo: IMail | null;
  onClose: () => void;
  onSend: (draft: IDraftData) => void;
  onSaveDraft: (draft: IDraftData) => void;
}

// ----------------------------------------------------------------------------
// Composant
// ----------------------------------------------------------------------------

export function ComposeModal({
  isOpen,
  replyTo,
  onClose,
  onSend,
  onSaveDraft,
}: ComposeModalProps) {
  const [toField, setToField] = useState('');
  const [ccField, setCcField] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Pré-remplir si réponse
  useEffect(() => {
    if (replyTo) {
      setToField(replyTo.from.email);
      setSubject(`Re: ${replyTo.subject.replace(/^Re:\s*/i, '')}`);
      setBody('');
      setCcField('');
      setShowCc(false);
    } else {
      setToField('');
      setSubject('');
      setBody('');
      setCcField('');
      setShowCc(false);
    }
  }, [replyTo, isOpen]);

  const buildDraft = useCallback((): IDraftData => {
    const toEmails = toField
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({ name: '', email }));

    const ccEmails = ccField
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({ name: '', email }));

    return {
      to: toEmails,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      subject,
      body,
      replyToId: replyTo?.id,
    };
  }, [toField, ccField, subject, body, replyTo]);

  const handleSend = useCallback(() => {
    const draft = buildDraft();
    if (draft.to.length === 0 || !draft.subject.trim()) return;
    onSend(draft);
  }, [buildDraft, onSend]);

  const handleClose = useCallback(() => {
    // Save draft if there's content
    if (toField.trim() || subject.trim() || body.trim()) {
      onSaveDraft(buildDraft());
    }
    onClose();
  }, [toField, subject, body, buildDraft, onSaveDraft, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay transparent pour capturer les clics extérieurs */}
      <div className={styles.overlay} onClick={handleClose} />

      {/* Modal */}
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>
            {replyTo ? `Re: ${replyTo.subject.replace(/^Re:\s*/i, '')}` : 'Nouveau message'}
          </span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form body */}
        <div className={styles.formBody}>
          {/* To */}
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>A</span>
            <input
              type="text"
              className={styles.fieldInput}
              placeholder="destinataire@email.fr"
              value={toField}
              onChange={(e) => setToField(e.target.value)}
            />
            {!showCc && (
              <button
                type="button"
                className={styles.ccToggle}
                onClick={() => setShowCc(true)}
              >
                CC
              </button>
            )}
          </div>

          {/* CC (hidden by default) */}
          {showCc && (
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>CC</span>
              <input
                type="text"
                className={styles.fieldInput}
                placeholder="cc@email.fr"
                value={ccField}
                onChange={(e) => setCcField(e.target.value)}
              />
            </div>
          )}

          {/* Subject */}
          <div className={styles.subjectField}>
            <input
              type="text"
              className={styles.subjectInput}
              placeholder="Objet"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className={styles.bodyWrapper}>
            <textarea
              className={styles.bodyTextarea}
              placeholder="Rédigez votre message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <button
              type="button"
              className={styles.footerButton}
              aria-label="Joindre un fichier"
            >
              <Paperclip size={16} />
            </button>
          </div>
          <button
            type="button"
            className={styles.sendButton}
            onClick={handleSend}
          >
            <Send size={14} />
            Envoyer
          </button>
        </div>
      </div>
    </>
  );
}
