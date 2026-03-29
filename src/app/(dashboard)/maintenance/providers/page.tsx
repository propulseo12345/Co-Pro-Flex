'use client';

import { AddProviderModal } from '@/features/maintenance/providers/components';
import { useProvidersHubPage } from '@/features/maintenance/providers/hooks';
import { ProvidersFinanceView } from '@/features/maintenance/providers/components/ProvidersFinanceView';

export default function ProvidersHubPage() {
    const {
        searchTerm, setSearchTerm,
        isAddModalOpen, setIsAddModalOpen,
        prestairesCopro, prestairesSyndic, prestairesCoproFlex,
        handleExport, handleAddPrestataire, handleGoToPrestataire,
    } = useProvidersHubPage();

    return (
        <div className="container">
            <ProvidersFinanceView
                prestairesCopro={prestairesCopro}
                prestairesSyndic={prestairesSyndic}
                prestairesCoproFlex={prestairesCoproFlex}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onExport={handleExport}
                onAddPrestataire={() => setIsAddModalOpen(true)}
                onGoToPrestataire={handleGoToPrestataire}
            />

            <AddProviderModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddPrestataire as Parameters<typeof AddProviderModal>[0]['onAdd']}
            />
        </div>
    );
}
