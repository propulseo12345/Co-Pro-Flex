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
  climatisation: '#60A5FA', portail: '#34D399', autre: '#64748b',
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

  const selected = filtered.find(p => p.id === selectedId) || filtered[0] || null;
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
          { label: 'TOTAL', value: String(allProviders.length), color: '#e2e8f0' },
          { label: 'ACTIFS', value: String(actifsCount), color: '#22c55e' },
          { label: 'INTERVENTIONS TOTAL', value: String(totalInterventions), color: '#e2e8f0' },
          { label: 'NOTE MOYENNE', value: `${avgRating} ★`, color: '#fbbf24' },
        ].map((kpi, i) => (
          <div key={i} style={{
            flex: 1, padding: '16px 20px',
            background: '#1a1d2e',
            border: '1px solid rgba(148,163,184,0.08)',
            borderRadius: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: '#64748b', marginBottom: 6,
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
          padding: '8px 14px', background: '#1a1d2e',
          border: '1px solid rgba(148,163,184,0.08)', borderRadius: 10,
          color: '#64748b', fontSize: 13,
        }}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par nom, domaine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              color: '#e2e8f0', outline: 'none', fontSize: 13, fontFamily: 'inherit',
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
                background: isActive ? 'rgba(59,130,246,0.12)' : '#1a1d2e',
                border: isActive ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(148,163,184,0.08)',
                borderRadius: 10,
                color: isActive ? '#3b82f6' : '#94a3b8',
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
          background: '#1a1d2e', border: '1px solid rgba(148,163,184,0.08)',
          borderRadius: 12, padding: 8, maxHeight: 560, overflowY: 'auto',
        }}>
          {filtered.map(p => {
            const isActive = selected?.id === p.id;
            const mainDomain = p.domaines?.[0] || 'autre';
            const domColor = DOMAINE_COLORS[mainDomain] || '#64748b';
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
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${domColor}, ${domColor}cc)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: 'white',
                }}>
                  {(p.nom || '?').substring(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: '#e2e8f0',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.nom}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                    {p.domaines?.map(d => (
                      <span key={d} style={{
                        display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 500,
                        background: `${DOMAINE_COLORS[d] || '#64748b'}1f`,
                        color: DOMAINE_COLORS[d] || '#64748b',
                      }}>
                        {DOMAIN_LABELS[d] || d}
                      </span>
                    ))}
                    {p.noteMoyenne != null && p.noteMoyenne > 0 && (
                      <span style={{ color: '#fbbf24', marginLeft: 8, fontSize: 11 }}>
                        ★ {p.noteMoyenne.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              Aucun prestataire trouvé.
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div style={{
            background: '#1a1d2e', border: '1px solid rgba(148,163,184,0.08)',
            borderRadius: 12, padding: 24,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                  {selected.nom}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {selected.domaines?.map(d => DOMAIN_LABELS[d] || d).join(', ')}
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                borderRadius: 8, fontSize: 11, fontWeight: 500,
                background: selected.actif ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                color: selected.actif ? '#4ade80' : '#94a3b8',
              }}>
                {selected.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{
                background: '#131620', border: '1px solid rgba(148,163,184,0.06)',
                borderRadius: 8, padding: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
                  {selected.nombreInterventions || 0}
                </div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginTop: 4 }}>
                  Interventions
                </div>
              </div>
              <div style={{
                background: '#131620', border: '1px solid rgba(148,163,184,0.06)',
                borderRadius: 8, padding: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
                  {selected.noteMoyenne ? `${selected.noteMoyenne.toFixed(1)} ★` : '—'}
                </div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginTop: 4 }}>
                  Note moyenne
                </div>
              </div>
              <div style={{
                background: '#131620', border: '1px solid rgba(148,163,184,0.06)',
                borderRadius: 8, padding: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                  {selected.contractsCount || 0}
                </div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginTop: 4 }}>
                  Contrats
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 4 }}>
                  TÉLÉPHONE
                </div>
                <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>
                  {selected.telephone || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 4 }}>
                  EMAIL
                </div>
                <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 500 }}>
                  {selected.email || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 4 }}>
                  ADRESSE
                </div>
                <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>
                  {[selected.adresse, selected.ville].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 4 }}>
                  SIRET
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
                  {selected.siret || '—'}
                </div>
              </div>
              {selected.domaines && selected.domaines.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', marginBottom: 4 }}>
                    DOMAINES
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {selected.domaines.map(d => (
                      <span key={d} style={{
                        display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 500,
                        background: `${DOMAINE_COLORS[d] || '#64748b'}1f`,
                        color: DOMAINE_COLORS[d] || '#64748b',
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
              <button className={topBarStyles.btnPrimary} onClick={() => onGoToPrestataire(selected)}>
                Voir fiche complète
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#1a1d2e', border: '1px solid rgba(148,163,184,0.08)',
            borderRadius: 12, padding: 24,
          }}>
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              Sélectionnez un prestataire.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
