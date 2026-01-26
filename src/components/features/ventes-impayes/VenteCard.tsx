'use client';

import Link from 'next/link';
import clsx from 'clsx';
import {
  Home,
  Building2,
  User,
  FileText,
  Calendar,
  Eye,
  History,
  Download,
  AlertTriangle,
  Edit,
  Send,
  CheckCircle2
} from 'lucide-react';
import type { Vente, VenteStatut, VenteEtapeWorkflow } from '@/types/models/vente';
import styles from '../../../app/(dashboard)/ventes-impayes/ventes/ventes.module.css';

const STATUT_COLORS: Record<VenteStatut, { bg: string; color: string; label: string }> = {
  EN_COURS: { bg: '#fef3c7', color: '#92400e', label: 'En cours' },
  TERMINEE: { bg: '#d1fae5', color: '#065f46', label: 'Finalisé' },
  ANNULEE: { bg: '#fee2e2', color: '#991b1b', label: 'Annulé' }
};

const WORKFLOW_STEPS: { id: VenteEtapeWorkflow; label: string; icon: typeof FileText }[] = [
  { id: 'creation', label: 'Création', icon: FileText },
  { id: 'generation', label: 'Génération docs', icon: FileText },
  { id: 'signature', label: 'Signature', icon: Edit },
  { id: 'transmission', label: 'Transmission', icon: Send },
  { id: 'notification', label: 'Notification Art.6', icon: CheckCircle2 }
];

interface VenteCardProps {
  vente: Vente;
  progress: number;
  docsManquants: number;
  onShowHistory: (vente: Vente) => void;
  onExport: (vente: Vente) => void;
}

export function VenteCard({ vente, progress, docsManquants, onShowHistory, onExport }: VenteCardProps) {
  const statutStyle = STATUT_COLORS[vente.statut];

  const getLotTypeIcon = (types: string[]) => {
    const type = types[0]?.toLowerCase() || '';
    if (type.includes('appartement')) {
      return <Building2 size={16} aria-hidden="true" />;
    }
    return <Home size={16} aria-hidden="true" />;
  };

  return (
    <div className={styles.venteCard}>
      <div className={styles.venteHeader}>
        <div className={styles.venteTitle}>
          <div className={styles.lotInfo}>
            {getLotTypeIcon(vente.lotTypes)}
            <h3>{vente.lotIds.join(', ')}</h3>
            <span className={styles.lotType}>
              {vente.lotTypes.join(', ')}
            </span>
          </div>
          <span
            className={styles.statutBadge}
            style={{ background: statutStyle.bg, color: statutStyle.color }}
          >
            {statutStyle.label}
          </span>
        </div>

        <div className={styles.venteActions}>
          <button
            className={styles.actionBtn}
            title="Historique"
            onClick={() => onShowHistory(vente)}
          >
            <History size={16} aria-hidden="true" />
          </button>
          <Link
            href={`/ventes-impayes/ventes/${vente.id}`}
            className={styles.actionBtn}
            title="Voir les détails"
          >
            <Eye size={16} aria-hidden="true" />
          </Link>
          <button
            className={styles.actionBtn}
            title="Générer fiche PDF"
            onClick={() => onExport(vente)}
          >
            <Download size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.venteContent}>
        <div className={styles.venteInfo}>
          <div className={styles.infoRow}>
            <User size={14} aria-hidden="true" />
            <span className={styles.infoLabel}>Vendeur:</span>
            <span className={styles.infoValue}>{vente.vendeur}</span>
          </div>

          {vente.acquereur && (
            <div className={styles.infoRow}>
              <User size={14} aria-hidden="true" />
              <span className={styles.infoLabel}>Acquéreur:</span>
              <span className={styles.infoValue}>{vente.acquereur}</span>
            </div>
          )}

          {vente.notaire && (
            <div className={styles.infoRow}>
              <FileText size={14} aria-hidden="true" />
              <span className={styles.infoLabel}>Notaire:</span>
              <span className={styles.infoValue}>{vente.notaire}</span>
            </div>
          )}

          {vente.dateActeAuthentique && (
            <div className={styles.infoRow}>
              <Calendar size={14} aria-hidden="true" />
              <span className={styles.infoLabel}>Acte authentique:</span>
              <span className={styles.infoValue}>
                {new Date(vente.dateActeAuthentique).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>

        <div className={styles.workflowSection}>
          <div className={styles.workflowHeader}>
            <span className={styles.workflowLabel}>Progression du workflow</span>
            <span className={styles.workflowProgress}>{Math.round(progress)}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className={styles.workflowSteps}>
            {WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = WORKFLOW_STEPS.findIndex(s => s.id === vente.etapeWorkflow) >= index;
              const isCurrent = step.id === vente.etapeWorkflow;

              return (
                <div
                  key={step.id}
                  className={clsx(
                    styles.workflowStep,
                    isActive && styles.stepActive,
                    isCurrent && styles.stepCurrent
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {docsManquants > 0 && (
          <div className={styles.alertSection}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              {docsManquants} document{docsManquants > 1 ? 's' : ''} manquant{docsManquants > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
