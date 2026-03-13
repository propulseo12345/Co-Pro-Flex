'use client';

import {
  Building2, Plus, Download, Search,
  Check, RefreshCw, XCircle, AlertTriangle,
  Euro, Wrench, ShieldCheck, Calendar,
  TrendingUp, Shield, FileText,
} from 'lucide-react';
import styles from './preview.module.css';

// =====================================================
// DATA
// =====================================================
type Statut = 'ACTIF' | 'A_RENOUVELER' | 'EXPIRE' | 'RESILIE';
type TypeC = 'MAINTENANCE' | 'ASSURANCE' | 'ENERGIE' | 'NETTOYAGE';

interface Contrat {
  id: string;
  nom: string;
  fournisseur: string;
  type: TypeC;
  statut: Statut;
  dateFin: string;
  coutAnnuel: number;
  tacite: boolean;
  regl?: boolean;
}

const DATA: Contrat[] = [
  { id: '1', nom: 'Maintenance Ascenseur', fournisseur: 'Schindler', type: 'MAINTENANCE', statut: 'ACTIF', dateFin: '31/12/2025', coutAnnuel: 9600, tacite: true, regl: true },
  { id: '2', nom: 'Assurance Multirisque Immeuble', fournisseur: 'AXA Assurances', type: 'ASSURANCE', statut: 'ACTIF', dateFin: '31/12/2026', coutAnnuel: 8500, tacite: true },
  { id: '3', nom: 'Entretien Chaufferie', fournisseur: 'FlammePro', type: 'MAINTENANCE', statut: 'A_RENOUVELER', dateFin: '15/04/2026', coutAnnuel: 4800, tacite: false, regl: true },
  { id: '4', nom: 'RC Syndicat', fournisseur: 'MAIF', type: 'ASSURANCE', statut: 'ACTIF', dateFin: '31/12/2026', coutAnnuel: 2200, tacite: true },
  { id: '5', nom: 'Nettoyage Parties Communes', fournisseur: 'ProClean', type: 'NETTOYAGE', statut: 'ACTIF', dateFin: '28/02/2026', coutAnnuel: 5400, tacite: true },
  { id: '6', nom: 'Espaces Verts', fournisseur: 'VertJardin', type: 'MAINTENANCE', statut: 'EXPIRE', dateFin: '31/12/2025', coutAnnuel: 3600, tacite: false },
  { id: '7', nom: 'Dommages-Ouvrage Ravalement', fournisseur: 'SMABTP', type: 'ASSURANCE', statut: 'ACTIF', dateFin: '15/03/2033', coutAnnuel: 0, tacite: false },
  { id: '8', nom: 'Protection Juridique', fournisseur: 'Juridica', type: 'ASSURANCE', statut: 'ACTIF', dateFin: '31/12/2026', coutAnnuel: 850, tacite: true },
  { id: '9', nom: 'Contrat Énergie', fournisseur: 'Engie', type: 'ENERGIE', statut: 'A_RENOUVELER', dateFin: '31/05/2026', coutAnnuel: 18000, tacite: true },
  { id: '10', nom: 'Maintenance VMC', fournisseur: 'Climat Services', type: 'MAINTENANCE', statut: 'ACTIF', dateFin: '31/12/2026', coutAnnuel: 2400, tacite: true },
];

const SYNDIC = { nom: 'Foncia', montant: 3000, dateFin: '08/03/2027', annee: '1/1' };

const PRIORITY: Record<Statut, number> = { EXPIRE: 0, A_RENOUVELER: 1, ACTIF: 2, RESILIE: 3 };
const sorted = [...DATA].sort((a, b) => PRIORITY[a.statut] - PRIORITY[b.statut]);

const STATUT: Record<Statut, { label: string; color: string }> = {
  ACTIF: { label: 'Actif', color: '#3ecf8e' },
  A_RENOUVELER: { label: 'À renouveler', color: '#e5a63e' },
  EXPIRE: { label: 'Expiré', color: '#e35d6a' },
  RESILIE: { label: 'Résilié', color: '#7b8498' },
};

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' €';

const actifs = DATA.filter(c => c.statut === 'ACTIF').length;
const renouv = DATA.filter(c => c.statut === 'A_RENOUVELER').length;
const expires = DATA.filter(c => c.statut === 'EXPIRE').length;
const totalAnnuel = DATA.filter(c => c.statut !== 'RESILIE' && c.statut !== 'EXPIRE').reduce((s, c) => s + c.coutAnnuel, 0) + SYNDIC.montant;

const costMaint = DATA.filter(c => c.type === 'MAINTENANCE' || c.type === 'NETTOYAGE');
const costAssur = DATA.filter(c => c.type === 'ASSURANCE');
const costEnergie = DATA.filter(c => c.type === 'ENERGIE');

