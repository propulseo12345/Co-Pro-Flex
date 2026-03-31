'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { RepartitionKeyCreate, RepartitionBasis } from '@/lib/lots/api';
import styles from './CreateLotModal.module.css';

const BASIS_OPTIONS: { value: RepartitionBasis; label: string; description: string }[] = [
  { value: 'tantiemes', label: 'Tantièmes', description: 'Basé sur les tantièmes généraux de chaque lot' },
  { value: 'custom', label: 'Personnalisé', description: 'Poids définis manuellement pour chaque lot' },
];

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: Omit<RepartitionKeyCreate, 'copro_id'>) => Promise<{ id: string } | null>;
  isMutating: boolean;
}

export function CreateKeyModal({ isOpen, onClose, onCreate, isMutating }: CreateKeyModalProps) {
  const [name, setName] = useState('');
  const [basis, setBasis] = useState<RepartitionBasis>('tantiemes');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const result = await onCreate({
      name: name.trim(),
      basis,
      description: description.trim() || null,
      coverage_mode: 'all_lots',
    });

    if (result) {
      setName('');
      setBasis('tantiemes');
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Nouvelle clé de répartition</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.fieldGroup}>
            <label>Nom de la clé *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Charges générales, Ascenseur bât. A..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Base de calcul</label>
            <select value={basis} onChange={e => setBasis(e.target.value as RepartitionBasis)}>
              {BASIS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Description (optionnel)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ex: Répartition des charges d'ascenseur bâtiment A"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!name.trim() || isMutating}
          >
            {isMutating ? 'Création...' : 'Créer la clé'}
          </button>
        </div>
      </div>
    </div>
  );
}
