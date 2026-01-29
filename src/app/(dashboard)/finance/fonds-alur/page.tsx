'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Download,
  TrendingUp,
  Euro,
  FileText,
  Loader2,
  Percent,
  ArrowRightLeft,
  X,
  Building2,
  Users,
  Calendar,
  Info,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Banknote,
  PiggyBank,
} from 'lucide-react';
import styles from './fonds-alur.module.css';
import { useALURData, type ALURLotContribution, type ALURTransfer } from '@/hooks/modules/useALURData';

// ============================================================================
// Types
// ============================================================================

interface LotDetailModalProps {
  lot: ALURLotContribution;
  transfers: ALURTransfer[];
  onClose: () => void;
}

interface TransferModalProps {
  soldeActuel: number;
  worksBudgets: Array<{ id: string; name: string; remaining: number }>;
  onTransfer: (amount: number, destination: 'compte_courant' | 'budget_travaux', budgetId?: string, description?: string) => Promise<boolean>;
  onClose: () => void;
}

// ============================================================================
// Composants
// ============================================================================

function LotDetailModal({ lot, transfers, onClose }: LotDetailModalProps) {
  // Filter transfers that might be related to this lot (we can't directly link them yet)
  const recentTransfers = transfers.slice(0, 5);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Détail du lot {lot.lotRef}</h2>
            <p className={styles.modalSubtitle}>Contribution au fonds ALUR</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Lot Info */}
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <Building2 size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Lot</span>
                <span className={styles.detailValue}>{lot.lotRef}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <Users size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Copropriétaire</span>
                <span className={styles.detailValue}>{lot.ownerName}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <Percent size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Tantièmes</span>
                <span className={styles.detailValue}>{lot.tantiemesGeneraux.toLocaleString('fr-FR')}</span>
              </div>
            </div>
            <div className={styles.detailItem}>
              <TrendingUp size={16} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>Quote-part</span>
                <span className={styles.detailValue}>{lot.sharePercent.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* ALUR Balance */}
          <div className={styles.alurBalanceCard}>
            <div className={styles.alurBalanceHeader}>
              <PiggyBank size={24} />
              <span>Solde ALUR du lot</span>
            </div>
            <div className={styles.alurBalanceValue}>
              {lot.lotSoldeAlur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
            <div className={styles.alurBalanceSubtext}>
              Cotisation annuelle : {lot.lotCotisationAnnuelle.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>

          {/* Recent Transfers */}
          {recentTransfers.length > 0 && (
            <div className={styles.transfersSection}>
              <h3 className={styles.sectionTitle}>
                <ArrowRightLeft size={16} />
                Derniers transferts du fonds
              </h3>
              <div className={styles.transfersList}>
                {recentTransfers.map((t) => (
                  <div key={t.id} className={styles.transferItem}>
                    <div className={styles.transferInfo}>
                      <span className={styles.transferDate}>
                        {new Date(t.transferDate).toLocaleDateString('fr-FR')}
                      </span>
                      <span className={styles.transferDesc}>{t.description}</span>
                    </div>
                    <span className={styles.transferAmount}>
                      -{t.amount.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className={styles.infoNote}>
            <Info size={16} />
            <p>
              Le solde ALUR de ce lot représente sa quote-part du fonds commun,
              calculée proportionnellement à ses tantièmes de copropriété.
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferModal({ soldeActuel, worksBudgets, onTransfer, onClose }: TransferModalProps) {
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState<'compte_courant' | 'budget_travaux'>('compte_courant');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount.replace(/\s/g, '').replace(',', '.')) || 0;
  const isValid = numAmount > 0 && numAmount <= soldeActuel && description.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError('');

    const success = await onTransfer(
      numAmount,
      destination,
      destination === 'budget_travaux' ? selectedBudgetId : undefined,
      description.trim()
    );

    if (success) {
      onClose();
    } else {
      setError('Erreur lors du transfert. Veuillez réessayer.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Nouveau transfert</h2>
            <p className={styles.modalSubtitle}>
              Solde disponible : {soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalContent}>
            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Montant */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Montant du transfert</label>
              <div className={styles.amountInput}>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className={styles.input}
                />
                <span className={styles.inputSuffix}>€</span>
              </div>
              {numAmount > soldeActuel && (
                <span className={styles.fieldError}>Le montant dépasse le solde disponible</span>
              )}
            </div>

            {/* Destination */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Destination</label>
              <div className={styles.destinationOptions}>
                <label className={`${styles.destinationOption} ${destination === 'compte_courant' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="destination"
                    value="compte_courant"
                    checked={destination === 'compte_courant'}
                    onChange={() => setDestination('compte_courant')}
                  />
                  <Banknote size={20} />
                  <div>
                    <span className={styles.optionTitle}>Compte courant</span>
                    <span className={styles.optionDesc}>Pour financer des travaux votés en AG</span>
                  </div>
                </label>
                <label className={`${styles.destinationOption} ${destination === 'budget_travaux' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="destination"
                    value="budget_travaux"
                    checked={destination === 'budget_travaux'}
                    onChange={() => setDestination('budget_travaux')}
                  />
                  <Building2 size={20} />
                  <div>
                    <span className={styles.optionTitle}>Budget travaux</span>
                    <span className={styles.optionDesc}>Affecter à un projet spécifique</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Budget travaux selection */}
            {destination === 'budget_travaux' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Sélectionner le budget travaux</label>
                <select
                  value={selectedBudgetId}
                  onChange={(e) => setSelectedBudgetId(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Choisir un budget...</option>
                  {worksBudgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (restant: {b.remaining.toLocaleString('fr-FR')} €)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Motif du transfert *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Financement travaux ravalement façade - AG du 15/03/2026"
                className={styles.textarea}
                rows={3}
              />
            </div>

            {/* Info */}
            <div className={styles.infoNote}>
              <Info size={16} />
              <p>
                Le transfert sera enregistré dans l'historique.
                Les fonds ALUR ne peuvent être utilisés que pour financer des travaux votés en AG.
              </p>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Transfert en cours...
                </>
              ) : (
                <>
                  <ArrowRightLeft size={16} />
                  Transférer {numAmount > 0 ? `${numAmount.toLocaleString('fr-FR')} €` : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Page principale
// ============================================================================

export default function FondsALURPage() {
  const {
    fundSummary,
    lotContributions,
    transfers,
    worksBudgets,
    isLoading,
    error,
    selectedYear,
    setSelectedYear,
    createTransfer,
  } = useALURData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLot, setSelectedLot] = useState<ALURLotContribution | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Filtered lots based on search
  const filteredLots = useMemo(() => {
    if (!searchTerm.trim()) return lotContributions;
    const term = searchTerm.toLowerCase();
    return lotContributions.filter(
      (lot) =>
        lot.lotRef.toLowerCase().includes(term) ||
        lot.ownerName.toLowerCase().includes(term)
    );
  }, [lotContributions, searchTerm]);

  // Export to Excel
  const exportToExcel = useCallback(() => {
    if (!fundSummary || lotContributions.length === 0) return;

    // Build CSV content
    const headers = ['Lot', 'Copropriétaire', 'Tantièmes', 'Quote-part (%)', 'Solde ALUR (€)', 'Cotisation annuelle (€)'];
    const rows = lotContributions.map((lot) => [
      lot.lotRef,
      lot.ownerName,
      lot.tantiemesGeneraux.toString(),
      lot.sharePercent.toFixed(2),
      lot.lotSoldeAlur.toFixed(2),
      lot.lotCotisationAnnuelle.toFixed(2),
    ]);

    // Add summary row
    rows.push([]);
    rows.push(['TOTAL', '', '', '100.00', fundSummary.soldeActuel.toFixed(2), fundSummary.cotisationAnnuelle.toFixed(2)]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fonds-alur-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [fundSummary, lotContributions, selectedYear]);

  // Handle transfer
  const handleTransfer = useCallback(
    async (amount: number, destination: 'compte_courant' | 'budget_travaux', budgetId?: string, description?: string) => {
      return createTransfer({
        amount,
        destination,
        destinationBudgetId: budgetId,
        description: description || 'Transfert fonds ALUR',
      });
    },
    [createTransfer]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Loader2 size={32} className="animate-spin" />
          <span>Chargement des données ALUR...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertCircle size={32} />
          <p>Erreur: {error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fonds ALUR</h1>
          <p className={styles.subtitle}>
            Suivi du fonds travaux obligatoire (Loi ALUR) - Exercice {selectedYear}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.transferButton} onClick={() => setShowTransferModal(true)}>
            <ArrowRightLeft size={18} />
            Nouveau transfert
          </button>
          <button className={styles.exportButton} onClick={exportToExcel}>
            <Download size={18} />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsContainer}>
        <div className={`${styles.statCard} ${styles.primary}`}>
          <div className={styles.statIcon}>
            <PiggyBank size={28} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Solde du fonds</span>
            <span className={styles.statValue}>
              {(fundSummary?.soldeActuel ?? 0).toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Cotisation annuelle</span>
            <span className={styles.statValue}>
              {(fundSummary?.cotisationAnnuelle ?? 0).toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Percent size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Part du budget</span>
            <span className={styles.statValue}>{fundSummary?.pourcentageBudget ?? 5}%</span>
            <span className={styles.statSubtext}>
              du budget de {(fundSummary?.budgetFonctionnement ?? 0).toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <ArrowRightLeft size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Transferts</span>
            <span className={styles.statValue}>
              {(fundSummary?.totalTransferred ?? 0).toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              })}
            </span>
            <span className={styles.statSubtext}>total transféré</span>
          </div>
        </div>
      </div>

      {/* Transfer History (if any) */}
      {transfers.length > 0 && (
        <div className={styles.transfersCard}>
          <h2 className={styles.sectionTitle}>
            <ArrowRightLeft size={18} />
            Derniers transferts
          </h2>
          <div className={styles.transfersTable}>
            {transfers.slice(0, 5).map((t) => (
              <div key={t.id} className={styles.transferRow}>
                <div className={styles.transferDate}>
                  <Calendar size={14} />
                  {new Date(t.transferDate).toLocaleDateString('fr-FR')}
                </div>
                <div className={styles.transferDescription}>
                  {t.description}
                  {t.destinationBudgetName && (
                    <span className={styles.transferBadge}>{t.destinationBudgetName}</span>
                  )}
                </div>
                <div className={styles.transferAmountNeg}>
                  -{t.amount.toLocaleString('fr-FR')} €
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par lot ou copropriétaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearSearch} onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className={styles.resultCount}>
          {filteredLots.length} lot{filteredLots.length > 1 ? 's' : ''} sur {lotContributions.length}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Copropriétaire</th>
              <th className={styles.textRight}>Tantièmes</th>
              <th className={styles.textRight}>Quote-part</th>
              <th className={styles.textRight}>Solde ALUR</th>
              <th className={styles.textRight}>Cotisation/an</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredLots.map((lot) => (
              <tr
                key={lot.lotId}
                className={styles.mainRow}
                onClick={() => setSelectedLot(lot)}
              >
                <td>
                  <span className={styles.lotBadge}>{lot.lotRef}</span>
                </td>
                <td className={styles.coproCell}>{lot.ownerName}</td>
                <td className={styles.textRight}>
                  {lot.tantiemesGeneraux.toLocaleString('fr-FR')}
                </td>
                <td className={styles.textRight}>{lot.sharePercent.toFixed(2)}%</td>
                <td className={styles.textRight}>
                  <span className={styles.soldeValue}>
                    {lot.lotSoldeAlur.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                </td>
                <td className={styles.textRight}>
                  {lot.lotCotisationAnnuelle.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </td>
                <td className={styles.actionCell}>
                  <button className={styles.detailButton} title="Voir le détail">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLots.length === 0 && (
          <div className={styles.emptyState}>
            <FileText size={48} />
            <p>{lotContributions.length === 0 ? 'Aucun lot configuré' : 'Aucun lot trouvé'}</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <div className={styles.infoIcon}>
          <Info size={20} />
        </div>
        <div>
          <h3 className={styles.infoTitle}>À propos du fonds ALUR</h3>
          <p className={styles.infoText}>
            La loi ALUR (2014) impose aux copropriétés de plus de 5 ans de constituer un fonds de travaux,
            alimenté par une cotisation annuelle minimale de <strong>5% du budget prévisionnel</strong>.
            Ce fonds est exclusivement destiné à financer les travaux d'entretien et de conservation
            des parties communes, votés en assemblée générale.
          </p>
        </div>
      </div>

      {/* Modals */}
      {selectedLot && (
        <LotDetailModal
          lot={selectedLot}
          transfers={transfers}
          onClose={() => setSelectedLot(null)}
        />
      )}

      {showTransferModal && fundSummary && (
        <TransferModal
          soldeActuel={fundSummary.soldeActuel}
          worksBudgets={worksBudgets}
          onTransfer={handleTransfer}
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </div>
  );
}
