'use client';

import {
    ManualReminderModal,
    BulkReminderModal,
} from '@/components/features/finance/Reminders';
import type {
    ManualModalState,
    ManualModalHandlers,
    BulkModalState,
    BulkModalHandlers,
} from '../hooks/useRemindersPage';

export interface RemindersModalsProps {
    manualModal: ManualModalState;
    manualModalHandlers: ManualModalHandlers;
    bulkModal: BulkModalState;
    bulkModalHandlers: BulkModalHandlers;
}

export function RemindersModals({
    manualModal,
    manualModalHandlers,
    bulkModal,
    bulkModalHandlers,
}: RemindersModalsProps) {
    return (
        <>
            {manualModal.lot && (
                <ManualReminderModal
                    lot={manualModal.lot}
                    onClose={manualModalHandlers.onClose}
                    onConfirm={manualModalHandlers.onConfirm}
                    isLoading={manualModal.isLoading}
                    previewResult={manualModal.previewResult}
                />
            )}
            {bulkModal.isOpen && (
                <BulkReminderModal
                    unpaidCount={bulkModal.unpaidCount}
                    eligibleCount={bulkModal.eligibleCount}
                    totalAmount={bulkModal.totalAmount}
                    onClose={bulkModalHandlers.onClose}
                    onConfirm={bulkModalHandlers.onConfirm}
                    isLoading={bulkModal.isLoading}
                    previewResult={bulkModal.previewResult}
                />
            )}
        </>
    );
}
