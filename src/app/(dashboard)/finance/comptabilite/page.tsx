'use client';

import { useState, useMemo } from 'react';
import { RefreshCw, AlertCircle, FileText, Info } from 'lucide-react';
import { useCopro } from '@/providers/CoproContext';
import { useGeneralLedger, useTrialBalance, useOpenPeriod } from '@/hooks/modules/useFinanceData';
import {
  ComptaHeader,
  ComptaTabs,
  ComptaStats,
  ComptaFilters,
  GrandLivreTable,
  BalanceTable,
  DepensesTable,
  Annexe1Table,
  Annexe2Table,
  Annexe3Table,
  Annexe4Table,
  Annexe5Table,
  DetailModal,
  ClotureModal,
  HistoriqueModal,
  TabCompta,
  OperationComptable,
  Depense,
  EtatCloture,
  HistoriqueModification,
  MouvementNonCategorise,
  LigneBalance,
  filterOperations,
  filterDepenses,
  calculateOperationTotals,
  calculateDepenseTotals,
  calculateBalanceTotals
} from '@/components/features/finance/Comptabilite';
import type { GeneralLedgerEntry, TrialBalanceEntry } from '@/lib/finance/api';
import styles from './comptabilite.module.css';

// ============================================================================
// TRANSFORMERS - Convert Supabase data to local format
// ============================================================================

type TypeCompte = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';

function mapAccountType(accountType: string): TypeCompte {
  switch (accountType) {
    case 'asset': return 'ACTIF';
    case 'liability': return 'PASSIF';
    case 'equity': return 'PASSIF';
    case 'revenue': return 'PRODUIT';
    case 'expense': return 'CHARGE';
    default: return 'ACTIF';
  }
}

function transformLedgerToOperations(entries: GeneralLedgerEntry[]): OperationComptable[] {
  // Group by tx_id to calculate running balance properly
  let runningBalance = 0;

  return entries.map(entry => {
    const debit = entry.direction === 'debit' ? Number(entry.amount) : 0;
    const credit = entry.direction === 'credit' ? Number(entry.amount) : 0;
    runningBalance += debit - credit;

    return {
      id: entry.entry_id,
      date: entry.tx_date,
      compte: entry.account_code,
      compteLabel: entry.account_name,
      typeCompte: mapAccountType(entry.account_type),
      libelle: entry.tx_label + (entry.entry_label ? ` - ${entry.entry_label}` : ''),
      debit,
      credit,
      solde: runningBalance,
      numeroPiece: entry.source_id?.slice(0, 8) || undefined,
    };
  });
}

