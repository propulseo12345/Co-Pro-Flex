'use client';

import { Plus, Key, Edit, Trash2, Calculator, AlertTriangle, CheckCircle, Building2, Thermometer, ArrowUpDown, MoreVertical } from 'lucide-react';
import { useClesRepartitionPage, SimulationModal } from '@/features/finance';
import styles from './cles-repartition.module.css';

const TYPE_ICONS: Record<string, React.ReactNode> = { GENERALE: <Key size={18} />, ASCENSEUR: <ArrowUpDown size={18} />, CHAUFFAGE: <Thermometer size={18} />, BATIMENT: <Building2 size={18} />, PERSONNALISEE: <MoreVertical size={18} /> };
const TYPE_LABELS: Record<string, string> = { GENERALE: 'Générale', ASCENSEUR: 'Ascenseur', CHAUFFAGE: 'Chauffage', BATIMENT: 'Bâtiment', PERSONNALISEE: 'Personnalisée' };

export default function ClesRepartitionPage() {
  const page = useClesRepartitionPage();

  if (page.isLoading) {
    return <div className={styles.container}><div className={styles.loading}><div className={styles.spinner} /><p>Chargement des clés de répartition...</p></div></div>;
  }

  if (page.error) {
    return <div className={styles.container}><div className={styles.error}><AlertTriangle size={48} /><p>{page.error}</p><button className="btn btn-primary" onClick={page.loadCles}>Réessayer</button></div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}><h1 className={styles.title}>Clés de répartition</h1><p className={styles.subtitle}>Gérez les clés de répartition des charges entre copropriétaires</p></div>
        <button className="btn btn-primary" onClick={page.goToNew}><Plus size={18} />Nouvelle clé</button>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}><span className={styles.statValue}>{page.stats.total}</span><span className={styles.statLabel}>Clés configurées</span></div>
        <div className={styles.statCard}><span className={styles.statValue}>{page.stats.valid}</span><span className={styles.statLabel}>Clés valides</span></div>
        <div className={styles.statCard}><span className={styles.statValue}>{page.stats.withAlerts}</span><span className={styles.statLabel}>Clés avec alertes</span></div>
      </div>

      <div className={styles.clesGrid}>
        {page.cles.map((cle) => (
          <div key={cle.id} className={styles.cleCard}>
            <div className={styles.cleHeader}>
              <div className={`${styles.cleIcon} ${styles[`icon${cle.type}`]}`}>{TYPE_ICONS[cle.type]}</div>
              <div className={styles.cleInfo}><h3 className={styles.cleName}>{cle.nom}</h3><span className={styles.cleCode}>{cle.code}</span></div>
              <div className={styles.cleValidation}>
                {cle.validation?.isValid ? (<span className={styles.validBadge}><CheckCircle size={14} />Valide</span>) : (<span className={styles.warningBadge}><AlertTriangle size={14} />{cle.validation?.warnings.length || 0} alerte(s)</span>)}
              </div>
            </div>
            <p className={styles.cleDescription}>{cle.description || 'Aucune description'}</p>
            <div className={styles.cleStats}>
              <div className={styles.cleStat}><span className={styles.cleStatValue}>{cle.totalTantiemes.toLocaleString('fr-FR')}</span><span className={styles.cleStatLabel}>Tantièmes</span></div>
              <div className={styles.cleStat}><span className={styles.cleStatValue}>{cle.tantiemesParLot.length}</span><span className={styles.cleStatLabel}>Lots</span></div>
              <div className={styles.cleStat}><span className={`${styles.cleStatValue} ${styles.typeBadge} ${styles[`type${cle.type}`]}`}>{TYPE_LABELS[cle.type]}</span><span className={styles.cleStatLabel}>Type</span></div>
            </div>
            {cle.validation && !cle.validation.isValid && cle.validation.warnings.length > 0 && (
              <div className={styles.cleWarnings}>{cle.validation.warnings.map((warning, idx) => (<div key={idx} className={styles.warningItem}><AlertTriangle size={12} />{warning}</div>))}</div>
            )}
            <div className={styles.cleActions}>
              <button className={styles.actionBtn} onClick={() => page.handleSimulation(cle)} title="Simuler une répartition"><Calculator size={16} />Simuler</button>
              <button className={styles.actionBtn} onClick={() => page.goToDetail(cle.id)} title="Modifier"><Edit size={16} />Modifier</button>
              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => page.openDeleteConfirm(cle.id)} title="Supprimer"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {page.cles.length === 0 && (
        <div className={styles.emptyState}><Key size={64} /><h2>Aucune clé de répartition</h2><p>Créez votre première clé de répartition pour commencer à répartir les charges.</p><button className="btn btn-primary" onClick={page.goToNew}><Plus size={18} />Créer une clé</button></div>
      )}

      {page.deleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirmer la suppression</h3><p>Êtes-vous sûr de vouloir supprimer cette clé de répartition ? Cette action est irréversible.</p>
            <div className={styles.modalActions}><button className="btn btn-secondary" onClick={page.closeDeleteConfirm}>Annuler</button><button className="btn btn-danger" onClick={() => page.handleDelete(page.deleteConfirm!)}>Supprimer</button></div>
          </div>
        </div>
      )}

      {page.simulationModal && (
        <SimulationModal cle={page.simulationModal.cle} initialMontant={page.montantSimulation} onMontantChange={page.setMontantSimulation} onClose={page.closeSimulationModal} />
      )}
    </div>
  );
}
