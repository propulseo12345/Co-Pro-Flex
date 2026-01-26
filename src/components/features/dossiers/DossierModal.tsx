'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  IDossier,
  DossierCategorie,
  DossierPriorite,
  DossierFormData,
  DOSSIER_CATEGORIE_LABELS,
  DOSSIER_PRIORITE_LABELS
} from '@/types/models/dossier';
import styles from '../../../app/(dashboard)/dossiers/dossiers.module.css';

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DossierFormData) => void;
  initialData?: IDossier;
  mode: 'create' | 'edit';
}

export function DossierModal({ isOpen, onClose, onSubmit, initialData, mode }: DossierModalProps) {
  const [formData, setFormData] = useState<DossierFormData>({
    titre: initialData?.titre || '',
    description: initialData?.description || '',
    categorie: initialData?.categorie || DossierCategorie.FINANCE,
    priorite: initialData?.priorite || DossierPriorite.NORMALE,
    deadline: initialData?.deadline || new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titre.trim()) return;
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'create' ? 'Nouveau dossier' : 'Modifier le dossier'}</h2>
          <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Titre *</label>
              <input type="text" value={formData.titre} onChange={e => setFormData({ ...formData, titre: e.target.value })} placeholder="Ex: Préparer appels de fonds T2" required />
            </div>
            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Description optionnelle..." />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Catégorie</label>
                <select value={formData.categorie} onChange={e => setFormData({ ...formData, categorie: e.target.value as DossierCategorie })}>
                  {Object.entries(DOSSIER_CATEGORIE_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Priorité</label>
                <select value={formData.priorite} onChange={e => setFormData({ ...formData, priorite: e.target.value as DossierPriorite })}>
                  {Object.entries(DOSSIER_PRIORITE_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Deadline</label>
              <input type="date" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary">{mode === 'create' ? 'Créer' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
