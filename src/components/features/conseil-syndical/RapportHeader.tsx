'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, Loader2, Clock, CheckCircle } from 'lucide-react';
import { RapportActiviteCS, StatutRapportCS } from '@/types/models/conseil-syndical';
import styles from './RapportCS.module.css';

interface RapportHeaderProps {
  rapport: RapportActiviteCS;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => Promise<void>;
  onSoumettre: () => Promise<void>;
}

function getStatutLabel(statut: StatutRapportCS): string {
  switch (statut) {
    case 'brouillon': return 'Brouillon';
    case 'en_revision': return 'En révision';
    case 'valide': return 'Validé';
    case 'publie': return 'Publié';
    case 'archive': return 'Archivé';
    default: return statut;
  }
}

export function RapportHeader({
  rapport,
  isSaving,
  hasUnsavedChanges,
  onSave,
  onSoumettre,
}: RapportHeaderProps) {
  const router = useRouter();

  const canEdit = rapport.statut === 'brouillon' || rapport.statut === 'en_revision';
  const canSubmit = rapport.statut === 'brouillon';

  const handleBack = () => {
    router.push('/conseil-syndical');
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </button>

        <div className={styles.headerInfo}>
          <h1>{rapport.titre || 'Nouveau rapport'}</h1>
          <div className={styles.headerMeta}>
            <span className={`${styles.badge} ${styles[rapport.statut]}`}>
              {getStatutLabel(rapport.statut)}
            </span>
            <span>
              {rapport.periodeDebut.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              {' - '}
              {rapport.periodeFin.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        {/* Indicateur de sauvegarde */}
        <div className={`${styles.saveIndicator} ${isSaving ? styles.saving : hasUnsavedChanges ? styles.unsaved : ''}`}>
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Sauvegarde...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <Clock size={14} />
              <span>Modifications non sauvegardées</span>
            </>
          ) : (
            <>
              <CheckCircle size={14} />
              <span>Sauvegardé</span>
            </>
          )}
        </div>

        {/* Bouton Sauvegarder */}
        {canEdit && (
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save size={16} />
            Sauvegarder
          </button>
        )}

        {/* Bouton Soumettre */}
        {canSubmit && (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={onSoumettre}
            disabled={isSaving}
          >
            <Send size={16} />
            Soumettre pour révision
          </button>
        )}
      </div>
    </header>
  );
}
