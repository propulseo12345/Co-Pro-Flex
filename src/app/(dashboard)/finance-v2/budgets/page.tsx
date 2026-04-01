'use client';

import { useState } from 'react';
import { Download, Plus, PieChart, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import s from '@/components/features/finance-v2/finance-v2.module.css';

const POSTES = [
  { nom: 'Eau froide collective', budget: 8000, consomme: 750, dotColor: '#adc6ff' },
  { nom: 'Électricité parties communes', budget: 2000, consomme: 180, dotColor: '#ffb786' },
  { nom: 'Assurance immeuble', budget: 4500, consomme: 4500, dotColor: '#34d399' },
  { nom: 'Ménage parties communes', budget: 3600, consomme: 0, dotColor: '#64748b' },
  { nom: 'Entretien espaces verts', budget: 2400, consomme: 0, dotColor: '#64748b' },
  { nom: 'Honoraires syndic', budget: 1800, consomme: 0, dotColor: '#64748b' },
  { nom: 'Divers et imprévu', budget: 900, consomme: 0, dotColor: '#64748b' },
];

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

export default function BudgetsV2Page() {
  const [activeTab, setActiveTab] = useState<'fonctionnement' | 'travaux' | 'alur'>('fonctionnement');

  const budgetTotal = POSTES.reduce((sum, p) => sum + p.budget, 0);
  const totalConsomme = POSTES.reduce((sum, p) => sum + p.consomme, 0);
  const pctConsomme = budgetTotal > 0 ? ((totalConsomme / budgetTotal) * 100).toFixed(1) : '0';
  const disponible = budgetTotal - totalConsomme;
  const postesEnAlerte = POSTES.filter(p => p.budget > 0 && p.consomme / p.budget >= 0.8).length;

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: 24 }}>
      {/* TopBar */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <h1 className={s.topbarTitle}>Budgets</h1>
          <span className={clsx(s.pill, s.pillBlue)}>
            <span className={s.pillDot} style={{ background: '#adc6ff' }} />
            Exercice 2026
          </span>
        </div>
        <div className={s.topbarActions}>
          <button className={s.btnIcon}><Download size={16} /></button>
          <button className={s.btnPrimary}><Plus size={14} /> Créer un budget</button>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabBar}>
        <button className={clsx(s.tab, activeTab === 'fonctionnement' && s.tabActive)} onClick={() => setActiveTab('fonctionnement')}>Fonctionnement</button>
        <button className={clsx(s.tab, activeTab === 'travaux' && s.tabActive)} onClick={() => setActiveTab('travaux')}>Travaux</button>
        <button className={clsx(s.tab, activeTab === 'alur' && s.tabActive)} onClick={() => setActiveTab('alur')}>Fonds ALUR</button>
      </div>

      {/* Period */}
      <div className={s.periodBar}>
        <span className={clsx(s.pill, s.pillGreen)}>
          <span className={s.pillDot} style={{ background: '#34d399' }} />
          Exercice 2026
        </span>
        <select className={s.periodSelect}><option>2026</option><option>2025</option></select>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className={s.card}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 12 }}>Budget Annuel Voté</div>
          <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 32, fontWeight: 800, color: '#e2e2eb' }}>{fmt(budgetTotal)} &euro;</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 24 }}>{POSTES.length} postes budgétaires</div>
          <div style={{ display: 'flex', gap: 40 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>Consommé</div>
              <div className={s.colorWarning} style={{ fontFamily: 'var(--font-manrope)', fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>{fmt(totalConsomme)} &euro;</div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(148,163,184,0.06)' }}><div style={{ height: '100%', borderRadius: 2, background: '#ffb786', width: `${pctConsomme}%` }} /></div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>Disponible</div>
              <div className={s.colorAccent} style={{ fontFamily: 'var(--font-manrope)', fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>{fmt(disponible)} &euro;</div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(148,163,184,0.06)' }}><div style={{ height: '100%', borderRadius: 2, background: '#adc6ff', width: `${100 - Number(pctConsomme)}%` }} /></div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>Postes en Alerte</div>
              <div className={s.colorDanger} style={{ fontFamily: 'var(--font-manrope)', fontSize: 18, fontWeight: 700 }}>{postesEnAlerte}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Assurance immeuble</div>
            </div>
          </div>
        </div>

        {/* Donut */}
        <div className={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, height: '100%' }}>
            <div style={{ position: 'relative', width: 170, height: 170 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#34d399" strokeWidth="12" strokeDasharray="58.4 193" strokeDashoffset="0" strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#adc6ff" strokeWidth="12" strokeDasharray="9.7 241.7" strokeDashoffset="-58.4" strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#ffb786" strokeWidth="12" strokeDasharray="2.3 249.1" strokeDashoffset="-68.1" strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 26, fontWeight: 800, color: '#e2e2eb' }}>{pctConsomme}%</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#adc6ff' }}>Consommé</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} /><span style={{ color: '#94a3b8', flex: 1 }}>Assurance immeuble</span><span style={{ fontFamily: 'var(--font-manrope)', fontWeight: 700, color: '#e2e2eb' }}>4 500 &euro;</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#adc6ff' }} /><span style={{ color: '#94a3b8', flex: 1 }}>Eau froide collective</span><span style={{ fontFamily: 'var(--font-manrope)', fontWeight: 700, color: '#e2e2eb' }}>750 &euro;</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffb786' }} /><span style={{ color: '#94a3b8', flex: 1 }}>Électricité parties communes</span><span style={{ fontFamily: 'var(--font-manrope)', fontWeight: 700, color: '#e2e2eb' }}>180 &euro;</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Projection */}
      <div className={s.card} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-manrope)', fontSize: 15, fontWeight: 700 }}>Projection fin d&apos;exercice</div>
          <div style={{ padding: '4px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'rgba(255,180,171,0.08)', color: '#ffb4ab', display: 'flex', alignItems: 'center', gap: 4 }}>&#9888; Dépassement prévu</div>
        </div>
        <div style={{ height: 8, background: 'rgba(148,163,184,0.06)', borderRadius: 4, marginBottom: 4, overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 4, background: '#adc6ff', width: '28%' }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 20 }}><span>Jan — Mois 4</span><span>8 mois restants</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
          <div><div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Projection totale</div><div className={s.colorAccent} style={{ fontFamily: 'var(--font-manrope)', fontSize: 16, fontWeight: 700 }}>18 593 &euro;</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Écart vs budget</div><div className={s.colorDanger} style={{ fontFamily: 'var(--font-manrope)', fontSize: 16, fontWeight: 700 }}>+4 607 &euro;</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Conso. mensuelle moy.</div><div style={{ fontFamily: 'var(--font-manrope)', fontSize: 16, fontWeight: 700 }}>1 358 &euro; /mois</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Fiabilité</div><div style={{ fontFamily: 'var(--font-manrope)', fontSize: 16, fontWeight: 700, color: '#34d399' }}>Haute (4 mois)</div></div>
        </div>
      </div>

      {/* Postes table */}
      <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
        <table className={s.table}>
          <thead>
            <tr><th>Poste</th><th style={{ textAlign: 'right' }}>Budget Voté</th><th style={{ textAlign: 'right' }}>Consommation</th><th style={{ textAlign: 'right' }}>%</th><th style={{ textAlign: 'right' }}>Reste</th></tr>
          </thead>
          <tbody>
            {POSTES.map((p, i) => {
              const pct = p.budget > 0 ? (p.consomme / p.budget) * 100 : 0;
              const pctColor = pct >= 100 ? '#ffb4ab' : pct >= 80 ? '#ffb786' : pct > 0 ? '#ffb786' : '#34d399';
              const barColor = pct >= 100 ? '#ffb4ab' : '#34d399';
              return (
                <tr key={i}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.dotColor, flexShrink: 0 }} />
                      {p.nom}
                      {pct >= 100 && <span className={clsx(s.badge, s.badgeSuccess)} style={{ marginLeft: 4 }}>&#10003; Consommé</span>}
                    </span>
                  </td>
                  <td className={s.mono} style={{ textAlign: 'right' }}>{fmt(p.budget)} &euro;</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                      <div style={{ width: 120, height: 4, background: 'rgba(148,163,184,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: barColor, width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', color: pctColor, fontWeight: 700, fontSize: 12 }}>{pct.toFixed(1)}%</td>
                  <td className={clsx(s.mono, pct >= 100 && s.colorDanger)} style={{ textAlign: 'right' }}>{fmt(p.budget - p.consomme)} &euro;</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
