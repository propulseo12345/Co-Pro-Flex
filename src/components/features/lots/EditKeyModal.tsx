'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { RepartitionKeyWithTotals, RepartitionKeyUpdate, RepartitionBasis } from '@/lib/lots/api';
import styles from './CreateLotModal.module.css';

const BASIS_OPTIONS: { value: RepartitionBasis; label: string }[] = [
  { value: 'tantiemes', label: 'Tantièmes — basé sur les tantièmes généraux' },
  { value: 'surface', label: 'Surface — basé sur la surface des lots' },
  { value: 'custom', label: 'Personnalisé — poids définis manuellement' },
];

interface EditKeyModalProps {
  keyData: RepartitionKeyWithTotals | null;
  onClose: () => void;
  onUpdate: (keyId: string, updates: RepartitionKeyUpdate) => Promise<boolean>;
  isMutating: boolean;
}

export function EditKeyModal({ keyData, onClose, onUpdate, isMutating }: EditKeyModalProps) {
  const [name, setName] = useState('');
  const [basis, setBasis] = useState<RepartitionBasis>('tantiemes');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (keyData) {
      setName(keyData.name);
      setBasis(keyData.basis);
      setDescription(keyData.description || '');
    }
  }, [keyData]);

  const handleSave = async () => {
    if (!keyData || !name.trim()) return;

    const updates: RepartitionKeyUpdate = {
      name: name.trim(),
      basis,
      description: description.trim() || null,
    };

    const success = await onUpdate(keyData.key_id, updates);
    if (success) onClose();
  };

  if (!keyData) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Modifier la clé</h2>
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
              placeholder="ex: Charges générales"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Base de calcul</label>
            <select value={basis} onChange={e => setBasis(e.target.value as RepartitionBasis)}>
              {BASIS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Description (optionnel)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ex: Répartition des charges communes"
            />
          </div>

          <div style={{
            padding: '12px 16px',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#94a3b8',
            lineHeight: '1.5',
          }}>
            <strong style={{ color: '#60a5fa' }}>Lots couverts :</strong> {keyData.lots_with_weight_count}/{keyData.lots_count}
            <br />
            <strong style={{ color: '#60a5fa' }}>Total poids :</strong> {keyData.total_weight.toLocaleString('fr-FR')}
            {!keyData.is_complete && (
              <span style={{ color: '#fbbf24', marginLeft: 8 }}>
                ⚠ {keyData.lots_count - keyData.lots_with_weight_count} lot(s) sans poids
              </span>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button
            className={styles.submitBtn}
            onClick={handleSave}
            disabled={!name.trim() || isMutating}
          >
            {isMutating ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
