'use client';

import type { ModeEcheancier, Echeance } from '@/types';
import styles from '@/app/(dashboard)/ag/[id]/resolutions/new/new-resolution.module.css';

interface EcheancierSectionProps {
  modeEcheancier: ModeEcheancier;
  montantTotal: number;
  dateDebut: string;
  nombreEcheancesPersonnalisees: number;
  echeances: Echeance[];
  onModeChange: (mode: ModeEcheancier) => void;
  onMontantChange: (montant: number) => void;
  onDateDebutChange: (date: string) => void;
  onNombreEcheancesChange: (nombre: number) => void;
  onEcheanceChange: (index: number, field: 'dateExigibilite' | 'montantTotal', value: string | number) => void;
}

export function EcheancierSection({
  modeEcheancier,
  montantTotal,
  dateDebut,
  nombreEcheancesPersonnalisees,
  echeances,
  onModeChange,
  onMontantChange,
  onDateDebutChange,
  onNombreEcheancesChange,
  onEcheanceChange,
}: EcheancierSectionProps) {
  return (
    <div className={styles.echeancierSection}>
      <h3 className={styles.sectionTitle}>Echeancier d'appels de fonds</h3>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="montantTotal" className={styles.label}>
            Montant total
          </label>
          <input
            type="number"
            id="montantTotal"
            className={styles.input}
            placeholder="0.00"
            step="0.01"
            value={montantTotal || ''}
            onChange={(e) => onMontantChange(parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="dateDebut" className={styles.label}>
            Date de debut
          </label>
          <input
            type="date"
            id="dateDebut"
            className={styles.input}
            value={dateDebut}
            onChange={(e) => onDateDebutChange(e.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="modeEcheancier" className={styles.label}>
          Mode de paiement
        </label>
        <div className={styles.selectWrapper}>
          <select
            id="modeEcheancier"
            className={styles.select}
            value={modeEcheancier}
            onChange={(e) => onModeChange(e.target.value as ModeEcheancier)}
          >
            <option value="UNE_FOIS">Paiement en une fois</option>
            <option value="SEMESTRIEL">Paiement semestriel (2 echeances)</option>
            <option value="TRIMESTRIEL">Paiement trimestriel (4 echeances)</option>
            <option value="PERSONNALISE">Echeancier personnalise</option>
          </select>
        </div>
      </div>

      {modeEcheancier === 'PERSONNALISE' && (
        <div className={styles.formGroup}>
          <label htmlFor="nombreEcheances" className={styles.label}>
            Nombre d'echeances
          </label>
          <input
            type="number"
            id="nombreEcheances"
            className={styles.input}
            min="1"
            max="12"
            value={nombreEcheancesPersonnalisees}
            onChange={(e) => onNombreEcheancesChange(parseInt(e.target.value) || 2)}
          />
        </div>
      )}

      {echeances.length > 0 && (
        <div className={styles.echeancesList}>
          <h4 className={styles.echeancesTitle}>Echeances generees</h4>
          {echeances.map((echeance, index) => (
            <div key={echeance.id} className={styles.echeanceItem}>
              <div className={styles.echeanceNum}>#{index + 1}</div>
              <div className={styles.echeanceFields}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Date d'exigibilite</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={echeance.dateExigibilite}
                    onChange={(e) => onEcheanceChange(index, 'dateExigibilite', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Montant</label>
                  <input
                    type="number"
                    className={styles.input}
                    step="0.01"
                    value={echeance.montantTotal}
                    onChange={(e) => onEcheanceChange(index, 'montantTotal', parseFloat(e.target.value) || 0)}
                  />
                </div>
                {echeance.description && (
                  <div className={styles.echeanceDescription}>
                    {echeance.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
