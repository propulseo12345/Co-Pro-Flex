'use client';

import { useState, useMemo } from 'react';
import { Search, Download, Plus, Phone, Mail } from 'lucide-react';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';

const DOMAINE_COLORS: Record<string, string> = {
  ascenseur: '#5b8def', menage: '#3ecf8e', chauffage: '#e5a63e',
  plomberie: '#60A5FA', electricite: '#FBBF24', interphone: '#A78BFA',
  espaces_verts: '#34D399', assurance: '#F87171', toiture: '#9b8afb',
  facade: '#60A5FA', securite: '#EF4444', serrurerie: '#8892a4',
  peinture: '#e5a63e', juridique: '#A78BFA', architecture: '#5b8def',
  climatisation: '#60A5FA', portail: '#34D399', autre: 'var(--text-tertiary)',
};

const DOMAIN_LABELS: Record<string, string> = {
  plomberie: 'Plomberie', electricite: 'Électricité', chauffage: 'Chauffage',
  ascenseur: 'Ascenseur', menage: 'Ménage', espaces_verts: 'Espaces verts',
  serrurerie: 'Serrurerie', peinture: 'Peinture', assurance: 'Assurance',
  juridique: 'Juridique', architecture: 'Architecture', toiture: 'Toiture',
  facade: 'Façade', climatisation: 'Climatisation', interphone: 'Interphone',
  portail: 'Portail', securite: 'Sécurité', autre: 'Autre',
};

interface Provider {
  id: string | null;
  nom: string | null;
  domaines: string[] | null;
  contactNom?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
  siret?: string | null;
  noteMoyenne: number | null;
  nombreInterventions: number | null;
  actif: boolean | null;
  contractsCount?: number | null;
  [key: string]: unknown;
}

type TabId = 'tous' | 'copro' | 'syndic' | 'coproflex';

