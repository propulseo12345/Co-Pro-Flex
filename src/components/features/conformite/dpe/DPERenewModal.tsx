'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { DPERenewData } from '@/hooks/useDPE';
import styles from './DPERenewModal.module.css';

interface DPERenewModalProps {
  diagnostiqueurActuel: string;
  onSave: (data: DPERenewData) => void;
  onClose: () => void;
}

export function DPERenewModal({ diagnostiqueurActuel, onSave, onClose }: DPERenewModalProps) {
  const [datePrevue, setDatePrevue] = useState('');
  const [diagnostiqueur, setDiagnostiqueur] = useState(diagnostiqueurActuel);
  const [notes, setNotes] = useState('');
  const [errorDate, setErrorDate] = useState('');

  function handleSubmit() {
    if (!datePrevue) {
      setErrorDate('La date prévue est requise');
      return;
    }
    onSave({ datePrevue, diagnostiqueur, notes });
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Planifier le renouvellement DPE</div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>
            Cette action planifie le prochain diagnostic DPE. Elle enregistre la date prévue et le diagnostiqueur dans l&apos;historique.
          </p>

          <div className={styles.field}>
            <label htmlFor="renew-date" className={styles.label}>Date prévue du diagnostic *</label>
            <input
              id="renew-date"
              type="date"
              className={clsx(styles.input, errorDate && styles.error)}
              value={datePrevue}
              onChange={e => { setDatePrevue(e.target.value); setErrorDate(''); }}
            />
            {errorDate && <span className={styles.errorMsg}>{errorDate}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="renew-diagnostiqueur" className={styles.label}>Diagnostiqueur</label>
            <input
              id="renew-diagnostiqueur"
              type="text"
              className={styles.input}
              value={diagnostiqueur}
              onChange={e => setDiagnostiqueur(e.target.value)}
              placeholder="Nom du cabinet ou diagnostiqueur"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="renew-notes" className={styles.label}>Notes (optionnel)</label>
            <textarea
              id="renew-notes"
              className={styles.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observations, contexte, contact…"
              rows={3}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Annuler</button>
          <button type="button" className={styles.btnSave} onClick={handleSubmit}>Planifier</button>
        </div>
      </div>
    </div>
  );
}
