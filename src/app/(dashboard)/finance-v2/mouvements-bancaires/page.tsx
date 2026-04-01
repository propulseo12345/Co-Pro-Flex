'use client';

import { RefreshCw, Upload, Landmark, PiggyBank, HelpCircle, Unlink } from 'lucide-react';
import clsx from 'clsx';
import { useMouvementsBancairesPage } from '@/features/finance/mouvements-bancaires/hooks';
import s from '@/components/features/finance-v2/finance-v2.module.css';

function fmt(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

function fmtSolde(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MouvementsBancairesV2Page() {
  const hook = useMouvementsBancairesPage();

  if (hook.isLoading) {
    return <div className={s.loading}>Chargement des mouvements bancaires...</div>;
  }

  const isSyncing = hook.statutConnexion.statut === 'en_cours';

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: 24 }}>
      {/* TopBar */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <div>
            <h1 className={s.topbarTitle}>Mouvements Bancaires</h1>
            <p className={s.topbarSub}>
              Dernière synchro: {hook.getTempsDepuisDerniereSync()}
            </p>
          </div>
        </div>
        <div className={s.topbarActions}>
          <button
            className={s.btnGhost}
            onClick={hook.handleRefresh}
            disabled={isSyncing}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Synchro...' : 'Actualiser'}
          </button>
          <button className={s.btnPrimary} onClick={() => hook.setShowImportModal(true)}>
            <Upload size={14} /> Importer
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiStrip}>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Solde {hook.compteActif === 'courant' ? 'Compte Courant' : 'Fonds Travaux'}</span><div className={s.kpiIcon}><Landmark size={18} /></div></div>
          <div className={s.kpiValue}>{fmtSolde(hook.soldeActuel)}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{hook.compteActuel.nom}</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Entrées</span><div className={s.kpiIcon}><PiggyBank size={18} /></div></div>
          <div className={s.kpiValue}>{fmtSolde(hook.totalEntrees)}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{hook.mouvements.filter(m => m.type === 'ENTREE').length} mouvements</div>
        </div>
        <div className={clsx(s.kpi, s.kpiWarning)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Non Catégorisés</span><div className={s.kpiIcon}><HelpCircle size={18} /></div></div>
          <div className={s.kpiValue}>{hook.statsNonCategorises.total}</div>
          <div className={s.kpiSub}>À traiter</div>
        </div>
        <div className={clsx(s.kpi, s.kpiDanger)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Non Rapprochés</span><div className={s.kpiIcon}><Unlink size={18} /></div></div>
          <div className={s.kpiValue}>{hook.ecartSoldes.mouvementsNonRapproches}</div>
          <div className={s.kpiSub}>{fmtSolde(hook.statsNonCategorises.montantTotal)}&nbsp;&euro;</div>
        </div>
      </div>

      {/* Account pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['courant', 'travaux'] as const).map(acc => (
          <button
            key={acc}
            onClick={() => hook.setCompteActif(acc)}
            style={{
              padding: '8px 16px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${hook.compteActif === acc ? 'rgba(173,198,255,0.2)' : 'rgba(148,163,184,0.08)'}`,
              background: hook.compteActif === acc ? 'rgba(173,198,255,0.08)' : '#1a1d2e',
              color: hook.compteActif === acc ? '#adc6ff' : '#94a3b8',
              transition: 'all 0.15s',
            }}
          >
            {acc === 'courant'
              ? `CC — ${hook.compteCourant.nom}`
              : `FT — ${hook.compteTravaux.nom}`}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className={s.tabBar}>
        <button className={clsx(s.tab, hook.activeTab === 'categorisation' && s.tabActive)} onClick={() => hook.setActiveTab('categorisation')}>
          Catégorisation <span className={s.tabBadge}>{hook.statsNonCategorises.total}</span>
        </button>
        <button className={clsx(s.tab, hook.activeTab === 'rapprochement' && s.tabActive)} onClick={() => hook.setActiveTab('rapprochement')}>
          Rapprochement <span className={s.tabBadge}>{hook.ecartSoldes.mouvementsNonRapproches}</span>
        </button>
        <button className={clsx(s.tab, hook.activeTab === 'categorisation' !== true && hook.activeTab === 'rapprochement' !== true && s.tabActive)} onClick={() => hook.setActiveTab('categorisation')}>
          Tous les mouvements
        </button>
      </div>

      {/* Movement rows */}
      {hook.filteredMouvements.length === 0 ? (
        <div className={s.card} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
          Aucun mouvement bancaire{hook.hasData ? ' correspondant aux filtres' : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hook.filteredMouvements.map(mv => {
            const isDebit = mv.type === 'SORTIE';
            const isRapproche = hook.isMouvementRapproche(mv.id);
            return (
              <div key={mv.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                background: '#1a1d2e', borderRadius: 12, padding: '14px 20px',
                transition: 'background 0.15s',
                borderLeft: !mv.categorise ? '3px solid #ffb786' : isRapproche ? '3px solid #34d399' : '3px solid transparent',
              }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, width: 70, flexShrink: 0 }}>
                  {new Date(mv.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mv.libelle}
                </span>
                {mv.categorise && mv.compteComptable && (
                  <span className={clsx(s.badge, s.badgeInfo)} style={{ flexShrink: 0 }}>
                    {mv.compteComptable}
                  </span>
                )}
                {isRapproche && (
                  <span className={clsx(s.badge, s.badgeSuccess)} style={{ flexShrink: 0 }}>
                    Rapproché
                  </span>
                )}
                <span
                  className={clsx(s.mono, isDebit ? s.colorDebit : s.colorCredit)}
                  style={{ fontSize: 14, fontWeight: 700, width: 130, textAlign: 'right', flexShrink: 0 }}
                >
                  {fmt(mv.montant)}&nbsp;&euro;
                </span>
                {!mv.categorise && (
                  <button
                    onClick={() => hook.handleCategoriserClick(mv)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, background: '#adc6ff',
                      color: '#00285d', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                    }}
                  >
                    Catégoriser
                  </button>
                )}
                {mv.categorise && !isRapproche && (
                  <button
                    onClick={() => hook.handleOpenRapprochement(mv)}
                    style={{
                      padding: '6px 14px', borderRadius: 8,
                      background: 'rgba(52, 211, 153, 0.1)',
                      color: '#34d399', fontSize: 11, fontWeight: 700,
                      border: '1px solid rgba(52, 211, 153, 0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    Rapprocher
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
