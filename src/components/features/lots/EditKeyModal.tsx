'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { RepartitionKeyWithTotals, RepartitionKeyUpdate, RepartitionBasis, CoverageMode } from '@/lib/lots/api';
import styles from './CreateLotModal.module.css';

const BASIS_OPTIONS: { value: RepartitionBasis; label: string }[] = [
  { value: 'tantiemes', label: 'Tantièmes — basé sur les tantièmes généraux' },
  { value: 'surface', label: 'Surface — basé sur la surface (m²) de chaque lot' },
  { value: 'custom', label: 'Personnalisé — poids définis manuellement' },
];

const COVERAGE_OPTIONS: { value: CoverageMode; label: string }[] = [
  { value: 'subset', label: 'Certains lots — seuls les lots avec un tantième' },
  { value: 'all_lots', label: 'Tous les lots — l\'ensemble des lots' },
];

interface EditKeyModalProps {
  keyData: RepartitionKeyWithTotals | null;
  onClose: () => void;
  onUpdate: (keyId: string, updates: RepartitionKeyUpdate) => Promise<boolean>;
  onDelete?: (keyId: string) => Promise<boolean>;
  isMutating: boolean;
}

export function EditKeyModal({ keyData, onClose, onUpdate, onDelete, isMutating }: EditKeyModalProps) {
  const [name, setName] = useState('');
  const [basis, setBasis] = useState<RepartitionBasis>('tantiemes');
  const [coverageMode, setCoverageMode] = useState<CoverageMode>('all_lots');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (keyData) {
      setName(keyData.name);
      setBasis(keyData.basis);
      setCoverageMode(keyData.coverage_mode);
      setDescription(keyData.description || '');
    }
  }, [keyData]);

  const handleSave = async () => {
    if (!keyData || !name.trim()) return;

    const updates: RepartitionKeyUpdate = {
      name: name.trim(),
      basis,
      coverage_mode: coverageMode,
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
            <label>Portée de la clé</label>
            <select value={coverageMode} onChange={e => setCoverageMode(e.target.value as CoverageMode)}>
              {COVERAGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
          }}>
            <strong style={{ color: 'var(--secondary)' }}>Lots couverts :</strong> {keyData.lots_with_weight_count}/{keyData.lots_count}
            <br />
            <strong style={{ color: 'var(--secondary)' }}>Total poids :</strong> {keyData.total_weight.toLocaleString('fr-FR')}
            {!keyData.is_complete && (
              <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                ⚠ {keyData.lots_count - keyData.lots_with_weight_count} lot(s) sans poids
              </span>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          {onDelete && (
            <button
              className={styles.cancelBtn}
              style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              onClick={() => {
                if (keyData && window.confirm(`Supprimer la clé "${keyData.name}" ? Cette action est irréversible.`)) {
                  onDelete(keyData.key_id).then(success => { if (success) onClose(); });
                }
              }}
              disabled={isMutating}
            >
              Supprimer
            </button>
          )}
          <div style={{ flex: 1 }} />
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
