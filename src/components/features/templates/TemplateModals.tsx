'use client';

import styles from '@/app/(dashboard)/settings/templates/templates.module.css';

interface CreateTemplateModalProps {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export function CreateTemplateModal({ name, description, onNameChange, onDescChange, onClose, onCreate }: CreateTemplateModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2>Nouveau template</h2>
        <div className={styles.formGroup}>
          <label>Nom du template *</label>
          <input type="text" value={name} onChange={e => onNameChange(e.target.value)} placeholder="Ex: Template AG Ordinaire" autoFocus />
        </div>
        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea value={description} onChange={e => onDescChange(e.target.value)} placeholder="Description du template..." rows={3} />
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button className={styles.btnPrimary} onClick={onCreate} disabled={!name.trim()}>Créer</button>
        </div>
      </div>
    </div>
  );
}

interface DeleteTemplateModalProps {
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteTemplateModal({ onClose, onDelete }: DeleteTemplateModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2>Supprimer le template ?</h2>
        <p>Cette action est irréversible. Le template sera définitivement supprimé.</p>
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button className={styles.btnDanger} onClick={onDelete}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

interface ImportTemplateModalProps {
  json: string;
  onJsonChange: (v: string) => void;
  onClose: () => void;
  onImport: () => void;
}

export function ImportTemplateModal({ json, onJsonChange, onClose, onImport }: ImportTemplateModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2>Importer un template</h2>
        <div className={styles.formGroup}>
          <label>Collez le JSON du template exporté</label>
          <textarea value={json} onChange={e => onJsonChange(e.target.value)} placeholder='{"exportVersion": "1.0", "template": {...}}' rows={10} className={styles.codeInput} />
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button className={styles.btnPrimary} onClick={onImport} disabled={!json.trim()}>Importer</button>
        </div>
      </div>
    </div>
  );
}
