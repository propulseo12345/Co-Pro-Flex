'use client';

import { useState } from 'react';
import {
  Activity, TrendingUp, CheckCircle2, AlertTriangle, Euro,
  Clock, Search, ChevronDown, ChevronUp, Plus, Download,
  Wrench, MoreVertical, Building2, MapPin, Layers,
  Calendar, User, Filter, Settings, Phone, Mail, Shield,
} from 'lucide-react';
import styles from './preview.module.css';

// =====================================================
// TYPES
// =====================================================
type DisplayVariant = 'A' | 'B' | 'C';
type HeaderVariant = 'line' | 'collapsible';
type ActiveTab = 'interventions' | 'travaux';
type FiltreKpi = 'en_cours' | 'planifiees' | 'travaux_prevus' | 'travaux_votes' | 'cout_annee' | 'urgences' | null;
type StatutIntervention = 'EN_COURS' | 'PLANIFIE' | 'TERMINE' | 'URGENT';

interface Intervention {
  id: string;
  titre: string;
  description: string;
  date: string;
  prestataire: string;
  cout: number;
  statut: StatutIntervention;
  equipement: string;
}

interface TravailPrevisionnel {
  id: string;
  titre: string;
  description: string;
  montantEstime: number;
  entrepriseProposee: string;
  priorite: 'urgence' | 'planifie' | 'a_etudier';
  echeanceSouhaitee: string;
  devisJoints: number;
  resolutionAg?: string;
}

// =====================================================
// MOCK DATA
// =====================================================
const MOCK_INTERVENTIONS: Intervention[] = [
  { id: '1', titre: 'Révision portes de garage', description: 'Contrôle annuel des portes automatiques du parking', date: '25/01/2026', prestataire: 'TechPortail', cout: 220, statut: 'EN_COURS', equipement: 'Parking' },
  { id: '2', titre: 'Maintenance préventive VMC', description: 'Nettoyage et vérification du système de ventilation', date: '20/01/2026', prestataire: 'Climat Services', cout: 180, statut: 'EN_COURS', equipement: 'VMC' },
  { id: '3', titre: 'Ramonage chaudière collective', description: 'Ramonage obligatoire annuel de la chaufferie', date: '15/12/2025', prestataire: 'FlammePro', cout: 350, statut: 'TERMINE', equipement: 'Chaufferie' },
  { id: '4', titre: 'Réfection cage escalier A', description: 'Peinture et remise en état cage A — bâtiment principal', date: '15/03/2026', prestataire: 'PeintBat Lyon', cout: 1200, statut: 'PLANIFIE', equipement: 'Parties communes' },
  { id: '5', titre: 'Remplacement éclairage hall', description: 'Passage en LED du hall d\'entrée bâtiment B', date: '01/02/2026', prestataire: 'ElecPro', cout: 450, statut: 'TERMINE', equipement: 'Éclairage' },
  { id: '6', titre: 'Fuite toiture bâtiment C', description: 'Infiltration signalée au 5e étage — intervention urgente', date: '28/01/2026', prestataire: 'Toitures Rhône', cout: 890, statut: 'URGENT', equipement: 'Toiture' },
  { id: '7', titre: 'Entretien ascenseur T1', description: 'Visite trimestrielle de maintenance préventive', date: '10/02/2026', prestataire: 'Otis', cout: 320, statut: 'PLANIFIE', equipement: 'Ascenseur' },
  { id: '8', titre: 'Débouchage colonne EU bât. A', description: 'Colonne eaux usées bouchée RDC — hydrocurage', date: '18/01/2026', prestataire: 'Plomb Express', cout: 280, statut: 'TERMINE', equipement: 'Plomberie' },
];

