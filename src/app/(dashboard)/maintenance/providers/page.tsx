'use client';

import { useState, useMemo } from 'react';
import {
    Plus, Download, Search, Phone, Mail, MapPin, Star, Users,
    Building2, Globe, Wrench, Shield, ExternalLink, Briefcase,
} from 'lucide-react';
import clsx from 'clsx';
import { Toast } from '@/features/maintenance/shared/components';
import { AddProviderModal } from '@/features/maintenance/providers/components';
import { useProvidersHubPage } from '@/features/maintenance/providers/hooks';
import styles from './providers.module.css';

type TabId = 'tous' | 'copro' | 'syndic' | 'coproflex';

const DOMAIN_LABELS: Record<string, string> = {
    plomberie: 'Plomberie', electricite: 'Électricité', chauffage: 'Chauffage',
    ascenseur: 'Ascenseur', menage: 'Ménage', espaces_verts: 'Espaces verts',
    serrurerie: 'Serrurerie', peinture: 'Peinture', assurance: 'Assurance',
    juridique: 'Juridique', architecture: 'Architecture', toiture: 'Toiture',
    facade: 'Façade', climatisation: 'Climatisation', interphone: 'Interphone',
    portail: 'Portail', securite: 'Sécurité', autre: 'Autre',
};

const DOMAINE_COLORS: Record<string, string> = {
    ascenseur: '#5b8def', menage: '#3ecf8e', chauffage: '#e5a63e',
    plomberie: '#60A5FA', electricite: '#FBBF24', interphone: '#A78BFA',
    espaces_verts: '#34D399', assurance: '#F87171', toiture: '#9b8afb',
    facade: '#60A5FA', securite: '#EF4444', serrurerie: '#8892a4',
    peinture: '#e5a63e', juridique: '#A78BFA', architecture: '#5b8def',
    climatisation: '#60A5FA', portail: '#34D399', autre: '#64748b',
};

function StarRating({ note }: { note: number | null }) {
    if (!note) return <span className={styles.noRating}>—</span>;
    return (
        <div className={styles.starRating}>
            <Star size={12} fill="#FBBF24" color="#FBBF24" />
            <span>{note.toFixed(1)}</span>
        </div>
    );
}

