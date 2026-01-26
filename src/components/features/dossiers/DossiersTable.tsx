'use client';

import clsx from 'clsx';
import { Calendar, CheckCircle, Edit, Trash2 } from 'lucide-react';
import {
  IDossier,
  DossierStatut,
  DossierPriorite,
  DOSSIER_CATEGORIE_LABELS,
  DOSSIER_CATEGORIE_COLORS,
  DOSSIER_STATUT_LABELS,
  DOSSIER_STATUT_COLORS,
  DOSSIER_PRIORITE_LABELS,
  DOSSIER_PRIORITE_COLORS
} from '@/types/models/dossier';
import styles from '../../../app/(dashboard)/dossiers/dossiers.module.css';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDeadlineStatus(deadline: string, statut: DossierStatut): 'overdue' | 'soon' | 'thisWeek' | 'ok' {
  if (statut === DossierStatut.TERMINE) return 'ok';
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  if (diffDays <= 7) return 'thisWeek';
  return 'ok';
}

function getDaysLeft(deadline: string): number {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  return Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface DossiersTableProps {
  dossiers: IDossier[];
  onMarkComplete: (id: string) => void;
  onEdit: (dossier: IDossier) => void;
  onDelete: (id: string) => void;
}

export function DossiersTable({ dossiers, onMarkComplete, onEdit, onDelete }: DossiersTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Dossier</th><th>Catégorie</th><th>Statut</th><th>Priorité</th><th>Deadline</th><th className={styles.textCenter}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {dossiers.map(dossier => {
          const deadlineStatus = getDeadlineStatus(dossier.deadline, dossier.statut);
          const daysLeft = getDaysLeft(dossier.deadline);
          const isUrgent = deadlineStatus === 'overdue' || deadlineStatus === 'soon' || dossier.priorite === DossierPriorite.URGENTE;
          const isThisWeek = deadlineStatus === 'thisWeek';
          return (
            <tr key={dossier.id} className={clsx(isUrgent && styles.rowUrgent)}>
              <td>
                <div className={styles.titreCell}>
                  <div className={styles.titreLine}>
                    <span className={styles.titre}>{dossier.titre}</span>
                    {deadlineStatus === 'overdue' && <span className={styles.urgentBadge}>Urgent</span>}
                    {deadlineStatus === 'soon' && <span className={styles.soonBadge}>J-{Math.max(0, daysLeft)}</span>}
                    {isThisWeek && <span className={styles.thisWeekBadge}>Cette semaine</span>}
                  </div>
                  {dossier.description && <span className={styles.description}>{dossier.description}</span>}
                </div>
              </td>
              <td><span className={clsx(styles.badge, styles.badgeCategorie)} style={{ '--badge-bg': `${DOSSIER_CATEGORIE_COLORS[dossier.categorie]}20`, '--badge-color': DOSSIER_CATEGORIE_COLORS[dossier.categorie] } as React.CSSProperties}>{DOSSIER_CATEGORIE_LABELS[dossier.categorie]}</span></td>
              <td><span className={clsx(styles.badge, styles.badgeStatut)} style={{ '--badge-bg': `${DOSSIER_STATUT_COLORS[dossier.statut]}20`, '--badge-color': DOSSIER_STATUT_COLORS[dossier.statut] } as React.CSSProperties}>{DOSSIER_STATUT_LABELS[dossier.statut]}</span></td>
              <td><span className={clsx(styles.badge, styles.badgePriorite)} style={{ '--badge-bg': `${DOSSIER_PRIORITE_COLORS[dossier.priorite]}20`, '--badge-color': DOSSIER_PRIORITE_COLORS[dossier.priorite] } as React.CSSProperties}>{DOSSIER_PRIORITE_LABELS[dossier.priorite]}</span></td>
              <td><span className={clsx(styles.deadline, deadlineStatus === 'overdue' && styles.deadlineOverdue, deadlineStatus === 'soon' && styles.deadlineSoon, deadlineStatus === 'ok' && styles.deadlineOk)}><Calendar size={14} />{formatDate(dossier.deadline)}</span></td>
              <td className={styles.textCenter}>
                <div className={styles.actions}>
                  {dossier.statut !== DossierStatut.TERMINE && (<button className={clsx(styles.iconButton, styles.iconButtonSuccess)} onClick={() => onMarkComplete(dossier.id)} title="Marquer terminé"><CheckCircle size={16} /></button>)}
                  <button className={styles.iconButton} onClick={() => onEdit(dossier)} title="Modifier"><Edit size={16} /></button>
                  <button className={clsx(styles.iconButton, styles.iconButtonDanger)} onClick={() => onDelete(dossier.id)} title="Supprimer"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
