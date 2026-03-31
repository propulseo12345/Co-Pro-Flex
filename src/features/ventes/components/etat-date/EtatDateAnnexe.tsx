'use client';

import { Scale, BarChart3 } from 'lucide-react';
import type { EtatDatePayloadV2 } from '../../domain/types';
import styles from './etat-date.module.css';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const NATURE_LABELS: Record<string, string> = { litigation: 'Contentieux', recovery: 'Recouvrement', other: 'Autre' };
const STATUS_LABELS: Record<string, string> = { pending: 'En attente', in_progress: 'En cours', closed: 'Clôturé', won: 'Gagné', lost: 'Perdu' };

interface EtatDateAnnexeProps {
  annexe: EtatDatePayloadV2['annexe'];
}

export function EtatDateAnnexe({ annexe }: EtatDateAnnexeProps) {
  return (
    <>
      {/* Historique charges */}
      <div className={styles.annexeSection}>
        <h4 className={styles.annexeTitle}><BarChart3 size={14} /> Historique des charges</h4>
        {annexe.historique_charges.length > 0 ? (
          <table className={styles.annexeTable}>
            <thead>
              <tr>
                <th>Exercice</th>
                <th>Prévisionnel</th>
                <th>Hors budget</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {annexe.historique_charges.map((h, i) => (
                <tr key={i}>
                  <td>{h.period_label}</td>
                  <td className="mono">{fmt(h.budget_previsionnel)}</td>
                  <td className="mono">{fmt(h.hors_budget)}</td>
                  <td className="mono">{fmt(h.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyNote}>Aucun historique disponible</p>
        )}
      </div>

      {/* Procédures judiciaires */}
      <div className={styles.annexeSection}>
        <h4 className={styles.annexeTitle}><Scale size={14} /> Procédures judiciaires</h4>
        {annexe.procedures_judiciaires.length > 0 ? (
          <table className={styles.annexeTable}>
            <thead>
              <tr>
                <th>Objet</th>
                <th>Nature</th>
                <th>Partie adverse</th>
                <th>Enjeu</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {annexe.procedures_judiciaires.map((p, i) => (
                <tr key={i}>
                  <td>{p.title}</td>
                  <td>{NATURE_LABELS[p.nature] || p.nature}</td>
                  <td>{p.opposing_party}</td>
                  <td className="mono">{fmt(p.amount_at_stake)}</td>
                  <td>{STATUS_LABELS[p.status] || p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyNote}>Aucune procédure en cours</p>
        )}
      </div>
    </>
  );
}
