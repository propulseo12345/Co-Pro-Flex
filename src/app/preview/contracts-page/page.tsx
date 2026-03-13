'use client';

import { useState } from 'react';
import {
  FileText, Shield, Building2, Plus, Download, Search,
  MoreVertical, Check, RefreshCw, XCircle, AlertTriangle,
  Clock, Euro, ChevronDown, Wrench, ShieldCheck,
  Calendar, TrendingUp,
} from 'lucide-react';
import styles from './preview.module.css';

// =====================================================
// TYPES
// =====================================================
type DisplayVariant = 'A' | 'B' | 'C';
type StatutContrat = 'ACTIF' | 'A_RENOUVELER' | 'EXPIRE' | 'RESILIE';
type TypeContrat = 'MAINTENANCE' | 'ASSURANCE' | 'ENERGIE' | 'NETTOYAGE';

interface Contrat {
  id: string;
  nom: string;
  fournisseur: string;
  type: TypeContrat;
  statut: StatutContrat;
  dateDebut: string;
  dateFin: string;
  coutAnnuel: number;
  taciteReconduction: boolean;
  estReglementaire?: boolean;
}

// =====================================================
// MOCK DATA (sans section "Autres contrats")
// =====================================================
const CONTRATS: Contrat[] = [
  { id: '1', nom: 'Maintenance Ascenseur', fournisseur: 'Schindler', type: 'MAINTENANCE', statut: 'ACTIF', dateDebut: '01/01/2025', dateFin: '31/12/2025', coutAnnuel: 9600, taciteReconduction: true, estReglementaire: true },
  { id: '2', nom: 'Assurance Multirisque Immeuble', fournisseur: 'AXA Assurances', type: 'ASSURANCE', statut: 'ACTIF', dateDebut: '01/01/2026', dateFin: '31/12/2026', coutAnnuel: 8500, taciteReconduction: true },
  { id: '3', nom: 'Entretien Chaufferie', fournisseur: 'FlammePro', type: 'MAINTENANCE', statut: 'A_RENOUVELER', dateDebut: '01/01/2025', dateFin: '15/04/2026', coutAnnuel: 4800, taciteReconduction: false, estReglementaire: true },
  { id: '4', nom: 'RC Syndicat', fournisseur: 'MAIF', type: 'ASSURANCE', statut: 'ACTIF', dateDebut: '01/01/2026', dateFin: '31/12/2026', coutAnnuel: 2200, taciteReconduction: true },
  { id: '5', nom: 'Nettoyage Parties Communes', fournisseur: 'ProClean', type: 'NETTOYAGE', statut: 'ACTIF', dateDebut: '01/03/2025', dateFin: '28/02/2026', coutAnnuel: 5400, taciteReconduction: true },
  { id: '6', nom: 'Espaces Verts', fournisseur: 'VertJardin', type: 'MAINTENANCE', statut: 'EXPIRE', dateDebut: '01/01/2024', dateFin: '31/12/2025', coutAnnuel: 3600, taciteReconduction: false },
  { id: '7', nom: 'Dommages-Ouvrage Ravalement', fournisseur: 'SMABTP', type: 'ASSURANCE', statut: 'ACTIF', dateDebut: '15/03/2023', dateFin: '15/03/2033', coutAnnuel: 0, taciteReconduction: false },
  { id: '8', nom: 'Protection Juridique', fournisseur: 'Juridica', type: 'ASSURANCE', statut: 'ACTIF', dateDebut: '01/01/2026', dateFin: '31/12/2026', coutAnnuel: 850, taciteReconduction: true },
  { id: '9', nom: 'Contrat Énergie', fournisseur: 'Engie', type: 'ENERGIE', statut: 'A_RENOUVELER', dateDebut: '01/06/2024', dateFin: '31/05/2026', coutAnnuel: 18000, taciteReconduction: true },
  { id: '10', nom: 'Maintenance VMC', fournisseur: 'Climat Services', type: 'MAINTENANCE', statut: 'ACTIF', dateDebut: '01/01/2026', dateFin: '31/12/2026', coutAnnuel: 2400, taciteReconduction: true },
];

const SYNDIC = {
  nom: 'Cabinet Gestion Lyon',
  montant: 7200,
  dateFin: '31/12/2027',
  statut: 'ACTIF' as const,
  annee: '2/3',
};

const STATUT_CONFIG: Record<StatutContrat, { label: string; color: string; icon: React.ElementType }> = {
  ACTIF: { label: 'Actif', color: '#22c55e', icon: Check },
  A_RENOUVELER: { label: 'À renouveler', color: '#FBBF24', icon: RefreshCw },
  EXPIRE: { label: 'Expiré', color: '#EF4444', icon: XCircle },
  RESILIE: { label: 'Résilié', color: '#64748b', icon: XCircle },
};

