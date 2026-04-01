'use client';

import { useState } from 'react';
import { Download, Plus, Send, Landmark, AlertCircle, Percent } from 'lucide-react';
import clsx from 'clsx';
import s from '@/components/features/finance-v2/finance-v2.module.css';

type TabAppels = 'global' | 'courant' | 'travaux';

const TRIMESTRES = [
  { label: 'T1 — Janv. à Mars', montant: 18750, encaisse: 18750, statut: 'solde' as const },
  { label: 'T2 — Avr. à Juin', montant: 18750, encaisse: 14030, statut: 'encours' as const },
  { label: 'T3 — Juil. à Sept.', montant: 18750, encaisse: 0, statut: 'avenir' as const },
  { label: 'T4 — Oct. à Déc.', montant: 18750, encaisse: 0, statut: 'avenir' as const },
];

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

export default function AppelsFondsV2Page() {
  const [activeTab, setActiveTab] = useState<TabAppels>('global');

  const totalAppele = TRIMESTRES.reduce((sum, t) => sum + t.montant, 0);
  const totalEncaisse = TRIMESTRES.reduce((sum, t) => sum + t.encaisse, 0);
  const impayes = totalAppele - totalEncaisse;
  const taux = totalAppele > 0 ? ((totalEncaisse / totalAppele) * 100).toFixed(1) : '100';

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
          01/01/2025 — 31/12/2025
        </span>
        <select className={s.periodSelect}><option>2025</option><option>2024</option></select>
      </div>

      {/* KPIs */}
      <div className={s.kpiStrip}>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Appelé</span><div className={s.kpiIcon}><Send size={18} /></div></div>
          <div className={s.kpiValue}>{fmt(totalAppele)}&nbsp;&euro;</div>
          <div className={s.kpiSub}>Budget courant + travaux</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Encaissé</span><div className={s.kpiIcon}><Landmark size={18} /></div></div>
          <div className={s.kpiValue}>{fmt(totalEncaisse)}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{taux}% recouvré</div>
        </div>
        <div className={clsx(s.kpi, s.kpiDanger)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Impayés</span><div className={s.kpiIcon}><AlertCircle size={18} /></div></div>
          <div className={s.kpiValue}>{fmt(impayes)}&nbsp;&euro;</div>
          <div className={s.kpiSub}>4 copropriétaires</div>
        </div>
        <div className={clsx(s.kpi, s.kpiWarning)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Taux Recouvrement</span><div className={s.kpiIcon}><Percent size={18} /></div></div>
          <div className={s.kpiValue}>{taux}%</div>
          <div className={s.kpiSub}>Objectif: 95%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabBar}>
        <button className={clsx(s.tab, activeTab === 'global' && s.tabActive)} onClick={() => setActiveTab('global')}>
          Vue Globale <span className={s.tabBadge}>{fmt(totalAppele)}</span>
        </button>
        <button className={clsx(s.tab, activeTab === 'courant' && s.tabActive)} onClick={() => setActiveTab('courant')}>
          Budget Courant <span className={s.tabBadge}>85%</span>
        </button>
        <button className={clsx(s.tab, activeTab === 'travaux' && s.tabActive)} onClick={() => setActiveTab('travaux')}>
          Travaux <span className={s.tabBadge}>72%</span>
        </button>
      </div>

      {/* Trimester cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {TRIMESTRES.map((t, i) => {
          const pct = t.montant > 0 ? ((t.encaisse / t.montant) * 100) : 0;
          const color = t.statut === 'solde' ? '#34d399' : t.statut === 'encours' ? '#ffb786' : '#94a3b8';
          const badgeClass = t.statut === 'solde' ? s.badgeSuccess : t.statut === 'encours' ? s.badgeWarning : s.badgeMuted;
          const badgeLabel = t.statut === 'solde' ? 'Soldé' : t.statut === 'encours' ? 'En cours' : 'À venir';
          return (
            <div key={i} className={s.card} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: 12 }}>{t.label}</div>
              <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(t.montant)}&euro;</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                {t.statut === 'solde' ? '100% encaissé' : t.statut === 'encours' ? `${fmt(t.encaisse)}€ encaissés` : 'Non encore appelé'}
              </div>
              <div style={{ marginTop: 10 }}><span className={clsx(s.badge, badgeClass)}>{badgeLabel}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
