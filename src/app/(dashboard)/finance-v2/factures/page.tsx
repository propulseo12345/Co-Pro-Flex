'use client';

import { Download, Plus, Receipt, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import clsx from 'clsx';
import s from '@/components/features/finance-v2/finance-v2.module.css';

const FACTURES = [
  { date: '15/01', fournisseur: 'Veolia Eau', ref: 'FAC-2025-001', poste: '601 — Eau', statut: 'payee' as const, montant: 2450 },
  { date: '18/01', fournisseur: 'EDF Pro', ref: 'FAC-2025-002', poste: '602 — Élec.', statut: 'payee' as const, montant: 1890 },
  { date: '22/01', fournisseur: 'SecuriPlus', ref: 'FAC-2025-003', poste: '615 — Entretien', statut: 'retard' as const, montant: 3200 },
  { date: '01/02', fournisseur: 'Otis Ascenseurs', ref: 'FAC-2025-004', poste: '615 — Entretien', statut: 'apayer' as const, montant: 4800 },
  { date: '05/02', fournisseur: 'AXA Assurances', ref: 'FAC-2025-005', poste: '614 — Assurance', statut: 'payee' as const, montant: 9800 },
  { date: '10/02', fournisseur: 'Jardiland Pro', ref: 'FAC-2025-006', poste: '615 — Entretien', statut: 'retard' as const, montant: 1520 },
  { date: '15/02', fournisseur: 'Plomberie Express', ref: 'FAC-2025-007', poste: '615 — Entretien', statut: 'attente' as const, montant: 850 },
];

const STATUT_MAP = {
  payee: { label: 'Payée', class: 'badgeSuccess' },
  retard: { label: 'En retard', class: 'badgeDanger' },
  apayer: { label: 'À payer', class: 'badgeWarning' },
  attente: { label: 'En attente', class: 'badgeInfo' },
} as const;

function fmt(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FacturesV2Page() {
  const totalPaye = FACTURES.filter(f => f.statut === 'payee').reduce((sum, f) => sum + f.montant, 0);
  const totalRetard = FACTURES.filter(f => f.statut === 'retard').reduce((sum, f) => sum + f.montant, 0);

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
          <button className={s.btnGhost}><Download size={14} /> Export</button>
          <button className={s.btnPrimary}><Plus size={14} /> Nouvelle facture</button>
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiStrip}>
        <div className={clsx(s.kpi, s.kpiAccent)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Factures</span><div className={s.kpiIcon}><Receipt size={18} /></div></div>
          <div className={s.kpiValue}>{FACTURES.length}</div>
          <div className={s.kpiSub}>Total exercice</div>
        </div>
        <div className={clsx(s.kpi, s.kpiSuccess)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Total Payé</span><div className={s.kpiIcon}><CheckCircle size={18} /></div></div>
          <div className={s.kpiValue}>{totalPaye.toLocaleString('fr-FR')}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{FACTURES.filter(f => f.statut === 'payee').length} factures</div>
        </div>
        <div className={clsx(s.kpi, s.kpiDanger)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>En Retard</span><div className={s.kpiIcon}><AlertTriangle size={18} /></div></div>
          <div className={s.kpiValue}>{totalRetard.toLocaleString('fr-FR')}&nbsp;&euro;</div>
          <div className={s.kpiSub}>{FACTURES.filter(f => f.statut === 'retard').length} factures</div>
        </div>
        <div className={clsx(s.kpi, s.kpiWarning)}>
          <div className={s.kpiTop}><span className={s.kpiLabel}>Cette Semaine</span><div className={s.kpiIcon}><Calendar size={18} /></div></div>
          <div className={s.kpiValue}>3</div>
          <div className={s.kpiSub}>Échéances à venir</div>
        </div>
      </div>

      {/* Table */}
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
          {FACTURES.map((f, i) => {
            const st = STATUT_MAP[f.statut];
            return (
              <tr key={i}>
                <td>{f.date}</td>
                <td style={{ fontWeight: 600 }}>{f.fournisseur}</td>
                <td className={s.colorMuted}>{f.ref}</td>
                <td className={s.colorMuted}>{f.poste}</td>
                <td><span className={clsx(s.badge, s[st.class])}>{st.label}</span></td>
                <td className={s.mono} style={{ fontWeight: 700 }}>{fmt(f.montant)}&euro;</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
