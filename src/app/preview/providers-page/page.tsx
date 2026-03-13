'use client';

import { useState } from 'react';
import {
  Search, Plus, Download, Phone, Mail, Star, MapPin, Wrench,
  MoreVertical, ChevronDown, ChevronUp, Users, Building2,
  Globe, Calendar, Briefcase, Shield, Zap, Eye,
  Filter, ArrowUpDown, ExternalLink, Award, Clock,
} from 'lucide-react';
import styles from './preview.module.css';

// =====================================================
// TYPES
// =====================================================
type Variante = 'A' | 'B' | 'C';
type TabId = 'copro' | 'syndic' | 'coproflex';

interface MockPrestataire {
  id: string;
  nom: string;
  domaines: string[];
  telephone: string;
  email: string;
  ville: string;
  note: number;
  nbInterventions: number;
  derniereIntervention: string;
  certifications: string[];
  statut: 'actif' | 'inactif' | 'nouveau';
  contactReferent?: string;
  tarifIndicatif?: string;
  labelCoproFlex?: boolean;
  delaiIntervention?: string;
}

// =====================================================
// MOCK DATA
// =====================================================
const MOCK: MockPrestataire[] = [
  { id: '1', nom: 'Schindler Ascenseurs', domaines: ['Ascenseur'], telephone: '0800 234 567', email: 'service@schindler.fr', ville: 'Lyon 3e', note: 4.5, nbInterventions: 12, derniereIntervention: '15/01/2026', certifications: ['ISO 9001', 'QualiPropre'], statut: 'actif', contactReferent: 'F. Berger' },
  { id: '2', nom: 'Nettoyage Pro', domaines: ['Ménage'], telephone: '04 72 33 44 55', email: 'contact@nettoyagepro.fr', ville: 'Lyon 6e', note: 4.2, nbInterventions: 24, derniereIntervention: '28/01/2026', certifications: ['QualiPropre'], statut: 'actif' },
  { id: '3', nom: 'Chauffage Expert', domaines: ['Chauffage', 'Plomberie'], telephone: '04 72 88 99 00', email: 'intervention@chauffage-expert.fr', ville: 'Lyon 7e', note: 3.8, nbInterventions: 8, derniereIntervention: '10/12/2025', certifications: [], statut: 'actif', contactReferent: 'P. Martin' },
  { id: '4', nom: 'TechElec Services', domaines: ['Électricité', 'Interphone'], telephone: '04 78 12 34 56', email: 'contact@techelec.fr', ville: 'Lyon 3e', note: 4.7, nbInterventions: 6, derniereIntervention: '05/02/2026', certifications: ['QualiElec'], statut: 'actif' },
  { id: '5', nom: 'Paysagiste Expert', domaines: ['Espaces verts'], telephone: '04 78 55 66 77', email: 'contact@paysagiste-expert.fr', ville: 'Lyon 5e', note: 4.0, nbInterventions: 4, derniereIntervention: '20/11/2025', certifications: [], statut: 'actif' },
  { id: '6', nom: 'ProtectAssur', domaines: ['Assurance'], telephone: '04 78 99 00 11', email: 'copro@protectassur.fr', ville: 'Lyon 2e', note: 3.5, nbInterventions: 2, derniereIntervention: '01/06/2025', certifications: [], statut: 'inactif', contactReferent: 'M. Fontaine' },
  { id: '7', nom: 'Toitures Rhône', domaines: ['Toiture', 'Étanchéité'], telephone: '04 72 55 66 77', email: 'devis@toitures-rhone.fr', ville: 'Villeurbanne', note: 4.3, nbInterventions: 3, derniereIntervention: '28/01/2026', certifications: ['Qualibat RGE'], statut: 'nouveau' },
];

const KPIS = {
  total: MOCK.length,
  actifs: MOCK.filter(p => p.statut === 'actif').length,
  interventionsMois: 8,
  noteMoyenne: +(MOCK.reduce((s, p) => s + p.note, 0) / MOCK.length).toFixed(1),
};

