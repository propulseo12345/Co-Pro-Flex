'use client';

import Link from 'next/link';
import { Download, Plus, Coins, ArrowRight } from 'lucide-react';
import { useBudget } from '@/hooks/modules/useBudget';
import {
  TravauxOverview,
  TravauxCard,
  TravauxDetailModal,
  CreateBudgetModal,
  NouvelAppelFondsTravauxModal,
} from '@/components/features/finance/Budget';
import styles from './budget-works.module.css';

export default function WorksBudgetPage() {
  const {
    // État UI
    selectedYear,
    showTravauxDetailModal,
    setShowTravauxDetailModal,
    selectedTravauxDetail,
    activeDetailTab,
    setActiveDetailTab,
    showCreateBudgetModal,
    setShowCreateBudgetModal,

    // Données
    budgetsTravaux,

    // Handlers
    handleOpenTravauxDetail,
    handleCreateBudget,
    getBudgetN1,

    // Nouvel appel de fonds travaux
    showNewAppelFondsModal,
    setShowNewAppelFondsModal,
    selectedTravauxForAppel,
    handleOpenNewAppelFonds,
    handleGenerateProchainAppel,
  } = useBudget();

  // Récupérer le budget N-1 pour la reprise
  const budgetN1 = getBudgetN1();

  // Forcer l'onglet travaux lors de l'ouverture du modal
  const handleOpenCreateModal = () => {
    setShowCreateBudgetModal(true);
  };

  return (
    <div className="container">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Budgets Travaux</h1>
          <p className={styles.subtitle}>
            Suivi des budgets votés pour les travaux exceptionnels.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/finance/appels-fonds?type=travaux" className="btn btn-secondary">
            <Coins size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Appels de fonds
          </Link>
          <button className="btn btn-secondary">
            <Download size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Exporter
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            Nouveau budget travaux
          </button>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <TravauxOverview budgetsTravaux={budgetsTravaux} />

      {/* Grille des projets */}
      <div className={styles.grid}>
        {budgetsTravaux.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Aucun budget travaux pour le moment.</p>
            <button className="btn btn-primary" onClick={handleOpenCreateModal}>
              <Plus size={16} aria-hidden="true" />
              Créer un premier budget travaux
            </button>
          </div>
        ) : (
          budgetsTravaux.map((travaux) => (
            <TravauxCard
              key={travaux.id}
              travaux={travaux}
              onOpenDetail={handleOpenTravauxDetail}
              onNewAppelFonds={handleOpenNewAppelFonds}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateBudgetModal && (
        <CreateBudgetModal
          selectedYear={selectedYear}
          budgetN1={budgetN1}
          onCreateBudget={handleCreateBudget}
          onClose={() => setShowCreateBudgetModal(false)}
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
    </div>
  );
}
