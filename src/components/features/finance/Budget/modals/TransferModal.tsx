'use client';

import { useState } from 'react';
import { BudgetTravaux, FondsALUR } from '../types';
import styles from '../Budget.module.css';

interface TransferModalProps {
  fondsALUR: FondsALUR;
  budgetsTravaux: BudgetTravaux[];
  onClose: () => void;
  onTransfer: (
    montant: number,
    destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX',
    budgetId?: string
  ) => void | Promise<void>;
}

export function TransferModal({ fondsALUR, budgetsTravaux, onClose, onTransfer }: TransferModalProps) {
  const [montant, setMontant] = useState<number>(0);
  const [budgetId, setBudgetId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Seuls les budgets travaux VOTÉS (EN_COURS = DB 'validated') sont éligibles : la RPC
  // refuse les brouillons (A_VENIR) et les clôturés (TERMINE). Borne sur le solde 105 cumulé.
  const votedWorks = budgetsTravaux.filter((bt) => bt.statut === 'EN_COURS');
  const fundsEmpty = fondsALUR.soldeActuel <= 0;
  const canSubmit = !submitting && montant > 0 && montant <= fondsALUR.soldeActuel && budgetId !== '';

  const handleConfirm = async () => {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    try {
      await onTransfer(Math.round(montant * 100) / 100, 'BUDGET_TRAVAUX', budgetId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className={styles.modalTitle}>Affectation du fonds de travaux ALUR</h2>
        <p className={styles.modalSubtitle}>
          Le fonds ALUR ne peut financer que des travaux votés. Solde disponible : {fondsALUR.soldeActuel.toLocaleString('fr-FR')} €
        </p>
        {fundsEmpty && (
          <p className={styles.modalSubtitle}>
            Le fonds de travaux ALUR n&apos;est pas encore alimenté : aucune affectation possible pour l&apos;instant.
          </p>
        )}

        {!fundsEmpty && (
          <div className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label>Montant à affecter</label>
              <input
                type="number"
                placeholder="0"
                min={0}
                max={fondsALUR.soldeActuel}
                step="0.01"
                value={montant || ''}
                onChange={(e) => setMontant(Number(e.target.value))}
                aria-label="Montant à affecter"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Budget travaux voté</label>
              <select value={budgetId} onChange={(e) => setBudgetId(e.target.value)} aria-label="Budget travaux voté">
                <option value="">Sélectionner un budget travaux voté…</option>
                {votedWorks.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.titre}
                  </option>
                ))}
              </select>
              {votedWorks.length === 0 && (
                <p className={styles.modalSubtitle}>Aucun budget travaux voté disponible pour une affectation.</p>
              )}
            </div>
          </div>
        )}

        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={handleConfirm} className="btn btn-primary" disabled={!canSubmit}>
            {submitting ? 'Affectation…' : 'Affecter au budget travaux'}
          </button>
        </div>
      </div>
    </div>
  );
}
