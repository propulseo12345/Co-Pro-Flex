'use client';

import { Building2, User, AlertCircle } from 'lucide-react';
import type { Sale, DocumentType } from '@/types';
import styles from '../../../app/(dashboard)/sales/sales.module.css';

interface SalesListProps {
  sales: Sale[];
  selectedSale: Sale | null;
  onSelectSale: (sale: Sale) => void;
  getMissingDocuments: (sale: Sale) => DocumentType[];
}

export function SalesList({ sales, selectedSale, onSelectSale, getMissingDocuments }: SalesListProps) {
  return (
    <div className={styles.sidebar}>
      <div className="card">
        <h3 className={styles.sidebarTitle}>
          Ventes ({sales.length})
        </h3>
        <div className={styles.salesList}>
          {sales.map((sale) => {
            const missingDocs = getMissingDocuments(sale);
            return (
              <div
                key={sale.id}
                className={`${styles.saleItem} ${selectedSale?.id === sale.id ? styles.saleItemActive : ''}`}
                onClick={() => onSelectSale(sale)}
              >
                <div className={styles.saleItemHeader}>
                  <div className={styles.saleItemLots}>
                    <Building2 size={14} aria-hidden="true" />
                    {sale.lotIds.join(', ')}
                  </div>
                  <span className={`${styles.badge} ${sale.statut === 'EN_COURS' ? styles.badgeWarning : sale.statut === 'TERMINEE' ? styles.badgeSuccess : styles.badgeDanger}`}>
                    {sale.statut === 'EN_COURS' ? 'En cours' : sale.statut === 'TERMINEE' ? 'Terminée' : 'Annulée'}
                  </span>
                </div>
                <div className={styles.saleItemVendeur}>
                  <User size={12} aria-hidden="true" />
                  {sale.vendeur}
                </div>
                {sale.acquereur && (
                  <div className={styles.saleItemAcquereur}>
                    Acquéreur: {sale.acquereur}
                  </div>
                )}
                {missingDocs.length > 0 && (
                  <div className={styles.saleItemAlert}>
                    <AlertCircle size={12} aria-hidden="true" />
                    {missingDocs.length} document(s) manquant(s)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
