'use client';

import { useState } from 'react';
import { RefreshCw, Upload, Landmark, PiggyBank, HelpCircle, Unlink } from 'lucide-react';
import clsx from 'clsx';
import s from '@/components/features/finance-v2/finance-v2.module.css';

type TabMvt = 'categorisation' | 'rapprochement' | 'tous' | 'cloture';

const MOUVEMENTS = [
  { date: '02/03', label: 'VIR VEOLIA EAU IDF FACTURE 2025-0342', montant: -2450, type: 'debit' as const },
  { date: '03/03', label: 'VIR EDF ENTREPRISES MARS 2025', montant: -1890, type: 'debit' as const },
  { date: '05/03', label: 'VIR DUPONT JEAN APPEL FONDS T1 2025', montant: 1250, type: 'credit' as const },
  { date: '06/03', label: 'VIR MARTIN SOPHIE APPEL FONDS T1 2025', montant: 980, type: 'credit' as const },
  { date: '08/03', label: 'PRLV OTIS MAINTENANCE ASCENSEUR MARS', montant: -680, type: 'debit' as const },
  { date: '10/03', label: 'VIR SECURIPLUS GARDIENNAGE MARS 2025', montant: -3200, type: 'debit' as const },
];

function fmt(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

export default function MouvementsBancairesV2Page() {
  const [activeTab, setActiveTab] = useState<TabMvt>('categorisation');
  const [activeAccount, setActiveAccount] = useState<'all' | 'cc' | 'ft'>('all');

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: 24 }}>
      {/* TopBar */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <div>
            <h1 className={s.topbarTitle}>Mouvements Bancaires</h1>
            <p className={s.topbarSub}>Dernière synchro: il y a 2h</p>
          </div>
        </div>
        <div className={s.topbarActions}>
          <button className={s.btnGhost}><RefreshCw size={14} /> Actualiser</button>
          <button className={s.btnPrimary}><Upload size={14} /> Importer</button>
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiStrip}>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Solde Compte Courant</span><div className={s.kpiIcon}><Landmark size={18} /></div></div>
          <div className={s.kpiValue}>45 230&nbsp;&euro;</div>
          <div className={s.kpiSub}>BNP Paribas ****4521</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Solde Fonds Travaux</span><div className={s.kpiIcon}><PiggyBank size={18} /></div></div>
          <div className={s.kpiValue}>32 600&nbsp;&euro;</div>
          <div className={s.kpiSub}>Livret A ****7890</div>
        </div>
        <div className={clsx(s.kpi, s.kpiWarning)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Non Catégorisés</span><div className={s.kpiIcon}><HelpCircle size={18} /></div></div>
          <div className={s.kpiValue}>8</div>
          <div className={s.kpiSub}>À traiter</div>
        </div>
        <div className={clsx(s.kpi, s.kpiDanger)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Non Rapprochés</span><div className={s.kpiIcon}><Unlink size={18} /></div></div>
          <div className={s.kpiValue}>16</div>
          <div className={s.kpiSub}>3 copro. en attente</div>
        </div>
      </div>

      {/* Account pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'cc', 'ft'] as const).map(acc => (
          <button
            key={acc}
            onClick={() => setActiveAccount(acc)}
            style={{
              padding: '8px 16px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${activeAccount === acc ? 'rgba(173,198,255,0.2)' : 'rgba(148,163,184,0.08)'}`,
              background: activeAccount === acc ? 'rgba(173,198,255,0.08)' : '#1a1d2e',
              color: activeAccount === acc ? '#adc6ff' : '#94a3b8',
              transition: 'all 0.15s',
            }}
          >
            {acc === 'all' ? 'Tous les comptes' : acc === 'cc' ? 'CC — BNP ****4521' : 'FT — Livret A ****7890'}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className={s.tabBar}>
        <button className={clsx(s.tab, activeTab === 'categorisation' && s.tabActive)} onClick={() => setActiveTab('categorisation')}>
          Catégorisation <span className={s.tabBadge}>8</span>
        </button>
        <button className={clsx(s.tab, activeTab === 'rapprochement' && s.tabActive)} onClick={() => setActiveTab('rapprochement')}>
          Rapprochement <span className={s.tabBadge}>16</span>
        </button>
        <button className={clsx(s.tab, activeTab === 'tous' && s.tabActive)} onClick={() => setActiveTab('tous')}>
          Tous les mouvements
        </button>
        <button className={clsx(s.tab, activeTab === 'cloture' && s.tabActive)} onClick={() => setActiveTab('cloture')}>
          Clôture
        </button>
      </div>

      {/* Movement rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MOUVEMENTS.map((mv, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: '#1a1d2e', borderRadius: 12, padding: '14px 20px',
            transition: 'background 0.15s',
          }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, width: 70, flexShrink: 0 }}>{mv.date}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mv.label}</span>
            <span className={clsx(s.mono, mv.type === 'debit' ? s.colorDebit : s.colorCredit)} style={{ fontSize: 14, fontWeight: 700, width: 130, textAlign: 'right', flexShrink: 0 }}>
              {fmt(mv.montant)}&euro;
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ color: '#475569', fontSize: 16 }}>&rarr;</span>
              <select style={{
                background: '#131620', border: '1px solid rgba(148,163,184,0.08)',
                borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#94a3b8', width: 180,
              }}>
                <option>Sélectionner un compte...</option>
                <option>601 — Eau</option>
                <option>602 — Électricité</option>
                <option>615 — Entretien</option>
              </select>
            </div>
            <button style={{
              padding: '6px 14px', borderRadius: 8, background: '#adc6ff',
              color: '#00285d', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}>
              Valider
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
