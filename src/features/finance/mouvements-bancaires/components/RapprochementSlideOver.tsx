'use client';

import clsx from 'clsx';
import type { MouvementBancaire, EcritureComptable, SuggestionRapprochement } from '../domain/types';
import styles from './RapprochementSlideOver.module.css';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function getConfidenceLabel(confiance: string): string {
  if (confiance === 'haute') return '98%';
  if (confiance === 'moyenne') return '45%';
  return '<30%';
}

interface RapprochementSlideOverProps {
  mouvement: MouvementBancaire;
  suggestions: SuggestionRapprochement[];
  ecrituresComptables: EcritureComptable[];
  onRapprocher: (ecritureId: string) => void;
  onClose: () => void;
}

export function RapprochementSlideOver({
  mouvement,
  suggestions,
  ecrituresComptables,
  onRapprocher,
  onClose,
}: RapprochementSlideOverProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>⚡ Rapprocher</span>
        <button className={styles.closeBtn} onClick={onClose} type="button">✕</button>
      </div>

      <div className={styles.mouvementRecap}>
        <div className={styles.recapLabel}>Mouvement</div>
        <div className={styles.recapLibelle}>{mouvement.libelle}</div>
        <div className={styles.recapFooter}>
          <span className={clsx(
            styles.recapMontant,
            mouvement.type === 'ENTREE' ? styles.recapMontantEntree : styles.recapMontantSortie
          )}>
            {mouvement.type === 'ENTREE' ? '+' : ''}{formatCurrency(mouvement.montant)}
          </span>
          <span className={styles.recapDate}>
            {new Date(mouvement.date).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      <div className={styles.suggestionsHeader}>
        <span className={styles.suggestionsTitle}>Écritures suggérées</span>
      </div>

      {suggestions.map((suggestion) => {
        const ecriture = ecrituresComptables.find(e => e.id === suggestion.ecritureId);
        if (!ecriture) return null;

        return (
          <div
            key={suggestion.ecritureId}
            className={clsx(
              styles.suggestionCard,
              suggestion.confiance === 'haute' && styles.suggestionCardHigh
            )}
          >
            <div className={styles.suggestionHeader}>
              <span className={styles.suggestionPiece}>{ecriture.piece}</span>
              <span className={clsx(
                styles.confidenceBadge,
                suggestion.confiance === 'haute' && styles.confidenceHigh,
                suggestion.confiance === 'moyenne' && styles.confidenceMedium,
                suggestion.confiance === 'basse' && styles.confidenceLow,
              )}>
                {getConfidenceLabel(suggestion.confiance)}
              </span>
            </div>
            <div className={styles.suggestionLibelle}>{ecriture.libelle}</div>
            <div className={styles.suggestionMeta}>
              {ecriture.credit > 0 ? 'Crédit' : 'Débit'} {formatCurrency(ecriture.credit > 0 ? ecriture.credit : ecriture.debit)} · {ecriture.compte} · {ecriture.journal}
            </div>
            <div className={styles.suggestionFooter}>
              <span className={clsx(
                styles.ecartLabel,
                Math.abs(suggestion.ecart) < 0.01 ? styles.ecartOk : styles.ecartWarning
              )}>
                Écart: {formatCurrency(suggestion.ecart)}
              </span>
              <button
                className={clsx(
                  styles.rapprocherBtn,
                  suggestion.confiance !== 'haute' && styles.rapprocherBtnSecondary
                )}
                onClick={() => onRapprocher(suggestion.ecritureId)}
                type="button"
              >
                Rapprocher
              </button>
            </div>
          </div>
        );
      })}

      {suggestions.length === 0 && (
        <div className={styles.emptyMessage}>
          Aucune écriture suggérée pour ce mouvement.
        </div>
      )}

      <div className={styles.manualSection}>
        <button className={styles.manualBtn} type="button">
          + Saisie manuelle d&apos;écriture
        </button>
      </div>
    </div>
  );
}
