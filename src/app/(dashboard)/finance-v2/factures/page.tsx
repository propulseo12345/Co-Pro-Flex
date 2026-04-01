'use client';

import { Download, Plus, Receipt, CheckCircle, AlertTriangle, Calendar, LayoutGrid, List } from 'lucide-react';
import clsx from 'clsx';
import { useFacturesPageV2 } from '@/features/finance/factures';
import s from '@/components/features/finance-v2/finance-v2.module.css';

const STATUT_MAP: Record<string, { label: string; badgeClass: string }> = {
  BROUILLON: { label: 'Brouillon', badgeClass: 'badgeMuted' },
  A_VALIDER: { label: 'À valider', badgeClass: 'badgeInfo' },
  VALIDEE: { label: 'Validée', badgeClass: 'badgeInfo' },
  A_PAYER: { label: 'À payer', badgeClass: 'badgeWarning' },
  PAYEE: { label: 'Payée', badgeClass: 'badgeSuccess' },
};

function fmt(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function FacturesV2Page() {
  const page = useFacturesPageV2();

  if (page.isLoading) {
    return <div className={s.loading}>Chargement des factures...</div>;
  }

  const kpi = page.kpiData;

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: 24 }}>
      {/* TopBar */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <div>
            <h1 className={s.topbarTitle}>Factures fournisseurs</h1>
            <p className={s.topbarSub}>Suivi et gestion des factures prestataires</p>
          </div>
        </div>
        <div className={s.topbarActions}>
          {/* View toggle */}
          <div className={s.viewToggle}>
            <button
              className={clsx(s.viewToggleBtn, page.viewMode === 'kanban' && s.viewToggleBtnActive)}
              onClick={() => page.setViewMode('kanban')}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
            <button
              className={clsx(s.viewToggleBtn, page.viewMode === 'table' && s.viewToggleBtnActive)}
              onClick={() => page.setViewMode('table')}
            >
              <List size={14} /> Table
            </button>
          </div>
          <button className={s.btnGhost}><Download size={14} /> Export</button>
          <button className={s.btnPrimary} onClick={page.handleNewFacture}><Plus size={14} /> Nouvelle facture</button>
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiStrip}>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Factures</span><div className={s.kpiIcon}><Receipt size={18} /></div></div>
          <div className={s.kpiValue}>{kpi.nombreFactures}</div>
          <div className={s.kpiSub}>Total exercice</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Payé</span><div className={s.kpiIcon}><CheckCircle size={18} /></div></div>
          <div className={s.kpiValue}>{page.montantPaye.toLocaleString('fr-FR')}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{kpi.nombrePayees} factures</div>
        </div>
        <div className={clsx(s.kpi, s.kpiDanger)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>En Retard</span><div className={s.kpiIcon}><AlertTriangle size={18} /></div></div>
          <div className={s.kpiValue}>{kpi.montantEchu.toLocaleString('fr-FR')}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{kpi.facturesEchues} factures</div>
        </div>
        <div className={clsx(s.kpi, s.kpiWarning)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Cette Semaine</span><div className={s.kpiIcon}><Calendar size={18} /></div></div>
          <div className={s.kpiValue}>{kpi.echeancesSemaine}</div>
          <div className={s.kpiSub}>Échéances à venir</div>
        </div>
      </div>

      {/* Kanban View */}
      {page.viewMode === 'kanban' && (
        <div className={s.kanban}>
          {page.kanbanColumns.map(col => (
            <div key={col.id} className={s.kanbanCol}>
              <div className={s.kanbanColHeader}>
                <span className={s.kanbanColDot} style={{ background: col.color }} />
                <span className={s.kanbanColTitle}>{col.label}</span>
                <span className={s.kanbanColCount}>{col.factures.length}</span>
                <span className={s.kanbanColTotal}>{col.total.toLocaleString('fr-FR')}&nbsp;&euro;</span>
              </div>
              {col.factures.length === 0 ? (
                <div className={s.kanbanEmpty}>Aucune facture</div>
              ) : (
                col.factures.map(f => (
                  <div
                    key={f.id}
                    className={s.kanbanCard}
                    onClick={() => page.handleView(f)}
                  >
                    <div className={s.kanbanCardTitle}>{f.fournisseur}</div>
                    <div className={s.kanbanCardRef}>{f.reference}</div>
                    <div className={s.kanbanCardBottom}>
                      <span className={s.kanbanCardAmount}>{fmt(f.montant)}&nbsp;&euro;</span>
                      <span className={s.kanbanCardDate}>{formatDate(f.date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {page.viewMode === 'table' && (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Fournisseur</th>
              <th>Référence</th>
              <th>Poste</th>
              <th>Statut</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {page.filteredFactures.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Aucune facture</td></tr>
            ) : (
              page.filteredFactures.map(f => {
                const st = STATUT_MAP[f.statut] || { label: f.statut, badgeClass: 'badgeMuted' };
                return (
                  <tr key={f.id} onClick={() => page.handleView(f)} style={{ cursor: 'pointer' }}>
                    <td>{formatDate(f.date)}</td>
                    <td style={{ fontWeight: 600 }}>{f.fournisseur}</td>
                    <td className={s.colorMuted}>{f.reference}</td>
                    <td className={s.colorMuted}>{f.typeDepense || '—'}</td>
                    <td><span className={clsx(s.badge, s[st.badgeClass])}>{st.label}</span></td>
                    <td className={s.mono} style={{ fontWeight: 700 }}>{fmt(f.montant)}&nbsp;&euro;</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
