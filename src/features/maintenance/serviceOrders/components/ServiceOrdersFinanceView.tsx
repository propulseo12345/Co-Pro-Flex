'use client';

import { useState } from 'react';
import { Search, Download, Plus } from 'lucide-react';
import clsx from 'clsx';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import styles from '@/app/(dashboard)/maintenance/maintenance.module.css';

const STATUT_CONFIG: Record<string, { label: string; color: string; badgeClass: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'var(--text-tertiary)', badgeClass: 'badgeGray' },
  A_ENVOYER: { label: 'À envoyer', color: 'var(--purple-500)', badgeClass: 'badgePurple' },
  ENVOYE: { label: 'Envoyé', color: 'var(--purple-500)', badgeClass: 'badgePurple' },
  EN_ATTENTE_PRESTATAIRE: { label: 'En attente', color: 'var(--warning)', badgeClass: 'badgeAmber' },
  REFUSE: { label: 'Refusé', color: 'var(--danger)', badgeClass: 'badgeRed' },
  INTERVENTION_PROGRAMMEE: { label: 'Programmé', color: 'var(--primary)', badgeClass: 'badgeBlue' },
  EN_COURS: { label: 'En cours', color: 'var(--warning)', badgeClass: 'badgeAmber' },
  INTERVENTION_REALISEE: { label: 'Réalisé', color: 'var(--success)', badgeClass: 'badgeGreen' },
  FACTURE: { label: 'Facturé', color: 'var(--secondary)', badgeClass: 'badgeBlue' },
  PAYE: { label: 'Payé', color: 'var(--success)', badgeClass: 'badgeGreen' },
  CLOTURE: { label: 'Clôturé', color: 'var(--text-secondary)', badgeClass: 'badgeGray' },
  ANNULE: { label: 'Annulé', color: 'var(--danger)', badgeClass: 'badgeRed' },
};

const WORKFLOW_STEPS = ['BROUILLON', 'ENVOYE', 'EN_ATTENTE_PRESTATAIRE', 'INTERVENTION_PROGRAMMEE', 'EN_COURS', 'INTERVENTION_REALISEE', 'CLOTURE'];
const WORKFLOW_LABELS = ['Brouillon', 'Envoyé', 'En attente', 'Programmé', 'En cours', 'Réalisé', 'Clôturé'];

interface OrdreService {
  id: string | null;
  numero: string | null;
  titre: string | null;
  description?: string | null;
  statut: string;
  fournisseurNom: string | null;
  montantEstime: number;
  urgence: boolean;
  date: string | null;
  dateIntervention?: string | null;
  [key: string]: unknown;
}

interface ServiceOrdersFinanceViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sortedOS: any[];
  stats: {
    total: number;
    brouillons: number;
    enAttentePrestataire: number;
    interventionProgrammee: number;
    interventionRealisee: number;
    clotures: number;
  };
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statutFilter: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setStatutFilter: (v: any) => void;
  onGoToNew: () => void;
  onGoToDetail: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ServiceOrdersFinanceView({
  sortedOS,
  stats,
  searchTerm,
  setSearchTerm,
  statutFilter,
  setStatutFilter,
  onGoToNew,
  onGoToDetail,
  onDelete,
}: ServiceOrdersFinanceViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sortedOS.find(o => o.id === selectedId) || sortedOS[0] || null;

  const enAttenteCount = stats.enAttentePrestataire;

  function getWorkflowIndex(statut: string): number {
    return WORKFLOW_STEPS.indexOf(statut);
  }

  return (
    <>
      {/* TopBar */}
      <FinanceTopBar
        title="Ordres de service"
        subtitle="Suivi des interventions et workflow"
        pill={enAttenteCount > 0
          ? { label: `${enAttenteCount} en attente`, variant: 'blue', dotVariant: 'blue' }
          : { label: 'À jour', variant: 'green', dotVariant: 'green' }
        }
        actions={
          <>
            <button className={topBarStyles.btnGhost}>
              <Download size={15} aria-hidden="true" /> Exporter
            </button>
            <button className={topBarStyles.btnPrimary} onClick={onGoToNew}>
              <Plus size={15} aria-hidden="true" /> Ordre de service
            </button>
          </>
        }
      />

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'TOTAL', value: String(stats.total), filter: 'TOUS' },
          { label: 'BROUILLONS', value: String(stats.brouillons), color: 'var(--text-tertiary)', filter: 'draft' },
          { label: 'EN ATTENTE', value: String(stats.enAttentePrestataire), color: 'var(--warning)', filter: 'pending' },
          { label: 'PROGRAMMÉS', value: String(stats.interventionProgrammee), color: 'var(--secondary)', filter: 'scheduled' },
          { label: 'RÉALISÉS', value: String(stats.interventionRealisee), color: 'var(--success)', filter: 'completed' },
          { label: 'CLÔTURÉS', value: String(stats.clotures), color: 'var(--purple-500)', filter: 'closed' },
        ].map((kpi) => {
          const isActive = statutFilter === kpi.filter;
          return (
            <button
              key={kpi.filter}
              onClick={() => setStatutFilter(kpi.filter === 'TOUS' ? 'TOUS' : kpi.filter)}
              style={{
                flex: 1, padding: '16px 20px', textAlign: 'left', fontFamily: 'inherit',
                background: isActive ? 'rgba(59,130,246,0.06)' : 'var(--surface)',
                border: isActive ? '1px solid #3b82f6' : '1px solid rgba(148,163,184,0.08)',
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color || 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                {kpi.value}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par titre, numéro, fournisseur..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className={`${styles.filterBtn} ${statutFilter === 'TOUS' ? styles.filterBtnActive : ''}`} onClick={() => setStatutFilter('TOUS')}>
          Tous ({stats.total})
        </button>
        <button className={styles.filterBtn} onClick={() => setStatutFilter(statutFilter === 'urgent' ? 'TOUS' : 'urgent')}>
          Urgence
        </button>
      </div>

      {/* Split View */}
      <div className={styles.splitView}>
        {/* List */}
        <div className={styles.splitList}>
          {sortedOS.map(os => {
            const isActive = selected?.id === os.id;
            const cfg = STATUT_CONFIG[os.statut] || { label: os.statut, color: 'var(--text-tertiary)', badgeClass: 'badgeGray' };
            const avatarBg = os.urgence ? 'rgba(239,68,68,0.15)' : `${cfg.color}22`;
            const avatarColor = os.urgence ? 'var(--danger)' : cfg.color;
            const avatarIcon = os.urgence ? '!' : os.statut === 'CLOTURE' ? '◉'
              : cfg.badgeClass === 'badgeGreen' ? '✓' : cfg.badgeClass === 'badgeAmber' ? '⏳' : '→';

            return (
              <div
                key={os.id}
                className={clsx(styles.splitItem, isActive && styles.splitItemActive)}
                onClick={() => setSelectedId(os.id)}
              >
                <div className={styles.splitItemAvatar} style={{ background: avatarBg, color: avatarColor }}>
                  {avatarIcon}
                </div>
                <div className={styles.splitItemInfo}>
                  <div className={styles.splitItemName}>{os.numero || '—'} · {os.titre || '—'}</div>
                  <div className={styles.splitItemMeta}>
                    {os.fournisseurNom}
                    {os.urgence && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>Urgence</span>}
                  </div>
                </div>
                {os.montantEstime > 0 && (
                  <span className={styles.splitItemAmount} style={{ color: 'var(--danger)' }}>
                    -{os.montantEstime.toLocaleString('fr-FR')} €
                  </span>
                )}
              </div>
            );
          })}
          {sortedOS.length === 0 && (
            <div className={styles.emptyState}>Aucun ordre de service.</div>
          )}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className={styles.splitDetail}>
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.detailRef}>{selected.numero}</div>
                <div className={styles.detailTitle}>{selected.titre}</div>
                <div className={styles.detailSub}>
                  {selected.fournisseurNom || '—'} · Créé le {selected.date ? new Date(selected.date).toLocaleDateString('fr-FR') : '—'}
                </div>
              </div>
              <span className={`${styles.badge} ${styles[STATUT_CONFIG[selected.statut]?.badgeClass || 'badgeGray']}`}>
                {selected.urgence ? 'Urgence' : STATUT_CONFIG[selected.statut]?.label || selected.statut}
              </span>
            </div>

            {/* Workflow Bar */}
            <div className={styles.workflowBar}>
              {WORKFLOW_STEPS.map((step, i) => {
                const currentIdx = getWorkflowIndex(selected.statut);
                const isDone = i < currentIdx;
                const isActive = i === currentIdx;
                return (
                  <span key={step} style={{ display: 'contents' }}>
                    <div className={clsx(
                      styles.workflowStep,
                      isDone && styles.workflowStepDone,
                      isActive && styles.workflowStepActive,
                    )}>
                      <div className={styles.workflowDot} />
                      {WORKFLOW_LABELS[i]}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className={clsx(styles.workflowLine, isDone && styles.workflowLineDone)} />
                    )}
                  </span>
                );
              })}
            </div>

            <div className={styles.detailStats}>
              <div className={styles.detailStatCard}>
                <div className={styles.detailStatValue} style={{
                  color: 'var(--danger)',
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {selected.montantEstime > 0 ? `${selected.montantEstime.toLocaleString('fr-FR')} €` : '—'}
                </div>
                <div className={styles.detailStatLabel}>Montant estimé</div>
              </div>
              <div className={styles.detailStatCard}>
                <div className={styles.detailStatValue} style={{ color: STATUT_CONFIG[selected.statut]?.color || 'var(--text-main)' }}>
                  {STATUT_CONFIG[selected.statut]?.label || selected.statut}
                </div>
                <div className={styles.detailStatLabel}>Statut</div>
              </div>
              <div className={styles.detailStatCard}>
                <div className={styles.detailStatValue} style={{ color: selected.urgence ? 'var(--danger)' : 'var(--text-main)' }}>
                  {selected.urgence ? 'Urgent' : 'Normal'}
                </div>
                <div className={styles.detailStatLabel}>Priorité</div>
              </div>
            </div>

            {selected.description && (
              <div className={`${styles.descriptionBox} ${selected.urgence ? styles.descriptionBoxRed : styles.descriptionBoxBlue}`}>
                <div className={styles.descriptionBoxLabel} style={{ color: selected.urgence ? 'var(--danger)' : 'var(--secondary)' }}>
                  Description
                </div>
                <div className={styles.descriptionBoxText}>{selected.description}</div>
              </div>
            )}

            <div className={styles.detailActions}>
              <button className={topBarStyles.btnGhost} onClick={() => selected.id && onGoToDetail(selected.id)}>
                Voir détail complet
              </button>
              <button className={topBarStyles.btnPrimary} onClick={() => selected.id && onGoToDetail(selected.id)}>
                Gérer l&apos;ordre
              </button>
              {onDelete && (
                <button
                  className={topBarStyles.btnGhost}
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  onClick={() => selected.id && onDelete(selected.id)}
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.splitDetail}>
            <div className={styles.emptyState}>Sélectionnez un ordre de service.</div>
          </div>
        )}
      </div>
    </>
  );
}
