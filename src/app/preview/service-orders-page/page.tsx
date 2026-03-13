'use client';

import { useState } from 'react';
import {
  Search, Plus, Download, FileText, Clock, CheckCircle2,
  AlertTriangle, Send, Archive, Activity, MoreVertical,
  Eye, Edit, Mail, Trash2, Filter, ChevronDown, ChevronRight,
  Calendar, Euro, User, Building2, Zap, ArrowRight,
} from 'lucide-react';
import styles from './preview.module.css';

// =====================================================
// TYPES
// =====================================================
type Variante = 'A' | 'B' | 'C';
type StatusId = 'draft' | 'sent' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'closed' | 'cancelled';

interface MockOS {
  id: string;
  numero: string;
  titre: string;
  fournisseur: string;
  statut: StatusId;
  type: 'classique' | 'contractuel';
  date: string;
  dateIntervention?: string;
  montantEstime?: number;
  urgence: boolean;
  description: string;
}

// =====================================================
// MOCK DATA
// =====================================================
const MOCK_OS: MockOS[] = [
  { id: '1', numero: 'OS-2026-001', titre: 'Réparation fuite toiture bât. C', fournisseur: 'Toitures Rhône', statut: 'in_progress', type: 'classique', date: '28/01/2026', dateIntervention: '02/02/2026', montantEstime: 890, urgence: true, description: 'Infiltration signalée au 5e étage' },
  { id: '2', numero: 'OS-2026-002', titre: 'Maintenance ascenseur T1', fournisseur: 'Schindler', statut: 'scheduled', type: 'contractuel', date: '25/01/2026', dateIntervention: '15/02/2026', montantEstime: 320, urgence: false, description: 'Visite trimestrielle préventive' },
  { id: '3', numero: 'OS-2026-003', titre: 'Remplacement éclairage hall B', fournisseur: 'TechElec Services', statut: 'completed', type: 'classique', date: '20/01/2026', montantEstime: 450, urgence: false, description: 'Passage en LED du hall d\'entrée' },
  { id: '4', numero: 'OS-2026-004', titre: 'Révision portes de garage', fournisseur: 'TechPortail', statut: 'sent', type: 'contractuel', date: '18/01/2026', montantEstime: 220, urgence: false, description: 'Contrôle annuel des portes automatiques' },
  { id: '5', numero: 'OS-2026-005', titre: 'Débouchage colonne EU bât. A', fournisseur: 'Plomb Express', statut: 'completed', type: 'classique', date: '15/01/2026', montantEstime: 280, urgence: true, description: 'Colonne eaux usées bouchée RDC' },
  { id: '6', numero: 'OS-2026-006', titre: 'Entretien espaces verts Q1', fournisseur: 'Paysagiste Expert', statut: 'draft', type: 'contractuel', date: '10/01/2026', montantEstime: 600, urgence: false, description: 'Taille haies et entretien pelouse' },
  { id: '7', numero: 'OS-2026-007', titre: 'Ramonage chaudière collective', fournisseur: 'FlammePro', statut: 'closed', type: 'classique', date: '15/12/2025', montantEstime: 350, urgence: false, description: 'Ramonage obligatoire annuel' },
  { id: '8', numero: 'OS-2026-008', titre: 'Contrôle sécurité incendie', fournisseur: 'SecurMax', statut: 'accepted', type: 'classique', date: '05/01/2026', dateIntervention: '20/02/2026', montantEstime: 180, urgence: false, description: 'Vérification extincteurs et alarmes' },
];

const STATUT_CONFIG: Record<StatusId, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', color: '#64748b', icon: Clock },
  sent: { label: 'Envoyé', color: '#A78BFA', icon: Send },
  accepted: { label: 'Accepté', color: '#60A5FA', icon: CheckCircle2 },
  scheduled: { label: 'Programmé', color: '#2563eb', icon: Calendar },
  in_progress: { label: 'En cours', color: '#FBBF24', icon: Activity },
  completed: { label: 'Réalisé', color: '#34D399', icon: CheckCircle2 },
  closed: { label: 'Clôturé', color: '#8892a4', icon: Archive },
  cancelled: { label: 'Annulé', color: '#EF4444', icon: Trash2 },
};

