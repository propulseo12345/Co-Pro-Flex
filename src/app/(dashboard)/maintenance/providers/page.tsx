'use client';

import { Plus, Download, Building2, Users, Globe, Star, Calendar, Briefcase, FileText } from 'lucide-react';
import { Toast } from '../../../../features/maintenance/shared/components';
import { AddProviderModal, CategoryBlock, SearchBar } from '../../../../features/maintenance/providers/components';
import { useProvidersHubPage } from '../../../../features/maintenance/providers/hooks';
import styles from './providers.module.css';

export default function ProvidersHubPage() {
    const {
        searchTerm,
        setSearchTerm,
        searchResults,
        isAddModalOpen,
        setIsAddModalOpen,
        toast,
        hideToast,
        statsCopro,
        statsSyndic,
        statsCoproFlex,
        handleExport,
        handleAddPrestataire,
        handleGoToPrestataire
    } = useProvidersHubPage();

    return (
        <div className="container">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Prestataires</h1>
                    <p className={styles.subtitle}>Centralisez et gérez tous vos prestataires depuis un seul endroit</p>
                </div>
                <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={16} aria-hidden="true" /> Exporter
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={16} aria-hidden="true" /> Ajouter un prestataire
                    </button>
                </div>
            </div>

            <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchResults={searchResults as Parameters<typeof SearchBar>[0]['searchResults']}
                onResultClick={handleGoToPrestataire}
                onClear={() => setSearchTerm('')}
            />

            <div className={styles.categoriesGrid}>
                <CategoryBlock
                    title="Prestataires de la copro"
                    description="Prestataires ayant déjà intervenu sur la copropriété"
                    icon={Building2}
                    count={statsCopro.count}
                    href="/maintenance/providers/copro"
                    accentColor="primary"
                    kpiItems={[
                        { label: 'Interventions', value: statsCopro.interventions, icon: Briefcase },
                        { label: 'Dernière intervention', value: statsCopro.derniereIntervention || '-', icon: Calendar }
                    ]}
                />

                <CategoryBlock
                    title="Prestataires du syndic"
                    description="Base interne de prestataires de confiance"
                    icon={Users}
                    count={statsSyndic.count}
                    href="/maintenance/providers/syndic"
                    accentColor="secondary"
                    kpiItems={[
                        { label: 'Domaines principaux', value: statsSyndic.domaines.join(', ') || '-', icon: Briefcase },
                        { label: 'Interventions', value: statsSyndic.interventions, icon: Briefcase }
                    ]}
                />

                <CategoryBlock
                    title="Prestataires CoproFlex"
                    description="Base nationale de prestataires référencés"
                    icon={Globe}
                    count={statsCoproFlex.count}
                    href="/maintenance/providers/coproflex"
                    accentColor="tertiary"
                    kpiItems={[
                        { label: 'Note moyenne', value: statsCoproFlex.noteMoyenne > 0 ? `${statsCoproFlex.noteMoyenne.toFixed(1)}/5` : '-', icon: Star },
                        { label: "Nombre d'avis", value: statsCoproFlex.nombreAvis, icon: FileText }
                    ]}
                />
            </div>

            <AddProviderModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddPrestataire as Parameters<typeof AddProviderModal>[0]['onAdd']}
            />
        </div>
    );
}
