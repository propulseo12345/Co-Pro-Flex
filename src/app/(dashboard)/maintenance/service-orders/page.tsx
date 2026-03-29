'use client';

import EmailPreviewModal from './components/EmailPreviewModal';
import { useServiceOrdersListPage } from '@/features/maintenance/serviceOrders/hooks';
import { ServiceOrdersFinanceView } from '@/features/maintenance/serviceOrders/components/ServiceOrdersFinanceView';

export default function ServiceOrdersPage() {
    const {
        sortedOS,
        stats,
        searchTerm, setSearchTerm,
        statutFilter, setStatutFilter,
        emailPreviewOS,
        handleEmailSend,
        handleCloseEmailPreview,
        goToNew,
        goToDetail,
    } = useServiceOrdersListPage();

    return (
        <div className="container">
            <ServiceOrdersFinanceView
                sortedOS={sortedOS}
                stats={stats}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statutFilter={statutFilter}
                setStatutFilter={setStatutFilter}
                onGoToNew={goToNew}
                onGoToDetail={goToDetail}
            />

            {emailPreviewOS && (
                <EmailPreviewModal
                    ordreService={emailPreviewOS as unknown as Parameters<typeof EmailPreviewModal>[0]['ordreService']}
                    onSend={handleEmailSend}
                    onClose={handleCloseEmailPreview}
                />
            )}
        </div>
    );
}
