'use client';

import { Search, Download, Plus, FileText } from 'lucide-react';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import type { ContratDetaille } from '@/types';
import type { ContratSyndic } from '@/types/legacy';
import type { PendingRenewal } from '../hooks/useContractsPage';
import styles from '@/app/(dashboard)/maintenance/maintenance.module.css';

const STATUT_BADGE: Record<string, { label: string; badgeClass: string }> = {
  ACTIF: { label: 'Actif', badgeClass: 'badgeGreen' },
  A_RENOUVELER: { label: 'À renouveler', badgeClass: 'badgeAmber' },
  EXPIRE: { label: 'Expiré', badgeClass: 'badgeRed' },
  RESILIE: { label: 'Résilié', badgeClass: 'badgeGray' },
  BROUILLON: { label: 'Brouillon', badgeClass: 'badgeGray' },
};

const DOMAINE_COLORS: Record<string, string> = {
  ASCENSEUR: '#5b8def', MENAGE: '#3ecf8e', CHAUFFAGE: '#e5a63e',
  MAINTENANCE: '#60A5FA', ELECTRICITE: '#FBBF24', INTERPHONE: '#A78BFA',
  ESPACES_VERTS: '#34D399', ASSURANCE: '#F87171', TOITURE: '#9b8afb',
  EAU: '#60A5FA', FACADE: '#60A5FA', PORTAIL: '#34D399',
  SECURITE: '#EF4444', JURIDIQUE: '#A78BFA', AUTRE: 'var(--text-tertiary)',
};

const DOMAINE_LABELS: Record<string, string> = {
  ASCENSEUR: 'Ascenseur', MENAGE: 'Ménage', CHAUFFAGE: 'Chauffage',
  MAINTENANCE: 'Maintenance', ELECTRICITE: 'Électricité', INTERPHONE: 'Interphone',
  ESPACES_VERTS: 'Espaces verts', ASSURANCE: 'Assurance', TOITURE: 'Toiture',
  EAU: 'Eau', FACADE: 'Façade', PORTAIL: 'Portail',
  SECURITE: 'Sécurité', JURIDIQUE: 'Juridique', AUTRE: 'Autre',
};