const DOMAINE_COLORS: Record<string, string> = {
  Ascenseur: '#5b8def',
  'Ménage': '#3ecf8e',
  Chauffage: '#e5a63e',
  Plomberie: '#60A5FA',
  'Électricité': '#FBBF24',
  Interphone: '#A78BFA',
  'Espaces verts': '#34D399',
  Assurance: '#F87171',
  Toiture: '#9b8afb',
  'Étanchéité': '#60A5FA',
};

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  actif: { label: 'Actif', color: '#34D399' },
  inactif: { label: 'Inactif', color: '#64748b' },
  nouveau: { label: 'Nouveau', color: '#60A5FA' },
};

function StarRating({ note }: { note: number }) {
  return (
    <div className={styles.starRating}>
      <Star size={12} fill="#FBBF24" color="#FBBF24" />
      <span>{note.toFixed(1)}</span>
    </div>
  );
}

// =====================================================
// KPI BAR (shared)
// =====================================================
function KpiBar() {
  const kpis = [
    { label: 'Total', value: KPIS.total, color: '#2563eb', icon: Users },
    { label: 'Actifs', value: KPIS.actifs, color: '#34D399', icon: Shield },
    { label: 'Interventions/mois', value: KPIS.interventionsMois, color: '#FBBF24', icon: Wrench },
    { label: 'Note moyenne', value: `${KPIS.noteMoyenne}/5`, color: '#A78BFA', icon: Star },
  ];
  return (
    <div className={styles.kpiBar}>
      {kpis.map(k => {
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
// TABS BAR (shared)
// =====================================================
function TabsBar({ active, setActive }: { active: TabId; setActive: (t: TabId) => void }) {
  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType; count: number }> = [
    { id: 'copro', label: 'Copropriété', icon: Building2, count: MOCK.length },
    { id: 'syndic', label: 'Syndic', icon: Users, count: 5 },
    { id: 'coproflex', label: 'CoproFlex', icon: Globe, count: 12 },
  ];
  return (
    <div className={styles.tabsBar}>
      {tabs.map(t => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${active === t.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActive(t.id)}
          >
            <Icon size={15} />
            {t.label}
            <span className={styles.tabCount}>{t.count}</span>
          </button>
        );
      })}
    </div>
  );
}

// =====================================================
// SEARCH + FILTERS (shared)
// =====================================================
function SearchFilters() {
  return (
    <div className={styles.searchSection}>
      <div className={styles.searchRow}>
        <div className={styles.searchInput}>
          <Search size={16} className={styles.searchIcon} />
          <input type="text" placeholder="Rechercher un prestataire..." className={styles.searchField} />
        </div>
        <button className={styles.filterBtn}><Filter size={14} /> Filtres</button>
      </div>
      <div className={styles.filterChips}>
        <button className={styles.chip}>Tous domaines <ChevronDown size={12} /></button>
        <button className={styles.chip}>Tous statuts <ChevronDown size={12} /></button>
        <button className={styles.chip}><ArrowUpDown size={12} /> Alphabétique</button>
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
      <div className={styles.resultsSummary}>
        <span>{MOCK.length} prestataires</span>
        <div className={styles.resultsBadges}>
          <span className={styles.resultBadge} style={{ color: '#34D399' }}>● {KPIS.actifs} actifs</span>
          <span className={styles.resultBadge} style={{ color: '#64748b' }}>● 1 inactif</span>
          <span className={styles.resultBadge} style={{ color: '#60A5FA' }}>● 1 nouveau</span>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Prestataire</th>
              <th className={styles.th}>Domaines</th>
              <th className={styles.th}>Statut</th>
              <th className={styles.th}>Contact</th>
              <th className={styles.th}>Ville</th>
              <th className={styles.th}>Note</th>
              <th className={`${styles.th} ${styles.thRight}`}>Interventions</th>
              <th className={styles.thActions}></th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map(p => {
              const s = STATUT_CONFIG[p.statut];
              return (
                <tr key={p.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.prestataireCell}>
                      <div className={styles.avatar}>{p.nom.charAt(0)}</div>
                      <div>
                        <span className={styles.tableTitre}>{p.nom}</span>
                        {p.contactReferent && <span className={styles.tableSubtext}>{p.contactReferent}</span>}
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.domainesCell}>
                      {p.domaines.map(d => (
                        <span key={d} className={styles.domaineBadge} style={{ color: DOMAINE_COLORS[d] || '#8892a4', background: (DOMAINE_COLORS[d] || '#8892a4') + '15' }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.statutBadge} style={{ color: s.color, background: s.color + '15' }}>{s.label}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.contactCell}>
                      <span className={styles.tableMeta}><Phone size={12} /> {p.telephone}</span>
                      <span className={styles.tableMeta}><Mail size={12} /> {p.email}</span>
                    </div>
                  </td>
                  <td className={styles.td}><span className={styles.tableMeta}>{p.ville}</span></td>
                  <td className={styles.td}><StarRating note={p.note} /></td>
                  <td className={`${styles.td} ${styles.tdRight}`}>
                    <div className={styles.interventionsCell}>
                      <span className={styles.tableCout}>{p.nbInterventions}</span>
                      <span className={styles.tableSubtext}>{p.derniereIntervention}</span>
                    </div>
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
// VARIANTE B — Cartes grille 2 colonnes
// =====================================================
function VarianteB() {
  return (
    <>
      <SearchFilters />
      <div className={styles.resultsSummary}>
        <span>{MOCK.length} prestataires</span>
      </div>
      <div className={styles.cardsGrid}>
        {MOCK.map(p => {
          const s = STATUT_CONFIG[p.statut];
          return (
            <div key={p.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <div className={styles.avatarLg}>{p.nom.charAt(0)}</div>
                  <div>
                    <h4 className={styles.cardName}>{p.nom}</h4>
                    <span className={styles.cardVille}><MapPin size={12} /> {p.ville}</span>
                  </div>
                </div>
                <div className={styles.cardHeaderRight}>
                  <span className={styles.statutBadge} style={{ color: s.color, background: s.color + '15' }}>{s.label}</span>
                  <StarRating note={p.note} />
                </div>
              </div>

              <div className={styles.cardDomaines}>
                {p.domaines.map(d => (
                  <span key={d} className={styles.domaineBadge} style={{ color: DOMAINE_COLORS[d] || '#8892a4', background: (DOMAINE_COLORS[d] || '#8892a4') + '15' }}>
                    {d}
                  </span>
                ))}
                {p.certifications.length > 0 && p.certifications.map(c => (
                  <span key={c} className={styles.certifBadge}><Award size={10} /> {c}</span>
                ))}
              </div>

              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <Wrench size={13} />
                  <span>{p.nbInterventions} interventions</span>
                </div>
                <div className={styles.cardStat}>
                  <Clock size={13} />
                  <span>{p.derniereIntervention}</span>
                </div>
              </div>

              <div className={styles.cardContact}>
                <a href={`tel:${p.telephone}`} className={styles.cardContactBtn}>
                  <Phone size={13} /> Appeler
                </a>
                <a href={`mailto:${p.email}`} className={styles.cardContactBtn}>
                  <Mail size={13} /> Email
                </a>
                <button className={styles.cardContactBtn}>
                  <Eye size={13} /> Fiche
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// =====================================================
// VARIANTE C — Liste compacte avec panneau latéral
// =====================================================
function VarianteC() {
  const [selectedId, setSelectedId] = useState<string>(MOCK[0].id);
  const selected = MOCK.find(p => p.id === selectedId) || MOCK[0];
  const s = STATUT_CONFIG[selected.statut];

  return (
    <>
      <SearchFilters />
      <div className={styles.splitView}>
        {/* Liste gauche */}
        <div className={styles.splitList}>
          {MOCK.map(p => {
            const ps = STATUT_CONFIG[p.statut];
            return (
              <button
                key={p.id}
                className={`${styles.splitItem} ${p.id === selectedId ? styles.splitItemActive : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <div className={styles.splitItemLeft}>
                  <div className={styles.avatar}>{p.nom.charAt(0)}</div>
                  <div className={styles.splitItemInfo}>
                    <span className={styles.splitItemName}>{p.nom}</span>
                    <span className={styles.splitItemDomaines}>
                      {p.domaines.join(' · ')}
                    </span>
                  </div>
                </div>
                <div className={styles.splitItemRight}>
                  <StarRating note={p.note} />
                  <span className={styles.splitItemStatut} style={{ color: ps.color }}>●</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Détail droite */}
        <div className={styles.splitDetail}>
          <div className={styles.detailHeader}>
            <div className={styles.avatarXl}>{selected.nom.charAt(0)}</div>
            <div>
              <h3 className={styles.detailName}>{selected.nom}</h3>
              <span className={styles.detailVille}><MapPin size={14} /> {selected.ville}</span>
            </div>
            <span className={styles.statutBadge} style={{ color: s.color, background: s.color + '15' }}>{s.label}</span>
          </div>

          <div className={styles.detailDomaines}>
            {selected.domaines.map(d => (
              <span key={d} className={styles.domaineBadge} style={{ color: DOMAINE_COLORS[d] || '#8892a4', background: (DOMAINE_COLORS[d] || '#8892a4') + '15' }}>
                {d}
              </span>
            ))}
            {selected.certifications.map(c => (
              <span key={c} className={styles.certifBadge}><Award size={10} /> {c}</span>
            ))}
          </div>

          <div className={styles.detailStatsRow}>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>{selected.nbInterventions}</span>
              <span className={styles.detailStatLabel}>Interventions</span>
            </div>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}><Star size={14} fill="#FBBF24" color="#FBBF24" /> {selected.note.toFixed(1)}</span>
              <span className={styles.detailStatLabel}>Note</span>
            </div>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>{selected.derniereIntervention}</span>
              <span className={styles.detailStatLabel}>Dernière int.</span>
            </div>
          </div>

          <div className={styles.detailContact}>
            <div className={styles.detailContactRow}><Phone size={14} /> {selected.telephone}</div>
            <div className={styles.detailContactRow}><Mail size={14} /> {selected.email}</div>
            {selected.contactReferent && (
              <div className={styles.detailContactRow}><Users size={14} /> {selected.contactReferent}</div>
            )}
          </div>

          <div className={styles.detailActions}>
            <button className={styles.btnPrimary}><Phone size={14} /> Contacter</button>
            <button className={styles.btnSecondary}><ExternalLink size={14} /> Fiche complète</button>
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================
// PAGE PREVIEW
// =====================================================
export default function ProvidersPagePreview() {
  const [variant, setVariant] = useState<Variante>('A');
  const [activeTab, setActiveTab] = useState<TabId>('copro');

  const variantDescs: Record<Variante, string> = {
    A: 'Tableau dense — max visibilité, tri par colonnes',
    B: 'Cartes grille — visuellement riche, scan rapide',
    C: 'Liste + panneau — sélection et détail côte à côte',
  };

  return (
    <div className={styles.page}>
      {/* Controls */}
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

      {/* Preview */}
      <div className={styles.preview}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbMuted}>Maintenance</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span>Prestataires</span>
        </div>

        {/* Page header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Prestataires</h1>
          <div className={styles.pageActions}>
            <button className={styles.btnSecondary}><Download size={15} /> Exporter</button>
            <button className={styles.btnPrimary}><Plus size={15} /> Ajouter un prestataire</button>
          </div>
        </div>

        {/* KPI Bar */}
        <KpiBar />

        {/* Tabs */}
        <TabsBar active={activeTab} setActive={setActiveTab} />

        {/* Content */}
        {variant === 'A' && <VarianteA />}
        {variant === 'B' && <VarianteB />}
        {variant === 'C' && <VarianteC />}
      </div>
    </div>
  );
}
