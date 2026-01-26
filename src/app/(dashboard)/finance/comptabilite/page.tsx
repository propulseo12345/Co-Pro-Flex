'use client';

import { useState } from 'react';
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
  MOCK_OPERATIONS,
  MOCK_DEPENSES,
  MOCK_HISTORIQUE,
  MOCK_MOUVEMENTS_NON_CATEGORISES,
  MOCK_ETAT_CLOTURE,
  MOCK_ANNEXE_1,
  MOCK_ANNEXE_2,
  MOCK_ANNEXE_3,
  MOCK_ANNEXE_4,
  MOCK_ANNEXE_5,
  filterOperations,
  filterDepenses,
  calculateOperationTotals,
  calculateDepenseTotals,
  getComptesUniques,
  calculateGrandLivreBalances,
  calculateBalance,
  calculateBalanceTotals
} from '@/components/features/finance/Comptabilite';
import styles from './comptabilite.module.css';

export default function ComptabilitePage() {
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

  // Data states
  const [etatCloture] = useState<EtatCloture>(MOCK_ETAT_CLOTURE);
  const [historique] = useState<HistoriqueModification[]>(MOCK_HISTORIQUE);
  const [mouvementsNonCategorises] = useState<MouvementNonCategorise[]>(MOCK_MOUVEMENTS_NON_CATEGORISES);

  // Filters
  const filters = { searchTerm, dateDebut, dateFin, compteFilter, typeDepenseFilter };

  // Calculer les soldes running AVANT de filtrer (pour avoir des soldes cohérents)
  // Solde initial à 0 car les reports à nouveau sont inclus dans les écritures
  const operationsWithBalances = calculateGrandLivreBalances(MOCK_OPERATIONS, 0);

  // Ensuite appliquer les filtres
  const filteredOperations = filterOperations(operationsWithBalances, filters);
  const filteredDepenses = filterDepenses(MOCK_DEPENSES, filters);

  // Totals avec validation partie double
  const { totalDebit, totalCredit, isBalanced, ecart } = calculateOperationTotals(filteredOperations);
  const { totalDepenses, totalBudgetPrevu } = calculateDepenseTotals(filteredDepenses);
  const comptesUniques = getComptesUniques();

  // Calculer la balance comptable (toutes opérations, sans filtre de date)
  const lignesBalance = calculateBalance(MOCK_OPERATIONS);
  const balanceTotals = calculateBalanceTotals(lignesBalance);
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

  return (
    <div className={styles.container}>
      <ComptaHeader
        etatCloture={etatCloture}
        onShowHistorique={() => setShowHistoriqueModal(true)}
        onShowCloture={() => setShowClotureModal(true)}
        onExportPDF={exportToPDF}
        onExportExcel={exportToExcel}
      />

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
        <GrandLivreTable
          operations={filteredOperations}
          onViewDetail={handleViewOperationDetail}
        />
      )}

      {activeTab === 'balance' && (
        <BalanceTable
          lignesBalance={lignesBalance}
          annee={etatCloture.annee}
        />
      )}

      {activeTab === 'compte-gestion' && (
        <DepensesTable
          depenses={filteredDepenses}
          onViewDetail={handleViewDepenseDetail}
        />
      )}

      {activeTab === 'annexe-1' && (
        <Annexe1Table
          data={MOCK_ANNEXE_1}
          exercice={String(etatCloture.annee)}
        />
      )}

      {activeTab === 'annexe-2' && (
        <Annexe2Table
          data={MOCK_ANNEXE_2}
          exercice={String(etatCloture.annee)}
        />
      )}

      {activeTab === 'annexe-3' && (
        <Annexe3Table
          data={MOCK_ANNEXE_3}
          exercice={String(etatCloture.annee)}
        />
      )}

      {activeTab === 'annexe-4' && (
        <Annexe4Table
          data={MOCK_ANNEXE_4}
          exercice={String(etatCloture.annee)}
        />
      )}

      {activeTab === 'annexe-5' && (
        <Annexe5Table
          data={MOCK_ANNEXE_5}
          exercice={String(etatCloture.annee)}
        />
      )}

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