interface ContractsFinanceViewProps {
  contrats: ContratDetaille[];
  filteredContrats: ContratDetaille[];
  contratSyndic: ContratSyndic | null;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statutFilter: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setStatutFilter: (v: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onExport: (format: any) => void;
  onAddContract: () => void;
  onEditSyndic: () => void;
  onVoirDetails: (contrat: { id: string }) => void;
  onOpenDecisionModal: (contrat: ContratDetaille) => void;
  pendingRenewals?: Record<string, PendingRenewal>;
  onConfirmerRenouvellement?: (contratId: string) => void;
  onAnnulerRenouvellement?: (contratId: string) => void;
}

export function ContractsFinanceView({
  contrats,
  filteredContrats,
  contratSyndic,
  searchTerm,
  setSearchTerm,
  statutFilter,
  setStatutFilter,
  onExport,
  onAddContract,
  onEditSyndic,
  onVoirDetails,
  onOpenDecisionModal,
  pendingRenewals = {},
  onConfirmerRenouvellement,
  onAnnulerRenouvellement,
}: ContractsFinanceViewProps) {
  const actifs = contrats.filter(c => c.statut === 'ACTIF').length;
  const expires = contrats.filter(c => c.statut === 'EXPIRE').length;
  const expirentBientot = contrats.filter(c => c.statut === 'A_RENOUVELER').length;
  const coutTotal = contrats.reduce((sum, c) => sum + (c.coutAnnuel || 0), 0);
  const prestatairesCount = new Set(contrats.map(c => c.fournisseur)).size;

  // Cost breakdown by contract type
  const costByDomain: Record<string, number> = {};
  contrats.forEach(c => {
    const domain = c.type || 'AUTRE';
    costByDomain[domain] = (costByDomain[domain] || 0) + (c.coutAnnuel || 0);
  });
  const topCosts = Object.entries(costByDomain)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <>
      {/* TopBar */}
      <FinanceTopBar
        title="Contrats de maintenance"
        subtitle="Gestion des contrats, assurances et échéances"
        pill={expirentBientot > 0
          ? { label: `${expirentBientot} expire(nt) bientôt`, variant: 'blue', dotVariant: 'blue' }
          : { label: 'À jour', variant: 'green', dotVariant: 'green' }
        }
        actions={
          <>
            <button className={topBarStyles.btnGhost} onClick={() => onExport('EXCEL')}>
              <Download size={15} aria-hidden="true" /> Exporter
            </button>
            <button className={topBarStyles.btnPrimary} onClick={onAddContract}>
              <Plus size={15} aria-hidden="true" /> Contrat
            </button>
          </>
        }
      />

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'CONTRATS ACTIFS', value: String(actifs), color: undefined },
          { label: 'EXPIRÉS', value: String(expires), color: expires > 0 ? 'var(--danger)' : undefined },
          { label: 'EXPIRENT < 90J', value: String(expirentBientot), color: expirentBientot > 0 ? 'var(--warning)' : undefined },
          { label: 'COÛT ANNUEL TOTAL', value: `${coutTotal.toLocaleString('fr-FR')} €`, color: undefined, mono: true },
          { label: 'PRESTATAIRES LIÉS', value: String(prestatairesCount), color: undefined },
        ].map((kpi, i) => (
          <div key={i} style={{
            flex: 1, padding: '16px 20px', background: 'var(--surface)',
            border: '1px solid rgba(148,163,184,0.08)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: kpi.color || 'var(--text-main)',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: kpi.mono ? "'SF Mono', 'Fira Code', monospace" : 'inherit',
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Syndic Banner */}
      {contratSyndic && (
        <div className={styles.syndicBanner}>
          <div className={styles.syndicAvatar}>
            {contratSyndic.nomSyndic.charAt(0).toUpperCase()}
          </div>
          <div className={styles.syndicInfo}>
            <div className={styles.syndicName}>{contratSyndic.nomSyndic} — Contrat principal</div>
            <div className={styles.syndicMeta}>
              Échéance : {new Date(contratSyndic.dateFin).toLocaleDateString('fr-FR')}
              {' · '}Honoraires : {contratSyndic.montantAnnuel?.toLocaleString('fr-FR')} € / an
              {' · '}Mandat en cours
            </div>
          </div>
          <button className={topBarStyles.btnGhost} onClick={onEditSyndic}>Modifier</button>
        </div>
      )}

      {/* Cost Bar */}
      {topCosts.length > 0 && (
        <div className={styles.costBar}>
          <div>
            <div className={styles.costBarTitle}>COÛT ANNUEL</div>
            <div className={styles.costBarTotal}>{coutTotal.toLocaleString('fr-FR')} €</div>
          </div>
          <div className={styles.costBarBreakdown}>
            {topCosts.map(([domain, cost]) => {
              const color = DOMAINE_COLORS[domain] || 'var(--text-secondary)';
              return (
                <div key={domain} style={{ textAlign: 'center' }}>
                  <div className={styles.costBarItemValue} style={{ color }}>{cost.toLocaleString('fr-FR')} €</div>
                  <div className={styles.costBarItemLabel}>{DOMAINE_LABELS[domain] || domain}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher un contrat, prestataire..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {['TOUS', 'ACTIF', 'A_RENOUVELER', 'EXPIRE', 'RESILIE'].map(s => (
          <button
            key={s}
            className={`${styles.filterBtn} ${statutFilter === s ? styles.filterBtnActive : ''}`}
            onClick={() => setStatutFilter(s)}
          >
            {s === 'TOUS' ? `Tous (${contrats.length})` :
             s === 'ACTIF' ? 'Actifs' :
             s === 'A_RENOUVELER' ? 'Expirent bientôt' :
             s === 'EXPIRE' ? 'Expirés' : 'Résiliés'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>CONTRAT</th>
              <th>PRESTATAIRE</th>
              <th>DOMAINE</th>
              <th>ÉCHÉANCE</th>
              <th className={styles.thRight}>COÛT / AN</th>
              <th>STATUT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredContrats.map(contrat => {
              const statut = STATUT_BADGE[contrat.statut] || { label: contrat.statut, badgeClass: 'badgeGray' };
              const isExpiring = contrat.statut === 'A_RENOUVELER' || contrat.statut === 'EXPIRE';
              const isPending = !!pendingRenewals[contrat.id];
              const domain = contrat.type || 'AUTRE';
              const domainColor = DOMAINE_COLORS[domain] || 'var(--text-tertiary)';
              const dotColor = isPending ? 'var(--primary)'
                : contrat.statut === 'ACTIF' ? 'var(--success)'
                : contrat.statut === 'A_RENOUVELER' ? 'var(--warning)'
                : contrat.statut === 'EXPIRE' ? 'var(--danger)' : 'var(--text-tertiary)';

              return (
                <tr key={contrat.id} onClick={() => onVoirDetails(contrat)}>
                  <td style={{ color: dotColor, fontSize: 10 }}>●</td>
                  <td>{contrat.nom}</td>
                  <td>{contrat.fournisseur}</td>
                  <td>
                    <span className={styles.domainTag} style={{
                      background: `${domainColor}1f`,
                      color: domainColor,
                    }}>
                      {DOMAINE_LABELS[domain] || domain}
                    </span>
                  </td>
                  <td style={{ color: isExpiring ? 'var(--warning)' : 'var(--text-secondary)' }}>
                    {new Date(contrat.dateFin).toLocaleDateString('fr-FR')}
                  </td>
                  <td className={styles.tdRight} style={{
                    fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    color: 'var(--text-main)',
                  }}>
                    {contrat.coutAnnuel?.toLocaleString('fr-FR')} €
                  </td>
                  <td>
                    {isPending ? (
                      <span className={`${styles.badge}`} style={{
                        background: 'rgba(59,130,246,0.1)', color: 'var(--secondary)',
                      }}>
                        En attente
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles[statut.badgeClass]}`}>
                        {statut.label}
                      </span>
                    )}
                  </td>
                  <td>
                    {isPending ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className={styles.actionLink} style={{ color: 'var(--success)' }} onClick={(e) => {
                          e.stopPropagation();
                          onConfirmerRenouvellement?.(contrat.id);
                        }}>
                          Activer
                        </button>
                        <button className={styles.actionLink} style={{ color: 'var(--text-tertiary)' }} onClick={(e) => {
                          e.stopPropagation();
                          onAnnulerRenouvellement?.(contrat.id);
                        }}>
                          Annuler
                        </button>
                      </div>
                    ) : isExpiring ? (
                      <button className={styles.actionLink} onClick={(e) => {
                        e.stopPropagation();
                        onOpenDecisionModal(contrat);
                      }}>
                        Renouveler
                      </button>
                    ) : (
                      <button className={styles.actionLink} onClick={(e) => {
                        e.stopPropagation();
                        onVoirDetails(contrat);
                      }}>
                        Détails
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
