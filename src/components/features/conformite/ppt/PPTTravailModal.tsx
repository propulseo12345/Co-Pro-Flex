'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { ITravauxPPT } from '@/types';
import { TravauxPrevisionnelStatut, TypeTravauxPrevisionnel } from '@/types/enums';
import styles from './PPTTravailModal.module.css';

type TravailFormData = {
  titre: string;
  type: TypeTravauxPrevisionnel;
  datePrevisionnelle: string;
  montantEstime: string;
  priorite: ITravauxPPT['priorite'];
  statut: TravauxPrevisionnelStatut;
  description: string;
};

interface PPTTravailModalProps {
  /** Null = création, non-null = édition */
  travail: ITravauxPPT | null;
  onSave: (data: Omit<ITravauxPPT, 'id' | 'etapes'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const DEFAULT_FORM: TravailFormData = {
  titre: '',
  type: TypeTravauxPrevisionnel.FACADE,
  datePrevisionnelle: '',
  montantEstime: '',
  priorite: 'NORMALE',
  statut: TravauxPrevisionnelStatut.A_L_ETUDE,
  description: '',
};

function toFormData(t: ITravauxPPT): TravailFormData {
  return {
    titre: t.titre,
    type: t.type,
    datePrevisionnelle: t.datePrevisionnelle,
    montantEstime: String(t.montantEstime),
    priorite: t.priorite,
    statut: t.statut,
    description: t.description ?? '',
  };
}

// Fix 3 — Libellés lisibles pour TypeTravauxPrevisionnel
const TYPE_LABELS: Record<TypeTravauxPrevisionnel, string> = {
  [TypeTravauxPrevisionnel.TOITURE]: 'Toiture',
  [TypeTravauxPrevisionnel.FACADE]: 'Façade',
  [TypeTravauxPrevisionnel.CHAUFFAGE]: 'Chauffage',
  [TypeTravauxPrevisionnel.ASCENSEUR]: 'Ascenseur',
  [TypeTravauxPrevisionnel.ELECTRICITE]: 'Électricité',
  [TypeTravauxPrevisionnel.PLOMBERIE]: 'Plomberie',
  [TypeTravauxPrevisionnel.ESPACES_VERTS]: 'Espaces verts',
  [TypeTravauxPrevisionnel.ETANCHEITE]: 'Étanchéité',
  [TypeTravauxPrevisionnel.ACCESSIBILITE]: 'Accessibilité',
  [TypeTravauxPrevisionnel.SECURITE]: 'Sécurité',
  [TypeTravauxPrevisionnel.AUTRE]: 'Autre',
};

export function PPTTravailModal({ travail, onSave, onDelete, onClose }: PPTTravailModalProps) {
  const isEdit = travail !== null;
  const [form, setForm] = useState<TravailFormData>(
    travail ? toFormData(travail) : () => ({ ...DEFAULT_FORM })
  );
  const [errors, setErrors] = useState<Partial<Record<keyof TravailFormData, string>>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set<K extends keyof TravailFormData>(key: K, value: TravailFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.titre.trim()) next.titre = 'Le titre est requis';
    if (!form.datePrevisionnelle) next.datePrevisionnelle = 'La date est requise';
    const montant = parseFloat(form.montantEstime);
    if (!form.montantEstime || isNaN(montant) || montant <= 0) {
      next.montantEstime = 'Montant invalide (doit être > 0)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      titre: form.titre.trim(),
      type: form.type,
      datePrevisionnelle: form.datePrevisionnelle,
      montantEstime: parseFloat(form.montantEstime),
      priorite: form.priorite,
      statut: form.statut,
      description: form.description.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            {isEdit ? 'Modifier le travail' : 'Ajouter un travail'}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Titre */}
          <div className={styles.field}>
            <label htmlFor="ppt-titre" className={styles.label}>Titre *</label>
            <input
              id="ppt-titre"
              type="text"
              className={clsx(styles.input, errors.titre && styles.error)}
              value={form.titre}
              onChange={e => set('titre', e.target.value)}
              placeholder="Ex : Ravalement de façade"
              maxLength={120}
            />
            {errors.titre && <span className={styles.errorMsg}>{errors.titre}</span>}
          </div>

          {/* Type + Statut */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="ppt-type" className={styles.label}>Type de travaux</label>
              <select
                id="ppt-type"
                className={styles.select}
                value={form.type}
                onChange={e => set('type', e.target.value as TypeTravauxPrevisionnel)}
              >
                {Object.values(TypeTravauxPrevisionnel).map(v => (
                  <option key={v} value={v}>{TYPE_LABELS[v]}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="ppt-statut" className={styles.label}>Statut</label>
              <select
                id="ppt-statut"
                className={styles.select}
                value={form.statut}
                onChange={e => set('statut', e.target.value as TravauxPrevisionnelStatut)}
              >
                <option value={TravauxPrevisionnelStatut.A_L_ETUDE}>À l&apos;étude</option>
                <option value={TravauxPrevisionnelStatut.PREVU}>Prévu</option>
                <option value={TravauxPrevisionnelStatut.VOTE}>Voté en AG</option>
                <option value={TravauxPrevisionnelStatut.EN_COURS}>En cours</option>
                <option value={TravauxPrevisionnelStatut.TERMINE}>Terminé</option>
              </select>
            </div>
          </div>

          {/* Date + Montant */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="ppt-date" className={styles.label}>Date prévisionnelle *</label>
              <input
                id="ppt-date"
                type="date"
                className={clsx(styles.input, errors.datePrevisionnelle && styles.error)}
                value={form.datePrevisionnelle}
                onChange={e => set('datePrevisionnelle', e.target.value)}
              />
              {errors.datePrevisionnelle && <span className={styles.errorMsg}>{errors.datePrevisionnelle}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="ppt-montant" className={styles.label}>Montant estimé (€) *</label>
              <input
                id="ppt-montant"
                type="number"
                className={clsx(styles.input, errors.montantEstime && styles.error)}
                value={form.montantEstime}
                onChange={e => set('montantEstime', e.target.value)}
                placeholder="0"
                min="0"
                step="100"
              />
              {errors.montantEstime && <span className={styles.errorMsg}>{errors.montantEstime}</span>}
            </div>
          </div>

          {/* Priorité */}
          <div className={styles.field}>
            <label htmlFor="ppt-priorite" className={styles.label}>Priorité</label>
            <select
              id="ppt-priorite"
              className={styles.select}
              value={form.priorite}
              onChange={e => set('priorite', e.target.value as ITravauxPPT['priorite'])}
            >
              <option value="FAIBLE">Faible</option>
              <option value="NORMALE">Normale</option>
              <option value="HAUTE">Haute</option>
              <option value="CRITIQUE">Critique</option>
            </select>
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="ppt-description" className={styles.label}>Description (optionnel)</label>
            <textarea
              id="ppt-description"
              className={styles.textarea}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Détails sur les travaux…"
              rows={3}
            />
          </div>
        </div>

        <div className={styles.footer}>
          {isEdit && onDelete && (
            confirmDelete ? (
              <button
                type="button"
                className={styles.btnDangerConfirm}
                onClick={onDelete}
              >
                Confirmer la suppression
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => setConfirmDelete(true)}
              >
                Supprimer
              </button>
            )
          )}
          <button type="button" className={styles.btnCancel} onClick={() => { setConfirmDelete(false); onClose(); }}>Annuler</button>
          <button type="button" className={styles.btnSave} onClick={handleSubmit}>
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}
