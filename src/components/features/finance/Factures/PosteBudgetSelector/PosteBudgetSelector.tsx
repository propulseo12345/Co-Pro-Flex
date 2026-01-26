'use client';

import { ChevronDown, Sparkles, AlertTriangle, Info } from 'lucide-react';
import type { PosteBudget } from '../types';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import { POSTE_BUDGET_LABELS, getResteDisponible, formatCurrency } from '../utils';
import styles from './PosteBudgetSelector.module.css';

interface PosteBudgetSelectorProps {
  value?: PosteBudget;
  onChange: (poste: PosteBudget | undefined) => void;
  montantFacture: number;
  postesBudget: PosteBudgetData[];
  suggestedPoste?: PosteBudget | null;
  required?: boolean;
  disabled?: boolean;
}

const ALL_POSTES: PosteBudget[] = [
  'eau',
  'electricite',
  'assurance',
  'menage',
  'ascenseur',
  'espaces_verts',
  'divers',
];

export function PosteBudgetSelector({
  value,
  onChange,
  montantFacture,
  postesBudget,
  suggestedPoste,
  required = false,
  disabled = false,
}: PosteBudgetSelectorProps) {
  const resteDisponible = getResteDisponible(value, postesBudget);
  const isDepassement = resteDisponible !== null && montantFacture > resteDisponible;
  const pourcentageRestant = value && resteDisponible !== null
    ? (resteDisponible / (postesBudget.find(p => p.poste === value)?.budgetVote || 1)) * 100
    : null;

  const getResteStatus = (): 'ok' | 'warning' | 'danger' => {
    if (isDepassement) return 'danger';
    if (pourcentageRestant !== null && pourcentageRestant < 20) return 'warning';
    return 'ok';
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as PosteBudget | '';
    onChange(newValue === '' ? undefined : newValue);
  };

  return (
    <div className={styles.container}>
      <div className={styles.selectWrapper}>
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          className={styles.select}
        >
          <option value="">Sélectionner un poste budgétaire</option>
          {ALL_POSTES.map((poste) => {
            const posteBudget = postesBudget.find(p => p.poste === poste);
            const reste = posteBudget
              ? posteBudget.budgetVote - posteBudget.consomme
              : null;
            const isSuggested = poste === suggestedPoste;

            return (
              <option key={poste} value={poste}>
                {POSTE_BUDGET_LABELS[poste]}
                {reste !== null && ` (${formatCurrency(reste)} disponible)`}
                {isSuggested && ' - Suggéré'}
              </option>
            );
          })}
        </select>
        <ChevronDown size={16} className={styles.selectIcon} />
      </div>

      {suggestedPoste && !value && (
        <div className={`${styles.budgetInfo} ${styles.suggested}`}>
          <Sparkles size={12} className={styles.budgetInfoIcon} />
          <span>
            Suggestion : <strong>{POSTE_BUDGET_LABELS[suggestedPoste]}</strong> (basé sur le fournisseur)
          </span>
        </div>
      )}

      {value && resteDisponible !== null && (
        <div className={`${styles.resteDisponible} ${styles[getResteStatus()]}`}>
          <span className={styles.resteLabel}>
            <Info size={12} />
            Reste disponible :
          </span>
          <span className={styles.resteMontant}>
            {formatCurrency(resteDisponible)} sur {formatCurrency(postesBudget.find(p => p.poste === value)?.budgetVote || 0)}
          </span>
        </div>
      )}

      {isDepassement && value && (
        <div className={styles.alerteDepassement}>
          <AlertTriangle size={14} className={styles.alerteIcon} />
          <div className={styles.alerteText}>
            <strong>Attention : Dépassement budgétaire</strong>
            Cette facture de {formatCurrency(montantFacture)} dépasse le budget restant
            de {formatCurrency(resteDisponible || 0)} pour le poste {POSTE_BUDGET_LABELS[value]}.
            Une validation syndic sera requise.
          </div>
        </div>
      )}
    </div>
  );
}
