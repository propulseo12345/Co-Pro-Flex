'use client';

import { useState } from 'react';
import { X, AlertCircle, Banknote, Building2, Info, Loader2, ArrowRightLeft } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/fonds-alur/fonds-alur.module.css';

interface TransferModalProps {
  soldeActuel: number;
  worksBudgets: Array<{ id: string; name: string; remaining: number }>;
  onTransfer: (amount: number, destination: 'compte_courant' | 'budget_travaux', budgetId?: string, description?: string) => Promise<boolean>;
  onClose: () => void;
}

export function TransferModal({ soldeActuel, worksBudgets, onTransfer, onClose }: TransferModalProps) {
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState<'compte_courant' | 'budget_travaux'>('compte_courant');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount.replace(/\s/g, '').replace(',', '.')) || 0;
  const isValid = numAmount > 0 && numAmount <= soldeActuel && description.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError('');

    const success = await onTransfer(
      numAmount,
      destination,
      destination === 'budget_travaux' ? selectedBudgetId : undefined,
      description.trim()
    );

    if (success) {
      onClose();
    } else {
      setError('Erreur lors du transfert. Veuillez réessayer.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Nouveau transfert</h2>
            <p className={styles.modalSubtitle}>
              Solde disponible : {soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalContent}>
            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Montant du transfert</label>
              <div className={styles.amountInput}>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className={styles.input}
                />
                <span className={styles.inputSuffix}>€</span>
              </div>
              {numAmount > soldeActuel && (
                <span className={styles.fieldError}>Le montant dépasse le solde disponible</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Destination</label>
              <div className={styles.destinationOptions}>
                <label className={`${styles.destinationOption} ${destination === 'compte_courant' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="destination"
                    value="compte_courant"
                    checked={destination === 'compte_courant'}
                    onChange={() => setDestination('compte_courant')}
                  />
                  <Banknote size={20} />
                  <div>
                    <span className={styles.optionTitle}>Compte courant</span>
                    <span className={styles.optionDesc}>Pour financer des travaux votés en AG</span>
                  </div>
                </label>
                <label className={`${styles.destinationOption} ${destination === 'budget_travaux' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="destination"
                    value="budget_travaux"
                    checked={destination === 'budget_travaux'}
                    onChange={() => setDestination('budget_travaux')}
                  />
                  <Building2 size={20} />
                  <div>
                    <span className={styles.optionTitle}>Budget travaux</span>
                    <span className={styles.optionDesc}>Affecter à un projet spécifique</span>
                  </div>
                </label>
              </div>
            </div>

            {destination === 'budget_travaux' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Sélectionner le budget travaux</label>
                <select
                  value={selectedBudgetId}
                  onChange={(e) => setSelectedBudgetId(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Choisir un budget...</option>
                  {worksBudgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (restant: {b.remaining.toLocaleString('fr-FR')} €)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Motif du transfert *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Financement travaux ravalement façade - AG du 15/03/2026"
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.infoNote}>
              <Info size={16} />
              <p>
                Le transfert sera enregistré dans l'historique.
                Les fonds ALUR ne peuvent être utilisés que pour financer des travaux votés en AG.
              </p>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Transfert en cours...
                </>
              ) : (
                <>
                  <ArrowRightLeft size={16} />
                  Transférer {numAmount > 0 ? `${numAmount.toLocaleString('fr-FR')} €` : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
