'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileMinus2, X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { CreateAvoirParams } from '../useFactureDetailPage';
import styles from './CreateAvoirModal.module.css';

interface CreateAvoirModalProps {
  isOpen: boolean;
  reference: string;
  fournisseur: string;
  montantTotal: number;
  resteAPayer: number;
  isSubmitting: boolean;
  error: string | null;
  formatCurrency: (montant: number) => string;
  onClose: () => void;
  onSubmit: (params: CreateAvoirParams) => Promise<boolean>;
}

type AvoirMode = 'total' | 'partiel';

export function CreateAvoirModal({
  isOpen,
  reference,
  fournisseur,
  montantTotal,
  resteAPayer,
  isSubmitting,
  error,
  formatCurrency,
  onClose,
  onSubmit,
}: CreateAvoirModalProps) {
  const [mode, setMode] = useState<AvoirMode>('total');
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState('');
  const [numero, setNumero] = useState('');
  const [libelle, setLibelle] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Réinitialise le formulaire à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setMode('total');
      setMontant('');
      setDate(new Date().toISOString().split('T')[0]);
      setNumero('');
      setLibelle(`Avoir sur facture ${reference}`);
      setLocalError(null);
    }
  }, [isOpen, reference]);

  const montantEffectif = mode === 'total' ? montantTotal : parseFloat(montant || '0');
  const depasseSolde = montantEffectif > resteAPayer + 0.005;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numero.trim()) {
      setLocalError("Le numéro d'avoir (référence du fournisseur) est requis.");
      return;
    }
    if (mode === 'partiel') {
      if (!montantEffectif || Number.isNaN(montantEffectif) || montantEffectif <= 0) {
        setLocalError('Le montant de l’avoir doit être supérieur à 0.');
        return;
      }
      if (montantEffectif > montantTotal + 0.005) {
        setLocalError(`Un avoir partiel ne peut pas dépasser le montant de la facture d'origine (${formatCurrency(montantTotal)}).`);
        return;
      }
    }
    if (!date) {
      setLocalError("La date de l'avoir est requise.");
      return;
    }

    setLocalError(null);
    await onSubmit({
      montant: montantEffectif,
      date,
      numero: numero.trim(),
      libelle: libelle.trim() || `Avoir sur facture ${reference}`,
    });
  }, [numero, mode, montantEffectif, montantTotal, date, libelle, reference, formatCurrency, onSubmit]);

  if (!isOpen) return null;

  const displayedError = localError || error;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-avoir-title"
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 id="create-avoir-title" className={styles.title}>
              <FileMinus2 size={18} aria-hidden="true" />
              Créer un avoir
            </h2>
            <p className={styles.subtitle}>Facture {reference} · {fournisseur}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <fieldset className={styles.modeGroup}>
              <legend className={styles.label}>Portée de l&apos;avoir</legend>
              <label className={`${styles.modeOption} ${mode === 'total' ? styles.modeOptionActive : ''}`}>
                <input
                  type="radio"
                  name="avoir-mode"
                  value="total"
                  checked={mode === 'total'}
                  onChange={() => setMode('total')}
                />
                <span className={styles.modeOptionText}>
                  <span className={styles.modeOptionTitle}>Avoir total</span>
                  <span className={styles.modeOptionDesc}>{formatCurrency(montantTotal)} — ventilation copiée de la facture</span>
                </span>
              </label>
              <label className={`${styles.modeOption} ${mode === 'partiel' ? styles.modeOptionActive : ''}`}>
                <input
                  type="radio"
                  name="avoir-mode"
                  value="partiel"
                  checked={mode === 'partiel'}
                  onChange={() => setMode('partiel')}
                />
                <span className={styles.modeOptionText}>
                  <span className={styles.modeOptionTitle}>Avoir partiel</span>
                  <span className={styles.modeOptionDesc}>montant réparti au prorata des lignes de la facture</span>
                </span>
              </label>
            </fieldset>

            {mode === 'partiel' && (
              <div className={styles.formGroup}>
                <label htmlFor="avoir-montant" className={styles.label}>Montant TTC (€)</label>
                <input
                  id="avoir-montant"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={montantTotal}
                  placeholder="0,00"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  className={styles.input}
                />
              </div>
            )}

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="avoir-numero" className={styles.label}>Numéro d&apos;avoir</label>
                <input
                  id="avoir-numero"
                  type="text"
                  placeholder="AV-2026-001"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="avoir-date" className={styles.label}>Date de l&apos;avoir</label>
                <input
                  id="avoir-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="avoir-libelle" className={styles.label}>Libellé</label>
              <input
                id="avoir-libelle"
                type="text"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                className={styles.input}
              />
            </div>

            <p className={styles.infoNote}>
              <Info size={14} aria-hidden="true" />
              L&apos;avoir est comptabilisé immédiatement en sens inverse de la facture (la dette
              fournisseur et la charge diminuent), sur la période comptable ouverte.
            </p>

            {depasseSolde && (
              <p className={styles.warnNote}>
                <AlertTriangle size={14} aria-hidden="true" />
                L&apos;avoir dépasse le reste à payer ({formatCurrency(resteAPayer)}) : le fournisseur
                deviendra débiteur. L&apos;excédent s&apos;imputera sur une prochaine facture (ou sera remboursé).
              </p>
            )}

            {displayedError && (
              <p className={styles.errorBanner} role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                {displayedError}
              </p>
            )}
          </div>

          <footer className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSubmitting}>
              Annuler
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Création…' : `Créer l'avoir (${formatCurrency(Number.isNaN(montantEffectif) ? 0 : montantEffectif)})`}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
