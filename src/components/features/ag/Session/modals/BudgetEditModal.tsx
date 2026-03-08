'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { POSTES_DEPENSES, POSTE_ACCOUNT_MAPPING } from '@/features/ag/new/domain/constants';
import { useAccountsAndKeys } from '@/features/ag/new/hooks/useAccountsAndKeys';
import modalsStyles from '../styles/modals.module.css';
import styles from './BudgetEditModal.module.css';

export interface BudgetPosteItem {
  id: string;
  poste: string;
  montant: number;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  repartitionKeyId?: string;
  repartitionKeyName?: string;
}

interface BudgetEditModalProps {
  postes: BudgetPosteItem[];
  onClose: () => void;
  onSave: (postes: BudgetPosteItem[], total: number) => void;
}

export function BudgetEditModal({ postes: initialPostes, onClose, onSave }: BudgetEditModalProps) {
  const [postes, setPostes] = useState<BudgetPosteItem[]>(initialPostes);
  const [newPosteLabel, setNewPosteLabel] = useState('');
  const [newPosteMontant, setNewPosteMontant] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const { repartitionKeys } = useAccountsAndKeys();

  // Sync if initialPostes change
  useEffect(() => {
    setPostes(initialPostes);
  }, [initialPostes]);

  const total = useMemo(
    () => postes.reduce((sum, p) => sum + p.montant, 0),
    [postes]
  );

  const handleUpdateMontant = useCallback((id: string, value: string) => {
    const montant = parseFloat(value) || 0;
    setPostes(prev => prev.map(p => p.id === id ? { ...p, montant } : p));
  }, []);

  const handleUpdateKey = useCallback((id: string, keyId: string) => {
    const key = repartitionKeys.find(k => k.id === keyId);
    setPostes(prev => prev.map(p =>
      p.id === id
        ? { ...p, repartitionKeyId: keyId || undefined, repartitionKeyName: key?.name || undefined }
        : p
    ));
  }, [repartitionKeys]);

  const handleRemove = useCallback((id: string) => {
    setPostes(prev => prev.filter(p => p.id !== id));
  }, []);

  const handlePosteSelect = useCallback((value: string) => {
    if (value === 'Autre') {
      setShowCustom(true);
      setNewPosteLabel('');
    } else {
      setShowCustom(false);
      setNewPosteLabel(value);
    }
  }, []);

  const handleAdd = useCallback(() => {
    const label = newPosteLabel.trim();
    if (!label || !newPosteMontant) return;
    const montant = parseFloat(newPosteMontant);
    if (isNaN(montant) || montant <= 0) return;

    // Auto-resolve account + key from mapping
    const mapping = POSTE_ACCOUNT_MAPPING[label];
    let accountId: string | undefined;
    let accountCode: string | undefined;
    let accountName: string | undefined;
    let repartitionKeyId: string | undefined;
    let repartitionKeyName: string | undefined;

    if (mapping) {
      accountCode = mapping.accountCode;
      accountName = mapping.accountName;
      repartitionKeyName = mapping.repartitionKeyName;
      const matchedKey = repartitionKeys.find(k => k.name === mapping.repartitionKeyName);
      if (matchedKey) repartitionKeyId = matchedKey.id;
    }

    setPostes(prev => [...prev, {
      id: Date.now().toString(),
      poste: label,
      montant,
      accountId,
      accountCode,
      accountName,
      repartitionKeyId,
      repartitionKeyName,
    }]);
    setNewPosteLabel('');
    setNewPosteMontant('');
    setShowCustom(false);
  }, [newPosteLabel, newPosteMontant, repartitionKeys]);

  const handleSave = useCallback(() => {
    onSave(postes, total);
  }, [postes, total, onSave]);

  return (
    <div className={modalsStyles.modalOverlay} onClick={onClose}>
      <div
        className={modalsStyles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '700px' }}
      >
        <h2 className={modalsStyles.modalTitle}>
          <DollarSign size={24} aria-hidden="true" />
          Budget prévisionnel — Détail des postes
        </h2>

        <div className={styles.postesList}>
          {/* Header */}
          <div className={`${styles.posteRow} ${styles.headerRow}`}>
            <span>Poste</span>
            <span>Montant (€)</span>
            <span className={styles.keyHeader}>Clé de répartition</span>
            <span />
          </div>

          {/* Postes existants */}
          {postes.map(poste => (
            <div key={poste.id} className={styles.posteRow}>
              <span className={styles.posteLabel} title={poste.poste}>{poste.poste}</span>
              <input
                type="number"
                className={styles.posteInput}
                value={poste.montant || ''}
                onChange={(e) => handleUpdateMontant(poste.id, e.target.value)}
                min="0"
                step="0.01"
              />
              <select
                className={styles.posteSelect}
                value={poste.repartitionKeyId || ''}
                onChange={(e) => handleUpdateKey(poste.id, e.target.value)}
              >
                <option value="">— Aucune —</option>
                {repartitionKeys.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemove(poste.id)}
                title="Supprimer ce poste"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {postes.length === 0 && (
            <div className={styles.emptyHint}>
              Aucun poste. Ajoutez des postes de dépenses ci-dessous.
            </div>
          )}

          {/* Ligne d'ajout */}
          <div className={styles.addRow}>
            {!showCustom ? (
              <select
                className={styles.addSelect}
                value={newPosteLabel}
                onChange={(e) => handlePosteSelect(e.target.value)}
              >
                <option value="">Ajouter un poste…</option>
                {POSTES_DEPENSES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className={styles.addInput}
                placeholder="Libellé personnalisé…"
                value={newPosteLabel}
                onChange={(e) => setNewPosteLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                autoFocus
              />
            )}
            <input
              type="number"
              className={styles.addInput}
              placeholder="Montant"
              value={newPosteMontant}
              onChange={(e) => setNewPosteMontant(e.target.value)}
              min="0"
              step="0.01"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <span />
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAdd}
              disabled={!newPosteLabel.trim() || !newPosteMontant}
              title="Ajouter"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Total */}
        <div className={styles.totalRow}>
          <span>Total budget</span>
          <span className={styles.totalAmount}>
            {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className={modalsStyles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
