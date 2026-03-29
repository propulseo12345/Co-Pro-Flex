'use client';

import {
    useLogbookPage,
    LogbookModals,
    LogbookToast,
} from '@/features/maintenance/logbook-page';
import { LogbookFinanceView } from '@/features/maintenance/logbook-page/components/LogbookFinanceView';

export default function LogbookPage() {
    const pageData = useLogbookPage();
    const { modals, modalsHandlers, toast } = pageData;

    return (
        <div className="container">
            <LogbookFinanceView data={pageData} />
            <LogbookModals modals={modals} handlers={modalsHandlers} />
            <LogbookToast toast={toast} />
        </div>
    );
}
