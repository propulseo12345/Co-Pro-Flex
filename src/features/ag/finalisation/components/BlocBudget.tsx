'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BlocCard } from './BlocCard';
import { createBudgetFromAg, type BlocPoste } from '@/lib/ag/api/finalisation.api';
import styles from './BlocBudget.module.css';

interface BudgetPosteRaw {
  id?: string;
  poste: string;
  montant: number;
}

interface BlocBudgetProps {
  agId: string;
  exercice: number;
  postesInitiaux: BudgetPosteRaw[];
  initialStatus: 'pending' | 'activated' | 'failed';
  onActivated: () => void;
}

export function BlocBudget({ agId, exercice, postesInitiaux, initialStatus, onActivated }: BlocBudgetProps) {
  const [postes, setPostes] = useState<BlocPoste[]>(
    postesInitiaux.map((p, i) => ({ label: p.poste, amount: p.montant, sort_order: i }))
  );
  const [status, setStatus] = useState<'pending' | 'activated' | 'failed' | 'loading'>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [newPoste, setNewPoste] = useState({ label: '', amount: '' });

  const total = postes.reduce((sum, p) => sum + p.amount, 0);

  const handleAddPoste = useCallback(() => {
    if (!newPoste.label.trim() || !newPoste.amount) return;
    setPostes(prev => [...prev, {
      label: newPoste.label.trim(),
      amount: parseFloat(newPoste.amount),
      sort_order: prev.length,
    }]);
    setNewPoste({ label: '', amount: '' });
  }, [newPoste]);

  const handleRemove = useCallback((idx: number) => {
    setPostes(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sort_order: i })));
  }, []);

  const handleUpdateAmount = useCallback((idx: number, val: string) => {
    setPostes(prev => prev.map((p, i) => i === idx ? { ...p, amount: parseFloat(val) || 0 } : p));
  }, []);

  const handleConfirm = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const result = await createBudgetFromAg(agId, exercice, postes);
    if (result.success) {
      setStatus('activated');
      onActivated();
    } else {
      setStatus('failed');
      setError(result.error || 'Erreur inconnue');
    }
  }, [agId, exercice, postes, onActivated]);

  return (
    <BlocCard
      title={`Budget prévisionnel ${exercice}`}
      actionType="CREATE_BUDGET"
      status={status}
      error={error}
      onConfirm={handleConfirm}
      confirmLabel="Créer le budget"
      confirmDisabled={postes.length === 0}
    >
      <div className={styles.postesList}>
        {postes.map((poste, idx) => (
          <div key={idx} className={styles.posteItem}>
            <span className={styles.posteLabel}>{poste.label}</span>
            <input
              type="number"
              className={styles.posteAmount}
              value={poste.amount}
              onChange={e => handleUpdateAmount(idx, e.target.value)}
              disabled={status === 'activated'}
              min="0"
              step="0.01"
            />
            <span className={styles.posteSuffix}>€</span>
            {status !== 'activated' && (
              <button type="button" className={styles.removeBtn} onClick={() => handleRemove(idx)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {status !== 'activated' && (
        <div className={styles.addRow}>
          <input
            type="text"
            placeholder="Libellé du poste"
            value={newPoste.label}
            onChange={e => setNewPoste(p => ({ ...p, label: e.target.value }))}
            className={styles.addLabel}
          />
          <input
            type="number"
            placeholder="Montant"
            value={newPoste.amount}
            onChange={e => setNewPoste(p => ({ ...p, amount: e.target.value }))}
            className={styles.addAmount}
            min="0"
            step="0.01"
          />
          <button type="button" onClick={handleAddPoste} className={styles.addBtn}>
            <Plus size={14} /> Ajouter
          </button>
        </div>
      )}

      <div className={styles.total}>
        <span>Total</span>
        <span className={styles.totalAmount}>
          {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
        </span>
      </div>
    </BlocCard>
  );
}
