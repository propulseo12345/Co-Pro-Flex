'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import clsx from 'clsx';
import type { IDPE, StatutDPE } from '@/types';
import styles from './DPEGestionnaireTable.module.css';

type StatutConfig = { label: string; iconName: 'check' | 'alert' | 'xcircle' | 'clock'; variantClass: string };

const STATUT_CONFIG: Record<StatutDPE, StatutConfig> = {
  VALIDE:         { label: 'Valide',         iconName: 'check',   variantClass: styles.badgeSuccess },
  EXPIRE_BIENTOT: { label: 'Expire bientôt', iconName: 'alert',   variantClass: styles.badgeWarning },
  EXPIRE:         { label: 'Expiré',         iconName: 'xcircle', variantClass: styles.badgeDanger  },
  MANQUANT:       { label: 'Manquant',       iconName: 'clock',   variantClass: styles.badgeNeutral },
};

function StatutIcon({ name }: { name: StatutConfig['iconName'] }) {
  if (name === 'check')   return <CheckCircle size={12} />;
  if (name === 'alert')   return <AlertTriangle size={12} />;
  if (name === 'xcircle') return <XCircle size={12} />;
  return <Clock size={12} />;
}

const CLASSE_BADGE_CLASS: Record<string, string> = {
  A: styles.classeA, B: styles.classeB, C: styles.classeC, D: styles.classeD,
  E: styles.classeE, F: styles.classeF, G: styles.classeG,
};

interface DPEGestionnaireTableProps {
  dpeList: IDPE[];
}

export function DPEGestionnaireTable({ dpeList }: DPEGestionnaireTableProps) {
  const router = useRouter();

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Copropriété</th>
            <th>Lots</th>
            <th>Classe DPE</th>
            <th>Date diagnostic</th>
            <th>Expiration</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {dpeList.map(dpe => {
            const cfg = STATUT_CONFIG[dpe.statut];
            return (
              <tr key={dpe.id} className={styles.row}>
                <td className={styles.nomCell}>{dpe.coproprieteNom}</td>
                <td className={styles.numCell}>{dpe.nbLots}</td>
                <td>
                  <span className={clsx(styles.classeBadge, CLASSE_BADGE_CLASS[dpe.classeEnergie])}>
                    {dpe.classeEnergie}
                  </span>
                </td>
                <td className={styles.dateCell}>
                  {new Date(dpe.dateDiagnostic).toLocaleDateString('fr-FR')}
                </td>
                <td className={styles.dateCell}>
                  {new Date(dpe.dateExpiration).toLocaleDateString('fr-FR')}
                </td>
                <td>
                  <span className={clsx(styles.badge, cfg.variantClass)}>
                    <StatutIcon name={cfg.iconName} />
                    {cfg.label}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.viewBtn}
                    onClick={() => router.push(`/conformite/dpe/${dpe.coproprieteId}`)}
                    aria-label={`Voir la fiche DPE de ${dpe.coproprieteNom}`}
                  >
                    <Eye size={13} /> Voir la fiche
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
