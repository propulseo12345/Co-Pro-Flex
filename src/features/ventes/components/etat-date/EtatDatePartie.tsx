'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './etat-date.module.css';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

interface PartieSection {
  label: string;
  amount: number;
  detail?: Array<Record<string, unknown>>;
}

interface EtatDatePartieProps {
  title: string;
  total: number;
  sections: PartieSection[];
}

export function EtatDatePartie({ title, total, sections }: EtatDatePartieProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const totalClass = total > 0 ? styles.partieTotalDanger : total < 0 ? styles.partieTotalSuccess : styles.partieTotal;

  return (
    <div className={styles.partieSection}>
      <div className={styles.partieHeader}>
        <span className={styles.partieTitle}>{title}</span>
        <span className={totalClass}>{fmt(total)}</span>
      </div>

      {sections.map((section, idx) => (
        // Sections dérivées à ordre figé (labels non garantis uniques par le type) :
        // index acceptable, cohérent avec les lignes de détail ci-dessous
        // eslint-disable-next-line react/no-array-index-key
        <div key={idx}>
          <div className={styles.partieRow} onClick={() => section.detail && section.detail.length > 0 && toggle(idx)}>
            <span className={styles.partieRowLabel}>
              {section.detail && section.detail.length > 0 && (
                expanded.has(idx) ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              )}
              {section.label}
            </span>
            <span className={section.amount === 0 ? styles.partieRowAmountZero : styles.partieRowAmount}>
              {fmt(section.amount)}
            </span>
          </div>

          {expanded.has(idx) && section.detail && section.detail.length > 0 && (
            <div className={styles.partieRowDetail}>
              <table className={styles.detailTable}>
                <tbody>
                  {section.detail.map((row, ridx) => {
                    const values = Object.values(row);
                    return (
                      // Lignes de détail dérivées (Record sans identifiant stable) : index acceptable
                      // eslint-disable-next-line react/no-array-index-key
                      <tr key={ridx}>
                        {values.map((val, vidx) => (
                          // Colonnes issues d'Object.values, ordre figé : index acceptable
                          // eslint-disable-next-line react/no-array-index-key
                          <td key={vidx}>
                            {typeof val === 'number' ? fmt(val) : String(val ?? '-')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