const TYPE_CONFIG: Record<TypeContrat, { label: string; color: string; icon: React.ElementType }> = {
  MAINTENANCE: { label: 'Maintenance', color: '#60A5FA', icon: Wrench },
  ASSURANCE: { label: 'Assurance', color: '#A78BFA', icon: ShieldCheck },
  ENERGIE: { label: 'Énergie', color: '#FBBF24', icon: TrendingUp },
  NETTOYAGE: { label: 'Nettoyage', color: '#34D399', icon: Wrench },
};

const STATUT_PRIORITY: Record<StatutContrat, number> = {
  EXPIRE: 0,
  A_RENOUVELER: 1,
  ACTIF: 2,
  RESILIE: 3,
};

const SORTED_CONTRATS = [...CONTRATS].sort(
  (a, b) => STATUT_PRIORITY[a.statut] - STATUT_PRIORITY[b.statut]
);

// Stats
const stats = {
  actifs: CONTRATS.filter(c => c.statut === 'ACTIF').length,
  aRenouveler: CONTRATS.filter(c => c.statut === 'A_RENOUVELER').length,
  expires: CONTRATS.filter(c => c.statut === 'EXPIRE').length,
  montantTotal: CONTRATS.filter(c => c.statut !== 'RESILIE' && c.statut !== 'EXPIRE').reduce((s, c) => s + c.coutAnnuel, 0) + SYNDIC.montant,
  totalContrats: CONTRATS.length,
};

function formatMontant(m: number) {
  return m.toLocaleString('fr-FR') + ' €';
}

// =====================================================
// SHARED COMPONENTS
// =====================================================
function PageHeader() {
  return (
    <div className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>
        <FileText size={24} /> Contrats & Assurances
      </h1>
      <div className={styles.headerActions}>
        <button className={styles.btnSecondary}><Download size={16} /> Exporter</button>
        <button className={styles.btnPrimary}><Plus size={16} /> Nouveau contrat</button>
      </div>
    </div>
  );
}

