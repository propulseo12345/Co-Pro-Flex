'use client';

import { CheckCircle, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { ModeEcheancier, Echeance } from '@/types';
import type { BudgetData, ResolutionBudget } from '@/lib/utils/budget';
import styles from '@/app/(dashboard)/finance/budgets/validation/validation.module.css';

interface PreviewStepProps {
  budget: BudgetData;
  modeEcheancier: ModeEcheancier;
  cleRepartitionLabel: string;
  resolutionGeneree: ResolutionBudget;
  isSaving: boolean;
  currentCoproId: string | null;
  onModify: () => void;
  onValidate: () => void;
}

export function PreviewStep({
  budget,
  modeEcheancier,
  cleRepartitionLabel,
  resolutionGeneree,
  isSaving,
  currentCoproId,
  onModify,
  onValidate,
}: PreviewStepProps) {
  const getModeLabel = (mode: ModeEcheancier) => {
    switch (mode) {
      case 'TRIMESTRIEL':
        return 'Trimestriel';
      case 'SEMESTRIEL':
        return 'Semestriel';
      case 'UNE_FOIS':
        return 'Une fois';
      default:
        return 'Personnalisé';
    }
  };

  return (
    <div className={styles.content}>
      <div className="card">
        <h2 className={styles.sectionTitle}>Résolution générée automatiquement</h2>

        <div className={styles.resolutionPreview}>
          <h3 className={styles.resolutionTitle}>{resolutionGeneree.titre}</h3>
          <div className={styles.resolutionMeta}>
            <span className={styles.badge}>Article 24 - Majorité simple</span>
            <span className={styles.badge}>{cleRepartitionLabel}</span>
          </div>
          <p className={styles.resolutionText}>{resolutionGeneree.texte}</p>
        </div>
      </div>

      <div className="card">
        <h2 className={styles.sectionTitle}>Échéancier d&apos;appels de fonds</h2>

        {resolutionGeneree.echeancier && (
          <div className={styles.echeancierPreview}>
            <div className={styles.echeancierHeader}>
              <div>
                <strong>Mode :</strong> {getModeLabel(modeEcheancier)}
              </div>
              <div>
                <strong>Montant total :</strong> {budget.montantTotal.toLocaleString('fr-FR')} EUR
              </div>
              <div>
                <strong>Nombre d&apos;échéances :</strong>{' '}
                {resolutionGeneree.echeancier.echeances.length}
              </div>
            </div>

            <div className={styles.echeancesList}>
              {resolutionGeneree.echeancier.echeances.map((echeance: Echeance, index: number) => (
                <div key={echeance.id} className={styles.echeanceItem}>
                  <div className={styles.echeanceNum}>#{index + 1}</div>
                  <div className={styles.echeanceDetails}>
                    <div className={styles.echeanceDate}>
                      <Calendar size={16} aria-hidden="true" />
                      <span>
                        {new Date(echeance.dateExigibilite).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className={styles.echeanceMontant}>
                      <DollarSign size={16} aria-hidden="true" />
                      <span>{echeance.montantTotal.toLocaleString('fr-FR')} EUR</span>
                    </div>
                    {echeance.description && (
                      <div className={styles.echeanceDesc}>{echeance.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button onClick={onModify} className="btn btn-secondary">
          Modifier
        </button>
        <button
          onClick={onValidate}
          className="btn btn-primary"
          disabled={isSaving || !currentCoproId}
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle size={16} aria-hidden="true" />
          )}
          {isSaving ? 'Validation...' : 'Valider le budget'}
        </button>
      </div>
    </div>
  );
}
