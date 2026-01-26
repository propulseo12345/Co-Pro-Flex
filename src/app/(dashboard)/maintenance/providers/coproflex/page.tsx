'use client';

import { Search, ArrowLeft, Star, Users, MapPin, CheckCircle, X, Send, Globe, Shield, Scale } from 'lucide-react';
import { MOCK_DOMAINES_ACTIVITE } from '@/data/mock';
import { DomaineActivite } from '@/types';
import { Toast } from '../../../../../features/maintenance/shared/components';
import { DevisModal, CompareModal, CoproFlexProviderCard } from '../../../../../features/maintenance/providers/components';
import { useCoproFlexPage } from '../../../../../features/maintenance/providers/hooks';
import styles from './coproflex.module.css';

export default function ProvidersCoproFlexPage() {
    const {
        toast,
        hideToast,
        searchTerm,
        setSearchTerm,
        codePostalFilter,
        setCodePostalFilter,
        domaineFilter,
        setDomaineFilter,
        sortBy,
        setSortBy,
        labelOnly,
        setLabelOnly,
        selectedIds,
        selectedPrestataires,
        filteredPrestataires,
        stats,
        showDevisModal,
        setShowDevisModal,
        showCompareModal,
        setShowCompareModal,
        toggleSelection,
        clearSelection,
        handleDevisSubmit,
        getAvisForPrestataire,
        goBack,
        goToDetail
    } = useCoproFlexPage();

    return (
        <div className={styles.container}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

            {showDevisModal && selectedPrestataires.length > 0 && (
                <DevisModal
                    prestataires={selectedPrestataires}
                    onClose={() => setShowDevisModal(false)}
                    onSubmit={handleDevisSubmit}
                />
            )}

            {showCompareModal && selectedPrestataires.length >= 2 && (
                <CompareModal
                    prestataires={selectedPrestataires}
                    onClose={() => setShowCompareModal(false)}
                />
            )}

            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backButton} onClick={goBack}>
                        <ArrowLeft size={20} aria-hidden="true" />
                    </button>
                    <div>
                        <h1 className={styles.title}>
                            <Globe size={28} className={styles.titleIcon} aria-hidden="true" />
                            Trouver un prestataire
                        </h1>
                        <p className={styles.subtitle}>Base nationale de prestataires certifiés pour copropriétés</p>
                    </div>
                </div>
            </div>

            <div className={styles.statsBar}>
                <div className={styles.stat}>
                    <Users size={18} aria-hidden="true" />
                    <span><strong>{stats.total}</strong> prestataires</span>
                </div>
                <div className={styles.stat}>
                    <Shield size={18} aria-hidden="true" />
                    <span><strong>{stats.certifies}</strong> certifiés CoproFlex</span>
                </div>
                <div className={styles.stat}>
                    <Star size={18} aria-hidden="true" />
                    <span>Note moyenne <strong>{stats.noteMoyenne.toFixed(1)}/5</strong></span>
                </div>
            </div>

            <div className={styles.filtersSection}>
                <div className={styles.searchRow}>
                    <div className={styles.searchBox}>
                        <Search size={18} aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Rechercher un prestataire, un service..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.filterInput}>
                        <MapPin size={18} aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Code postal"
                            value={codePostalFilter}
                            onChange={e => setCodePostalFilter(e.target.value)}
                            maxLength={5}
                        />
                    </div>
                </div>

                <div className={styles.filtersRow}>
                    <select
                        className={styles.filterSelect}
                        value={domaineFilter}
                        onChange={e => setDomaineFilter(e.target.value as DomaineActivite | 'TOUS')}
                    >
                        <option value="TOUS">Tous les domaines</option>
                        {MOCK_DOMAINES_ACTIVITE.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                    </select>

                    <select
                        className={styles.filterSelect}
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as 'note' | 'avis' | 'tarif' | 'delai')}
                    >
                        <option value="note">Mieux notés</option>
                        <option value="avis">Plus d'avis</option>
                    </select>

                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={labelOnly}
                            onChange={e => setLabelOnly(e.target.checked)}
                        />
                        <Shield size={14} aria-hidden="true" />
                        <span>Certifiés uniquement</span>
                    </label>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className={styles.selectionBar}>
                    <span className={styles.selectionCount}>
                        <CheckCircle size={16} aria-hidden="true" />
                        {selectedIds.length} prestataire{selectedIds.length > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
                    </span>
                    <div className={styles.selectionActions}>
                        {selectedIds.length >= 2 && (
                            <button className="btn btn-secondary" onClick={() => setShowCompareModal(true)}>
                                <Scale size={16} aria-hidden="true" /> Comparer
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={() => setShowDevisModal(true)}>
                            <Send size={16} aria-hidden="true" /> Demander des devis
                        </button>
                        <button className={styles.clearSelection} onClick={clearSelection}>
                            <X size={14} aria-hidden="true" /> Effacer
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.resultsInfo}>
                <span>{filteredPrestataires.length} résultat{filteredPrestataires.length > 1 ? 's' : ''}</span>
                {selectedIds.length > 0 && (
                    <span className={styles.selectionHint}>
                        Sélectionnez jusqu'à 5 prestataires pour comparer ou demander des devis
                    </span>
                )}
            </div>

            <div className={styles.providersGrid}>
                {filteredPrestataires.map(p => (
                    <CoproFlexProviderCard
                        key={p.id}
                        prestataire={p}
                        isSelected={selectedIds.includes(p.id)}
                        onSelect={toggleSelection}
                        onViewDetails={goToDetail}
                        avis={getAvisForPrestataire(p.id)}
                    />
                ))}
            </div>

            {filteredPrestataires.length === 0 && (
                <div className={styles.emptyState}>
                    <Search size={48} aria-hidden="true" />
                    <h3>Aucun prestataire trouvé</h3>
                    <p>Modifiez vos critères de recherche ou élargissez la zone géographique</p>
                </div>
            )}

            <div className={styles.marketplaceInfo}>
                <div className={styles.infoCard}>
                    <Shield size={24} aria-hidden="true" />
                    <h4>Prestataires certifiés</h4>
                    <p>Les prestataires portant le label CoproFlex ont été vérifiés : assurances, certifications et références contrôlées.</p>
                </div>
                <div className={styles.infoCard}>
                    <Star size={24} aria-hidden="true" />
                    <h4>Avis vérifiés</h4>
                    <p>Les avis proviennent de copropriétés ayant réellement fait appel à ces prestataires via CoproFlex.</p>
                </div>
                <div className={styles.infoCard}>
                    <Send size={24} aria-hidden="true" />
                    <h4>Devis gratuits</h4>
                    <p>Demandez des devis à plusieurs prestataires en une seule demande. Réponse sous 48h garantie.</p>
                </div>
            </div>
        </div>
    );
}
