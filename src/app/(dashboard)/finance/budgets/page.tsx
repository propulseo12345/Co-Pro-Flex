'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import DocumentViewerModal from '@/ui/DocumentViewerModal';
import { useBudget } from '@/hooks/modules/useBudget';
import {
  BudgetHeader,
  BudgetAlerts,
  BudgetSummaryCards,
  BudgetChart,
  BudgetProjection,
  BudgetPostesGrid,
  BudgetDepensesTable,
  TravauxOverview,
  TravauxCard,
  ALURSummary,
  ALURCoproTable,
  ALURTransfertHistory,
  TransferModal,
  PosteDetailModal,
  DepenseDetailModal,
  CoproprietaireALURModal,
  CreateBudgetModal,
  TransformBudgetModal,
  TravauxDetailModal,
  NouvelAppelFondsTravauxModal,
  LinkToAGModal,
  BudgetsList,
} from '@/components/features/finance/Budget';
import styles from './budgets.module.css';

export default function BudgetsPage() {
  const router = useRouter();

  const {
    // État UI
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

    // Données
    budgetAnnuelVote,
    postesBudget,
    budgetsTravaux,
    fondsALUR,
    coproprietairesALUR,
    resolutionsAG,

    // Calculs
    totals,
    postesEnAlerte,

    // Handlers
    handleOpenTravauxDetail,
    handleTransferALUR,
    handleTransformToAppele,
    handleCreateBudget,
    getBudgetN1,

    // Nouvel appel de fonds travaux
    showNewAppelFondsModal,
    setShowNewAppelFondsModal,
    selectedTravauxForAppel,
    handleOpenNewAppelFonds,
    handleGenerateProchainAppel,

    // Liste des budgets
    budgets,
    handleDeleteBudget,
    handleOpenLinkToAG,
    handleOpenTransformModal,
    handleLinkToAG,
    showLinkToAGModal,
    setShowLinkToAGModal,
    selectedBudgetForLink,

    // Graphique interactif - filtre par poste
    posteActifChart,
    depensesFiltrees,
    handlePosteChartSelect,
  } = useBudget();

  // Récupérer le budget N-1 pour la reprise
  const budgetN1 = getBudgetN1(selectedYear);

  return (
    <div className="container">
      <BudgetHeader
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        onCreateBudget={() => setShowCreateBudgetModal(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Budget de fonctionnement */}
      {activeTab === 'fonctionnement' && (
        <div className={styles.content}>
          {/* Liste des budgets de fonctionnement */}
          <BudgetsList
            budgets={budgets}
            selectedYear={selectedYear}
            filterType="fonctionnement"
            onEdit={(budget) => router.push(`/finance/budgets/${budget.id}`)}
            onLinkToAG={handleOpenLinkToAG}
            onTransform={handleOpenTransformModal}
            onDelete={(budget) => handleDeleteBudget(budget.id)}
            onSelect={(budget) => router.push(`/finance/budgets/${budget.id}`)}
            onCreateBudget={() => setShowCreateBudgetModal(true)}
          />

          <BudgetAlerts postesEnAlerte={postesEnAlerte} />

          <BudgetSummaryCards
            budgetAnnuelVote={budgetAnnuelVote}
            totalConsomme={totals.totalConsomme}
            budgetRestant={totals.budgetRestant}
          />

          <div className={styles.chartAndProjection}>
            <BudgetChart
              postesBudget={postesBudget}
              budgetAnnuelVote={budgetAnnuelVote}
              totalConsomme={totals.totalConsomme}
              budgetRestant={totals.budgetRestant}
              posteActif={posteActifChart}
              onPosteSelect={handlePosteChartSelect}
            />
            <BudgetProjection
              budgetAnnuelVote={budgetAnnuelVote}
              totalConsomme={totals.totalConsomme}
              projectedYearEnd={totals.projectedYearEnd}
              projectedDifference={totals.projectedDifference}
              monthsElapsed={totals.monthsElapsed}
              monthsRemaining={totals.monthsRemaining}
              avgMonthlyConsumption={totals.avgMonthlyConsumption}
              projectionMin={totals.projectionMin}
              projectionMax={totals.projectionMax}
              fiabiliteNiveau={totals.fiabiliteNiveau}
            />
          </div>

          <BudgetPostesGrid postesBudget={postesBudget} onSelectPoste={setSelectedPoste} />

          <BudgetDepensesTable
            depenses={depensesFiltrees}
            postesBudget={postesBudget}
            onSelectDepense={setSelectedDepense}
          />
        </div>
      )}

      {/* Budget Travaux */}
      {activeTab === 'travaux' && (
        <div className={styles.content}>
          <TravauxOverview budgetsTravaux={budgetsTravaux} />

          <div className={styles.travauxHeader}>
            <h2 className={styles.sectionTitle}>Projets de travaux</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateBudgetModal(true)}
            >
              <Plus size={16} aria-hidden="true" />
              Nouveau budget travaux
            </button>
          </div>

          <div className={styles.travauxGrid}>
            {budgetsTravaux.map((travaux) => (
              <TravauxCard
                key={travaux.id}
                travaux={travaux}
                onOpenDetail={handleOpenTravauxDetail}
                onNewAppelFonds={handleOpenNewAppelFonds}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fonds ALUR */}
      {activeTab === 'alur' && (
        <div className={styles.content}>
          <ALURSummary
            fondsALUR={fondsALUR}
            coproprietairesALUR={coproprietairesALUR}
            budgetAnnuelVote={budgetAnnuelVote}
          />

          <ALURTransfertHistory
            fondsALUR={fondsALUR}
            onOpenTransferModal={() => setShowTransferModal(true)}
          />

          <ALURCoproTable
            coproprietairesALUR={coproprietairesALUR}
            onSelectCoproprietaire={setSelectedCoproprietaireALUR}
          />
        </div>
      )}

      {/* Modals */}
      {selectedCoproprietaireALUR && (
        <CoproprietaireALURModal
          selectedCoproprietaire={selectedCoproprietaireALUR}
          selectedYear={selectedYear}
          onClose={() => setSelectedCoproprietaireALUR(null)}
        />
      )}

      {showTransferModal && (
        <TransferModal
          fondsALUR={fondsALUR}
          budgetsTravaux={budgetsTravaux}
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleTransferALUR}
        />
      )}

      {selectedPoste && (
        <PosteDetailModal
          selectedPoste={selectedPoste}
          postesBudget={postesBudget}
          onClose={() => setSelectedPoste(null)}
          onSelectDepense={setSelectedDepense}
        />
      )}

      {selectedDepense && (
        <DepenseDetailModal
          selectedDepense={selectedDepense}
          postesBudget={postesBudget}
          onClose={() => setSelectedDepense(null)}
          onViewDocument={setViewingDocument}
        />
      )}

      {viewingDocument && (
        <DocumentViewerModal
          document={{
            id: 'temp-doc',
            nom: viewingDocument,
            type: viewingDocument.toLowerCase().endsWith('.pdf') ? 'PDF' : 'AUTRE',
            categorie: 'FACTURE',
            dateAjout: new Date().toISOString(),
            taille: '1.2 Mo',
          }}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {showCreateBudgetModal && (
        <CreateBudgetModal
          selectedYear={selectedYear}
          budgetN1={budgetN1}
          onCreateBudget={handleCreateBudget}
          onClose={() => setShowCreateBudgetModal(false)}
        />
      )}

      {showTransformBudgetModal && selectedBudgetForTransform && (
        <TransformBudgetModal
          budget={selectedBudgetForTransform}
          onClose={() => setShowTransformBudgetModal(false)}
          onTransform={handleTransformToAppele}
        />
      )}

      {showTravauxDetailModal && selectedTravauxDetail && (
        <TravauxDetailModal
          travaux={selectedTravauxDetail}
          activeTab={activeDetailTab}
          onTabChange={setActiveDetailTab}
          onClose={() => setShowTravauxDetailModal(false)}
        />
      )}

      {showNewAppelFondsModal && selectedTravauxForAppel && (
        <NouvelAppelFondsTravauxModal
          travaux={selectedTravauxForAppel}
          onGenerateAppel={handleGenerateProchainAppel}
          onClose={() => setShowNewAppelFondsModal(false)}
        />
      )}

      {showLinkToAGModal && selectedBudgetForLink && (
        <LinkToAGModal
          budget={selectedBudgetForLink}
          availableResolutions={resolutionsAG}
          onLink={handleLinkToAG}
          onClose={() => setShowLinkToAGModal(false)}
        />
      )}
    </div>
  );
}