function transformTrialBalanceToLigneBalance(entries: TrialBalanceEntry[]): LigneBalance[] {
  return entries.map(entry => ({
    compte: entry.account_code,
    compteLabel: entry.account_name,
    typeCompte: mapAccountType(entry.account_type),
    classe: entry.account_code.charAt(0),
    soldeOuvertureDebit: 0,
    soldeOuvertureCredit: 0,
    mouvementDebit: Number(entry.total_debit),
    mouvementCredit: Number(entry.total_credit),
    soldeClotureDebit: Number(entry.balance) > 0 ? Number(entry.balance) : 0,
    soldeClotureCredit: Number(entry.balance) < 0 ? -Number(entry.balance) : 0,
  }));
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ComptabilitePage() {
  const { currentCoproId } = useCopro();

  // Supabase hooks
  const { data: openPeriod, isLoading: periodLoading } = useOpenPeriod();
  const {
    data: ledgerEntries,
    isLoading: ledgerLoading,
    error: ledgerError,
    refresh: refreshLedger
  } = useGeneralLedger({ status: 'posted' });
  const {
    data: trialBalanceData,
    isLoading: balanceLoading,
    error: balanceError,
    refresh: refreshBalance
  } = useTrialBalance(openPeriod?.id || null);

  // Combined loading/error state
  const isLoading = periodLoading || ledgerLoading || balanceLoading;
  const error = ledgerError || balanceError;

  const handleRefresh = () => {
    refreshLedger();
    refreshBalance();
  };

  // Transform Supabase data to local format
  const operations = useMemo(() => {
    if (!ledgerEntries || ledgerEntries.length === 0) return [];
    return transformLedgerToOperations(ledgerEntries);
  }, [ledgerEntries]);

  const lignesBalance = useMemo(() => {
    if (!trialBalanceData || trialBalanceData.length === 0) return [];
    return transformTrialBalanceToLigneBalance(trialBalanceData);
  }, [trialBalanceData]);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabCompta>('grand-livre');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [compteFilter, setCompteFilter] = useState('TOUS');
  const [typeDepenseFilter, setTypeDepenseFilter] = useState('TOUS');

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);

  // Selected items
  const [selectedOperation, setSelectedOperation] = useState<OperationComptable | null>(null);
  const [selectedDepense, setSelectedDepense] = useState<Depense | null>(null);

  // Data not available from DB yet - use empty defaults
  const etatCloture: EtatCloture = useMemo(() => ({
    annee: openPeriod ? new Date(openPeriod.start_date).getFullYear() : new Date().getFullYear(),
    estCloturee: openPeriod?.status === 'closed',
    mouvementsNonCategorises: 0,
    alertes: [],
  }), [openPeriod]);

  const historique: HistoriqueModification[] = [];
  const mouvementsNonCategorises: MouvementNonCategorise[] = [];

  // Filters
  const filters = { searchTerm, dateDebut, dateFin, compteFilter, typeDepenseFilter };

  // Apply filters to operations
  const filteredOperations = useMemo(() => {
    return filterOperations(operations, filters);
  }, [operations, filters]);

  // Depenses - not available from DB yet, empty
  const filteredDepenses: Depense[] = [];

  // Totals
  const { totalDebit, totalCredit, isBalanced, ecart } = useMemo(() => {
    return calculateOperationTotals(filteredOperations);
  }, [filteredOperations]);

  const { totalDepenses, totalBudgetPrevu } = useMemo(() => {
    return calculateDepenseTotals(filteredDepenses);
  }, [filteredDepenses]);

  // Get unique comptes from operations
  const comptesUniques = useMemo(() => {
    const comptes = new Set<string>();
    operations.forEach(op => comptes.add(op.compte));
    return Array.from(comptes).sort();
  }, [operations]);

  // Balance stats
  const balanceTotals = useMemo(() => {
    return calculateBalanceTotals(lignesBalance);
  }, [lignesBalance]);

  const balanceStats = {
    nombreComptes: balanceTotals.nombreComptes,
    totalMouvementDebit: balanceTotals.totalMouvementDebit,
    totalMouvementCredit: balanceTotals.totalMouvementCredit,
    totalClotureDebit: balanceTotals.totalClotureDebit,
    totalClotureCredit: balanceTotals.totalClotureCredit
  };

  // Handlers
  const handleViewOperationDetail = (operation: OperationComptable) => {
    setSelectedOperation(operation);
    setSelectedDepense(null);
    setShowDetailModal(true);
  };

  const handleViewDepenseDetail = (depense: Depense) => {
    setSelectedDepense(depense);
    setSelectedOperation(null);
    setShowDetailModal(true);
  };

  const handleValiderCloture = () => {
    if (!isBalanced) {
      alert('Impossible de clôturer !\n\nLe grand livre présente un déséquilibre comptable.\nEn partie double, Total Débits doit TOUJOURS égaler Total Crédits.');
      return;
    }
    if (etatCloture.mouvementsNonCategorises > 0) {
      alert('Impossible de clôturer !\n\nIl reste des mouvements bancaires non catégorisés.');
      return;
    }
    alert(`Clôture de l'exercice ${etatCloture.annee} validée avec succès !`);
    setShowClotureModal(false);
  };

  const exportToPDF = () => { /* Export PDF */ };
  const exportToExcel = () => { /* Export Excel */ };

  // ============================================================================
  // RENDER - States: No Copro, Loading, Error, Empty, Data
  // ============================================================================

  // Mode Single Copro: si pas encore chargé ou en cours de chargement, afficher loading
  if (!currentCoproId || isLoading) {
    return (
      <div className={styles.container}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
          <p style={{ marginTop: '1rem' }}>Chargement de la comptabilité...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--color-error)' }}>
          <AlertCircle size={32} style={{ color: 'var(--color-error)', marginBottom: '1rem' }} />
          <h2>Erreur de chargement</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          <button className="btn btn-primary" onClick={handleRefresh} style={{ marginTop: '1rem' }}>
            <RefreshCw size={16} style={{ marginRight: 8 }} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Empty state for period not found
  if (!openPeriod) {
    return (
      <div className={styles.container}>
        <ComptaHeader
          etatCloture={etatCloture}
          onShowHistorique={() => setShowHistoriqueModal(true)}
          onShowCloture={() => setShowClotureModal(true)}
          onExportPDF={exportToPDF}
          onExportExcel={exportToExcel}
        />
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
          <h2>Aucune période comptable ouverte</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Veuillez créer ou ouvrir une période comptable pour afficher la comptabilité.
          </p>
        </div>
      </div>
    );
  }

  // Helper component for annexes not yet connected
  const AnnexeNotConnected = ({ title }: { title: string }) => (
    <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
      <Info size={32} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
      <h3>{title}</h3>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
        Cette annexe n&apos;est pas encore connectée à Supabase.
      </p>
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
        Les données seront disponibles après migration des vues correspondantes.
      </p>
    </div>
  );

  return (
    <div className={styles.container}>
      <ComptaHeader
        etatCloture={etatCloture}
        onShowHistorique={() => setShowHistoriqueModal(true)}
        onShowCloture={() => setShowClotureModal(true)}
        onExportPDF={exportToPDF}
        onExportExcel={exportToExcel}
      />

      {/* Info banner - source de données */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--color-info-bg, #e0f2fe)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: 'var(--color-info-text, #0369a1)'
      }}>
        <Info size={16} />
        <span>
          Données issues de Supabase (v_general_ledger, v_trial_balance) - Période: {openPeriod.name}
        </span>
        <button
          onClick={handleRefresh}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'inherit'
          }}
          title="Actualiser les données"
        >
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      <ComptaTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <ComptaStats
        activeTab={activeTab}
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        totalDepenses={totalDepenses}
        totalBudgetPrevu={totalBudgetPrevu}
        isBalanced={isBalanced}
        ecart={ecart}
        balanceStats={balanceStats}
      />

      {/* Filtres pour Grand Livre et Compte de gestion (pas pour Balance ni Annexes) */}
      {(activeTab === 'grand-livre' || activeTab === 'compte-gestion') && (
        <ComptaFilters
          activeTab={activeTab}
          searchTerm={searchTerm}
          dateDebut={dateDebut}
          dateFin={dateFin}
          compteFilter={compteFilter}
          typeDepenseFilter={typeDepenseFilter}
          comptesUniques={comptesUniques}
          onSearchChange={setSearchTerm}
          onDateDebutChange={setDateDebut}
          onDateFinChange={setDateFin}
          onCompteFilterChange={setCompteFilter}
          onTypeDepenseFilterChange={setTypeDepenseFilter}
        />
      )}

      {activeTab === 'grand-livre' && (
        operations.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
            <h2>Aucune écriture comptable</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Il n&apos;y a pas encore d&apos;écritures comptables validées pour cette période.
            </p>
          </div>
        ) : (
          <GrandLivreTable
            operations={filteredOperations}
            onViewDetail={handleViewOperationDetail}
          />
        )
      )}

      {activeTab === 'balance' && (
        lignesBalance.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
            <h2>Balance vide</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Il n&apos;y a pas encore de données de balance pour cette période.
            </p>
          </div>
        ) : (
          <BalanceTable
            lignesBalance={lignesBalance}
            annee={etatCloture.annee}
          />
        )
      )}

      {activeTab === 'compte-gestion' && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <Info size={32} style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }} />
          <h3>Compte de gestion</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Le compte de gestion (dépenses) n&apos;est pas encore connecté à Supabase.
          </p>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
            Cette fonctionnalité sera disponible après migration des vues correspondantes.
          </p>
        </div>
      )}

      {activeTab === 'annexe-1' && <AnnexeNotConnected title="Annexe 1 - État financier" />}
      {activeTab === 'annexe-2' && <AnnexeNotConnected title="Annexe 2 - Compte de gestion général" />}
      {activeTab === 'annexe-3' && <AnnexeNotConnected title="Annexe 3 - Compte de gestion opérations courantes" />}
      {activeTab === 'annexe-4' && <AnnexeNotConnected title="Annexe 4 - Compte de gestion travaux" />}
      {activeTab === 'annexe-5' && <AnnexeNotConnected title="Annexe 5 - État des travaux" />}

      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        selectedOperation={selectedOperation}
        selectedDepense={selectedDepense}
      />

      <ClotureModal
        isOpen={showClotureModal}
        onClose={() => setShowClotureModal(false)}
        etatCloture={etatCloture}
        mouvementsNonCategorises={mouvementsNonCategorises}
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        isBalanced={isBalanced}
        ecart={ecart}
        onValiderCloture={handleValiderCloture}
      />

      <HistoriqueModal
        isOpen={showHistoriqueModal}
        onClose={() => setShowHistoriqueModal(false)}
        historique={historique}
      />
    </div>
  );
}
