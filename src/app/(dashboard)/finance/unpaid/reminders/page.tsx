'use client';

import { LoadingState, ErrorState } from '@/components/ui/DataState';
import {
    useRemindersPage,
    RemindersHeader,
    RemindersStatsGrid,
    RemindersTabs,
    UnpaidTab,
    HistoryTab,
    RemindersTemplates,
    RemindersModals,
} from '@/features/finance/reminders-page';

export default function RemindersPage() {
    const {
        isLoading,
        error,
        currentCoproId,
        refresh,
        activeTab,
        setActiveTab,
        stats,
        header,
        unpaidTab,
        unpaidTabHandlers,
        historyTab,
        historyTabHandlers,
        manualModal,
        manualModalHandlers,
        bulkModal,
        bulkModalHandlers,
    } = useRemindersPage();

    if (!currentCoproId || isLoading) {
        return <LoadingState message="Chargement des impayes..." />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={refresh} />;
    }

    return (
        <div className="container">
            <RemindersHeader header={header} />

            <RemindersStatsGrid stats={stats} />

            <RemindersTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                unpaidCount={unpaidTab.unpaid.length}
                historyCount={historyTab.filteredHistory.length}
            />

            {activeTab === 'unpaid' && (
                <UnpaidTab state={unpaidTab} handlers={unpaidTabHandlers} />
            )}

            {activeTab === 'history' && (
                <HistoryTab state={historyTab} handlers={historyTabHandlers} />
            )}

            <RemindersTemplates isManager={header.isManager} />

            <RemindersModals
                manualModal={manualModal}
                manualModalHandlers={manualModalHandlers}
                bulkModal={bulkModal}
                bulkModalHandlers={bulkModalHandlers}
            />
        </div>
    );
}
