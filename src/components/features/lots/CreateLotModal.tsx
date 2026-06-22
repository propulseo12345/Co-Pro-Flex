'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { LotCreate, LotType } from '@/lib/lots/api';
import styles from './CreateLotModal.module.css';

const LOT_TYPES: { value: LotType; label: string }[] = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'cave', label: 'Cave' },
  { value: 'parking', label: 'Parking' },
  { value: 'garage', label: 'Garage' },
  { value: 'local_technique', label: 'Local technique' },
  { value: 'autre', label: 'Autre' },
];

interface CreateLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: Omit<LotCreate, 'copro_id'>) => Promise<{ id: string } | null>;
  isMutating: boolean;
  owners?: Array<{ id: string; display_name: string }>;
  onAssignOwner?: (lotId: string, ownerId: string | null) => Promise<void>;
  buildings?: Array<{ id: string; name: string }>;
}

export function CreateLotModal({ isOpen, onClose, onCreate, isMutating, owners = [], onAssignOwner, buildings = [] }: CreateLotModalProps) {
  const [ref, setRef] = useState('');
  const [type, setType] = useState<LotType>('appartement');
  const [floor, setFloor] = useState('');
  const [surface, setSurface] = useState('');
  const [tantiemes, setTantiemes] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [buildingId, setBuildingId] = useState<string>('');

  const resetForm = useCallback(() => {
    setRef('');
    setType('appartement');
    setFloor('');
    setSurface('');
    setTantiemes('');
    setOwnerId('');
    setBuildingId('');
  }, []);

  const handleSubmit = async () => {
    if (!ref.trim() || !tantiemes.trim()) return;

    const payload: Omit<LotCreate, 'copro_id'> = {
      ref: ref.trim(),
      type,
      floor: floor ? parseInt(floor, 10) : null,
      surface: surface ? parseFloat(surface) : null,
      building_id: buildingId || null,
      tantiemes_generaux: parseInt(tantiemes, 10),
    };

    const result = await onCreate(payload);
    if (result) {
      if (ownerId && onAssignOwner) {
        await onAssignOwner(result.id, ownerId);
      }
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Nouveau lot" onClick={e => e.stopPropagation()}>
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

          <div className={styles.fieldRow}>
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
              <label>Surface (m²)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={surface}
                onChange={e => setSurface(e.target.value)}
                placeholder="ex: 65"
              />
            </div>
          </div>

          {buildings.length > 0 && (
            <div className={styles.fieldGroup}>
              <label>Bâtiment</label>
              <select value={buildingId} onChange={e => setBuildingId(e.target.value)}>
                <option value="">— Aucun bâtiment —</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label>Tantièmes généraux *</label>
            <input
              type="number"
              value={tantiemes}
              onChange={e => setTantiemes(e.target.value)}
              placeholder="ex: 500"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Propriétaire</label>
            <select value={ownerId} onChange={e => setOwnerId(e.target.value)}>
              <option value="">— Aucun —</option>
              {owners.map(o => (
                <option key={o.id} value={o.id}>{o.display_name}</option>
              ))}
            </select>
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
