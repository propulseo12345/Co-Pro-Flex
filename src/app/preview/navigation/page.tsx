'use client';

import { useState } from 'react';
import styles from './preview.module.css';
import {
  LayoutDashboard, Users, DollarSign, Wrench, FileText, MessageSquare,
  Scale, BarChart3, Settings, Building2, Search, Bell, ChevronRight,
  Calculator, Receipt, ArrowLeftRight, Calendar, ShoppingCart,
  FolderOpen, AlertTriangle, Moon, Crown, ChevronDown, X,
  Home, Briefcase, PieChart, Mail, BookOpen, ClipboardList,
} from 'lucide-react';

type Variant = 1 | 2 | 3 | 4 | 5;

const VARIANT_NAMES: Record<Variant, string> = {
  1: 'Module Tabs — High bar + Sidebar contextuelle',
  2: 'Icon Rail + Flyout — Discord/Slack style',
  3: 'Sidebar unifiée compacte — Notion style',
  4: 'Command Bar — Spotlight/Linear style',
  5: 'Hub + Breadcrumb — Dashboard-first',
};

// ============================================================
// VARIANTE 1 — High bar + Sidebar contextuelle
// ============================================================
function Variant1() {
  const [activeModule, setActiveModule] = useState('finance');
  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'ag', label: 'AG', icon: <Users size={16} /> },
    { id: 'copropriete', label: 'Copropriété', icon: <Building2 size={16} /> },
    { id: 'finance', label: 'Finance', icon: <DollarSign size={16} /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={16} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
  ];

  const subMenus: Record<string, Array<{ label: string; icon: React.ReactNode; active?: boolean }>> = {
    dashboard: [],
    ag: [
      { label: 'Tableau de bord AG', icon: <LayoutDashboard size={15} /> },
      { label: 'Prochaine AG', icon: <Calendar size={15} /> },
      { label: 'Historique', icon: <BookOpen size={15} /> },
    ],
    copropriete: [
      { label: 'Copropriétaires', icon: <Users size={15} />, active: true },
      { label: 'Tantièmes', icon: <BarChart3 size={15} /> },
      { label: 'Impayés', icon: <AlertTriangle size={15} /> },
      { label: 'Lots', icon: <Building2 size={15} /> },
    ],
    finance: [
      { label: 'Comptabilité', icon: <Calculator size={15} />, active: true },
      { label: 'Budgets', icon: <FileText size={15} /> },
      { label: 'Factures', icon: <Receipt size={15} /> },
      { label: 'Appels de fonds', icon: <DollarSign size={15} /> },
      { label: 'Mouvements bancaires', icon: <ArrowLeftRight size={15} /> },
    ],
    maintenance: [
      { label: 'Carnet d\'entretien', icon: <BookOpen size={15} /> },
      { label: 'Contrats', icon: <ClipboardList size={15} /> },
      { label: 'Prestataires', icon: <Users size={15} /> },
      { label: 'Ordres de service', icon: <Wrench size={15} /> },
    ],
    documents: [
      { label: 'GED — Mes documents', icon: <FolderOpen size={15} /> },
      { label: 'Annexes comptables', icon: <Calculator size={15} /> },
      { label: 'Courrier officiel', icon: <Mail size={15} /> },
      { label: 'État daté', icon: <ShoppingCart size={15} /> },
    ],
  };

  return (
    <div className={styles.v1}>
      <div className={styles.v1Highbar}>
        <span className={styles.v1Logo}>CoProFlex</span>
        <div className={styles.v1Tabs}>
          {modules.map(m => (
            <button
              key={m.id}
              className={`${styles.v1Tab} ${activeModule === m.id ? styles.v1TabActive : ''}`}
              onClick={() => setActiveModule(m.id)}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <div className={styles.v1Right}>
          <Bell size={16} />
          <div className={styles.avatar}>JD</div>
        </div>
      </div>
      <div className={styles.v1Body}>
        <div className={styles.v1Sidebar}>
          <div className={styles.v1SideTitle}>
            {modules.find(m => m.id === activeModule)?.label}
          </div>
          {(subMenus[activeModule] || []).map((item, i) => (
            <div key={i} className={`${styles.v1SideItem} ${item.active ? styles.v1SideItemActive : ''}`}>
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
          {activeModule === 'dashboard' && (
            <div className={styles.v1SideEmpty}>Vue d&apos;ensemble</div>
          )}
          <div className={styles.v1SideFooter}>
            <Moon size={14} />
            <Settings size={14} />
          </div>
        </div>
        <div className={styles.v1Content}>
          <div className={styles.contentPlaceholder}>
            <span>Contenu de la page</span>
            <span className={styles.contentSub}>
              Module : {modules.find(m => m.id === activeModule)?.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VARIANTE 2 — Icon Rail + Flyout
// ============================================================
function Variant2() {
  const [activeRail, setActiveRail] = useState<string | null>('finance');

  const rail = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { id: 'ag', icon: <Users size={20} />, label: 'AG' },
    { id: 'copropriete', icon: <Building2 size={20} />, label: 'Copro' },
    { id: 'finance', icon: <DollarSign size={20} />, label: 'Finance' },
    { id: 'maintenance', icon: <Wrench size={20} />, label: 'Maintenance' },
    { id: 'documents', icon: <FileText size={20} />, label: 'Documents' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Paramètres' },
  ];

  const panels: Record<string, Array<{ label: string; active?: boolean }>> = {
    ag: [
      { label: 'Tableau de bord' },
      { label: 'Prochaine AG' },
      { label: 'Historique' },
    ],
    copropriete: [
      { label: 'Copropriétaires' },
      { label: 'Tantièmes' },
      { label: 'Impayés' },
      { label: 'Lots' },
    ],
    finance: [
      { label: 'Comptabilité', active: true },
      { label: 'Budgets' },
      { label: 'Factures' },
      { label: 'Appels de fonds' },
      { label: 'Mouvements' },
    ],
    maintenance: [
      { label: 'Carnet d\'entretien' },
      { label: 'Contrats' },
      { label: 'Prestataires' },
      { label: 'Ordres de service' },
    ],
    documents: [
      { label: 'GED' },
      { label: 'Annexes comptables' },
      { label: 'Courrier' },
      { label: 'État daté' },
    ],
    settings: [
      { label: 'Général' },
      { label: 'Lots' },
      { label: 'Profil' },
    ],
  };

  return (
    <div className={styles.v2}>
      <div className={styles.v2Rail}>
        <div className={styles.v2RailLogo}>CF</div>
        {rail.map(r => (
          <button
            key={r.id}
            className={`${styles.v2RailItem} ${activeRail === r.id ? styles.v2RailItemActive : ''}`}
            onClick={() => setActiveRail(activeRail === r.id ? null : r.id)}
            title={r.label}
          >
            {r.icon}
          </button>
        ))}
        <div className={styles.v2RailBottom}>
          <Moon size={18} />
          <div className={styles.avatarSm}>JD</div>
        </div>
      </div>
      {activeRail && panels[activeRail] && (
        <div className={styles.v2Panel}>
          <div className={styles.v2PanelTitle}>
            {rail.find(r => r.id === activeRail)?.label}
          </div>
          {panels[activeRail].map((item, i) => (
            <div key={i} className={`${styles.v2PanelItem} ${item.active ? styles.v2PanelItemActive : ''}`}>
              {item.label}
            </div>
          ))}
        </div>
      )}
      <div className={styles.v2Content}>
        <div className={styles.contentPlaceholder}>
          <span>Contenu de la page</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VARIANTE 3 — Sidebar unifiée Notion style
// ============================================================
function Variant3() {
  return (
    <div className={styles.v3}>
      <div className={styles.v3Sidebar}>
        <div className={styles.v3Search}>
          <Search size={14} />
          <span>Rechercher…</span>
        </div>

        <div className={styles.v3Item}><LayoutDashboard size={16} /> Dashboard</div>
        <div className={`${styles.v3Item} ${styles.v3ItemActive}`}><Users size={16} /> Assemblées Générales</div>

        <div className={styles.v3Section}>COPROPRIÉTÉ</div>
        <div className={styles.v3Item}><Users size={16} /> Copropriétaires</div>
        <div className={styles.v3Item}><BarChart3 size={16} /> Tantièmes</div>
        <div className={styles.v3Item}><AlertTriangle size={16} /> Impayés</div>
        <div className={styles.v3Item}><Building2 size={16} /> Lots</div>

        <div className={styles.v3Section}>FINANCE</div>
        <div className={styles.v3Item}><Calculator size={16} /> Comptabilité</div>
        <div className={styles.v3Item}><Receipt size={16} /> Factures</div>
        <div className={styles.v3Item}><DollarSign size={16} /> Appels de fonds</div>
        <div className={styles.v3Item}><ArrowLeftRight size={16} /> Mouvements</div>

        <div className={styles.v3Section}>MAINTENANCE</div>
        <div className={styles.v3Item}><BookOpen size={16} /> Carnet d&apos;entretien</div>
        <div className={styles.v3Item}><ClipboardList size={16} /> Contrats</div>
        <div className={styles.v3Item}><Wrench size={16} /> Ordres de service</div>

        <div className={styles.v3Section}>DOCUMENTS</div>
        <div className={styles.v3Item}><FolderOpen size={16} /> GED</div>
        <div className={styles.v3Item}><Mail size={16} /> Courrier</div>

        <div className={styles.v3Footer}>
          <div className={styles.v3FooterItem}><Settings size={16} /> Paramètres</div>
          <div className={styles.v3Profile}>
            <div className={styles.avatarSm}>JD</div>
            <span>Jean DUPONT</span>
            <Moon size={14} />
          </div>
        </div>
      </div>
      <div className={styles.v3Content}>
        <div className={styles.contentPlaceholder}>
          <span>Contenu de la page</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VARIANTE 4 — Command Bar / Spotlight
// ============================================================
function Variant4() {
  const [showPalette, setShowPalette] = useState(true);
  const recents = [
    { icon: <Users size={15} />, label: 'AG 08/03/2026' },
    { icon: <Calculator size={15} />, label: 'Comptabilité' },
    { icon: <Receipt size={15} />, label: 'Facture #42' },
  ];
  const pages = [
    'Dashboard', 'Copropriétaires', 'Tantièmes', 'Budgets',
    'Factures', 'Appels de fonds', 'Comptabilité', 'Carnet d\'entretien',
    'Contrats', 'Ordres de service', 'Documents', 'Impayés',
  ];

  return (
    <div className={styles.v4}>
      <div className={styles.v4Bar}>
        <span className={styles.v4Logo}>CoProFlex</span>
        <button className={styles.v4SearchBtn} onClick={() => setShowPalette(true)}>
          <Search size={14} />
          <span>Rechercher ou naviguer… </span>
          <kbd>⌘K</kbd>
        </button>
        <div className={styles.v4Right}>
          <Bell size={16} />
          <div className={styles.avatar}>JD</div>
          <Settings size={16} />
        </div>
      </div>
      <div className={styles.v4Body}>
        {showPalette && (
          <div className={styles.v4Overlay} onClick={() => setShowPalette(false)}>
            <div className={styles.v4Palette} onClick={e => e.stopPropagation()}>
              <div className={styles.v4PaletteInput}>
                <Search size={16} />
                <input type="text" placeholder="Aller à…" autoFocus />
                <button onClick={() => setShowPalette(false)}><X size={14} /></button>
              </div>
              <div className={styles.v4PaletteBody}>
                <div className={styles.v4PaletteSection}>Récents</div>
                {recents.map((r, i) => (
                  <div key={i} className={styles.v4PaletteItem}>
                    {r.icon} {r.label}
                  </div>
                ))}
                <div className={styles.v4PaletteSection}>Toutes les pages</div>
                {pages.map((p, i) => (
                  <div key={i} className={styles.v4PaletteItem}>
                    <ChevronRight size={12} /> {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className={styles.v4Content}>
          <div className={styles.contentPlaceholder}>
            <span>Contenu pleine largeur</span>
            <span className={styles.contentSub}>⌘K pour naviguer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VARIANTE 5 — Hub + Breadcrumb
// ============================================================
function Variant5() {
  const [currentView, setCurrentView] = useState<'hub' | 'module'>('hub');
  const [activeModule, setActiveModule] = useState('finance');

  const modules = [
    { id: 'ag', label: 'AG', icon: <Users size={28} />, stat: '1 AG planifiée', color: '#3b82f6' },
    { id: 'finance', label: 'Finance', icon: <DollarSign size={28} />, stat: '3 factures', color: '#22c55e' },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={28} />, stat: '2 ordres', color: '#f59e0b' },
    { id: 'copropriete', label: 'Copropriété', icon: <Building2 size={28} />, stat: '9 copros', color: '#8b5cf6' },
    { id: 'documents', label: 'Documents', icon: <FileText size={28} />, stat: '24 fichiers', color: '#6366f1' },
    { id: 'juridique', label: 'Juridique', icon: <Scale size={28} />, stat: '0 litige', color: '#ec4899' },
  ];

  const subPages: Record<string, string[]> = {
    finance: ['Comptabilité', 'Budgets', 'Factures', 'Appels de fonds', 'Mouvements'],
    ag: ['Tableau de bord', 'Prochaine AG', 'Historique'],
    copropriete: ['Copropriétaires', 'Tantièmes', 'Impayés', 'Lots'],
    maintenance: ['Carnet', 'Contrats', 'Prestataires', 'Ordres de service'],
    documents: ['GED', 'Annexes', 'Courrier', 'État daté'],
    juridique: ['Litiges'],
  };

  return (
    <div className={styles.v5}>
      <div className={styles.v5Bar}>
        {currentView === 'module' ? (
          <>
            <button className={styles.v5Back} onClick={() => setCurrentView('hub')}>← Hub</button>
            <span className={styles.v5Breadcrumb}>
              {modules.find(m => m.id === activeModule)?.label}
            </span>
          </>
        ) : (
          <span className={styles.v5Logo}>CoProFlex</span>
        )}
        <div className={styles.v5Right}>
          <Settings size={16} />
          <div className={styles.avatar}>JD</div>
        </div>
      </div>
      <div className={styles.v5Body}>
        {currentView === 'hub' ? (
          <div className={styles.v5Hub}>
            <h2 className={styles.v5HubTitle}>Bonjour Jean</h2>
            <div className={styles.v5Grid}>
              {modules.map(m => (
                <button
                  key={m.id}
                  className={styles.v5Card}
                  onClick={() => { setActiveModule(m.id); setCurrentView('module'); }}
                >
                  <div className={styles.v5CardIcon} style={{ background: m.color + '20', color: m.color }}>
                    {m.icon}
                  </div>
                  <div className={styles.v5CardLabel}>{m.label}</div>
                  <div className={styles.v5CardStat}>{m.stat}</div>
                </button>
              ))}
            </div>
            <div className={styles.v5Alerts}>
              <h3>Alertes récentes</h3>
              <div className={styles.v5AlertItem}>
                <AlertTriangle size={14} /> 2 impayés &gt; 60 jours
              </div>
              <div className={styles.v5AlertItem}>
                <Calendar size={14} /> AG dans 15 jours
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.v5Module}>
            <div className={styles.v5SubNav}>
              {(subPages[activeModule] || []).map((p, i) => (
                <button key={i} className={`${styles.v5SubBtn} ${i === 0 ? styles.v5SubBtnActive : ''}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className={styles.contentPlaceholder}>
              <span>Contenu du module</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function NavigationPreview() {
  const [variant, setVariant] = useState<Variant>(1);

  return (
    <div className={styles.page}>
      <div className={styles.selector}>
        <h1 className={styles.pageTitle}>Navigation Preview</h1>
        <div className={styles.tabs}>
          {([1, 2, 3, 4, 5] as Variant[]).map(v => (
            <button
              key={v}
              className={`${styles.tab} ${variant === v ? styles.tabActive : ''}`}
              onClick={() => setVariant(v)}
            >
              V{v}
            </button>
          ))}
        </div>
        <p className={styles.variantName}>{VARIANT_NAMES[variant]}</p>
      </div>
      <div className={styles.preview}>
        {variant === 1 && <Variant1 />}
        {variant === 2 && <Variant2 />}
        {variant === 3 && <Variant3 />}
        {variant === 4 && <Variant4 />}
        {variant === 5 && <Variant5 />}
      </div>
    </div>
  );
}
