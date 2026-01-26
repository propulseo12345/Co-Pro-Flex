'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { Home, ChevronRight, Wrench, TrendingUp, Shield } from 'lucide-react';
import {
    LogbookHeader,
    LogbookInfoSection,
    LogbookAssurances,
    LogbookContrats,
    InterventionsTab,
    TravauxTab,
    DocumentsTab,
    EquipementModal,
    DocumentModal,
    InterventionFormModal,
    AssuranceModal,
    ToastCreation,
    Intervention
} from '@/components/features/maintenance/Logbook';
import { useLogbook } from '@/hooks/modules/useLogbook';
import styles from './logbook.module.css';

export default function LogbookPage() {
    const {
        // Données statiques
        coproprieteInfo,
        contrats,
        travaux,
        documents,
        assurances,
        allPrestataires,

        // États
        activeTab,
        interventionView,
        filtreKpiActif,
        searchTerm,
        statutFilter,
        prestataireFilter,
        equipementFilter,
        anneeFilter,
        searchDocuments,
        categorieDocFilter,
        expandedCategories,
        showExportMenu,
        isEditing,
        isSimplifiedView,
        selectedEquipement,
        showNewInterventionModal,
        editingIntervention,
        selectedAssurance,
        selectedDocument,
        newInterventionForm,
        formData,
        toastCreation,

        // Données calculées
        filteredInterventions,
        interventionsCourantes,
        travauxImportants,
        years,
        equipements,
        statsCategorie,
        filteredDocuments,
        documentsByCategory,
        documentStats,
        kpis,

        // Setters
        setActiveTab,
        setInterventionView,
        setSearchTerm,
        setStatutFilter,
        setPrestataireFilter,
        setEquipementFilter,
        setAnneeFilter,
        setSearchDocuments,
        setCategorieDocFilter,
        setShowExportMenu,
        setIsEditing,
        setIsSimplifiedView,
        setSelectedEquipement,
        setShowNewInterventionModal,
        setEditingIntervention,
        setSelectedAssurance,
        setSelectedDocument,
        setNewInterventionForm,
        setFormData,

        // Helpers
        getContratsForEquipement,
        getInterventionsForEquipement,
        getDocumentsForEquipement,

        // Handlers
        handleSaveInfo,
        handleCreateIntervention,
        handleEditIntervention,
        handleSaveIntervention,
        handleFiltreKpiChange,
        handleExport,
        toggleCategory,
        handleFilterByEquipement,
        fermerToastCreation,
        voirInterventionCreee,
    } = useLogbook();

    return (
        <div className="container">
            {/* Breadcrumb */}
            <div className={styles.breadcrumb}>
                <Link href="/maintenance" className={styles.breadcrumbLink}>
                    <Home size={14} aria-hidden="true" /> Maintenance
                </Link>
                <ChevronRight size={14} aria-hidden="true" />
                <span>Carnet d&apos;entretien</span>
            </div>

            {/* Header avec KPIs interactifs */}
            <LogbookHeader
                formData={formData}
                kpis={kpis}
                showExportMenu={showExportMenu}
                filtreActif={filtreKpiActif}
                onToggleExportMenu={() => setShowExportMenu(!showExportMenu)}
                onExport={handleExport}
                onNewIntervention={() => setShowNewInterventionModal(true)}
                onFiltreChange={handleFiltreKpiChange}
            />

            {/* Section Informations générales */}
            <LogbookInfoSection
                formData={formData}
                coproprieteInfo={coproprieteInfo}
                isEditing={isEditing}
                isSimplifiedView={isSimplifiedView}
                equipementsPrincipaux={coproprieteInfo.equipementsPrincipaux}
                onFormDataChange={setFormData}
                onToggleEdit={() => setIsEditing(!isEditing)}
                onToggleSimplifiedView={() => setIsSimplifiedView(!isSimplifiedView)}
                onSaveInfo={handleSaveInfo}
                onSelectEquipement={setSelectedEquipement}
            />

            {/* Section Assurances */}
            <LogbookAssurances
                assurances={assurances}
                onSelectAssurance={setSelectedAssurance}
            />

            {/* Section Contrats */}
            <LogbookContrats contrats={contrats} />

            {/* Onglets */}
            <div className={styles.tabs}>
                <button
                    className={clsx(styles.tab, activeTab === 'interventions' && styles.activeTab)}
                    onClick={() => setActiveTab('interventions')}
                >
                    <Wrench size={18} aria-hidden="true" /> Interventions ({filteredInterventions.length})
                </button>
                <button
                    className={clsx(styles.tab, activeTab === 'travaux' && styles.activeTab)}
                    onClick={() => setActiveTab('travaux')}
                >
                    <TrendingUp size={18} aria-hidden="true" /> Travaux prévisionnels ({travaux.length})
                </button>
                <button
                    className={clsx(styles.tab, activeTab === 'documents' && styles.activeTab)}
                    onClick={() => setActiveTab('documents')}
                >
                    <Shield size={18} aria-hidden="true" /> Documents techniques ({documents.length})
                </button>
            </div>

            {/* Contenu des onglets */}
            {activeTab === 'interventions' && (
                <InterventionsTab
                    interventions={filteredInterventions}
                    allInterventions={filteredInterventions}
                    interventionsCourantes={interventionsCourantes}
                    travauxImportants={travauxImportants}
                    statsCategorie={statsCategorie}
                    interventionView={interventionView}
                    searchTerm={searchTerm}
                    statutFilter={statutFilter}
                    prestataireFilter={prestataireFilter}
                    equipementFilter={equipementFilter}
                    anneeFilter={anneeFilter}
                    years={years}
                    equipements={equipements}
                    allPrestataires={allPrestataires}
                    onInterventionViewChange={setInterventionView}
                    onSearchChange={setSearchTerm}
                    onStatutFilterChange={setStatutFilter}
                    onPrestataireFilterChange={setPrestataireFilter}
                    onEquipementFilterChange={setEquipementFilter}
                    onAnneeFilterChange={setAnneeFilter}
                    onEditIntervention={handleEditIntervention}
                />
            )}

            {activeTab === 'travaux' && (
                <TravauxTab travaux={travaux} />
            )}

            {activeTab === 'documents' && (
                <DocumentsTab
                    documents={documents}
                    filteredDocuments={filteredDocuments}
                    documentsByCategory={documentsByCategory}
                    documentStats={documentStats}
                    searchDocuments={searchDocuments}
                    categorieDocFilter={categorieDocFilter}
                    expandedCategories={expandedCategories}
                    onSearchChange={setSearchDocuments}
                    onCategorieFilterChange={setCategorieDocFilter}
                    onToggleCategory={toggleCategory}
                    onSelectDocument={setSelectedDocument}
                />
            )}

            {/* Modals */}
            {selectedEquipement && (
                <EquipementModal
                    equipement={selectedEquipement}
                    contrats={getContratsForEquipement(selectedEquipement)}
                    interventions={getInterventionsForEquipement(selectedEquipement) as Intervention[]}
                    documents={getDocumentsForEquipement(selectedEquipement)}
                    onClose={() => setSelectedEquipement(null)}
                    onFilterByEquipement={handleFilterByEquipement}
                />
            )}

            {selectedDocument && (
                <DocumentModal
                    document={selectedDocument}
                    onClose={() => setSelectedDocument(null)}
                />
            )}

            <InterventionFormModal
                isOpen={showNewInterventionModal}
                isEditing={false}
                formData={newInterventionForm}
                equipementsPrincipaux={coproprieteInfo.equipementsPrincipaux}
                onFormDataChange={setNewInterventionForm}
                onSubmit={handleCreateIntervention}
                onClose={() => setShowNewInterventionModal(false)}
            />

            <InterventionFormModal
                isOpen={!!editingIntervention}
                isEditing={true}
                formData={newInterventionForm}
                equipementsPrincipaux={coproprieteInfo.equipementsPrincipaux}
                onFormDataChange={setNewInterventionForm}
                onSubmit={handleSaveIntervention}
                onClose={() => setEditingIntervention(null)}
            />

            {selectedAssurance && (
                <AssuranceModal
                    assurance={selectedAssurance}
                    onClose={() => setSelectedAssurance(null)}
                />
            )}

            {/* Toast de confirmation après création d'intervention */}
            {toastCreation && (
                <ToastCreation
                    visible={toastCreation.visible}
                    type={toastCreation.type}
                    titre={toastCreation.titre}
                    message={toastCreation.message}
                    intervention={toastCreation.intervention}
                    estVisibleAvecFiltre={toastCreation.estVisibleAvecFiltre}
                    labelFiltre={toastCreation.labelFiltre}
                    onClose={fermerToastCreation}
                    onAfficherTout={voirInterventionCreee}
                />
            )}
        </div>
    );
}