const KPIS = {
  total: MOCK_OS.length,
  brouillons: MOCK_OS.filter(o => o.statut === 'draft').length,
  enAttente: MOCK_OS.filter(o => o.statut === 'sent' || o.statut === 'accepted').length,
  programmes: MOCK_OS.filter(o => o.statut === 'scheduled' || o.statut === 'in_progress').length,
  realises: MOCK_OS.filter(o => o.statut === 'completed').length,
  clotures: MOCK_OS.filter(o => o.statut === 'closed').length,
};

const KPI_LIST = [
  { label: 'Total', value: KPIS.total, color: '#2563eb', icon: FileText },
  { label: 'Brouillons', value: KPIS.brouillons, color: '#64748b', icon: Clock },
  { label: 'En attente', value: KPIS.enAttente, color: '#FBBF24', icon: Send },
  { label: 'Programmés', value: KPIS.programmes, color: '#60A5FA', icon: Activity },
  { label: 'Réalisés', value: KPIS.realises, color: '#34D399', icon: CheckCircle2 },
  { label: 'Clôturés', value: KPIS.clotures, color: '#8892a4', icon: Archive },
];

// =====================================================
// SHARED — KPI BAR
// =====================================================
function KpiBar() {
  return (
    <div className={styles.kpiBar}>
      {KPI_LIST.map(k => {
        const Icon = k.icon;
        return (
          <div key={k.label} className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: k.color + '15', color: k.color }}>
              <Icon size={16} />
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

// =====================================================
// SHARED — SEARCH + FILTERS
// =====================================================
function SearchFilters() {
  return (
    <div className={styles.searchSection}>
      <div className={styles.searchRow}>
        <div className={styles.searchInput}>
          <Search size={16} className={styles.searchIcon} />
          <input type="text" placeholder="Rechercher un ordre de service..." className={styles.searchField} />
        </div>
        <button className={styles.filterBtn}><Filter size={14} /> Filtres</button>
      </div>
      <div className={styles.filterChips}>
        <button className={styles.chip}>Tous types <ChevronDown size={12} /></button>
        <button className={styles.chip}>Tous prestataires <ChevronDown size={12} /></button>
      </div>
      <div className={styles.resultsSummary}>
        <span>{MOCK_OS.length} ordres de service</span>
        <div className={styles.resultsBadges}>
          <span className={styles.resultBadge} style={{ color: '#FBBF24' }}>● {KPIS.enAttente} en attente</span>
          <span className={styles.resultBadge} style={{ color: '#60A5FA' }}>● {KPIS.programmes} programmés</span>
          <span className={styles.resultBadge} style={{ color: '#34D399' }}>● {KPIS.realises} réalisés</span>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// VARIANTE A — Tableau dense (comme logbook)
// =====================================================
function VarianteA() {
  return (
    <>
      <SearchFilters />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>N°</th>
              <th className={styles.th}>Titre</th>
              <th className={styles.th}>Prestataire</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Statut</th>
              <th className={styles.th}>Date</th>
              <th className={`${styles.th} ${styles.thRight}`}>Montant</th>
              <th className={styles.thActions}></th>
            </tr>
          </thead>
          <tbody>
            {MOCK_OS.map(os => {
              const s = STATUT_CONFIG[os.statut];
              return (
                <tr key={os.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.tableNumero}>{os.numero}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.titleCell}>
                      <span className={styles.tableTitre}>
                        {os.urgence && <Zap size={12} className={styles.urgenceIcon} />}
                        {os.titre}
                      </span>
                      <span className={styles.tableDesc}>{os.description}</span>
                    </div>
                  </td>
                  <td className={styles.td}><span className={styles.tableMeta}>{os.fournisseur}</span></td>
                  <td className={styles.td}>
                    <span className={`${styles.typeBadge} ${os.type === 'contractuel' ? styles.typeContractuel : styles.typeClassique}`}>
                      {os.type === 'contractuel' ? 'Contractuel' : 'Classique'}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.statutBadge} style={{ color: s.color, background: s.color + '15' }}>
                      {s.label}
                    </span>
                  </td>
                  <td className={styles.td}><span className={styles.tableMeta}>{os.date}</span></td>
                  <td className={`${styles.td} ${styles.tdRight}`}>
                    <span className={styles.tableCout}>
                      {os.montantEstime ? `${os.montantEstime.toLocaleString('fr-FR')} €` : '—'}
                    </span>
                  </td>
                  <td className={styles.tdActions}>
                    <button className={styles.tableActionBtn}><Eye size={14} /></button>
                    <button className={styles.tableActionBtn}><MoreVertical size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// =====================================================
// VARIANTE B — Kanban par statut
// =====================================================
function VarianteB() {
  const columns: Array<{ status: StatusId[]; label: string; color: string }> = [
    { status: ['draft'], label: 'Brouillons', color: '#64748b' },
    { status: ['sent', 'accepted'], label: 'En attente', color: '#FBBF24' },
    { status: ['scheduled', 'in_progress'], label: 'Programmés', color: '#60A5FA' },
    { status: ['completed'], label: 'Réalisés', color: '#34D399' },
    { status: ['closed', 'cancelled'], label: 'Clôturés', color: '#8892a4' },
  ];

  return (
    <div className={styles.kanban}>
      {columns.map(col => {
        const items = MOCK_OS.filter(os => col.status.includes(os.statut));
        return (
          <div key={col.label} className={styles.kanbanCol}>
            <div className={styles.kanbanHeader}>
              <span className={styles.kanbanDot} style={{ background: col.color }} />
              <span className={styles.kanbanTitle}>{col.label}</span>
              <span className={styles.kanbanCount}>{items.length}</span>
            </div>
            <div className={styles.kanbanCards}>
              {items.map(os => {
                const s = STATUT_CONFIG[os.statut];
                return (
                  <div key={os.id} className={styles.kanbanCard}>
                    <div className={styles.kanbanCardTop}>
                      <span className={styles.kanbanCardNumero}>{os.numero}</span>
                      {os.urgence && <Zap size={12} className={styles.urgenceIcon} />}
                    </div>
                    <h4 className={styles.kanbanCardTitle}>{os.titre}</h4>
                    <div className={styles.kanbanCardMeta}>
                      <span><User size={12} /> {os.fournisseur}</span>
                      <span><Calendar size={12} /> {os.date}</span>
                    </div>
                    {os.montantEstime && (
                      <div className={styles.kanbanCardMontant}>
                        <Euro size={12} /> {os.montantEstime.toLocaleString('fr-FR')} €
                      </div>
                    )}
                    <div className={styles.kanbanCardFooter}>
                      <span className={`${styles.typeBadgeSm} ${os.type === 'contractuel' ? styles.typeContractuel : styles.typeClassique}`}>
                        {os.type === 'contractuel' ? 'Contrat' : 'Classique'}
                      </span>
                      <span className={styles.statutBadgeSm} style={{ color: s.color }}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className={styles.kanbanEmpty}>Aucun ordre</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// VARIANTE C — Liste + panneau détail (split view)
// =====================================================
function VarianteC() {
  const [selectedId, setSelectedId] = useState(MOCK_OS[0].id);
  const selected = MOCK_OS.find(o => o.id === selectedId) || MOCK_OS[0];
  const s = STATUT_CONFIG[selected.statut];
  const SIcon = s.icon;

  // Workflow steps
  const workflow: StatusId[] = ['draft', 'sent', 'accepted', 'scheduled', 'in_progress', 'completed', 'closed'];
  const currentIdx = workflow.indexOf(selected.statut);

  return (
    <>
      <SearchFilters />
      <div className={styles.splitView}>
        {/* Liste gauche */}
        <div className={styles.splitList}>
          {MOCK_OS.map(os => {
            const oss = STATUT_CONFIG[os.statut];
            const OsIcon = oss.icon;
            return (
              <button
                key={os.id}
                className={`${styles.splitItem} ${os.id === selectedId ? styles.splitItemActive : ''}`}
                onClick={() => setSelectedId(os.id)}
              >
                <div className={styles.splitItemLeft}>
                  <div className={styles.splitItemIcon} style={{ background: oss.color + '15', color: oss.color }}>
                    <OsIcon size={14} />
                  </div>
                  <div className={styles.splitItemInfo}>
                    <span className={styles.splitItemName}>
                      {os.urgence && <Zap size={11} className={styles.urgenceIconSm} />}
                      {os.titre}
                    </span>
                    <span className={styles.splitItemMeta}>{os.numero} · {os.fournisseur}</span>
                  </div>
                </div>
                <div className={styles.splitItemRight}>
                  {os.montantEstime && (
                    <span className={styles.splitItemMontant}>{os.montantEstime} €</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Détail droite */}
        <div className={styles.splitDetail}>
          <div className={styles.detailTop}>
            <div className={styles.detailHeader}>
              <div>
                <span className={styles.detailNumero}>{selected.numero}</span>
                <h3 className={styles.detailName}>
                  {selected.urgence && <Zap size={16} className={styles.urgenceIcon} />}
                  {selected.titre}
                </h3>
              </div>
              <span className={styles.statutBadge} style={{ color: s.color, background: s.color + '15' }}>
                <SIcon size={13} /> {s.label}
              </span>
            </div>
            <p className={styles.detailDesc}>{selected.description}</p>
          </div>

          {/* Workflow mini */}
          <div className={styles.workflowBar}>
            {workflow.map((step, i) => {
              const ws = STATUT_CONFIG[step];
              const isActive = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={step} className={styles.workflowStep}>
                  <div
                    className={`${styles.workflowDot} ${isActive ? styles.workflowDotActive : ''} ${isCurrent ? styles.workflowDotCurrent : ''}`}
                    style={isActive ? { background: ws.color, borderColor: ws.color } : undefined}
                  />
                  <span className={`${styles.workflowLabel} ${isCurrent ? styles.workflowLabelCurrent : ''}`}>
                    {ws.label}
                  </span>
                  {i < workflow.length - 1 && (
                    <div className={`${styles.workflowLine} ${isActive ? styles.workflowLineActive : ''}`}
                      style={isActive ? { background: ws.color } : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.detailStatsRow}>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>{selected.fournisseur}</span>
              <span className={styles.detailStatLabel}>Prestataire</span>
            </div>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>
                {selected.montantEstime ? `${selected.montantEstime.toLocaleString('fr-FR')} €` : '—'}
              </span>
              <span className={styles.detailStatLabel}>Montant estimé</span>
            </div>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>
                {selected.dateIntervention || '—'}
              </span>
              <span className={styles.detailStatLabel}>Date intervention</span>
            </div>
          </div>

          <div className={styles.detailInfoGrid}>
            <div className={styles.detailInfoItem}>
              <span className={styles.detailInfoLabel}>Type</span>
              <span className={`${styles.typeBadge} ${selected.type === 'contractuel' ? styles.typeContractuel : styles.typeClassique}`}>
                {selected.type === 'contractuel' ? 'Contractuel' : 'Classique'}
              </span>
            </div>
            <div className={styles.detailInfoItem}>
              <span className={styles.detailInfoLabel}>Date création</span>
              <span className={styles.detailInfoValue}>{selected.date}</span>
            </div>
            <div className={styles.detailInfoItem}>
              <span className={styles.detailInfoLabel}>Urgence</span>
              <span className={styles.detailInfoValue}>
                {selected.urgence ? <><Zap size={12} className={styles.urgenceIcon} /> Oui</> : 'Non'}
              </span>
            </div>
          </div>

          <div className={styles.detailActions}>
            <button className={styles.btnPrimary}><Eye size={14} /> Voir détails</button>
            <button className={styles.btnSecondary}><Mail size={14} /> Envoyer</button>
            <button className={styles.btnSecondary}><FileText size={14} /> PDF</button>
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================
// PAGE PREVIEW
// =====================================================
export default function ServiceOrdersPreview() {
  const [variant, setVariant] = useState<Variante>('A');

  const variantDescs: Record<Variante, string> = {
    A: 'Tableau dense — max visibilité, tri par colonnes',
    B: 'Kanban — colonnes par statut, vue workflow',
    C: 'Split view — liste + détail avec progression workflow',
  };

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Variante</span>
          <div className={styles.controlTabs}>
            {(['A', 'B', 'C'] as Variante[]).map(v => (
              <button
                key={v}
                className={`${styles.controlTab} ${variant === v ? styles.controlTabActive : ''}`}
                onClick={() => setVariant(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <span className={styles.controlDesc}>{variantDescs[variant]}</span>
        </div>
      </div>

      <div className={styles.preview}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbMuted}>Maintenance</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span>Ordres de service</span>
        </div>

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Ordres de service</h1>
          <div className={styles.pageActions}>
            <button className={styles.btnSecondary}><Download size={15} /> Exporter</button>
            <button className={styles.btnPrimary}><Plus size={15} /> Créer un ordre de service</button>
          </div>
        </div>

        <KpiBar />

        {variant === 'A' && <VarianteA />}
        {variant === 'B' && <VarianteB />}
        {variant === 'C' && <VarianteC />}
      </div>
    </div>
  );
}
