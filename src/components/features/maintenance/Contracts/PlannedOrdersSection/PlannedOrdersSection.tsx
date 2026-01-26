'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Play, Eye, X, ChevronDown, ChevronUp, FileText, Zap } from 'lucide-react';
import { ContratDetaille, OrdreServicePlanifie, FREQUENCE_LABELS } from '@/types';
import {
  genererTousOrdresPlanifies,
  calculerStatsPlanification,
  convertirEnOrdreService
} from '@/lib/utils/planification-os';
import styles from './PlannedOrdersSection.module.css';
import clsx from 'clsx';

interface PlannedOrdersSectionProps {
  contrats: ContratDetaille[];
  onGenerateOrder?: (ordreServiceData: ReturnType<typeof convertirEnOrdreService>) => void;
}

export default function PlannedOrdersSection({ contrats, onGenerateOrder }: PlannedOrdersSectionProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState<OrdreServicePlanifie | null>(null);

  // Générer les ordres planifiés pour les 6 prochains mois
  const ordresPlanifies = useMemo(() => {
    return genererTousOrdresPlanifies(contrats, 6);
  }, [contrats]);

  // Statistiques
  const stats = useMemo(() => {
    return calculerStatsPlanification(contrats);
  }, [contrats]);

  // Grouper par mois
  const ordresParMois = useMemo(() => {
    const grouped: Record<string, OrdreServicePlanifie[]> = {};

    for (const ordre of ordresPlanifies) {
      const date = new Date(ordre.datePrevisionnelle);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(ordre);
    }

    // Trier par date au sein de chaque mois
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) =>
        new Date(a.datePrevisionnelle).getTime() - new Date(b.datePrevisionnelle).getTime()
      );
    }

    return grouped;
  }, [ordresPlanifies]);

  const formatMois = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const selectAll = () => {
    setSelectedOrders(new Set(ordresPlanifies.map(o => o.id)));
  };

  const deselectAll = () => {
    setSelectedOrders(new Set());
  };

  const handleGenerateSelected = () => {
    if (selectedOrders.size === 0) return;

    const ordersToGenerate = ordresPlanifies.filter(o => selectedOrders.has(o.id));

    for (const ordre of ordersToGenerate) {
      const contrat = contrats.find(c => c.id === ordre.contratId);
      if (contrat && onGenerateOrder) {
        const osData = convertirEnOrdreService(ordre, contrat);
        onGenerateOrder(osData);
      }
    }

    // Rediriger vers la page des ordres de service
    router.push('/maintenance/service-orders');
  };

  const handlePreviewOrder = (ordre: OrdreServicePlanifie) => {
    setShowPreview(ordre);
  };

  if (stats.totalContratsAvecPlanification === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      {/* Header avec stats */}
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.headerMain}>
          <div className={styles.headerIcon}>
            <Calendar size={20} />
          </div>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Interventions planifiées</h2>
            <p className={styles.subtitle}>
              {stats.totalContratsAvecPlanification} contrat{stats.totalContratsAvecPlanification > 1 ? 's' : ''} avec planification automatique
            </p>
          </div>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.ordresAPlanifier30Jours}</span>
            <span className={styles.statLabel}>dans 30j</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.ordresAPlanifier90Jours}</span>
            <span className={styles.statLabel}>dans 90j</span>
          </div>
          <button className={styles.toggleBtn}>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.content}>
          {/* Actions */}
          {ordresPlanifies.length > 0 && (
            <div className={styles.actions}>
              <div className={styles.selectionInfo}>
                <input
                  type="checkbox"
                  checked={selectedOrders.size === ordresPlanifies.length}
                  onChange={() => selectedOrders.size === ordresPlanifies.length ? deselectAll() : selectAll()}
                  className={styles.checkbox}
                />
                <span>
                  {selectedOrders.size > 0
                    ? `${selectedOrders.size} sélectionné${selectedOrders.size > 1 ? 's' : ''}`
                    : 'Tout sélectionner'}
                </span>
              </div>

              {selectedOrders.size > 0 && (
                <button
                  className={clsx('btn', 'btn-primary', styles.generateBtn)}
                  onClick={handleGenerateSelected}
                >
                  <Zap size={16} />
                  Générer {selectedOrders.size} ordre{selectedOrders.size > 1 ? 's' : ''} de service
                </button>
              )}
            </div>
          )}

          {/* Liste par mois */}
          <div className={styles.ordersList}>
            {Object.entries(ordresParMois).map(([moisKey, ordres]) => (
              <div key={moisKey} className={styles.moisGroup}>
                <h3 className={styles.moisTitle}>{formatMois(moisKey)}</h3>
                <div className={styles.ordresGrid}>
                  {ordres.map(ordre => {
                    const contrat = contrats.find(c => c.id === ordre.contratId);
                    const isSelected = selectedOrders.has(ordre.id);

                    return (
                      <div
                        key={ordre.id}
                        className={clsx(styles.ordreCard, isSelected && styles.ordreCardSelected)}
                      >
                        <div className={styles.ordreCheckbox}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(ordre.id)}
                            className={styles.checkbox}
                          />
                        </div>

                        <div className={styles.ordreContent}>
                          <div className={styles.ordreHeader}>
                            <span className={styles.ordreDate}>
                              <Calendar size={14} />
                              {formatDate(ordre.datePrevisionnelle)}
                            </span>
                            {contrat?.planification && (
                              <span className={styles.ordreFrequence}>
                                {FREQUENCE_LABELS[contrat.planification.frequence]}
                              </span>
                            )}
                          </div>

                          <h4 className={styles.ordreTitle}>{ordre.contratNom}</h4>
                          <p className={styles.ordreFournisseur}>{ordre.prestataireNom}</p>

                          {ordre.montantEstime !== undefined && ordre.montantEstime > 0 && (
                            <span className={styles.ordreMontant}>
                              {ordre.montantEstime.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </span>
                          )}
                        </div>

                        <div className={styles.ordreActions}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => handlePreviewOrder(ordre)}
                            title="Prévisualiser"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {ordresPlanifies.length === 0 && (
            <div className={styles.emptyState}>
              <Clock size={40} />
              <p>Aucune intervention planifiée pour les 6 prochains mois</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de prévisualisation */}
      {showPreview && (
        <div className={styles.modalOverlay} onClick={() => setShowPreview(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Aperçu de l'ordre de service</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowPreview(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.previewField}>
                <span className={styles.previewLabel}>Contrat</span>
                <span className={styles.previewValue}>{showPreview.contratNom}</span>
              </div>
              <div className={styles.previewField}>
                <span className={styles.previewLabel}>Prestataire</span>
                <span className={styles.previewValue}>{showPreview.prestataireNom}</span>
              </div>
              <div className={styles.previewField}>
                <span className={styles.previewLabel}>Date prévisionnelle</span>
                <span className={styles.previewValue}>
                  {new Date(showPreview.datePrevisionnelle).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className={styles.previewField}>
                <span className={styles.previewLabel}>Description</span>
                <p className={styles.previewDescription}>{showPreview.description}</p>
              </div>
              {showPreview.montantEstime !== undefined && showPreview.montantEstime > 0 && (
                <div className={styles.previewField}>
                  <span className={styles.previewLabel}>Montant estimé</span>
                  <span className={styles.previewValue}>
                    {showPreview.montantEstime.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowPreview(null)}
              >
                Fermer
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  toggleSelectOrder(showPreview.id);
                  setShowPreview(null);
                }}
              >
                {selectedOrders.has(showPreview.id) ? 'Désélectionner' : 'Sélectionner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
