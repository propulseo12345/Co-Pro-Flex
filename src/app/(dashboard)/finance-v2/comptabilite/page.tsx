'use client';

import { Download, FileSpreadsheet, Copy, Lock } from 'lucide-react';
import clsx from 'clsx';
import { useComptabilitePage } from '@/features/finance/comptabilite';
import s from '@/components/features/finance-v2/finance-v2.module.css';

type TabCompta = 'grand-livre' | 'livre-comptable' | 'balance' | 'compte-gestion' | 'annexe-1' | 'annexe-2' | 'annexe-3' | 'annexe-4' | 'annexe-5';

const TABS: { id: TabCompta; label: string }[] = [
  { id: 'grand-livre', label: 'Grand Livre' },
  { id: 'livre-comptable', label: 'Livre comptable' },
  { id: 'balance', label: 'Balance' },
  { id: 'compte-gestion', label: 'Compte de gestion' },
  { id: 'annexe-1', label: 'Annexe 1' },
  { id: 'annexe-2', label: 'Annexe 2' },
  { id: 'annexe-3', label: 'Annexe 3' },
  { id: 'annexe-4', label: 'Annexe 4' },
  { id: 'annexe-5', label: 'Annexe 5' },
];

function fmt(n: number): string {
  return n > 0 ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

export default function ComptabiliteV2Page() {
  const page = useComptabilitePage();

  if (page.isLoading) {
    return <div className={s.loading}>Chargement de la comptabilité...</div>;
  }

  if (page.error) {
    return <div className={s.loading}>Erreur : {String(page.error)}</div>;
  }

  const periodLabel = page.openPeriod
    ? `${new Date(page.openPeriod.start_date).getFullYear()} — ${page.openPeriod.status === 'open' ? 'Ouvert' : 'Clôturé'}`
    : 'Aucune période';

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: 24 }}>
      {/* TopBar */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <div>
            <h1 className={s.topbarTitle}>Comptabilité</h1>
            <p className={s.topbarSub}>Exercice en cours</p>
          </div>
          <span className={clsx(s.pill, page.openPeriod?.status === 'open' ? s.pillGreen : s.pillBlue)}>
            <span className={s.pillDot} style={{ background: page.openPeriod?.status === 'open' ? '#34d399' : '#adc6ff' }} />
            {periodLabel}
          </span>
        </div>
        <div className={s.topbarActions}>
          <button className={s.btnIcon} title="Export PDF"><Download size={16} /></button>
          <button className={s.btnIcon} title="Export Excel"><FileSpreadsheet size={16} /></button>
          <button className={s.btnIcon} title="Copier"><Copy size={16} /></button>
          {page.openPeriod?.status === 'open' && !page.isReadOnly && (
            <button className={s.btnDanger} onClick={() => page.setShowClotureModal(true)}>
              <Lock size={14} /> Clôturer {page.openPeriod ? new Date(page.openPeriod.start_date).getFullYear() : ''}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiStrip}>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Débit</span><div className={s.kpiIcon}><Download size={18} /></div></div>
          <div className={s.kpiValue}>{page.totalDebit.toLocaleString('fr-FR')}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{page.filteredOperations.length} écritures</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Crédit</span><div className={s.kpiIcon}><Download size={18} style={{ transform: 'rotate(180deg)' }} /></div></div>
          <div className={s.kpiValue}>{page.totalCredit.toLocaleString('fr-FR')}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{page.isBalanced ? 'Balance équilibrée' : `Écart: ${page.ecart.toLocaleString('fr-FR')} €`}</div>
        </div>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Écritures</span><div className={s.kpiIcon}><FileSpreadsheet size={18} /></div></div>
          <div className={s.kpiValue}>{page.operations.length}</div>
          <div className={s.kpiSub} style={{ color: '#34d399' }}>&#10003; Toutes comptabilisées</div>
        </div>
        <div className={clsx(s.kpi, page.isBalanced ? s.kpiSuccess : s.kpiDanger)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>État Balance</span><div className={s.kpiIcon}><Copy size={18} /></div></div>
          <div className={s.kpiValue}>{page.isBalanced ? 'Équilibrée' : 'Déséquilibrée'}</div>
          <div className={s.kpiSub}>{page.isBalanced ? 'Débit = Crédit' : `Écart ${page.ecart.toLocaleString('fr-FR')} €`}</div>
        </div>
      </div>

      {/* Period selector */}
      {page.allPeriods.length > 1 && (
        <div className={s.periodBar}>
          <select
            className={s.periodSelect}
            value={page.selectedPeriodId || ''}
            onChange={(e) => page.setSelectedPeriodId(e.target.value)}
          >
            {page.allPeriods.map(p => (
              <option key={p.id} value={p.id}>
                {new Date(p.start_date).getFullYear()} {p.status === 'open' ? '(ouvert)' : '(clôturé)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={clsx(s.tab, page.activeTab === t.id && s.tabActive)}
            onClick={() => page.setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table — Grand Livre */}
      {page.activeTab === 'grand-livre' && (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>N° Pièce</th>
              <th>Compte</th>
              <th>Libellé</th>
              <th style={{ textAlign: 'right' }}>Débit</th>
              <th>Crédit</th>
            </tr>
          </thead>
          <tbody>
            {page.filteredOperations.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Aucune écriture pour cette période</td></tr>
            ) : (
              page.filteredOperations.map((op) => (
                <tr key={op.id} onClick={() => page.handleViewOperationDetail(op)} style={{ cursor: 'pointer' }}>
                  <td>{new Date(op.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</td>
                  <td>{op.numeroPiece || '—'}</td>
                  <td>{op.compte}</td>
                  <td>{op.libelle}</td>
                  <td className={clsx(s.mono, s.colorDebit)} style={{ textAlign: 'right' }}>{fmt(op.debit)}</td>
                  <td className={clsx(s.mono, s.colorCredit)}>{fmt(op.credit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Table — Balance */}
      {page.activeTab === 'balance' && (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Compte</th>
              <th style={{ textAlign: 'right' }}>Mvt Débit</th>
              <th style={{ textAlign: 'right' }}>Mvt Crédit</th>
              <th style={{ textAlign: 'right' }}>Solde Débit</th>
              <th style={{ textAlign: 'right' }}>Solde Crédit</th>
            </tr>
          </thead>
          <tbody>
            {page.lignesBalance.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Aucune donnée de balance</td></tr>
            ) : (
              page.lignesBalance.map((lb, i) => (
                <tr key={i}>
                  <td>{lb.compte}</td>
                  <td className={s.mono} style={{ textAlign: 'right' }}>{fmt(lb.mouvementDebit)}</td>
                  <td className={s.mono} style={{ textAlign: 'right' }}>{fmt(lb.mouvementCredit)}</td>
                  <td className={clsx(s.mono, s.colorDebit)} style={{ textAlign: 'right' }}>{fmt(lb.soldeClotureDebit)}</td>
                  <td className={clsx(s.mono, s.colorCredit)} style={{ textAlign: 'right' }}>{fmt(lb.soldeClotureCredit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Livre comptable — Plan comptable complet */}
      {page.activeTab === 'livre-comptable' && (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Intitulé</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Débit</th>
              <th style={{ textAlign: 'right' }}>Crédit</th>
              <th style={{ textAlign: 'right' }}>Solde</th>
            </tr>
          </thead>
          <tbody>
            {page.allAccountsWithBalances.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Aucun compte</td></tr>
            ) : (
              page.allAccountsWithBalances.map((acc, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{acc.code}</td>
                  <td>{acc.name}</td>
                  <td className={s.colorMuted}>{acc.accountType}</td>
                  <td className={clsx(s.mono, s.colorDebit)} style={{ textAlign: 'right' }}>{fmt(acc.debit)}</td>
                  <td className={clsx(s.mono, s.colorCredit)} style={{ textAlign: 'right' }}>{fmt(acc.credit)}</td>
                  <td className={clsx(s.mono, acc.debit - acc.credit >= 0 ? s.colorDebit : s.colorCredit)} style={{ textAlign: 'right' }}>
                    {fmt(Math.abs(acc.debit - acc.credit))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Placeholder pour les autres onglets */}
      {!['grand-livre', 'balance', 'livre-comptable'].includes(page.activeTab) && (
        <div className={s.card} style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>
          Vue &laquo; {TABS.find(t => t.id === page.activeTab)?.label} &raquo; — à venir
        </div>
      )}
    </div>
  );
}