const MOCK_TRAVAUX: TravailPrevisionnel[] = [
  { id: '1', titre: 'Ravalement façade sud', description: 'Ravalement complet avec isolation thermique par l\'extérieur', montantEstime: 85000, entrepriseProposee: 'BTP Rhône-Alpes', priorite: 'planifie', echeanceSouhaitee: 'Septembre 2026', devisJoints: 3, resolutionAg: 'AG 2026 — Résolution n°8' },
  { id: '2', titre: 'Mise aux normes ascenseur', description: 'Remplacement câbles + modernisation cabine — conformité 2025', montantEstime: 42000, entrepriseProposee: 'Otis', priorite: 'urgence', echeanceSouhaitee: 'Juin 2026', devisJoints: 2 },
  { id: '3', titre: 'Réfection étanchéité terrasse', description: 'Reprise complète de l\'étanchéité terrasse bâtiment B', montantEstime: 28000, entrepriseProposee: 'Toitures Rhône', priorite: 'planifie', echeanceSouhaitee: 'Été 2026', devisJoints: 2 },
  { id: '4', titre: 'Remplacement chaudière collective', description: 'Passage à condensation — gain estimé 25% sur chauffage', montantEstime: 65000, entrepriseProposee: '', priorite: 'a_etudier', echeanceSouhaitee: '2027', devisJoints: 0 },
];

const MOCK_KPIS = {
  enCours: 2,
  planifiees: 2,
  travauxPrevus: 4,
  travauxVotes: 1,
  coutAnnee: 3890,
  urgences: 1,
};

const STATUT_CONFIG: Record<StatutIntervention, { label: string; color: string; icon: React.ElementType }> = {
  EN_COURS: { label: 'En cours', color: '#FBBF24', icon: Activity },
  PLANIFIE: { label: 'Planifié', color: '#60A5FA', icon: Clock },
  TERMINE: { label: 'Terminé', color: '#34D399', icon: CheckCircle2 },
  URGENT: { label: 'Urgent', color: '#EF4444', icon: AlertTriangle },
};

const STATUT_PRIORITY: Record<StatutIntervention, number> = {
  URGENT: 0,
  EN_COURS: 1,
  PLANIFIE: 2,
  TERMINE: 3,
};

const SORTED_INTERVENTIONS = [...MOCK_INTERVENTIONS].sort(
  (a, b) => STATUT_PRIORITY[a.statut] - STATUT_PRIORITY[b.statut]
);

const PRIORITE_CONFIG: Record<string, { label: string; color: string }> = {
  urgence: { label: 'Urgent', color: '#EF4444' },
  planifie: { label: 'Planifié', color: '#60A5FA' },
  a_etudier: { label: 'À l\'étude', color: '#A78BFA' },
};

// =====================================================
// SHARED — KPI BAR
// =====================================================
function KpiBar({ filtre, setFiltre }: { filtre: FiltreKpi; setFiltre: (f: FiltreKpi) => void }) {
  const kpis: Array<{ id: FiltreKpi; label: string; value: number | string; color: string; icon: React.ElementType; alert?: boolean }> = [
    { id: 'en_cours', label: 'En cours', value: MOCK_KPIS.enCours, color: '#FBBF24', icon: Activity },
    { id: 'planifiees', label: 'Planifiées', value: MOCK_KPIS.planifiees, color: '#60A5FA', icon: Clock },
    { id: 'travaux_prevus', label: 'Travaux prévus', value: MOCK_KPIS.travauxPrevus, color: '#A78BFA', icon: TrendingUp },
    { id: 'travaux_votes', label: 'Travaux votés', value: MOCK_KPIS.travauxVotes, color: '#34D399', icon: CheckCircle2 },
    { id: 'cout_annee', label: 'Coût année', value: `${MOCK_KPIS.coutAnnee.toLocaleString('fr-FR')} €`, color: '#2563eb', icon: Euro },
    { id: 'urgences', label: 'Urgences', value: MOCK_KPIS.urgences, color: '#EF4444', icon: AlertTriangle, alert: MOCK_KPIS.urgences > 0 },
  ];

  return (
    <div className={styles.kpiBar}>
      {kpis.map(k => {
        const Icon = k.icon;
        const active = filtre === k.id;
        return (
          <button
            key={k.id}
            className={`${styles.kpiCard} ${active ? styles.kpiCardActive : ''} ${k.alert ? styles.kpiCardAlert : ''}`}
            onClick={() => setFiltre(filtre === k.id ? null : k.id)}
            style={active ? { borderColor: k.color } : undefined}
          >
            <div className={styles.kpiIcon} style={{ background: k.color + '15', color: k.color }}>
              <Icon size={16} />
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiValue}>{k.value}</span>
              <span className={styles.kpiLabel}>{k.label}</span>
            </div>
            {k.alert && <span className={styles.kpiPulse} style={{ background: k.color }} />}
          </button>
        );
      })}
    </div>
  );
}

