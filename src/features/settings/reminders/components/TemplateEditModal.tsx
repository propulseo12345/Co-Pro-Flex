'use client';

import { useState } from 'react';
import { X, Eye } from 'lucide-react';
import type { EmailTemplate } from '@/hooks/modules/useFinanceData';
import styles from '@/app/(dashboard)/settings/reminders/reminders-settings.module.css';

interface TemplateEditModalProps {
  template: EmailTemplate;
  onClose: () => void;
  onSave: (updates: { subject: string; body_html: string; body_text: string | null }) => Promise<void>;
  isSaving: boolean;
}

export function TemplateEditModal({ template, onClose, onSave, isSaving }: TemplateEditModalProps) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [bodyText, setBodyText] = useState(template.body_text || '');
  const [showPreview, setShowPreview] = useState(false);

  const availableVars = template.available_variables || {
    destinataire_nom: 'Nom du proprietaire',
    montant: 'Montant impaye',
    lot_ref: 'Reference du lot',
    copropriete_nom: 'Nom de la copropriete',
    date_echeance: 'Date d\'echeance',
    jours_retard: 'Jours de retard',
  };

  const handleSave = async () => {
    await onSave({
      subject,
      body_html: bodyHtml,
      body_text: bodyText || null,
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Modifier le template: {template.name}</h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.formGroup}>
            <label>Sujet de l&apos;email</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de l'email"
            />
          </div>

          <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
            <label>Corps HTML</label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              placeholder="Contenu HTML de l'email..."
              style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
            />
          </div>

          <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
            <label>Corps texte (optionnel)</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={5}
              placeholder="Version texte de l'email (fallback)..."
            />
          </div>

          <div className={styles.variablesInfo}>
            <div className={styles.variablesTitle}>Variables disponibles</div>
            <div className={styles.variablesList}>
              {Object.entries(availableVars).map(([key, desc]) => (
                <span key={key} className={styles.variableTag} title={desc}>
                  {'{{' + key + '}}'}
                </span>
              ))}
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ marginTop: '1rem' }}
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye size={16} style={{ marginRight: 6 }} />
            {showPreview ? 'Masquer' : 'Apercu'}
          </button>

          {showPreview && (
            <div className={styles.preview}>
              <div className={styles.previewTitle}>Apercu</div>
              <div
                className={styles.previewContent}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
