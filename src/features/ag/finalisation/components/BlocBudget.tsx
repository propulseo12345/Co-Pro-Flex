'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BlocCard } from './BlocCard';
import { createClient } from '@/lib/supabase/client';
import { createBudgetFromAg, type BlocPoste, type PendingAction } from '@/lib/ag/api/finalisation.api';
import styles from './BlocBudget.module.css';

function parseFrenchAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/\s/g, '').replace(',', '.')) || 0;
}

function extractYear(dateDDMMYYYY: string | undefined): number {
  if (!dateDDMMYYYY) return new Date().getFullYear() + 1;
  const parts = dateDDMMYYYY.split('/');
  return parseInt(parts[2]) || new Date().getFullYear() + 1;
}

interface BlocBudgetProps {
  agId: string;
  action: PendingAction;
  onActivated: () => void;
}

export function BlocBudget({ agId, action, onActivated }: BlocBudgetProps) {
  const vars = action.resolution?.variables || {};
  const exercice = extractYear(vars['date_debut']);
  const montantTotal = parseFrenchAmount(vars['montant']);

  const [postes, setPostes] = useState<BlocPoste[]>(() =>
    montantTotal > 0
      ? [{ label: 'Budget global', amount: montantTotal, sort_order: 0 }]
      : []
  );
  // Charger les postes detailles depuis opening_notes
  useEffect(() => {
    async function loadOpeningNotes() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any;
        const { data: meeting } = await supabase
          .from('ag_meetings')
          .select('opening_notes')
          .eq('id', agId)
          .single();

        if (meeting?.opening_notes) {
          const metadata = typeof meeting.opening_notes === 'string'
            ? JSON.parse(meeting.opening_notes)
            : meeting.opening_notes;

          if (metadata.budgetPostes && Array.isArray(metadata.budgetPostes) && metadata.budgetPostes.length > 0) {
            const loadedPostes: BlocPoste[] = metadata.budgetPostes.map(
              (p: { poste?: string; montant?: number; accountId?: string; repartitionKeyId?: string }, idx: number) => ({
                label: p.poste || `Poste ${idx + 1}`,
                amount: p.montant || 0,
                sort_order: idx,
                account_id: p.accountId || undefined,
                repartition_key_id: p.repartitionKeyId || undefined,
              })
            );
            setPostes(loadedPostes);
          }
        }
      } catch (err) {
        console.error('[BlocBudget] Error loading opening_notes:', err);
      }
    }
    loadOpeningNotes();
  }, [agId]);

  const [status, setStatus] = useState<'pending' | 'activated' | 'failed' | 'loading'>(
    action.status as 'pending' | 'activated' | 'failed'
  );
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
