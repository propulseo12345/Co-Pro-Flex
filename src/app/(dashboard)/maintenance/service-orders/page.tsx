'use client';

import { useState, useMemo } from 'react';
import {
    Plus, Search, FileText, Clock, CheckCircle2,
    Send, Archive, Activity, Calendar, Euro, Zap,
    Eye, Mail, Edit, Trash2, Copy, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import EmailPreviewModal from './components/EmailPreviewModal';
import { useServiceOrdersListPage } from '@/features/maintenance/serviceOrders/hooks';
import styles from './service-orders.module.css';

type StatusId = 'draft' | 'to_send' | 'sent' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'invoiced' | 'paid' | 'closed' | 'cancelled';

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    BROUILLON: { label: 'Brouillon', color: '#64748b', icon: Clock },
    A_ENVOYER: { label: 'À envoyer', color: '#A78BFA', icon: Send },
    ENVOYE: { label: 'Envoyé', color: '#A78BFA', icon: Send },
    EN_ATTENTE_PRESTATAIRE: { label: 'En attente', color: '#FBBF24', icon: Clock },
    REFUSE: { label: 'Refusé', color: '#EF4444', icon: FileText },
    INTERVENTION_PROGRAMMEE: { label: 'Programmé', color: '#2563eb', icon: Calendar },
    EN_COURS: { label: 'En cours', color: '#FBBF24', icon: Activity },
    INTERVENTION_REALISEE: { label: 'Réalisé', color: '#34D399', icon: CheckCircle2 },
    FACTURE: { label: 'Facturé', color: '#60A5FA', icon: Euro },
    PAYE: { label: 'Payé', color: '#34D399', icon: CheckCircle2 },
    CLOTURE: { label: 'Clôturé', color: '#8892a4', icon: Archive },
    ANNULE: { label: 'Annulé', color: '#EF4444', icon: FileText },
};

const WORKFLOW_STEPS = ['BROUILLON', 'ENVOYE', 'EN_ATTENTE_PRESTATAIRE', 'INTERVENTION_PROGRAMMEE', 'EN_COURS', 'INTERVENTION_REALISEE', 'CLOTURE'];

const KPI_CONFIG = [
    { statsKey: 'total', label: 'Total', color: '#2563eb', icon: FileText, filterId: 'TOUS' },
    { statsKey: 'brouillons', label: 'Brouillons', color: '#64748b', icon: Clock, filterId: 'draft' },
    { statsKey: 'enAttentePrestataire', label: 'En attente', color: '#FBBF24', icon: Send, filterId: 'pending' },
    { statsKey: 'interventionProgrammee', label: 'Programmés', color: '#60A5FA', icon: Activity, filterId: 'scheduled' },
    { statsKey: 'interventionRealisee', label: 'Réalisés', color: '#34D399', icon: CheckCircle2, filterId: 'completed' },
    { statsKey: 'clotures', label: 'Clôturés', color: '#A78BFA', icon: Archive, filterId: 'closed' },
];

