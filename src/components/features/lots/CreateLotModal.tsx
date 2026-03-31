'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { LotCreate, LotType } from '@/lib/lots/api';
import styles from './CreateLotModal.module.css';

const LOT_TYPES: { value: LotType; label: string }[] = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'parking', label: 'Parking' },
  { value: 'cave', label: 'Cave' },
  { value: 'local_commercial', label: 'Commerce' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'garage', label: 'Garage' },
  { value: 'box', label: 'Box' },
  { value: 'autre', label: 'Autre' },
];

interface CreateLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: Omit<LotCreate, 'copro_id'>) => Promise<{ id: string } | null>;
  isMutating: boolean;
}

export function CreateLotModal({ isOpen, onClose, onCreate, isMutating }: CreateLotModalProps) {
  const [ref, setRef] = useState('');
  const [type, setType] = useState<LotType>('appartement');
  const [floor, setFloor] = useState('');
  const [tantiemes, setTantiemes] = useState('');

  const resetForm = useCallback(() => {
    setRef('');
    setType('appartement');
    setFloor('');
    setTantiemes('');
  }, []);

  const handleSubmit = async () => {
    if (!ref.trim() || !tantiemes.trim()) return;

    const payload: Omit<LotCreate, 'copro_id'> = {
      ref: ref.trim(),
      type,
      floor: floor ? parseInt(floor, 10) : null,
      tantiemes_generaux: parseInt(tantiemes, 10),
    };

    const result = await onCreate(payload);
    if (result) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Nouveau lot</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label>Référence *</label>
              <input
                type="text"
                value={ref}
                onChange={e => setRef(e.target.value)}
                placeholder="ex: A-101"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value as LotType)}>
                {LOT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label>Étage</label>
            <input
              type="number"
              value={floor}
              onChange={e => setFloor(e.target.value)}
              placeholder="ex: 3"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Tantièmes généraux *</label>
            <input
              type="number"
              value={tantiemes}
              onChange={e => setTantiemes(e.target.value)}
              placeholder="ex: 500"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!ref.trim() || !tantiemes.trim() || isMutating}
          >
            {isMutating ? 'Création...' : 'Créer le lot'}
          </button>
        </div>
      </div>
    </div>
  );
}
