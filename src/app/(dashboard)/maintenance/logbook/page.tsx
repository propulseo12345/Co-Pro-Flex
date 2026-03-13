'use client';

import {
    LogbookPageHeader,
    LogbookKpiBar,
    LogbookInfoSection,
    InterventionsTab,
    TravauxTab,
} from '@/components/features/maintenance/Logbook';
import {
    useLogbookPage,
    LogbookBreadcrumb,
    LogbookTabs,
    LogbookModals,
    LogbookToast,
} from '@/features/maintenance/logbook-page';

export default function LogbookPage() {
    const {
        breadcrumb,
        header,
        infoSection,
        tabs,
        interventionsTab,
        modals,
        modalsHandlers,
        toast,
    } = useLogbookPage();

    return (
        <div className="container">
            <LogbookBreadcrumb config={breadcrumb} />

            {/* Titre + Actions */}
            <LogbookPageHeader
                showExportMenu={header.showExportMenu}
                onToggleExportMenu={header.handlers.onToggleExportMenu}
                onExport={header.handlers.onExport}
                onNewIntervention={header.handlers.onNewIntervention}
            />

            {/* Info copropriété collapsible */}
            <LogbookInfoSection
                formData={infoSection.formData}
                coproprieteInfo={infoSection.coproprieteInfo}
                isEditing={infoSection.isEditing}
                isSimplifiedView={infoSection.isSimplifiedView}
                equipementsPrincipaux={infoSection.equipementsPrincipaux}
                onFormDataChange={infoSection.handlers.onFormDataChange}
                onToggleEdit={infoSection.handlers.onToggleEdit}
                onToggleSimplifiedView={infoSection.handlers.onToggleSimplifiedView}
                onSaveInfo={infoSection.handlers.onSaveInfo}
                onSelectEquipement={infoSection.handlers.onSelectEquipement}
            />

            {/* KPI Bar — 6 tuiles */}
            <LogbookKpiBar
                kpis={header.kpis}
                filtreActif={header.filtreActif}
                onFiltreChange={header.handlers.onFiltreChange}
            />

            {/* Tabs underline */}
            <LogbookTabs
                activeTab={tabs.activeTab}
                onTabChange={tabs.setActiveTab}
                interventionsCount={tabs.filteredInterventions.length}
                travauxCount={tabs.travaux.length}
            />

            {/* Contenu onglet actif */}
            {tabs.activeTab === 'interventions' && (
                <InterventionsTab
                    interventions={interventionsTab.interventions}
                    allInterventions={interventionsTab.allInterventions}
                    interventionsCourantes={interventionsTab.interventionsCourantes}
                    travauxImportants={interventionsTab.travauxImportants}
                    statsCategorie={interventionsTab.statsCategorie}
                    interventionView={interventionsTab.interventionView}
                    searchTerm={interventionsTab.searchTerm}
                    statutFilter={interventionsTab.statutFilter}
                    prestataireFilter={interventionsTab.prestataireFilter}
                    equipementFilter={interventionsTab.equipementFilter}
                    anneeFilter={interventionsTab.anneeFilter}
                    years={interventionsTab.years}
                    equipements={interventionsTab.equipements}
                    allPrestataires={interventionsTab.allPrestataires}
                    onInterventionViewChange={interventionsTab.handlers.onInterventionViewChange}
                    onSearchChange={interventionsTab.handlers.onSearchChange}
                    onStatutFilterChange={interventionsTab.handlers.onStatutFilterChange}
                    onPrestataireFilterChange={interventionsTab.handlers.onPrestataireFilterChange}
                    onEquipementFilterChange={interventionsTab.handlers.onEquipementFilterChange}
                    onAnneeFilterChange={interventionsTab.handlers.onAnneeFilterChange}
                    onEditIntervention={interventionsTab.handlers.onEditIntervention}
                />
            )}

            {tabs.activeTab === 'travaux' && <TravauxTab travaux={tabs.travaux} />}

            <LogbookModals modals={modals} handlers={modalsHandlers} />

            <LogbookToast toast={toast} />
        </div>
    );
}
