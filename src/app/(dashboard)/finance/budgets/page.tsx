'use client';

import { useRouter } from 'next/navigation';
import { useBudget } from '@/hooks/modules/useBudget';
import { BudgetTopBar, BudgetNavBar } from '@/components/features/finance/Budget';
import {
  FonctionnementTab,
  TravauxTab,
  ALURTab,
  BudgetsModals,
} from '@/features/finance/budgets/list';
import styles from './budgets.module.css';

export default function BudgetsPage() {
  const router = useRouter();
  const {
    isLoading,
    error,
    activeTab,
    setActiveTab,
    selectedYear,
    setSelectedYear,
    showTransferModal,
    setShowTransferModal,
    selectedPoste,
    setSelectedPoste,
    selectedDepense,
    setSelectedDepense,
    viewingDocument,
    setViewingDocument,
    showTravauxDetailModal,
    setShowTravauxDetailModal,
    selectedTravauxDetail,
    activeDetailTab,
    setActiveDetailTab,
    selectedCoproprietaireALUR,
    setSelectedCoproprietaireALUR,
    showCreateBudgetModal,
    setShowCreateBudgetModal,
    showTransformBudgetModal,
    setShowTransformBudgetModal,
    selectedBudgetForTransform,
    budgetAnnuelVote,
    postesBudget,
    budgetsTravaux,
    fondsALUR,
    coproprietairesALUR,
    resolutionsAG,
    totals,
    postesEnAlerte,
    handleOpenTravauxDetail,
    handleTransferALUR,
    handleTransformToAppele,
    handleCreateBudget,
    getBudgetN1,
    showNewAppelFondsModal,
    setShowNewAppelFondsModal,
    selectedTravauxForAppel,
    handleOpenNewAppelFonds,
    handleGenerateProchainAppel,
    budgets,
    handleDeleteBudget,
    handleOpenLinkToAG,
    handleOpenTransformModal,
    handleLinkToAG,
    showLinkToAGModal,
    setShowLinkToAGModal,
    selectedBudgetForLink,
    posteActifChart,
    depensesFiltrees,
    handlePosteChartSelect,
  } = useBudget();

  const budgetN1 = getBudgetN1();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <BudgetTopBar
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          onCreateBudget={() => setShowCreateBudgetModal(true)}
          onExportPDF={() => {}}
        />
        <BudgetNavBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className={styles.content}>
          <div className={styles.loadingState}>
            <p>Chargement des budgets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <BudgetTopBar
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          onCreateBudget={() => setShowCreateBudgetModal(true)}
          onExportPDF={() => {}}
        />
        <BudgetNavBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className={styles.content}>
          <div className={styles.errorState}>
            <p>Erreur: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <BudgetTopBar
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        onCreateBudget={() => setShowCreateBudgetModal(true)}
        onExportPDF={() => alert('Export PDF en cours...')}
      />
      <BudgetNavBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className={styles.content}>
        {activeTab === 'fonctionnement' && (
          <FonctionnementTab
            budgets={budgets}
            selectedYear={selectedYear}
            budgetAnnuelVote={budgetAnnuelVote}
            postesBudget={postesBudget}
            totals={totals}
            postesEnAlerte={postesEnAlerte}
            posteActifChart={posteActifChart}
            depensesFiltrees={depensesFiltrees}
            onEditBudget={(budget) => router.push(`/finance/budgets/${budget.id}`)}
            onLinkToAG={handleOpenLinkToAG}
            onTransformBudget={handleOpenTransformModal}
            onDeleteBudget={(budget) => handleDeleteBudget(budget.id)}
            onSelectBudget={(budget) => router.push(`/finance/budgets/${budget.id}`)}
            onCreateBudget={() => setShowCreateBudgetModal(true)}
            onSelectPoste={setSelectedPoste}
            onSelectDepense={setSelectedDepense}
            onPosteChartSelect={handlePosteChartSelect}
          />
        )}

        {activeTab === 'travaux' && (
          <TravauxTab
            budgetsTravaux={budgetsTravaux}
            onOpenTravauxDetail={handleOpenTravauxDetail}
            onOpenNewAppelFonds={handleOpenNewAppelFonds}
            onCreateBudget={() => setShowCreateBudgetModal(true)}
          />
        )}

        {activeTab === 'alur' && (
          <ALURTab
            fondsALUR={fondsALUR}
            coproprietairesALUR={coproprietairesALUR}
            budgetAnnuelVote={budgetAnnuelVote}
            onOpenTransferModal={() => setShowTransferModal(true)}
            onSelectCoproprietaire={setSelectedCoproprietaireALUR}
          />
        )}
      </div>

      <BudgetsModals
        selectedCoproprietaireALUR={selectedCoproprietaireALUR}
        selectedYear={selectedYear}
        onCloseCoproprietaireALUR={() => setSelectedCoproprietaireALUR(null)}
        showTransferModal={showTransferModal}
        fondsALUR={fondsALUR}
        budgetsTravaux={budgetsTravaux}
        onCloseTransferModal={() => setShowTransferModal(false)}
        onTransferALUR={handleTransferALUR}
        selectedPoste={selectedPoste}
        postesBudget={postesBudget}
        onClosePosteDetail={() => setSelectedPoste(null)}
        onSelectDepense={setSelectedDepense}
        selectedDepense={selectedDepense}
        onCloseDepenseDetail={() => setSelectedDepense(null)}
        onViewDocument={setViewingDocument}
        viewingDocument={viewingDocument}
        onCloseDocumentViewer={() => setViewingDocument(null)}
        showCreateBudgetModal={showCreateBudgetModal}
        budgetN1={budgetN1}
        onCreateBudget={handleCreateBudget}
        onCloseCreateBudget={() => setShowCreateBudgetModal(false)}
        showTransformBudgetModal={showTransformBudgetModal}
        selectedBudgetForTransform={selectedBudgetForTransform}
        onCloseTransformBudget={() => setShowTransformBudgetModal(false)}
        onTransformToAppele={handleTransformToAppele}
        showTravauxDetailModal={showTravauxDetailModal}
        selectedTravauxDetail={selectedTravauxDetail}
        activeDetailTab={activeDetailTab}
        onDetailTabChange={setActiveDetailTab}
        onCloseTravauxDetail={() => setShowTravauxDetailModal(false)}
        showNewAppelFondsModal={showNewAppelFondsModal}
        selectedTravauxForAppel={selectedTravauxForAppel}
        onGenerateProchainAppel={handleGenerateProchainAppel}
        onCloseNewAppelFonds={() => setShowNewAppelFondsModal(false)}
        showLinkToAGModal={showLinkToAGModal}
        selectedBudgetForLink={selectedBudgetForLink}
        resolutionsAG={resolutionsAG}
        onLinkToAG={handleLinkToAG}
        onCloseLinkToAG={() => setShowLinkToAGModal(false)}
      />
    </div>
  );
}