export default function ServiceOrdersPage() {
    const {
        sortedOS,
        stats,
        fournisseurs,
        searchTerm, setSearchTerm,
        statutFilter, setStatutFilter,
        typeFilter, setTypeFilter,
        fournisseurFilter, setFournisseurFilter,
        emailPreviewOS,
        hasActiveFilters,
        handleClearFilters,
        handleDelete,
        handleViewPdf,
        handleEmailPreview,
        handleEmailSend,
        handleCloseEmailPreview,
        goToNew,
        goToDetail,
        goToEdit,
    } = useServiceOrdersListPage();

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const effectiveSelectedId = selectedId && sortedOS.some((o: Record<string, unknown>) => o.id === selectedId)
        ? selectedId
        : (sortedOS[0]?.id as string) ?? null;
    const selected = sortedOS.find((o: Record<string, unknown>) => o.id === effectiveSelectedId) as Record<string, unknown> | undefined;

    const selectedStatut = selected ? STATUT_CONFIG[(selected.statut as string)] || { label: selected.statut as string, color: '#8892a4', icon: FileText } : null;
    const currentWorkflowIdx = selected ? WORKFLOW_STEPS.indexOf(selected.statut as string) : -1;

    return (
        <div className="container">
            {/* Page Header */}
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Ordres de service</h1>
                <div className={styles.pageActions}>
                    <button className={styles.btnPrimary} onClick={goToNew}>
                        <Plus size={15} /> Créer un ordre de service
                    </button>
                </div>
            </div>

            {/* KPI Bar */}
            <div className={styles.kpiBar}>
                {KPI_CONFIG.map(kpi => {
                    const Icon = kpi.icon;
                    const value = (stats as Record<string, number>)[kpi.statsKey] ?? 0;
                    const isActive = statutFilter === kpi.filterId;
                    return (
                        <button
                            key={kpi.statsKey}
                            className={clsx(styles.kpiCard, isActive && styles.kpiCardActive)}
                            style={isActive ? { borderColor: kpi.color } : undefined}
                            onClick={() => setStatutFilter(isActive && kpi.filterId !== 'TOUS' ? 'TOUS' as never : kpi.filterId as never)}
                        >
                            <div className={styles.kpiIcon} style={{ background: kpi.color + '15', color: kpi.color }}>
                                <Icon size={16} />
                            </div>
                            <div className={styles.kpiContent}>
                                <span className={styles.kpiValue}>{value}</span>
                                <span className={styles.kpiLabel}>{kpi.label}</span>
                            </div>
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
                            placeholder="Rechercher un ordre de service..."
                            className={styles.searchField}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className={styles.filterChips}>
                    <select className={styles.chip} value={typeFilter} onChange={e => setTypeFilter(e.target.value as never)}>
                        <option value="TOUS">Tous types</option>
                        <option value="classique">Classique</option>
                        <option value="contractuel">Contractuel</option>
                    </select>
                    <select className={styles.chip} value={fournisseurFilter} onChange={e => setFournisseurFilter(e.target.value)}>
                        <option value="TOUS">Tous prestataires</option>
                        {fournisseurs.map(f => (
                            <option key={f.id} value={f.id}>{f.nom}</option>
                        ))}
                    </select>
                    {hasActiveFilters && (
                        <button className={clsx(styles.chip, styles.chipReset)} onClick={handleClearFilters}>
                            Réinitialiser
                        </button>
                    )}
                </div>
            </div>

            {/* Split View */}
            <div className={styles.splitView}>
                {/* Liste gauche */}
                <div className={styles.splitList}>
                    {sortedOS.length === 0 ? (
                        <div className={styles.emptyList}>Aucun ordre de service trouvé</div>
                    ) : (
                        (sortedOS as Array<Record<string, unknown>>).map(os => {
                            const oss = STATUT_CONFIG[(os.statut as string)] || { label: os.statut, color: '#8892a4', icon: FileText };
                            const OsIcon = oss.icon;
                            return (
                                <button
                                    key={os.id as string}
                                    className={clsx(styles.splitItem, os.id === effectiveSelectedId && styles.splitItemActive)}
                                    onClick={() => setSelectedId(os.id as string)}
                                >
                                    <div className={styles.splitItemLeft}>
                                        <div className={styles.splitItemIcon} style={{ background: oss.color + '15', color: oss.color }}>
                                            <OsIcon size={14} />
                                        </div>
                                        <div className={styles.splitItemInfo}>
                                            <span className={styles.splitItemName}>
                                                {(os.urgence as boolean) && <Zap size={11} className={styles.urgenceIcon} />}
                                                {os.titre as string}
                                            </span>
                                            <span className={styles.splitItemMeta}>
                                                {os.numero as string} · {os.fournisseurNom as string}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.splitItemRight}>
                                        {(os.montantEstime as number) > 0 && (
                                            <span className={styles.splitItemMontant}>
                                                {(os.montantEstime as number).toLocaleString('fr-FR')} €
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Détail droite */}
                {selected && selectedStatut ? (
                    <div className={styles.splitDetail}>
                        <div className={styles.detailTop}>
                            <div className={styles.detailHeader}>
                                <div>
                                    <span className={styles.detailNumero}>{selected.numero as string}</span>
                                    <h3 className={styles.detailName}>
                                        {(selected.urgence as boolean) && <Zap size={16} className={styles.urgenceIcon} />}
                                        {selected.titre as string}
                                    </h3>
                                </div>
                                <span className={styles.statutBadge} style={{ color: selectedStatut.color, background: selectedStatut.color + '15' }}>
                                    {selectedStatut.label}
                                </span>
                            </div>
                            {(selected.description as string) && (
                                <p className={styles.detailDesc}>{selected.description as string}</p>
                            )}
                        </div>

                        {/* Workflow mini */}
                        <div className={styles.workflowBar}>
                            {WORKFLOW_STEPS.map((step, i) => {
                                const ws = STATUT_CONFIG[step] || { label: step, color: '#8892a4' };
                                const isActive = i <= currentWorkflowIdx;
                                const isCurrent = i === currentWorkflowIdx;
                                return (
                                    <div key={step} className={styles.workflowStep}>
                                        <div
                                            className={clsx(styles.workflowDot, isActive && styles.workflowDotActive, isCurrent && styles.workflowDotCurrent)}
                                            style={isActive ? { background: ws.color, borderColor: ws.color } : undefined}
                                        />
                                        <span className={clsx(styles.workflowLabel, isCurrent && styles.workflowLabelCurrent)}>
                                            {ws.label}
                                        </span>
                                        {i < WORKFLOW_STEPS.length - 1 && (
                                            <div
                                                className={clsx(styles.workflowLine, isActive && styles.workflowLineActive)}
                                                style={isActive ? { background: ws.color } : undefined}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.detailStatsRow}>
                            <div className={styles.detailStatCard}>
                                <span className={styles.detailStatValue}>{selected.fournisseurNom as string || '—'}</span>
                                <span className={styles.detailStatLabel}>Prestataire</span>
                            </div>
                            <div className={styles.detailStatCard}>
                                <span className={styles.detailStatValue}>
                                    {(selected.montantEstime as number) ? `${(selected.montantEstime as number).toLocaleString('fr-FR')} €` : '—'}
                                </span>
                                <span className={styles.detailStatLabel}>Montant estimé</span>
                            </div>
                            <div className={styles.detailStatCard}>
                                <span className={styles.detailStatValue}>
                                    {(selected.dateIntervention as string)
                                        ? new Date(selected.dateIntervention as string).toLocaleDateString('fr-FR')
                                        : '—'}
                                </span>
                                <span className={styles.detailStatLabel}>Date intervention</span>
                            </div>
                        </div>

                        <div className={styles.detailInfoGrid}>
                            <div className={styles.detailInfoItem}>
                                <span className={styles.detailInfoLabel}>Type</span>
                                <span className={clsx(styles.typeBadge, (selected.typeOrdre as string) === 'CONTRACTUEL' ? styles.typeContractuel : styles.typeClassique)}>
                                    {(selected.typeOrdre as string) === 'CONTRACTUEL' ? 'Contractuel' : 'Classique'}
                                </span>
                            </div>
                            <div className={styles.detailInfoItem}>
                                <span className={styles.detailInfoLabel}>Date création</span>
                                <span className={styles.detailInfoValue}>
                                    {(selected.date as string) ? new Date(selected.date as string).toLocaleDateString('fr-FR') : '—'}
                                </span>
                            </div>
                            <div className={styles.detailInfoItem}>
                                <span className={styles.detailInfoLabel}>Urgence</span>
                                <span className={styles.detailInfoValue}>
                                    {(selected.urgence as boolean) ? <><Zap size={12} className={styles.urgenceIcon} /> Oui</> : 'Non'}
                                </span>
                            </div>
                        </div>

                        {/* Actions contextuelles selon le statut */}
                        <div className={styles.detailActions}>
                            {(() => {
                                const statut = selected.statut as string;
                                const id = selected.id as string;

                                // Brouillon / À envoyer → action principale = Envoyer
                                if (statut === 'BROUILLON' || statut === 'A_ENVOYER') {
                                    return (
                                        <>
                                            <button className={styles.btnPrimary} onClick={() => handleEmailPreview(id)}>
                                                <Send size={14} /> Envoyer
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => goToEdit(id)}>
                                                <Edit size={14} /> Modifier
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => handleViewPdf(id)}>
                                                <FileText size={14} /> PDF
                                            </button>
                                            <button className={styles.btnDanger} onClick={() => handleDelete(id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    );
                                }

                                // Envoyé / En attente → Relancer ou voir détails
                                if (statut === 'ENVOYE' || statut === 'EN_ATTENTE_PRESTATAIRE') {
                                    return (
                                        <>
                                            <button className={styles.btnPrimary} onClick={() => goToDetail(id)}>
                                                <Eye size={14} /> Voir détails
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => handleEmailPreview(id)}>
                                                <RefreshCw size={14} /> Relancer
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => handleViewPdf(id)}>
                                                <FileText size={14} /> PDF
                                            </button>
                                        </>
                                    );
                                }

                                // Programmé → Voir détails
                                if (statut === 'INTERVENTION_PROGRAMMEE') {
                                    return (
                                        <>
                                            <button className={styles.btnPrimary} onClick={() => goToDetail(id)}>
                                                <Eye size={14} /> Voir détails
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => goToEdit(id)}>
                                                <Calendar size={14} /> Modifier date
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => handleViewPdf(id)}>
                                                <FileText size={14} /> PDF
                                            </button>
                                        </>
                                    );
                                }

                                // En cours → Marquer réalisé
                                if (statut === 'EN_COURS') {
                                    return (
                                        <>
                                            <button className={styles.btnPrimary} onClick={() => goToDetail(id)}>
                                                <CheckCircle2 size={14} /> Marquer réalisé
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => goToDetail(id)}>
                                                <Eye size={14} /> Voir détails
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => handleViewPdf(id)}>
                                                <FileText size={14} /> PDF
                                            </button>
                                        </>
                                    );
                                }

                                // Réalisé → Clôturer
                                if (statut === 'INTERVENTION_REALISEE' || statut === 'FACTURE' || statut === 'PAYE') {
                                    return (
                                        <>
                                            <button className={styles.btnPrimary} onClick={() => goToDetail(id)}>
                                                <Archive size={14} /> Clôturer
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => goToDetail(id)}>
                                                <Eye size={14} /> Voir détails
                                            </button>
                                            <button className={styles.btnSecondary} onClick={() => handleViewPdf(id)}>
                                                <FileText size={14} /> PDF
                                            </button>
                                        </>
                                    );
                                }

                                // Clôturé / Annulé → Voir + Dupliquer
                                return (
                                    <>
                                        <button className={styles.btnPrimary} onClick={() => goToDetail(id)}>
                                            <Eye size={14} /> Voir détails
                                        </button>
                                        <button className={styles.btnSecondary} onClick={() => handleViewPdf(id)}>
                                            <FileText size={14} /> PDF
                                        </button>
                                        <button className={styles.btnSecondary} onClick={goToNew}>
                                            <Copy size={14} /> Dupliquer
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                    <div className={styles.splitDetail}>
                        <div className={styles.emptyDetail}>
                            <FileText size={40} />
                            <p>Sélectionnez un ordre de service</p>
                        </div>
                    </div>
                )}
            </div>

            {emailPreviewOS && (
                <EmailPreviewModal
                    ordreService={emailPreviewOS as unknown as Parameters<typeof EmailPreviewModal>[0]['ordreService']}
                    onClose={handleCloseEmailPreview}
                    onSend={handleEmailSend}
                />
            )}
        </div>
    );
}