export default function ProvidersHubPage() {
    const {
        searchTerm, setSearchTerm,
        isAddModalOpen, setIsAddModalOpen,
        toast, hideToast,
        prestairesCopro, prestairesSyndic, prestairesCoproFlex,
        handleExport, handleAddPrestataire, handleGoToPrestataire,
    } = useProvidersHubPage();

    const [activeTab, setActiveTab] = useState<TabId>('tous');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [domaineFilter, setDomaineFilter] = useState('TOUS');
    const [sortBy, setSortBy] = useState<'nom' | 'interventions' | 'note'>('nom');

    // Active providers based on tab
    const activeProviders = useMemo(() => {
        switch (activeTab) {
            case 'tous': return [...prestairesCopro, ...prestairesSyndic, ...prestairesCoproFlex];
            case 'copro': return prestairesCopro;
            case 'syndic': return prestairesSyndic;
            case 'coproflex': return prestairesCoproFlex;
        }
    }, [activeTab, prestairesCopro, prestairesSyndic, prestairesCoproFlex]);

    // Filter + sort
    const filteredProviders = useMemo(() => {
        return activeProviders
            .filter(p => {
                const matchesSearch = !searchTerm ||
                    p.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.ville?.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesDomaine = domaineFilter === 'TOUS' ||
                    (p.domaines ?? []).includes(domaineFilter as never);
                return matchesSearch && matchesDomaine;
            })
            .sort((a, b) => {
                if (sortBy === 'nom') return (a.nom ?? '').localeCompare(b.nom ?? '');
                if (sortBy === 'interventions') return (b.nombreInterventions ?? 0) - (a.nombreInterventions ?? 0);
                if (sortBy === 'note') return (b.noteMoyenne ?? 0) - (a.noteMoyenne ?? 0);
                return 0;
            });
    }, [activeProviders, searchTerm, domaineFilter, sortBy]);

    // Auto-select first
    const effectiveSelectedId = selectedId && filteredProviders.some(p => p.id === selectedId)
        ? selectedId
        : filteredProviders[0]?.id ?? null;
    const selected = filteredProviders.find(p => p.id === effectiveSelectedId);

    // All domains from current tab
    const availableDomains = useMemo(() => {
        const set = new Set<string>();
        activeProviders.forEach(p => (p.domaines ?? []).forEach(d => set.add(d)));
        return Array.from(set).sort();
    }, [activeProviders]);

    // KPIs
    const allProviders = useMemo(() =>
        [...prestairesCopro, ...prestairesSyndic, ...prestairesCoproFlex],
        [prestairesCopro, prestairesSyndic, prestairesCoproFlex]
    );
    const totalActifs = allProviders.filter(p => p.actif !== false).length;
    const totalInterventions = allProviders.reduce((s, p) => s + (p.nombreInterventions ?? 0), 0);
    const withNote = allProviders.filter(p => p.noteMoyenne);
    const noteMoy = withNote.length > 0
        ? (withNote.reduce((s, p) => s + (p.noteMoyenne ?? 0), 0) / withNote.length).toFixed(1)
        : '—';

    const tabs: Array<{ id: TabId; label: string; icon: React.ElementType; count: number }> = [
        { id: 'tous', label: 'Tous', icon: Users, count: allProviders.length },
        { id: 'copro', label: 'Copropriété', icon: Building2, count: prestairesCopro.length },
        { id: 'syndic', label: 'Syndic', icon: Users, count: prestairesSyndic.length },
        { id: 'coproflex', label: 'CoproFlex', icon: Globe, count: prestairesCoproFlex.length },
    ];

    return (
        <div className="container">
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

            {/* Page Header */}
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Prestataires</h1>
                <div className={styles.pageActions}>
                    <button className={styles.btnSecondary} onClick={handleExport}>
                        <Download size={15} /> Exporter
                    </button>
                    <button className={styles.btnPrimary} onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={15} /> Ajouter un prestataire
                    </button>
                </div>
            </div>

            {/* KPI Bar */}
            <div className={styles.kpiBar}>
                {[
                    { label: 'Total', value: allProviders.length, color: '#2563eb', icon: Users },
                    { label: 'Actifs', value: totalActifs, color: '#34D399', icon: Shield },
                    { label: 'Interventions', value: totalInterventions, color: '#FBBF24', icon: Wrench },
                    { label: 'Note moyenne', value: `${noteMoy}/5`, color: '#A78BFA', icon: Star },
                ].map(k => {
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

            {/* Tabs */}
            <div className={styles.tabsBar}>
                {tabs.map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            className={clsx(styles.tabBtn, activeTab === t.id && styles.tabBtnActive)}
                            onClick={() => { setActiveTab(t.id); setSelectedId(null); setDomaineFilter('TOUS'); }}
                        >
                            <Icon size={15} /> {t.label}
                            <span className={styles.tabCount}>{t.count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Search + Filters */}
            <div className={styles.searchSection}>
                <div className={styles.searchRow}>
                    <div className={styles.searchInputWrap}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Rechercher un prestataire..."
                            className={styles.searchField}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className={styles.filterChips}>
                    <select className={styles.chip} value={domaineFilter} onChange={e => setDomaineFilter(e.target.value)}>
                        <option value="TOUS">Tous domaines</option>
                        {availableDomains.map(d => (
                            <option key={d} value={d}>{DOMAIN_LABELS[d] || d}</option>
                        ))}
                    </select>
                    <select className={styles.chip} value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                        <option value="nom">Alphabétique</option>
                        <option value="interventions">Interventions</option>
                        <option value="note">Note</option>
                    </select>
                </div>
            </div>

            {/* Split View */}
            <div className={styles.splitView}>
                {/* Liste gauche */}
                <div className={styles.splitList}>
                    {filteredProviders.length === 0 ? (
                        <div className={styles.emptyList}>Aucun prestataire trouvé</div>
                    ) : (
                        filteredProviders.map(p => (
                            <button
                                key={p.id}
                                className={clsx(styles.splitItem, p.id === effectiveSelectedId && styles.splitItemActive)}
                                onClick={() => setSelectedId(p.id)}
                            >
                                <div className={styles.splitItemLeft}>
                                    <div className={styles.avatar}>{(p.nom ?? '?').charAt(0)}</div>
                                    <div className={styles.splitItemInfo}>
                                        <span className={styles.splitItemName}>{p.nom}</span>
                                        <span className={styles.splitItemDomaines}>
                                            {(p.domaines ?? []).map(d => DOMAIN_LABELS[d] || d).join(' · ')}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.splitItemRight}>
                                    <StarRating note={p.noteMoyenne ?? null} />
                                    <span
                                        className={styles.splitItemStatut}
                                        style={{ color: p.actif !== false ? '#34D399' : '#64748b' }}
                                    >●</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Détail droite */}
                {selected ? (
                    <div className={styles.splitDetail}>
                        <div className={styles.detailHeader}>
                            <div className={styles.avatarXl}>{(selected.nom ?? '?').charAt(0)}</div>
                            <div>
                                <h3 className={styles.detailName}>{selected.nom}</h3>
                                <span className={styles.detailVille}>
                                    <MapPin size={14} /> {selected.ville || '—'}
                                </span>
                            </div>
                            <span
                                className={styles.statutBadge}
                                style={{
                                    color: selected.actif !== false ? '#34D399' : '#64748b',
                                    background: selected.actif !== false ? '#34D39915' : '#64748b15',
                                }}
                            >
                                {selected.actif !== false ? 'Actif' : 'Inactif'}
                            </span>
                        </div>

                        <div className={styles.detailDomaines}>
                            {(selected.domaines ?? []).map(d => (
                                <span
                                    key={d}
                                    className={styles.domaineBadge}
                                    style={{
                                        color: DOMAINE_COLORS[d] || '#8892a4',
                                        background: (DOMAINE_COLORS[d] || '#8892a4') + '15',
                                    }}
                                >
                                    {DOMAIN_LABELS[d] || d}
                                </span>
                            ))}
                        </div>

                        <div className={styles.detailStatsRow}>
                            <div className={styles.detailStatCard}>
                                <span className={styles.detailStatValue}>{selected.nombreInterventions ?? 0}</span>
                                <span className={styles.detailStatLabel}>Interventions</span>
                            </div>
                            <div className={styles.detailStatCard}>
                                <span className={styles.detailStatValue}>
                                    {selected.noteMoyenne ? (
                                        <><Star size={14} fill="#FBBF24" color="#FBBF24" /> {selected.noteMoyenne.toFixed(1)}</>
                                    ) : '—'}
                                </span>
                                <span className={styles.detailStatLabel}>Note</span>
                            </div>
                            <div className={styles.detailStatCard}>
                                <span className={styles.detailStatValue}>
                                    {selected.derniereIntervention
                                        ? new Date(selected.derniereIntervention).toLocaleDateString('fr-FR')
                                        : '—'}
                                </span>
                                <span className={styles.detailStatLabel}>Dernière int.</span>
                            </div>
                        </div>

                        <div className={styles.detailContact}>
                            {selected.telephone && (
                                <a href={`tel:${selected.telephone}`} className={styles.detailContactRow}>
                                    <Phone size={14} /> {selected.telephone}
                                </a>
                            )}
                            {selected.email && (
                                <a href={`mailto:${selected.email}`} className={styles.detailContactRow}>
                                    <Mail size={14} /> {selected.email}
                                </a>
                            )}
                            {selected.contactNom && (
                                <div className={styles.detailContactRow}>
                                    <Users size={14} /> {selected.contactNom}
                                    {selected.contactRole && <span className={styles.contactRoleTag}>{selected.contactRole}</span>}
                                </div>
                            )}
                            {selected.contractsCount != null && selected.contractsCount > 0 && (
                                <div className={styles.detailContactRow}>
                                    <Briefcase size={14} /> {selected.contractsCount} contrat(s) actif(s)
                                </div>
                            )}
                        </div>

                        <div className={styles.detailActions}>
                            <button className={styles.btnPrimary} onClick={() => handleGoToPrestataire({ id: selected.id! })}>
                                <ExternalLink size={14} /> Fiche complète
                            </button>
                            <button className={styles.btnSecondary} onClick={() => {
                                if (selected.telephone) window.open(`tel:${selected.telephone}`);
                            }}>
                                <Phone size={14} /> Appeler
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.splitDetail}>
                        <div className={styles.emptyDetail}>
                            <Users size={40} />
                            <p>Sélectionnez un prestataire</p>
                        </div>
                    </div>
                )}
            </div>

            <AddProviderModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddPrestataire as Parameters<typeof AddProviderModal>[0]['onAdd']}
            />
        </div>
    );
}
