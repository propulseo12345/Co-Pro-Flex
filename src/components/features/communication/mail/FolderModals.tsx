'use client';

import { X, FolderPlus, Edit3, Trash2, FolderInput, Folder, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { type MailFolder, FOLDER_COLORS } from '@/hooks/modules/useMailListPage';
import styles from './mail-components.module.css';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  folderColor: string;
  onFolderColorChange: (color: string) => void;
}

export function CreateFolderModal({
  isOpen,
  onClose,
  onCreate,
  folderName,
  onFolderNameChange,
  folderColor,
  onFolderColorChange,
}: CreateFolderModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
          <X size={20} aria-hidden="true" />
        </button>
        <div className={styles.modalIcon} style={{ background: 'rgba(129, 140, 248, 0.1)' }}>
          <FolderPlus size={48} style={{ color: '#818cf8' }} aria-hidden="true" />
        </div>
        <h2 className={styles.modalTitle}>Créer un dossier</h2>
        <div className={styles.folderFormGroup}>
          <label>Nom du dossier</label>
          <input
            type="text"
            className={styles.folderInput}
            placeholder="Ex: Urgences, Factures..."
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.folderFormGroup}>
          <label>Couleur</label>
          <div className={styles.colorPicker}>
            {FOLDER_COLORS.map(color => (
              <button
                key={color}
                className={clsx(styles.colorOption, folderColor === color && styles.colorOptionActive)}
                style={{ background: color }}
                onClick={() => onFolderColorChange(color)}
                aria-label={`Couleur ${color}`}
              />
            ))}
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={onCreate} disabled={!folderName.trim()}>
            <FolderPlus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

interface RenameFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  folder: MailFolder | null;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  folderColor: string;
  onFolderColorChange: (color: string) => void;
}

export function RenameFolderModal({
  isOpen,
  onClose,
  onRename,
  folder,
  folderName,
  onFolderNameChange,
  folderColor,
  onFolderColorChange,
}: RenameFolderModalProps) {
  if (!isOpen || !folder) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
          <X size={20} aria-hidden="true" />
        </button>
        <div className={styles.modalIcon} style={{ background: 'rgba(129, 140, 248, 0.1)' }}>
          <Edit3 size={48} style={{ color: '#818cf8' }} aria-hidden="true" />
        </div>
        <h2 className={styles.modalTitle}>Renommer le dossier</h2>
        <div className={styles.folderFormGroup}>
          <label>Nom du dossier</label>
          <input
            type="text"
            className={styles.folderInput}
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.folderFormGroup}>
          <label>Couleur</label>
          <div className={styles.colorPicker}>
            {FOLDER_COLORS.map(color => (
              <button
                key={color}
                className={clsx(styles.colorOption, folderColor === color && styles.colorOptionActive)}
                style={{ background: color }}
                onClick={() => onFolderColorChange(color)}
                aria-label={`Couleur ${color}`}
              />
            ))}
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={onRename} disabled={!folderName.trim()}>
            <Edit3 size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Renommer
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  folder: MailFolder | null;
}

export function DeleteFolderModal({
  isOpen,
  onClose,
  onDelete,
  folder,
}: DeleteFolderModalProps) {
  if (!isOpen || !folder) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
          <X size={20} aria-hidden="true" />
        </button>
        <div className={styles.modalIcon}>
          <Trash2 size={48} aria-hidden="true" />
        </div>
        <h2 className={styles.modalTitle}>Supprimer le dossier</h2>
        <p className={styles.modalText}>
          Êtes-vous sûr de vouloir supprimer le dossier &quot;{folder.name}&quot; ?<br />
          Les mails ne seront pas supprimés, ils seront retirés de ce dossier.
        </p>
        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            <Trash2 size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
  folders: MailFolder[];
  selectedCount: number;
}

export function MoveToFolderModal({
  isOpen,
  onClose,
  onMove,
  folders,
  selectedCount,
}: MoveToFolderModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
          <X size={20} aria-hidden="true" />
        </button>
        <div className={styles.modalIcon} style={{ background: 'rgba(129, 140, 248, 0.1)' }}>
          <FolderInput size={48} style={{ color: '#818cf8' }} aria-hidden="true" />
        </div>
        <h2 className={styles.modalTitle}>Déplacer vers un dossier</h2>
        <p className={styles.modalText}>
          Sélectionnez le dossier de destination pour {selectedCount} mail{selectedCount > 1 ? 's' : ''}.
        </p>
        <div className={styles.folderPickerList}>
          <button
            className={styles.folderPickerItem}
            onClick={() => onMove(null)}
          >
            <X size={16} aria-hidden="true" />
            <span>Retirer du dossier</span>
          </button>
          {folders.map(folder => (
            <button
              key={folder.id}
              className={styles.folderPickerItem}
              onClick={() => onMove(folder.id)}
            >
              <Folder size={16} style={{ color: folder.color }} aria-hidden="true" />
              <span>{folder.name}</span>
              <ChevronRight size={14} className={styles.folderPickerArrow} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
