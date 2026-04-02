'use client';

import { useState } from 'react';
import { Search, Download, Plus, FileText, AlertTriangle, X, Edit3, Calendar, User, Wrench, Euro, Tag } from 'lucide-react';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import type { UseLogbookPageReturn } from '../hooks/useLogbookPage';
import type { FiltreKpi, LogbookKpis, Intervention } from '@/components/features/maintenance/Logbook/types';
import styles from '@/app/(dashboard)/maintenance/maintenance.module.css';

const STATUT_BADGE: Record<string, { label: string; color: string; badgeClass: string }> = {
  EN_COURS: { label: 'En cours', color: 'var(--warning)', badgeClass: 'badgeAmber' },
  PLANIFIEE: { label: 'Planifiée', color: 'var(--secondary)', badgeClass: 'badgeBlue' },
  TERMINEE: { label: 'Terminée', color: 'var(--success)', badgeClass: 'badgeGreen' },
  URGENTE: { label: 'Urgent', color: 'var(--danger)', badgeClass: 'badgeRed' },
  URGENT: { label: 'Urgent', color: 'var(--danger)', badgeClass: 'badgeRed' },
};

const KPI_CONFIG: Array<{
  id: FiltreKpi;
  label: string;
  kpiKey: keyof LogbookKpis;
  color?: string;
  format?: 'currency';
}> = [
  { id: 'en_cours', label: 'EN COURS', kpiKey: 'enCours', color: 'var(--warning)' },
  { id: 'planifiees', label: 'PLANIFIÉES', kpiKey: 'planifiees' },
  { id: 'cout_annee', label: 'COÛT ANNUEL', kpiKey: 'coutAnnee', color: 'var(--danger)', format: 'currency' },
  { id: 'urgences', label: 'URGENCES', kpiKey: 'urgences', color: 'var(--danger)' },
];

interface LogbookFinanceViewProps {
  data: UseLogbookPageReturn;
}

