'use client';

import { Scale } from 'lucide-react';
import type { EtatDatePayloadV2 } from '../../domain/types';
import styles from './etat-date.module.css';

const fmtNum = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtPct = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(n) + ' %';

interface EtatDateAnnexeProps {
  annexe: EtatDatePayloadV2['annexe_quote_part'];
}

export function EtatDateAnnexe({ annexe }: EtatDateAnnexeProps) {
  return (
    <div className={styles.annexeSection}>
      <h4 className={styles.annexeTitle}>
        <Scale size={14} /> {annexe.label}
      </h4>
      <table className={styles.annexeTable}>
        <tbody>
          <tr>
            <td>Tantièmes du lot</td>
            <td className="mono">{fmtNum(annexe.tantiemes_lot)}</td>
          </tr>
          <tr>
            <td>Tantièmes totaux de la copropriété</td>
            <td className="mono">{fmtNum(annexe.tantiemes_total)}</td>
          </tr>
          <tr>
            <td>Quote-part du lot</td>
            <td className="mono">{fmtPct(annexe.owner_share_pct)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
