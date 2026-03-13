'use client';

import { useState } from 'react';
import {
  Search, Plus, Upload, Download, FileText, Folder, FolderOpen,
  ChevronDown, ChevronRight, Eye, MoreVertical, Filter,
  Image, File, Grid3X3, List, Star, Clock, Shield, AlertTriangle,
  Calendar, HardDrive, Tag, Lock, CheckCircle2, ExternalLink,
  Trash2, Edit, Link, Copy, LayoutGrid,
} from 'lucide-react';
import styles from './preview.module.css';

// =====================================================
// TYPES
// =====================================================
type Variante = 'A' | 'B' | 'C1' | 'C2' | 'C3';
type CategoryId = 'tous' | 'pv_ag' | 'contrat' | 'facture' | 'diagnostic' | 'reglement' | 'devis' | 'photo' | 'autre';

interface MockDoc {
  id: string;
  nom: string;
  categorie: CategoryId;
  type: 'PDF' | 'IMAGE' | 'AUTRE';
  dateAjout: string;
  taille: string;
  tags: string[];
  confidentiel: boolean;
  dossier: string;
}

interface MockFolder {
  id: string;
  nom: string;
  count: number;
  icon: string;
  color: string;
}

// =====================================================
// MOCK DATA
// =====================================================
const MOCK_DOCS: MockDoc[] = [
  { id: '1', nom: 'PV AG Ordinaire 2026.pdf', categorie: 'pv_ag', type: 'PDF', dateAjout: '15/01/2026', taille: '2.4 MB', tags: ['AG 2026', 'Résolutions'], confidentiel: false, dossier: 'Assemblées Générales' },
  { id: '2', nom: 'Règlement de copropriété.pdf', categorie: 'reglement', type: 'PDF', dateAjout: '01/03/2020', taille: '8.1 MB', tags: ['Officiel', 'Notarié'], confidentiel: false, dossier: 'Règlements' },
  { id: '3', nom: 'Contrat Schindler 2024-2027.pdf', categorie: 'contrat', type: 'PDF', dateAjout: '10/06/2024', taille: '1.8 MB', tags: ['Ascenseur', 'Maintenance'], confidentiel: false, dossier: 'Contrats' },
  { id: '4', nom: 'DPE Collectif 2025.pdf', categorie: 'diagnostic', type: 'PDF', dateAjout: '20/09/2025', taille: '3.2 MB', tags: ['Énergie', 'Obligatoire'], confidentiel: false, dossier: 'Diagnostics' },
  { id: '5', nom: 'Facture Nettoyage Pro - Déc 2025.pdf', categorie: 'facture', type: 'PDF', dateAjout: '05/01/2026', taille: '0.4 MB', tags: ['Ménage'], confidentiel: true, dossier: 'Factures' },
  { id: '6', nom: 'Devis ravalement façade sud.pdf', categorie: 'devis', type: 'PDF', dateAjout: '12/01/2026', taille: '1.2 MB', tags: ['Travaux', 'Ravalement'], confidentiel: false, dossier: 'Devis' },
  { id: '7', nom: 'Photo infiltration toiture.jpg', categorie: 'photo', type: 'IMAGE', dateAjout: '28/01/2026', taille: '4.8 MB', tags: ['Sinistre', 'Urgence'], confidentiel: false, dossier: 'Photos' },
  { id: '8', nom: 'DTA Amiante - Bât. A.pdf', categorie: 'diagnostic', type: 'PDF', dateAjout: '15/06/2023', taille: '2.1 MB', tags: ['Amiante', 'Obligatoire'], confidentiel: false, dossier: 'Diagnostics' },
  { id: '9', nom: 'Convocation AG 2026.pdf', categorie: 'pv_ag', type: 'PDF', dateAjout: '05/12/2025', taille: '0.6 MB', tags: ['AG 2026'], confidentiel: false, dossier: 'Assemblées Générales' },
  { id: '10', nom: 'Attestation assurance MRC.pdf', categorie: 'contrat', type: 'PDF', dateAjout: '01/01/2026', taille: '0.3 MB', tags: ['Assurance', 'Annuel'], confidentiel: true, dossier: 'Contrats' },
];