// =====================================================
// PAGE
// =====================================================
export default function ContractsV2() {
  // Group by status section
  const expiredItems = sorted.filter(c => c.statut === 'EXPIRE');
  const renewItems = sorted.filter(c => c.statut === 'A_RENOUVELER');
  const activeItems = sorted.filter(c => c.statut === 'ACTIF');

  return (
    <div className={styles.page}>
      <div className={styles.preview}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Contrats & Assurances</h1>
            <p>{DATA.length} contrats actifs sur la copropriété</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnGhost}><Download size={14} /> Exporter</button>
            <button className={styles.btnAccent}><Plus size={14} /> Nouveau contrat</button>
          </div>
        </div>

        {/* KPIs */}
        <div className={styles.kpiRow}>
          {[
            { v: actifs + 1, l: 'Actifs', color: '#3ecf8e' },
            { v: renouv, l: 'À renouveler', color: '#e5a63e' },
            { v: expires, l: 'Expirés', color: '#e35d6a', alert: expires > 0 },
            { v: fmt(totalAnnuel), l: 'Coût annuel', color: '#5b8def' },
            { v: DATA.length, l: 'Total contrats', color: '#7b8498' },
          ].map(k => (
            <div key={k.l} className={`${styles.kpi} ${k.alert ? styles.kpiAlert : ''}`}>
              <span className={styles.kpiDot} style={{ background: k.color }} />
              <div className={styles.kpiData}>
                <span className={styles.kpiNum}>{k.v}</span>
                <span className={styles.kpiLabel}>{k.l}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Syndic */}
        <div className={styles.syndic}>
          <div className={styles.syndicAvatar}><Building2 size={17} /></div>
          <div className={styles.syndicBody}>
            <span className={styles.syndicName}>{SYNDIC.nom}</span>
            <div className={styles.syndicMeta}>
              <span><Euro size={11} /> {fmt(SYNDIC.montant)}/an</span>
              <span><Calendar size={11} /> Éch. {SYNDIC.dateFin}</span>
              <span>Année {SYNDIC.annee}</span>
            </div>
          </div>
          <span className={styles.syndicBadge}>Actif</span>
          <button className={styles.syndicBtn}>Gérer</button>
        </div>

        {/* Cost strip */}
        <div className={styles.costStrip}>
          {[
            { label: 'Syndic', amount: SYNDIC.montant, count: 1, icon: Building2, color: '#5b8def' },
            { label: 'Maintenance', amount: costMaint.reduce((s, c) => s + c.coutAnnuel, 0), count: costMaint.length, icon: Wrench, color: '#5b8def' },
            { label: 'Assurances', amount: costAssur.reduce((s, c) => s + c.coutAnnuel, 0), count: costAssur.length, icon: ShieldCheck, color: '#9b8afb' },
            { label: 'Énergie', amount: costEnergie.reduce((s, c) => s + c.coutAnnuel, 0), count: costEnergie.length, icon: TrendingUp, color: '#e5a63e' },
          ].map(cat => {
            const I = cat.icon;
            return (
              <div key={cat.label} className={styles.costCell}>
                <div className={styles.costIcon} style={{ background: cat.color + '12', color: cat.color }}>
                  <I size={14} />
                </div>
                <div className={styles.costData}>
                  <span className={styles.costLabel}>{cat.label} ({cat.count})</span>
                  <span className={styles.costAmount}>{fmt(cat.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contracts list */}
        <div className={styles.listPanel}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>
              <FileText size={14} />
              Contrats & Échéances
              <span className={styles.listCount}>{DATA.length}</span>
            </span>
            <div className={styles.filters}>
              <div className={styles.searchBox}>
                <Search size={13} />
                <input placeholder="Rechercher..." />
              </div>
              <select className={styles.filterChip}><option>Tous statuts</option></select>
              <select className={styles.filterChip}><option>Tous types</option></select>
            </div>
          </div>

          <div className={styles.listBody}>
            {/* Expired section */}
            {expiredItems.length > 0 && (
              <>
                <div className={styles.sectionLabel}>
                  <AlertTriangle size={10} style={{ marginRight: 4, verticalAlign: -1 }} />
                  Expirés — action requise
                </div>
                {expiredItems.map(c => <ContractRow key={c.id} c={c} />)}
              </>
            )}

            {/* To renew section */}
            {renewItems.length > 0 && (
              <>
                <div className={styles.sectionLabel}>À renouveler</div>
                {renewItems.map(c => <ContractRow key={c.id} c={c} />)}
              </>
            )}

            {/* Active section */}
            {activeItems.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Actifs</div>
                {activeItems.map(c => <ContractRow key={c.id} c={c} />)}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// =====================================================
// ROW COMPONENT
// =====================================================
function ContractRow({ c }: { c: Contrat }) {
  const s = STATUT[c.statut];
  const isExpired = c.statut === 'EXPIRE';

  return (
    <div className={isExpired ? styles.rowExpired : styles.row}>
      <div className={styles.rowIndicator} style={{ background: s.color }} />
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>
          {c.nom}
          {c.regl && <span className={styles.reglBadge}><Shield size={8} /> Régl.</span>}
          {c.tacite && <span className={styles.tacite}><RefreshCw size={10} /> tacite</span>}
        </div>
        <div className={styles.rowSub}>
          {c.fournisseur}
        </div>
      </div>
      <span className={styles.rowBadge} style={{ color: s.color, background: s.color + '12' }}>
        {s.label}
      </span>
      <span className={styles.rowDate}>{c.dateFin}</span>
      <span className={c.coutAnnuel > 0 ? styles.rowAmount : styles.rowAmountZero}>
        {c.coutAnnuel > 0 ? fmt(c.coutAnnuel) : '—'}
      </span>
    </div>
  );
}
