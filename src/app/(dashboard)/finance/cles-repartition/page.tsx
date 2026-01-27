'use client';

import { Plus, Key, Edit, Trash2, Calculator, AlertTriangle, CheckCircle, Building2, Thermometer, ArrowUpDown, MoreVertical, RefreshCw } from 'lucide-react';
import { useClesRepartitionPage, SimulationModal } from '@/features/finance';
import { LoadingState, ErrorState } from '@/components/ui/DataState/DataState';
import styles from './cles-repartition.module.css';

// Map basis to display type
const basisToType = (basis: string | undefined): string => {
  switch (basis) {
    case 'tantiemes': return 'GENERALE';
    case 'surface': return 'SURFACE';
    case 'custom': return 'PERSONNALISEE';
    default: return 'GENERALE';
  }
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  GENERALE: <Key size={18} />,
  ASCENSEUR: <ArrowUpDown size={18} />,
  CHAUFFAGE: <Thermometer size={18} />,
  BATIMENT: <Building2 size={18} />,
  PERSONNALISEE: <MoreVertical size={18} />,
  SURFACE: <Building2 size={18} />,
};

const TYPE_LABELS: Record<string, string> = {
  GENERALE: 'Générale',
  ASCENSEUR: 'Ascenseur',
  CHAUFFAGE: 'Chauffage',
  BATIMENT: 'Bâtiment',
  PERSONNALISEE: 'Personnalisée',
  SURFACE: 'Surface',
};

export default function ClesRepartitionPage() {
  const page = useClesRepartitionPage();

  // Mode Single Copro: si pas encore chargé ou en cours de chargement
  if (!page.currentCoproId || page.isLoading) {
    return (
      <div className={styles.container}>
        <LoadingState message="Chargement des clés de répartition..." />
      </div>
    );
  }

  if (page.error) {
    return (
      <div className={styles.container}>
        <ErrorState message={page.error} onRetry={page.loadCles} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Clés de répartition</h1>
          <p className={styles.subtitle}>Gérez les clés de répartition des charges entre copropriétaires</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className="btn btn-secondary"
            onClick={page.loadCles}
            disabled={page.isLoading}
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={page.isLoading ? styles.spinning : ''} aria-hidden="true" />
          </button>
          {page.isManager && (
            <button className="btn btn-primary" onClick={page.goToNew}>
              <Plus size={18} />Nouvelle clé
            </button>
          )}
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{page.stats.total}</span>
          <span className={styles.statLabel}>Clés configurées</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{page.stats.valid}</span>
          <span className={styles.statLabel}>Clés valides</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{page.stats.withAlerts}</span>
          <span className={styles.statLabel}>Clés avec alertes</span>
        </div>
      </div>

      <div className={styles.clesGrid}>
        {page.cles.map((cle) => {
          const type = basisToType(cle.basis);
          const keyId = cle.key_id;
          const totalTantiemes = cle.total_weight || 0;
          const lotsCount = cle.lots_with_weight_count || 0;

          return (
            <div key={keyId} className={styles.cleCard}>
              <div className={styles.cleHeader}>
                <div className={`${styles.cleIcon} ${styles[`icon${type}`] || ''}`}>
                  {TYPE_ICONS[type] || <Key size={18} />}
                </div>
                <div className={styles.cleInfo}>
                  <h3 className={styles.cleName}>{cle.name}</h3>
                  <span className={styles.cleCode}>{keyId.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className={styles.cleValidation}>
                  {cle.validation?.isValid ?? cle.is_complete ? (
                    <span className={styles.validBadge}>
                      <CheckCircle size={14} />Valide
                    </span>
                  ) : (
                    <span className={styles.warningBadge}>
                      <AlertTriangle size={14} />
                      {cle.validation?.warnings?.length || 1} alerte(s)
                    </span>
                  )}
                </div>
              </div>
              <p className={styles.cleDescription}>{cle.description || 'Aucune description'}</p>
              <div className={styles.cleStats}>
                <div className={styles.cleStat}>
                  <span className={styles.cleStatValue}>{totalTantiemes.toLocaleString('fr-FR')}</span>
                  <span className={styles.cleStatLabel}>Poids total</span>
                </div>
                <div className={styles.cleStat}>
                  <span className={styles.cleStatValue}>{lotsCount}</span>
                  <span className={styles.cleStatLabel}>Lots</span>
                </div>
                <div className={styles.cleStat}>
                  <span className={`${styles.cleStatValue} ${styles.typeBadge} ${styles[`type${type}`] || ''}`}>
                    {TYPE_LABELS[type] || type}
                  </span>
                  <span className={styles.cleStatLabel}>Type</span>
                </div>
              </div>
              {cle.validation && !cle.validation.isValid && cle.validation.warnings && cle.validation.warnings.length > 0 && (
                <div className={styles.cleWarnings}>
                  {cle.validation.warnings.map((warning, idx) => (
                    <div key={idx} className={styles.warningItem}>
                      <AlertTriangle size={12} />{warning}
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.cleActions}>
                <button className={styles.actionBtn} onClick={() => page.handleSimulation(cle)} title="Simuler une répartition">
                  <Calculator size={16} />Simuler
                </button>
                <button className={styles.actionBtn} onClick={() => page.goToDetail(keyId)} title="Modifier">
                  <Edit size={16} />Modifier
                </button>
                {page.isManager && (
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={() => page.openDeleteConfirm(keyId)}
                    title="Supprimer"
                    disabled={page.isMutating}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {page.cles.length === 0 && !page.isLoading && (
        <div className={styles.emptyState}>
          <Key size={64} />
          <h2>Aucune clé de répartition</h2>
          <p>Créez votre première clé de répartition pour commencer à répartir les charges.</p>
          {page.isManager && (
            <button className="btn btn-primary" onClick={page.goToNew}>
              <Plus size={18} />Créer une clé
            </button>
          )}
        </div>
      )}

      {page.deleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirmer la suppression</h3>
            <p>Êtes-vous sûr de vouloir supprimer cette clé de répartition ? Cette action est irréversible.</p>
            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={page.closeDeleteConfirm}>Annuler</button>
              <button
                className="btn btn-danger"
                onClick={() => page.handleDelete(page.deleteConfirm!)}
                disabled={page.isMutating}
              >
                {page.isMutating ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {page.simulationModal && (
        <SimulationModal
          cle={page.simulationModal.cle}
          initialMontant={page.montantSimulation}
          onMontantChange={page.setMontantSimulation}
          onClose={page.closeSimulationModal}
        />
      )}
    </div>
  );
}
