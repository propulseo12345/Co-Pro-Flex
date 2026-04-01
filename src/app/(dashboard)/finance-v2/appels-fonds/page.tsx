'use client';

import { Download, Plus, Send, Landmark, AlertCircle, Percent } from 'lucide-react';
import clsx from 'clsx';
import { useAppelsFondsPage } from '@/features/finance/appels-fonds/hooks';
import { formatEuros } from '@/features/finance/appels-fonds/utils';
import s from '@/components/features/finance-v2/finance-v2.module.css';

export default function AppelsFondsV2Page() {
  const {
    globalStats,
    trimesterCards,
    activeTab,
    setActiveTab,
    selectedPeriod,
    periods,
    selectPeriod,
    impayesCount,
    isLoading,
    groupedCalls,
    courantStats,
    travauxStats,
    travauxProjects,
  } = useAppelsFondsPage();

  if (isLoading) {
    return <div className={s.loading}>Chargement des appels de fonds...</div>;
  }

  const periodLabel = selectedPeriod
    ? `${new Date(selectedPeriod.start_date).toLocaleDateString('fr-FR')} — ${new Date(selectedPeriod.end_date).toLocaleDateString('fr-FR')}`
    : 'Aucune période';

  const taux = globalStats.recoveryRate.toFixed(1);

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: 24 }}>
      {/* TopBar */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <div>
            <h1 className={s.topbarTitle}>Appels de Fonds</h1>
            <p className={s.topbarSub}>Suivi des appels et recouvrements</p>
          </div>
        </div>
        <div className={s.topbarActions}>
          <button className={s.btnGhost}><Download size={14} /> Export</button>
          <button className={s.btnPrimary}><Plus size={14} /> Générer les appels</button>
        </div>
      </div>

      {/* Period */}
      <div className={s.periodBar}>
        <span className={clsx(s.pill, s.pillGreen)}>
          <span className={s.pillDot} style={{ background: '#34d399' }} />
          {periodLabel}
        </span>
        {periods.length > 1 && (
          <select
            className={s.periodSelect}
            value={selectedPeriod?.id || ''}
            onChange={(e) => selectPeriod(e.target.value)}
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {new Date(p.start_date).getFullYear()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* KPIs */}
      <div className={s.kpiStrip}>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Appelé</span><div className={s.kpiIcon}><Send size={18} /></div></div>
          <div className={s.kpiValue}>{formatEuros(globalStats.totalCalled)}</div>
          <div className={s.kpiSub}>Budget courant + travaux</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Encaissé</span><div className={s.kpiIcon}><Landmark size={18} /></div></div>
          <div className={s.kpiValue}>{formatEuros(globalStats.totalPaid)}</div>
          <div className={s.kpiSub}>{taux}% recouvré</div>
        </div>
        <div className={clsx(s.kpi, s.kpiDanger)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Impayés</span><div className={s.kpiIcon}><AlertCircle size={18} /></div></div>
          <div className={s.kpiValue}>{formatEuros(globalStats.totalUnpaid)}</div>
          <div className={s.kpiSub}>{impayesCount} copropriétaires</div>
        </div>
        <div className={clsx(s.kpi, s.kpiWarning)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Taux Recouvrement</span><div className={s.kpiIcon}><Percent size={18} /></div></div>
          <div className={s.kpiValue}>{taux}%</div>
          <div className={s.kpiSub}>Objectif: 95%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabBar}>
        <button
          className={clsx(s.tab, activeTab === 'all' && s.tabActive)}
          onClick={() => setActiveTab('all')}
        >
          Vue Globale <span className={s.tabBadge}>{formatEuros(globalStats.totalCalled)}</span>
        </button>
        <button
          className={clsx(s.tab, activeTab === 'courant' && s.tabActive)}
          onClick={() => setActiveTab('courant')}
        >
          Budget Courant <span className={s.tabBadge}>{courantStats.recoveryRate.toFixed(0)}%</span>
        </button>
        <button
          className={clsx(s.tab, activeTab === 'travaux' && s.tabActive)}
          onClick={() => setActiveTab('travaux')}
        >
          Travaux <span className={s.tabBadge}>{travauxStats.recoveryRate.toFixed(0)}%</span>
        </button>
      </div>

      {/* Vue Globale — Grouped calls */}
      {activeTab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedCalls.map(category => (
            <div key={category.id}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 12 }}>
                {category.label} — {formatEuros(category.stats.totalCalled)}
              </div>
              {category.groups.map((group, gi) => (
                <div key={gi} className={s.card} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontFamily: 'var(--font-manrope)', fontSize: 14, fontWeight: 700 }}>{group.label}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {formatEuros(group.stats.totalPaid)} / {formatEuros(group.stats.totalCalled)}
                    </span>
                  </div>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Trimestre</th>
                        <th style={{ textAlign: 'right' }}>Appelé</th>
                        <th style={{ textAlign: 'right' }}>Payé</th>
                        <th style={{ textAlign: 'right' }}>Reste</th>
                        <th style={{ textAlign: 'right' }}>Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.calls.map(call => {
                        const paid = Number(call.total_paid || 0);
                        const called = Number(call.total_amount || 0);
                        const remaining = called - paid;
                        const rate = called > 0 ? ((paid / called) * 100).toFixed(1) : '0';
                        return (
                          <tr key={call.id}>
                            <td>{call.trimester ? `T${call.trimester}` : call.label || '—'}</td>
                            <td className={s.mono} style={{ textAlign: 'right' }}>{formatEuros(called)}</td>
                            <td className={clsx(s.mono, s.colorCredit)} style={{ textAlign: 'right' }}>{formatEuros(paid)}</td>
                            <td className={clsx(s.mono, remaining > 0 ? s.colorDanger : s.colorCredit)} style={{ textAlign: 'right' }}>{formatEuros(remaining)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <span className={clsx(s.badge, Number(rate) >= 100 ? s.badgeSuccess : Number(rate) >= 50 ? s.badgeWarning : s.badgeDanger)}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
              {category.groups.length === 0 && (
                <div className={s.card} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
                  Aucun appel pour cette catégorie
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Budget Courant — Trimester cards */}
      {activeTab === 'courant' && (
        <div>
          {trimesterCards.length === 0 ? (
            <div className={s.card} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
              Aucun appel de fonds budget courant pour cette période
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(trimesterCards.length, 4)}, 1fr)`, gap: 14 }}>
              {trimesterCards.map((t, i) => {
                const color = t.status === 'paid' ? '#34d399' : t.status === 'active' ? '#ffb786' : '#94a3b8';
                const badgeClass = t.status === 'paid' ? s.badgeSuccess : t.status === 'active' ? s.badgeWarning : s.badgeMuted;
                const badgeLabel = t.status === 'paid' ? 'Soldé' : t.status === 'active' ? 'En cours' : 'À venir';
                return (
                  <div key={i} className={s.card} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: 12 }}>
                      {t.label}
                    </div>
                    <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
                      {formatEuros(t.totalAmount)}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                      {t.status === 'paid'
                        ? '100% encaissé'
                        : t.status === 'active'
                        ? `${formatEuros(t.totalPaid)} encaissés`
                        : 'Non encore appelé'}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <span className={clsx(s.badge, badgeClass)}>{badgeLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Travaux */}
      {activeTab === 'travaux' && (
        <div>
          {travauxProjects.length === 0 ? (
            <div className={s.card} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
              Aucun projet travaux pour cette période
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {travauxProjects.map((proj, i) => (
                <div key={i} className={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{proj.budgetLabel}</div>
                      {proj.resolutionTitle && <div style={{ fontSize: 12, color: '#64748b' }}>{proj.resolutionTitle}</div>}
                    </div>
                    <span className={clsx(s.badge, proj.recoveryRate >= 100 ? s.badgeSuccess : proj.recoveryRate >= 50 ? s.badgeWarning : s.badgeDanger)}>
                      {proj.recoveryRate.toFixed(0)}% recouvré
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Montant total</div>
                      <div className={s.colorAccent} style={{ fontFamily: 'var(--font-manrope)', fontSize: 16, fontWeight: 700 }}>{formatEuros(proj.totalAmount)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Encaissé</div>
                      <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 16, fontWeight: 700, color: '#34d399' }}>{formatEuros(proj.totalPaid)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Reste à percevoir</div>
                      <div className={s.colorDanger} style={{ fontFamily: 'var(--font-manrope)', fontSize: 16, fontWeight: 700 }}>
                        {formatEuros(proj.totalAmount - proj.totalPaid)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
