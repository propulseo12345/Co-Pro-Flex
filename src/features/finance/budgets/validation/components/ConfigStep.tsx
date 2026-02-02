'use client';

import { ArrowRight } from 'lucide-react';
import { ModeEcheancier } from '@/types';
import type { BudgetData } from '@/lib/utils/budget';
import type { CleRepartition } from '../hooks/useBudgetValidationPage';
import styles from '@/app/(dashboard)/finance/budgets/validation/validation.module.css';

interface ConfigStepProps {
  budget: BudgetData;
  modeEcheancier: ModeEcheancier;
  cleRepartition: string;
  clesRepartition: CleRepartition[];
  onBudgetChange: (updates: Partial<BudgetData>) => void;
  onModeChange: (mode: ModeEcheancier) => void;
  onCleChange: (cle: string) => void;
  onCancel: () => void;
  onPreview: () => void;
}

export function ConfigStep({
  budget,
  modeEcheancier,
  cleRepartition,
  clesRepartition,
  onBudgetChange,
  onModeChange,
  onCleChange,
  onCancel,
  onPreview,
}: ConfigStepProps) {
  return (
    <div className={styles.content}>
      <div className="card">
        <h2 className={styles.sectionTitle}>1. Informations du budget</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>Année du budget</label>
          <input
            type="number"
            className={styles.input}
            value={budget.annee}
            onChange={(e) => onBudgetChange({ annee: parseInt(e.target.value) })}
            min={new Date().getFullYear()}
            max={new Date().getFullYear() + 5}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Montant total du budget (EUR)</label>
          <input
            type="number"
            className={styles.input}
            value={budget.montantTotal || ''}
            onChange={(e) =>
              onBudgetChange({ montantTotal: parseFloat(e.target.value) || 0 })
            }
            step="0.01"
            placeholder="Ex: 85000"
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Date de début</label>
            <input
              type="date"
              className={styles.input}
              value={budget.dateDebut}
              onChange={(e) => onBudgetChange({ dateDebut: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Date de fin</label>
            <input
              type="date"
              className={styles.input}
              value={budget.dateFin}
              onChange={(e) => onBudgetChange({ dateFin: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className={styles.sectionTitle}>2. Configuration de l&apos;échéancier</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>Mode de paiement des appels de fonds</label>
          <select
            className={styles.select}
            value={modeEcheancier}
            onChange={(e) => onModeChange(e.target.value as ModeEcheancier)}
          >
            <option value="UNE_FOIS">Paiement en une fois</option>
            <option value="SEMESTRIEL">Paiement semestriel (2 échéances)</option>
            <option value="TRIMESTRIEL">Paiement trimestriel (4 échéances)</option>
            <option value="PERSONNALISE">Échéancier personnalisé</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Clé de répartition</label>
          <select
            className={styles.select}
            value={cleRepartition}
            onChange={(e) => onCleChange(e.target.value)}
          >
            {clesRepartition.map((cle) => (
              <option key={cle.value} value={cle.value}>
                {cle.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={onCancel} className="btn btn-secondary">
          Annuler
        </button>
        <button
          onClick={onPreview}
          className="btn btn-primary"
          disabled={budget.montantTotal <= 0}
        >
          Prévisualiser <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
