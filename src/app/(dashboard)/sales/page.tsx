'use client';

import { Plus, Search } from 'lucide-react';
import { useSalesPage } from '@/hooks/modules/useSalesPage';
import { SalesList, SaleDetail, EmptySaleDetail, CreateSaleModal, HistoryModal } from '@/components/features/sales';
import styles from './sales.module.css';

export default function SalesPage() {
  const {
    filteredSales,
    selectedSale,
    setSelectedSale,
    showCreateModal,
    setShowCreateModal,
    showHistoryModal,
    setShowHistoryModal,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    newSale,
    setNewSale,
    handleCreateSale,
    generateDocument,
    signDocument,
    sendToNotaire,
    updateNotificationDate,
    getMissingDocuments,
  } = useSalesPage();

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestion des ventes</h1>
          <p className={styles.subtitle}>
            Workflow complet pour la gestion des ventes de lots avec génération automatique des documents
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
          Nouvelle vente
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par lot, vendeur, acquéreur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterButtons}>
          <button className={`${styles.filterBtn} ${filterStatus === 'all' ? styles.filterBtnActive : ''}`} onClick={() => setFilterStatus('all')}>Toutes</button>
          <button className={`${styles.filterBtn} ${filterStatus === 'EN_COURS' ? styles.filterBtnActive : ''}`} onClick={() => setFilterStatus('EN_COURS')}>En cours</button>
          <button className={`${styles.filterBtn} ${filterStatus === 'TERMINEE' ? styles.filterBtnActive : ''}`} onClick={() => setFilterStatus('TERMINEE')}>Terminées</button>
        </div>
      </div>

      <div className={styles.layout}>
        <SalesList
          sales={filteredSales}
          selectedSale={selectedSale}
          onSelectSale={setSelectedSale}
          getMissingDocuments={getMissingDocuments}
        />

        <div className={styles.main}>
          {selectedSale ? (
            <SaleDetail
              sale={selectedSale}
              onShowHistory={() => setShowHistoryModal(true)}
              onGenerateDocument={generateDocument}
              onSignDocument={signDocument}
              onSendToNotaire={sendToNotaire}
              onUpdateNotificationDate={updateNotificationDate}
            />
          ) : (
            <EmptySaleDetail />
          )}
        </div>
      </div>

      <CreateSaleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        newSale={newSale}
        onUpdate={(updates) => setNewSale({ ...newSale, ...updates })}
        onCreate={handleCreateSale}
      />

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        sale={selectedSale}
      />
    </div>
  );
}
