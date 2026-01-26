'use client';

import { useState, useMemo } from 'react';
import { X, Search, FileText, Check } from 'lucide-react';
import { MOCK_FACTURES } from '@/components/features/finance/Factures/data';
import { Facture } from '@/components/features/finance/Factures/types';
import { PieceJointeDepense } from '../types';
import styles from './InvoicePickerModal.module.css';

interface InvoicePickerModalProps {
  onSelect: (pieceJointe: PieceJointeDepense) => void;
  onClose: () => void;
  currentFactureId?: string;
  filterBySupplier?: string;
}

const STATUT_LABELS: Record<string, string> = {
  A_PAYER: 'À payer',
  EN_ATTENTE: 'En attente',
  PAYEE_EN_ATTENTE: 'Payée (en attente)',
  PAYEE_CATEGORISEE: 'Payée',
};

const STATUT_COLORS: Record<string, string> = {
  A_PAYER: styles.statutAPayer,
  EN_ATTENTE: styles.statutEnAttente,
  PAYEE_EN_ATTENTE: styles.statutPayeeEnAttente,
  PAYEE_CATEGORISEE: styles.statutPayeeCategorisee,
};

export function InvoicePickerModal({
  onSelect,
  onClose,
  currentFactureId,
  filterBySupplier,
}: InvoicePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState(filterBySupplier || '');
  const [selectedId, setSelectedId] = useState<string | null>(currentFactureId || null);

  const filteredFactures = useMemo(() => {
    if (!searchQuery) return MOCK_FACTURES;
    const query = searchQuery.toLowerCase();
    return MOCK_FACTURES.filter(f =>
      f.fournisseur.toLowerCase().includes(query) ||
      f.reference.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = (facture: Facture) => {
    const pieceJointe: PieceJointeDepense = {
      id: `pj-fac-${facture.id}`,
      type: 'FACTURE',
      factureId: facture.id,
      fichierUrl: facture.fichier,
      fichierNom: `${facture.fournisseur} - ${facture.reference}`,
      dateAjout: new Date().toISOString(),
      reference: facture.reference,
      montant: facture.montant,
    };
    onSelect(pieceJointe);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} aria-hidden="true">
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="picker-title" className={styles.modalTitle}>
            Lier une facture existante
          </h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fermer"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par fournisseur ou référence..."
            className={styles.searchInput}
            aria-label="Rechercher une facture"
          />
        </div>

        <div className={styles.facturesList}>
          {filteredFactures.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={48} className={styles.emptyIcon} aria-hidden="true" />
              <p>Aucune facture trouvée</p>
            </div>
          ) : (
            filteredFactures.map((facture) => (
              <div
                key={facture.id}
                className={`${styles.factureItem} ${selectedId === facture.id ? styles.selected : ''}`}
                onClick={() => setSelectedId(facture.id)}
                role="button"
                tabIndex={0}
                aria-pressed={selectedId === facture.id}
              >
                <div className={styles.factureIcon}>
                  <FileText size={24} aria-hidden="true" />
                </div>
                <div className={styles.factureInfo}>
                  <div className={styles.factureHeader}>
                    <span className={styles.factureFournisseur}>{facture.fournisseur}</span>
                    <span className={`${styles.factureStatut} ${STATUT_COLORS[facture.statut]}`}>
                      {STATUT_LABELS[facture.statut]}
                    </span>
                  </div>
                  <div className={styles.factureDetails}>
                    <span className={styles.factureReference}>{facture.reference}</span>
                    <span className={styles.factureSeparator}>•</span>
                    <span className={styles.factureDate}>
                      {new Date(facture.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className={styles.factureMontant}>
                    {facture.montant.toLocaleString('fr-FR')} €
                  </div>
                </div>
                {selectedId === facture.id && (
                  <div className={styles.checkMark}>
                    <Check size={20} aria-hidden="true" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button
            onClick={() => {
              const facture = filteredFactures.find(f => f.id === selectedId);
              if (facture) handleSelect(facture);
            }}
            className="btn btn-primary"
            disabled={!selectedId}
          >
            Sélectionner cette facture
          </button>
        </div>
      </div>
    </div>
  );
}
