'use client';

import { useState, useCallback, useEffect } from 'react';
import { BlocCard } from './BlocCard';
import { createClient } from '@/lib/supabase/client';
import { type BlocPoste, type PendingAction } from '@/lib/ag/api/finalisation.api';
import { useAccountsAndKeys } from '@/features/ag/new/hooks/useAccountsAndKeys';
import { inferPosteCode } from '@/components/features/finance/Budget/types';
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
}

/** Revue lecture seule du budget prévisionnel voté (créé à l'étape PV). */
export function BlocBudget({ agId, action }: BlocBudgetProps) {
  const vars = action.resolution?.variables || {};
  const exercice = extractYear(vars['date_debut']);
  const montantTotal = parseFrenchAmount(vars['montant']);

  const { accounts, repartitionKeys } = useAccountsAndKeys();

  const [postes, setPostes] = useState<BlocPoste[]>([]);
  const [postesLoaded, setPostesLoaded] = useState(false);

  // Charger les postes détaillés depuis variables.budget_postes (priorité) puis opening_notes (fallback).
  useEffect(() => {
    async function loadPostes() {
      // 1. Priorité: postes depuis ag_resolutions.variables.budget_postes
      const budgetPostesFromVars = vars['budget_postes'];
      if (budgetPostesFromVars && Array.isArray(budgetPostesFromVars) && budgetPostesFromVars.length > 0) {
        const loadedPostes: BlocPoste[] = budgetPostesFromVars.map(
          (p: { poste?: string; montant?: number; accountId?: string; repartitionKeyId?: string }, idx: number) => {
            const label = p.poste || `Poste ${idx + 1}`;
            return {
              label,
              amount: p.montant || 0,
              sort_order: idx,
              code: inferPosteCode(label),
              account_id: p.accountId || undefined,
              repartition_key_id: p.repartitionKeyId || undefined,
            };
          }
        );
        setPostes(loadedPostes);
        setPostesLoaded(true);
        return;
      }

      // 2. Fallback: opening_notes (ancien mécanisme)
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
              (p: { poste?: string; montant?: number; accountId?: string; repartitionKeyId?: string }, idx: number) => {
                const label = p.poste || `Poste ${idx + 1}`;
                return {
                  label,
                  amount: p.montant || 0,
                  sort_order: idx,
                  code: inferPosteCode(label),
                  account_id: p.accountId || undefined,
                  repartition_key_id: p.repartitionKeyId || undefined,
                };
              }
            );
            setPostes(loadedPostes);
            setPostesLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.error('[BlocBudget] Error loading opening_notes:', err);
      }
      setPostesLoaded(true);
    }
    loadPostes();
  }, [agId, vars]);

  const total = postes.reduce((sum, p) => sum + p.amount, 0);

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
    <BlocCard title={`Budget prévisionnel ${exercice}`} actionType="CREATE_BUDGET" status={action.status}>
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
            <span className={styles.posteAmount}>
              {poste.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </span>
          </div>
        ))}
      </div>

      {postes.length === 0 && (
        <div className={styles.emptyHint}>Aucun poste détaillé enregistré pour ce budget.</div>
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
