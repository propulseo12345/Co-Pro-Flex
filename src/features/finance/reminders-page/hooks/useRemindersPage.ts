'use client';

import { useState, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import {
    useUnpaidWithReminders,
    usePaymentReminders,
    useSendManualReminder,
    useRunPaymentReminders,
    type UnpaidWithReminder,
} from '@/hooks/modules/useFinanceData';
import type { ManualPreviewResult, BulkPreviewResult } from '@/components/features/finance/Reminders';

// ================================
// Types
// ================================

export type TabType = 'unpaid' | 'history';

export interface RemindersStats {
    totalUnpaid: number;
    lotsCount: number;
    lotsOver30Days: number;
    totalReminded: number;
    eligibleForReminder: number;
}

export interface HistoryFilters {
    statusFilter: string;
    delayFilter: string;
    dateFrom: string;
    dateTo: string;
}

export interface HistoryFiltersHandlers {
    setStatusFilter: (value: string) => void;
    setDelayFilter: (value: string) => void;
    setDateFrom: (value: string) => void;
    setDateTo: (value: string) => void;
}

export interface HeaderState {
    isManager: boolean;
    isRunning: boolean;
    unpaidCount: number;
    onOpenBulkModal: () => void;
}

export interface UnpaidTabState {
    unpaid: UnpaidWithReminder[];
    selectedImpayes: string[];
    isManager: boolean;
    isSending: boolean;
}

export interface UnpaidTabHandlers {
    toggleSelection: (id: string) => void;
    toggleAll: () => void;
    openManualReminderModal: (lot: UnpaidWithReminder) => void;
}

export interface HistoryTabState {
    filteredHistory: PaymentReminderRecord[];
    filters: HistoryFilters;
}

export interface HistoryTabHandlers extends HistoryFiltersHandlers {
    refreshHistory: () => void;
}

export interface ManualModalState {
    lot: UnpaidWithReminder | null;
    previewResult: ManualPreviewResult | null;
    isLoading: boolean;
}

export interface ManualModalHandlers {
    onClose: () => void;
    onConfirm: (dryRun: boolean) => Promise<void>;
}

export interface BulkModalState {
    isOpen: boolean;
    previewResult: BulkPreviewResult | null;
    isLoading: boolean;
    unpaidCount: number;
    eligibleCount: number;
    totalAmount: number;
}

export interface BulkModalHandlers {
    onClose: () => void;
    onConfirm: (dryRun: boolean) => Promise<void>;
}

export interface PaymentReminderRecord {
    id: string;
    lot_id: string;
    lot_ref: string;
    owner_name: string | null;
    recipient_email: string | null;
    unpaid_amount: number;
    delay_level: number;
    status: string;
    created_at: string;
    sent_at: string | null;
    cancelled_reason: string | null;
}

export interface UseRemindersPageReturn {
    // Loading/Error states
    isLoading: boolean;
    error: string | null;
    currentCoproId: string | null;
    refresh: () => void;

    // Tabs
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;

    // Stats
    stats: RemindersStats;

    // Header
    header: HeaderState;

    // Unpaid tab
    unpaidTab: UnpaidTabState;
    unpaidTabHandlers: UnpaidTabHandlers;

    // History tab
    historyTab: HistoryTabState;
    historyTabHandlers: HistoryTabHandlers;

    // Manual modal
    manualModal: ManualModalState;
    manualModalHandlers: ManualModalHandlers;

    // Bulk modal
    bulkModal: BulkModalState;
    bulkModalHandlers: BulkModalHandlers;
}

/**
 * Page-level hook for the Reminders page.
 * Extracts all state and logic from the page component.
 */
export function useRemindersPage(): UseRemindersPageReturn {
    const { currentCoproId, isManager } = useCopro();
    const { data: unpaidLots, isLoading, error, refresh } = useUnpaidWithReminders();
    const { data: remindersHistory, refresh: refreshHistory } = usePaymentReminders();
    const { isLoading: isSending, mutate: sendReminder } = useSendManualReminder();
    const { isLoading: isRunning, mutate: runAllReminders } = useRunPaymentReminders();

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('unpaid');
    const [selectedImpayes, setSelectedImpayes] = useState<string[]>([]);

    // Modal states
    const [manualReminderLot, setManualReminderLot] = useState<UnpaidWithReminder | null>(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [manualPreviewResult, setManualPreviewResult] = useState<ManualPreviewResult | null>(null);
    const [bulkPreviewResult, setBulkPreviewResult] = useState<BulkPreviewResult | null>(null);

    // History filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [delayFilter, setDelayFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    // Derived data
    const unpaid = unpaidLots || [];
    const history = (remindersHistory || []) as PaymentReminderRecord[];

    // Stats
    const stats = useMemo<RemindersStats>(() => ({
        totalUnpaid: unpaid.reduce((sum, item) => sum + Number(item.total_unpaid), 0),
        lotsCount: unpaid.length,
        lotsOver30Days: unpaid.filter(i => i.days_overdue > 30).length,
        totalReminded: unpaid.filter(i => i.total_reminders_sent > 0).length,
        eligibleForReminder: unpaid.filter(i => i.owner_email).length,
    }), [unpaid]);

    // Filtered history
    const filteredHistory = useMemo(() => {
        return history.filter(r => {
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (delayFilter !== 'all' && r.delay_level !== Number(delayFilter)) return false;
            if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
            if (dateTo && new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false;
            return true;
        });
    }, [history, statusFilter, delayFilter, dateFrom, dateTo]);

    // Selection handlers
    const toggleSelection = useCallback((id: string) => {
        setSelectedImpayes(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const toggleAll = useCallback(() => {
        setSelectedImpayes(selectedImpayes.length === unpaid.length ? [] : unpaid.map(i => i.lot_id));
    }, [selectedImpayes.length, unpaid]);

    // Manual reminder handler
    const handleConfirmManualReminder = useCallback(async (dryRun: boolean) => {
        if (!manualReminderLot) return;
        const result = await sendReminder({ lot_id: manualReminderLot.lot_id, dry_run: dryRun });
        if (result.data?.success) {
            if (dryRun) {
                setManualPreviewResult({
                    success: true,
                    would_send: result.data.would_send ?? true,
                    delay_level: result.data.delay_level ?? 7,
                });
            } else {
                setManualReminderLot(null);
                setManualPreviewResult(null);
                refresh();
                refreshHistory();
            }
        } else {
            alert(result.data?.error || result.error || "Erreur lors de l'envoi");
        }
    }, [manualReminderLot, sendReminder, refresh, refreshHistory]);

    // Bulk reminder handler
    const handleConfirmBulkReminder = useCallback(async (dryRun: boolean) => {
        const result = await runAllReminders({ dry_run: dryRun });
        if (result.data?.success) {
            const summary = result.data.summary || { processed: 0, sent: 0, skipped: 0, failed: 0 };
            setBulkPreviewResult({
                processed: summary.processed ?? 0,
                sent: summary.sent ?? 0,
                skipped: summary.skipped ?? 0,
                failed: summary.failed ?? 0,
            });
            if (!dryRun) {
                refresh();
                refreshHistory();
            }
        } else {
            alert(result.data?.error || result.error || "Erreur lors de l'execution");
        }
    }, [runAllReminders, refresh, refreshHistory]);

    // Open manual modal
    const openManualReminderModal = useCallback((lot: UnpaidWithReminder) => {
        setManualReminderLot(lot);
        setManualPreviewResult(null);
    }, []);

    // Close manual modal
    const closeManualModal = useCallback(() => {
        setManualReminderLot(null);
        setManualPreviewResult(null);
    }, []);

    // Close bulk modal
    const closeBulkModal = useCallback(() => {
        setShowBulkModal(false);
        setBulkPreviewResult(null);
    }, []);

    return {
        // Loading/Error states
        isLoading,
        error,
        currentCoproId,
        refresh,

        // Tabs
        activeTab,
        setActiveTab,

        // Stats
        stats,

        // Header
        header: {
            isManager,
            isRunning,
            unpaidCount: unpaid.length,
            onOpenBulkModal: () => setShowBulkModal(true),
        },

        // Unpaid tab
        unpaidTab: {
            unpaid,
            selectedImpayes,
            isManager,
            isSending,
        },
        unpaidTabHandlers: {
            toggleSelection,
            toggleAll,
            openManualReminderModal,
        },

        // History tab
        historyTab: {
            filteredHistory,
            filters: {
                statusFilter,
                delayFilter,
                dateFrom,
                dateTo,
            },
        },
        historyTabHandlers: {
            setStatusFilter,
            setDelayFilter,
            setDateFrom,
            setDateTo,
            refreshHistory,
        },

        // Manual modal
        manualModal: {
            lot: manualReminderLot,
            previewResult: manualPreviewResult,
            isLoading: isSending,
        },
        manualModalHandlers: {
            onClose: closeManualModal,
            onConfirm: handleConfirmManualReminder,
        },

        // Bulk modal
        bulkModal: {
            isOpen: showBulkModal,
            previewResult: bulkPreviewResult,
            isLoading: isRunning,
            unpaidCount: unpaid.length,
            eligibleCount: stats.eligibleForReminder,
            totalAmount: stats.totalUnpaid,
        },
        bulkModalHandlers: {
            onClose: closeBulkModal,
            onConfirm: handleConfirmBulkReminder,
        },
    };
}
