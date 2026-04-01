'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Copy, Lock } from 'lucide-react';
import clsx from 'clsx';
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

const ECRITURES = [
  { date: '02/01', piece: 'EC-001', compte: '401000', libelle: 'Fournisseur Veolia — Facture eau T4', debit: 2450, credit: 0 },
  { date: '02/01', piece: 'EC-001', compte: '601000', libelle: 'Charge eau — Répartition générale', debit: 0, credit: 2450 },
  { date: '05/01', piece: 'EC-002', compte: '401001', libelle: 'EDF — Électricité parties communes', debit: 1890, credit: 0 },
  { date: '05/01', piece: 'EC-002', compte: '602000', libelle: 'Charge électricité — Parties communes', debit: 0, credit: 1890 },
  { date: '10/01', piece: 'EC-003', compte: '512000', libelle: 'Banque — Encaissement appel T1', debit: 18750, credit: 0 },
  { date: '10/01', piece: 'EC-003', compte: '701000', libelle: 'Appels de fonds — Budget courant T1', debit: 0, credit: 18750 },
  { date: '15/01', piece: 'EC-004', compte: '401002', libelle: 'SecuriPlus — Contrat gardiennage', debit: 3200, credit: 0 },
  { date: '15/01', piece: 'EC-004', compte: '615000', libelle: 'Charge entretien — Gardiennage', debit: 0, credit: 3200 },
  { date: '20/01', piece: 'EC-005', compte: '671000', libelle: 'Honoraires syndic — Trimestre 1', debit: 4500, credit: 0 },
  { date: '20/01', piece: 'EC-005', compte: '401003', libelle: 'CoProFlex SAS', debit: 0, credit: 4500 },
];

function fmt(n: number): string {
  return n > 0 ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

export default function ComptabiliteV2Page() {
  const [activeTab, setActiveTab] = useState<TabCompta>('grand-livre');

  const totalDebit = ECRITURES.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = ECRITURES.reduce((sum, e) => sum + e.credit, 0);

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: 24 }}>
      {/* TopBar */}
      <div className={s.topbar}>
        <div className={s.topbarLeft}>
          <div>
            <h1 className={s.topbarTitle}>Comptabilité</h1>
            <p className={s.topbarSub}>Exercice en cours</p>
          </div>
          <span className={clsx(s.pill, s.pillGreen)}>
            <span className={s.pillDot} style={{ background: '#34d399' }} />
            2025 — Ouvert
          </span>
        </div>
        <div className={s.topbarActions}>
          <button className={s.btnIcon} title="Export PDF"><Download size={16} /></button>
          <button className={s.btnIcon} title="Export Excel"><FileSpreadsheet size={16} /></button>
          <button className={s.btnIcon} title="Copier"><Copy size={16} /></button>
          <button className={s.btnDanger}><Lock size={14} /> Clôturer 2025</button>
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiStrip}>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Débit</span><div className={s.kpiIcon}><Download size={18} /></div></div>
          <div className={s.kpiValue}>{totalDebit.toLocaleString('fr-FR')}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{ECRITURES.length} écritures</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Crédit</span><div className={s.kpiIcon}><Download size={18} style={{ transform: 'rotate(180deg)' }} /></div></div>
          <div className={s.kpiValue}>{totalCredit.toLocaleString('fr-FR')}&nbsp;&euro;</div>
          <div className={s.kpiSub}>Balance équilibrée</div>
        </div>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Écritures</span><div className={s.kpiIcon}><FileSpreadsheet size={18} /></div></div>
          <div className={s.kpiValue}>{ECRITURES.length}</div>
          <div className={s.kpiSub} style={{ color: '#34d399' }}>&#10003; Toutes comptabilisées</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>État Balance</span><div className={s.kpiIcon}><Copy size={18} /></div></div>
          <div className={s.kpiValue}>Équilibrée</div>
          <div className={s.kpiSub}>Débit = Crédit</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={clsx(s.tab, activeTab === t.id && s.tabActive)}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
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
          {ECRITURES.map((e, i) => (
            <tr key={i}>
              <td>{e.date}</td>
              <td>{e.piece}</td>
              <td>{e.compte}</td>
              <td>{e.libelle}</td>
              <td className={clsx(s.mono, s.colorDebit)} style={{ textAlign: 'right' }}>{fmt(e.debit)}</td>
              <td className={clsx(s.mono, s.colorCredit)}>{fmt(e.credit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