interface ProvidersFinanceViewProps {
  prestairesCopro: Provider[];
  prestairesSyndic: Provider[];
  prestairesCoproFlex: Provider[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onExport: () => void;
  onAddPrestataire: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGoToPrestataire: (p: any) => void;
}

export function ProvidersFinanceView({
  prestairesCopro,
  prestairesSyndic,
  prestairesCoproFlex,
  searchTerm,
  setSearchTerm,
  onExport,
  onAddPrestataire,
  onGoToPrestataire,
}: ProvidersFinanceViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tous');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allProviders = useMemo(() => [
    ...prestairesCopro, ...prestairesSyndic, ...prestairesCoproFlex,
  ], [prestairesCopro, prestairesSyndic, prestairesCoproFlex]);

  const filtered = useMemo(() => {
    let list = activeTab === 'copro' ? prestairesCopro
      : activeTab === 'syndic' ? prestairesSyndic
      : activeTab === 'coproflex' ? prestairesCoproFlex
      : allProviders;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.nom || '').toLowerCase().includes(q) ||
        p.domaines?.some(d => d.toLowerCase().includes(q)) ||
        p.email?.toLowerCase().includes(q) ||
        p.ville?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, searchTerm, allProviders, prestairesCopro, prestairesSyndic, prestairesCoproFlex]);

  // Filtre par domaine dans la sidebar
  const [domainFilter, setDomainFilter] = useState<string>('tous');

  // Domaines disponibles (comptage sur tous les domaines de chaque prestataire)
  const availableDomains = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(p => {
      const domains = p.domaines?.length ? p.domaines : ['autre'];
      domains.forEach(d => {
        counts[d] = (counts[d] || 0) + 1;
      });
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [filtered]);

  const domainFiltered = useMemo(() => {
    if (domainFilter === 'tous') return filtered;
    return filtered.filter(p => (p.domaines || []).includes(domainFilter));
  }, [filtered, domainFilter]);

  const selected = domainFiltered.find(p => p.id === selectedId) || domainFiltered[0] || null;

  const totalInterventions = allProviders.reduce((s, p) => s + (p.nombreInterventions || 0), 0);
  const actifsCount = allProviders.filter(p => p.actif).length;
  const avgRating = allProviders.filter(p => p.noteMoyenne).length > 0
    ? (allProviders.reduce((s, p) => s + (p.noteMoyenne || 0), 0) / allProviders.filter(p => p.noteMoyenne).length).toFixed(1)
    : '—';

  return (
    <>
      {/* TopBar */}
      <FinanceTopBar
        title="Annuaire prestataires"
        subtitle="Coordonnées et suivi des professionnels"
        actions={
          <>
            <button className={topBarStyles.btnGhost} onClick={onExport}>
              <Download size={15} aria-hidden="true" /> Exporter
            </button>
            <button className={topBarStyles.btnPrimary} onClick={onAddPrestataire}>
              <Plus size={15} aria-hidden="true" /> Prestataire
            </button>
          </>
        }
      />

      {/* KPI Strip — inline forcé */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'TOTAL', value: String(allProviders.length), color: 'var(--text-main)' },
          { label: 'ACTIFS', value: String(actifsCount), color: 'var(--success)' },
          { label: 'INTERVENTIONS TOTAL', value: String(totalInterventions), color: 'var(--text-main)' },
          { label: 'NOTE MOYENNE', value: `${avgRating} ★`, color: 'var(--warning)' },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            flex: 1, padding: '16px 20px',
            background: 'var(--surface)',
            border: '1px solid rgba(148,163,184,0.08)',
            borderRadius: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 6,
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: kpi.color,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters — inline forcé */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: 'var(--surface)',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 10,
          color: 'var(--text-tertiary)', fontSize: 13,
        }}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par nom, domaine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              color: 'var(--text-main)', outline: 'none', fontSize: 13, fontFamily: 'inherit',
            }}
          />
        </div>
        {(['tous', 'copro', 'syndic', 'coproflex'] as TabId[]).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '8px 14px',
                background: isActive ? 'rgba(59,130,246,0.12)' : 'var(--surface)',
                border: isActive ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(148,163,184,0.08)',
                borderRadius: 10,
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              {tab === 'tous' ? `Tous (${allProviders.length})`
                : tab === 'copro' ? 'Copropriété'
                : tab === 'syndic' ? 'Syndic'
                : 'CoproFlex'}
            </button>
          );
        })}
      </div>

      {/* Split View — inline forcé */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>

        {/* List */}
        <div style={{
          background: 'var(--surface)', border: '1px solid rgba(148,163,184,0.08)',
          borderRadius: 12, maxHeight: 560, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {/* Domain pills */}
          <div style={{
            display: 'flex', gap: 6, padding: '10px 10px', overflowX: 'auto',
            borderBottom: '1px solid rgba(148,163,184,0.06)', flexShrink: 0, flexWrap: 'nowrap',
          }}>
            <button
              onClick={() => setDomainFilter('tous')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                background: domainFilter === 'tous' ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: domainFilter === 'tous' ? 'var(--primary)' : 'var(--text-tertiary)',
              }}
            >
              Tous
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '0 5px', borderRadius: 8,
                background: domainFilter === 'tous' ? 'rgba(59,130,246,0.2)' : 'rgba(148,163,184,0.08)',
                color: domainFilter === 'tous' ? 'var(--secondary)' : 'var(--text-tertiary)',
              }}>
                {filtered.length}
              </span>
            </button>
            {availableDomains.map(([domain, count]) => {
              const domColor = DOMAINE_COLORS[domain] || 'var(--text-tertiary)';
              const isActive = domainFilter === domain;
              return (
                <button
                  key={domain}
                  onClick={() => setDomainFilter(isActive ? 'tous' : domain)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                    background: isActive ? `${domColor}1f` : 'transparent',
                    color: isActive ? domColor : 'var(--text-secondary)',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: domColor, flexShrink: 0,
                  }} />
                  {DOMAIN_LABELS[domain] || domain}
                  {isActive && (
                    <span style={{ fontSize: 10, color: `${domColor}99` }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Provider list */}
          <div style={{ padding: 8, flex: 1, overflowY: 'auto' }}>
            {domainFiltered.map(p => {
              const isActive = selected?.id === p.id;
              const mainDomain = p.domaines?.[0] || 'autre';
              const domColor = DOMAINE_COLORS[mainDomain] || 'var(--text-tertiary)';
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 12, borderRadius: 8, cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                    background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${domColor}, ${domColor}cc)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'white',
                  }}>
                    {(p.nom || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text-main)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p.nom}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {p.domaines?.map(d => (
                        <span key={d} style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                          fontSize: 10, fontWeight: 500,
                          background: `${DOMAINE_COLORS[d] || 'var(--text-tertiary)'}1f`,
                          color: DOMAINE_COLORS[d] || 'var(--text-tertiary)',
                        }}>
                          {DOMAIN_LABELS[d] || d}
                        </span>
                      ))}
                      {p.noteMoyenne != null && p.noteMoyenne > 0 && (
                        <span style={{ color: 'var(--warning)', fontSize: 11, marginLeft: 4 }}>
                          ★ {p.noteMoyenne.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: p.actif ? 'var(--success)' : 'var(--text-tertiary)',
                  }} />
                </div>
              );
            })}
            {domainFiltered.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                Aucun prestataire trouvé.
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid rgba(148,163,184,0.08)',
            borderRadius: 12, padding: 24,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                  {selected.nom}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  {selected.domaines?.map(d => DOMAIN_LABELS[d] || d).join(', ')}
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                borderRadius: 8, fontSize: 11, fontWeight: 500,
                background: selected.actif ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                color: selected.actif ? '#4ade80' : 'var(--text-secondary)',
              }}>
                {selected.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{
                background: 'var(--bg-secondary)', border: '1px solid rgba(148,163,184,0.06)',
                borderRadius: 8, padding: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--secondary)' }}>
                  {selected.nombreInterventions || 0}
                </div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Interventions
                </div>
              </div>
              <div style={{
                background: 'var(--bg-secondary)', border: '1px solid rgba(148,163,184,0.06)',
                borderRadius: 8, padding: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--warning)' }}>
                  {selected.noteMoyenne ? `${selected.noteMoyenne.toFixed(1)} ★` : '—'}
                </div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Note moyenne
                </div>
              </div>
              <div style={{
                background: 'var(--bg-secondary)', border: '1px solid rgba(148,163,184,0.06)',
                borderRadius: 8, padding: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>
                  {selected.contractsCount || 0}
                </div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Contrats
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  TÉLÉPHONE
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>
                  {selected.telephone || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  EMAIL
                </div>
                <div style={{ fontSize: 13, color: 'var(--secondary)', fontWeight: 500 }}>
                  {selected.email || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  ADRESSE
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>
                  {[selected.adresse, selected.ville].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  SIRET
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {selected.siret || '—'}
                </div>
              </div>
              {selected.domaines && selected.domaines.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                    DOMAINES
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {selected.domaines.map(d => (
                      <span key={d} style={{
                        display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 500,
                        background: `${DOMAINE_COLORS[d] || 'var(--text-tertiary)'}1f`,
                        color: DOMAINE_COLORS[d] || 'var(--text-tertiary)',
                      }}>
                        {DOMAIN_LABELS[d] || d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={topBarStyles.btnGhost} onClick={() => selected.telephone && window.open(`tel:${selected.telephone}`)}>
                <Phone size={14} aria-hidden="true" /> Appeler
              </button>
              <button className={topBarStyles.btnGhost} onClick={() => selected.email && window.open(`mailto:${selected.email}`)}>
                <Mail size={14} aria-hidden="true" /> Email
              </button>
              <button className={topBarStyles.btnPrimary} onClick={() => {
                if (selected?.id) onGoToPrestataire({ id: selected.id });
              }}>
                Voir fiche complète
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--surface)', border: '1px solid rgba(148,163,184,0.08)',
            borderRadius: 12, padding: 24,
          }}>
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
              Sélectionnez un prestataire.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
