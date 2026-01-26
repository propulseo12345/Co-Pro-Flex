'use client';

import { FileText, Users, Eye, Edit, Trash2, TrendingUp, Vote, Send, Mail, Download } from 'lucide-react';
import { TableauResponsive, TruncatedText } from '@/components/ui';
import type { AppelFonds } from './types';
import { StatutAppelBadge } from './StatutAppelBadge';
import {
  getTypeAppelLabel,
  getTypeAppelClass,
  formatCurrency,
  formatDate,
  peutEmettreAppelFonds
} from './utils';
import styles from './appels-fonds.module.css';

interface AppelsFondsTableProps {
  appels: AppelFonds[];
  onGestionClick: (appel: AppelFonds) => void;
  onMontantClick: (appel: AppelFonds) => void;
  onViewAppel: (appel: AppelFonds) => void;
  onEditAppel: (appel: AppelFonds) => void;
  onDeleteAppel: (appel: AppelFonds) => void;
  onEmettreAppel?: (appel: AppelFonds) => void;
  onVoirRelances?: (appel: AppelFonds) => void;
  onExportAvis?: (appel: AppelFonds) => void;
}

export function AppelsFondsTable({
  appels,
  onGestionClick,
  onMontantClick,
  onViewAppel,
  onEditAppel,
  onDeleteAppel,
  onEmettreAppel,
  onVoirRelances,
  onExportAvis,
}: AppelsFondsTableProps) {
  if (appels.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyState}>
          <FileText size={48} aria-hidden="true" />
          <p>Aucun appel de fonds trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <TableauResponsive afficherIndicateurs={true}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date d'émission</th>
              <th>Description</th>
              <th>Date limite règlement</th>
              <th>Période</th>
              <th>Type</th>
              <th>Statut</th>
              <th className={styles.textRight}>Montant</th>
              <th className={styles.textCenter}>Gestion</th>
              <th className={styles.textCenter}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appels.map((appel) => (
              <tr key={appel.id}>
                <td className={styles.dateCell}>
                  {appel.dateEmission ? formatDate(appel.dateEmission) : '-'}
                </td>
                <td className={styles.descriptionCell}>
                  <div className={styles.descriptionContent}>
                    <TruncatedText text={appel.description} maxWidth={200} tooltipPosition="bottom" />
                    {appel.projetNom && (
                      <span className={styles.projetBadge}>
                        <TrendingUp size={12} aria-hidden="true" />
                        <TruncatedText text={appel.projetNom} maxWidth={100} tooltipPosition="bottom" />
                      </span>
                    )}
                    {appel.resolutionAGNumero && (
                      <span className={styles.resolutionBadge} title="Résolution AG liée">
                        <Vote size={12} aria-hidden="true" />
                        {appel.resolutionAGNumero}
                      </span>
                    )}
                  </div>
                </td>
                <td className={styles.dateCell}>{formatDate(appel.dateLimiteReglement)}</td>
                <td className={styles.periodeCell}>{appel.periode}</td>
                <td>
                  <span className={`${styles.typeBadge} ${getTypeAppelClass(appel.type)}`}>
                    {getTypeAppelLabel(appel.type)}
                  </span>
                </td>
                <td>
                  <StatutAppelBadge statut={appel.statut} size="sm" />
                </td>
                <td className={styles.textRight}>
                  <button
                    className={styles.montantButton}
                    onClick={() => onMontantClick(appel)}
                    title="Voir la répartition détaillée"
                  >
                    {formatCurrency(appel.montantTotal)}
                  </button>
                </td>
                <td className={styles.textCenter}>
                  <button
                    className={styles.gestionButton}
                    onClick={() => onGestionClick(appel)}
                  >
                    <Users size={16} aria-hidden="true" />
                    Suivre les envois
                  </button>
                </td>
                <td>
                  <div className={styles.actions}>
                    {/* Bouton Émettre - visible uniquement si statut permet l'émission */}
                    {peutEmettreAppelFonds(appel.statut) && onEmettreAppel && (
                      <button
                        className={`${styles.actionButton} ${styles.emitButton}`}
                        title="Émettre l'appel de fonds"
                        onClick={() => onEmettreAppel(appel)}
                      >
                        <Send size={16} aria-hidden="true" />
                      </button>
                    )}
                    {/* Bouton Export avis d'appel */}
                    {onExportAvis && (
                      <button
                        className={styles.actionButton}
                        title="Exporter les avis d'appel"
                        onClick={() => onExportAvis(appel)}
                      >
                        <Download size={16} aria-hidden="true" />
                      </button>
                    )}
                    {/* Bouton Historique relances */}
                    {onVoirRelances && (
                      <button
                        className={styles.actionButton}
                        title={`Historique relances${appel.historiqueRelances?.length ? ` (${appel.historiqueRelances.length})` : ''}`}
                        onClick={() => onVoirRelances(appel)}
                      >
                        <Mail size={16} aria-hidden="true" />
                      </button>
                    )}
                    {appel.devisUrl && (
                      <button
                        className={styles.actionButton}
                        title="Voir le devis"
                        onClick={() => window.open(appel.devisUrl, '_blank')}
                      >
                        <FileText size={16} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      className={styles.actionButton}
                      title="Voir l'appel"
                      onClick={() => onViewAppel(appel)}
                    >
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button
                      className={styles.actionButton}
                      title="Modifier"
                      onClick={() => onEditAppel(appel)}
                    >
                      <Edit size={16} aria-hidden="true" />
                    </button>
                    <button
                      className={styles.actionButton}
                      title="Supprimer"
                      onClick={() => onDeleteAppel(appel)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableauResponsive>
    </div>
  );
}