// =====================================================
// SHARED — HEADER VARIANTS
// =====================================================
function HeaderLine() {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.headerLine}>
      <div className={styles.headerLineTop}>
        <div className={styles.headerLineLeft}>
          <Building2 size={18} className={styles.headerLineIcon} />
          <span className={styles.headerLineName}>Résidence Les Jardins</span>
          <span className={styles.headerLineSep}>•</span>
          <MapPin size={14} className={styles.headerLineIconSm} />
          <span className={styles.headerLineDetail}>25 av. Victor Hugo, 69003 Lyon</span>
          <span className={styles.headerLineSep}>•</span>
          <Layers size={14} className={styles.headerLineIconSm} />
          <span className={styles.headerLineDetail}>45 lots — 3 bâtiments — 1985</span>
        </div>
        <button className={styles.headerLineBtn} onClick={() => setOpen(!open)}>
          {open ? 'Masquer' : 'Voir détails'}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <div className={styles.headerLineBody}>
          <div className={styles.headerLineGrid3}>
            {/* COPROPRIÉTÉ + CARACTÉRISTIQUES fusionnés */}
            <div className={styles.infoBlock}>
              <div className={styles.infoBlockHeader}>
                <span className={styles.infoBlockAccent} />
                <span className={styles.infoBlockTitle}>Copropriété</span>
              </div>
              <div className={styles.infoCompact}>
                <div className={styles.infoCompactRow}>
                  <span className={styles.infoCompactLabel}>Adresse</span>
                  <span className={styles.infoCompactValue}>25 av. Victor Hugo, 69003 Lyon</span>
                </div>
                <div className={styles.infoCompactRow}>
                  <span className={styles.infoCompactLabel}>Construction</span>
                  <span className={styles.infoCompactValue}>1992</span>
                </div>
                <div className={styles.infoCompactRow}>
                  <span className={styles.infoCompactLabel}>Bâtiments / Lots</span>
                  <span className={styles.infoCompactValue}>2 bâtiments — 28 lots</span>
                </div>
              </div>
            </div>

            {/* ÉQUIPEMENTS PRINCIPAUX */}
            <div className={styles.infoBlock}>
              <div className={styles.infoBlockHeader}>
                <span className={styles.infoBlockAccent} />
                <span className={styles.infoBlockTitle}>Équipements principaux</span>
              </div>
              <div className={styles.equipGrid}>
                {[
                  { name: 'Ascenseur', detail: '1 unité', color: '#5b8def' },
                  { name: 'Chaudière', detail: 'Gaz collective', color: '#e5a63e' },
                  { name: 'VMC', detail: 'Collective', color: '#3ecf8e' },
                  { name: 'Toiture', detail: 'Terrasse accessible', color: '#9b8afb' },
                  { name: 'Espaces verts', detail: '450 m²', color: '#3ecf8e' },
                  { name: 'Portail', detail: 'Automatique', color: '#5b8def' },
                  { name: 'Interphone', detail: 'Collectif', color: '#7b8498' },
                ].map(eq => (
                  <button key={eq.name} className={styles.equipChip}>
                    <span className={styles.equipChipDot} style={{ background: eq.color }} />
                    <span className={styles.equipChipName}>{eq.name}</span>
                    <span className={styles.equipChipDetail}>{eq.detail}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* CONTACTS CLÉS */}
            <div className={styles.infoBlock}>
              <div className={styles.infoBlockHeader}>
                <span className={styles.infoBlockAccent} />
                <span className={styles.infoBlockTitle}>Contacts clés</span>
              </div>
              <div className={styles.contactList}>
                {[
                  { role: 'Syndic', name: 'Foncia — M. Dupont', tel: '04 72 00 11 22', email: 'dupont@foncia.fr', color: '#5b8def', icon: Building2 },
                  { role: 'Gardien', name: 'M. Garcia', tel: '06 12 34 56 78', email: undefined, color: '#3ecf8e', icon: User },
                  { role: 'Président CS', name: 'Mme Leroy', tel: '06 98 76 54 32', email: 'leroy@email.fr', color: '#9b8afb', icon: Shield },
                  { role: 'Urgence Gaz', name: 'GrDF', tel: '0 800 47 33 33', email: undefined, color: '#e35d6a', icon: AlertTriangle },
                  { role: 'Assurance', name: 'AXA — Sinistres', tel: '01 55 92 26 26', email: undefined, color: '#e5a63e', icon: Shield },
                ].map(c => {
                  const I = c.icon;
                  return (
                    <div key={c.role} className={styles.contactItem}>
                      <div className={styles.contactItemIcon} style={{ background: c.color + '12', color: c.color }}>
                        <I size={12} />
                      </div>
                      <div className={styles.contactItemInfo}>
                        <div className={styles.contactItemRole}>{c.role}</div>
                        <div className={styles.contactItemName}>{c.name}</div>
                      </div>
                      <div className={styles.contactItemActions}>
                        <a href={`tel:${c.tel.replace(/\s/g, '')}`} className={styles.contactActionBtn} title={c.tel}>
                          <Phone size={11} />
                        </a>
                        {c.email && (
                          <a href={`mailto:${c.email}`} className={styles.contactActionBtn} title={c.email}>
                            <Mail size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderCollapsible() {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.headerCollapsible}>
      <button className={styles.headerCollapsibleToggle} onClick={() => setOpen(!open)}>
        <div className={styles.headerCollapsibleLeft}>
          <Building2 size={18} className={styles.headerLineIcon} />
          <span className={styles.headerLineName}>Résidence Les Jardins</span>
          <span className={styles.headerLineSep}>•</span>
          <span className={styles.headerLineDetail}>45 lots</span>
        </div>
        <div className={styles.headerCollapsibleChevron}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className={styles.headerCollapsibleLabel}>{open ? 'Réduire' : 'Détails'}</span>
        </div>
      </button>
      {open && (
        <div className={styles.headerCollapsibleBody}>
          <div className={styles.headerCollapsibleGrid}>
            <div className={styles.headerCollapsibleItem}>
              <span className={styles.headerCollapsibleItemLabel}>Adresse</span>
              <span className={styles.headerCollapsibleItemValue}>25 avenue Victor Hugo, 69003 Lyon</span>
            </div>
            <div className={styles.headerCollapsibleItem}>
              <span className={styles.headerCollapsibleItemLabel}>Bâtiments / Lots</span>
              <span className={styles.headerCollapsibleItemValue}>3 bâtiments — 45 lots</span>
            </div>
            <div className={styles.headerCollapsibleItem}>
              <span className={styles.headerCollapsibleItemLabel}>Construction</span>
              <span className={styles.headerCollapsibleItemValue}>1985</span>
            </div>
            <div className={styles.headerCollapsibleItem}>
              <span className={styles.headerCollapsibleItemLabel}>Syndic</span>
              <span className={styles.headerCollapsibleItemValue}>Cabinet Martin — 01 23 45 67 89</span>
            </div>
            <div className={styles.headerCollapsibleItem}>
              <span className={styles.headerCollapsibleItemLabel}>Équipements</span>
              <span className={styles.headerCollapsibleItemValue}>Ascenseur, Chaufferie, VMC, Parking</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// SHARED — FILTERS + SEARCH
// =====================================================
function SearchFilters() {
  return (
    <div className={styles.searchSection}>
      <div className={styles.searchRow}>
        <div className={styles.searchInput}>
          <Search size={16} className={styles.searchIcon} />
          <input type="text" placeholder="Rechercher une intervention..." className={styles.searchField} />
        </div>
        <button className={styles.filterBtn}><Filter size={14} /> Filtres</button>
      </div>
      <div className={styles.filterChips}>
        <button className={styles.chip}>Tous statuts <ChevronDown size={12} /></button>
        <button className={styles.chip}>Tous prestataires <ChevronDown size={12} /></button>
        <button className={styles.chip}>Tous équipements <ChevronDown size={12} /></button>
        <button className={styles.chip}>2026 <ChevronDown size={12} /></button>
      </div>
      <div className={styles.resultsSummary}>
        <span>{MOCK_INTERVENTIONS.length} interventions</span>
        <div className={styles.resultsBadges}>
          <span className={styles.resultBadge} style={{ color: '#FBBF24' }}>● 2 en cours</span>
          <span className={styles.resultBadge} style={{ color: '#60A5FA' }}>● 2 planifiées</span>
          <span className={styles.resultBadge} style={{ color: '#34D399' }}>● 3 terminées</span>
          <span className={styles.resultBadge} style={{ color: '#EF4444' }}>● 1 urgence</span>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// SHARED — TABS
// =====================================================
function TabsBar({ activeTab, setActiveTab }: { activeTab: ActiveTab; setActiveTab: (t: ActiveTab) => void }) {
  return (
    <div className={styles.tabsBar}>
      <button
        className={`${styles.tabBtn} ${activeTab === 'interventions' ? styles.tabBtnActive : ''}`}
        onClick={() => setActiveTab('interventions')}
      >
        <Wrench size={15} />
        Interventions
        <span className={styles.tabCount}>{MOCK_INTERVENTIONS.length}</span>
      </button>
      <button
        className={`${styles.tabBtn} ${activeTab === 'travaux' ? styles.tabBtnActive : ''}`}
        onClick={() => setActiveTab('travaux')}
      >
        <TrendingUp size={15} />
        Travaux prévisionnels
        <span className={styles.tabCount}>{MOCK_TRAVAUX.length}</span>
      </button>
    </div>
  );
}

// =====================================================
// SHARED — TRAVAUX PREVISIONNELS
// =====================================================
function TravauxContent() {
  return (
    <div className={styles.travauxList}>
      {MOCK_TRAVAUX.map(t => {
        const prio = PRIORITE_CONFIG[t.priorite];
        return (
          <div key={t.id} className={styles.travauxCard}>
            <div className={styles.travauxCardHeader}>
              <div className={styles.travauxCardLeft}>
                <h4 className={styles.travauxCardTitle}>{t.titre}</h4>
                <span className={styles.travauxBadge} style={{ background: prio.color + '15', color: prio.color, borderColor: prio.color + '30' }}>
                  {prio.label}
                </span>
              </div>
              <div className={styles.travauxCardRight}>
                <span className={styles.travauxMontant}>{t.montantEstime.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
            <p className={styles.travauxDesc}>{t.description}</p>
            <div className={styles.travauxMeta}>
              {t.entrepriseProposee && (
                <span className={styles.travauxMetaItem}>
                  <User size={13} /> {t.entrepriseProposee}
                </span>
              )}
              <span className={styles.travauxMetaItem}>
                <Calendar size={13} /> {t.echeanceSouhaitee}
              </span>
              <span className={styles.travauxMetaItem}>
                📎 {t.devisJoints} devis
              </span>
              {t.resolutionAg && (
                <span className={styles.travauxMetaItemAg}>
                  ✓ {t.resolutionAg}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// VARIANTE A — Tableau dense
// =====================================================
function InterventionsTableau() {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Titre</th>
            <th className={styles.th}>Statut</th>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Prestataire</th>
            <th className={styles.th}>Équipement</th>
            <th className={`${styles.th} ${styles.thRight}`}>Coût</th>
            <th className={styles.thActions}></th>
          </tr>
        </thead>
        <tbody>
          {SORTED_INTERVENTIONS.map(i => {
            const s = STATUT_CONFIG[i.statut];
            return (
              <tr key={i.id} className={styles.tr}>
                <td className={styles.td}>
                  <span className={styles.tableTitre}>{i.titre}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.tableStatut} style={{ color: s.color, background: s.color + '15' }}>
                    {s.label}
                  </span>
                </td>
                <td className={styles.td}><span className={styles.tableMeta}>{i.date}</span></td>
                <td className={styles.td}><span className={styles.tableMeta}>{i.prestataire}</span></td>
                <td className={styles.td}><span className={styles.tableMeta}>{i.equipement}</span></td>
                <td className={`${styles.td} ${styles.tdRight}`}>
                  <span className={styles.tableCout}>{i.cout.toLocaleString('fr-FR')} €</span>
                </td>
                <td className={styles.tdActions}>
                  <button className={styles.tableActionBtn}><MoreVertical size={14} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// VARIANTE B — Cartes compactes 2 colonnes
// =====================================================
function InterventionsCartes() {
  return (
    <div className={styles.cardsGrid}>
      {SORTED_INTERVENTIONS.map(i => {
        const s = STATUT_CONFIG[i.statut];
        return (
          <div key={i.id} className={styles.card} style={{ borderLeftColor: s.color }}>
            <div className={styles.cardTop}>
              <h4 className={styles.cardTitre}>{i.titre}</h4>
              <span className={styles.cardStatut} style={{ color: s.color, background: s.color + '15' }}>
                {s.label}
              </span>
            </div>
            <div className={styles.cardMeta}>
              <span>{i.date}</span>
              <span className={styles.cardMetaSep}>•</span>
              <span>{i.prestataire}</span>
            </div>
            <div className={styles.cardBottom}>
              <span className={styles.cardCout}>{i.cout.toLocaleString('fr-FR')} €</span>
              <button className={styles.cardAction}><MoreVertical size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// VARIANTE C — Liste hybride
// =====================================================
function InterventionsListe() {
  return (
    <div className={styles.listWrap}>
      {SORTED_INTERVENTIONS.map(i => {
        const s = STATUT_CONFIG[i.statut];
        const Icon = s.icon;
        return (
          <div key={i.id} className={styles.listRow}>
            <div className={styles.listIconCol}>
              <div className={styles.listIcon} style={{ background: s.color + '15', color: s.color }}>
                <Icon size={16} />
              </div>
            </div>
            <div className={styles.listContent}>
              <div className={styles.listMain}>
                <span className={styles.listTitre}>{i.titre}</span>
                <span className={styles.listDate}>{i.date}</span>
                <span className={styles.listPrestataire}>{i.prestataire}</span>
              </div>
              <p className={styles.listDesc}>{i.description}</p>
            </div>
            <div className={styles.listRight}>
              <span className={styles.listCout}>{i.cout.toLocaleString('fr-FR')} €</span>
              <button className={styles.listActionBtn}><MoreVertical size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// PAGE PREVIEW
// =====================================================
export default function LogbookPagePreview() {
  const [displayVariant, setDisplayVariant] = useState<DisplayVariant>('A');
  const [headerVariant, setHeaderVariant] = useState<HeaderVariant>('line');
  const [activeTab, setActiveTab] = useState<ActiveTab>('interventions');
  const [filtreKpi, setFiltreKpi] = useState<FiltreKpi>(null);

  const variantDescs: Record<DisplayVariant, string> = {
    A: 'Tableau dense — max visibilité, tri par colonne',
    B: 'Cartes compactes — grille 2 colonnes, scan rapide',
    C: 'Liste hybride — icône + titre + description',
  };

  return (
    <div className={styles.page}>
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Affichage interventions</span>
          <div className={styles.tabs}>
            {(['A', 'B', 'C'] as DisplayVariant[]).map(v => (
              <button
                key={v}
                className={`${styles.tab} ${displayVariant === v ? styles.tabActive : ''}`}
                onClick={() => setDisplayVariant(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <span className={styles.controlDesc}>{variantDescs[displayVariant]}</span>
        </div>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Header</span>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${headerVariant === 'line' ? styles.tabActive : ''}`}
              onClick={() => setHeaderVariant('line')}
            >
              Ligne (A)
            </button>
            <button
              className={`${styles.tab} ${headerVariant === 'collapsible' ? styles.tabActive : ''}`}
              onClick={() => setHeaderVariant('collapsible')}
            >
              Rétractable (C)
            </button>
          </div>
        </div>
      </div>

      {/* Page preview */}
      <div className={styles.preview}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbMuted}>Maintenance</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span>Carnet d&apos;entretien</span>
        </div>

        {/* Page title + actions */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Carnet d&apos;entretien</h1>
          <div className={styles.pageActions}>
            <button className={styles.btnSecondary}><Download size={15} /> Exporter</button>
            <button className={styles.btnPrimary}><Plus size={15} /> Nouvelle intervention</button>
          </div>
        </div>

        {/* Header info immeuble */}
        {headerVariant === 'line' ? <HeaderLine /> : <HeaderCollapsible />}

        {/* KPI Bar */}
        <KpiBar filtre={filtreKpi} setFiltre={setFiltreKpi} />

        {/* Tabs */}
        <TabsBar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Content */}
        {activeTab === 'interventions' && (
          <>
            <SearchFilters />
            {displayVariant === 'A' && <InterventionsTableau />}
            {displayVariant === 'B' && <InterventionsCartes />}
            {displayVariant === 'C' && <InterventionsListe />}
          </>
        )}

        {activeTab === 'travaux' && <TravauxContent />}
      </div>
    </div>
  );
}