const MOCK_FOLDERS: MockFolder[] = [
  { id: 'f1', nom: 'Assemblées Générales', count: 12, icon: '📋', color: '#3B82F6' },
  { id: 'f2', nom: 'Contrats', count: 8, icon: '📄', color: '#10B981' },
  { id: 'f3', nom: 'Factures', count: 24, icon: '💰', color: '#F59E0B' },
  { id: 'f4', nom: 'Diagnostics', count: 6, icon: '🔍', color: '#EF4444' },
  { id: 'f5', nom: 'Règlements', count: 3, icon: '⚖️', color: '#8B5CF6' },
  { id: 'f6', nom: 'Devis', count: 5, icon: '📝', color: '#F97316' },
  { id: 'f7', nom: 'Photos', count: 15, icon: '📸', color: '#84CC16' },
];

const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  pv_ag: { label: "PV d'AG", color: '#3B82F6' },
  reglement: { label: 'Règlement', color: '#8B5CF6' },
  contrat: { label: 'Contrat', color: '#10B981' },
  facture: { label: 'Facture', color: '#F59E0B' },
  diagnostic: { label: 'Diagnostic', color: '#EF4444' },
  devis: { label: 'Devis', color: '#F97316' },
  photo: { label: 'Photo', color: '#84CC16' },
  autre: { label: 'Autre', color: '#6B7280' },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  PDF: FileText,
  IMAGE: Image,
  AUTRE: File,
};

const KPIS = [
  { label: 'Documents', value: MOCK_DOCS.length, color: '#2563eb', icon: FileText },
  { label: 'Dossiers', value: MOCK_FOLDERS.length, color: '#10B981', icon: Folder },
  { label: 'Obligatoires', value: '8/10', color: '#F59E0B', icon: Shield },
  { label: 'Stockage', value: '24.9 MB', color: '#A78BFA', icon: HardDrive },
];

