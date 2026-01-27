'use client';

import { X, Save } from 'lucide-react';
import type { Coproprietaire } from '@/hooks/modules/useCoproprietairesPage';
import styles from '../../../app/(dashboard)/coproprietaires/coproprietaires.module.css';

interface CoproprietaireEditModalProps {
  copro: Coproprietaire | null;
  form: Partial<Coproprietaire>;
  onFormChange: (form: Partial<Coproprietaire>) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function CoproprietaireEditModal({ copro, form, onFormChange, onClose, onSave, isSaving = false }: CoproprietaireEditModalProps) {
  if (!copro) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Modifier le copropriétaire</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="edit-nom">Nom *</label>
              <input id="edit-nom" type="text" value={form.nom || ''} onChange={(e) => onFormChange({ ...form, nom: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="edit-prenom">Prénom</label>
              <input id="edit-prenom" type="text" value={form.prenom || ''} onChange={(e) => onFormChange({ ...form, prenom: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="edit-fonction">Fonction</label>
              <input id="edit-fonction" type="text" value={form.fonction || ''} onChange={(e) => onFormChange({ ...form, fonction: e.target.value })} placeholder="Ex: Membre du CS" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="edit-telephone">Téléphone</label>
              <input id="edit-telephone" type="tel" value={form.telephone || ''} onChange={(e) => onFormChange({ ...form, telephone: e.target.value })} />
            </div>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label htmlFor="edit-email">Email *</label>
              <input id="edit-email" type="email" value={form.email || ''} onChange={(e) => onFormChange({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={onSave} disabled={!form.nom || !form.email || isSaving}><Save size={16} aria-hidden="true" />{isSaving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
