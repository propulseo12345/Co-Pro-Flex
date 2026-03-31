'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { LotWithOwner, LotUpdate, LotType } from '@/lib/lots/api';
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

interface EditLotModalProps {
  lot: LotWithOwner | null;
  onClose: () => void;
  onUpdate: (lotId: string, updates: LotUpdate) => Promise<boolean>;
  onDelete: (lotId: string) => Promise<boolean>;
  isMutating: boolean;
}

export function EditLotModal({ lot, onClose, onUpdate, onDelete, isMutating }: EditLotModalProps) {
  const [ref, setRef] = useState('');
  const [type, setType] = useState<LotType>('appartement');
  const [floor, setFloor] = useState('');
  const [surface, setSurface] = useState('');
  const [tantiemes, setTantiemes] = useState('');

  useEffect(() => {
    if (lot) {
      setRef(lot.ref);
      setType((lot.type as LotType) || 'appartement');
      setFloor(lot.floor != null ? String(lot.floor) : '');
      setSurface(lot.surface != null ? String(lot.surface) : '');
      setTantiemes(String(lot.tantiemes_generaux));
    }
  }, [lot]);

  const handleSave = async () => {
    if (!lot || !ref.trim() || !tantiemes.trim()) return;

    const updates: LotUpdate = {
      ref: ref.trim(),
      type,
      floor: floor ? parseInt(floor, 10) : null,
      surface: surface ? parseFloat(surface) : null,
      tantiemes_generaux: parseInt(tantiemes, 10),
    };

    const success = await onUpdate(lot.id, updates);
    if (success) onClose();
  };

  const handleDelete = async () => {
    if (!lot) return;
    if (!window.confirm(`Supprimer le lot ${lot.ref} ? Cette action est irréversible.`)) return;
    const success = await onDelete(lot.id);
    if (success) onClose();
  };

  if (!lot) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Modifier le lot {lot.ref}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label>Référence *</label>
              <input type="text" value={ref} onChange={e => setRef(e.target.value)} />
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

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label>Étage</label>
              <input type="number" value={floor} onChange={e => setFloor(e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label>Surface (m²)</label>
              <input type="number" step="0.01" value={surface} onChange={e => setSurface(e.target.value)} />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label>Tantièmes généraux *</label>
            <input type="number" value={tantiemes} onChange={e => setTantiemes(e.target.value)} />
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={handleDelete}
            disabled={isMutating}
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            Supprimer
          </button>
          <div style={{ flex: 1 }} />
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button
            className={styles.submitBtn}
            onClick={handleSave}
            disabled={!ref.trim() || !tantiemes.trim() || isMutating}
          >
            {isMutating ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