// =====================================================
// SHARED COMPONENTS
// =====================================================
function KpiBar() {
  return (
    <div className={styles.kpiBar}>
      {KPIS.map(k => {
        const Icon = k.icon;
        return (
          <div key={k.label} className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: k.color + '15', color: k.color }}><Icon size={16} /></div>
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

function SearchFilters() {
  return (
    <div className={styles.searchSection}>
      <div className={styles.searchRow}>
        <div className={styles.searchInput}>
          <Search size={16} className={styles.searchIcon} />
          <input type="text" placeholder="Rechercher un document..." className={styles.searchField} />
        </div>
        <button className={styles.btnSecondary}><Upload size={14} /> Importer</button>
      </div>
      <div className={styles.filterChips}>
        <button className={styles.chip}>Toutes catégories <ChevronDown size={12} /></button>
        <button className={styles.chip}>Tous types <ChevronDown size={12} /></button>
        <button className={styles.chip}><Calendar size={12} /> Toutes dates</button>
      </div>
    </div>
  );
}

function DocIcon({ type, size = 14 }: { type: string; size?: number }) {
  const Icon = TYPE_ICONS[type] || File;
  const color = type === 'PDF' ? '#EF4444' : type === 'IMAGE' ? '#84CC16' : '#6B7280';
  return <Icon size={size} style={{ color }} />;
}

// =====================================================
// VARIANTE A — Tableau dense (comme logbook)
// =====================================================
function VarianteA() {
  return (
    <>
      <SearchFilters />
      {/* Folders row */}
      <div className={styles.foldersRow}>
        {MOCK_FOLDERS.map(f => (
          <button key={f.id} className={styles.folderChip}>
            <span>{f.icon}</span>
            <span className={styles.folderChipName}>{f.nom}</span>
            <span className={styles.folderChipCount}>{f.count}</span>
          </button>
        ))}
      </div>
      <div className={styles.resultsSummary}>
        <span>{MOCK_DOCS.length} documents</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Document</th>
              <th className={styles.th}>Catégorie</th>
              <th className={styles.th}>Dossier</th>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Taille</th>
              <th className={styles.thActions}></th>
            </tr>
          </thead>
          <tbody>
            {MOCK_DOCS.map(doc => {
              const cat = CAT_CONFIG[doc.categorie] || CAT_CONFIG.autre;
              return (
                <tr key={doc.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.docCell}>
                      <DocIcon type={doc.type} />
                      <div>
                        <span className={styles.tableTitre}>
                          {doc.confidentiel && <Lock size={11} className={styles.lockIcon} />}
                          {doc.nom}
                        </span>
                        <div className={styles.docTags}>
                          {doc.tags.slice(0, 2).map(t => <span key={t} className={styles.tagBadge}>{t}</span>)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.catBadge} style={{ color: cat.color, background: cat.color + '15' }}>{cat.label}</span>
                  </td>
                  <td className={styles.td}><span className={styles.tableMeta}>{doc.dossier}</span></td>
                  <td className={styles.td}><span className={styles.tableMeta}>{doc.dateAjout}</span></td>
                  <td className={styles.td}><span className={styles.tableMeta}>{doc.taille}</span></td>
                  <td className={styles.tdActions}>
                    <button className={styles.tableActionBtn}><Eye size={14} /></button>
                    <button className={styles.tableActionBtn}><Download size={14} /></button>
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
// VARIANTE B — Grille de cartes documents
// =====================================================
function VarianteB() {
  return (
    <>
      <SearchFilters />
      <div className={styles.foldersRow}>
        {MOCK_FOLDERS.map(f => (
          <button key={f.id} className={styles.folderChip}>
            <span>{f.icon}</span>
            <span className={styles.folderChipName}>{f.nom}</span>
            <span className={styles.folderChipCount}>{f.count}</span>
          </button>
        ))}
      </div>
      <div className={styles.resultsSummary}><span>{MOCK_DOCS.length} documents</span></div>
      <div className={styles.docCardsGrid}>
        {MOCK_DOCS.map(doc => {
          const cat = CAT_CONFIG[doc.categorie] || CAT_CONFIG.autre;
          return (
            <div key={doc.id} className={styles.docCard}>
              <div className={styles.docCardHeader}>
                <div className={styles.docCardIcon} style={{ background: cat.color + '12', color: cat.color }}>
                  <DocIcon type={doc.type} size={20} />
                </div>
                <div className={styles.docCardActions}>
                  {doc.confidentiel && <Lock size={12} className={styles.lockIcon} />}
                  <button className={styles.tableActionBtn}><MoreVertical size={14} /></button>
                </div>
              </div>
              <h4 className={styles.docCardName}>{doc.nom}</h4>
              <div className={styles.docCardMeta}>
                <span className={styles.catBadge} style={{ color: cat.color, background: cat.color + '15' }}>{cat.label}</span>
                <span className={styles.docCardSize}>{doc.taille}</span>
              </div>
              <div className={styles.docCardTags}>
                {doc.tags.slice(0, 2).map(t => <span key={t} className={styles.tagBadge}>{t}</span>)}
              </div>
              <div className={styles.docCardFooter}>
                <span className={styles.docCardDate}>{doc.dateAjout}</span>
                <div className={styles.docCardBtns}>
                  <button className={styles.docCardBtn}><Eye size={13} /></button>
                  <button className={styles.docCardBtn}><Download size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// =====================================================
// VARIANTE C — Split: arborescence + panneau détail
// =====================================================

const FAVORITES = ['1', '3', '4']; // Mock favoris
const RELATIVE_DATES: Record<string, string> = {
  '1': 'il y a 2 mois', '2': 'il y a 6 ans', '3': 'il y a 1 an',
  '4': 'il y a 4 mois', '5': 'il y a 2 mois', '6': 'il y a 2 mois',
  '7': 'il y a 1j', '8': 'il y a 3 ans', '9': 'il y a 3 mois', '10': 'il y a 2 mois',
};

function VarianteC() {
  const [selectedDocId, setSelectedDocId] = useState(MOCK_DOCS[0].id);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['f1']));
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const selected = MOCK_DOCS.find(d => d.id === selectedDocId) || MOCK_DOCS[0];
  const cat = CAT_CONFIG[selected.categorie] || CAT_CONFIG.autre;

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredFolders = sidebarSearch
    ? MOCK_FOLDERS.filter(f => f.nom.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : MOCK_FOLDERS;

  const favDocs = MOCK_DOCS.filter(d => FAVORITES.includes(d.id));

  return (
    <>
      <SearchFilters />
      <div className={styles.splitView} data-collapsed={collapsed || undefined}>
        {/* Arborescence gauche */}
        <div className={styles.splitList} data-collapsed={collapsed || undefined}>
          {/* Mini search */}
          {!collapsed && (
            <div className={styles.sidebarSearchWrap}>
              <Search size={13} className={styles.sidebarSearchIcon} />
              <input
                type="text"
                placeholder="Filtrer..."
                className={styles.sidebarSearchInput}
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
              />
            </div>
          )}

          {/* Dossiers */}
          <div className={styles.treeSection}>
            <span className={styles.treeSectionTitle}>
              <Folder size={11} /> {!collapsed && 'Dossiers'}
            </span>
            {filteredFolders.map(f => {
              const isExpanded = expandedFolders.has(f.id);
              const folderDocs = MOCK_DOCS.filter(d => d.dossier === f.nom);
              const fillPercent = Math.min((f.count / 30) * 100, 100);
              return (
                <div key={f.id} className={styles.treeFolderGroup}>
                  <button
                    className={`${styles.treeFolder} ${isExpanded ? styles.treeFolderOpen : ''}`}
                    onClick={() => toggleFolder(f.id)}
                    title={collapsed ? f.nom : undefined}
                  >
                    <div className={styles.treeFolderIcon} style={{ color: f.color }}>
                      {isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
                    </div>
                    {!collapsed && (
                      <>
                        <div className={styles.treeFolderBody}>
                          <span className={styles.treeFolderName}>{f.nom}</span>
                          {/* Mini progress bar */}
                          <div className={styles.treeFolderBar}>
                            <div className={styles.treeFolderBarFill} style={{ width: `${fillPercent}%`, background: f.color }} />
                          </div>
                        </div>
                        <span className={styles.treeFolderCount}>{f.count}</span>
                        <span className={styles.treeFolderChevron}>
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Expanded files with connector */}
                  {isExpanded && !collapsed && folderDocs.length > 0 && (
                    <div className={styles.treeFilesConnected}>
                      <div className={styles.treeConnector} style={{ borderColor: f.color + '30' }} />
                      <div className={styles.treeFilesInner}>
                        {folderDocs.map((doc, i) => {
                          const isLast = i === folderDocs.length - 1;
                          return (
                            <button
                              key={doc.id}
                              className={`${styles.treeFileC} ${doc.id === selectedDocId ? styles.treeFileCActive : ''}`}
                              onClick={() => setSelectedDocId(doc.id)}
                            >
                              <span className={styles.treeFileBranch} style={{ borderColor: f.color + '30' }} data-last={isLast || undefined} />
                              <DocIcon type={doc.type} size={12} />
                              <span className={styles.treeFileName}>{doc.nom}</span>
                              <span className={styles.treeFileSize}>{doc.taille}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Favoris */}
          {!collapsed && (
            <div className={styles.treeSection}>
              <span className={styles.treeSectionTitle}><Star size={11} /> Favoris</span>
              {favDocs.map(doc => {
                const dcat = CAT_CONFIG[doc.categorie] || CAT_CONFIG.autre;
                return (
                  <button
                    key={doc.id}
                    className={`${styles.treeFileC} ${doc.id === selectedDocId ? styles.treeFileCActive : ''}`}
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    <Star size={11} fill="#FBBF24" color="#FBBF24" className={styles.favStar} />
                    <span className={styles.treeCatDot} style={{ background: dcat.color }} />
                    <span className={styles.treeFileName}>{doc.nom}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Récents */}
          {!collapsed && (
            <div className={styles.treeSection}>
              <span className={styles.treeSectionTitle}><Clock size={11} /> Récents</span>
              {MOCK_DOCS.slice(0, 5).map(doc => {
                const dcat = CAT_CONFIG[doc.categorie] || CAT_CONFIG.autre;
                return (
                  <button
                    key={doc.id}
                    className={`${styles.treeFileC} ${doc.id === selectedDocId ? styles.treeFileCActive : ''}`}
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    <span className={styles.treeCatDot} style={{ background: dcat.color }} />
                    <DocIcon type={doc.type} size={12} />
                    <span className={styles.treeFileName}>{doc.nom}</span>
                    <span className={styles.treeRelDate}>{RELATIVE_DATES[doc.id]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Collapse toggle */}
          <button className={styles.sidebarToggle} onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Déplier' : 'Replier'}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {!collapsed && <span>Replier</span>}
          </button>
        </div>

        {/* Détail droite */}
        <div className={styles.splitDetail}>
          <div className={styles.detailHeader}>
            <div className={styles.detailIconLg} style={{ background: cat.color + '12', color: cat.color }}>
              <DocIcon type={selected.type} size={28} />
            </div>
            <div>
              <h3 className={styles.detailName}>
                {selected.confidentiel && <Lock size={14} className={styles.lockIcon} />}
                {selected.nom}
              </h3>
              <span className={styles.detailDossier}><Folder size={12} /> {selected.dossier}</span>
            </div>
          </div>

          <div className={styles.detailBadgesRow}>
            <span className={styles.catBadge} style={{ color: cat.color, background: cat.color + '15' }}>{cat.label}</span>
            {selected.confidentiel && <span className={styles.confidBadge}><Lock size={10} /> Confidentiel</span>}
            {selected.tags.map(t => <span key={t} className={styles.tagBadge}>{t}</span>)}
          </div>

          <div className={styles.detailStatsRow}>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>{selected.dateAjout}</span>
              <span className={styles.detailStatLabel}>Date d&apos;ajout</span>
            </div>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>{selected.taille}</span>
              <span className={styles.detailStatLabel}>Taille</span>
            </div>
            <div className={styles.detailStatCard}>
              <span className={styles.detailStatValue}>{selected.type}</span>
              <span className={styles.detailStatLabel}>Format</span>
            </div>
          </div>

          <div className={styles.previewZone}>
            <div className={styles.previewPlaceholder}>
              <DocIcon type={selected.type} size={40} />
              <span>Aperçu du document</span>
            </div>
          </div>

          <div className={styles.detailActions}>
            <button className={styles.btnPrimary}><Eye size={14} /> Ouvrir</button>
            <button className={styles.btnSecondary}><Download size={14} /> Télécharger</button>
            <button className={styles.btnSecondary}><Link size={14} /> Lier</button>
            <button className={styles.btnDanger}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================
// VARIANTE C2 — Sidebar avec onglets Dossiers/Récents/Favoris
// =====================================================
function VarianteC2() {
  const [selectedDocId, setSelectedDocId] = useState(MOCK_DOCS[0].id);
  const [sidebarTab, setSidebarTab] = useState<'dossiers' | 'recents' | 'favoris'>('dossiers');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['f1']));
  const selected = MOCK_DOCS.find(d => d.id === selectedDocId) || MOCK_DOCS[0];
  const cat = CAT_CONFIG[selected.categorie] || CAT_CONFIG.autre;

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const favDocs = MOCK_DOCS.filter(d => FAVORITES.includes(d.id));

  return (
    <>
      <SearchFilters />
      <div className={styles.splitViewWide}>
        <div className={styles.sidebarWide}>
          {/* Tabs dans le sidebar */}
          <div className={styles.sidebarTabs}>
            {([
              { id: 'dossiers' as const, label: 'Dossiers', icon: Folder },
              { id: 'recents' as const, label: 'Récents', icon: Clock },
              { id: 'favoris' as const, label: 'Favoris', icon: Star },
            ]).map(t => {
              const TIcon = t.icon;
              return (
                <button key={t.id} className={`${styles.sidebarTabBtn} ${sidebarTab === t.id ? styles.sidebarTabBtnActive : ''}`} onClick={() => setSidebarTab(t.id)}>
                  <TIcon size={13} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className={styles.sidebarSearchWrap}>
            <Search size={13} className={styles.sidebarSearchIcon} />
            <input type="text" placeholder="Filtrer..." className={styles.sidebarSearchInput} />
          </div>

          {/* Content by tab */}
          <div className={styles.sidebarContent}>
            {sidebarTab === 'dossiers' && MOCK_FOLDERS.map(f => {
              const isExpanded = expandedFolders.has(f.id);
              const folderDocs = MOCK_DOCS.filter(d => d.dossier === f.nom);
              return (
                <div key={f.id}>
                  <button className={`${styles.sidebarFolderRow} ${isExpanded ? styles.sidebarFolderRowOpen : ''}`} onClick={() => toggleFolder(f.id)}>
                    <div className={styles.sidebarFolderIconBox} style={{ background: f.color + '12', color: f.color }}>
                      {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                    </div>
                    <div className={styles.sidebarFolderInfo}>
                      <span className={styles.sidebarFolderName}>{f.nom}</span>
                      <span className={styles.sidebarFolderMeta}>{f.count} documents</span>
                    </div>
                    {isExpanded ? <ChevronDown size={13} className={styles.sidebarChev} /> : <ChevronRight size={13} className={styles.sidebarChev} />}
                  </button>
                  {isExpanded && folderDocs.map(doc => (
                    <button key={doc.id} className={`${styles.sidebarDocRow} ${doc.id === selectedDocId ? styles.sidebarDocRowActive : ''}`} onClick={() => setSelectedDocId(doc.id)}>
                      <DocIcon type={doc.type} size={13} />
                      <span className={styles.sidebarDocName}>{doc.nom}</span>
                      <span className={styles.sidebarDocSize}>{doc.taille}</span>
                    </button>
                  ))}
                </div>
              );
            })}

            {sidebarTab === 'recents' && MOCK_DOCS.slice(0, 7).map(doc => {
              const dcat = CAT_CONFIG[doc.categorie] || CAT_CONFIG.autre;
              return (
                <button key={doc.id} className={`${styles.sidebarDocRow} ${doc.id === selectedDocId ? styles.sidebarDocRowActive : ''}`} onClick={() => setSelectedDocId(doc.id)}>
                  <span className={styles.treeCatDot} style={{ background: dcat.color }} />
                  <DocIcon type={doc.type} size={13} />
                  <span className={styles.sidebarDocName}>{doc.nom}</span>
                  <span className={styles.treeRelDate}>{RELATIVE_DATES[doc.id]}</span>
                </button>
              );
            })}

            {sidebarTab === 'favoris' && favDocs.map(doc => {
              const dcat = CAT_CONFIG[doc.categorie] || CAT_CONFIG.autre;
              return (
                <button key={doc.id} className={`${styles.sidebarDocRow} ${doc.id === selectedDocId ? styles.sidebarDocRowActive : ''}`} onClick={() => setSelectedDocId(doc.id)}>
                  <Star size={12} fill="#FBBF24" color="#FBBF24" />
                  <span className={styles.treeCatDot} style={{ background: dcat.color }} />
                  <span className={styles.sidebarDocName}>{doc.nom}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail - same as C1 */}
        <DetailPanel selected={selected} cat={cat} />
      </div>
    </>
  );
}

// =====================================================
// VARIANTE C3 — Sidebar catégories visuelles + liste filtrée
// =====================================================
function VarianteC3() {
  const [selectedDocId, setSelectedDocId] = useState(MOCK_DOCS[0].id);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const selected = MOCK_DOCS.find(d => d.id === selectedDocId) || MOCK_DOCS[0];
  const cat = CAT_CONFIG[selected.categorie] || CAT_CONFIG.autre;

  const displayDocs = activeCategory
    ? MOCK_DOCS.filter(d => d.categorie === activeCategory)
    : MOCK_DOCS;

  // Count per category
  const catCounts = MOCK_DOCS.reduce<Record<string, number>>((acc, d) => {
    acc[d.categorie] = (acc[d.categorie] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <SearchFilters />
      <div className={styles.splitViewWide}>
        <div className={styles.sidebarWide}>
          {/* Category grid */}
          <div className={styles.catGrid}>
            <button className={`${styles.catGridItem} ${!activeCategory ? styles.catGridItemActive : ''}`} onClick={() => setActiveCategory(null)}>
              <FileText size={16} className={styles.catGridIcon} />
              <span className={styles.catGridLabel}>Tous</span>
              <span className={styles.catGridCount}>{MOCK_DOCS.length}</span>
            </button>
            {Object.entries(CAT_CONFIG).map(([key, cfg]) => {
              const count = catCounts[key] || 0;
              if (count === 0) return null;
              return (
                <button key={key} className={`${styles.catGridItem} ${activeCategory === key ? styles.catGridItemActive : ''}`} onClick={() => setActiveCategory(activeCategory === key ? null : key)} style={activeCategory === key ? { borderColor: cfg.color } : undefined}>
                  <div className={styles.catGridDot} style={{ background: cfg.color }} />
                  <span className={styles.catGridLabel}>{cfg.label}</span>
                  <span className={styles.catGridCount}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Separator */}
          <div className={styles.sidebarDivider} />

          {/* Document list */}
          <div className={styles.sidebarContent}>
            {displayDocs.map(doc => {
              const dcat = CAT_CONFIG[doc.categorie] || CAT_CONFIG.autre;
              return (
                <button key={doc.id} className={`${styles.sidebarDocRowLg} ${doc.id === selectedDocId ? styles.sidebarDocRowActive : ''}`} onClick={() => setSelectedDocId(doc.id)}>
                  <div className={styles.sidebarDocIconBox} style={{ background: dcat.color + '10', color: dcat.color }}>
                    <DocIcon type={doc.type} size={16} />
                  </div>
                  <div className={styles.sidebarDocInfo}>
                    <span className={styles.sidebarDocNameLg}>
                      {doc.confidentiel && <Lock size={10} className={styles.lockIcon} />}
                      {doc.nom}
                    </span>
                    <span className={styles.sidebarDocMetaLg}>{dcat.label} · {doc.taille} · {doc.dateAjout}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <DetailPanel selected={selected} cat={cat} />
      </div>
    </>
  );
}

// =====================================================
// SHARED DETAIL PANEL
// =====================================================
function DetailPanel({ selected, cat }: { selected: MockDoc; cat: { label: string; color: string } }) {
  return (
    <div className={styles.splitDetail}>
      <div className={styles.detailHeader}>
        <div className={styles.detailIconLg} style={{ background: cat.color + '12', color: cat.color }}>
          <DocIcon type={selected.type} size={28} />
        </div>
        <div>
          <h3 className={styles.detailName}>
            {selected.confidentiel && <Lock size={14} className={styles.lockIcon} />}
            {selected.nom}
          </h3>
          <span className={styles.detailDossier}><Folder size={12} /> {selected.dossier}</span>
        </div>
      </div>
      <div className={styles.detailBadgesRow}>
        <span className={styles.catBadge} style={{ color: cat.color, background: cat.color + '15' }}>{cat.label}</span>
        {selected.confidentiel && <span className={styles.confidBadge}><Lock size={10} /> Confidentiel</span>}
        {selected.tags.map(t => <span key={t} className={styles.tagBadge}>{t}</span>)}
      </div>
      <div className={styles.detailStatsRow}>
        <div className={styles.detailStatCard}><span className={styles.detailStatValue}>{selected.dateAjout}</span><span className={styles.detailStatLabel}>Date d&apos;ajout</span></div>
        <div className={styles.detailStatCard}><span className={styles.detailStatValue}>{selected.taille}</span><span className={styles.detailStatLabel}>Taille</span></div>
        <div className={styles.detailStatCard}><span className={styles.detailStatValue}>{selected.type}</span><span className={styles.detailStatLabel}>Format</span></div>
      </div>
      <div className={styles.previewZone}><div className={styles.previewPlaceholder}><DocIcon type={selected.type} size={40} /><span>Aperçu du document</span></div></div>
      <div className={styles.detailActions}>
        <button className={styles.btnPrimary}><Eye size={14} /> Ouvrir</button>
        <button className={styles.btnSecondary}><Download size={14} /> Télécharger</button>
        <button className={styles.btnSecondary}><Link size={14} /> Lier</button>
        <button className={styles.btnDanger}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

// =====================================================
// PAGE PREVIEW
// =====================================================
export default function GedPreview() {
  const [variant, setVariant] = useState<Variante>('C1');

  const descs: Record<Variante, string> = {
    A: 'Tableau dense — dossiers en chips + liste documents',
    B: 'Grille de cartes — visuellement riche, aperçu rapide',
    C1: 'Split — arborescence connecteurs + favoris + récents',
    C2: 'Split — onglets Dossiers/Récents/Favoris dans le sidebar',
    C3: 'Split — grille catégories + liste filtrée documents',
  };

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Variante</span>
          <div className={styles.controlTabs}>
            {(['A', 'B', 'C1', 'C2', 'C3'] as Variante[]).map(v => (
              <button key={v} className={`${styles.controlTab} ${variant === v ? styles.controlTabActive : ''}`} onClick={() => setVariant(v)}>{v}</button>
            ))}
          </div>
          <span className={styles.controlDesc}>{descs[variant]}</span>
        </div>
      </div>

      <div className={styles.preview}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbMuted}>Documents</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span>GED</span>
        </div>

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Mes documents</h1>
          <div className={styles.pageActions}>
            <button className={styles.btnSecondary}><Download size={15} /> Exporter</button>
            <button className={styles.btnPrimary}><Upload size={15} /> Importer un document</button>
          </div>
        </div>

        <KpiBar />

        {variant === 'A' && <VarianteA />}
        {variant === 'B' && <VarianteB />}
        {variant === 'C1' && <VarianteC />}
        {variant === 'C2' && <VarianteC2 />}
        {variant === 'C3' && <VarianteC3 />}
      </div>
    </div>
  );
}