export function LogbookFinanceView({ data }: LogbookFinanceViewProps) {
  const { header, interventionsTab } = data;
  const { kpis, filtreActif } = header;
  const [viewingIntervention, setViewingIntervention] = useState<Intervention | null>(null);
  const STATUT_ORDER: Record<string, number> = {
    URGENTE: 0, URGENT: 0, EN_COURS: 1, PLANIFIEE: 2, TERMINEE: 3,
  };
  const interventions = [...interventionsTab.interventions].sort(
    (a, b) => (STATUT_ORDER[a.statut] ?? 9) - (STATUT_ORDER[b.statut] ?? 9)
  );

  const urgenceCount = kpis.urgences;
  const enCoursCount = kpis.enCours;

  return (
    <>
      {/* TopBar Finance */}
      <FinanceTopBar
        title="Carnet d'entretien"
        subtitle="Historique des interventions et travaux"
        pill={{ label: 'À jour', variant: 'green', dotVariant: 'green' }}
        actions={
          <>
            <div style={{ position: 'relative' }}>
              <button className={topBarStyles.btnGhost} onClick={header.handlers.onToggleExportMenu}>
                <Download size={15} aria-hidden="true" /> Exporter
              </button>
              {header.showExportMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--surface)', border: '1px solid rgba(148,163,184,0.12)',
                  borderRadius: 8, padding: 4, zIndex: 10, minWidth: 180,
                }}>
                  <button
                    className={topBarStyles.btnGhost}
                    style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
                    onClick={() => header.handlers.onExport('PDF_COMPLET')}
                  >
                    <FileText size={14} aria-hidden="true" /> PDF Complet
                  </button>
                  <button
                    className={topBarStyles.btnGhost}
                    style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
                    onClick={() => header.handlers.onExport('EXCEL')}
                  >
                    <FileText size={14} aria-hidden="true" /> Excel
                  </button>
                  <button
                    className={topBarStyles.btnGhost}
                    style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
                    onClick={() => header.handlers.onExport('PDF_ACQUEREURS')}
                  >
                    <FileText size={14} aria-hidden="true" /> PDF Acquéreurs
                  </button>
                </div>
              )}
            </div>
            <button className={topBarStyles.btnPrimary} onClick={header.handlers.onNewIntervention}>
              <Plus size={15} aria-hidden="true" /> Intervention
            </button>
          </>
        }
      />

      {/* KPI Strip cliquable */}
      <div role="group" aria-label="Filtres du carnet" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {KPI_CONFIG.map((tuile) => {
          const estActif = filtreActif === tuile.id;
          const rawValue = kpis[tuile.kpiKey];
          const displayValue = tuile.format === 'currency'
            ? `${rawValue.toLocaleString('fr-FR')} €`
            : String(rawValue);

          return (
            <button
              key={tuile.id}
              type="button"
              onClick={() => header.handlers.onFiltreChange(tuile.id)}
              aria-pressed={estActif}
              aria-label={`${tuile.label} : ${displayValue}`}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: estActif ? 'rgba(59, 130, 246, 0.06)' : 'var(--surface)',
                border: estActif ? '1px solid #3b82f6' : '1px solid rgba(148, 163, 184, 0.08)',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const,
                letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 6,
              }}>
                {tuile.label}
              </div>
              <div style={{
                fontSize: 22, fontWeight: 700, color: tuile.color || 'var(--text-main)',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: tuile.format === 'currency' ? "'SF Mono', 'Fira Code', monospace" : 'inherit',
              }}>
                {displayValue}
              </div>
            </button>
          );
        })}
      </div>

      {/* Alert Banners */}
      {(enCoursCount > 0 || urgenceCount > 0) && (
        <div className={styles.banners}>
          {enCoursCount > 0 && (
            <div
              className={`${styles.banner} ${styles.bannerAmber}`}
              onClick={() => header.handlers.onFiltreChange('en_cours')}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              <span className={styles.bannerLabel}>{enCoursCount} intervention(s) en cours</span>
              <span className={styles.bannerAction}>Filtrer →</span>
            </div>
          )}
          {urgenceCount > 0 && (
            <div
              className={`${styles.banner} ${styles.bannerRed}`}
              onClick={() => header.handlers.onFiltreChange('urgences')}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              <span className={styles.bannerLabel}>{urgenceCount} urgence(s)</span>
              <span className={styles.bannerAction}>Voir →</span>
            </div>
          )}
        </div>
      )}

      {/* Filters — pill buttons like preview */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par libellé, prestataire, équipement..."
            className={styles.searchInput}
            value={interventionsTab.searchTerm}
            onChange={(e) => interventionsTab.handlers.onSearchChange(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={interventionsTab.statutFilter}
          onChange={(e) => interventionsTab.handlers.onStatutFilterChange(e.target.value)}
          style={interventionsTab.statutFilter !== 'TOUS' ? {
            background: 'rgba(59,130,246,0.12)',
            borderColor: 'rgba(59,130,246,0.4)',
            color: 'var(--primary)',
            fontWeight: 600,
          } : undefined}
        >
          <option value="TOUS">Tous statuts ({kpis.enCours + kpis.planifiees + kpis.urgences + interventionsTab.statsCategorie.global.terminees})</option>
          <option value="EN_COURS">En cours ({kpis.enCours})</option>
          <option value="PLANIFIEE">Planifiée ({kpis.planifiees})</option>
          <option value="TERMINEE">Terminée ({interventionsTab.statsCategorie.global.terminees})</option>
        </select>
        <select
          className={styles.filterSelect}
          value={interventionsTab.equipementFilter}
          onChange={(e) => interventionsTab.handlers.onEquipementFilterChange(e.target.value)}
        >
          <option value="TOUS">⚙ Équipement</option>
          {interventionsTab.equipements.map(eq => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={interventionsTab.anneeFilter}
          onChange={(e) => interventionsTab.handlers.onAnneeFilterChange(e.target.value)}
        >
          <option value="TOUS">📅 Année</option>
          {interventionsTab.years.map(year => (
            <option key={year} value={year.toString()}>{year}</option>
          ))}
        </select>
      </div>

      {/* Results summary */}
      <div className={styles.resultsSummary}>
        <span>{interventions.length} intervention(s)</span>
        <div className={styles.resultsBadges}>
          {Object.entries(
            interventions.reduce<Record<string, number>>((acc, i) => {
              acc[i.statut] = (acc[i.statut] || 0) + 1;
              return acc;
            }, {})
          ).map(([statut, count]) => {
            const cfg = STATUT_BADGE[statut];
            return cfg ? (
              <span key={statut} className={styles.resultBadge} style={{ color: cfg.color }}>
                ● {count} {cfg.label.toLowerCase()}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* Table Finance */}
      {interventions.length === 0 ? (
        <div className={styles.tableContainer}>
          <div className={styles.emptyState}>
            Aucune intervention ne correspond aux filtres sélectionnés.
          </div>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>DATE</th>
                <th>INTERVENTION</th>
                <th>ÉQUIPEMENT</th>
                <th>PRESTATAIRE</th>
                <th className={styles.thRight}>COÛT</th>
                <th>STATUT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {interventions.map(intervention => {
                const statut = STATUT_BADGE[intervention.statut] || {
                  label: intervention.statut,
                  color: 'var(--text-secondary)',
                  badgeClass: 'badgeGray',
                };
                return (
                  <tr
                    key={intervention.id}
                    onClick={() => setViewingIntervention(intervention)}
                  >
                    <td style={{ color: statut.color, fontSize: 10 }}>●</td>
                    <td className={styles.tableMeta}>
                      {new Date(intervention.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td>{intervention.titre}</td>
                    <td className={styles.tableMeta}>
                      {intervention.equipementConcerne || '—'}
                    </td>
                    <td>
                      {intervention.intervenant}
                    </td>
                    <td className={styles.tdRight} style={{
                      color: 'var(--danger)', fontWeight: 600,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {intervention.cout
                        ? `-${intervention.cout.toLocaleString('fr-FR')} €`
                        : '—'}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[statut.badgeClass]}`}>
                        {statut.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.actionLink}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingIntervention(intervention);
                        }}
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Fiche détail lecture seule */}
      {viewingIntervention && (() => {
        const v = viewingIntervention;
        const st = STATUT_BADGE[v.statut] || { label: v.statut, color: 'var(--text-secondary)', badgeClass: 'badgeGray' };
        return (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem',
            }}
            onClick={() => setViewingIntervention(null)}
          >
            <div
              style={{
                background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 560,
                border: '1px solid rgba(148,163,184,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 24px', borderBottom: '1px solid rgba(148,163,184,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={18} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
                    Détail intervention
                  </span>
                </div>
                <button
                  onClick={() => setViewingIntervention(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}
                  aria-label="Fermer"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: 24 }}>
                {/* Titre + Statut */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                      {v.titre}
                    </div>
                    {v.description && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {v.description}
                      </div>
                    )}
                  </div>
                  <span style={{
                    display: 'inline-flex', padding: '2px 10px', borderRadius: 8,
                    fontSize: 11, fontWeight: 500, flexShrink: 0, marginLeft: 12,
                    background: `${st.color}1a`, color: st.color,
                  }}>
                    {st.label}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(148,163,184,0.06)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)', fontFamily: "'SF Mono', 'Fira Code', monospace", fontVariantNumeric: 'tabular-nums' }}>
                      {v.cout ? `${v.cout.toLocaleString('fr-FR')} €` : '—'}
                    </div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginTop: 4 }}>Coût</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(148,163,184,0.06)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: st.color }}>
                      {st.label}
                    </div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginTop: 4 }}>Statut</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(148,163,184,0.06)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>
                      {v.categorie === 'COURANTE' ? 'Courante' : 'Travaux'}
                    </div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginTop: 4 }}>Catégorie</div>
                  </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={10} aria-hidden="true" /> DATE
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>
                      {new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={10} aria-hidden="true" /> INTERVENANT
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>
                      {v.intervenant}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Wrench size={10} aria-hidden="true" /> ÉQUIPEMENT
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>
                      {v.equipementConcerne || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tag size={10} aria-hidden="true" /> TYPE
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>
                      {v.type === 'ENTRETIEN' ? 'Entretien' : v.type === 'REPARATION' ? 'Réparation' : 'Inspection'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 24px', borderTop: '1px solid rgba(148,163,184,0.08)',
                display: 'flex', justifyContent: 'flex-end', gap: 8,
              }}>
                <button
                  onClick={() => setViewingIntervention(null)}
                  style={{
                    padding: '8px 16px', background: 'var(--bg-secondary)',
                    border: '1px solid rgba(148,163,184,0.08)', borderRadius: 8,
                    color: 'var(--text-main)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setViewingIntervention(null);
                    interventionsTab.handlers.onEditIntervention(v);
                  }}
                  style={{
                    padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: 8,
                    color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Edit3 size={14} aria-hidden="true" /> Modifier
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
