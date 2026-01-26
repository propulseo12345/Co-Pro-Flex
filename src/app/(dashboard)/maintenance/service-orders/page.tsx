'use client';

import { Plus } from 'lucide-react';
import FilterBar from './components/FilterBar';
import EmailPreviewModal from './components/EmailPreviewModal';
import { StatsBar, ServiceOrderTable } from '../../../../features/maintenance/serviceOrders/components';
import { useServiceOrdersListPage } from '../../../../features/maintenance/serviceOrders/hooks';
import styles from './service-orders.module.css';

export default function ServiceOrdersPage() {
    const {
        sortedOS,
        stats,
        fournisseurs,
        searchTerm,
        setSearchTerm,
        statutFilter,
        setStatutFilter,
        typeFilter,
        setTypeFilter,
        fournisseurFilter,
        setFournisseurFilter,
        emailPreviewOS,
        hasActiveFilters,
        handleClearFilters,
        handleDelete,
        handleViewPdf,
        handleEmailPreview,
        handleEmailSend,
        handleCloseEmailPreview,
        goToNew,
        goToDetail,
        goToEdit
    } = useServiceOrdersListPage();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Ordres de service</h1>
                    <p className={styles.subtitle}>
                        Générez et suivez les ordres de service envoyés aux prestataires.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <button className="btn btn-primary" onClick={goToNew}>
                        <Plus size={16} aria-hidden="true" />
                        Créer un ordre de service
                    </button>
                </div>
            </div>

            <FilterBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statutFilter={statutFilter as Parameters<typeof FilterBar>[0]['statutFilter']}
                onStatutFilterChange={setStatutFilter as Parameters<typeof FilterBar>[0]['onStatutFilterChange']}
                typeFilter={typeFilter as Parameters<typeof FilterBar>[0]['typeFilter']}
                onTypeFilterChange={setTypeFilter as Parameters<typeof FilterBar>[0]['onTypeFilterChange']}
                fournisseurFilter={fournisseurFilter}
                onFournisseurFilterChange={setFournisseurFilter}
                fournisseurs={fournisseurs}
                onClearFilters={handleClearFilters}
            />

            <StatsBar
                stats={stats}
                statutFilter={statutFilter as Parameters<typeof StatsBar>[0]['statutFilter']}
                onStatutFilterChange={setStatutFilter as Parameters<typeof StatsBar>[0]['onStatutFilterChange']}
            />

            <div className={styles.tableContainer}>
                <ServiceOrderTable
                    ordresService={sortedOS as unknown as Parameters<typeof ServiceOrderTable>[0]['ordresService']}
                    facturesParOS={{}}
                    onViewDetail={goToDetail as unknown as Parameters<typeof ServiceOrderTable>[0]['onViewDetail']}
                    onEdit={goToEdit as unknown as Parameters<typeof ServiceOrderTable>[0]['onEdit']}
                    onEmailPreview={handleEmailPreview as unknown as Parameters<typeof ServiceOrderTable>[0]['onEmailPreview']}
                    onViewPdf={handleViewPdf as unknown as Parameters<typeof ServiceOrderTable>[0]['onViewPdf']}
                    onDelete={handleDelete as unknown as Parameters<typeof ServiceOrderTable>[0]['onDelete']}
                    onClearFilters={handleClearFilters}
                    hasActiveFilters={!!hasActiveFilters}
                />
            </div>

            {emailPreviewOS && (
                <EmailPreviewModal
                    ordreService={emailPreviewOS as unknown as Parameters<typeof EmailPreviewModal>[0]['ordreService']}
                    onClose={handleCloseEmailPreview}
                    onSend={handleEmailSend}
                />
            )}
        </div>
    );
}
