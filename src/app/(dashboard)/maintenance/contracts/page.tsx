'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useContracts } from '@/hooks/modules/useContracts';
import { ContratDetaille } from '@/types';
import {
    ExportDropdown,
    Toast,
    ContractsStats,
    ContractsAlertSection,
    ContractsTable,
    ContractsFiltersBar,
    EditSyndicModal,
    AddContractModal,
    EditContractModal,
    ContratDecisionModal,
    PlannedOrdersSection,
    getJoursDepuisExpiration,
} from '@/components/features/maintenance/Contracts';
import ResiliationModal from '@/components/features/maintenance/ResiliationModal/ResiliationModal';
import {
    renouvelerContrat,
    resilierContrat
} from '@/lib/services/contracts.service';
import styles from './contracts.module.css';

export default function ContractsPage() {
    const router = useRouter();
    // État pour le modal de décision contrat expiré
    const [contratExpireDecision, setContratExpireDecision] = useState<{
        contrat: ContratDetaille;
        joursDepasses: number;
    } | null>(null);

    const {
        // Données
        contrats,
        filteredContrats,
        contratSyndic,
        prestataires,
        uniquePrestataires,
        toast,

        // Filtres
        searchTerm,
        setSearchTerm,
        statutFilter,
        setStatutFilter,
        categorieFilter,
        setCategorieFilter,
        typeFilter,
        setTypeFilter,
        prestataireFilter,
        setPrestataireFilter,

        // Modals
        isAddModalOpen,
        setIsAddModalOpen,
        isEditSyndicModalOpen,
        setIsEditSyndicModalOpen,
        contratToResiliate,
        setContratToResiliate,
        contratToEdit,
        setContratToEdit,

        // Actions
        setToast,
        handleAddContrat,
        handleSaveContrat,
        handleTelecharger,
        handleSaveSyndic,
        handleSyndicAction,
        handleExport,
    } = useContracts();

    // Navigation vers page détail
    const handleVoirDetails = (contrat: { id: string }) => {
        router.push(`/maintenance/contracts/${contrat.id}`);
    };

    // Ouvrir le modal de décision pour un contrat expiré
    const handleOpenDecisionModal = (contrat: ContratDetaille) => {
        const joursDepasses = getJoursDepuisExpiration(contrat.dateFin);
        if (joursDepasses > 0) {
            setContratExpireDecision({ contrat, joursDepasses });
        }
    };

    // Renouvellement d'un contrat expiré
    const handleRenouvelerContrat = (contrat: ContratDetaille, nouvelleDateFin: string) => {
        const result = renouvelerContrat(contrat.id, nouvelleDateFin);
        if (result) {
            setToast({
                type: 'success',
                message: `Contrat "${contrat.nom}" renouvelé jusqu'au ${new Date(nouvelleDateFin).toLocaleDateString('fr-FR')}`
            });
        }
        setContratExpireDecision(null);
    };

    // Résiliation d'un contrat expiré via le modal de décision
    const handleResilierContratExpire = (contrat: ContratDetaille, raison: string, archiver: boolean) => {
        const result = resilierContrat(contrat.id, raison, archiver);
        if (result) {
            setToast({
                type: 'success',
                message: `Contrat "${contrat.nom}" résilié${archiver ? ' et archivé' : ''}`
            });
        }
        setContratExpireDecision(null);
    };

    // Résiliation via le modal existant complet
    const handleResiliationConfirm = () => {
        if (contratToResiliate) {
            // Le ResiliationModal existant gère la confirmation, on le ferme simplement
            setContratToResiliate(null);
        }
    };

    return (
        <div className="container">
            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* En-tête */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Contrats de la copropriété</h1>
                    <p className={styles.subtitle}>
                        Gérez vos contrats d&apos;assurance, de maintenance et autres prestations
                    </p>
                </div>
                <div className={styles.actions}>
                    <ExportDropdown onExport={handleExport} />
                    <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={16} aria-hidden="true" /> Ajouter un contrat
                    </button>
                </div>
            </div>

            {/* Bloc KPI / Synthèse */}
            <ContractsStats
                contrats={contrats}
                contratSyndic={contratSyndic}
                onSyndicAction={handleSyndicAction}
                onEditSyndic={() => setIsEditSyndicModalOpen(true)}
            />

            {/* Alerte contrats à surveiller */}
            <ContractsAlertSection
                contrats={contrats}
                onAction={handleOpenDecisionModal}
            />

            {/* Section Ordres de service planifiés */}
            <PlannedOrdersSection
                contrats={contrats}
                onGenerateOrder={(osData) => {
                    // Sauvegarder l'ordre de service généré dans localStorage
                    const existingOS = JSON.parse(localStorage.getItem('custom_ordres_service') || '[]');
                    const newOS = {
                        ...osData,
                        id: `os-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    };
                    localStorage.setItem('custom_ordres_service', JSON.stringify([...existingOS, newOS]));
                    setToast({
                        type: 'success',
                        message: `Ordre de service généré : ${newOS.titre}`
                    });
                }}
            />

            {/* Section Liste des contrats */}
            <section className={styles.contractsSection}>
                <h2 className={styles.sectionTitle}>Autres contrats</h2>

                {/* Filtres */}
                <ContractsFiltersBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    statutFilter={statutFilter}
                    onStatutChange={setStatutFilter}
                    categorieFilter={categorieFilter}
                    onCategorieChange={setCategorieFilter}
                    typeFilter={typeFilter}
                    onTypeChange={setTypeFilter}
                    prestataireFilter={prestataireFilter}
                    onPrestataireChange={setPrestataireFilter}
                    uniquePrestataires={uniquePrestataires}
                />

                {/* Tableau des contrats */}
                <ContractsTable
                    contrats={filteredContrats}
                    onVoirDetails={handleVoirDetails}
                    onModifier={setContratToEdit}
                    onResilier={setContratToResiliate}
                    onTelecharger={handleTelecharger}
                />
            </section>

            {/* Modal Ajout Contrat */}
            <AddContractModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                prestataires={prestataires}
                onAdd={handleAddContrat}
            />

            {/* Modal Modification Contrat */}
            <EditContractModal
                contrat={contratToEdit}
                onClose={() => setContratToEdit(null)}
                prestataires={prestataires}
                onSave={handleSaveContrat}
            />

            {/* Modal Modification Syndic */}
            {isEditSyndicModalOpen && contratSyndic && (
                <EditSyndicModal
                    contrat={contratSyndic}
                    onSave={handleSaveSyndic}
                    onClose={() => setIsEditSyndicModalOpen(false)}
                />
            )}

            {/* Modal Résiliation (utilise le composant existant plus complet) */}
            {contratToResiliate && (
                <ResiliationModal
                    contrat={contratToResiliate}
                    onClose={() => setContratToResiliate(null)}
                    onConfirm={handleResiliationConfirm}
                />
            )}

            {/* Modal Décision Contrat Expiré (Renouveler ou Résilier) */}
            {contratExpireDecision && (
                <ContratDecisionModal
                    contrat={contratExpireDecision.contrat}
                    joursDepasses={contratExpireDecision.joursDepasses}
                    onClose={() => setContratExpireDecision(null)}
                    onRenouveler={handleRenouvelerContrat}
                    onResilier={handleResilierContratExpire}
                />
            )}
        </div>
    );
}
