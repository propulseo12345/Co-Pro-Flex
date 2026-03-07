'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BlocCard } from './BlocCard';
import { createClient } from '@/lib/supabase/client';
import { createBudgetFromAg, type BlocPoste, type PendingAction } from '@/lib/ag/api/finalisation.api';
import { useAccountsAndKeys } from '@/features/ag/new/hooks/useAccountsAndKeys';
import { POSTES_DEPENSES, POSTE_ACCOUNT_MAPPING } from '@/features/ag/new/domain/constants';
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

  const { accounts, repartitionKeys, findAccountByCode, findKeyByName } = useAccountsAndKeys();

  const [postes, setPostes] = useState<BlocPoste[]>([]);
  const [postesLoaded, setPostesLoaded] = useState(false);

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
            setPostesLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.error('[BlocBudget] Error loading opening_notes:', err);
      }
      // Fallback: pas de postes detailles, liste vide (le syndic les ajoutera ici)
      setPostesLoaded(true);
    }
    loadOpeningNotes();
  }, [agId]);

  const [status, setStatus] = useState<'pending' | 'activated' | 'failed' | 'loading'>(
    action.status as 'pending' | 'activated' | 'failed'
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedPoste, setSelectedPoste] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [newAmount, setNewAmount] = useState('');

  const total = postes.reduce((sum, p) => sum + p.amount, 0);

  const resolveAccountData = useCallback((posteName: string) => {
    const mapping = POSTE_ACCOUNT_MAPPING[posteName];
    if (!mapping) return {};
    const account = findAccountByCode(mapping.accountCode);
    const key = findKeyByName(mapping.repartitionKeyName);
    return {
      account_id: account?.id,
      repartition_key_id: key?.id,
    };
  }, [findAccountByCode, findKeyByName]);

  const handlePosteSelect = useCallback((value: string) => {
    if (value === 'Autre') {
      setShowCustom(true);
      setSelectedPoste('');
      setCustomLabel('');
    } else {
      setShowCustom(false);
      setSelectedPoste(value);
    }
  }, []);

  const handleAddPoste = useCallback(() => {
    const label = showCustom ? customLabel.trim() : selectedPoste;
    if (!label || !newAmount) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    const accountData = resolveAccountData(label);

    setPostes(prev => [...prev, {
      label,
      amount,
      sort_order: prev.length,
      ...accountData,
    }]);
    setSelectedPoste('');
    setCustomLabel('');
    setShowCustom(false);
    setNewAmount('');
  }, [showCustom, customLabel, selectedPoste, newAmount, resolveAccountData]);

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

  // Trouver le nom du compte par son ID
  const getAccountLabel = useCallback((accountId?: string) => {
    if (!accountId) return null;
    const acc = accounts.find(a => a.id === accountId);
    return acc ? `${acc.code}` : null;
  }, [accounts]);

  const getKeyLabel = useCallback((keyId?: string) => {
    if (!keyId) return null;
    const key = repartitionKeys.find(k => k.id === keyId);
    return key ? key.name : null;
  }, [repartitionKeys]);

  if (!postesLoaded) {
    return (
      <BlocCard title={`Budget prévisionnel ${exercice}`} actionType="CREATE_BUDGET" status="pending">
        <p className={styles.loading}>Chargement des postes…</p>
      </BlocCard>
    );
  }

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
      {montantTotal > 0 && (
        <div className={styles.budgetRef}>
          Montant voté : {montantTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
        </div>
      )}

      <div className={styles.postesList}>
        {postes.map((poste, idx) => (
          <div key={idx} className={styles.posteItem}>
            <span className={styles.posteLabel}>
              {poste.label}
              {(getAccountLabel(poste.account_id) || getKeyLabel(poste.repartition_key_id)) && (
                <span className={styles.posteMeta}>
                  {getAccountLabel(poste.account_id) && <span>Cpt {getAccountLabel(poste.account_id)}</span>}
                  {getKeyLabel(poste.repartition_key_id) && <span>{getKeyLabel(poste.repartition_key_id)}</span>}
                </span>
              )}
            </span>
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

      {postes.length === 0 && status !== 'activated' && (
        <div className={styles.emptyHint}>
          Ajoutez les postes de dépenses pour détailler le budget.
        </div>
      )}

      {status !== 'activated' && (
        <div className={styles.addRow}>
          {!showCustom ? (
            <select
              value={selectedPoste}
              onChange={e => handlePosteSelect(e.target.value)}
              className={styles.addSelect}
            >
              <option value="">Sélectionner un poste…</option>
              {POSTES_DEPENSES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Libellé personnalisé…"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              className={styles.addLabel}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPoste(); } }}
            />
          )}
          <input
            type="number"
            placeholder="Montant"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            className={styles.addAmount}
            min="0"
            step="0.01"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPoste(); } }}
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