function KpiBar() {
  const kpis = [
    { label: 'Actifs', value: stats.actifs, color: '#22c55e', icon: Check },
    { label: 'À renouveler', value: stats.aRenouveler, color: '#FBBF24', icon: RefreshCw },
    { label: 'Expirés', value: stats.expires, color: '#EF4444', icon: XCircle, alert: stats.expires > 0 },
    { label: 'Total annuel', value: formatMontant(stats.montantTotal), color: '#60A5FA', icon: Euro },
    { label: 'Total contrats', value: stats.totalContrats, color: '#94a3b8', icon: FileText },
  ];

  return (
    <div className={styles.kpiBar}>
      {kpis.map(k => {
        const Icon = k.icon;
        return (
          <div key={k.label} className={`${styles.kpiCard} ${k.alert ? styles.kpiCardAlert : ''}`}>
            <div className={styles.kpiIcon} style={{ background: k.color + '15', color: k.color }}>
              <Icon size={18} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiValue}>{k.value}</span>
              <span className={styles.kpiLabel}>{k.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SyndicBanner() {
  return (
    <div className={styles.syndicBanner}>
      <div className={styles.syndicIcon}>
        <Building2 size={22} />
      </div>
      <div className={styles.syndicInfo}>
        <div className={styles.syndicName}>{SYNDIC.nom}</div>
        <div className={styles.syndicMeta}>
          <span><Euro size={12} /> {formatMontant(SYNDIC.montant)}/an</span>
          <span><Calendar size={12} /> Échéance {SYNDIC.dateFin}</span>
          <span><Clock size={12} /> Année {SYNDIC.annee}</span>
        </div>
      </div>
      <div className={styles.syndicStatus}>
        <Check size={14} /> Actif
      </div>
      <div className={styles.syndicActions}>
        <button className={styles.btnSecondary}>Gérer</button>
      </div>
    </div>
  );
}

function AlertBanner() {
  if (stats.expires === 0) return null;
  return (
    <div className={styles.alertBanner}>
      <AlertTriangle size={18} />
      <span><strong>{stats.expires} contrat{stats.expires > 1 ? 's' : ''} expiré{stats.expires > 1 ? 's' : ''}</strong> — Action requise</span>
      <button className={styles.alertAction}>Voir</button>
    </div>
  );
}

function FiltersBar() {
  const dotStats = [
    { color: '#22c55e', label: `${stats.actifs} actifs` },
    { color: '#FBBF24', label: `${stats.aRenouveler} à renouveler` },
    { color: '#EF4444', label: `${stats.expires} expirés` },
  ];

  return (
    <div className={styles.filtersBar}>
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input className={styles.searchInput} placeholder="Rechercher un contrat..." />
      </div>
      <select className={styles.filterSelect}><option>Tous statuts</option></select>
      <select className={styles.filterSelect}><option>Tous types</option></select>
      <select className={styles.filterSelect}><option>Tous prestataires</option></select>
      <span className={styles.resultCount}>{CONTRATS.length} contrats</span>
      <div className={styles.resultDots}>
        {dotStats.map(d => (
          <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className={styles.dot} style={{ background: d.color }} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// VARIANT A — TABLEAU UNIFIÉ
// =====================================================
function VariantA() {
  return (
    <div className={styles.preview}>
      <PageHeader />
      <KpiBar />
      <SyndicBanner />
      <AlertBanner />
      <FiltersBar />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Statut</th>
              <th className={styles.th}>Contrat</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Reconduction</th>
              <th className={styles.th}>Échéance</th>
              <th className={styles.thRight}>Coût annuel</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {SORTED_CONTRATS.map(c => {
              const s = STATUT_CONFIG[c.statut];
              const t = TYPE_CONFIG[c.type];
              const SIcon = s.icon;
              return (
                <tr key={c.id} className={c.statut === 'EXPIRE' ? styles.trExpired : styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.statutBadge} style={{ color: s.color, background: s.color + '15' }}>
                      <SIcon size={12} /> {s.label}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.contratNom}>
                      {c.nom}
                      {c.estReglementaire && (
                        <span className={styles.badgeReglementaire}><Shield size={10} /> Régl.</span>
                      )}
                    </div>
                    <div className={styles.contratFournisseur}>{c.fournisseur}</div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.typeBadge} style={{ color: t.color, background: t.color + '12' }}>
                      {t.label}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.reconduction}>
                      {c.taciteReconduction ? <><RefreshCw size={12} /> Tacite</> : 'Express'}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={c.statut === 'EXPIRE' ? styles.echeanceUrgent : c.statut === 'A_RENOUVELER' ? styles.echeanceProche : styles.echeance}>
                      {c.dateFin}
                    </span>
                  </td>
                  <td className={styles.tdRight}>
                    {c.coutAnnuel > 0 ? formatMontant(c.coutAnnuel) : '—'}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actionsCell}>
                      <button className={styles.actionBtn}><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// VARIANT B — SECTIONS ACCORDÉON
// =====================================================
function VariantB() {
  const maintenance = CONTRATS.filter(c => c.type === 'MAINTENANCE' || c.type === 'NETTOYAGE' || c.type === 'ENERGIE');
  const assurances = CONTRATS.filter(c => c.type === 'ASSURANCE');
  const montantMaint = maintenance.reduce((s, c) => s + c.coutAnnuel, 0);
  const montantAss = assurances.reduce((s, c) => s + c.coutAnnuel, 0);

  const sections = [
    { title: 'Contrats de maintenance', items: maintenance, icon: Wrench, color: '#60A5FA', montant: montantMaint },
    { title: 'Assurances', items: assurances, icon: ShieldCheck, color: '#A78BFA', montant: montantAss },
  ];

  return (
    <div className={styles.preview}>
      <PageHeader />
      <KpiBar />
      <SyndicBanner />
      <AlertBanner />
      <FiltersBar />

      {sections.map(sec => {
        const SecIcon = sec.icon;
        const sortedItems = [...sec.items].sort((a, b) => STATUT_PRIORITY[a.statut] - STATUT_PRIORITY[b.statut]);
        return (
          <div key={sec.title} className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon} style={{ background: sec.color + '15', color: sec.color }}>
                <SecIcon size={18} />
              </div>
              <span className={styles.sectionTitle}>{sec.title}</span>
              <span className={styles.sectionCount}>{sec.items.length}</span>
              <span className={styles.sectionMontant}>{formatMontant(sec.montant)}/an</span>
              <ChevronDown size={18} className={styles.sectionChevron} />
            </div>
            <div className={styles.sectionBody}>
              {sortedItems.map(c => {
                const s = STATUT_CONFIG[c.statut];
                const SIcon = s.icon;
                return (
                  <div key={c.id} className={styles.contractCard}>
                    <div className={styles.contractCardIcon} style={{ background: s.color + '12', color: s.color }}>
                      <SIcon size={18} />
                    </div>
                    <div className={styles.contractCardInfo}>
                      <div className={styles.contractCardName}>
                        {c.nom}
                        {c.estReglementaire && (
                          <span className={styles.badgeReglementaire}><Shield size={10} /> Régl.</span>
                        )}
                      </div>
                      <div className={styles.contractCardMeta}>
                        <span>{c.fournisseur}</span>
                        <span>{c.taciteReconduction ? 'Tacite' : 'Express'}</span>
                        <span>Éch. {c.dateFin}</span>
                      </div>
                    </div>
                    <div className={styles.contractCardRight}>
                      <div className={styles.contractCardMontant} style={{ color: c.coutAnnuel > 0 ? '#e2e8f0' : '#475569' }}>
                        {c.coutAnnuel > 0 ? formatMontant(c.coutAnnuel) : '—'}
                      </div>
                      <div className={styles.contractCardEcheance}>
                        <span className={styles.statutBadge} style={{ color: s.color, background: s.color + '15', fontSize: 10 }}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                    <button className={styles.actionBtn}><MoreVertical size={16} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// VARIANT C — DASHBOARD VISUEL
// =====================================================
function VariantC() {
  const prochesEcheances = [...CONTRATS]
    .filter(c => c.statut !== 'RESILIE')
    .sort((a, b) => STATUT_PRIORITY[a.statut] - STATUT_PRIORITY[b.statut])
    .slice(0, 6);

  return (
    <div className={styles.preview}>
      <PageHeader />
      <KpiBar />
      <SyndicBanner />
      <AlertBanner />

      {/* Coûts par catégorie — barre compacte */}
      <div className={styles.costBarHeader}>
        <Euro size={15} /> Coûts annuels par catégorie
      </div>
      <div className={styles.costBar}>
        {[
          { label: 'Syndic', montant: SYNDIC.montant, color: '#60A5FA', icon: Building2, count: 1 },
          { label: 'Maintenance', montant: CONTRATS.filter(c => c.type === 'MAINTENANCE' || c.type === 'NETTOYAGE').reduce((s, c) => s + c.coutAnnuel, 0), color: '#60A5FA', icon: Wrench, count: CONTRATS.filter(c => c.type === 'MAINTENANCE' || c.type === 'NETTOYAGE').length },
          { label: 'Assurances', montant: CONTRATS.filter(c => c.type === 'ASSURANCE').reduce((s, c) => s + c.coutAnnuel, 0), color: '#A78BFA', icon: ShieldCheck, count: CONTRATS.filter(c => c.type === 'ASSURANCE').length },
          { label: 'Énergie', montant: CONTRATS.filter(c => c.type === 'ENERGIE').reduce((s, c) => s + c.coutAnnuel, 0), color: '#FBBF24', icon: TrendingUp, count: CONTRATS.filter(c => c.type === 'ENERGIE').length },
        ].map(cat => {
          const CatIcon = cat.icon;
          return (
            <div key={cat.label} className={styles.costBarItem}>
              <div className={styles.costBarIcon} style={{ background: cat.color + '15', color: cat.color }}>
                <CatIcon size={15} />
              </div>
              <div className={styles.costBarInfo}>
                <span className={styles.costBarLabel}>{cat.label} <span className={styles.costBarCount}>({cat.count})</span></span>
                <span className={styles.costBarValue}>{formatMontant(cat.montant)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline échéances */}
      <div className={styles.dashPanel}>
        <div className={styles.dashPanelHeader}>
          <span className={styles.dashPanelTitle}><Calendar size={16} /> Prochaines échéances</span>
          <FiltersBar />
        </div>
        <div className={styles.dashPanelBody}>
          <div className={styles.timeline}>
            {prochesEcheances.map(c => {
              const urgentClass = c.statut === 'EXPIRE' ? styles.timelineItemUrgent
                : c.statut === 'A_RENOUVELER' ? styles.timelineItemWarning
                : styles.timelineItemOk;
              const s = STATUT_CONFIG[c.statut];
              return (
                <div key={c.id} className={`${styles.timelineItem} ${urgentClass}`}>
                  <span className={styles.timelineDate}>{c.dateFin}</span>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineName}>
                      {c.nom}
                      {' '}
                      <span className={styles.statutBadge} style={{ color: s.color, background: s.color + '15', fontSize: 10 }}>
                        {s.label}
                      </span>
                    </div>
                    <div className={styles.timelineFournisseur}>
                      {c.fournisseur} — {formatMontant(c.coutAnnuel)}/an
                    </div>
                  </div>
                  <button className={styles.actionBtn}><MoreVertical size={16} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN PAGE
// =====================================================
export default function ContractsPreview() {
  const [variant, setVariant] = useState<DisplayVariant>('A');

  const variants: Array<{ id: DisplayVariant; label: string; desc: string }> = [
    { id: 'A', label: 'Tableau unifié', desc: 'Tout dans un tableau dense, trié par statut' },
    { id: 'B', label: 'Sections', desc: 'Accordéons Maintenance / Assurances avec cartes' },
    { id: 'C', label: 'Dashboard', desc: 'KPIs + répartition + timeline échéances' },
  ];

  return (
    <div className={styles.page}>
      {/* Sélecteur de variante */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Variante</span>
          <div className={styles.tabs}>
            {variants.map(v => (
              <button
                key={v.id}
                className={`${styles.tab} ${variant === v.id ? styles.tabActive : ''}`}
                onClick={() => setVariant(v.id)}
                title={v.desc}
              >
                {v.id} — {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
    </div>
  );
}
