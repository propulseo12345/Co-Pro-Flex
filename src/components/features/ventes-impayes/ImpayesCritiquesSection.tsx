'use client';

import Link from 'next/link';
import { AlertTriangle, Clock, Mail, Eye, ArrowRight, Send } from 'lucide-react';
import { getStatutImpayeLabel, getStatutImpayeColor } from '@/hooks/modules/useVentesImpayesPage';
import type { ImpayeCritique, ImpayeBreakdown } from '@/hooks/modules/useVentesImpayesPage';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

interface ImpayesCritiquesSectionProps {
  impayes: ImpayeCritique[];
  breakdown: ImpayeBreakdown[];
  selectedImpayes: number[];
  onToggleSelection: (id: number) => void;
  onRelanceGroupee: () => void;
}

export function ImpayesCritiquesSection({
  impayes,
  breakdown,
  selectedImpayes,
  onToggleSelection,
  onRelanceGroupee,
}: ImpayesCritiquesSectionProps) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleGroup}>
          <div className={styles.sectionIconWrapper} style={{ background: '#ef444420' }}>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} aria-hidden="true" />
          </div>
          <h2 className={styles.sectionTitle}>Impayés critiques</h2>
        </div>
        <Link href="/ventes-impayes/impayes" className={styles.viewAllLink}>
          Voir tout <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.impayesBreakdown}>
        {breakdown.map((item) => (
          <Link
            key={item.statut}
            href={`/ventes-impayes/impayes?statut=${item.statut}`}
            className={styles.breakdownItem}
            style={{ background: item.color }}
          >
            <span className={styles.breakdownLabel} style={{ color: item.textColor }}>
              {item.label}
            </span>
            <span className={styles.breakdownValue} style={{ color: item.textColor }}>
              {item.count} ({item.montant.toLocaleString('fr-FR')} €)
            </span>
          </Link>
        ))}
      </div>

      <div className={styles.impayesListe}>
        {impayes.map((impaye) => {
          const statutColor = getStatutImpayeColor(impaye.statut);
          const isSelected = selectedImpayes.includes(impaye.id);
          return (
            <div
              key={impaye.id}
              className={`${styles.impayeItem} ${isSelected ? styles.impayeSelected : ''}`}
            >
              <label className={styles.impayeCheckbox}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelection(impaye.id)}
                />
                <span className={styles.checkmark}></span>
              </label>
              <div className={styles.impayeMain}>
                <div className={styles.impayeInfo}>
                  <h4 className={styles.impayeCopro}>{impaye.coproprietaire}</h4>
                  <p className={styles.impayeLot}>{impaye.lot} - {impaye.type}</p>
                </div>
                <div className={styles.impayeData}>
                  <span className={styles.impayeMontant}>
                    {impaye.montant.toLocaleString('fr-FR')} €
                  </span>
                  <span
                    className={styles.statutBadge}
                    style={{ background: statutColor.bg, color: statutColor.text }}
                  >
                    {getStatutImpayeLabel(impaye.statut)}
                  </span>
                </div>
              </div>
              <div className={styles.impayeRetard}>
                <Clock size={12} aria-hidden="true" />
                {impaye.retard} jours
              </div>
              <div className={styles.impayeActions}>
                <button
                  className={styles.iconButton}
                  title="Envoyer une relance"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Mail size={16} aria-hidden="true" />
                </button>
                <Link
                  href={`/ventes-impayes/impayes?id=${impaye.id}`}
                  className={styles.iconButton}
                  title="Voir détails"
                >
                  <Eye size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {selectedImpayes.length > 0 && (
        <div className={styles.groupActions}>
          <span className={styles.selectionCount}>
            {selectedImpayes.length} impayé(s) sélectionné(s)
          </span>
          <button
            className={styles.relanceButton}
            onClick={onRelanceGroupee}
          >
            <Send size={16} aria-hidden="true" />
            Envoyer relances groupées
          </button>
        </div>
      )}
    </div>
  );
}
